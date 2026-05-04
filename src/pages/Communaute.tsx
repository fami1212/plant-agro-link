import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/community/PostCard";
import { PostForm } from "@/components/community/PostForm";
import { GroupCard } from "@/components/community/GroupCard";
import { GroupDetail } from "@/components/community/GroupDetail";
import { CommentDialog } from "@/components/community/CommentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Plus, ArrowLeft, Search } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export default function Communaute() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [memberGroupIds, setMemberGroupIds] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", group_type: "cooperative" });
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .is("group_id", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      setPosts(data.map(p => ({ ...p, author_name: nameMap[p.user_id] })));
    }
  };

  const fetchLikedPosts = async () => {
    if (!user) return;
    const { data } = await supabase.from("community_likes").select("post_id").eq("user_id", user.id);
    if (data) setLikedPosts(new Set(data.map(l => l.post_id)));
  };

  const fetchGroups = async () => {
    const { data } = await supabase.from("community_groups").select("*").eq("is_public", true).order("member_count", { ascending: false });
    if (data) setGroups(data);
  };

  const fetchMyMemberships = async () => {
    if (!user) return;
    const { data } = await supabase.from("community_members").select("group_id").eq("user_id", user.id);
    const ids = (data || []).map(m => m.group_id);
    setMemberGroupIds(ids);
    if (ids.length > 0) {
      const { data: g } = await supabase.from("community_groups").select("*").in("id", ids);
      setMyGroups(g || []);
    } else {
      setMyGroups([]);
    }
  };

  useEffect(() => { fetchPosts(); fetchLikedPosts(); fetchGroups(); fetchMyMemberships(); }, [user]);

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    await supabase.from("community_members").insert({ group_id: groupId, user_id: user.id });
    toast.success(t("community.joined"));
    fetchMyMemberships();
    fetchGroups();
  };

  const handleLeave = async (groupId: string) => {
    if (!user) return;
    await supabase.from("community_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    toast.success(t("community.left"));
    fetchMyMemberships();
    fetchGroups();
    if (selectedGroup?.id === groupId) setSelectedGroup(null);
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroup.name.trim()) return;
    const { data, error } = await supabase.from("community_groups").insert({
      ...newGroup,
      created_by: user.id,
      member_count: 1,
    }).select().single();
    if (error) { toast.error(t("common.error")); return; }
    await supabase.from("community_members").insert({ group_id: data.id, user_id: user.id, member_role: "admin" });
    toast.success(t("community.groupCreated"));
    setShowCreateGroup(false);
    setNewGroup({ name: "", description: "", group_type: "cooperative" });
    fetchGroups();
    fetchMyMemberships();
  };

  const handleOpenGroup = (groupId: string) => {
    const group = [...myGroups, ...groups].find(g => g.id === groupId);
    if (group) setSelectedGroup(group);
  };

  const filteredGroups = searchQuery
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groups;

  if (selectedGroup) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          <PageHeader showLogo title={selectedGroup.name} subtitle={t("community.group")} />
          <div className="px-4 pb-24">
            <Button variant="ghost" size="sm" className="mb-3 gap-1" onClick={() => setSelectedGroup(null)}>
              <ArrowLeft className="w-4 h-4" /> {t("common.back")}
            </Button>
            <GroupDetail group={selectedGroup} />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title={t("community.title")} subtitle={t("community.subtitle")} />
        <div className="px-4 pb-24">
          <Tabs defaultValue="feed" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="feed" className="flex-1 text-xs">{t("community.feed")}</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 text-xs">{t("community.groups")}</TabsTrigger>
              <TabsTrigger value="mygroups" className="flex-1 text-xs">{t("community.myGroups")}</TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="space-y-4">
              <PostForm onSuccess={fetchPosts} />
              {posts.length === 0 ? (
                <EmptyState title={t("community.noPosts")} description={t("community.noPostsDesc")} />
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onRefresh={fetchPosts}
                    onComment={(id) => setCommentPostId(id)}
                    initialLiked={likedPosts.has(post.id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="groups" className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("community.searchGroups")}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-xl gap-2"><Plus className="w-4 h-4" />{t("community.createGroup")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("community.createGroup")}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder={t("community.groupName")} value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                    <Textarea placeholder={t("community.groupDescription")} value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} />
                    <Select value={newGroup.group_type} onValueChange={v => setNewGroup({ ...newGroup, group_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cooperative">{t("community.groupType.cooperative")}</SelectItem>
                        <SelectItem value="region">{t("community.groupType.region")}</SelectItem>
                        <SelectItem value="culture">{t("community.groupType.culture")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="w-full" onClick={handleCreateGroup}>{t("common.create")}</Button>
                  </div>
                </DialogContent>
              </Dialog>
              {filteredGroups.length === 0 ? (
                <EmptyState title={t("community.noGroups")} description={t("community.noGroupsDesc")} />
              ) : (
                filteredGroups.map(g => (
                  <GroupCard key={g.id} group={g} isMember={memberGroupIds.includes(g.id)} onJoin={handleJoin} onLeave={handleLeave} onOpen={handleOpenGroup} />
                ))
              )}
            </TabsContent>

            <TabsContent value="mygroups" className="space-y-3">
              {myGroups.length === 0 ? (
                <EmptyState title={t("community.noGroups")} description={t("community.noGroupsDesc")} />
              ) : (
                myGroups.map(g => (
                  <GroupCard key={g.id} group={g} isMember onLeave={handleLeave} onOpen={handleOpenGroup} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CommentDialog
        postId={commentPostId}
        open={!!commentPostId}
        onOpenChange={(open) => { if (!open) setCommentPostId(null); }}
        onCommentAdded={fetchPosts}
      />
    </AppLayout>
  );
}
