import { type ButtonHTMLAttributes, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "premium-card card-elev p-4 sm:p-[1.125rem]",
        onClick &&
          "cursor-pointer press transition-[transform,border-color,background-color]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "premium-card section-gradient border border-border rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "metric-shell stat-card flex flex-col gap-1.5 p-4",
        accent && "ring-section",
      )}
    >
      <span className="stat-card__label text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="stat-card__value text-2xl font-bold tabular-nums">
        {value}
      </span>
      {sub && (
        <span className="stat-card__helper text-xs text-muted-foreground">
          {sub}
        </span>
      )}
    </Card>
  );
}

export function CompactMetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left">
      <div className="mb-2 flex items-center gap-2 text-white/50">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="font-semibold text-lg text-white leading-none">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-white/45">{subtitle}</div>}
    </div>
  );
}

export function ExpandableCard({
  title,
  subtitle,
  children,
  defaultExpanded = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 sm:p-[1.125rem] text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={expanded}
      >
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-white/50">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-transform duration-300", expanded ? "rotate-180" : "")}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/10 p-4 sm:p-[1.125rem] bg-white/[0.01]">
          {children}
        </div>
      )}
    </Card>
  );
}

export function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  return (
    <div
      className="h-2 rounded-full overflow-hidden ring-1 ring-white/[0.04]"
      style={{ background: "var(--surface-2)" }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color ?? "var(--section)" }}
      />
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 84,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  label?: string;
}) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(1, max));
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--surface-2)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--section)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold tabular-nums">
          {Math.round(pct * 100)}%
        </span>
        {label && (
          <span className="text-[10px] text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-shell flex flex-col items-center text-center gap-3 py-9 px-6">
      {icon && (
        <div
          className="empty-state-graphic"
          style={{ background: "var(--section-soft)", color: "var(--section)" }}
        >
          {icon}
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  color,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "btn-control chip-control min-h-9 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-[color,background-color,border-color,transform] press",
        active
          ? "chip-control--active border-transparent text-white"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
      style={active ? { background: color ?? "var(--section)" } : undefined}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header px-5 pt-6 pb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="page-header__title text-3xl font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="page-header__subtitle text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  type,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "btn-control btn-primary inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 rounded-[var(--radius-small)] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed press transition-[transform,filter,box-shadow] hover:brightness-105",
        className,
      )}
      style={{
        background: "var(--section)",
        boxShadow:
          "0 10px 30px -10px color-mix(in oklab, var(--section) 60%, transparent)",
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        "btn-control btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-small)] font-semibold border border-[var(--border-strong)] bg-white/[0.045] hover:bg-white/[0.075] transition-colors disabled:opacity-50 disabled:cursor-not-allowed press",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "field-control w-full px-4 py-3 rounded-[var(--radius-small)] bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] transition-[border-color,box-shadow] text-base",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "field-control w-full px-4 py-3 rounded-[var(--radius-small)] bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-base",
        props.className,
      )}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(
        "field-control w-full px-4 py-3 rounded-[var(--radius-small)] bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-base resize-none",
        props.className,
      )}
    />
  );
}

export function Label({ children, htmlFor, ...props }: { children: ReactNode } & React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label htmlFor={htmlFor} className="text-xs uppercase tracking-wider text-muted-foreground font-semibold" {...props}>
      {children}
    </label>
  );
}

export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="px-5 pb-3">
      <div
        className="segmented-control flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden no-scrollbar p-1 rounded-[1.25rem] bg-white/[0.04] border border-white/10 backdrop-blur-sm"
        role="tablist"
        aria-label="Section navigation"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={cn(
                "btn-control relative shrink-0 min-w-[75px] px-3 py-2 rounded-[1rem] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 text-center",
                isActive ? "text-white" : "text-white/45 hover:text-white/70",
              )}
              style={
                isActive
                  ? {
                      background: "var(--section)",
                      boxShadow:
                        "0 6px 20px -6px color-mix(in oklab, var(--section) 70%, transparent)",
                    }
                  : undefined
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PlannedFeatureCard({
  title,
  description,
  status = "Coming later",
  actionLabel,
}: {
  title: string;
  description: string;
  status?: "Coming later" | "Planned" | "Not connected yet" | "Presentational only";
  actionLabel?: string;
}) {
  return (
    <Card className="border-dashed border-white/15 bg-white/[0.02] opacity-75 pointer-events-none">
      <div className="flex items-start justify-between gap-3 opacity-80">
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-[var(--surface-2)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {status}
        </span>
      </div>
      {actionLabel && (
        <button
          type="button"
          disabled
          className="mt-4 min-h-10 w-full rounded-[var(--radius-small)] border border-border bg-white/[0.035] px-4 py-2 text-sm font-semibold text-muted-foreground opacity-50"
        >
          {actionLabel}
        </button>
      )}
    </Card>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header flex items-center justify-between mt-5 mb-2 px-1">
      <h3 className="section-header__title font-semibold">{title}</h3>
      {action}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("chart-shell", className)}>
      <header className="chart-shell__header">
        <div className="min-w-0">
          <h3 className="chart-shell__title">{title}</h3>
          {subtitle && <p className="chart-shell__subtitle mt-1">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function TrendChip({
  value,
  direction = "flat",
}: {
  value: string;
  direction?: "up" | "down" | "flat";
}) {
  return (
    <span className="trend-chip" data-trend={direction}>
      {direction === "up" ? "↗" : direction === "down" ? "↘" : "—"} {value}
    </span>
  );
}

export function ScoreCard({
  label,
  value,
  status,
  description,
  visual,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  status?: string;
  description?: string;
  visual?: ReactNode;
  trend?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("metric-shell p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">{label}</span>
          <div className="mt-1 flex items-end gap-2">
            <strong className="text-[length:var(--type-stat)] leading-none tabular-nums">
              {value}
            </strong>
            {status && (
              <span className="pb-1 text-xs font-semibold text-[var(--text-secondary)]">
                {status}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              {description}
            </p>
          )}
          {trend && <div className="mt-3">{trend}</div>}
        </div>
        {visual && <div className="shrink-0">{visual}</div>}
      </div>
    </Card>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="premium-card p-4" aria-label="Loading" aria-busy="true">
      <div className="skeleton h-3 w-24 rounded-full" />
      <div className="skeleton mt-4 h-8 w-32 rounded-lg" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className="skeleton h-2.5 rounded-full"
            style={{ width: `${88 - index * 13}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="warning-shell border-red-500/25 p-5 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-300">
        !
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
