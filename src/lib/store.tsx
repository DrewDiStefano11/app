import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultState, defaultPersonalization, defaultJarvisSettings, type AppState, type Personalization } from "./types";
import { buildDemoState } from "./demo-data";
import { loadFitCoreData, migrateFitCoreDataIfNeeded, saveFitCoreData } from "./fitcore-data";

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    return migrate(loadFitCoreData(defaultState));
  } catch {
    return defaultState;
  }
}

/** Merge partial saved state with defaults so nested objects don't get blown away. */
function migrate(parsed: Partial<AppState>): AppState {
  const personalization: Personalization = {
    ...defaultPersonalization,
    ...(parsed.personalization ?? {}),
    units: { ...defaultPersonalization.units!, ...(parsed.personalization?.units ?? {}) },
    reminders: { ...defaultPersonalization.reminders!, ...(parsed.personalization?.reminders ?? {}) },
    defaultGraphModes: { ...defaultPersonalization.defaultGraphModes!, ...(parsed.personalization?.defaultGraphModes ?? {}) },
  };
  return migrateFitCoreDataIfNeeded({
    ...defaultState,
    ...parsed,
    profile: { ...defaultState.profile, ...(parsed.profile ?? {}) },
    nutritionTargets: { ...defaultState.nutritionTargets, ...(parsed.nutritionTargets ?? {}) },
    personalization,
    reminders: { ...defaultState.reminders, ...(parsed.reminders ?? {}) },
    jarvisSettings: { ...defaultJarvisSettings, ...(parsed.jarvisSettings ?? {}) },
    jarvisAudit: parsed.jarvisAudit ?? [],
    jarvisLearning: parsed.jarvisLearning ?? {},
    userGoalsProfile: parsed.userGoalsProfile ?? {},
    supplementLogs: parsed.supplementLogs ?? [],
    dismissedSuggestions: parsed.dismissedSuggestions ?? [],
  });
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
    if (hydrated) saveFitCoreData(state);
  }, [state, hydrated]);

  // Every manual and Jarvis mutation passes through this boundary. Normalizing
  // here keeps all screens, summaries, history, and recovery signals connected.
  const set = useCallback((u: Updater) => setState(s => migrateFitCoreDataIfNeeded(u(s))), []);
  const reset = useCallback(() => setState(migrateFitCoreDataIfNeeded(defaultState)), []);
  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);
  const importJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text) as Partial<AppState>;
      setState(migrate(parsed));
      return true;
    } catch { return false; }
  }, []);

  const view = useMemo(() => state.demoMode ? migrateFitCoreDataIfNeeded(buildDemoState(state)) : state, [state]);

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
