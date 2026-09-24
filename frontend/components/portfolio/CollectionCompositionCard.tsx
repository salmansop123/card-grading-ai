"use client";

import { useState } from "react";
import { usePortfolioComposition } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";

const SET_COLORS = ["#F5A623", "#1A73E8", "#8B5CF6", "#00C9B1", "#FF6B35", "#FF6EB4"];

export function CollectionCompositionCard() {
  const [groupBy, setGroupBy] = useState<"set" | "rarity">("set");
  const { data, isLoading } = usePortfolioComposition(groupBy);

  const groups = data?.groups ?? [];

  return (
    <div className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-card-text">Collection Composition</h3>
          <p className="text-xs text-card-text-muted">
            By {groupBy === "set" ? "set" : "rarity"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-card-border p-0.5">
          {(["set", "rarity"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setGroupBy(tab)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition",
                groupBy === tab
                  ? "bg-card-gold text-white"
                  : "text-card-text-muted hover:text-card-text"
              )}
            >
              By {tab === "set" ? "Set" : "Rarity"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-card-text-muted">Loading composition...</p>
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-card-text-muted">No collection data yet.</p>
      ) : (
        <>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {groups.map((s, i) => (
              <div
                key={s.name}
                style={{
                  width: `${s.percentage}%`,
                  backgroundColor: SET_COLORS[i % SET_COLORS.length],
                }}
              />
            ))}
          </div>

          <div className="space-y-2">
            {groups.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: SET_COLORS[i % SET_COLORS.length] }}
                  />
                  <span className="truncate text-card-text">{s.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-card-text-muted">
                  <span>{s.card_count} cards</span>
                  <span className="font-medium text-card-text">${s.total_value.toFixed(0)}</span>
                  <span className="text-xs">{s.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
