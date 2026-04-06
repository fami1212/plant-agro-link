import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    images?: string[] | null;
    post_type: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    author_name?: string;
  };
  onComment?: (postId: string) => void;
  onRefresh?: () => void;
  initialLiked?: boolean;
}

export function PostCard({ post, onComment, onRefresh, initialLiked = false }: PostCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const handleLike = async () => {
    if (!user) return;
    try {
      if (liked) {
        await supabase.from("community_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
        setLikesCount(c => c - 1);
      } else {
        await supabase.from("community_likes").insert({ post_id: post.id, user_id: user.id });
        setLikesCount(c => c + 1);
      }
      setLiked(!liked);
    } catch { toast.error("Erreur"); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.author_name || "Plantéra", text: post.content.slice(0, 100) });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(post.content);
      toast.success(t("community.copied"));
    }
  };

  const typeColors: Record<string, string> = {
    actualite: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    question: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    conseil: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    annonce: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  const typeLabels: Record<string, string> = {
    actualite: t("community.type.news"),
    question: t("community.type.question"),
    conseil: t("community.type.advice"),
    annonce: t("community.type.announcement"),
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
    <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {(post.author_name || "U")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{post.author_name || t("common.user")}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", typeColors[post.post_type] || typeColors.actualite)}>
          {typeLabels[post.post_type] || post.post_type}
        </span>
      </div>

      <p className="text-sm leading-relaxed">{post.content}</p>

      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {post.images.map((img, i) => (
            <img key={i} src={img} alt="" className="rounded-xl w-full h-32 object-cover" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 pt-1 border-t border-border/20">
        <Button variant="ghost" size="sm" className={cn("gap-1.5 text-xs", liked && "text-red-500")} onClick={handleLike}>
          <Heart className={cn("w-4 h-4", liked && "fill-current")} />
          {likesCount}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => onComment?.(post.id)}>
          <MessageCircle className="w-4 h-4" />
          {post.comments_count}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs ml-auto" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
