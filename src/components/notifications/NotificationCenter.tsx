import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
  DollarSign,
  Stethoscope,
  Sprout,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  marketplace: <ShoppingBag className="w-4 h-4 text-primary" />,
  investment: <DollarSign className="w-4 h-4 text-purple-500" />,
  veterinary: <Stethoscope className="w-4 h-4 text-blue-500" />,
  crop: <Sprout className="w-4 h-4 text-green-600" />,
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { sendLocalNotification } = usePushNotifications();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          toast.info(newNotif.title, { description: newNotif.message });
          sendLocalNotification(newNotif.title, {
            body: newNotif.message,
            link: newNotif.link || undefined,
            tag: newNotif.id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sendLocalNotification]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data as Notification[]);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 flex gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleClick(notif)}
                >
                  <div className="mt-0.5">
                    {typeIcons[notif.type] || typeIcons.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm ${
                          !notif.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notif.title}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
