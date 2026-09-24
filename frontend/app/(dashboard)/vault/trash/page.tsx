"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Toast } from "@/components/shared/Toast";
import {
  useEmptyTrash,
  usePermanentDelete,
  useRestoreFromTrash,
  useTrash,
} from "@/hooks/useTrash";
import { PortfolioHolding } from "@/types/portfolio";

function TrashTile({
  holding,
  onRestore,
  onPermanentDelete,
  restoring,
  deleting,
}: {
  holding: PortfolioHolding;
  onRestore: () => void;
  onPermanentDelete: () => void;
  restoring: boolean;
  deleting: boolean;
}) {
  const { card } = holding;
  const img = holding.user_uploaded_image_url || card.thumbnail_url || card.image_url;
  const daysInTrash = holding.days_in_trash ?? 0;
  const daysRemaining = holding.days_remaining ?? 0;
  const urgencyClass =
    daysRemaining <= 3 ? "text-red-700" : daysRemaining <= 7 ? "text-orange-600" : "text-card-red";

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-white opacity-70 grayscale card-shadow">
      <div className="relative aspect-[2.5/3.5] w-full bg-muted">
        {img ? (
          <Image src={img} alt={card.card_name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 text-2xl font-bold text-white">
            {card.card_name.charAt(0)}
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-semibold text-card-text">{card.card_name}</p>
        <p className="truncate text-xs text-card-text-muted">{card.set_name}</p>
        <p className="text-xs text-card-text-muted">
          Deleted {daysInTrash === 0 ? "today" : `${daysInTrash} day${daysInTrash === 1 ? "" : "s"} ago`}
        </p>
        <p className={`text-xs font-medium ${urgencyClass}`}>
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"} until permanent deletion
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={restoring}
            onClick={onRestore}
            className="btn-secondary flex-1 py-1.5 text-xs"
          >
            ↩️ Restore
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onPermanentDelete}
            className="flex-1 py-1.5 text-xs font-medium text-card-red hover:underline"
          >
            🗑️ Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrashPage() {
  const { data: trashItems = [], isLoading } = useTrash();
  const restoreMutation = useRestoreFromTrash();
  const permanentDeleteMutation = usePermanentDelete();
  const emptyTrashMutation = useEmptyTrash();

  const [toast, setToast] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PortfolioHolding | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const handleRestore = async (holdingId: string) => {
    setBusyId(holdingId);
    try {
      await restoreMutation.mutateAsync(holdingId);
      setToast("Card restored ✓");
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.holding_id;
    setBusyId(id);
    try {
      await permanentDeleteMutation.mutateAsync(id);
      setToast("Card permanently deleted");
      setConfirmDelete(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrashMutation.mutateAsync();
      setToast("Trash emptied 🗑️");
      setConfirmEmpty(false);
    } catch {
      // mutation error surfaced by react-query
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/vault" className="text-sm text-card-text-muted hover:text-card-gold">
        ← Back to Vault
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-black text-2xl text-card-text">Trash 🗑️</h1>
          <p className="text-card-text-muted">Cards here are permanently deleted after 30 days</p>
        </div>
        {trashItems.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmEmpty(true)}
            className="btn-secondary border-card-red text-card-red hover:bg-red-50"
          >
            Empty Trash
          </button>
        )}
      </div>

      {!trashItems.length ? (
        <div className="rounded-2xl border border-card-border bg-white p-12 text-center card-shadow">
          <div className="mb-4 text-6xl">🗑️</div>
          <h2 className="font-bold text-xl text-card-text">Trash is empty</h2>
          <p className="text-card-text-muted">Deleted cards will appear here for 30 days</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {trashItems.map((holding) => (
            <TrashTile
              key={holding.holding_id}
              holding={holding}
              restoring={busyId === holding.holding_id && restoreMutation.isPending}
              deleting={busyId === holding.holding_id && permanentDeleteMutation.isPending}
              onRestore={() => handleRestore(holding.holding_id)}
              onPermanentDelete={() => setConfirmDelete(holding)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmEmpty}
        title="Empty entire trash?"
        message={`This will permanently delete all ${trashItems.length} cards in trash. This action cannot be undone.`}
        confirmLabel="Empty Trash"
        variant="danger"
        isLoading={emptyTrashMutation.isPending}
        onConfirm={handleEmptyTrash}
        onCancel={() => setConfirmEmpty(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Permanently delete this card?"
        message={`${confirmDelete?.card.card_name ?? "This card"} will be permanently deleted immediately. This cannot be undone.`}
        confirmLabel="Delete Forever"
        variant="danger"
        isLoading={permanentDeleteMutation.isPending}
        onConfirm={handlePermanentDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <Toast message={toast} onClear={clearToast} />
    </div>
  );
}
