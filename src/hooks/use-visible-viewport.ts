import { useEffect, useState } from "react";

/** VisualViewport follows the iOS keyboard; dynamic CSS viewport units alone do not. */
export function useVisibleViewport(enabled: boolean) {
  const [viewport, setViewport] = useState<{ height: number; top: number }>();
  useEffect(() => {
    if (!enabled) return;
    const visual = window.visualViewport;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = {
          height: Math.round(visual?.height ?? window.innerHeight),
          top: Math.round(visual?.offsetTop ?? 0),
        };
        setViewport((previous) =>
          previous?.height === next.height && previous.top === next.top ? previous : next,
        );
      });
    };
    measure();
    visual?.addEventListener("resize", measure);
    visual?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", measure);
      visual?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [enabled]);
  return viewport;
}
