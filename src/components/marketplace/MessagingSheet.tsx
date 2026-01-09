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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, Loader2, MessageCircle, ArrowLeft, 
  Check, CheckCheck, Phone, Image, Paperclip, X, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  other_user?: { full_name: string };
  last_message?: string;
  unread_count?: number;
}

interface MessagingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // For opening a specific conversation
  conversationId?: string;
  // For starting a new conversation
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
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; type: string; name: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

    // Fetch other user info and last message for each conversation
    const enrichedConversations = await Promise.all(
      (data || []).map(async (conv) => {
        const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
        
        // Get other user's profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", otherUserId)
          .single();

        // Get last message
        const { data: lastMsgData } = await supabase
          .from("marketplace_messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from("marketplace_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("recipient_id", user.id)
          .eq("is_read", false);

        return {
          ...conv,
          other_user: profileData || { full_name: "Utilisateur" },
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
        .select("full_name")
        .eq("user_id", otherUserId)
        .single();

      setActiveConversation({
        ...convData,
        other_user: profileData || { full_name: "Utilisateur" },
      });
      setView("chat");
      await fetchMessages(convId);
    }
    setLoading(false);
  };

  const findOrCreateConversation = async () => {
    if (!user || !sellerId || !listingId) return;
    setLoading(true);

    // Try to find existing conversation
    const { data: existing } = await supabase
      .from("marketplace_conversations")
      .select("*")
      .eq("listing_id", listingId)
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${sellerId}),and(participant_1.eq.${sellerId},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      await loadConversationById(existing.id);
    } else {
      // Create new conversation
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
      // Enrich messages with sender names
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
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
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

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      // Update last_message_at
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

  const openConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setView("chat");
    fetchMessages(conv.id);
  };

  const goBack = () => {
    setView("list");
    setActiveConversation(null);
    setMessages([]);
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        {/* Header */}
        {view === "list" ? (
          <SheetHeader className="p-4 border-b bg-primary text-primary-foreground">
            <SheetTitle className="flex items-center gap-3 text-primary-foreground">
              <MessageCircle className="w-6 h-6" />
              <span>Messages</span>
            </SheetTitle>
          </SheetHeader>
        ) : (
          <div className="p-3 border-b bg-primary text-primary-foreground flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={goBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="h-10 w-10 bg-primary-foreground/20">
              <AvatarFallback className="bg-transparent text-primary-foreground text-sm">
                {getInitials(activeConversation?.other_user?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {activeConversation?.other_user?.full_name}
              </p>
              <p className="text-xs text-primary-foreground/70 truncate">
                {activeConversation?.listing?.title}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Phone className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : view === "list" ? (
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Aucune conversation</p>
                <p className="text-sm">Vos messages apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => openConversation(conv)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(conv.other_user?.full_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">
                          {conv.other_user?.full_name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.listing?.title}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message || "Nouvelle conversation"}
                      </p>
                    </div>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <>
            {/* Chat messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-4 bg-muted/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Commencez la conversation!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg, idx) => {
                    const isOwn = msg.sender_id === user?.id;
                    const showTime =
                      idx === 0 ||
                      new Date(msg.created_at).getTime() -
                        new Date(messages[idx - 1].created_at).getTime() >
                        300000;

                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <p className="text-center text-xs text-muted-foreground my-2">
                            {formatChatTime(msg.created_at)}
                          </p>
                        )}
                        <div
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-background rounded-bl-md"
                            )}
                          >
                            {!isOwn && (
                              <p className="text-xs font-semibold text-primary mb-1">
                                {msg.sender_name}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((url, idx) => {
                                  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                  return isImage ? (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt="Attachment"
                                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                                      onClick={() => window.open(url, "_blank")}
                                    />
                                  ) : (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg text-xs",
                                        isOwn ? "bg-primary-foreground/20" : "bg-muted"
                                      )}
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="truncate">Fichier joint</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                            <div
                              className={cn(
                                "flex items-center justify-end gap-1 mt-1",
                                isOwn
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              <span className="text-[10px]">
                                {formatChatTime(msg.created_at)}
                              </span>
                              {isOwn && (
                                msg.is_read ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="px-3 py-2 border-t bg-muted/30 flex gap-2 flex-wrap">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group">
                    {att.type === "image" ? (
                      <img src={att.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Message input */}
            <div className="p-3 border-t bg-background flex items-center gap-2">
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
              
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                <Image className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Écrivez un message..."
                disabled={sending || uploading}
                className="flex-1 rounded-full bg-muted border-0"
              />
              <Button
                size="icon"
                className="rounded-full shrink-0"
                onClick={sendMessage}
                disabled={sending || uploading || (!newMessage.trim() && attachments.length === 0)}
              >
                {sending || uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
