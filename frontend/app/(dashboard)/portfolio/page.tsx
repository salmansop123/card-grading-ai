"use client";

import { GainLossTable } from "@/components/portfolio/GainLossTable";
import { PortfolioAnalytics } from "@/components/portfolio/PortfolioAnalytics";
import { ProfitSummaryCard } from "@/components/dashboard/ProfitSummaryCard";
import { usePortfolio } from "@/hooks/usePortfolio";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function PortfolioPage() {
  const { data, isLoading } = usePortfolio();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-card-text">Portfolio Analytics</h1>
        <p className="mt-1 text-sm text-card-text-muted">
          Cost basis, market value, and collection breakdowns
        </p>
      </div>
      <ProfitSummaryCard summary={data?.summary} />
      <PortfolioAnalytics />
      <GainLossTable />
    </div>
  );
}
