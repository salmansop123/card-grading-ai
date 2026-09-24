"use client";

import { useMemo } from "react";
import Image from "next/image";
import { usePortfolio } from "@/hooks/usePortfolio";
import { holdingMarketValue } from "@/lib/portfolioMetrics";

export function PortfolioTopMoversCard() {
  const { data, isLoading } = usePortfolio();
  const holdings = data?.holdings ?? [];

  const topMovers = useMemo(() => {
    return [...holdings]
      .filter((h) => h.price_change_24h_pct != null)
      .sort(
        (a, b) =>
          Math.abs(b.price_change_24h_pct ?? 0) - Math.abs(a.price_change_24h_pct ?? 0)
      )
      .slice(0, 5);
  }, [holdings]);

  return (
    <div className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
      <h3 className="mb-4 font-bold text-card-text">Top Movers (7 Days)</h3>

      {isLoading ? (
        <p className="py-4 text-center text-sm text-card-text-muted">Loading movers...</p>
      ) : topMovers.length === 0 ? (
        <p className="py-4 text-center text-sm text-card-text-muted">
          Price history needs a few days to show movement trends.
        </p>
      ) : (
        <div className="space-y-3">
          {topMovers.map((card) => {
            const pct = card.price_change_24h_pct ?? 0;
            const img = card.card.thumbnail_url || card.card.image_url;
            return (
              <div key={card.holding_id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                    {img ? (
                      <Image
                        src={img}
                        alt={card.card.card_name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-card-text-muted">
                        {card.card.card_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-text">
                      {card.card.card_name}
                    </p>
                    <p className="truncate text-xs text-card-text-muted">{card.card.set_name}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-card-text">
                    ${(card.current_value ?? 0).toFixed(2)}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      pct >= 0 ? "text-green-600" : "text-card-red"
                    }`}
                  >
                    {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
