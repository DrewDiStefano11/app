import { expect, type Page } from "@playwright/test";

import {
  FITCORE_ATOMIC_PERSISTENCE_KEYS,
  type FitCoreAtomicPersistenceAdapter,
} from "../../src/lib/atomic-persistence";
import { persistFitCoreStateWithRevision } from "../../src/lib/revisioned-persistence";
import type { AppState } from "../../src/lib/types";
import { currentFitCoreState } from "./helpers/fitcore-test-state";

export const REVISION_KEY = "fitcore.persistence.v1.revision";
export const LEGACY_KEYS = [
  "fitcore.v1",
  "fitcore.state",
  "fitcore.data",
  "focus-lift-data",
  "fitcore.v0",
] as const;
export const PERSISTENCE_KEYS = [
  FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
  FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA,
  FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB,
  REVISION_KEY,
  ...LEGACY_KEYS,
] as const;
export const FIXED_AT = "2026-07-13T20:30:15.000Z";
export const LATER_AT = "2026-07-13T20:31:15.000Z";
export const TOKEN_1 = "0123456789abcdef0123456789abcdef";
export const TOKEN_2 = "11111111111111111111111111111111";
export const TOKEN_3 = "22222222222222222222222222222222";

export type StorageSnapshot = Record<string, string | null>;

export function fixtureState(label: string): AppState {
  const state = currentFitCoreState({
    onboardingComplete: true,
    reminders: { lunch: false },
  });
  state.activeWorkout = null;
  state.goals[0]!.current = 0;
  state.jarvisLearning = {
    sentinel: `synthetic-${label}`,
    zero: 0,
    disabled: false,
    empty: "",
    nullable: null,
    allowedNegative: -7.5,
  };
  return state;
}

export function largeFixtureState(): AppState {
  const state = fixtureState("large");
  state.workouts = Array.from({ length: 2_000 }, (_, index) => ({
    id: `browser-workout-${index.toString().padStart(4, "0")}`,
    name: `Synthetic Workout ${index}`,
    startedAt: 1_700_000_000_000 + index,
    endedAt: 1_700_000_000_001 + index,
    exercises: [],
  }));
  return state;
}

class MemoryAdapter implements FitCoreAtomicPersistenceAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

export function canonicalRevisionedStorage(
  state: AppState,
  options: { exportedAt?: string; token?: string } = {},
): StorageSnapshot {
  const adapter = new MemoryAdapter();
  const result = persistFitCoreStateWithRevision(adapter, state, {
    expectedRevision: null,
    exportedAt: options.exportedAt ?? FIXED_AT,
    writeToken: options.token ?? TOKEN_1,
  });
  expect(result.status).toBe("committed");
  return Object.fromEntries(PERSISTENCE_KEYS.map((key) => [key, adapter.getItem(key)]));
}

export async function seedStorage(page: Page, values: StorageSnapshot) {
  await page.goto("/");
  await page.evaluate((entries: [string, string | null][]) => {
    localStorage.clear();
    for (const [key, value] of entries) if (value !== null) localStorage.setItem(key, value);
  }, Object.entries(values));
}

export async function waitForHydrationTurn(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export async function clearStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

export async function storageSnapshot(page: Page): Promise<StorageSnapshot> {
  return page.evaluate(
    (keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])),
    PERSISTENCE_KEYS,
  );
}

export async function persistenceWriteCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (globalThis as typeof globalThis & { __fitcoreWrites?: number }).__fitcoreWrites ?? 0,
  );
}

export async function installWriteCounter(page: Page) {
  await page.addInitScript(() => {
    const target = globalThis as typeof globalThis & { __fitcoreWrites?: number };
    target.__fitcoreWrites = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("fitcore.persistence.v1")) target.__fitcoreWrites! += 1;
      return original.call(this, key, value);
    };
  });
}

export async function createBrowserController(page: Page, id: string) {
  await page.waitForLoadState("networkidle");
  return page.evaluate(async (controllerId) => {
    const runtime = await import("/src/lib/runtime-persistence.ts");
    const root = globalThis as typeof globalThis & {
      __fitcoreControllers?: Record<string, unknown>;
    };
    root.__fitcoreControllers ??= {};
    const controller = runtime.createFitCoreRuntimePersistenceController(
      runtime.createFitCoreBrowserPersistenceDependencies(),
    );
    root.__fitcoreControllers[controllerId] = controller;
    return controller.hydrate();
  }, id);
}

export async function controllerCall(
  page: Page,
  id: string,
  method: "hydrate" | "reload" | "getCurrentSnapshot",
) {
  return page.evaluate(
    ({ controllerId, methodName }) => {
      const root = globalThis as typeof globalThis & {
        __fitcoreControllers?: Record<string, Record<string, () => unknown>>;
      };
      const controller = root.__fitcoreControllers?.[controllerId];
      if (!controller) throw new Error("controller unavailable");
      return controller[methodName]!();
    },
    { controllerId: id, methodName: method },
  );
}

export async function controllerCommit(page: Page, id: string, state: AppState) {
  return page.evaluate(
    ({ controllerId, nextState }) => {
      const root = globalThis as typeof globalThis & {
        __fitcoreControllers?: Record<string, { commit(value: unknown): unknown }>;
      };
      const controller = root.__fitcoreControllers?.[controllerId];
      if (!controller) throw new Error("controller unavailable");
      return controller.commit(nextState);
    },
    { controllerId: id, nextState: state },
  );
}

export async function controllerCommitWithoutMathRandom(page: Page, id: string, state: AppState) {
  return page.evaluate(
    ({ controllerId, nextState }) => {
      const root = globalThis as typeof globalThis & {
        __fitcoreControllers?: Record<string, { commit(value: unknown): unknown }>;
      };
      const controller = root.__fitcoreControllers?.[controllerId];
      if (!controller) throw new Error("controller unavailable");
      const original = Math.random;
      Math.random = () => {
        throw new Error("private-math-random-sentinel");
      };
      try {
        return controller.commit(nextState);
      } finally {
        Math.random = original;
      }
    },
    { controllerId: id, nextState: state },
  );
}

export async function storeBoundaryCommit(
  page: Page,
  id: string,
  current: AppState,
  next: AppState,
) {
  return page.evaluate(
    async ({ controllerId, currentState, nextState }) => {
      const store = await import("/src/lib/store.tsx");
      const root = globalThis as typeof globalThis & {
        __fitcoreControllers?: Record<
          string,
          Parameters<typeof store.commitFitCoreStoreRuntime>[0]
        >;
      };
      const controller = root.__fitcoreControllers?.[controllerId];
      if (!controller) throw new Error("controller unavailable");
      return store.commitFitCoreStoreRuntime(controller, currentState, nextState);
    },
    { controllerId: id, currentState: current, nextState: next },
  );
}

export async function task7BaseMismatch(page: Page, currentRevision: number, next: AppState) {
  return page.evaluate(
    async ({ revision, nextState, token, exportedAt }) => {
      const transaction = await import("/src/lib/store-transaction.ts");
      const types = await import("/src/lib/types.ts");
      return transaction.commitFitCoreStoreTransaction(
        {
          getItem: (key: string) => localStorage.getItem(key),
          setItem: (key: string, value: string) => localStorage.setItem(key, value),
        },
        {
          expectedRevision: revision,
          baseState: { ...structuredClone(types.defaultState), jarvisLearning: { mismatch: true } },
          nextState,
          exportedAt,
          writeToken: token,
        },
      );
    },
    { revision: currentRevision, nextState: next, token: TOKEN_3, exportedAt: LATER_AT },
  );
}

export async function controlledFailure(
  page: Page,
  mode: "storage" | "random",
  state: AppState,
  initialStorage: StorageSnapshot,
) {
  return page.evaluate(
    async ({ failureMode, nextState, exportedAt, initialEntries }) => {
      const runtime = await import("/src/lib/runtime-persistence.ts");
      const values = new Map<string, string>(
        initialEntries.filter((entry): entry is [string, string] => entry[1] !== null),
      );
      const privateMessage = "private-storage-exception-sentinel";
      const dependencies = {
        adapter: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => {
            if (failureMode === "storage") throw new Error(privateMessage);
            values.set(key, value);
          },
        },
        createExportedAt: () => exportedAt,
        createWriteToken: () => {
          if (failureMode === "random") throw new Error(privateMessage);
          return "33333333333333333333333333333333";
        },
        readLegacyState: () => null,
      };
      const controller = runtime.createFitCoreRuntimePersistenceController(dependencies);
      const hydration = controller.hydrate();
      const before = [...values.entries()];
      const result = controller.commit(nextState);
      return {
        hydrationStatus: hydration.status,
        result,
        before,
        after: [...values.entries()],
        retained: controller.getCurrentSnapshot(),
      };
    },
    {
      failureMode: mode,
      nextState: state,
      exportedAt: FIXED_AT,
      initialEntries: Object.entries(initialStorage),
    },
  );
}

export async function browserSerializationSafety(page: Page, id: string) {
  return page.evaluate(
    ({ controllerId, persistenceKeys }) => {
      const root = globalThis as typeof globalThis & {
        __fitcoreControllers?: Record<
          string,
          {
            commit(value: unknown): Record<string, unknown>;
            getCurrentSnapshot(): { state: AppState } | null;
          }
        >;
      };
      const controller = root.__fitcoreControllers?.[controllerId];
      if (!controller) throw new Error("controller unavailable");

      const next = structuredClone(controller.getCurrentSnapshot()!.state);
      next.profile.daysPerWeek = 0;
      next.activeWorkout = {
        id: "browser-active-workout",
        name: "Browser Workout",
        startedAt: 1_700_000_000_000,
        exercises: [],
        provenance: {
          source: "manual",
          confidence: "high",
          confirmation: "confirmed",
          auditId: undefined,
        },
      };
      const ordinary = controller.commit(next) as {
        state: AppState | null;
        status: string;
        revision: number | null;
      };
      const ordinarySnapshot = Object.fromEntries(
        persistenceKeys.map((key) => [key, localStorage.getItem(key)]),
      );

      const invalid = structuredClone(ordinary.state!) as unknown as Record<string, unknown>;
      invalid.goals = [undefined];
      const invalidResult = controller.commit(invalid);
      const afterInvalid = Object.fromEntries(
        persistenceKeys.map((key) => [key, localStorage.getItem(key)]),
      );

      const accessorState = structuredClone(ordinary.state!);
      let accessorReads = 0;
      Object.defineProperty(accessorState.profile, "name", {
        configurable: true,
        enumerable: true,
        get: () => {
          accessorReads += 1;
          return "private-accessor-value";
        },
      });
      const accessorResult = controller.commit(accessorState);
      const afterAccessor = Object.fromEntries(
        persistenceKeys.map((key) => [key, localStorage.getItem(key)]),
      );

      return {
        ordinary,
        auditIdPresent: Object.hasOwn(ordinary.state!.activeWorkout!.provenance!, "auditId"),
        invalidResult,
        accessorResult,
        accessorReads,
        storageUnchangedAfterInvalid:
          JSON.stringify(afterInvalid) === JSON.stringify(ordinarySnapshot),
        storageUnchangedAfterAccessor:
          JSON.stringify(afterAccessor) === JSON.stringify(ordinarySnapshot),
      };
    },
    { controllerId: id, persistenceKeys: PERSISTENCE_KEYS },
  );
}

export function parsedMetadata(snapshot: StorageSnapshot) {
  return {
    manifest: snapshot[FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest]
      ? JSON.parse(snapshot[FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest]!)
      : null,
    revision: snapshot[REVISION_KEY] ? JSON.parse(snapshot[REVISION_KEY]!) : null,
    slotA: snapshot[FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA]
      ? JSON.parse(snapshot[FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA]!)
      : null,
    slotB: snapshot[FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB]
      ? JSON.parse(snapshot[FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB]!)
      : null,
  };
}

export async function monitorBrowserErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  let unhandledRejectionCount = 0;
  await page.exposeBinding("__fitcoreRecordUnhandledRejection", (_source, reason: string) => {
    if (!reason.includes("virtual:tanstack-start-client-entry")) unhandledRejectionCount += 1;
  });
  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (event) => {
      const reason =
        event.reason instanceof Error ? event.reason.message : String(event.reason ?? "unknown");
      void (
        globalThis as typeof globalThis & {
          __fitcoreRecordUnhandledRejection(reason: string): Promise<void>;
        }
      ).__fitcoreRecordUnhandledRejection(reason);
    });
  });
  page.on("pageerror", (error) => {
    if (!error.message.includes("virtual:tanstack-start-client-entry"))
      pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      !text.includes("Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED") &&
      !text.includes("Failed to load resource: the server responded with a status of 404") &&
      !text.startsWith("In HTML, %s cannot be a descendant of <%s>.") &&
      !text.startsWith("<%s> cannot contain a nested %s.")
    )
      consoleErrors.push(text);
  });
  return {
    async assertClean() {
      expect(pageErrors, "unexpected page errors").toEqual([]);
      expect(consoleErrors, "unexpected console errors").toEqual([]);
      expect(unhandledRejectionCount, "unexpected unhandled rejections").toBe(0);
    },
  };
}

export function expectPrivate(result: unknown, sentinels: readonly string[]) {
  const serialized = JSON.stringify(result);
  for (const sentinel of [...sentinels, "hash", "fingerprint"])
    expect(serialized).not.toContain(sentinel);
}
