import { supabase } from "@/integrations/supabase/client";

/**
 * Repli SMS/USSD pour les notifications critiques (escrow & litiges)
 * lorsque les notifications push ne sont pas disponibles ou refusées.
 */

const CRITICAL_TYPES = [
  "escrow_step",
  "escrow",
  "dispute",
  "dispute_opened",
  "milestone",
];

export function isCriticalNotification(type: string) {
  return CRITICAL_TYPES.includes(type);
}

const SENT_KEY = "plantera_sms_fallback_sent_v1";

function alreadySent(id: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(SENT_KEY) || "[]");
    if (list.includes(id)) return true;
    localStorage.setItem(SENT_KEY, JSON.stringify([...list.slice(-50), id]));
    return false;
  } catch {
    return false;
  }
}

/**
 * Envoie la notification par SMS (passerelle SMS/USSD) si le push
 * n'a pas pu être délivré. Silencieux en cas d'échec.
 */
export async function smsFallbackNotification(params: {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  pushDelivered: boolean;
}): Promise<boolean> {
  const { notificationId, userId, type, title, message, pushDelivered } = params;
  if (pushDelivered) return false;
  if (!isCriticalNotification(type)) return false;
  if (alreadySent(notificationId)) return false;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", userId)
      .maybeSingle();

    const phone = (profile as any)?.phone;
    if (!phone) return false;

    const { data, error } = await supabase.functions.invoke("ussd-sms-gateway", {
      body: {
        type: "send_sms",
        to: phone,
        message: `${title} - ${message}`.slice(0, 160),
      },
    });
    if (error) return false;
    return !!(data as any)?.success;
  } catch {
    return false;
  }
}