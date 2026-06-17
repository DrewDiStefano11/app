import { useEffect, useState } from "react";

/** useState backed by localStorage. Defaults safely on SSR. */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`fitcore.ui.${key}`);
      if (raw !== null) setVal(JSON.parse(raw) as T);
    } catch { /* ignore */ }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(`fitcore.ui.${key}`, JSON.stringify(val)); } catch { /* quota */ }
  }, [key, val, hydrated]);

  return [val, setVal];
}
