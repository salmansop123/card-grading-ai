"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { CardSearchAutocomplete } from "@/components/cards/CardSearchAutocomplete";
import { useVault } from "@/hooks/useVault";
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from "@/hooks/useWishlist";
import { useMoveToTrash, useTrash } from "@/hooks/useTrash";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toast } from "@/components/shared/Toast";
import { EditHoldingModal } from "@/components/cards/EditHoldingModal";
import { MarkSoldModal } from "@/components/cards/MarkSoldModal";
import { useSoldCards, useMarkAsSold, useRevertSold } from "@/hooks/useSoldCards";
import { CardSearchResult } from "@/types/card";
import { PortfolioHolding } from "@/types/portfolio";
import { WishlistItem } from "@/types/wishlist";
import { formatCurrency, formatPercent } from "@/lib/utils";

type VaultTab = "collection" | "wishlist" | "sold";

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

function CollectionTile({
  holding,
  onMovedToTrash,
  onEdit,
  onMarkSold,
}: {
  holding: PortfolioHolding;
  onMovedToTrash: () => void;
  onEdit: () => void;
  onMarkSold: () => void;
}) {
  const { card, quantity, condition, user_uploaded_image_url, purchase_price, current_value } = holding;
  const img = user_uploaded_image_url || card.thumbnail_url || card.image_url;
  const showCondition = condition && condition !== "Near Mint" && condition !== "raw";
  const pricingPending = card.pricing_status === "pending";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const moveToTrash = useMoveToTrash();

  const handleDeleteConfirm = async () => {
    try {
      await moveToTrash.mutateAsync(holding.holding_id);
      setConfirmOpen(false);
      onMovedToTrash();
    } catch {
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Link
        href={`/cards/${card.id}`}
        className="group overflow-hidden rounded-xl border border-card-border bg-white card-shadow transition hover:-translate-y-1 hover:card-shadow-hover"
      >
        <div className="relative aspect-[2.5/3.5] w-full bg-muted">
          {img ? (
            <Image src={img} alt={card.card_name} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-400 to-blue-500 text-2xl font-bold text-white">
              {card.card_name.charAt(0)}
            </div>
          )}
          <div className="absolute right-2 top-2 z-20 flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkSold();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm backdrop-blur transition hover:bg-amber-100"
              aria-label="Mark as sold"
            >
              💰
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmOpen(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm backdrop-blur transition hover:bg-card-red hover:text-white"
              aria-label="Move to trash"
            >
              🗑️
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="absolute bottom-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm opacity-0 backdrop-blur transition hover:bg-card-gold hover:text-white group-hover:opacity-100"
            aria-label="Edit purchase details"
          >
            ✏️
          </button>
          {quantity > 1 && (
            <span className="absolute right-2 top-10 rounded-full bg-card-gold px-2 py-0.5 text-xs font-bold text-white">
              ×{quantity}
            </span>
          )}
          {showCondition && (
            <span
              className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium ${conditionBadgeClass(condition!)}`}
            >
              {condition}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-semibold text-card-text">{card.card_name}</p>
          <p className="truncate text-xs text-card-text-muted">{card.set_name}</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-card-text-muted">Cost</span>
              <span className="font-medium text-card-text">
                {purchase_price != null ? formatCurrency(purchase_price) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-card-text-muted">Current Value</span>
              {pricingPending ? (
                <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
              ) : (
                <span className="font-bold text-card-gold">
                  {current_value != null ? formatCurrency(current_value) : "—"}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

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
    </>
  );
}

function SoldTile({
  holding,
  onRevert,
  reverting,
}: {
  holding: PortfolioHolding;
  onRevert: () => void;
  reverting?: boolean;
}) {
  const { card, user_uploaded_image_url, sold_date, cost_basis, total_revenue, profit, profit_pct } =
    holding;
  const img = user_uploaded_image_url || card.thumbnail_url || card.image_url;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRevertConfirm = async () => {
    await onRevert();
    setConfirmOpen(false);
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-card-border bg-white card-shadow">
        <div className="relative aspect-[2.5/3.5] w-full bg-muted">
          {img ? (
            <Image src={img} alt={card.card_name} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-400 to-blue-500 text-2xl font-bold text-white">
              {card.card_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="space-y-2 p-3">
          <p className="truncate text-sm font-semibold text-card-text">{card.card_name}</p>
          <p className="truncate text-xs text-card-text-muted">{card.set_name}</p>
          {sold_date && (
            <p className="text-xs text-card-text-muted">
              Sold {new Date(sold_date + "T00:00:00").toLocaleDateString()}
            </p>
          )}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-card-text-muted">Cost</span>
              <span className="text-card-text-muted">
                {cost_basis != null ? formatCurrency(cost_basis) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-card-text-muted">Sold</span>
              <span className="font-bold text-card-text">
                {total_revenue != null ? formatCurrency(total_revenue) : "—"}
              </span>
            </div>
          </div>
          {cost_basis != null && profit != null ? (
            <span
              className={`inline-block rounded-full px-2 py-1 text-xs ${
                profit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {profit >= 0 ? "Profit" : "Loss"}: {profit >= 0 ? "+" : ""}
              {formatCurrency(profit)}
              {profit_pct != null && ` (${formatPercent(profit_pct)})`}
            </span>
          ) : (
            <p className="text-xs text-card-text-muted">Add purchase price to see profit/loss</p>
          )}
          <button
            type="button"
            className="btn-secondary w-full py-2 text-xs"
            onClick={() => setConfirmOpen(true)}
          >
            ↩️ Move Back to Collection
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Move this card back to your collection?"
        message="This will remove it from Sold and add it back to My Collection. Use this if you marked a card as sold by mistake."
        confirmLabel="Move Back"
        variant="default"
        isLoading={reverting}
        onConfirm={handleRevertConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function WishlistTile({
  item,
  onRemove,
  removing,
}: {
  item: WishlistItem;
  onRemove: (id: string) => Promise<void>;
  removing?: boolean;
}) {
  const router = useRouter();
  const img = item.card.thumbnail_url || item.card.image_url;
  const tcgId = item.card.pokemon_tcg_id;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRemoveConfirm = async () => {
    try {
      await onRemove(item.id);
      setConfirmOpen(false);
    } catch {
      setConfirmOpen(false);
    }
  };

  const handleAddToCollection = () => {
    if (tcgId) {
      sessionStorage.setItem(
        "manualAddPrefill",
        JSON.stringify({
          pokemon_tcg_id: tcgId,
          card_name: item.card.card_name,
          set_name: item.card.set_name,
          card_number: item.card.card_number,
          image_url: item.card.image_url,
          thumbnail_url: item.card.thumbnail_url,
          rarity: item.card.rarity,
          year: item.card.year,
          wishlist_item_id: item.id,
        })
      );
    }
    router.push(`/upload?tab=manual&prefill=${encodeURIComponent(tcgId || "")}&wishlistItemId=${item.id}`);
  };

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-card-border bg-white card-shadow transition hover:-translate-y-1 hover:card-shadow-hover">
      <div className="relative aspect-[2.5/3.5] w-full bg-muted">
        {img ? (
          <Image src={img} alt={item.card.card_name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-400 to-blue-500 text-2xl font-bold text-white">
            {item.card.card_name.charAt(0)}
          </div>
        )}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs text-red-600 backdrop-blur shadow"
          aria-label="Remove from wishlist"
        >
          ✕
        </button>
        {item.at_target && (
          <span className="absolute bottom-2 left-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            🎯 At target price!
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-semibold text-card-text">{item.card.card_name}</p>
        <p className="truncate text-xs text-card-text-muted">{item.card.set_name}</p>
        <p className="text-lg font-bold text-card-gold">
          {item.current_price != null ? formatCurrency(item.current_price) : "—"}
        </p>
        {item.target_price != null && (
          <p className="text-xs text-card-text-muted">Target: {formatCurrency(item.target_price)}</p>
        )}
        <button type="button" className="btn-primary w-full py-2 text-xs" onClick={handleAddToCollection}>
          Add to Collection →
        </button>
      </div>
    </div>

    <ConfirmDialog
      isOpen={confirmOpen}
      title="Remove from wishlist?"
      message={`${item.card.card_name} will be removed from your wishlist. You can always add it back later.`}
      confirmLabel="Remove"
      variant="danger"
      isLoading={removing}
      onConfirm={handleRemoveConfirm}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}

function AddWishlistModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addMutation = useAddToWishlist();
  const [targetPrice, setTargetPrice] = useState("");
  const [pendingCard, setPendingCard] = useState<CardSearchResult | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingCard(null);
      setTargetPrice("");
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = async () => {
    if (!pendingCard) return;
    const tcgId = pendingCard.pokemon_tcg_id || pendingCard.id;
    if (!tcgId) return;
    await addMutation.mutateAsync({
      pokemon_tcg_id: tcgId,
      target_price: targetPrice ? parseFloat(targetPrice) : null,
    });
    setPendingCard(null);
    setTargetPrice("");
    onClose();
  };

  const cardName = pendingCard?.card_name || pendingCard?.name;
  const cardImg = pendingCard?.thumbnail_url || pendingCard?.image_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop-in flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-card-border bg-white card-shadow"
        style={{ maxHeight: "min(85vh, 560px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-card-border px-5 py-4">
          <div>
            <h2 className="font-bold text-lg text-card-text">🌟 Add to Wishlist</h2>
            <p className="mt-0.5 text-xs text-card-text-muted">
              {pendingCard ? "Set an optional target price" : "Search for a card to track"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-card-text-muted transition hover:bg-gray-100 hover:text-card-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
          {!pendingCard ? (
            <CardSearchAutocomplete
              onSelect={setPendingCard}
              resultsLayout="inline"
              compact
              placeholder="e.g. Greninja, Charizard, Pikachu..."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-card-border bg-amber-50/50 p-4">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                  {cardImg ? (
                    <Image src={cardImg} alt={cardName || "Card"} fill className="object-contain" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-400 to-blue-500 text-lg font-bold text-white">
                      {cardName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-card-text">{cardName}</p>
                  <p className="text-sm text-card-text-muted">{pendingCard.set_name}</p>
                  <button
                    type="button"
                    onClick={() => setPendingCard(null)}
                    className="mt-1 text-xs font-medium text-card-gold hover:underline"
                  >
                    ← Choose a different card
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-text">
                  Target price <span className="font-normal text-card-text-muted">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-card-text-muted">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Alert me when price drops to..."
                    className="w-full rounded-xl border border-card-border py-3 pl-8 pr-4 text-sm focus:border-card-gold focus:outline-none focus:ring-2 focus:ring-card-gold/30"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {pendingCard && (
          <div className="flex shrink-0 gap-2 border-t border-card-border px-5 py-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={addMutation.isPending}
              className="btn-primary flex-1"
            >
              {addMutation.isPending ? "Adding..." : "Add to Wishlist"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VaultPage() {
  const searchParams = useSearchParams();
  const { data: vaultData, isLoading: vaultLoading } = useVault();
  const { data: wishlistItems = [], isLoading: wishlistLoading } = useWishlist();
  const { data: soldItems = [], isLoading: soldLoading } = useSoldCards();
  const { data: trashItems = [] } = useTrash();
  const removeMutation = useRemoveFromWishlist();
  const markAsSoldMutation = useMarkAsSold();
  const revertSoldMutation = useRevertSold();

  const [activeTab, setActiveTab] = useState<VaultTab>("collection");
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sort, setSort] = useState("name");
  const [toast, setToast] = useState<string | null>(null);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  const [markSoldHolding, setMarkSoldHolding] = useState<PortfolioHolding | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "wishlist") setActiveTab("wishlist");
    else if (tab === "sold") setActiveTab("sold");
  }, [searchParams]);

  const holdings = vaultData?.holdings ?? [];

  const soldSummary = useMemo(() => {
    const totalRevenue = soldItems.reduce((sum, h) => sum + (h.total_revenue ?? 0), 0);
    const totalProfit = soldItems.reduce((sum, h) => sum + (h.profit ?? 0), 0);
    const hasProfit = soldItems.some((h) => h.profit != null);
    return { totalRevenue, totalProfit: hasProfit ? totalProfit : null };
  }, [soldItems]);

  const cardTypes = useMemo(() => {
    const types = new Set(holdings.map((h) => h.card.card_type || "pokemon"));
    return ["All", ...Array.from(types).map((t) => t.charAt(0).toUpperCase() + t.slice(1))];
  }, [holdings]);

  const filteredHoldings = useMemo(() => {
    let list = [...holdings];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => h.card.card_name.toLowerCase().includes(q));
    }
    if (typeFilter !== "All") {
      list = list.filter(
        (h) => (h.card.card_type || "pokemon").toLowerCase() === typeFilter.toLowerCase()
      );
    }
    if (sort === "name") {
      list.sort((a, b) => a.card.card_name.localeCompare(b.card.card_name));
    } else if (sort === "set") {
      list.sort((a, b) => (a.card.set_name || "").localeCompare(b.card.set_name || ""));
    }
    return list;
  }, [holdings, search, typeFilter, sort]);

  const isLoading = vaultLoading || wishlistLoading || soldLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("collection")}
          className={`rounded-xl px-3 py-3 text-sm font-bold transition-all md:text-base ${
            activeTab === "collection"
              ? "bg-card-gold text-white shadow"
              : "border border-card-border bg-white text-card-text-muted hover:border-card-gold"
          }`}
        >
          🗄️ My Collection ({holdings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("wishlist")}
          className={`rounded-xl px-3 py-3 text-sm font-bold transition-all md:text-base ${
            activeTab === "wishlist"
              ? "bg-card-gold text-white shadow"
              : "border border-card-border bg-white text-card-text-muted hover:border-card-gold"
          }`}
        >
          🌟 Wishlist ({wishlistItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sold")}
          className={`rounded-xl px-3 py-3 text-sm font-bold transition-all md:text-base ${
            activeTab === "sold"
              ? "bg-card-gold text-white shadow"
              : "border border-card-border bg-white text-card-text-muted hover:border-card-gold"
          }`}
        >
          💰 Sold ({soldItems.length})
        </button>
        </div>
        <Link
          href="/vault/trash"
          className="relative z-10 shrink-0 rounded-xl border border-card-border bg-white px-3 py-2 text-sm font-medium text-card-text-muted transition hover:border-card-gold hover:text-card-text"
        >
          🗑️ Trash ({trashItems.length})
        </Link>
      </div>

      {activeTab === "collection" ? (
        <>
          <div>
            <h1 className="font-black text-2xl text-card-text">Your Vault 📚</h1>
            <p className="text-card-text-muted">See everything you own</p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by card name..."
              className="w-full rounded-xl border border-card-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-card-gold md:max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              {cardTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    typeFilter === t
                      ? "border-card-gold bg-card-gold text-white"
                      : "border-card-border text-card-text-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-card-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-card-gold"
            >
              <option value="name">Name A-Z</option>
              <option value="set">Set Name</option>
            </select>
          </div>

          {!filteredHoldings.length ? (
            <div className="rounded-2xl border border-card-border bg-white p-12 text-center card-shadow">
              <div className="mb-4 text-6xl">🗄️</div>
              <h2 className="font-bold text-xl text-card-text">Your vault is empty</h2>
              <p className="mb-6 text-card-text-muted">Add cards to start building your collection</p>
              <Link href="/upload" className="btn-primary">
                Add Your First Card →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {filteredHoldings.map((holding) => (
                <CollectionTile
                  key={holding.holding_id}
                  holding={holding}
                  onMovedToTrash={() => setToast("Card moved to trash 🗑️")}
                  onEdit={() => setEditingHolding(holding)}
                  onMarkSold={() => setMarkSoldHolding(holding)}
                />
              ))}
            </div>
          )}
        </>
      ) : activeTab === "wishlist" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-black text-2xl text-card-text">Your Wishlist 🌟</h1>
              <p className="text-card-text-muted">Cards you want to add to your collection</p>
            </div>
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary">
              + Add to Wishlist
            </button>
          </div>

          {!wishlistItems.length ? (
            <div className="rounded-2xl border border-card-border bg-white p-12 text-center card-shadow">
              <div className="mb-4 text-6xl">🌟</div>
              <h2 className="font-bold text-xl text-card-text">Your wishlist is empty</h2>
              <p className="mb-6 text-card-text-muted">
                Search for cards you want to add to your collection
              </p>
              <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary">
                + Add to Wishlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {wishlistItems.map((item) => (
                <WishlistTile
                  key={item.id}
                  item={item}
                  onRemove={(id) => removeMutation.mutateAsync(id)}
                  removing={removeMutation.isPending}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <h1 className="font-black text-2xl text-card-text">Sold Cards 💰</h1>
            <p className="text-card-text-muted">Track sales and profit/loss on cards you&apos;ve sold</p>
          </div>

          {soldItems.length > 0 && (
            <div className="mb-6 rounded-2xl border border-card-border bg-white p-5 card-shadow">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-card-text-muted">Total Sold</p>
                  <p className="font-bold text-lg text-card-text">{soldItems.length} cards</p>
                </div>
                <div>
                  <p className="text-sm text-card-text-muted">Total Revenue</p>
                  <p className="font-bold text-lg text-card-text">
                    {formatCurrency(soldSummary.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-card-text-muted">Total Profit</p>
                  <p
                    className={`font-bold text-lg ${
                      soldSummary.totalProfit == null
                        ? "text-card-text-muted"
                        : soldSummary.totalProfit >= 0
                          ? "text-green-600"
                          : "text-red-600"
                    }`}
                  >
                    {soldSummary.totalProfit != null
                      ? formatCurrency(soldSummary.totalProfit)
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!soldItems.length ? (
            <div className="rounded-2xl border border-card-border bg-white p-12 text-center card-shadow">
              <div className="mb-4 text-6xl">💰</div>
              <h2 className="font-bold text-xl text-card-text">No sold cards yet</h2>
              <p className="text-card-text-muted">
                Cards you sell will appear here with profit/loss tracking
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {soldItems.map((holding) => (
                <SoldTile
                  key={holding.holding_id}
                  holding={holding}
                  reverting={revertSoldMutation.isPending}
                  onRevert={async () => {
                    await revertSoldMutation.mutateAsync(holding.holding_id);
                    setToast("Card moved back to collection ✓");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AddWishlistModal open={showAddModal} onClose={() => setShowAddModal(false)} />
      <MarkSoldModal
        isOpen={!!markSoldHolding}
        holding={markSoldHolding}
        onClose={() => setMarkSoldHolding(null)}
        isLoading={markAsSoldMutation.isPending}
        onConfirm={async (data) => {
          if (!markSoldHolding) return;
          await markAsSoldMutation.mutateAsync({
            holdingId: markSoldHolding.holding_id,
            data,
          });
          setMarkSoldHolding(null);
          setToast("Card marked as sold 💰");
        }}
      />
      <EditHoldingModal
        holding={editingHolding}
        onClose={() => setEditingHolding(null)}
        onSaved={() => setToast("Card updated ✓")}
      />
      <Toast message={toast} onClear={clearToast} />
    </div>
  );
}
