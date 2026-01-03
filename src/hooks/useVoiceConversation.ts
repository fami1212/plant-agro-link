import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Json } from "@/integrations/supabase/types";

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function useVoiceConversation() {
  const { user } = useAuth();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);

  const startNewConversation = useCallback(async (language: string = "fr") => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from("voice_conversations")
        .insert({
          user_id: user.id,
          language,
          messages: [] as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      setMessages([]);
      return data.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  }, [user?.id]);

  const addMessage = useCallback(async (
    role: "user" | "assistant",
    content: string
  ) => {
    if (!currentConversationId) return;

    const newMessage: VoiceMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    try {
      // Generate title from first user message
      const title = messages.length === 0 && role === "user"
        ? content.substring(0, 50) + (content.length > 50 ? "..." : "")
        : undefined;

      const updateData: { messages: Json; title?: string } = {
        messages: updatedMessages as unknown as Json,
      };
      
      if (title) {
        updateData.title = title;
      }

      await supabase
        .from("voice_conversations")
        .update(updateData)
        .eq("id", currentConversationId);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }, [currentConversationId, messages]);

  const endConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  return {
    currentConversationId,
    messages,
    startNewConversation,
    addMessage,
    endConversation,
  };
}
