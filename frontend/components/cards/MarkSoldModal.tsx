"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PortfolioHolding } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/lib/utils";

export interface MarkSoldModalProps {
  isOpen: boolean;
  holding: PortfolioHolding | null;
  onClose: () => void;
  onConfirm: (data: { sold_price: number; sold_date: string; sold_quantity?: number }) => void;
  isLoading?: boolean;
}

export function MarkSoldModal({
  isOpen,
  holding,
  onClose,
  onConfirm,
  isLoading = false,
}: MarkSoldModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [soldPrice, setSoldPrice] = useState("");
  const [soldDate, setSoldDate] = useState(today);
  const [soldQuantity, setSoldQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && holding) {
      setSoldPrice("");
      setSoldDate(today);
      setSoldQuantity(holding.quantity);
    }
  }, [isOpen, holding, today]);

  const preview = useMemo(() => {
    if (!holding?.purchase_price || !soldPrice) return null;
    const qty = holding.quantity > 1 ? soldQuantity : holding.quantity;
    const cost = holding.purchase_price * qty;
    const sold = parseFloat(soldPrice) * qty;
    const profit = sold - cost;
    const profitPct = cost ? (profit / cost) * 100 : 0;
    return { cost, sold, profit, profitPct, qty };
  }, [holding, soldPrice, soldQuantity]);

  if (!isOpen || !holding) return null;

  const { card, quantity, user_uploaded_image_url } = holding;
  const img = user_uploaded_image_url || card.thumbnail_url || card.image_url;

  const handleConfirm = () => {
    const price = parseFloat(soldPrice);
    if (!price || price <= 0 || !soldDate) return;
    onConfirm({
      sold_price: price,
      sold_date: soldDate,
      sold_quantity: quantity > 1 ? soldQuantity : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop-in w-full max-w-md rounded-2xl border border-card-border bg-white p-6 card-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-xl text-card-text">Mark as Sold</h2>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-card-border bg-amber-50/50 p-3">
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
            {img ? (
              <Image src={img} alt={card.card_name} fill className="object-contain" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-400 to-blue-500 text-sm font-bold text-white">
                {card.card_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-card-text">{card.card_name}</p>
            <p className="truncate text-xs text-card-text-muted">{card.set_name}</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {quantity > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-card-text">
                How many are you selling?
              </label>
              <input
                type="number"
                min={1}
                max={quantity}
                value={soldQuantity}
                onChange={(e) =>
                  setSoldQuantity(Math.min(quantity, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className="w-full rounded-xl border border-card-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-card-gold"
              />
              <p className="mt-1 text-xs text-card-text-muted">You own {quantity} of this card</p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-card-text">Sold Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-card-text-muted">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                required
                placeholder="0.00"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                className="w-full rounded-xl border border-card-border py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-card-gold"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-card-text">Sold Date</label>
            <input
              type="date"
              required
              max={today}
              value={soldDate}
              onChange={(e) => setSoldDate(e.target.value)}
              className="w-full rounded-xl border border-card-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-card-gold"
            />
          </div>

          {preview && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-card-text">
              Cost: {formatCurrency(preview.cost)} → Sold: {formatCurrency(preview.sold)} →{" "}
              <span className={preview.profit >= 0 ? "font-semibold text-green-600" : "font-semibold text-red-600"}>
                {preview.profit >= 0 ? "Profit" : "Loss"}: {preview.profit >= 0 ? "+" : ""}
                {formatCurrency(preview.profit)} ({formatPercent(preview.profitPct)})
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !soldPrice || parseFloat(soldPrice) <= 0}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Confirm Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
