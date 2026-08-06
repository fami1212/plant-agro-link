import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldAlert, RefreshCw, Users, Database } from "lucide-react";
import { toast } from "sonner";

interface Policy {
  table_name: string;
  rls_enabled: boolean;
  policy_name: string;
  command: string;
  roles: string;
  using_expression: string;
  check_expression: string;
  grants: string;
}

interface Check {
  check_name: string;
  value: number;
  detail: string;
}

const SUGGESTED = ["user_roles", "profiles", "kyc_verifications", "crops", "marketplace_offers"];

/** Diagnostic admin : pourquoi un investisseur ne voit aucun agriculteur + règles RLS appliquées. */
export function AdminRlsDiagnostic() {
  const [table, setTable] = useState("user_roles");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChecks = async () => {
    const { data, error } = await (supabase as any).rpc("diagnose_farmer_visibility");
    if (error) return toast.error(error.message);
    setChecks((data as Check[]) || []);
  };

  const loadPolicies = async (t: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_rls_diagnostic", { _table: t });
    setLoading(false);
    if (error) return toast.error(error.message);
    setPolicies((data as Policy[]) || []);
  };

  useEffect(() => {
    loadChecks();
    loadPolicies(table);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const directoryRows = checks.find((c) => c.check_name.includes("get_farmer_directory"))?.value ?? 0;
  const farmers = checks.find((c) => c.check_name.includes("rôle agriculteur"))?.value ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Visibilité des agriculteurs (réseau investisseur)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border/60 p-3 text-sm">
            {directoryRows === 0 ? (
              <p className="flex items-start gap-2 text-destructive">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                {farmers === 0
                  ? "Aucun compte n'a le rôle agriculteur : le réseau est vide pour une raison métier, pas RLS."
                  : "Des agriculteurs existent mais l'annuaire renvoie 0 ligne — vérifiez la fonction get_farmer_directory et les profils manquants."}
              </p>
            ) : (
              <p className="text-success">
                L'annuaire renvoie {directoryRows} agriculteur(s). Si l'investisseur voit 0, le
                composant interroge probablement <code>user_roles</code>/<code>profiles</code> en
                direct : le RLS masque alors toutes les lignes. Utilisez l'annuaire sécurisé.
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {checks.map((c) => (
              <div key={c.check_name} className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.check_name}</span>
                  <Badge variant={c.value > 0 ? "secondary" : "destructive"}>{c.value}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{c.detail}</p>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={loadChecks}>
            <RefreshCw className="w-4 h-4 mr-1" /> Recalculer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Règles RLS appliquées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={table}
              onChange={(e) => setTable(e.target.value)}
              placeholder="nom de la table"
              className="rounded-xl"
            />
            <Button onClick={() => loadPolicies(table)} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyser"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map((s) => (
              <Badge
                key={s}
                variant={s === table ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setTable(s);
                  loadPolicies(s);
                }}
              >
                {s}
              </Badge>
            ))}
          </div>

          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune politique trouvée pour « {table} » — si RLS est activé, toutes les lectures
              renvoient 0 ligne.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                RLS : {policies[0].rls_enabled ? "activé" : "désactivé"} · Droits :{" "}
                {policies[0].grants}
              </p>
              {policies.map((p) => (
                <div key={p.policy_name} className="p-3 rounded-xl border border-border/60 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{p.policy_name}</span>
                    <Badge variant="outline">{p.command}</Badge>
                    <Badge variant="secondary">{p.roles}</Badge>
                  </div>
                  <p className="font-mono break-all">
                    <span className="text-muted-foreground">USING </span>
                    {p.using_expression}
                  </p>
                  <p className="font-mono break-all">
                    <span className="text-muted-foreground">WITH CHECK </span>
                    {p.check_expression}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
