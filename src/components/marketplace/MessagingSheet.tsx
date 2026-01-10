import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, Loader2, MessageCircle, ArrowLeft, 
  Check, CheckCheck, Phone, Image, Paperclip, X, FileText, Search,
  Mic, Square, Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useChatVoiceRecorder } from "@/hooks/useChatVoiceRecorder";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  conversation_id: string;
  attachments?: string[] | null;
  sender_name?: string;
}

interface Conversation {
  id: string;
  listing_id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  listing?: { title: string; images: string[] | null };
  other_user?: { full_name: string; avatar_url?: string | null };
  last_message?: string;
  unread_count?: number;
}

interface MessagingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  sellerId?: string;
  sellerName?: string;
  listingId?: string;
  listingTitle?: string;
}

export function MessagingSheet({
  open,
  onOpenChange,
  conversationId: initialConversationId,
  sellerId,
  sellerName,
  listingId,
  listingTitle,
}: MessagingSheetProps) {
  const { user, profile } = useAuth();
  const [view, setView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; type: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice recording hook
  const {
    isRecording,
    recordingDuration,
    isUploading: isUploadingVoice,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  } = useChatVoiceRecorder();

  // Handle initial conversation or new chat
  useEffect(() => {
    if (open && user) {
      if (initialConversationId) {
        loadConversationById(initialConversationId);
      } else if (sellerId && listingId) {
        findOrCreateConversation();
      } else {
        setView("list");
        fetchConversations();
      }
    }
  }, [open, user, initialConversationId, sellerId, listingId]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("marketplace_conversations")
      .select(`
        *,
        listing:marketplace_listings(title, images)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
      return;
    }

    const enrichedConversations = await Promise.all(
      (data || []).map(async (conv) => {
        const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", otherUserId)
          .maybeSingle();

        const { data: lastMsgData } = await supabase
          .from("marketplace_messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from("marketplace_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("recipient_id", user.id)
          .eq("is_read", false);

        return {
          ...conv,
          other_user: profileData || { full_name: "Utilisateur inconnu" },
          last_message: lastMsgData?.content || "",
          unread_count: unreadCount || 0,
        };
      })
    );

    setConversations(enrichedConversations);
    setLoading(false);
  };

  const loadConversationById = async (convId: string) => {
    setLoading(true);
    
    const { data: convData } = await supabase
      .from("marketplace_conversations")
      .select(`*, listing:marketplace_listings(title, images)`)
      .eq("id", convId)
      .single();

    if (convData && user) {
      const otherUserId = convData.participant_1 === user.id ? convData.participant_2 : convData.participant_1;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", otherUserId)
        .maybeSingle();

      setActiveConversation({
        ...convData,
        other_user: profileData || { full_name: "Utilisateur inconnu" },
      });
      setView("chat");
      await fetchMessages(convId);
    }
    setLoading(false);
  };

  const findOrCreateConversation = async () => {
    if (!user || !sellerId || !listingId) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from("marketplace_conversations")
      .select("*")
      .eq("listing_id", listingId)
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${sellerId}),and(participant_1.eq.${sellerId},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      await loadConversationById(existing.id);
    } else {
      const { data: newConv, error } = await supabase
        .from("marketplace_conversations")
        .insert({
          listing_id: listingId,
          participant_1: user.id,
          participant_2: sellerId,
        })
        .select()
        .single();

      if (error) {
        toast.error("Erreur lors de la création de la conversation");
        setLoading(false);
        return;
      }

      setActiveConversation({
        ...newConv,
        listing: { title: listingTitle || "", images: null },
        other_user: { full_name: sellerName || "Vendeur" },
      });
      setView("chat");
      setMessages([]);
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("marketplace_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", senderIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      const enrichedMessages = (data || []).map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id) || "Utilisateur"
      }));
      
      setMessages(enrichedMessages);
      markMessagesAsRead(convId);
    }
  };

  const markMessagesAsRead = async (convId: string) => {
    if (!user) return;
    await supabase
      .from("marketplace_messages")
      .update({ is_read: true })
      .eq("conversation_id", convId)
      .eq("recipient_id", user.id)
      .eq("is_read", false);
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!activeConversation || !user) return;

    const channel = supabase
      .channel(`conv-${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch sender name
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", newMsg.sender_id)
            .maybeSingle();
          
          setMessages((prev) => [...prev, {
            ...newMsg,
            sender_name: senderProfile?.full_name || "Utilisateur"
          }]);
          
          if (newMsg.recipient_id === user.id) {
            markMessagesAsRead(activeConversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id, user]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!activeConversation || !user) return;

    const channel = supabase
      .channel(`typing-${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const data = payload.new as { user_id: string; is_typing: boolean };
          if (data.user_id !== user.id) {
            setIsOtherTyping(data.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!activeConversation || !user) return;

    await supabase
      .from("typing_indicators")
      .upsert({
        conversation_id: activeConversation.id,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      }, { onConflict: "conversation_id,user_id" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Update typing status
    updateTypingStatus(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(fileName, file);
    
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 10MB)");
        continue;
      }
      
      const url = await uploadFile(file);
      if (url) {
        setAttachments(prev => [...prev, {
          url,
          type: isImage ? "image" : "file",
          name: file.name
        }]);
      }
    }
    
    setUploading(false);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !user || !activeConversation) return;

    const recipientId = activeConversation.participant_1 === user.id 
      ? activeConversation.participant_2 
      : activeConversation.participant_1;

    setSending(true);
    updateTypingStatus(false);
    
    const attachmentUrls = attachments.map(a => a.url);
    
    const { error } = await supabase.from("marketplace_messages").insert({
      conversation_id: activeConversation.id,
      sender_id: user.id,
      recipient_id: recipientId,
      content: newMessage.trim() || (attachments.length > 0 ? "📎 Pièce jointe" : ""),
      attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
    } else {
      setNewMessage("");
      setAttachments([]);
      await supabase
        .from("marketplace_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConversation.id);
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Send voice message
  const handleSendVoiceMessage = async () => {
    if (!user || !activeConversation) return;
    
    const result = await stopRecording(user.id);
    if (!result) return;
    
    const recipientId = activeConversation.participant_1 === user.id 
      ? activeConversation.participant_2 
      : activeConversation.participant_1;
    
    setSending(true);
    
    const { error } = await supabase.from("marketplace_messages").insert({
      conversation_id: activeConversation.id,
      sender_id: user.id,
      recipient_id: recipientId,
      content: `🎤 Message vocal (${formatDuration(result.duration)})`,
      attachments: [result.url],
    });

    if (error) {
      toast.error("Erreur lors de l'envoi du message vocal");
    } else {
      await supabase
        .from("marketplace_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConversation.id);
    }
    setSending(false);
  };

  const openConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setView("chat");
    fetchMessages(conv.id);
  };

  const goBack = () => {
    setView("list");
    setActiveConversation(null);
    setMessages([]);
    setIsOtherTyping(false);
    fetchConversations();
  };

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Hier";
    return format(d, "dd/MM");
  };

  const formatChatTime = (date: string) => {
    return format(new Date(date), "HH:mm");
  };

  const formatDateHeader = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return "Aujourd'hui";
    if (isYesterday(d)) return "Hier";
    return format(d, "EEEE d MMMM", { locale: fr });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredConversations = conversations.filter(conv => 
    conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.listing?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = format(new Date(msg.created_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col bg-[#efeae2] dark:bg-[#0b141a]"
      >
        {/* Header */}
        {view === "list" ? (
          <div className="bg-primary text-primary-foreground">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle className="flex items-center gap-3 text-primary-foreground">
                <MessageCircle className="w-6 h-6" />
                <span className="text-xl font-semibold">Messages</span>
              </SheetTitle>
            </SheetHeader>
            {/* Search bar */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-primary-foreground/10 border-0 text-primary-foreground placeholder:text-primary-foreground/60 rounded-full"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-primary text-primary-foreground flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
              onClick={goBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="h-10 w-10 ring-2 ring-primary-foreground/20">
              {activeConversation?.other_user?.avatar_url ? (
                <AvatarImage src={activeConversation.other_user.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm font-medium">
                {getInitials(activeConversation?.other_user?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-base">
                {activeConversation?.other_user?.full_name}
              </p>
              {isOtherTyping ? (
                <p className="text-xs text-primary-foreground/80 animate-pulse">
                  écrit...
                </p>
              ) : (
                <p className="text-xs text-primary-foreground/70 truncate">
                  {activeConversation?.listing?.title}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
            >
              <Phone className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : view === "list" ? (
          <ScrollArea className="flex-1 bg-background">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 opacity-50" />
                </div>
                <p className="text-lg font-medium">Aucune conversation</p>
                <p className="text-sm mt-1">Vos messages apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left active:bg-muted/70"
                    onClick={() => openConversation(conv)}
                  >
                    <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                      {conv.other_user?.avatar_url ? (
                        <AvatarImage src={conv.other_user.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary font-semibold">
                        {getInitials(conv.other_user?.full_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold truncate text-foreground">
                          {conv.other_user?.full_name}
                        </p>
                        <span className={cn(
                          "text-xs",
                          conv.unread_count && conv.unread_count > 0 
                            ? "text-primary font-medium" 
                            : "text-muted-foreground"
                        )}>
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-0.5">
                        {conv.listing?.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-sm truncate flex-1",
                          conv.unread_count && conv.unread_count > 0 
                            ? "text-foreground font-medium" 
                            : "text-muted-foreground"
                        )}>
                          {conv.last_message || "Nouvelle conversation"}
                        </p>
                        {conv.unread_count && conv.unread_count > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5 ml-2">
                            {conv.unread_count > 99 ? "99+" : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <>
            {/* Chat messages with WhatsApp background */}
            <ScrollArea 
              ref={scrollRef} 
              className="flex-1 p-3"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="bg-background/80 backdrop-blur-sm rounded-2xl px-6 py-4 text-center shadow-sm">
                    <p className="text-sm font-medium">👋 Commencez la conversation!</p>
                    <p className="text-xs mt-1 opacity-70">Envoyez un message pour démarrer</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      {/* Date header */}
                      <div className="flex justify-center my-3">
                        <span className="bg-background/90 backdrop-blur-sm text-muted-foreground text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium">
                          {formatDateHeader(msgs[0].created_at)}
                        </span>
                      </div>
                      
                      {/* Messages */}
                      {msgs.map((msg, idx) => {
                        const isOwn = msg.sender_id === user?.id;
                        const showAvatar = !isOwn && (idx === 0 || msgs[idx - 1]?.sender_id !== msg.sender_id);

                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex gap-2 mb-1",
                              isOwn ? "justify-end" : "justify-start"
                            )}
                          >
                            {!isOwn && (
                              <div className="w-8 shrink-0">
                                {showAvatar && (
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                      {getInitials(msg.sender_name || "U")}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                            <div
                              className={cn(
                                "max-w-[75%] rounded-2xl px-3 py-2 shadow-sm relative",
                                isOwn
                                  ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-br-sm"
                                  : "bg-background rounded-bl-sm"
                              )}
                            >
                              {/* Sender name for received messages */}
                              {!isOwn && showAvatar && (
                                <p className="text-xs font-semibold text-primary mb-1">
                                  {msg.sender_name}
                                </p>
                              )}
                              
                              {/* Message content */}
                              {msg.content && 
                               msg.content !== "📎 Pièce jointe" && 
                               !msg.content.startsWith("🎤") && (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.content}
                                </p>
                              )}
                              
                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-1 space-y-1">
                                  {msg.attachments.map((url, idx) => {
                                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                    const isVoice = url.match(/\.(webm|mp3|wav|ogg|m4a)$/i) || msg.content.startsWith("🎤");
                                    
                                    if (isVoice) {
                                      return (
                                        <VoiceMessagePlayer 
                                          key={idx} 
                                          audioUrl={url} 
                                          isOwn={isOwn}
                                        />
                                      );
                                    }
                                    
                                    return isImage ? (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt="Image"
                                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(url, "_blank")}
                                      />
                                    ) : (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors",
                                          isOwn 
                                            ? "bg-black/5 hover:bg-black/10" 
                                            : "bg-muted hover:bg-muted/80"
                                        )}
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="truncate">Fichier joint</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Time and status */}
                              <div className={cn(
                                "flex items-center justify-end gap-1 mt-1",
                                isOwn ? "text-foreground/50" : "text-muted-foreground"
                              )}>
                                <span className="text-[10px]">
                                  {formatChatTime(msg.created_at)}
                                </span>
                                {isOwn && (
                                  msg.is_read ? (
                                    <CheckCheck className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* Typing indicator */}
                  {isOtherTyping && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-8 shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {getInitials(activeConversation?.other_user?.full_name || "U")}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="bg-background rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="px-3 py-2 border-t bg-background/95 backdrop-blur-sm flex gap-2 flex-wrap">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group">
                    {att.type === "image" ? (
                      <img src={att.url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-border" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Message input */}
            <div className="p-3 bg-background border-t flex items-center gap-2">
              <input
                type="file"
                ref={imageInputRef}
                onChange={(e) => handleFileSelect(e, true)}
                accept="image/*"
                multiple
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelect(e, false)}
                multiple
                className="hidden"
              />
              
              {isRecording ? (
                // Recording mode UI
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                    onClick={cancelRecording}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                  
                  <div className="flex-1 flex items-center justify-center gap-3 bg-destructive/10 rounded-full px-4 py-2">
                    <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                    <span className="text-destructive font-medium tabular-nums">
                      {formatDuration(recordingDuration)}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div 
                          key={i}
                          className="w-1 bg-destructive/60 rounded-full animate-pulse"
                          style={{ 
                            height: `${Math.random() * 16 + 8}px`,
                            animationDelay: `${i * 100}ms`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    size="icon"
                    className="rounded-full shrink-0 h-10 w-10 bg-primary hover:bg-primary/90 shadow-md"
                    onClick={handleSendVoiceMessage}
                    disabled={isUploadingVoice || sending}
                  >
                    {isUploadingVoice || sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </>
              ) : (
                // Normal text input mode
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  
                  <div className="flex-1 relative">
                    <Input
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Écrivez un message..."
                      disabled={sending || uploading}
                      className="rounded-full bg-muted border-0 pr-12 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary hover:bg-transparent"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Image className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Show mic or send button based on message content */}
                  {newMessage.trim() || attachments.length > 0 ? (
                    <Button
                      size="icon"
                      className="rounded-full shrink-0 h-10 w-10 bg-primary hover:bg-primary/90 shadow-md"
                      onClick={sendMessage}
                      disabled={sending || uploading}
                    >
                      {sending || uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      className="rounded-full shrink-0 h-10 w-10 bg-primary hover:bg-primary/90 shadow-md"
                      onClick={startRecording}
                    >
                      <Mic className="w-5 h-5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
