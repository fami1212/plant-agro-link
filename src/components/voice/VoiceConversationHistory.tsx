import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, MessageCircle, Clock, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface VoiceConversation {
  id: string;
  title: string | null;
  messages: VoiceMessage[];
  language: string;
  created_at: string;
  updated_at: string;
}

export function VoiceConversationHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['voice-conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data?.map(conv => ({
        ...conv,
        messages: (conv.messages as unknown as VoiceMessage[]) || [],
      })) as VoiceConversation[];
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('voice_conversations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-conversations'] });
      toast.success("Conversation supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const getLanguageFlag = (lang: string) => {
    switch (lang) {
      case 'fr': return '🇫🇷';
      case 'wo': return '🇸🇳';
      case 'en': return '🇬🇧';
      default: return '🌍';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!conversations?.length) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune conversation vocale enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Historique des conversations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="divide-y">
            {conversations.map((conv) => (
              <div key={conv.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="flex-1 text-left"
                    onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{getLanguageFlag(conv.language)}</span>
                      <span className="font-medium text-sm line-clamp-1">
                        {conv.title || "Conversation"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(conv.updated_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                      <Badge variant="outline" className="text-xs">
                        {(conv.messages as VoiceMessage[]).length} msg
                      </Badge>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(conv.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {expandedId === conv.id && (
                  <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
                    {(conv.messages as VoiceMessage[]).slice(0, 6).map((msg, i) => (
                      <div
                        key={i}
                        className={`text-xs p-2 rounded ${
                          msg.role === "user"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted"
                        }`}
                      >
                        <span className="font-medium">
                          {msg.role === "user" ? "Vous: " : "IA: "}
                        </span>
                        <span className="line-clamp-2">{msg.content}</span>
                      </div>
                    ))}
                    {(conv.messages as VoiceMessage[]).length > 6 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{(conv.messages as VoiceMessage[]).length - 6} autres messages
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
