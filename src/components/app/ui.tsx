import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("card-elev p-4", onClick && "cursor-pointer active:scale-[0.99] transition-transform", className)}>
      {children}
    </div>
  );
}

export function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("section-gradient border border-border rounded-2xl p-5", className)}>{children}</div>;
}

export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <Card className={cn("flex flex-col gap-1", accent && "ring-section")}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Card>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color ?? "var(--section)" }} />
    </div>
  );
}

export function Ring({ value, max, size = 84, label }: { value: number; max: number; size?: number; label?: string }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(1, max));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--surface-2)" strokeWidth="8" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--section)" strokeWidth="8" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold tabular-nums">{Math.round(pct*100)}%</span>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-10 px-6">
      {icon && <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--section-soft)", color: "var(--section)" }}>{icon}</div>}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

export function Chip({ children, active, onClick, color }: { children: ReactNode; active?: boolean; onClick?: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
        active ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground"
      )}
      style={active ? { background: color ?? "var(--section)" } : undefined}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="px-5 pt-6 pb-3 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function PrimaryButton({ children, onClick, disabled, className, type }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) {
  return (
    <button type={type ?? "button"} disabled={disabled} onClick={onClick}
      className={cn("inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform", className)}
      style={{ background: "var(--section)", boxShadow: "0 10px 30px -10px color-mix(in oklab, var(--section) 60%, transparent)" }}>
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium border border-border bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors", className)}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] transition-colors text-base", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-base", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-base resize-none", props.className)} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{children}</label>;
}
