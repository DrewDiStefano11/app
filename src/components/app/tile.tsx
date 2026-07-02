import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tile({
  children,
  className,
  hero,
  onClick,
  accent,
  style,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  hero?: boolean;
  onClick?: () => void;
  accent?: boolean;
  style?: React.CSSProperties;
  delay?: number;
}) {
  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${delay}ms`, ...style }}
      className={cn(
        "premium-card tile p-4 sm:p-[1.125rem] animate-tile-in",
        hero && "tile-hero",
        accent && "glow-section",
        onClick && "press cursor-pointer transition-[transform,border-color,opacity]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="eyebrow" style={color ? { color } : undefined}>
      {children}
    </span>
  );
}
