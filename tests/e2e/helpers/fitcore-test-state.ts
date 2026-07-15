import { expect, type Page } from "@playwright/test";

import {
  FITCORE_ATOMIC_PERSISTENCE_KEYS,
  type FitCoreAtomicPersistenceAdapter,
} from "../../../src/lib/atomic-persistence";
import {
  FITCORE_REVISION_STORAGE_KEY,
  persistFitCoreStateWithRevision,
} from "../../../src/lib/revisioned-persistence";
import { validateFitCoreDataIntegrity } from "../../../src/lib/data-integrity";
import { readFitCoreStoreTransactionSnapshot } from "../../../src/lib/store-transaction";
import {
  defaultJarvisSettings,
  defaultPersonalization,
  defaultState,
  type AppState,
  type Personalization,
} from "../../../src/lib/types";

/** The historical pre-Task 8 key. Use only in tests that intentionally exercise legacy migration. */
export const FITCORE_STORAGE_KEY = "fitcore.v1";
export const FITCORE_DATA_VERSION = 4;

const TEST_EXPORTED_AT = "2026-07-14T12:00:00.000Z";
const TEST_WRITE_TOKEN = "0123456789abcdef0123456789abcdef";
const REVISIONED_KEYS = [
  FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
  FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA,
  FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB,
  FITCORE_REVISION_STORAGE_KEY,
] as const;

class MemoryAdapter implements FitCoreAtomicPersistenceAdapter {
  readonly data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

export const FITCORE_MOBILE_VIEWPORTS = {
  iphoneModern: { width: 390, height: 844 },
  iphoneClassic: { width: 375, height: 812 },
  smallAndroid: { width: 360, height: 800 },
};

type CurrentFitCoreStateOverrides = Omit<
  Partial<AppState>,
  "profile" | "nutritionTargets" | "personalization" | "reminders" | "jarvisSettings"
> & {
  profile?: Partial<AppState["profile"]>;
  nutritionTargets?: Partial<AppState["nutritionTargets"]>;
  personalization?: Omit<Partial<Personalization>, "units" | "reminders" | "defaultGraphModes"> & {
    units?: Partial<Personalization["units"]>;
    reminders?: Partial<Personalization["reminders"]>;
    defaultGraphModes?: Partial<Personalization["defaultGraphModes"]>;
  };
  reminders?: Partial<AppState["reminders"]>;
  jarvisSettings?: Partial<AppState["jarvisSettings"]>;
};

/** Completes a current-state fixture from canonical defaults without truthiness coercion. */
export function currentFitCoreState(overrides: CurrentFitCoreStateOverrides = {}): AppState {
  const base = structuredClone(defaultState);
  const personalization = (overrides.personalization ?? {}) as Partial<Personalization>;
  return {
    ...base,
    ...overrides,
    profile: { ...base.profile, ...(overrides.profile ?? {}) },
    nutritionTargets: { ...base.nutritionTargets, ...(overrides.nutritionTargets ?? {}) },
    personalization: {
      ...defaultPersonalization,
      ...personalization,
      units: { ...defaultPersonalization.units, ...(personalization.units ?? {}) },
      reminders: { ...defaultPersonalization.reminders, ...(personalization.reminders ?? {}) },
      defaultGraphModes: {
        ...defaultPersonalization.defaultGraphModes,
        ...(personalization.defaultGraphModes ?? {}),
      },
    },
    reminders: { ...base.reminders, ...(overrides.reminders ?? {}) },
    jarvisSettings: { ...defaultJarvisSettings, ...(overrides.jarvisSettings ?? {}) },
  };
}

/** Intentionally seeds the historical legacy key for migration-specific coverage. */
export async function seedFitCoreAppState(page: Page, state: Record<string, unknown>) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: FITCORE_STORAGE_KEY, value: state },
  );
}

/** Seeds a strictly valid authoritative revisioned snapshot without a repeating init script. */
export async function seedRevisionedFitCoreState(page: Page, state: AppState) {
  const integrity = validateFitCoreDataIntegrity(state);
  if (integrity.status === "invalid") {
    const errors = integrity.issues
      .filter(({ severity }) => severity === "error")
      .map(({ code, path }) => `${code}:${path}`)
      .join(", ");
    throw new Error(`Unable to seed invalid authoritative FitCore state: ${errors}`);
  }
  const adapter = new MemoryAdapter();
  const result = persistFitCoreStateWithRevision(adapter, state, {
    expectedRevision: null,
    exportedAt: TEST_EXPORTED_AT,
    writeToken: TEST_WRITE_TOKEN,
  });
  if (result.status !== "committed" && result.status !== "committed_with_warnings") {
    throw new Error(`Unable to seed authoritative FitCore state: ${result.status}`);
  }
  await page.addInitScript(
    ({ entries, revisionKey }) => {
      if (window.localStorage.getItem(revisionKey) !== null) return;
      window.localStorage.clear();
      for (const [key, value] of entries) window.localStorage.setItem(key, value);
    },
    { entries: [...adapter.data.entries()], revisionKey: FITCORE_REVISION_STORAGE_KEY },
  );
  await page.goto("/");
  await page.reload();
}

/** Reads only authoritative revisioned state and fails clearly when it is unavailable. */
export async function readPersistedFitCoreState(page: Page): Promise<AppState> {
  const values = await page.evaluate(
    (keys) => keys.map((key) => [key, window.localStorage.getItem(key)] as const),
    REVISIONED_KEYS,
  );
  const adapter = new MemoryAdapter();
  for (const [key, value] of values) if (value !== null) adapter.data.set(key, value);
  const result = readFitCoreStoreTransactionSnapshot(adapter);
  if (
    (result.status !== "ready" && result.status !== "ready_with_warnings") ||
    result.snapshot === null
  ) {
    throw new Error(`Authoritative FitCore state is unavailable: ${result.status}`);
  }
  return result.snapshot.state as unknown as AppState;
}

/** Seeds a minimal current onboarded state for ordinary feature tests. */
export async function seedMinimalOnboardedState(page: Page) {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      profile: {
        ...defaultState.profile,
        goal: "hypertrophy",
        experience: "intermediate",
        daysPerWeek: 5,
        split: "Push / Pull / Legs",
        bodyweightLb: 180,
        targetBodyweightLb: 185,
        units: "lb",
      },
      workouts: [],
      activeWorkout: null,
      mealEntries: [],
      bodyweightEntries: [],
      goals: [
        {
          id: "g1",
          type: "weekly_workouts",
          label: "Train 5x per week",
          target: 5,
          current: 0,
        },
      ],
    }),
  );
}

export async function gotoDashboard(page: Page) {
  await page.goto("/");
  await expectDashboardReady(page);
}

export async function expectDashboardReady(page: Page) {
  await expect(
    page
      .getByText("FitCore Today", { exact: true })
      .or(page.getByText("FitCore Score", { exact: true })),
  ).toBeVisible({ timeout: 10000 });
}

export async function setMobileViewport(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
}
