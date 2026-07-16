import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultState, defaultPersonalization, defaultJarvisSettings, type AppState, type Personalization } from "./types";
import { buildDemoState } from "./demo-data";
import { loadFitCoreData, migrateFitCoreDataIfNeeded, parseFitCoreImport, saveFitCoreData } from "./fitcore-data";

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    return migrateAppState(loadFitCoreData(defaultState));
  } catch {
    return defaultState;
  }
}

/** Merge partial saved state with defaults so nested objects don't get blown away. */
function migrateAppState(parsed: Partial<AppState>, base: AppState = defaultState): AppState {
  const personalization: Personalization = {
    ...defaultPersonalization,
    ...base.personalization,
    ...(parsed.personalization ?? {}),
    units: { ...defaultPersonalization.units!, ...base.personalization.units, ...(parsed.personalization?.units ?? {}) },
    reminders: { ...defaultPersonalization.reminders!, ...base.personalization.reminders, ...(parsed.personalization?.reminders ?? {}) },
    defaultGraphModes: { ...defaultPersonalization.defaultGraphModes!, ...base.personalization.defaultGraphModes, ...(parsed.personalization?.defaultGraphModes ?? {}) },
  };
  return migrateFitCoreDataIfNeeded({
    ...defaultState,
    ...base,
    ...parsed,
    profile: { ...defaultState.profile, ...base.profile, ...(parsed.profile ?? {}) },
    nutritionTargets: { ...defaultState.nutritionTargets, ...base.nutritionTargets, ...(parsed.nutritionTargets ?? {}) },
    personalization,
    reminders: { ...defaultState.reminders, ...base.reminders, ...(parsed.reminders ?? {}) },
    jarvisSettings: { ...defaultJarvisSettings, ...base.jarvisSettings, ...(parsed.jarvisSettings ?? {}) },
  });
}

type Updater = (s: AppState) => AppState;

interface Ctx {
  state: AppState;
  /** True after persisted browser state has been loaded for this application boot. */
  hydrated: boolean;
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
  const set = useCallback((u: Updater) => setState(s => {
    const next = migrateFitCoreDataIfNeeded(u(s));
    saveFitCoreData(next);
    return next;
  }), []);
  const reset = useCallback(() => {
    const next = migrateFitCoreDataIfNeeded(defaultState);
    saveFitCoreData(next);
    setState(next);
  }, []);
  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);
  const importJson = useCallback((text: string) => {
    try {
      const parsed = parseFitCoreImport(text);
      if (!parsed) return false;
      setState(current => {
        const next = migrateAppState(parsed, current);
        saveFitCoreData(next);
        return next;
      });
      return true;
    } catch { return false; }
  }, []);

  const view = useMemo(() => state.demoMode ? migrateFitCoreDataIfNeeded(buildDemoState(state)) : state, [state]);

  const value = useMemo(
    () => ({ state, view, hydrated, set, reset, exportJson, importJson }),
    [state, view, hydrated, set, reset, exportJson, importJson],
  );
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
