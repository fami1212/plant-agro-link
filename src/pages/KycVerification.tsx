import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useKycStatus } from "@/hooks/useKycStatus";
import { toast } from "sonner";
import { Loader2, Upload, ShieldCheck, Clock, XCircle } from "lucide-react";

type Field = "id_front_url" | "id_back_url" | "selfie_url";

export default function KycVerification() {
  const { user, roles } = useAuth();
  const { kyc, refresh } = useKycStatus();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Field | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    id_type: "cni",
    id_number: "",
    address: "",
    city: "",
    country: "Sénégal",
    id_front_url: "",
    id_back_url: "",
    selfie_url: "",
    farm_name: "",
    farm_location: "",
    farm_size_ha: "",
    license_number: "",
    specialty: "",
    company_name: "",
    business_reg_number: "",
    investor_type: "",
    capital_range: "",
  });

  const role = (roles?.[0] as string) || "agriculteur";
  const readOnly = kyc?.status === "submitted" || kyc?.status === "approved";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("kyc_verifications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => ({
          ...f,
          ...Object.fromEntries(
            Object.keys(f).map((k) => [k, (data as any)[k] ?? (f as any)[k]]),
          ),
        }));
      });
  }, [user]);

  const handleUpload = async (field: Field, file: File) => {
    if (!user) return;
    setUploading(field);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) {
      toast.error("Upload échoué: " + error.message);
    } else {
      setForm((f) => ({ ...f, [field]: path }));
      toast.success("Fichier envoyé");
    }
    setUploading(null);
  };

  const submit = async (asDraft = false) => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      user_id: user.id,
      role_requested: role,
      ...form,
      farm_size_ha: form.farm_size_ha ? Number(form.farm_size_ha) : null,
      status: asDraft ? "pending" : "submitted",
      submitted_at: asDraft ? null : new Date().toISOString(),
    };
    const { error } = await supabase
      .from("kyc_verifications")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }
    toast.success(asDraft ? "Brouillon enregistré" : "Dossier soumis pour vérification");
    refresh();
  };

  const StatusBadge = () => {
    if (!kyc) return null;
    const map: Record<string, { c: string; i: any; l: string }> = {
      pending: { c: "bg-amber-500", i: <Clock className="w-3 h-3" />, l: "À compléter" },
      submitted: { c: "bg-blue-500", i: <Clock className="w-3 h-3" />, l: "En cours d'examen" },
      approved: { c: "bg-green-500", i: <ShieldCheck className="w-3 h-3" />, l: "Approuvé" },
      rejected: { c: "bg-red-500", i: <XCircle className="w-3 h-3" />, l: "Rejeté" },
    };
    const s = map[kyc.status];
    return <Badge className={`${s.c} gap-1`}>{s.i}{s.l}</Badge>;
  };

  const FileField = ({ field, label }: { field: Field; label: string }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <Input
          type="file"
          accept="image/*,application/pdf"
          disabled={readOnly}
          onChange={(e) => e.target.files?.[0] && handleUpload(field, e.target.files[0])}
        />
        {uploading === field && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>
      {form[field] && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <Upload className="w-3 h-3" /> Fichier chargé
        </p>
      )}
    </div>
  );

  return (
    <AppLayout>
      <PageHeader title="Vérification KYC" subtitle="Faites vérifier votre identité pour débloquer toutes les fonctionnalités" />
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Rôle demandé: <strong>{role}</strong></p>
          <StatusBadge />
        </div>

        {kyc?.status === "rejected" && kyc.admin_notes && (
          <Card className="p-3 border-red-500/40 bg-red-500/5">
            <p className="text-sm"><strong>Motif du rejet:</strong> {kyc.admin_notes}</p>
          </Card>
        )}

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Informations personnelles</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Nom complet</Label>
              <Input value={form.full_name} disabled={readOnly}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Date de naissance</Label>
              <Input type="date" value={form.birth_date} disabled={readOnly}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </div>
            <div>
              <Label>Type de pièce</Label>
              <Select value={form.id_type} disabled={readOnly}
                onValueChange={(v) => setForm({ ...form, id_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cni">CNI</SelectItem>
                  <SelectItem value="passport">Passeport</SelectItem>
                  <SelectItem value="permis">Permis de conduire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Numéro de pièce</Label>
              <Input value={form.id_number} disabled={readOnly}
                onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address} disabled={readOnly}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city} disabled={readOnly}
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={form.country} disabled={readOnly}
                onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Documents</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <FileField field="id_front_url" label="Pièce (recto)" />
            <FileField field="id_back_url" label="Pièce (verso)" />
            <FileField field="selfie_url" label="Selfie avec pièce" />
          </div>
        </Card>

        {(role === "agriculteur") && (
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Exploitation</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Nom de la ferme</Label><Input value={form.farm_name} disabled={readOnly}
                onChange={(e) => setForm({ ...form, farm_name: e.target.value })} /></div>
              <div><Label>Localisation</Label><Input value={form.farm_location} disabled={readOnly}
                onChange={(e) => setForm({ ...form, farm_location: e.target.value })} /></div>
              <div><Label>Surface (ha)</Label><Input type="number" value={form.farm_size_ha} disabled={readOnly}
                onChange={(e) => setForm({ ...form, farm_size_ha: e.target.value })} /></div>
            </div>
          </Card>
        )}

        {role === "veterinaire" && (
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Profession</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>N° d'ordre / Licence</Label><Input value={form.license_number} disabled={readOnly}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></div>
              <div><Label>Spécialité</Label><Input value={form.specialty} disabled={readOnly}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
            </div>
          </Card>
        )}

        {role === "acheteur" && (
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Société</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Raison sociale</Label><Input value={form.company_name} disabled={readOnly}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>N° RCCM / NINEA</Label><Input value={form.business_reg_number} disabled={readOnly}
                onChange={(e) => setForm({ ...form, business_reg_number: e.target.value })} /></div>
            </div>
          </Card>
        )}

        {role === "investisseur" && (
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Profil investisseur</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.investor_type} disabled={readOnly}
                  onValueChange={(v) => setForm({ ...form, investor_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="entreprise">Entreprise</SelectItem>
                    <SelectItem value="fonds">Fonds d'investissement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Capital indicatif</Label><Input value={form.capital_range} disabled={readOnly}
                onChange={(e) => setForm({ ...form, capital_range: e.target.value })} placeholder="ex: 1M - 5M FCFA" /></div>
            </div>
          </Card>
        )}

        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submit(true)} disabled={saving} className="flex-1">
              Enregistrer brouillon
            </Button>
            <Button onClick={() => submit(false)} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Soumettre pour vérification
            </Button>
          </div>
        )}

        {kyc?.status === "submitted" && (
          <Card className="p-4 bg-blue-500/5 border-blue-500/40">
            <p className="text-sm">Votre dossier est en cours d'examen par notre équipe. Vous serez notifié dès la validation (24-48h).</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
