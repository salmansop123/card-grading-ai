"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { holdingMarketValue } from "@/lib/portfolioMetrics";

export function GradedVsRawCard() {
  const { data } = usePortfolio();
  const holdings = data?.holdings ?? [];

  const stats = useMemo(() => {
    let rawCount = 0;
    let gradedCount = 0;
    let rawValue = 0;
    let gradedValue = 0;

    for (const h of holdings) {
      const value = holdingMarketValue(h);
      if (h.is_graded) {
        gradedCount += h.quantity;
        gradedValue += value;
      } else {
        rawCount += h.quantity;
        rawValue += value;
      }
    }

    const totalCount = rawCount + gradedCount;
    const totalValue = rawValue + gradedValue;
    const rawPct = totalCount > 0 ? Math.round((rawCount / totalCount) * 100) : 0;
    const gradedPct = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;
    const gradedValuePct =
      totalValue > 0 ? Math.round((gradedValue / totalValue) * 100) : 0;

    return {
      rawCount,
      gradedCount,
      rawValue,
      gradedValue,
      totalValue,
      rawPct,
      gradedPct,
      gradedValuePct,
    };
  }, [holdings]);

  const hasBothCategories = stats.rawCount > 0 && stats.gradedCount > 0;

  return (
    <div className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
      <h3 className="mb-4 font-bold text-card-text">Graded vs Raw</h3>

      {stats.gradedCount === 0 ? (
        <div className="py-6 text-center">
          <p className="text-2xl font-black text-card-text">{stats.rawCount}</p>
          <p className="text-sm text-card-text-muted">Raw cards · 0 graded</p>
          <p className="mt-2 text-xs text-card-text-muted">
            Add graded cards to see a breakdown here
          </p>
        </div>
      ) : (
        <>
          {hasBothCategories && (
            <div className="mb-3 flex h-3 overflow-hidden rounded-full">
              <div style={{ width: `${stats.rawPct}%`, backgroundColor: "#F5A623" }} />
              <div style={{ width: `${stats.gradedPct}%`, backgroundColor: "#8B5CF6" }} />
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-card-text">
              🟧 Raw: {stats.rawCount} ({stats.rawPct}%)
            </span>
            <span className="text-card-text">
              🟪 Graded: {stats.gradedCount} ({stats.gradedPct}%)
            </span>
          </div>
          {stats.gradedCount > 0 && (
            <p className="mt-3 text-xs text-card-text-muted">
              Graded cards make up ${stats.gradedValue.toFixed(0)} of your $
              {stats.totalValue.toFixed(0)} total value ({stats.gradedValuePct}%)
            </p>
          )}
        </>
      )}
    </div>
  );
}
