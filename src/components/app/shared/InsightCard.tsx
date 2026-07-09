import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/app/ui";

export interface InsightCardProps {
  title: string;
  message: ReactNode;
  sourceLabel?: string;
  confidenceLabel?: string;
  tone?: "default" | "good" | "warning" | "danger" | "info";
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function InsightCard({
  title,
  message,
  sourceLabel,
  confidenceLabel,
  tone = "default",
  action,
  icon,
  className,
}: InsightCardProps) {
  const toneClasses = {
    default: "border-border/50",
    good: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    info: "border-blue-500/30 bg-blue-500/5",
  };

  return (
    <Card className={cn("flex flex-col gap-3", toneClasses[tone], className)}>
      <div className="flex items-start gap-3">
        {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base">{title}</h4>
          <div className="text-sm text-white/80 mt-1 leading-relaxed">
            {message}
          </div>
        </div>
      </div>

      {(sourceLabel || confidenceLabel) && (
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
          {sourceLabel && <span>{sourceLabel}</span>}
          {sourceLabel && confidenceLabel && <span>&middot;</span>}
          {confidenceLabel && <span>{confidenceLabel}</span>}
        </div>
      )}

      {action && (
        <div className="mt-1 pt-3 border-t border-white/10">
          {action}
        </div>
      )}
    </Card>
  );
}
