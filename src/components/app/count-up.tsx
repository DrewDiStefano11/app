import { useEffect, useRef, useState } from "react";

const MAX_DECIMALS = 20;
const FALLBACK = "—";

export function CountUp({
  value,
  duration = 900,
  delay = 0,
  decimals = 0,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  // Normalize value
  const isValueFinite = typeof value === "number" && Number.isFinite(value);
  const safeValue = isValueFinite ? value : null;

  // Normalize duration
  const isDurationFinite = typeof duration === "number" && Number.isFinite(duration);
  const safeDuration = isDurationFinite && duration > 0 ? duration : 0;

  // Normalize delay
  const isDelayFinite = typeof delay === "number" && Number.isFinite(delay);
  const safeDelay = isDelayFinite && delay > 0 ? delay : 0;

  // Normalize decimals
  let safeDecimals = 0;
  if (typeof decimals === "number" && Number.isFinite(decimals) && decimals > 0) {
    safeDecimals = Math.min(MAX_DECIMALS, Math.floor(decimals));
  }

  useEffect(() => {
    if (safeValue === null) return;

    let isReducedMotion = false;
    if (typeof window !== "undefined" && window.matchMedia) {
      isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    const startValue = displayRef.current;

    if (isReducedMotion || safeDuration === 0 || startValue === safeValue) {
      setDisplay(safeValue);
      displayRef.current = safeValue;
      return;
    }

    let raf = 0;
    let timer = 0;
    let startTime: number | null = null;

    const step = (t: number) => {
      if (startTime === null) startTime = t;
      const p = Math.min(1, Math.max(0, (t - startTime) / safeDuration));

      if (p >= 1) {
        setDisplay(safeValue);
        displayRef.current = safeValue;
      } else {
        const eased = 1 - Math.pow(1 - p, 3);
        const nextValue = startValue + (safeValue - startValue) * eased;
        setDisplay(nextValue);
        displayRef.current = nextValue;
        raf = requestAnimationFrame(step);
      }
    };

    if (safeDelay > 0) {
      timer = window.setTimeout(() => {
        raf = requestAnimationFrame(step);
      }, safeDelay);
    } else {
      raf = requestAnimationFrame(step);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [safeValue, safeDuration, safeDelay]);

  if (safeValue === null) {
    return <span className={`tabular-nums${className ? " " + className : ""}`}>{FALLBACK}</span>;
  }

  return (
    <span className={`tabular-nums${className ? " " + className : ""}`}>
      {safeDecimals === 0 ? Math.round(display).toLocaleString() : display.toFixed(safeDecimals)}
    </span>
  );
}
