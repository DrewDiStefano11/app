import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LayoutMode = "daily" | "deepDive";
export type TabAccent = "today" | "training" | "nutrition" | "recovery" | "insights";

function getAccentColor(accent?: TabAccent) {
  switch (accent) {
    case "today":
      return "var(--accent-today, #9333ea)"; // purple
    case "training":
      return "var(--accent-training, #06b6d4)"; // blue/cyan
    case "nutrition":
      return "var(--accent-nutrition, #ef4444)"; // red
    case "recovery":
      return "var(--accent-recovery, #22c55e)"; // green
    case "insights":
      return "var(--accent-insights, #0ea5e9)"; // teal/electric blue
    default:
      return "var(--section, #ffffff1a)";
  }
}

export function TabPageShell({
  title,
  subtitle,
  actions,
  mode = "daily",
  accent,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  mode?: LayoutMode;
  accent?: TabAccent;
  children: ReactNode;
  className?: string;
}) {
  const isDeepDive = mode === "deepDive";
  const accentColor = getAccentColor(accent);

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground pb-[100px]",
        isDeepDive ? "px-4 pt-4" : "px-5 pt-6",
        className,
      )}
    >
      <header className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              textShadow: isDeepDive ? `0 0 10px ${accentColor}40` : "none",
            }}
          >
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <main className={cn("flex flex-col", isDeepDive ? "gap-4" : "gap-6")}>{children}</main>
    </div>
  );
}

export function DeepDiveSection({
  heading,
  description,
  accent,
  isCollapsed,
  onToggleCollapse,
  children,
  isEmpty,
  emptyState,
  className,
}: {
  heading: string;
  description?: string;
  accent?: TabAccent;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  children: ReactNode;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  className?: string;
}) {
  const accentColor = getAccentColor(accent);

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <header
        className="flex items-center justify-between px-1 cursor-pointer"
        onClick={onToggleCollapse}
        role={onToggleCollapse ? "button" : undefined}
      >
        <div>
          <h3
            className="text-lg font-semibold tracking-tight"
            style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: "8px" }}
          >
            {heading}
          </h3>
          {description && <p className="text-xs text-muted-foreground mt-1 ml-3">{description}</p>}
        </div>
        {onToggleCollapse && (
          <span className="text-muted-foreground text-sm">
            {isCollapsed ? "Expand" : "Collapse"}
          </span>
        )}
      </header>
      {!isCollapsed && (
        <div className="flex flex-col gap-3">{isEmpty && emptyState ? emptyState : children}</div>
      )}
    </section>
  );
}

export function TabHeroCard({
  title,
  primaryValue,
  secondaryText,
  explanation,
  factorChips,
  actionButton,
  statusBadge,
  accent,
  mode = "daily",
  className,
}: {
  title: string;
  primaryValue: string | number;
  secondaryText?: string;
  explanation?: string;
  factorChips?: ReactNode[];
  actionButton?: ReactNode;
  statusBadge?: ReactNode;
  accent?: TabAccent;
  mode?: LayoutMode;
  className?: string;
}) {
  const isDeepDive = mode === "deepDive";
  const accentColor = getAccentColor(accent);

  return (
    <div
      className={cn(
        "rounded-2xl p-5 flex flex-col gap-4 overflow-hidden relative",
        isDeepDive ? "bg-[var(--surface-3)]" : "bg-[var(--surface-2)]",
        className,
      )}
      style={{
        border: `1px solid ${isDeepDive ? accentColor : "var(--border)"}`,
        boxShadow: isDeepDive ? `0 4px 20px -5px ${accentColor}30` : undefined,
      }}
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl pointer-events-none"
        style={{ background: accentColor }}
      />

      <div className="flex justify-between items-start z-10 relative">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {statusBadge && <div>{statusBadge}</div>}
      </div>

      <div className="z-10 relative flex flex-col">
        <div className="flex items-baseline gap-2">
          <span
            className="text-5xl font-bold tracking-tight tabular-nums"
            style={{ color: isDeepDive ? accentColor : undefined }}
          >
            {primaryValue}
          </span>
          {secondaryText && (
            <span className="text-lg text-muted-foreground font-medium">{secondaryText}</span>
          )}
        </div>
        {explanation && (
          <p className="text-sm mt-2 text-foreground/80 max-w-[90%]">{explanation}</p>
        )}
      </div>

      {factorChips && factorChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 z-10 relative">
          {factorChips.map((chip, i) => (
            <div key={i}>{chip}</div>
          ))}
        </div>
      )}

      {actionButton && <div className="mt-2 z-10 relative">{actionButton}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  trendIndicator,
  supportingText,
  icon,
  dataBadge,
  accent,
  isEmpty,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trendIndicator?: ReactNode;
  supportingText?: string;
  icon?: ReactNode;
  dataBadge?: ReactNode;
  accent?: TabAccent;
  isEmpty?: boolean;
  className?: string;
}) {
  const accentColor = getAccentColor(accent);

  return (
    <div
      className={cn(
        "bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2",
        className,
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon && (
            <span className="w-4 h-4 flex items-center justify-center opacity-70">{icon}</span>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        </div>
        {dataBadge && <div>{dataBadge}</div>}
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        {isEmpty ? (
          <span className="text-2xl font-bold text-muted-foreground/50">--</span>
        ) : (
          <>
            <span className="text-2xl font-bold tracking-tight tabular-nums">{value}</span>
            {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
          </>
        )}
      </div>

      {(trendIndicator || supportingText) && (
        <div className="flex items-center gap-2 mt-1">
          {trendIndicator && <div>{trendIndicator}</div>}
          {supportingText && (
            <span className="text-xs text-muted-foreground">{supportingText}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function HorizontalSubtabBar({
  tabs,
  activeTabId,
  onTabChange,
  accent,
  className,
}: {
  tabs: { id: string; label: string; icon?: ReactNode }[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  accent?: TabAccent;
  className?: string;
}) {
  const accentColor = getAccentColor(accent);

  return (
    <div
      className={cn("flex gap-2 overflow-x-auto no-scrollbar py-2 px-1", className)}
      role="tablist"
      aria-label="Sub navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all duration-200 border",
              isActive
                ? "bg-[var(--surface-3)] text-foreground"
                : "bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)] border-[var(--border)]",
            )}
            style={{
              borderColor: isActive ? accentColor : undefined,
              boxShadow: isActive ? `0 2px 10px -2px ${accentColor}20` : undefined,
            }}
          >
            {tab.icon && (
              <span className={cn("w-4 h-4", isActive ? "" : "opacity-60")}>{tab.icon}</span>
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TrendCard({
  title,
  summary,
  timeframeLabel,
  trendDirection,
  mode = "daily",
  accent,
  hasData = true,
  onClick,
  className,
}: {
  title: string;
  summary: string;
  timeframeLabel: string;
  trendDirection?: "up" | "down" | "flat";
  mode?: LayoutMode;
  accent?: TabAccent;
  hasData?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const isDeepDive = mode === "deepDive";
  const accentColor = getAccentColor(accent);

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3",
        onClick &&
          "cursor-pointer hover:bg-[var(--surface-3)] transition-colors active:scale-[0.98]",
        className,
      )}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-[var(--surface-3)] px-2 py-0.5 rounded text-nowrap">
          {timeframeLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight">{summary}</span>
        {trendDirection && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1",
              trendDirection === "up"
                ? "text-emerald-400 bg-emerald-400/10"
                : trendDirection === "down"
                  ? "text-rose-400 bg-rose-400/10"
                  : "text-muted-foreground bg-muted/20",
            )}
          >
            {trendDirection === "up" ? "↗" : trendDirection === "down" ? "↘" : "→"}
          </span>
        )}
      </div>

      <div className="h-12 w-full mt-1 relative flex items-center justify-center rounded-lg bg-[var(--surface-1)] border border-[var(--border)] overflow-hidden">
        {!hasData ? (
          <span className="text-xs text-muted-foreground/50">No data available</span>
        ) : (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor} 50%, transparent)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function InsightCard({
  title,
  insightText,
  confidenceBadge,
  sourceBadge,
  explanationAction,
  actionButton,
  isLoading,
  isEmpty,
  className,
}: {
  title: string;
  insightText: string;
  confidenceBadge?: ReactNode;
  sourceBadge?: ReactNode;
  explanationAction?: ReactNode;
  actionButton?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3 animate-pulse",
          className,
        )}
      >
        <div className="h-4 bg-[var(--surface-3)] rounded w-1/3" />
        <div className="h-4 bg-[var(--surface-3)] rounded w-full" />
        <div className="h-4 bg-[var(--surface-3)] rounded w-5/6" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn(
          "bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2 items-center text-center justify-center min-h-[120px]",
          className,
        )}
      >
        <span className="text-muted-foreground text-sm">No insights available yet.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3",
        className,
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-insights, #0ea5e9)] shadow-[0_0_8px_var(--accent-insights)]" />
          {title}
        </h3>
        <div className="flex gap-1">
          {sourceBadge}
          {confidenceBadge}
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">{insightText}</p>

      {(explanationAction || actionButton) && (
        <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-[var(--border)]">
          {explanationAction ? explanationAction : <div />}
          {actionButton}
        </div>
      )}
    </div>
  );
}

export function ActionCard({
  title,
  description,
  actionLabel,
  icon,
  accent,
  isDisabled,
  isCompact,
  onClick,
  className,
}: {
  title: string;
  description?: string;
  actionLabel: string;
  icon?: ReactNode;
  accent?: TabAccent;
  isDisabled?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const accentColor = getAccentColor(accent);

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "text-left bg-[var(--surface-2)] border border-[var(--border)] rounded-xl transition-all w-full",
        !isDisabled && "hover:bg-[var(--surface-3)] active:scale-[0.98] cursor-pointer",
        isDisabled && "opacity-60 cursor-not-allowed grayscale",
        isCompact ? "p-3 flex items-center justify-between gap-3" : "p-4 flex flex-col gap-3",
        className,
      )}
    >
      {isCompact ? (
        <>
          <div className="flex items-center gap-3 overflow-hidden">
            {icon && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
              >
                {icon}
              </div>
            )}
            <span className="font-semibold text-sm truncate">{title}</span>
          </div>
          <span
            className="text-xs font-semibold uppercase tracking-wider shrink-0"
            style={{ color: accentColor }}
          >
            {actionLabel}
          </span>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {icon && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                >
                  {icon}
                </div>
              )}
              <div>
                <h3 className="font-semibold">{title}</h3>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
            </div>
          </div>
          <div
            className="w-full mt-2 py-2 rounded-lg text-center text-sm font-semibold transition-colors"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {actionLabel}
          </div>
        </>
      )}
    </button>
  );
}

export function MiniCard({
  label,
  value,
  unit,
  status,
  accent,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  status?: ReactNode;
  accent?: TabAccent;
  icon?: ReactNode;
  className?: string;
}) {
  const accentColor = accent ? getAccentColor(accent) : undefined;

  return (
    <div
      className={cn(
        "bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 flex flex-col gap-1.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {icon && (
            <span className="w-3.5 h-3.5 opacity-60" style={{ color: accentColor }}>
              {icon}
            </span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
        </div>
        {status && <div>{status}</div>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground font-medium">{unit}</span>}
      </div>
    </div>
  );
}

export function EmptyStateCard({
  title,
  message,
  actionLabel,
  icon,
  hint,
  onAction,
  className,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  icon?: ReactNode;
  hint?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--surface-2)] border border-dashed border-[var(--border-strong)] rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3",
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-muted-foreground/60 mb-1">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-semibold">{title}</h3>
        {message && (
          <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">{message}</p>
        )}
      </div>

      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}

      {hint && <p className="text-xs text-muted-foreground/70 mt-2">{hint}</p>}
    </div>
  );
}

export type SourceType =
  | "manual"
  | "ai"
  | "wearable"
  | "imported"
  | "calculated"
  | "corrected"
  | "missing"
  | "placeholder";

export function SourceBadge({ source, className }: { source: SourceType; className?: string }) {
  const getBadgeStyle = () => {
    switch (source) {
      case "ai":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "wearable":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "manual":
        return "bg-[var(--surface-3)] text-muted-foreground border-[var(--border)]";
      case "corrected":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "missing":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-[var(--surface-3)] text-muted-foreground border-transparent";
    }
  };

  const labels: Record<SourceType, string> = {
    manual: "Manual",
    ai: "AI Est",
    wearable: "Device",
    imported: "Import",
    calculated: "Calc",
    corrected: "Edited",
    missing: "Missing",
    placeholder: "Demo",
  };

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border whitespace-nowrap",
        getBadgeStyle(),
        className,
      )}
    >
      {labels[source]}
    </span>
  );
}

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export function ConfidenceBadge({
  level,
  className,
}: {
  level: ConfidenceLevel;
  className?: string;
}) {
  const getBadgeStyle = () => {
    switch (level) {
      case "high":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "low":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default:
        return "bg-[var(--surface-3)] text-muted-foreground border-[var(--border)]";
    }
  };

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border whitespace-nowrap flex items-center gap-1",
        getBadgeStyle(),
        className,
      )}
    >
      <span
        className={cn(
          "w-1 h-1 rounded-full",
          level === "high"
            ? "bg-emerald-400"
            : level === "medium"
              ? "bg-amber-400"
              : level === "low"
                ? "bg-rose-400"
                : "bg-muted-foreground",
        )}
      />
      {level} Conf
    </span>
  );
}

export type DataStatus =
  | "current"
  | "stale"
  | "missing"
  | "estimated"
  | "corrected"
  | "placeholder";

export function DataStatusBadge({ status, className }: { status: DataStatus; className?: string }) {
  const getBadgeStyle = () => {
    switch (status) {
      case "current":
        return "text-emerald-400 bg-emerald-400/10";
      case "stale":
        return "text-amber-400 bg-amber-400/10";
      case "missing":
        return "text-rose-400 bg-rose-400/10";
      case "estimated":
        return "text-purple-400 bg-purple-400/10";
      case "corrected":
        return "text-blue-400 bg-blue-400/10";
      case "placeholder":
        return "text-muted-foreground bg-[var(--surface-3)]";
    }
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
        getBadgeStyle(),
        className,
      )}
    >
      {status}
    </span>
  );
}
