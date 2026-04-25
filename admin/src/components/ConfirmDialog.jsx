import { useEffect } from "react";

/**
 * In-app confirmation for destructive actions (replaces window.confirm).
 * Styling aligned with ShareMenuModal — frosted backdrop, rounded sheet, clear hierarchy.
 */
export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const confirmClasses =
    variant === "danger"
      ? "bg-[#b42318] text-white hover:bg-[#991b1b] focus-visible:ring-2 focus-visible:ring-red-500/40"
      : "bg-neutral-900 text-white hover:bg-black focus-visible:ring-2 focus-visible:ring-neutral-400/40";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-desc">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        aria-label="Dismiss"
        disabled={loading}
        onClick={() => !loading && onClose?.()}
      />
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.08]">
        <div className="border-b border-neutral-100 px-6 py-5">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-neutral-900">
            {title}
          </h2>
          {description ? (
            <p id="confirm-dialog-desc" className="mt-2 text-sm leading-relaxed text-neutral-600">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => onClose?.()}
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm?.()}
            className={`rounded-2xl px-5 py-3 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClasses}`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
