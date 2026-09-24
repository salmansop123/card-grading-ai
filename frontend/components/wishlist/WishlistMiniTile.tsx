"use client";

import Link from "next/link";
import Image from "next/image";
import { WishlistItem } from "@/types/wishlist";
import { formatCurrency } from "@/lib/utils";

export function WishlistMiniTile({ item, compact = false }: { item: WishlistItem; compact?: boolean }) {
  const img = item.card.thumbnail_url || item.card.image_url;

  if (compact) {
    return (
      <Link
        href="/vault?tab=wishlist"
        className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-card-border bg-white card-shadow transition hover:-translate-y-0.5 hover:card-shadow-hover"
      >
        <div className="relative aspect-[2.5/3.5] w-full shrink-0 bg-muted">
          {img ? (
            <Image src={img} alt={item.card.card_name} fill className="object-contain p-1" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-400 to-blue-500 text-sm font-bold text-white">
              {item.card.card_name.charAt(0)}
            </div>
          )}
          {item.at_target && (
            <span className="absolute right-1 top-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px]">
              🎯
            </span>
          )}
        </div>
        <div className="flex min-h-[72px] flex-col justify-start px-2.5 py-2">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-card-text">{item.card.card_name}</p>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-card-text-muted">{item.card.set_name}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-card-text-muted">Current Value</span>
            <p className="text-xs font-bold text-card-gold">
              {item.current_price != null ? formatCurrency(item.current_price) : "—"}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/vault?tab=wishlist"
      className="relative overflow-hidden rounded-xl border border-card-border bg-white card-shadow transition hover:-translate-y-1 hover:card-shadow-hover"
    >
      <div className="relative aspect-[2.5/3.5] w-full bg-muted">
        {img ? (
          <Image src={img} alt={item.card.card_name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-400 to-blue-500 text-lg font-bold text-white">
            {item.card.card_name.charAt(0)}
          </div>
        )}
        {item.at_target && (
          <span className="absolute right-1 top-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs">
            🎯
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-semibold text-card-text">{item.card.card_name}</p>
        <p className="text-sm font-bold text-card-gold">
          {item.current_price != null ? formatCurrency(item.current_price) : "—"}
        </p>
      </div>
    </Link>
  );
}
