"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePortfolio } from "@/hooks/usePortfolio";
import { holdingMarketValue } from "@/lib/portfolioMetrics";
import { formatCurrency } from "@/lib/utils";

export function TopHighestValueCardsChart() {
  const { data } = usePortfolio();
  const holdings = data?.holdings ?? [];

  const cards = useMemo(
    () =>
      [...holdings]
        .sort((a, b) => holdingMarketValue(b) - holdingMarketValue(a))
        .slice(0, 10)
        .map((h) => ({
          id: h.holding_id,
          name:
            h.card.card_name.length > 18
              ? `${h.card.card_name.slice(0, 16)}…`
              : h.card.card_name,
          value: holdingMarketValue(h),
        })),
    [holdings]
  );

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
        <h3 className="font-bold text-card-text">Top Highest-Value Cards</h3>
        <p className="mt-8 text-center text-sm text-card-text-muted">No cards yet.</p>
      </div>
    );
  }

  const title = `Top ${Math.min(cards.length, 10)} Highest-Value Card${cards.length !== 1 ? "s" : ""}`;

  return (
    <div className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
      <h3 className="mb-4 font-bold text-card-text">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={cards}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "#6B7280" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={70}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v}`}
            tick={{ fontSize: 10, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
