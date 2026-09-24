"use client";

import { useEffect, useState } from "react";
import { PortfolioHolding } from "@/types/portfolio";
import { useUpdateHolding } from "@/hooks/usePortfolio";

interface EditHoldingModalProps {
  holding: PortfolioHolding | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditHoldingModal({ holding, onClose, onSaved }: EditHoldingModalProps) {
  const updateMutation = useUpdateHolding();
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  useEffect(() => {
    if (!holding) return;
    setPurchasePrice(
      holding.purchase_price != null ? String(holding.purchase_price) : ""
    );
    setPurchaseDate(holding.purchase_date?.slice(0, 10) ?? "");
  }, [holding]);

  if (!holding) return null;

  const handleSave = async () => {
    const price =
      purchasePrice.trim() === "" ? null : parseFloat(purchasePrice);
    if (price !== null && (Number.isNaN(price) || price < 0)) return;

    await updateMutation.mutateAsync({
      holdingId: holding.holding_id,
      purchase_price: price,
      purchase_date: purchaseDate.trim() === "" ? null : purchaseDate,
    });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="animate-pop-in w-full max-w-md rounded-2xl bg-white p-6 card-shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-xl text-card-text">Edit Card</h2>
          <button type="button" onClick={onClose} className="text-card-text-muted hover:text-card-text">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-card-text-muted">{holding.card.card_name}</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-card-text">Purchase Cost</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-card-text-muted">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="What you paid"
                className="w-full rounded-xl border border-card-border py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-card-gold"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-card-text">Purchase Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-xl border border-card-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-card-gold"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
