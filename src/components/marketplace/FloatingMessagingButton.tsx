import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessagingSheet } from "./MessagingSheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function FloatingMessagingButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Fetch unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("marketplace_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (!user) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className={cn(
          "fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all duration-200 hover:scale-105 active:scale-95"
        )}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      <MessagingSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
