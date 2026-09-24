"use client";

import { PortfolioValueChart } from "@/components/dashboard/PortfolioValueChart";
import { TopMoversWidget } from "@/components/dashboard/TopMoversWidget";
import { PerformanceChart } from "@/components/portfolio/PerformanceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useTrending } from "@/hooks/useMarketData";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function TrendsPage() {
  const { data: trending = [], isLoading } = useTrending();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-black text-2xl text-card-text">Market Trends 📈</h1>
        <p className="text-card-text-muted">Price movements and historical performance across your collection</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PortfolioValueChart />
        <TopMoversWidget />
      </div>

      <PerformanceChart />

      <Card className="rounded-2xl border-card-border bg-white card-shadow">
        <CardHeader>
          <CardTitle>Trending Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : trending.length === 0 ? (
            <p className="text-sm text-card-text-muted">No trending data yet. Add cards to see market movement.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((card, i) => {
                const name = String(card.card_name ?? "Unknown");
                const pct = card.pct_change_7d as number | undefined;
                const value = card.current_value as number | undefined;
                const trend = String(card.trend ?? "stable");
                return (
                  <div
                    key={String(card.card_id ?? i)}
                    className="rounded-xl border border-card-border p-4"
                  >
                    <p className="truncate font-semibold text-card-text">{name}</p>
                    <p className="truncate text-xs text-card-text-muted">{String(card.set_name ?? "")}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-card-gold">
                        {value != null ? formatCurrency(value) : "—"}
                      </span>
                      {pct != null && (
                        <span className={pct >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatPercent(pct)} 7d
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs capitalize text-card-text-muted">{trend}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
