import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  height = "auto",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: "auto" | "tall" | "full";
}) {
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="sheet-root fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="sheet-backdrop absolute inset-0 bg-black/82 backdrop-blur-[10px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "sheet-surface relative w-full max-w-[480px] mx-auto rounded-t-[var(--radius-modal)] animate-in slide-in-from-bottom duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden",
          height === "tall" && "max-h-[88dvh]",
          height === "full" && "h-[100dvh] rounded-none",
        )}
      >
        {/* Grabber */}
        <div className="sheet-grabber-bar" />

        <div className="sheet-header flex min-h-[66px] items-center justify-between border-b border-white/[0.07] px-5 pb-3 pt-6">
          <h3 className="sheet-title font-semibold text-lg text-white">{title}</h3>
          <button
            onClick={onClose}
            className="btn-control press grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.07] text-white/70 transition-colors hover:bg-white/12 hover:text-white"
            aria-label="Close"
          >
            <X size={17} strokeWidth={2.5} />
          </button>
        </div>
        <div
          className="sheet-scroll overflow-y-auto px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-4"
          style={{ maxHeight: "calc(88dvh - 66px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="sheet-root fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="sheet-backdrop absolute inset-0 bg-black/82 backdrop-blur-[10px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="dialog-surface relative w-full max-w-sm rounded-[var(--radius-modal)] p-6 animate-in zoom-in-95 fade-in duration-200">
        <h3 className="font-semibold text-lg text-white">{title}</h3>
        <p className="text-sm text-white/65 mt-2 leading-relaxed">{message}</p>
        <div className="mt-5 flex gap-2.5 border-t border-white/[0.07] pt-4">
          <button
            onClick={onClose}
            className="btn-control press flex-1 px-4 py-3 rounded-xl border border-white/14 bg-white/[0.055] font-medium text-white/85 hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "btn-control press flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90",
              destructive ? "bg-destructive" : "",
            )}
            style={!destructive ? { background: "var(--section)" } : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
