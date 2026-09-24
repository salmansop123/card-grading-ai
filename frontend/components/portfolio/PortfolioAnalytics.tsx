"use client";

import { CollectionCompositionCard } from "@/components/portfolio/CollectionCompositionCard";
import { GradedVsRawCard } from "@/components/portfolio/GradedVsRawCard";
import { PortfolioTopMoversCard } from "@/components/portfolio/PortfolioTopMoversCard";
import { PortfolioValueTrendChart } from "@/components/portfolio/PortfolioValueTrendChart";
import { TopHighestValueCardsChart } from "@/components/portfolio/TopHighestValueCardsChart";
import { usePortfolio } from "@/hooks/usePortfolio";

export function PortfolioAnalytics() {
  const { data } = usePortfolio();
  const holdings = data?.holdings ?? [];

  if (!holdings.length) {
    return (
      <div className="rounded-2xl border border-card-border bg-white p-12 text-center text-card-text-muted">
        Add cards to your collection to see portfolio analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortfolioValueTrendChart />

      <PortfolioTopMoversCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <CollectionCompositionCard />
        <GradedVsRawCard />
      </div>

      <TopHighestValueCardsChart />
    </div>
  );
}
