"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PortfolioSummary } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getPortfolioTotals } from "@/lib/portfolioMetrics";

interface Props {
  summary?: PortfolioSummary;
}

export function ProfitSummaryCard({ summary }: Props) {
  if (!summary) return null;

  const { totalCost, marketValue, unrealizedGainLoss, gainLossPct } =
    getPortfolioTotals(summary);
  const isPositive = unrealizedGainLoss >= 0;
  const hasCost = totalCost > 0;

  return (
    <Card className="border-l-4 border-l-card-gold">
      <CardContent className="p-6">
        <h3 className="mb-4 font-bold text-lg text-card-text">Profit Summary</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-card-text-muted">Total Cost</p>
            <p className="mt-1 text-2xl font-bold text-card-text">
              {formatCurrency(totalCost)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-card-text-muted">
              Current Market Value
            </p>
            <p className="mt-1 text-2xl font-bold text-card-gold">
              {formatCurrency(marketValue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-card-text-muted">
              Unrealized Profit/Loss
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(unrealizedGainLoss)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-card-text-muted">
              Profit Percentage
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
            >
              {hasCost ? formatPercent(gainLossPct) : "—"}
            </p>
          </div>
        </div>
        <div
          className={`mt-5 rounded-xl px-4 py-3 text-sm ${
            isPositive ? "bg-green-50 text-green-800" : unrealizedGainLoss < 0 ? "bg-red-50 text-red-800" : "bg-gray-50 text-card-text-muted"
          }`}
        >
          {hasCost ? (
            <>
              If you sold your collection today, your estimated{" "}
              {isPositive ? "profit" : "loss"} would be{" "}
              <span className="font-bold">
                {formatCurrency(Math.abs(unrealizedGainLoss))}
              </span>
              {gainLossPct != null && (
                <> ({formatPercent(gainLossPct)})</>
              )}
              .
            </>
          ) : (
            <>Add purchase prices to your cards to track profit and loss.</>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
