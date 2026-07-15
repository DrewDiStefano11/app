import { useEffect, useState } from "react";
import {
  createFitCoreBrowserPersistenceDependencies,
  createFitCoreRuntimePersistenceController,
  type FitCoreRuntimePersistenceController,
} from "./runtime-persistence";

const EVENT = "fitcore.persist.change";
interface ChangeDetail {
  key: string;
  value: unknown;
}

/**
 * useState backed by localStorage, synced across component instances in the
 * same tab (via a custom event) and across tabs (via the storage event).
 * Use this for UI/graph preferences (mode toggles, range filters) that need
 * to stay in sync between a card preview and its popup.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(initial);

  // hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`fitcore.ui.${key}`);
      if (raw !== null) setVal(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
  }, [key]);

  // subscribe to in-tab broadcasts and cross-tab storage events
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ChangeDetail>).detail;
      if (detail?.key === key) setVal(detail.value as T);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === `fitcore.ui.${key}` && e.newValue) {
        try {
          setVal(JSON.parse(e.newValue) as T);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener(EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  const update = (next: T | ((p: T) => T)) => {
    setVal((prev) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        localStorage.setItem(`fitcore.ui.${key}`, JSON.stringify(value));
      } catch {
        /* quota */
      }
      try {
        window.dispatchEvent(new CustomEvent<ChangeDetail>(EVENT, { detail: { key, value } }));
      } catch {
        /* SSR */
      }
      return value;
    });
  };

  return [val, update];
}

/**
 * Centralized graph preference keys. Every card+popup pair for the same
 * graph must use the same key so toggling in the popup updates the card.
 */
export const GRAPH_PREFS = {
  heatmapMode: "heatmap.mode",
  volumeMode: "volume.mode",
  volumeRange: "volume.range",
  volumeCompare: "volume.compare",
  macroRange: "macro.range",
  macroView: "macro.view",
} as const;

let runtimeController: FitCoreRuntimePersistenceController | null = null;

/** Lazily creates the application-state controller without touching browser APIs at import time. */
export function getFitCoreRuntimePersistenceController(): FitCoreRuntimePersistenceController {
  runtimeController ??= createFitCoreRuntimePersistenceController(
    createFitCoreBrowserPersistenceDependencies(),
  );
  return runtimeController;
}
