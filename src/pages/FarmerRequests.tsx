import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  TrendingUp,
  Stethoscope,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { MyContractsList } from "@/components/contracts/MyContractsList";

interface InvReq {
  id: string;
  amount: number;
  currency: string;
  message: string | null;
  expected_return: number | null;
  duration_months: number | null;
  status: string;
  admin_notes: string | null;
  farmer_response: string | null;
  farmer_agreed: boolean | null;
  created_at: string;
  investor_id: string;
  investor_name?: string;
  transaction_id?: string | null;
}

interface VetReq {
  id: string;
  service_type: string;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  price: number | null;
  provider_id: string;
  provider_user_id?: string;
  provider_name?: string;
  created_at: string;
  notes: string | null;
}

export default function FarmerRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("investments");
  const [invRequests, setInvRequests] = useState<InvReq[]>([]);
  const [vetRequests, setVetRequests] = useState<VetReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // 1. Investment requests directed at me
    const { data: invs } = await (supabase as any)
      .from("investment_requests")
      .select("*")
      .eq("farmer_id", user.id)
      .order("created_at", { ascending: false });
    const invIds = Array.from(
      new Set((invs || []).map((r: any) => r.investor_id as string)),
    ) as string[];
    const { data: invProfiles } = invIds.length
      ? await supabase.from("profiles").select("user_id,full_name").in("user_id", invIds)
      : { data: [] as any[] };
    const invMap = new Map((invProfiles || []).map((p: any) => [p.user_id, p.full_name]));
    setInvRequests(
      (invs || []).map((r: any) => ({
        ...r,
        investor_name: invMap.get(r.investor_id) || "Investisseur",
      })),
    );

    // 2. Vet consultation proposals sent to me
    const { data: vets } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    const provIds = Array.from(
      new Set((vets || []).map((v: any) => v.provider_id as string)),
    ) as string[];
    const { data: providers } = provIds.length
      ? await supabase
          .from("service_providers")
          .select("id,user_id,business_name")
          .in("id", provIds)
      : { data: [] as any[] };
    const userIds = (providers || []).map((p: any) => p.user_id as string);
    const { data: provProfiles } = userIds.length
      ? await supabase.from("profiles").select("user_id,full_name").in("user_id", userIds)
      : { data: [] as any[] };
    const pMap = new Map((provProfiles || []).map((p: any) => [p.user_id, p.full_name]));
    const provMap = new Map(
      (providers || []).map((p: any) => [
        p.id,
        { user_id: p.user_id, name: p.business_name || pMap.get(p.user_id) || "Vétérinaire" },
      ]),
    );
    setVetRequests(
      (vets || []).map((v: any) => {
        const p = provMap.get(v.provider_id);
        return {
          ...v,
          provider_user_id: p?.user_id,
          provider_name: p?.name || "Vétérinaire",
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`farmer-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "investment_requests", filter: `farmer_id=eq.${user.id}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_bookings", filter: `client_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const respondInvestment = async (r: InvReq, agree: boolean) => {
    setSavingId(r.id);
    const text = reply[r.id] || "";
    const { error } = await (supabase as any)
      .from("investment_requests")
      .update({
        farmer_agreed: agree,
        farmer_response: text,
        status: agree ? "admin_review" : "rejected",
      })
      .eq("id", r.id);

    // notify admins + investor
    await (supabase as any).from("notifications").insert([
      {
        user_id: r.investor_id,
        type: "investment_request_update",
        title: agree ? "✅ L'agriculteur est intéressé" : "❌ Demande refusée",
        message: text || (agree ? "En attente de médiation PlantErea" : "L'agriculteur a décliné"),
      },
    ]);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(agree ? "Réponse envoyée à PlantErea" : "Demande refusée");
  };

  const respondVet = async (v: VetReq, accept: boolean) => {
    setSavingId(v.id);
    const newStatus = accept ? "confirmed" : "annulee";
    const { error } = await supabase
      .from("service_bookings")
      .update({ status: newStatus, notes: reply[v.id] || v.notes })
      .eq("id", v.id);
    if (v.provider_user_id) {
      await (supabase as any).from("notifications").insert({
        user_id: v.provider_user_id,
        type: "vet_booking_update",
        title: accept ? "✅ Consultation acceptée" : "❌ Consultation refusée",
        message: reply[v.id] || v.service_type,
      });
    }
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(accept ? "Consultation confirmée" : "Consultation refusée");
  };

  const invStatusColor = (s: string) => {
    if (s === "pending") return "bg-yellow-500";
    if (s === "admin_review" || s === "negotiating") return "bg-blue-500";
    if (s === "approved" || s === "contract_created") return "bg-green-500";
    return "bg-red-500";
  };

  const vetStatusColor = (s: string) => {
    if (s === "en_attente") return "bg-yellow-500";
    if (s === "confirmed") return "bg-green-500";
    if (s === "in_progress") return "bg-blue-500";
    if (s === "completed") return "bg-primary";
    return "bg-red-500";
  };

  const pendingInv = invRequests.filter((r) => r.status === "pending").length;
  const pendingVet = vetRequests.filter((v) => v.status === "en_attente").length;

  return (
    <AppLayout>
      <PageHeader
        title="Demandes reçues"
        subtitle="Investisseurs et vétérinaires qui vous contactent"
      />

      <div className="px-4 pb-24">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="investments" className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-4 h-4" />
              Investissements
              {pendingInv > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                  {pendingInv}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vet" className="flex items-center gap-1.5 text-xs">
              <Stethoscope className="w-4 h-4" />
              Vétérinaires
              {pendingVet > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                  {pendingVet}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-1.5 text-xs">
              <FileText className="w-4 h-4" />
              Contrats
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <TabsContent value="investments" className="mt-4 space-y-3">
                {invRequests.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aucune demande d'investissement pour l'instant.
                  </Card>
                ) : (
                  invRequests.map((r) => (
                    <Card key={r.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold">{r.investor_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={invStatusColor(r.status)}>{r.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <Badge variant="outline">
                          {r.amount.toLocaleString()} {r.currency}
                        </Badge>
                        {r.expected_return && (
                          <Badge variant="secondary">{r.expected_return}% ROI</Badge>
                        )}
                        {r.duration_months && (
                          <Badge variant="secondary">{r.duration_months} mois</Badge>
                        )}
                      </div>
                      {r.message && (
                        <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-2">
                          {r.message}
                        </p>
                      )}
                      {r.admin_notes && (
                        <div className="text-xs bg-primary/5 border border-primary/20 rounded p-2">
                          <b>Note PlantErea :</b> {r.admin_notes}
                        </div>
                      )}
                      {r.farmer_response && (
                        <div className="text-xs bg-muted/40 rounded p-2">
                          <b>Votre réponse :</b> {r.farmer_response}
                        </div>
                      )}

                      {r.status === "contract_created" && r.transaction_id && (
                        <Button
                          className="w-full"
                          onClick={() => navigate(`/contract/${r.transaction_id}`)}
                        >
                          <FileText className="w-4 h-4 mr-1" /> Voir & signer le contrat
                        </Button>
                      )}

                      {r.status === "pending" && (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea
                            placeholder="Message pour PlantErea (optionnel)"
                            rows={2}
                            value={reply[r.id] || ""}
                            onChange={(e) =>
                              setReply((s) => ({ ...s, [r.id]: e.target.value }))
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => respondInvestment(r, false)}
                              disabled={savingId === r.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Refuser
                            </Button>
                            <Button
                              onClick={() => respondInvestment(r, true)}
                              disabled={savingId === r.id}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Intéressé
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center">
                            PlantErea prendra ensuite le relais pour la médiation et le contrat.
                          </p>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="vet" className="mt-4 space-y-3">
                {vetRequests.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aucune proposition de consultation.
                  </Card>
                ) : (
                  vetRequests.map((v) => (
                    <Card key={v.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold">{v.provider_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(v.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={vetStatusColor(v.status)}>{v.status}</Badge>
                      </div>
                      <p className="text-sm font-medium">{v.service_type}</p>
                      {v.description && (
                        <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-2">
                          {v.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {v.price && (
                          <Badge variant="outline">{v.price.toLocaleString()} XOF</Badge>
                        )}
                        {v.scheduled_date && (
                          <Badge variant="secondary">
                            {new Date(v.scheduled_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>

                      {v.status === "en_attente" && (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea
                            placeholder="Message pour le vétérinaire (optionnel)"
                            rows={2}
                            value={reply[v.id] || ""}
                            onChange={(e) =>
                              setReply((s) => ({ ...s, [v.id]: e.target.value }))
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => respondVet(v, false)}
                              disabled={savingId === v.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Refuser
                            </Button>
                            <Button
                              onClick={() => respondVet(v, true)}
                              disabled={savingId === v.id}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Accepter
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Une transaction sécurisée sera créée à l'acceptation.
                          </p>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="contracts" className="mt-4">
                <MyContractsList />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}