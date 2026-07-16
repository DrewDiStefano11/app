import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultState,
  defaultPersonalization,
  defaultJarvisSettings,
  type AppState,
  type Personalization,
} from "./types";
import { buildDemoState } from "./demo-data";
import {
  loadFitCoreData,
  migrateFitCoreDataIfNeeded,
  parseFitCoreImport,
  saveFitCoreData,
} from "./fitcore-data";
import {
  getHydratedStoreIdentity,
  hashHydratedStoreIdentity,
  readAppliedSeedRequestId,
} from "./hydration-contract";

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
    units: {
      ...defaultPersonalization.units!,
      ...base.personalization.units,
      ...(parsed.personalization?.units ?? {}),
    },
    reminders: {
      ...defaultPersonalization.reminders!,
      ...base.personalization.reminders,
      ...(parsed.personalization?.reminders ?? {}),
    },
    defaultGraphModes: {
      ...defaultPersonalization.defaultGraphModes!,
      ...base.personalization.defaultGraphModes,
      ...(parsed.personalization?.defaultGraphModes ?? {}),
    },
  };
  return migrateFitCoreDataIfNeeded({
    ...defaultState,
    ...base,
    ...parsed,
    profile: { ...defaultState.profile, ...base.profile, ...(parsed.profile ?? {}) },
    nutritionTargets: {
      ...defaultState.nutritionTargets,
      ...base.nutritionTargets,
      ...(parsed.nutritionTargets ?? {}),
    },
    personalization,
    reminders: { ...defaultState.reminders, ...base.reminders, ...(parsed.reminders ?? {}) },
    jarvisSettings: {
      ...defaultJarvisSettings,
      ...base.jarvisSettings,
      ...(parsed.jarvisSettings ?? {}),
    },
  });
}

type Updater = (s: AppState) => AppState;

interface Ctx {
  state: AppState;
  /** True after persisted browser state has been loaded for this application boot. */
  hydrated: boolean;
  hydrationRequestId: string | null;
  hydrationSignature: string | null;
  /** Effective state: merges demo data when demoMode is true. Real data is never overwritten. */
  view: AppState;
  set: (u: Updater) => void;
  reset: () => void;
  exportJson: () => string;
  importJson: (text: string) => boolean;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState({
    state: defaultState,
    hydrated: false,
    hydrationRequestId: null as string | null,
  });
  const { state, hydrated, hydrationRequestId } = snapshot;

  useEffect(() => {
    const loaded = load();
    const requestId = readAppliedSeedRequestId();
    setSnapshot({
      state: loaded,
      hydrated: true,
      hydrationRequestId: requestId,
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const identity = getHydratedStoreIdentity(state);
    const signature = hashHydratedStoreIdentity(identity);
    const persisted = saveFitCoreData(state);
    window.__FITCORE_HYDRATION__ = {
      phase: "react-committed",
      requestId: hydrationRequestId,
      signature,
      identity,
      persisted,
    };
    window.dispatchEvent(
      new CustomEvent("fitcore:hydrated-store", {
        detail: { requestId: hydrationRequestId, signature },
      }),
    );
  }, [state, hydrated, hydrationRequestId]);

  // Every manual and Jarvis mutation passes through this boundary. Normalizing
  // here keeps all screens, summaries, history, and recovery signals connected.
  const set = useCallback(
    (u: Updater) =>
      setSnapshot((current) => {
        const next = migrateFitCoreDataIfNeeded(u(current.state));
        saveFitCoreData(next);
        return { ...current, state: next };
      }),
    [],
  );
  const reset = useCallback(() => {
    const next = migrateFitCoreDataIfNeeded(defaultState);
    saveFitCoreData(next);
    setSnapshot((current) => ({ ...current, state: next }));
  }, []);
  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);
  const importJson = useCallback((text: string) => {
    try {
      const parsed = parseFitCoreImport(text);
      if (!parsed) return false;
      setSnapshot((current) => {
        const next = migrateAppState(parsed, current.state);
        saveFitCoreData(next);
        return { ...current, state: next };
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const view = useMemo(
    () => (state.demoMode ? migrateFitCoreDataIfNeeded(buildDemoState(state)) : state),
    [state],
  );
  const hydrationSignature = useMemo(
    () => (hydrated ? hashHydratedStoreIdentity(getHydratedStoreIdentity(state)) : null),
    [state, hydrated],
  );

  const value = useMemo(
    () => ({
      state,
      view,
      hydrated,
      hydrationRequestId,
      hydrationSignature,
      set,
      reset,
      exportJson,
      importJson,
    }),
    [
      state,
      view,
      hydrated,
      hydrationRequestId,
      hydrationSignature,
      set,
      reset,
      exportJson,
      importJson,
    ],
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
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isToday(ts: number) {
  return ts >= todayStart();
}
