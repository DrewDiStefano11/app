import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultState, type AppState } from "./types";
import { buildDemoState } from "./demo-data";

const KEY = "fitcore.v1";

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as AppState;
    return { ...defaultState, ...parsed, profile: { ...defaultState.profile, ...parsed.profile } };
  } catch {
    return defaultState;
  }
}

function save(state: AppState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
}

type Updater = (s: AppState) => AppState;

interface Ctx {
  state: AppState;
  /** Effective state: merges demo data when demoMode is true. Real data is never overwritten. */
  view: AppState;
  set: (u: Updater) => void;
  reset: () => void;
  exportJson: () => string;
  importJson: (text: string) => boolean;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  const set = useCallback((u: Updater) => setState(s => u(s)), []);
  const reset = useCallback(() => setState(defaultState), []);
  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);
  const importJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text) as AppState;
      setState({ ...defaultState, ...parsed });
      return true;
    } catch { return false; }
  }, []);

  const view = useMemo(() => state.demoMode ? buildDemoState(state) : state, [state]);

  const value = useMemo(() => ({ state, view, set, reset, exportJson, importJson }), [state, view, set, reset, exportJson, importJson]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const e1RM = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

export function todayStart() {
  const d = new Date(); d.setHours(0,0,0,0); return d.getTime();
}

export function isToday(ts: number) {
  return ts >= todayStart();
}
