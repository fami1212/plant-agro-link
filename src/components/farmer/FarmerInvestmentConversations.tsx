import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { DirectMessageDialog } from "@/components/messaging/DirectMessageDialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ConversationRow {
  investor_id: string;
  investor_name: string;
  investment_id: string;
  investment_title: string;
  investment_status: string;
  last_message: string | null;
  last_message_at: string | null;
  unread: number;
}

/**
 * Conversations dédiées entre l'agriculteur et chaque investisseur,
 * filtrables par investissement, avec aperçu du dernier message et badge
 * messages non lus.
 */
export function FarmerInvestmentConversations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [filterId, setFilterId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [chatWith, setChatWith] = useState<ConversationRow | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Investissements reçus → liste des investisseurs
      const { data: invs } = await supabase
        .from("investments")
        .select("id, investor_id, title, status, investment_date")
        .eq("farmer_id", user.id)
        .order("investment_date", { ascending: false });

      const investorIds = [...new Set((invs || []).map((i) => i.investor_id))];
      if (investorIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", investorIds);
      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name || "Investisseur"]) || []);

      // 2. Pour chaque (investisseur, investissement) on récupère le dernier message
      const results: ConversationRow[] = [];
      for (const inv of invs || []) {
        const [p1, p2] = [user.id, inv.investor_id].sort();
        const { data: conv } = await supabase
          .from("marketplace_conversations")
          .select("id, last_message_at")
          .is("listing_id", null)
          .eq("participant_1", p1)
          .eq("participant_2", p2)
          .maybeSingle();

        let last_message: string | null = null;
        let last_message_at: string | null = conv?.last_message_at ?? null;
        let unread = 0;

        if (conv?.id) {
          const { data: msg } = await supabase
            .from("marketplace_messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          last_message = msg?.content ?? null;
          last_message_at = msg?.created_at ?? last_message_at;

          const { count } = await supabase
            .from("marketplace_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("recipient_id", user.id)
            .eq("is_read", false);
          unread = count || 0;
        }

        results.push({
          investor_id: inv.investor_id,
          investor_name: nameMap.get(inv.investor_id) || "Investisseur",
          investment_id: inv.id,
          investment_title: inv.title,
          investment_status: inv.status,
          last_message,
          last_message_at,
          unread,
        });
      }

      // Tri: non-lus d'abord, puis date du dernier message
      results.sort((a, b) => {
        if (a.unread !== b.unread) return b.unread - a.unread;
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tb - ta;
      });

      setRows(results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  // Realtime: rafraîchir compteurs non-lus
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`farmer-convos-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_messages", filter: `recipient_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const investments = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.investment_id, r.investment_title));
    return Array.from(map.entries());
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (filterId !== "all" && r.investment_id !== filterId) return false;
    if (search && !`${r.investor_name} ${r.investment_title} ${r.last_message ?? ""}`.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-8 h-8" />}
        title="Aucune conversation"
        description="Les conversations apparaissent dès qu'un investisseur soutient un de vos projets."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterId} onValueChange={setFilterId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filtrer par investissement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les investissements</SelectItem>
            {investments.map(([id, title]) => (
              <SelectItem key={id} value={id}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucun résultat</p>
      ) : (
        filtered.map((r) => (
          <Card
            key={`${r.investor_id}-${r.investment_id}`}
            variant="interactive"
            onClick={() => setChatWith(r)}
            className="cursor-pointer"
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0">
                {r.investor_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">{r.investor_name}</p>
                  {r.last_message_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(r.last_message_at), { locale: fr, addSuffix: false })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {r.investment_title}
                </p>
                <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                  {r.last_message || "Pas encore de message — démarrez la conversation"}
                </p>
              </div>
              {r.unread > 0 && (
                <Badge className="bg-primary text-primary-foreground shrink-0">{r.unread}</Badge>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <DirectMessageDialog
        open={!!chatWith}
        onOpenChange={(o) => {
          if (!o) {
            setChatWith(null);
            load();
          }
        }}
        otherUserId={chatWith?.investor_id || ""}
        otherUserName={chatWith?.investor_name}
        context={chatWith ? `Investissement: ${chatWith.investment_title}` : undefined}
      />
    </div>
  );
}