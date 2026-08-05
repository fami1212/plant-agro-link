import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Handshake, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Req {
  id: string;
  investor_id: string;
  farmer_id: string;
  amount: number;
  currency: string;
  message: string | null;
  expected_return: number | null;
  duration_months: number | null;
  status: string;
  admin_notes: string | null;
  farmer_agreed: boolean | null;
  farmer_response: string | null;
  created_at: string;
  investor?: { full_name: string; email: string | null };
  farmer?: { full_name: string; email: string | null };
}

export function AdminInvestmentRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Req | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("investment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = data || [];
    // enrich
    const withProfiles = await Promise.all(
      rows.map(async (r: Req) => {
        const [inv, farm] = await Promise.all([
          supabase.from("profiles").select("full_name,email").eq("user_id", r.investor_id).maybeSingle(),
          supabase.from("profiles").select("full_name,email").eq("user_id", r.farmer_id).maybeSingle(),
        ]);
        return { ...r, investor: inv.data as any, farmer: farm.data as any };
      }),
    );
    setItems(withProfiles);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-inv-req")
      .on("postgres_changes", { event: "*", schema: "public", table: "investment_requests" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const setStatus = async (r: Req, newStatus: string) => {
    setSaving(true);
    const patch: any = { status: newStatus, admin_id: user?.id, admin_notes: notes || r.admin_notes };
    if (newStatus === "approved") {
      // create transaction (investment) so the timeline is spawned
      const { data: tx } = await (supabase as any)
        .from("transactions")
        .insert({
          type: "INVESTMENT",
          status: "CONTRACT_PENDING",
          initiator_id: r.investor_id,
          receiver_id: r.farmer_id,
          amount: r.amount,
          currency: r.currency,
          title: `Investissement médié par PlantErea`,
          escrow_enabled: true,
          metadata: { request_id: r.id, expected_return: r.expected_return, duration_months: r.duration_months },
        })
        .select("id")
        .single();
      if (tx?.id) {
        await (supabase as any).rpc("seed_default_milestones", { _tx_id: tx.id });
        patch.transaction_id = tx.id;
        patch.status = "contract_created";
        // Notify parties of contract to sign
        await (supabase as any).from("notifications").insert([
          {
            user_id: r.investor_id,
            type: "contract_ready",
            title: "📝 Contrat prêt à signer",
            message: "Votre contrat d'investissement est prêt. Signez-le pour démarrer l'escrow.",
            metadata: { transaction_id: tx.id },
          },
          {
            user_id: r.farmer_id,
            type: "contract_ready",
            title: "📝 Contrat prêt à signer",
            message: "Un contrat d'investissement vous attend pour signature.",
            metadata: { transaction_id: tx.id },
          },
        ]);
      }
    }
    const { error } = await (supabase as any).from("investment_requests").update(patch).eq("id", r.id);
    // notify parties
    await (supabase as any).from("notifications").insert([
      { user_id: r.investor_id, type: "investment_request_update", title: "Statut de votre demande", message: `Nouveau statut : ${patch.status}` },
      { user_id: r.farmer_id, type: "investment_request_update", title: "Demande d'investissement", message: `Un investisseur souhaite investir ${r.amount} ${r.currency} chez vous (statut : ${patch.status})` },
    ]);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Demande mise à jour");
    setSelected(null);
    setNotes("");
    load();
  };

  const statusColor = (s: string) => {
    if (s === "pending") return "bg-yellow-500";
    if (s === "admin_review" || s === "negotiating") return "bg-blue-500";
    if (s === "approved" || s === "contract_created") return "bg-green-500";
    if (s === "rejected" || s === "cancelled") return "bg-red-500";
    return "bg-gray-500";
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune demande d'investissement.
        </Card>
      ) : (
        items.map((r) => (
          <Card key={r.id} className="p-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">
                    {r.investor?.full_name || "Investisseur"} →{" "}
                    {r.farmer?.full_name || "Agriculteur"}
                  </p>
                  <Badge className={statusColor(r.status)}>{r.status}</Badge>
                  <Badge variant="outline">
                    {r.amount.toLocaleString()} {r.currency}
                  </Badge>
                  {r.expected_return && (
                    <Badge variant="secondary">{r.expected_return}% ROI attendu</Badge>
                  )}
                </div>
                {r.message && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleString()}
                </p>
                {r.status !== "contract_created" && r.status !== "rejected" && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSelected(r);
                      setNotes(r.admin_notes || "");
                    }}
                  >
                    <Handshake className="w-4 h-4 mr-1" /> Gérer la médiation
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Médiation demande d'investissement</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <Card className="p-3 bg-muted/40 text-sm space-y-1">
                <p>
                  <b>Investisseur :</b> {selected.investor?.full_name}
                </p>
                <p>
                  <b>Agriculteur :</b> {selected.farmer?.full_name}
                </p>
                <p>
                  <b>Montant :</b> {selected.amount.toLocaleString()} {selected.currency}
                </p>
                {selected.duration_months && (
                  <p>
                    <b>Durée :</b> {selected.duration_months} mois
                  </p>
                )}
                {selected.message && (
                  <p className="pt-2 border-t border-border/40">
                    <b>Message :</b> {selected.message}
                  </p>
                )}
              </Card>
              <div>
                <label className="text-sm font-medium">Notes de médiation</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStatus(selected, "negotiating")}
                  disabled={saving}
                >
                  Négocier
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setStatus(selected, "rejected")}
                  disabled={saving}
                >
                  Refuser
                </Button>
                <Button
                  className="col-span-2"
                  onClick={() => setStatus(selected, "approved")}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approuver → créer contrat"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}