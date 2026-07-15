import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { migrateFitCoreDataIfNeeded, parseFitCoreImport } from "./fitcore-data";
import { getFitCoreRuntimePersistenceController } from "./persist";
import type {
  FitCoreRuntimeCommitResult,
  FitCoreRuntimeHydrationResult,
  FitCoreRuntimePersistenceController,
  FitCoreRuntimePersistenceStatus,
} from "./runtime-persistence";

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
  /** Effective state: merges demo data when demoMode is true. Real data is never overwritten. */
  view: AppState;
  set: (u: Updater) => void;
  reset: () => void;
  exportJson: () => string;
  importJson: (text: string) => boolean;
  persistenceStatus: FitCoreRuntimePersistenceStatus;
  persistenceRequiresReview: boolean;
  persistenceRequiresReload: boolean;
}

export interface StorePersistenceMetadata {
  readonly persistenceStatus: FitCoreRuntimePersistenceStatus;
  readonly persistenceRequiresReview: boolean;
  readonly persistenceRequiresReload: boolean;
}

export interface StoreRuntimePersistenceOutcome {
  readonly state: AppState;
  readonly metadata: StorePersistenceMetadata;
  readonly applied: boolean;
}

function persistenceMetadata(
  result: FitCoreRuntimeHydrationResult | FitCoreRuntimeCommitResult,
): StorePersistenceMetadata {
  return Object.freeze({
    persistenceStatus: result.status,
    persistenceRequiresReview: result.requiresReview,
    persistenceRequiresReload: result.requiresReload,
  });
}

function verifiedState(
  result: FitCoreRuntimeHydrationResult | FitCoreRuntimeCommitResult,
): AppState | null {
  return result.safeToApply && result.state !== null ? (result.state as unknown as AppState) : null;
}

export function hydrateFitCoreStoreRuntime(
  controller: FitCoreRuntimePersistenceController,
  fallback: AppState,
): StoreRuntimePersistenceOutcome {
  const result = controller.hydrate();
  const state = verifiedState(result);
  return Object.freeze({
    state: state ?? fallback,
    metadata: persistenceMetadata(result),
    applied: state !== null,
  });
}

export function commitFitCoreStoreRuntime(
  controller: FitCoreRuntimePersistenceController,
  previous: AppState,
  proposed: AppState,
): StoreRuntimePersistenceOutcome {
  const result = controller.commit(proposed);
  const state = verifiedState(result);
  return Object.freeze({
    state: state ?? previous,
    metadata: persistenceMetadata(result),
    applied: state !== null,
  });
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const stateRef = useRef<AppState>(defaultState);
  const controllerRef = useRef<FitCoreRuntimePersistenceController | null>(null);
  controllerRef.current ??= getFitCoreRuntimePersistenceController();
  const [persistence, setPersistence] = useState<StorePersistenceMetadata>(() => {
    const initial = controllerRef.current!.getRuntimeStatus();
    return Object.freeze({
      persistenceStatus: initial.status,
      persistenceRequiresReview: initial.requiresReview,
      persistenceRequiresReload: initial.requiresReload,
    });
  });

  useEffect(() => {
    const outcome = hydrateFitCoreStoreRuntime(controllerRef.current!, defaultState);
    stateRef.current = outcome.state;
    setState(outcome.state);
    setPersistence(outcome.metadata);
  }, []);

  const apply = useCallback((createNext: Updater) => {
    const previous = stateRef.current;
    const proposed = migrateFitCoreDataIfNeeded(createNext(previous));
    const outcome = commitFitCoreStoreRuntime(controllerRef.current!, previous, proposed);
    setPersistence(outcome.metadata);
    if (outcome.applied) {
      stateRef.current = outcome.state;
      setState(outcome.state);
    }
    return outcome.applied;
  }, []);

  // Every manual and Jarvis mutation passes through this boundary. Normalizing
  // here keeps all screens, summaries, history, and recovery signals connected.
  const set = useCallback(
    (u: Updater) => {
      apply(u);
    },
    [apply],
  );
  const reset = useCallback(() => {
    apply(() => defaultState);
  }, [apply]);
  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);
  const importJson = useCallback(
    (text: string) => {
      try {
        const parsed = parseFitCoreImport(text);
        if (!parsed) return false;
        return apply((current) => migrateAppState(parsed, current));
      } catch {
        return false;
      }
    },
    [apply],
  );

  const view = useMemo(
    () => (state.demoMode ? migrateFitCoreDataIfNeeded(buildDemoState(state)) : state),
    [state],
  );

  const value = useMemo(
    () => ({ state, view, set, reset, exportJson, importJson, ...persistence }),
    [state, view, set, reset, exportJson, importJson, persistence],
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
