import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wallet, Percent, CalendarClock } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";

interface Props {
  amountInvested: number;
  returnPercent: number;
  investmentDate: string;
  harvestDate?: string | null;
  releasedAmount?: number;
  actualReturn?: number | null;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

/** Récapitulatif ROI mobile-first : montant investi, gain, rendement, échéances + graphique. */
export function InvestmentRoiSummary({
  amountInvested,
  returnPercent,
  investmentDate,
  harvestDate,
  releasedAmount = 0,
  actualReturn,
}: Props) {
  const expected = amountInvested * (1 + returnPercent / 100);
  const gain = expected - amountInvested;
  const realized = actualReturn ?? 0;

  const data = [
    { name: "Investi", value: amountInvested, color: "hsl(var(--muted-foreground))" },
    { name: "Débloqué", value: releasedAmount, color: "hsl(var(--primary))" },
    { name: "Attendu", value: expected, color: "hsl(var(--success, 142 71% 45%))" },
    { name: "Perçu", value: realized, color: "hsl(var(--accent-foreground))" },
  ];

  const daysLeft = harvestDate
    ? Math.ceil((new Date(harvestDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Récapitulatif ROI
        </p>
        <Badge variant="secondary">{returnPercent}% / cycle</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-muted">
          <Wallet className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="font-bold text-xs">{fcfa(amountInvested)}</p>
          <p className="text-[10px] text-muted-foreground">Investi</p>
        </div>
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Percent className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="font-bold text-xs text-primary">+{fcfa(gain)}</p>
          <p className="text-[10px] text-muted-foreground">Gain estimé</p>
        </div>
        <div className="p-2.5 rounded-xl bg-muted">
          <CalendarClock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="font-bold text-xs">
            {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} j` : "Échu") : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Échéance</p>
        </div>
      </div>

      <div className="h-36 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              formatter={(v: any) => fcfa(Number(v))}
              contentStyle={{
                borderRadius: 12,
                fontSize: 12,
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>Montant total à recevoir</span>
          <span className="font-semibold text-foreground">{fcfa(expected)}</span>
        </div>
        <div className="flex justify-between">
          <span>Début du financement</span>
          <span className="text-foreground">
            {new Date(investmentDate).toLocaleDateString("fr-FR")}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Échéance (récolte / remboursement)</span>
          <span className="text-foreground">
            {harvestDate ? new Date(harvestDate).toLocaleDateString("fr-FR") : "À définir"}
          </span>
        </div>
      </div>
    </Card>
  );
}
