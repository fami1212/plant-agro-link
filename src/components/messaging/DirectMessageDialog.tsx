import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send, Loader2, MessageSquare, WifiOff, ArrowDown, Check, CheckCheck,
  Paperclip, X, FileText, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  enqueueMessage,
  flushQueue,
  getQueuedMessages,
  subscribeQueue,
  type QueuedMessage,
} from "@/services/messageQueueService";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
  pending?: boolean;
  attachments?: string[] | null;
}

interface DirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The other participant's user id */
  otherUserId: string;
  /** Display name shown in the header */
  otherUserName?: string;
  /** Optional contextual subtitle (e.g. investment title) */
  context?: string;
}

const QUICK_REPLIES = [
  "Bonjour 👋",
  "C'est noté, merci !",
  "Quel est le délai prévu ?",
  "Pouvez-vous envoyer une photo ?",
  "Je confirme l'étape validée ✅",
  "Je vous rappelle rapidement.",
];

/**
 * Reusable 1:1 chat dialog backed by marketplace_conversations / marketplace_messages
 * (listing_id = null for non-listing contexts like investments).
 * Realtime via Supabase channel on conversation_id.
 */
export function DirectMessageDialog({
  open,
  onOpenChange,
  otherUserId,
  otherUserName,
  context,
}: DirectMessageDialogProps) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [otherPhone, setOtherPhone] = useState<string | null>(null);
  const [newMsgPill, setNewMsgPill] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const atBottomRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Online/offline tracking
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Queue subscription — show pending messages for this conversation
  useEffect(() => {
    return subscribeQueue((q) => {
      const mine = q.filter((m) => m.conversation_id === conversationId);
      setQueuedCount(mine.length);
    });
  }, [conversationId]);

  // Init/fetch conversation when dialog opens
  useEffect(() => {
    if (!open || !user || !otherUserId) return;
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        const [p1, p2] = [user.id, otherUserId].sort();

        // Look for existing conversation (listing_id IS NULL)
        const { data: existing } = await supabase
          .from("marketplace_conversations")
          .select("id")
          .is("listing_id", null)
          .eq("participant_1", p1)
          .eq("participant_2", p2)
          .maybeSingle();

        let convId = existing?.id ?? null;

        if (!convId) {
          const { data: created, error } = await supabase
            .from("marketplace_conversations")
            .insert({ participant_1: p1, participant_2: p2, listing_id: null })
            .select("id")
            .single();
          if (error) throw error;
          convId = created.id;
        }

        if (cancelled) return;
        setConversationId(convId);

        const { data: msgs } = await supabase
          .from("marketplace_messages")
          .select("id, sender_id, recipient_id, content, created_at, is_read")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (!cancelled) setMessages(msgs || []);

        // Mark inbound messages as read
        if (convId) {
          await supabase
            .from("marketplace_messages")
            .update({ is_read: true })
            .eq("conversation_id", convId)
            .eq("recipient_id", user.id)
            .eq("is_read", false);
        }

        // Try to fetch the other user's phone for SMS fallback
        const { data: prof } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", otherUserId)
          .maybeSingle();
        if (!cancelled) setOtherPhone(prof?.phone ?? null);
      } catch (err: any) {
        toast.error(err.message || "Erreur de chargement de la conversation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [open, user, otherUserId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
          // If incoming for us, mark read immediately (dialog is open)
          if (m.recipient_id === user?.id) {
            if (!atBottomRef.current) setNewMsgPill(true);
            await supabase
              .from("marketplace_messages")
              .update({ is_read: true })
              .eq("id", m.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Auto-scroll only if user is near the bottom
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (atBottomRef.current) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        setNewMsgPill(false);
      }
    });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = dist < 40;
    if (atBottomRef.current) setNewMsgPill(false);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    atBottomRef.current = true;
    setNewMsgPill(false);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      setAttachments((a) => [...a, data.publicUrl]);
    } catch (e: any) {
      toast.error(e?.message || "Envoi de la pièce jointe impossible");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSend = async (preset?: string) => {
    const raw = preset ?? input;
    if (!user || !conversationId || sending) return;
    if (!raw.trim() && attachments.length === 0) return;
    const content = raw.trim() || "📎 Pièce jointe";
    const files = attachments;
    setSending(true);
    if (!preset) setInput("");
    setAttachments([]);

    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      sender_id: user.id,
      recipient_id: otherUserId,
      content,
      created_at: new Date().toISOString(),
      pending: true,
      attachments: files,
    };

    // Offline → queue immediately
    if (!navigator.onLine) {
      enqueueMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: otherUserId,
        content,
        recipient_phone: otherPhone,
      });
      setMessages((p) => [...p, optimistic]);
      toast.info("Message en attente — sera envoyé dès la reconnexion", {
        description: otherPhone ? "Repli SMS disponible si nécessaire" : undefined,
      });
      setSending(false);
      return;
    }

    try {
      const { error } = await supabase.from("marketplace_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: otherUserId,
        content,
        attachments: files.length ? files : null,
      });
      if (error) throw error;
      await supabase
        .from("marketplace_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (err: any) {
      // Network/insert failed → queue for retry
      enqueueMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: otherUserId,
        content,
        recipient_phone: otherPhone,
      });
      setMessages((p) => [...p, optimistic]);
      toast.warning("Envoi différé — réessai automatique", {
        description: err.message,
      });
    } finally {
      setSending(false);
      // best-effort flush
      flushQueue();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-primary" />
            {otherUserName || "Discussion"}
          </DialogTitle>
          {context && (
            <DialogDescription className="text-xs truncate">{context}</DialogDescription>
          )}
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[55vh] max-h-[460px] overflow-y-auto px-3 py-3 space-y-2 bg-muted/20"
        >
          {!online && (
            <div className="sticky top-0 z-10 -mt-1 mb-1 flex items-center justify-center gap-1.5 rounded-md bg-warning/15 text-warning text-xs py-1">
              <WifiOff className="w-3 h-3" /> Hors-ligne — messages en file d'attente
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground gap-2">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p>Aucun message. Démarrez la conversation !</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2 text-sm break-words",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-background border border-border/50 rounded-bl-md",
                      msg.pending && "opacity-70"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {msg.attachments.map((url) =>
                          /\.(png|jpe?g|webp|gif)$/i.test(url) ? (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              <img
                                src={url}
                                alt="Pièce jointe de la conversation"
                                loading="lazy"
                                className="rounded-lg max-h-40 object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs underline"
                            >
                              <FileText className="w-3 h-3" /> Document
                            </a>
                          ),
                        )}
                      </div>
                    )}
                    <p
                      className={cn(
                        "text-[10px] mt-1 opacity-70 flex items-center gap-1 justify-end",
                        isMe ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      {isMe && (
                        msg.pending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : msg.is_read ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {newMsgPill && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-[78px] right-4 z-20 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs shadow-lg animate-fade-in"
          >
            <ArrowDown className="w-3 h-3" /> Nouveaux messages
          </button>
        )}

        {/* Réponses rapides */}
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-2 border-t border-border/40 bg-background no-scrollbar">
          <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-1.5" />
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              disabled={!conversationId || sending}
              onClick={() => handleSend(q)}
              className="shrink-0 rounded-full border border-border/60 px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {attachments.length > 0 && (
          <div className="flex gap-2 px-3 pt-2 bg-background overflow-x-auto">
            {attachments.map((url) => (
              <div key={url} className="relative shrink-0">
                <img src={url} alt="Pièce jointe à envoyer" className="w-14 h-14 rounded-lg object-cover border border-border/60" />
                <button
                  type="button"
                  onClick={() => setAttachments((a) => a.filter((x) => x !== url))}
                  className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 p-3 border-t border-border/40 bg-background">
          {queuedCount > 0 && (
            <div className="absolute -translate-y-7 left-3 text-[10px] text-warning flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> {queuedCount} en file
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <Button
            size="icon"
            variant="outline"
            className="rounded-xl shrink-0"
            disabled={uploading || !conversationId}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrire un message…"
            className="rounded-xl"
            disabled={loading || !conversationId}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachments.length === 0) || sending || !conversationId}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}