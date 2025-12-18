import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Mic,
  MicOff,
  Lightbulb,
  Leaf,
  TrendingUp,
  Bug,
  Droplets,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  { icon: Leaf, label: "Conseil culture", prompt: "Quels conseils pour améliorer mes cultures de maïs ?" },
  { icon: Bug, label: "Identifier maladie", prompt: "Comment identifier une maladie sur mes plants de tomates ?" },
  { icon: Droplets, label: "Irrigation", prompt: "Quel est le meilleur moment pour irriguer mes champs ?" },
  { icon: TrendingUp, label: "Prix marché", prompt: "Quels sont les meilleurs prix actuels pour le mil ?" },
];

export function AIAssistant() {
  const { user } = useAuth();
  const { primaryRole } = useRoleAccess();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            userRole: primaryRole,
            userId: user?.id,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Trop de requêtes. Veuillez patienter quelques instants." },
          ]);
          return;
        }
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return newMessages;
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Désolé, une erreur s'est produite. Veuillez réessayer." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="block">Assistant IA Plantéra</span>
              <span className="text-xs font-normal text-muted-foreground">
                Votre conseiller agricole intelligent
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Lightbulb className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-medium">Bonjour ! 👋</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Je suis votre assistant agricole IA. Posez-moi vos questions !
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Suggestions rapides</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickPrompts.map((item, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 justify-start text-left"
                      onClick={() => sendMessage(item.prompt)}
                    >
                      <item.icon className="w-4 h-4 mr-2 shrink-0 text-primary" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Propulsé par l'IA Plantéra • Conseils personnalisés pour votre exploitation
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}