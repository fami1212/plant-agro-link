import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Clock, FileText, Loader2, ShieldAlert, BadgeCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DuplicateGroup {
  id_number: string;
  user_ids: string[];
  count: number;
}

interface KycRow {
  id: string;
  user_id: string;
  status: string;
  role_requested: string | null;
  full_name: string | null;
  id_type: string | null;
  id_number: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  address: string | null;
  city: string | null;
  farm_name: string | null;
  license_number: string | null;
  company_name: string | null;
  admin_notes: string | null;
  submitted_at: string | null;
  created_at: string;
}

export function AdminKycPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("submitted");
  const [selected, setSelected] = useState<KycRow | null>(null);
  const [note, setNote] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  const fetchRows = async () => {
    setLoading(true);
    let q = supabase.from("kyc_verifications").select("*").order("submitted_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter as any);
    const { data } = await q;
    setRows((data as KycRow[]) || []);
    setLoading(false);
  };

  const fetchDuplicates = async () => {
    const { data } = await supabase.rpc("get_kyc_duplicate_groups" as any);
    setDuplicates((data as DuplicateGroup[]) || []);
  };

  useEffect(() => {
    fetchRows();
    fetchDuplicates();
    const ch = supabase
      .channel("admin-kyc")
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_verifications" }, () => {
        fetchRows();
        fetchDuplicates();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openDetail = async (row: KycRow) => {
    setSelected(row);
    setNote(row.admin_notes || "");
    const paths = [row.id_front_url, row.id_back_url, row.selfie_url].filter(Boolean) as string[];
    const signed: Record<string, string> = {};
    for (const p of paths) {
      const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(p, 600);
      if (data?.signedUrl) signed[p] = data.signedUrl;
    }
    setUrls(signed);
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!selected || !user) return;
    const { error } = await supabase
      .from("kyc_verifications")
      .update({
        status,
        admin_notes: note || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Utilisateur approuvé" : "Dossier rejeté");
    setSelected(null);
    fetchRows();
  };

  const badge = (s: string) => {
    const m: Record<string, string> = {
      pending: "bg-amber-500", submitted: "bg-blue-500",
      approved: "bg-green-500", rejected: "bg-red-500",
    };
    return <Badge className={m[s] || "bg-muted"}>{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      {duplicates.length > 0 && (
        <Card className="p-3 border-red-500/40 bg-red-500/5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-600 dark:text-red-400">
                ⚠️ {duplicates.length} doublon(s) KYC détecté(s)
              </p>
              <p className="text-xs text-muted-foreground">
                Plusieurs comptes utilisent la même pièce d'identité.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {duplicates.slice(0, 5).map((d) => (
                  <li key={d.id_number} className="font-mono">
                    N° <b>{d.id_number}</b> — {d.count} comptes
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {["submitted", "pending", "approved", "rejected", "all"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Aucun dossier {filter}
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{r.full_name || "(Sans nom)"}</p>
                  {badge(r.status)}
                  {r.status === "approved" && (
                    <BadgeCheck className="w-4 h-4 text-green-600" aria-label="Vérifié" />
                  )}
                  {r.role_requested && <Badge variant="outline">{r.role_requested}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.submitted_at ? `Soumis le ${new Date(r.submitted_at).toLocaleDateString()}` : "Non soumis"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openDetail(r)}>
                <Eye className="w-4 h-4 mr-1" /> Examiner
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dossier KYC — {selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Rôle:</span> {selected.role_requested}</div>
                <div><span className="text-muted-foreground">Statut:</span> {badge(selected.status)}</div>
                <div><span className="text-muted-foreground">Pièce:</span> {selected.id_type} — {selected.id_number}</div>
                <div><span className="text-muted-foreground">Ville:</span> {selected.city}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Adresse:</span> {selected.address}</div>
                {selected.farm_name && <div className="col-span-2"><span className="text-muted-foreground">Ferme:</span> {selected.farm_name}</div>}
                {selected.license_number && <div className="col-span-2"><span className="text-muted-foreground">Licence:</span> {selected.license_number}</div>}
                {selected.company_name && <div className="col-span-2"><span className="text-muted-foreground">Société:</span> {selected.company_name}</div>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["id_front_url", "id_back_url", "selfie_url"] as const).map((k) => {
                  const path = selected[k];
                  const url = path ? urls[path] : null;
                  return (
                    <div key={k} className="aspect-square bg-muted rounded overflow-hidden flex items-center justify-center">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={k} className="object-cover w-full h-full" />
                        </a>
                      ) : (
                        <FileText className="w-8 h-8 opacity-30" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-sm font-medium">Note administrateur (motif si rejet)</label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>

              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={() => decide("rejected")}>
                  <XCircle className="w-4 h-4 mr-1" /> Rejeter
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => decide("approved")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approuver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
