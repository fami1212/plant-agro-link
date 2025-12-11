import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { PawPrint } from "lucide-react";

interface LivestockChartProps {
  data: { month: string; count: number }[];
}

const chartConfig = {
  count: {
    label: "Têtes",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig;

export function LivestockChart({ data }: LivestockChartProps) {
  const currentCount = data.length > 0 ? data[data.length - 1].count : 0;
  const previousCount = data.length > 1 ? data[0].count : 0;
  const growth = previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-secondary" />
            Évolution du cheptel
          </CardTitle>
          {growth !== 0 && (
            <span className={`text-sm font-medium ${growth > 0 ? "text-success" : "text-destructive"}`}>
              {growth > 0 ? "+" : ""}{growth}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {data.length > 0 && data.some(d => d.count > 0) ? (
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--muted))" }}
                content={<ChartTooltipContent />}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            Aucune donnée de bétail disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}
