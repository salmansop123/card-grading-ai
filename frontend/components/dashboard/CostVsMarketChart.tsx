"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePortfolio, usePortfolioPerformance } from "@/hooks/usePortfolio";
import { formatCurrency } from "@/lib/utils";
import {
  buildCostVsMarketChartData,
  formatPortfolioAxisValue,
  getPortfolioTotals,
} from "@/lib/portfolioMetrics";

interface Props {
  className?: string;
  title?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const marketEntry = payload.find((p) => p.dataKey === "marketValue");
  const costEntry = payload.find((p) => p.dataKey === "totalCost");

  return (
    <div className="rounded-lg border border-card-border bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium text-card-text">{label}</p>
      {costEntry != null && (
        <p className="text-amber-700">
          Total Cost: {formatCurrency(Number(costEntry.value))}
        </p>
      )}
      {marketEntry != null && (
        <p className="text-violet-700">
          Market Value: {formatCurrency(Number(marketEntry.value))}
        </p>
      )}
    </div>
  );
}

export function CostVsMarketChart({
  className = "col-span-2",
  title = "Cost vs Market Value",
}: Props) {
  const [days, setDays] = useState(30);
  const { data: portfolio } = usePortfolio();
  const { data: performance, isLoading } = usePortfolioPerformance(days);

  const totals = getPortfolioTotals(portfolio?.summary);

  const chartData = useMemo(
    () => buildCostVsMarketChartData(portfolio?.summary, performance),
    [portfolio?.summary, performance]
  );

  const hasHistory = chartData.length > 1;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {hasHistory && (
            <p className="mt-1 text-xs text-muted-foreground">
              Market value trend vs your total cost basis
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}D
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatPortfolioAxisValue}
                tick={{ fontSize: 11 }}
                width={56}
                domain={[
                  (min: number) => Math.floor(min * 0.95),
                  (max: number) => Math.ceil(max * 1.05),
                ]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                formatter={(value) =>
                  value === "marketValue" ? "Current Market Value" : "Total Cost"
                }
              />
              <Line
                type="linear"
                dataKey="totalCost"
                name="totalCost"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="marketValue"
                name="marketValue"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ r: 3, fill: "#7c3aed" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {portfolio?.summary && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Latest: Cost {formatCurrency(totals.totalCost)} · Market{" "}
            {formatCurrency(totals.marketValue)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
