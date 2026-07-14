import { ChevronDown, CircleAlert, Clock3, Database, RefreshCw, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FitCoreSection =
  | "home"
  | "training"
  | "nutrition"
  | "recovery"
  | "progress"
  | "utility";
export type QualityState =
  | "ready"
  | "partial"
  | "needs_more_data"
  | "stale"
  | "unsupported"
  | "unavailable";

export interface DataQualityDetails {
  state: QualityState;
  confidence?: "high" | "medium" | "low" | "unknown";
  completeness?: number;
  sampleSize?: number;
  sourceCount?: number;
  exclusionCount?: number;
  requiredHistory?: number;
  reason?: string;
}

const qualityCopy: Record<QualityState, { label: string; tone: string; icon: typeof Database }> = {
  ready: { label: "Ready", tone: "success", icon: Database },
  partial: { label: "Partial data", tone: "caution", icon: CircleAlert },
  needs_more_data: { label: "Needs more data", tone: "info", icon: Clock3 },
  stale: { label: "Update needed", tone: "caution", icon: RefreshCw },
  unsupported: { label: "Not supported", tone: "neutral", icon: CircleAlert },
  unavailable: { label: "Unavailable", tone: "danger", icon: CircleAlert },
};

export function SectionTheme({
  section,
  children,
  className,
  ...props
}: {
  section: FitCoreSection;
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-section={section} className={className} {...props}>
      {children}
    </div>
  );
}

export function PremiumCard({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return <Tag className={cn("premium-foundation-card", className)}>{children}</Tag>;
}

export function HeroSurface({
  eyebrow,
  value,
  unit,
  status,
  supportingFact,
  action,
  children,
  className,
}: {
  eyebrow: string;
  value: ReactNode;
  unit?: string;
  status: string;
  supportingFact?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <PremiumCard className={cn("premium-hero-surface", className)} as="section">
      <div className="premium-hero-surface__ambient" aria-hidden="true" />
      <div className="relative z-10">
        <p className="eyebrow">{eyebrow}</p>
        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-[clamp(3.5rem,18vw,5.5rem)] leading-[0.82] tabular-nums">
            {value}
          </span>
          {unit && <span className="mb-1 text-sm font-semibold text-white/45">{unit}</span>}
        </div>
        <p className="mt-3 text-base font-semibold text-white">{status}</p>
        {supportingFact && (
          <p className="mt-1 max-w-sm text-sm leading-6 text-white/55">{supportingFact}</p>
        )}
        {children}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </PremiumCard>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "caution" | "danger" | "info" | "achievement" | "neutral";
}) {
  return (
    <span className="premium-status-badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function DataQualityBadge({
  quality,
  compact = false,
}: {
  quality: DataQualityDetails;
  compact?: boolean;
}) {
  const config = qualityCopy[quality.state];
  const Icon = config.icon;
  const detail =
    quality.state === "needs_more_data" && quality.requiredHistory
      ? `${quality.requiredHistory} more ${quality.requiredHistory === 1 ? "day" : "days"}`
      : quality.confidence && quality.confidence !== "unknown"
        ? `${quality.confidence} confidence`
        : undefined;
  return (
    <span
      className="premium-quality-badge"
      data-tone={config.tone}
      aria-label={`${config.label}${detail ? `, ${detail}` : ""}`}
    >
      <Icon size={13} aria-hidden="true" />
      <span>{config.label}</span>
      {!compact && detail && <span className="premium-quality-badge__detail">· {detail}</span>}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  detail,
  quality,
  icon,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: string;
  quality?: DataQualityDetails;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <PremiumCard className={cn("premium-metric-card", compact && "premium-metric-card--compact")}>
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {icon && <span className="text-[var(--section)]">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <strong className="font-display text-3xl font-normal tabular-nums">{value}</strong>
        {unit && <span className="text-xs font-semibold text-white/40">{unit}</span>}
      </div>
      {detail && <p className="mt-1 text-xs leading-5 text-white/45">{detail}</p>}
      {quality && (
        <div className="mt-3">
          <DataQualityBadge quality={quality} compact />
        </div>
      )}
    </PremiumCard>
  );
}

export const CompactMetricCard = (props: Omit<Parameters<typeof MetricCard>[0], "compact">) => (
  <MetricCard {...props} compact />
);

export function ExpandableMetricCard({
  label,
  value,
  summary,
  children,
  defaultExpanded = false,
}: {
  label: string;
  value: ReactNode;
  summary?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <PremiumCard className="overflow-hidden p-0">
      <button
        type="button"
        className="premium-expand-button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span>
          <span className="eyebrow block">{label}</span>
          <strong className="mt-2 block text-xl">{value}</strong>
          {summary && <span className="mt-1 block text-xs text-white/45">{summary}</span>}
        </span>
        <ChevronDown
          size={18}
          className={cn("transition-transform", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div className="border-t border-white/[0.07] p-4 text-sm text-white/60">{children}</div>
      )}
    </PremiumCard>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="premium-section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-white/45">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function InsightCard({
  title,
  children,
  source,
}: {
  title: string;
  children: ReactNode;
  source?: string;
}) {
  return (
    <PremiumCard className="premium-insight-card">
      <Sparkles size={18} className="text-[var(--section)]" aria-hidden="true" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <div className="mt-1 text-sm leading-6 text-white/55">{children}</div>
        {source && (
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">
            Source · {source}
          </p>
        )}
      </div>
    </PremiumCard>
  );
}

export function ActionCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <PremiumCard className="flex items-center justify-between gap-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-white/45">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </PremiumCard>
  );
}

function StateSurface({
  title,
  message,
  quality,
  action,
}: {
  title: string;
  message: string;
  quality: DataQualityDetails;
  action?: ReactNode;
}) {
  return (
    <PremiumCard className="premium-state-surface">
      <DataQualityBadge quality={quality} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-white/50">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </PremiumCard>
  );
}

export const EmptyState = ({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) => (
  <StateSurface
    title={title}
    message={message}
    action={action}
    quality={{ state: "unavailable" }}
  />
);
export const ErrorState = ({
  title = "This view could not load",
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) => (
  <StateSurface
    title={title}
    message={message}
    action={action}
    quality={{ state: "unavailable" }}
  />
);
export const StaleState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <StateSurface
    title="Your data needs an update"
    message={message}
    action={action}
    quality={{ state: "stale" }}
  />
);
export const UnsupportedState = ({ message }: { message: string }) => (
  <StateSurface
    title="This metric is not supported yet"
    message={message}
    quality={{ state: "unsupported" }}
  />
);
export const NeedsMoreDataState = ({
  message,
  requiredHistory,
}: {
  message: string;
  requiredHistory: number;
}) => (
  <StateSurface
    title="A clearer trend is taking shape"
    message={message}
    quality={{ state: "needs_more_data", requiredHistory }}
  />
);

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <PremiumCard className="space-y-3" aria-busy="true" aria-label="Loading analytics">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="premium-skeleton h-4 rounded-full"
          style={{ width: `${88 - index * 13}%` }}
        />
      ))}
    </PremiumCard>
  );
}
