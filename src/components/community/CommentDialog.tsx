import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface CommentDialogProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentAdded?: () => void;
}

export function CommentDialog({ postId, open, onOpenChange, onCommentAdded }: CommentDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [comments, setComments] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    if (!postId) return;
    const { data } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
        setComments(data.map(c => ({ ...c, author_name: nameMap[c.user_id] || c.user_id.slice(0, 6) })));
      } else {
        setComments(data);
      }
    }
  };

  useEffect(() => {
    if (open && postId) fetchComments();
  }, [open, postId]);

  const handleSend = async () => {
    if (!user || !postId || !input.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: input.trim(),
    });
    setLoading(false);
    if (error) { toast.error(t("common.error")); return; }
    setInput("");
    fetchComments();
    onCommentAdded?.();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("community.comments")} ({comments.length})</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("community.noComments")}</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {(c.author_name || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/30 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{c.author_name}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t border-border/30">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t("community.writeComment")}
            className="rounded-xl"
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" className="rounded-xl shrink-0" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
