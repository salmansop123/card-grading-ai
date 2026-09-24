"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioSummary } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface Props {
  summary?: PortfolioSummary;
}

export function PortfolioSummaryCard({ summary }: Props) {
  if (!summary) return null;

  const isPositive = summary.total_gain_loss >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(summary.total_value)}</div>
          <p className="text-xs text-muted-foreground">{summary.card_count} cards</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Gain/Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(summary.total_gain_loss)}
          </div>
          <p className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {formatPercent(summary.total_gain_loss_pct)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(summary.total_cost)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
