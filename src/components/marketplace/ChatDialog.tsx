import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  recipientId: string;
  recipientName: string;
  productTitle: string;
}

export function ChatDialog({
  open,
  onOpenChange,
  offerId,
  recipientId,
  recipientName,
  productTitle,
}: ChatDialogProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && offerId) {
      fetchMessages();
      markAsRead();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`messages-${offerId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'marketplace_messages',
            filter: `offer_id=eq.${offerId}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.sender_id !== user?.id) {
              markAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, offerId, user?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_messages")
      .select("*")
      .eq("offer_id", offerId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async () => {
    if (!user) return;
    await supabase
      .from("marketplace_messages")
      .update({ is_read: true })
      .eq("offer_id", offerId)
      .eq("recipient_id", user.id)
      .eq("is_read", false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from("marketplace_messages").insert({
      offer_id: offerId,
      sender_id: user.id,
      recipient_id: recipientId,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span>{recipientName}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">
                {productTitle}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>Aucun message</p>
              <p className="text-sm">Commencez la conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Votre message..."
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
