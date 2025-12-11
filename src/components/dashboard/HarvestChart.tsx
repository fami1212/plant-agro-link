import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface HarvestChartProps {
  data: { month: string; quantity: number }[];
}

const chartConfig = {
  quantity: {
    label: "Récolte (kg)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function HarvestChart({ data }: HarvestChartProps) {
  const totalHarvest = data.reduce((sum, d) => sum + d.quantity, 0);
  const avgHarvest = data.length > 0 ? Math.round(totalHarvest / data.length) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Rendement des récoltes
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Moy: {avgHarvest} kg
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {data.length > 0 && data.some(d => d.quantity > 0) ? (
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                content={<ChartTooltipContent />}
              />
              <Bar
                dataKey="quantity"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            Aucune donnée de récolte disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}
