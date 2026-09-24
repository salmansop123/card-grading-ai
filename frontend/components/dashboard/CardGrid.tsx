"use client";

import { PortfolioHolding } from "@/types/portfolio";
import { CardTile } from "@/components/cards/CardTile";

interface Props {
  holdings: PortfolioHolding[];
  compact?: boolean;
}

export function CardGrid({ holdings, compact = false }: Props) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {holdings.map((holding) => (
          <CardTile key={holding.holding_id} holding={holding} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {holdings.map((holding) => (
        <CardTile key={holding.holding_id} holding={holding} />
      ))}
    </div>
  );
}
