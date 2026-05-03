import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { postContentSchema, firstError } from "@/lib/validation";

interface PostFormProps {
  groupId?: string;
  onSuccess?: () => void;
}

export function PostForm({ groupId, onSuccess }: PostFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("actualite");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;
    const parsed = postContentSchema.safeParse(content);
    if (!parsed.success) {
      toast.error(firstError(parsed.error));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        content: parsed.data,
        post_type: postType,
        group_id: groupId || null,
      });
      if (error) throw error;
      setContent("");
      toast.success(t("community.postCreated"));
      onSuccess?.();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("community.writeSomething")}
        maxLength={2000}
        className="min-h-[80px] resize-none border-0 bg-muted/30 rounded-xl"
      />
      <div className="flex items-center gap-2">
        <Select value={postType} onValueChange={setPostType}>
          <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="actualite">{t("community.type.news")}</SelectItem>
            <SelectItem value="question">{t("community.type.question")}</SelectItem>
            <SelectItem value="conseil">{t("community.type.advice")}</SelectItem>
            <SelectItem value="annonce">{t("community.type.announcement")}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="ml-auto rounded-xl gap-1.5" onClick={handleSubmit} disabled={loading || !content.trim()}>
          <Send className="w-3.5 h-3.5" />
          {t("community.publish")}
        </Button>
      </div>
    </div>
  );
}
