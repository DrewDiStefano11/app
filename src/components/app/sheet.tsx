import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomSheet({ open, onClose, title, children, height = "auto" }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; height?: "auto" | "tall" | "full";
}) {
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={onClose} />
      <div className={cn(
        "sheet-surface relative w-full max-w-[480px] mx-auto rounded-t-3xl animate-in slide-in-from-bottom duration-300",
        height === "tall" && "max-h-[88dvh]",
        height === "full" && "h-[100dvh] rounded-none",
      )}>
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="absolute left-1/2 top-2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />
          <h3 className="font-semibold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/80">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] overflow-y-auto" style={{ maxHeight: "calc(88dvh - 60px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", destructive }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmLabel?: string; destructive?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="sheet-surface relative w-full max-w-sm rounded-2xl p-5">
        <h3 className="font-semibold text-lg text-white">{title}</h3>
        <p className="text-sm text-white/70 mt-2">{message}</p>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 font-medium text-white">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={cn("flex-1 px-4 py-2.5 rounded-xl font-semibold text-white", destructive ? "bg-destructive" : "")}
            style={!destructive ? { background: "var(--section)" } : undefined}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
