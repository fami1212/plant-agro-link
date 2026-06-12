import { supabase } from "@/integrations/supabase/client";

/**
 * Offline message queue. Persists outgoing messages in localStorage and
 * flushes them when connectivity returns. Falls back to the SMS/USSD
 * gateway edge function if the recipient phone is known and the gateway
 * is reachable.
 */

const STORAGE_KEY = "plantera_message_queue_v1";

export interface QueuedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  recipient_phone?: string | null;
  attempts: number;
}

type Listener = (queue: QueuedMessage[]) => void;
const listeners = new Set<Listener>();

function readQueue(): QueuedMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMessage[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  listeners.forEach((l) => l(q));
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  listener(readQueue());
  return () => {
    listeners.delete(listener);
  };
}

export function getQueuedMessages(): QueuedMessage[] {
  return readQueue();
}

export function enqueueMessage(
  msg: Omit<QueuedMessage, "id" | "created_at" | "attempts">
): QueuedMessage {
  const queued: QueuedMessage = {
    ...msg,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    attempts: 0,
  };
  const q = readQueue();
  q.push(queued);
  writeQueue(q);
  return queued;
}

async function trySmsFallback(msg: QueuedMessage): Promise<boolean> {
  if (!msg.recipient_phone) return false;
  try {
    const { data, error } = await supabase.functions.invoke("ussd-sms-gateway", {
      body: {
        type: "send_sms",
        to: msg.recipient_phone,
        message: msg.content.slice(0, 160),
      },
    });
    if (error) return false;
    return !!(data && (data as any).success);
  } catch {
    return false;
  }
}

async function flushOne(msg: QueuedMessage): Promise<boolean> {
  try {
    const { error } = await supabase.from("marketplace_messages").insert({
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      recipient_id: msg.recipient_id,
      content: msg.content,
    });
    if (error) throw error;

    await supabase
      .from("marketplace_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", msg.conversation_id);

    return true;
  } catch {
    // Try SMS fallback after 2 failed network attempts
    if (msg.attempts >= 2) {
      const sent = await trySmsFallback(msg);
      if (sent) return true;
    }
    return false;
  }
}

let flushing = false;
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  if (flushing) return { sent: 0, remaining: readQueue().length };
  if (!navigator.onLine) return { sent: 0, remaining: readQueue().length };
  flushing = true;
  let sent = 0;
  try {
    let q = readQueue();
    const remaining: QueuedMessage[] = [];
    for (const msg of q) {
      const ok = await flushOne(msg);
      if (ok) {
        sent += 1;
      } else {
        remaining.push({ ...msg, attempts: msg.attempts + 1 });
      }
    }
    writeQueue(remaining);
    return { sent, remaining: remaining.length };
  } finally {
    flushing = false;
  }
}

// Auto-flush on online + interval
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue();
  });
  setInterval(() => {
    if (navigator.onLine && readQueue().length > 0) flushQueue();
  }, 15000);
}