"use client";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="animate-pop-in mt-32 w-full max-w-md rounded-2xl bg-white p-6 card-shadow">
        <h2 className="font-bold text-xl text-card-text">{title}</h2>
        <p className="mt-2 text-card-text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={isLoading} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={
              variant === "danger"
                ? "rounded-xl bg-card-red px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
                : "btn-primary"
            }
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
