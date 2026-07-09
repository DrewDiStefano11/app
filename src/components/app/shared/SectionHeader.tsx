import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="flex flex-col">
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </span>
        )}
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
