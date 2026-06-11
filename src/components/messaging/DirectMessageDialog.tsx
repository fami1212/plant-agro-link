import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
          .select("id, sender_id, recipient_id, content, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (!cancelled) setMessages(msgs || []);
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
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as Message).id)
              ? prev
              : [...prev, payload.new as Message]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !conversationId || !input.trim() || sending) return;
    const content = input.trim();
    setSending(true);
    setInput("");
    try {
      const { error } = await supabase.from("marketplace_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: otherUserId,
        content,
      });
      if (error) throw error;
      await supabase
        .from("marketplace_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (err: any) {
      toast.error(err.message || "Erreur d'envoi");
      setInput(content);
    } finally {
      setSending(false);
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
          className="h-[55vh] max-h-[460px] overflow-y-auto px-3 py-3 space-y-2 bg-muted/20"
        >
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
                        : "bg-background border border-border/50 rounded-bl-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1 opacity-70",
                        isMe ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 p-3 border-t border-border/40 bg-background">
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
            onClick={handleSend}
            disabled={!input.trim() || sending || !conversationId}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}