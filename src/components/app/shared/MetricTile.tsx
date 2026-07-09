import React from "react";
import { Card } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  trend?: string;
  helperText?: string;
  tone?: "default" | "good" | "warning" | "danger" | "info";
  icon?: React.ReactNode;
  className?: string;
}

function getToneStyles(tone: MetricTileProps["tone"] = "default") {
  switch (tone) {
    case "good":
      return "text-green-600 dark:text-green-500";
    case "warning":
      return "text-yellow-600 dark:text-yellow-500";
    case "danger":
      return "text-red-600 dark:text-red-500";
    case "info":
      return "text-blue-600 dark:text-blue-500";
    case "default":
    default:
      return "text-foreground";
  }
}

export function MetricTile({
  label,
  value,
  unit,
  trend,
  helperText,
  tone = "default",
  icon,
  className,
}: MetricTileProps) {
  return (
    <Card className={cn("flex flex-col gap-2 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && <div className="text-muted-foreground flex-shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        <div
          className={cn("text-2xl sm:text-3xl font-semibold tracking-tight", getToneStyles(tone))}
        >
          {value}
        </div>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>

      {(trend || helperText) && (
        <div className="flex items-center gap-2 mt-auto pt-1 text-xs text-muted-foreground">
          {trend && (
            <span
              className={cn(
                "font-medium",
                trend.startsWith("+") || trend.toLowerCase().includes("up")
                  ? "text-green-600 dark:text-green-500"
                  : trend.startsWith("-") || trend.toLowerCase().includes("down")
                    ? "text-red-600 dark:text-red-500"
                    : "",
              )}
            >
              {trend}
            </span>
          )}
          {helperText && <span>{helperText}</span>}
        </div>
      )}
    </Card>
  );
}
