"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePortfolio, usePortfolioPerformance } from "@/hooks/usePortfolio";
import { buildPortfolioValueTrendData, getPortfolioTotals } from "@/lib/portfolioMetrics";
import { cn, formatCurrency } from "@/lib/utils";

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "All", days: 365 },
] as const;

export function PortfolioValueTrendChart() {
  const [days, setDays] = useState(30);
  const { data: portfolio } = usePortfolio();
  const { data: performance, isLoading } = usePortfolioPerformance(days);
  const { marketValue } = getPortfolioTotals(portfolio?.summary);

  const chartData = useMemo(
    () => buildPortfolioValueTrendData(portfolio?.summary, performance),
    [portfolio?.summary, performance]
  );

  const periodChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].total_value;
    const last = chartData[chartData.length - 1].total_value;
    const change = last - first;
    const pct = first > 0 ? (change / first) * 100 : 0;
    return { change, pct };
  }, [chartData]);

  const daysWithData = chartData.length;
  const periodLabel = days === 7 ? "week" : days === 30 ? "month" : days === 90 ? "quarter" : "year";

  return (
    <div className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-card-text">Portfolio Value Over Time</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-black text-card-text">{formatCurrency(marketValue)}</p>
            {periodChange && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  periodChange.change >= 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {periodChange.change >= 0 ? "↑" : "↓"}{" "}
                {formatCurrency(Math.abs(periodChange.change))} (
                {periodChange.pct >= 0 ? "+" : ""}
                {periodChange.pct.toFixed(1)}%) this {periodLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setDays(opt.days)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                days === opt.days
                  ? "bg-card-gold text-white"
                  : "border border-card-border bg-white text-card-text-muted hover:text-card-text"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-card-text-muted">
          Loading chart...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6B7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6B7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Portfolio Value"]}
            />
            <Area
              type="monotone"
              dataKey="total_value"
              stroke="#F5A623"
              strokeWidth={3}
              fill="url(#valueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {daysWithData < 3 && (
        <p className="mt-2 text-center text-xs text-card-text-muted">
          Keep tracking your collection trend data builds up over time.
        </p>
      )}
    </div>
  );
}
