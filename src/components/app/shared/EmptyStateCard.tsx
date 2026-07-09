import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateCardProps {
  title: string;
  message?: React.ReactNode;
  icon?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  tone?: "default" | "info" | "warning" | "danger";
  className?: string;
}

export function EmptyStateCard({
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  tone = "default",
  className,
}: EmptyStateCardProps) {
  const getToneStyles = () => {
    switch (tone) {
      case "warning":
        return {
          color: "var(--warning)",
          background: "color-mix(in oklab, var(--warning) 15%, transparent)",
        };
      case "danger":
        return {
          color: "var(--danger)",
          background: "color-mix(in oklab, var(--danger) 15%, transparent)",
        };
      case "info":
        return {
          color: "var(--accent-primary)",
          background: "color-mix(in oklab, var(--accent-primary) 15%, transparent)",
        };
      case "default":
      default:
        return { color: "var(--section)", background: "var(--section-soft)" };
    }
  };

  return (
    <div
      className={cn(
        "premium-card empty-shell flex flex-col items-center text-center gap-4 py-8 px-6",
        className,
      )}
    >
      {icon && (
        <div className="empty-state-graphic" style={getToneStyles()}>
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">{title}</h3>
        {message && <div className="text-sm text-muted-foreground max-w-xs mx-auto">{message}</div>}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-3 mt-2">
          {secondaryAction && (
            <div className="w-full sm:w-auto order-2 sm:order-1">{secondaryAction}</div>
          )}
          {primaryAction && (
            <div className="w-full sm:w-auto order-1 sm:order-2">{primaryAction}</div>
          )}
        </div>
      )}
    </div>
  );
}
