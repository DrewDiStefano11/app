import React from "react";
import { cn } from "@/lib/utils";

export interface PreferenceCardProps {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  control?: React.ReactNode;
  footer?: React.ReactNode;
  disabled?: boolean;
  planned?: boolean;
  tone?: "default" | "warning" | "danger" | "info";
  className?: string;
}

export function PreferenceCard({
  title,
  description,
  badge,
  control,
  footer,
  disabled,
  planned,
  tone = "default",
  className,
}: PreferenceCardProps) {
  return (
    <div
      className={cn(
        "premium-card card-elev p-4 sm:p-[1.125rem]",
        "flex flex-col gap-4",
        // Status classes
        disabled && "opacity-50 pointer-events-none",
        planned && "border-dashed bg-transparent",

        // Tone classes
        tone === "warning" && "border-amber-500/50 bg-amber-500/10",
        tone === "danger" && "border-red-500/50 bg-red-500/10",
        tone === "info" && "border-blue-500/50 bg-blue-500/10",

        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "text-base font-semibold leading-none tracking-tight",
                tone === "warning" && "text-amber-600 dark:text-amber-500",
                tone === "danger" && "text-red-600 dark:text-red-500",
                tone === "info" && "text-blue-600 dark:text-blue-500",
                tone === "default" && "text-slate-900 dark:text-slate-100",
              )}
            >
              {title}
            </h3>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>

          {description && (
            <div
              className={cn(
                "text-sm",
                tone === "warning"
                  ? "text-amber-700/80 dark:text-amber-400/80"
                  : tone === "danger"
                    ? "text-red-700/80 dark:text-red-400/80"
                    : tone === "info"
                      ? "text-blue-700/80 dark:text-blue-400/80"
                      : "text-slate-500 dark:text-slate-400",
              )}
            >
              {description}
            </div>
          )}
        </div>

        {control && (
          <div className="flex-shrink-0 self-start sm:self-auto flex items-center justify-end w-full sm:w-auto">
            {control}
          </div>
        )}
      </div>

      {footer && (
        <div
          className={cn(
            "text-sm pt-3 border-t",
            tone === "warning"
              ? "border-amber-500/20"
              : tone === "danger"
                ? "border-red-500/20"
                : tone === "info"
                  ? "border-blue-500/20"
                  : "border-slate-200 dark:border-slate-800",
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
