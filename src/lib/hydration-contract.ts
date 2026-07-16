import { migrateFitCoreDataIfNeeded } from "./fitcore-data";
import {
  defaultJarvisSettings,
  defaultPersonalization,
  defaultState,
  type AppState,
  type Personalization,
} from "./types";

export const FITCORE_SEED_REQUEST_KEY = "fitcore.e2e.seed.request";
export const FITCORE_SEED_APPLIED_KEY = "fitcore.e2e.seed.applied";

export function safeSessionStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

const ID_ARRAY_KEYS = [
  "workouts",
  "workoutTemplates",
  "customExercises",
  "cardioEntries",
  "mealEntries",
  "bodyweightEntries",
  "sleepEntries",
  "recoveryCheckIns",
  "recoverySignals",
  "prs",
  "goals",
  "progressPhotos",
  "aiMessages",
  "jarvisAudit",
  "supplementLogs",
] as const;

export type HydratedStoreIdentity = {
  version: number;
  onboardingComplete: boolean;
  demoMode: boolean;
  profileName: string;
  nutritionTargets: AppState["nutritionTargets"];
  activeWorkoutId: string | null;
  dismissedSuggestions: string[];
} & Record<(typeof ID_ARRAY_KEYS)[number], Array<string | null>>;

export function getHydratedStoreIdentity(state: AppState): HydratedStoreIdentity {
  const arrays = Object.fromEntries(
    ID_ARRAY_KEYS.map((key) => [key, state[key].map((entry) => entry?.id ?? null)]),
  ) as Pick<HydratedStoreIdentity, (typeof ID_ARRAY_KEYS)[number]>;
  return {
    version: state.version,
    onboardingComplete: state.onboardingComplete,
    demoMode: state.demoMode,
    profileName: state.profile.name ?? "",
    nutritionTargets: { ...state.nutritionTargets },
    activeWorkoutId: state.activeWorkout?.id ?? null,
    dismissedSuggestions: [...state.dismissedSuggestions],
    ...arrays,
  };
}

/** Canonicalize a partial persisted payload using the same defaults and migration as application boot. */
export function migrateFitCoreAppState(
  parsed: Partial<AppState>,
  base: AppState = defaultState,
): AppState {
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

export function hashHydratedStoreIdentity(identity: HydratedStoreIdentity): string {
  const input = JSON.stringify(identity);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function readAppliedSeedRequestId(): string | null {
  const requested = safeSessionStorageGet(FITCORE_SEED_REQUEST_KEY);
  const applied = safeSessionStorageGet(FITCORE_SEED_APPLIED_KEY);
  return requested && requested === applied ? requested : null;
}

declare global {
  interface Window {
    __FITCORE_HYDRATION__?: {
      phase: "react-committed";
      requestId: string | null;
      signature: string;
      identity: HydratedStoreIdentity;
      persisted: boolean;
    };
  }
}
