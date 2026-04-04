import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupChat } from "./GroupChat";
import { PostCard } from "./PostCard";
import { PostForm } from "./PostForm";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Users, MessageCircle, FileText } from "lucide-react";

interface GroupDetailProps {
  group: {
    id: string;
    name: string;
    description?: string | null;
    group_type: string;
    member_count: number;
    created_by: string;
  };
}

export function GroupDetail({ group }: GroupDetailProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
        setPosts(data.map(p => ({ ...p, author_name: nameMap[p.user_id] })));
      } else {
        setPosts(data);
      }
    }
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("community_members")
      .select("*")
      .eq("group_id", group.id)
      .order("joined_at", { ascending: true });
    if (data) {
      const userIds = data.map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
        setMembers(data.map(m => ({ ...m, name: nameMap[m.user_id] || m.user_id.slice(0, 8) })));
      }
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchMembers();
  }, [group.id]);

  return (
    <div className="space-y-4">
      {group.description && (
        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl">{group.description}</p>
      )}

      <Tabs defaultValue="chat" className="space-y-3">
        <TabsList className="w-full">
          <TabsTrigger value="chat" className="flex-1 text-xs gap-1">
            <MessageCircle className="w-3.5 h-3.5" /> {t("community.chat")}
          </TabsTrigger>
          <TabsTrigger value="feed" className="flex-1 text-xs gap-1">
            <FileText className="w-3.5 h-3.5" /> {t("community.feed")}
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-1 text-xs gap-1">
            <Users className="w-3.5 h-3.5" /> {t("community.members")} ({members.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <GroupChat groupId={group.id} />
        </TabsContent>

        <TabsContent value="feed" className="space-y-3">
          <PostForm groupId={group.id} onSuccess={fetchPosts} />
          {posts.length === 0 ? (
            <EmptyState title={t("community.noPosts")} description={t("community.noPostsDesc")} />
          ) : (
            posts.map(post => <PostCard key={post.id} post={post} onRefresh={fetchPosts} />)
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/30">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {(m.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{m.member_role}</p>
              </div>
              {m.user_id === group.created_by && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {t("community.admin")}
                </span>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
