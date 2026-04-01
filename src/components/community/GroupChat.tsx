import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

interface GroupChatProps {
  groupId: string;
}

export function GroupChat({ groupId }: GroupChatProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("community_group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!user || !input.trim()) return;
    await supabase.from("community_group_messages").insert({
      group_id: groupId,
      sender_id: user.id,
      content: input.trim(),
    });
    setInput("");
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name || msg.sender_id.slice(0, 6)}</p>}
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 p-3 border-t border-border/30">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("community.typeMessage")} className="rounded-xl" onKeyDown={(e) => e.key === "Enter" && handleSend()} />
        <Button size="icon" className="rounded-xl shrink-0" onClick={handleSend} disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
