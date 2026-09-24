"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PortfolioHolding } from "@/types/portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { TrendIndicator } from "@/components/cards/TrendIndicator";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useMoveToTrash } from "@/hooks/useTrash";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface Props {
  holding: PortfolioHolding;
  showDelete?: boolean;
  onMovedToTrash?: () => void;
  compact?: boolean;
}

function conditionBadgeClass(condition: string) {
  switch (condition) {
    case "Mint":
      return "bg-green-100 text-green-700";
    case "Lightly Played":
      return "bg-yellow-100 text-yellow-700";
    case "Moderately Played":
      return "bg-orange-100 text-orange-700";
    case "Heavily Played":
      return "bg-red-100 text-red-700";
    case "Damaged":
      return "bg-red-200 text-red-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function HoldingPriceRows({
  purchasePrice,
  currentValue,
  pricingPending,
  compact = false,
}: {
  purchasePrice?: number;
  currentValue?: number;
  pricingPending?: boolean;
  compact?: boolean;
}) {
  const labelClass = compact ? "text-[10px] text-card-text-muted" : "text-xs text-card-text-muted";
  const valueClass = compact ? "text-[11px] font-medium text-card-text" : "text-sm font-medium text-card-text";
  const currentClass = compact ? "text-xs font-bold text-card-gold" : "text-sm font-bold text-card-gold";

  return (
    <div className={compact ? "mt-1 space-y-0.5" : "mt-2 space-y-1"}>
      <div className="flex items-center justify-between gap-2">
        <span className={labelClass}>Cost</span>
        <span className={valueClass}>
          {purchasePrice != null ? formatCurrency(purchasePrice) : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={labelClass}>Current Value</span>
        {pricingPending ? (
          <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
        ) : (
          <span className={currentClass}>
            {currentValue != null ? formatCurrency(currentValue) : "—"}
          </span>
        )}
      </div>
    </div>
  );
}

export function CardTile({ holding, showDelete = false, onMovedToTrash, compact = false }: Props) {
  const {
    card,
    current_value,
    purchase_price,
    price_change_24h_pct,
    trend,
    condition,
    is_graded,
    grading_company,
    grade,
  } = holding;
  const isPositive = (price_change_24h_pct ?? 0) >= 0;
  const pricingPending = card.pricing_status === "pending";
  const showConditionBadge = condition && condition !== "Near Mint" && condition !== "raw";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const moveToTrash = useMoveToTrash();

  const handleDeleteConfirm = async () => {
    try {
      await moveToTrash.mutateAsync(holding.holding_id);
      setConfirmOpen(false);
      onMovedToTrash?.();
    } catch {
      setConfirmOpen(false);
    }
  };

  if (compact) {
    const img = holding.user_uploaded_image_url || card.thumbnail_url || card.image_url;
    return (
      <Link
        href={`/cards/${card.id}`}
        className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-card-border bg-white card-shadow transition hover:-translate-y-0.5 hover:card-shadow-hover"
      >
        <div className="relative aspect-[2.5/3.5] w-full shrink-0 bg-muted">
          {img ? (
            <Image src={img} alt={card.card_name} fill className="object-contain p-1" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
          )}
          {showConditionBadge && (
            <span
              className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${conditionBadgeClass(condition!)}`}
            >
              {condition}
            </span>
          )}
        </div>
        <div className="flex min-h-[88px] flex-1 flex-col justify-start px-2.5 py-2">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-card-text">{card.card_name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-card-text-muted">{card.set_name}</p>
          <HoldingPriceRows
            purchasePrice={purchase_price}
            currentValue={current_value}
            pricingPending={pricingPending}
            compact
          />
          <div className="mt-auto flex items-center justify-between gap-1 pt-1">
            {price_change_24h_pct != null && !pricingPending ? (
              <span className={`text-[10px] ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {formatPercent(price_change_24h_pct)}
              </span>
            ) : (
              <span />
            )}
            <TrendIndicator trend={trend} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <>
    <Link href={`/cards/${card.id}`}>
      <Card className="group cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-md bg-muted">
            {card.image_url ? (
              <Image src={card.image_url} alt={card.card_name} fill className="object-contain" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
            )}
            {showDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm opacity-0 backdrop-blur transition hover:bg-card-red hover:text-white group-hover:opacity-100"
                aria-label="Move to trash"
              >
                🗑️
              </button>
            )}
            {is_graded && grading_company && grade != null && (
              <span className="absolute right-2 top-10 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                {grading_company} {grade}
              </span>
            )}
            {showConditionBadge && (
              <span
                className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium ${conditionBadgeClass(condition!)}`}
              >
                {condition}
              </span>
            )}
          </div>
          <h3 className="truncate font-semibold">{card.card_name}</h3>
          <p className="truncate text-xs text-muted-foreground">{card.set_name}</p>
          <div className="flex items-start justify-between gap-2">
            <HoldingPriceRows
              purchasePrice={purchase_price}
              currentValue={current_value}
              pricingPending={pricingPending}
            />
            <TrendIndicator trend={trend} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            {price_change_24h_pct != null && !pricingPending && (
              <span className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {formatPercent(price_change_24h_pct)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>

    {showDelete && (
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete this card?"
        message={`${card.card_name} will be moved to Trash. You can restore it anytime within 30 days, after which it will be permanently deleted.`}
        confirmLabel="Move to Trash"
        variant="danger"
        isLoading={moveToTrash.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    )}
    </>
  );
}
