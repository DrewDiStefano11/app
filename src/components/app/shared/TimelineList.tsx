import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineListItem {
  id: string;
  title: string;
  description?: ReactNode;
  timeLabel?: string;
  meta?: string;
  tone?: "default" | "good" | "warning" | "danger" | "info";
  icon?: ReactNode;
  action?: ReactNode;
}

export interface TimelineListProps {
  items: TimelineListItem[];
  emptyState?: ReactNode;
  className?: string;
}

export function TimelineList({ items, emptyState, className }: TimelineListProps) {
  if (items.length === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-muted-foreground", className)}>
        {emptyState ?? "No items to display"}
      </div>
    );
  }

  return (
    <div className={cn("relative space-y-6", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="relative flex gap-4">
            {/* Timeline Line */}
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-border" />
            )}

            {/* Icon / Dot */}
            <div
              className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm",
              )}
            >
              {item.icon ? (
                item.icon
              ) : (
                <div
                  className={cn("h-3 w-3 rounded-full", {
                    "bg-muted-foreground/30": !item.tone || item.tone === "default",
                    "bg-green-500": item.tone === "good",
                    "bg-yellow-500": item.tone === "warning",
                    "bg-destructive": item.tone === "danger",
                    "bg-blue-500": item.tone === "info",
                  })}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col pt-1.5 pb-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{item.title}</span>
                  {item.timeLabel && (
                    <span className="text-xs text-muted-foreground">{item.timeLabel}</span>
                  )}
                </div>
                {(item.meta || item.action) && (
                  <div className="flex items-center gap-2 text-right">
                    {item.meta && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.meta}
                      </span>
                    )}
                    {item.action && <div>{item.action}</div>}
                  </div>
                )}
              </div>
              {item.description && (
                <div className="mt-1.5 text-sm text-muted-foreground">{item.description}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
