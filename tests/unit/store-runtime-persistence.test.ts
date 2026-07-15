import assert from "node:assert/strict";
import test from "node:test";

import type { FitCoreAtomicPersistenceAdapter } from "../../src/lib/atomic-persistence.ts";
import { migrateFitCoreDataIfNeeded } from "../../src/lib/fitcore-data.ts";
import { persistFitCoreStateWithRevision } from "../../src/lib/revisioned-persistence.ts";
import { createFitCoreRuntimePersistenceController } from "../../src/lib/runtime-persistence.ts";
import {
  StoreProvider,
  commitFitCoreStoreRuntime,
  e1RM,
  hydrateFitCoreStoreRuntime,
  isToday,
  todayStart,
  uid,
  useStore,
} from "../../src/lib/store.tsx";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const EXPORTED_AT = "2026-07-13T20:30:15.000Z";
const LATER_AT = "2026-07-13T20:31:15.000Z";
const TOKEN_1 = "0123456789abcdef0123456789abcdef";
const TOKEN_2 = "11111111111111111111111111111111";

class MemoryAdapter implements FitCoreAtomicPersistenceAdapter {
  readonly data = new Map<string, string>();
  readonly operations: string[] = [];
  getItem(key: string) {
    this.operations.push(`get:${key}`);
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.operations.push(`set:${key}`);
    this.data.set(key, value);
  }
  writes() {
    return this.operations.filter((entry) => entry.startsWith("set:"));
  }
}

function state(label?: string): AppState {
  const value = structuredClone(defaultState);
  if (label !== undefined) value.jarvisLearning = { value: label };
  return value;
}

function controller(adapter: MemoryAdapter, legacy: unknown | null = null) {
  let token = 0;
  return createFitCoreRuntimePersistenceController({
    adapter,
    readLegacyState: () => legacy,
    createExportedAt: () => (token === 0 ? EXPORTED_AT : LATER_AT),
    createWriteToken: () => (++token === 1 ? TOKEN_1 : TOKEN_2),
  });
}

test("existing store exports remain available and persistence helpers are additive", () => {
  assert.equal(typeof StoreProvider, "function");
  assert.equal(typeof useStore, "function");
  assert.equal(typeof uid, "function");
  assert.equal(typeof e1RM, "function");
  assert.equal(typeof todayStart, "function");
  assert.equal(typeof isToday, "function");
  assert.equal(typeof hydrateFitCoreStoreRuntime, "function");
  assert.equal(typeof commitFitCoreStoreRuntime, "function");
  assert.equal(e1RM(100, 10), 133);
});

test("empty initialization retains the exact default state without auto-save", () => {
  const adapter = new MemoryAdapter();
  const fallback = state("default-not-persisted");
  const outcome = hydrateFitCoreStoreRuntime(controller(adapter), fallback);
  assert.equal(outcome.applied, false);
  assert.equal(outcome.state, fallback);
  assert.equal(outcome.metadata.persistenceStatus, "empty");
  assert.deepEqual(adapter.writes(), []);
});

test("ready and warning initialization apply only verified detached state", () => {
  for (const [source, expected, review] of [
    [state("ready"), "ready", false],
    [Object.assign(state(), { futureStoreField: "warning" }), "ready_with_warnings", true],
  ] as const) {
    const adapter = new MemoryAdapter();
    persistFitCoreStateWithRevision(adapter, source, {
      expectedRevision: null,
      exportedAt: EXPORTED_AT,
      writeToken: TOKEN_1,
    });
    const writes = adapter.writes().length;
    const outcome = hydrateFitCoreStoreRuntime(controller(adapter), defaultState);
    assert.equal(outcome.applied, true);
    assert.equal(outcome.metadata.persistenceStatus, expected);
    assert.equal(outcome.metadata.persistenceRequiresReview, review);
    assert.deepEqual(outcome.state, source);
    assert.notEqual(outcome.state, source);
    assert.equal(adapter.writes().length, writes);
  }
});

test("legacy startup migrates once and later initialization prefers revisioned state", () => {
  const adapter = new MemoryAdapter();
  const legacy = state("legacy");
  const first = hydrateFitCoreStoreRuntime(controller(adapter, legacy), defaultState);
  assert.equal(first.metadata.persistenceStatus, "legacy_migrated");
  assert.deepEqual(first.state, legacy);
  const writes = adapter.writes().length;
  const second = hydrateFitCoreStoreRuntime(controller(adapter, state("ignored")), defaultState);
  assert.equal(second.metadata.persistenceStatus, "ready");
  assert.deepEqual(second.state, legacy);
  assert.equal(adapter.writes().length, writes);
});

test("store startup applies a verified partial historical legacy state", () => {
  const adapter = new MemoryAdapter();
  const partial = {
    version: 1,
    onboardingComplete: true,
    profile: {
      goal: "hypertrophy",
      experience: "intermediate",
      daysPerWeek: 0,
      split: "Push / Pull / Legs",
      bodyweightLb: 180,
      targetBodyweightLb: 185,
      units: "lb",
    },
    workouts: [],
    activeWorkout: null,
    mealEntries: [],
    bodyweightEntries: [],
    goals: [],
  };
  const runtime = controller(adapter, partial);
  const outcome = hydrateFitCoreStoreRuntime(runtime, defaultState);

  assert.equal(outcome.applied, true);
  assert.equal(outcome.metadata.persistenceStatus, "legacy_migrated");
  assert.equal(outcome.state.onboardingComplete, true);
  assert.equal(outcome.state.profile.daysPerWeek, 0);
  assert.equal(outcome.state.profile.sleepGoalH, defaultState.profile.sleepGoalH);
  assert.equal(Object.hasOwn(outcome.state.profile, "name"), false);

  const writes = adapter.writes().length;
  const committed = commitFitCoreStoreRuntime(
    runtime,
    outcome.state,
    migrateFitCoreDataIfNeeded({
      ...outcome.state,
      activeWorkout: {
        id: "legacy-startup-mutation",
        name: "Workout",
        startedAt: 1_700_000_000_000,
        exercises: [],
      },
    }),
  );
  assert.equal(committed.applied, true);
  assert.equal(committed.state.activeWorkout?.id, "legacy-startup-mutation");
  assert.equal(runtime.getCurrentSnapshot()?.revision, 2);
  assert.equal(adapter.writes().length, writes + 3);
});

test("central mutation publishes only the verified transaction state", () => {
  const adapter = new MemoryAdapter();
  const runtime = controller(adapter, state("base"));
  const hydrated = hydrateFitCoreStoreRuntime(runtime, defaultState);
  const proposed = state("next");
  const before = structuredClone(proposed);
  const outcome = commitFitCoreStoreRuntime(runtime, hydrated.state, proposed);
  assert.equal(outcome.applied, true);
  assert.equal(outcome.metadata.persistenceStatus, "ready");
  assert.deepEqual(outcome.state, proposed);
  assert.deepEqual(proposed, before);
  assert.notEqual(outcome.state, proposed);
});

test("no change publishes verified state without revision increment or write", () => {
  const adapter = new MemoryAdapter();
  const runtime = controller(adapter, state("same"));
  const hydrated = hydrateFitCoreStoreRuntime(runtime, defaultState);
  const revision = runtime.getCurrentSnapshot()!.revision;
  const writes = adapter.writes().length;
  const outcome = commitFitCoreStoreRuntime(
    runtime,
    hydrated.state,
    structuredClone(hydrated.state),
  );
  assert.equal(outcome.applied, true);
  assert.equal(runtime.getCurrentSnapshot()!.revision, revision);
  assert.equal(adapter.writes().length, writes);
});

test("stale persistence leaves prior store state unchanged and requires reload", () => {
  const adapter = new MemoryAdapter();
  const runtime = controller(adapter, state("base"));
  const hydrated = hydrateFitCoreStoreRuntime(runtime, defaultState);
  persistFitCoreStateWithRevision(adapter, state("external"), {
    expectedRevision: 1,
    exportedAt: LATER_AT,
    writeToken: TOKEN_2,
  });
  const prior = hydrated.state;
  const outcome = commitFitCoreStoreRuntime(runtime, prior, state("uncommitted-private"));
  assert.equal(outcome.applied, false);
  assert.equal(outcome.state, prior);
  assert.equal(outcome.metadata.persistenceStatus, "reload_required");
  assert.equal(outcome.metadata.persistenceRequiresReload, true);
  assert.equal(JSON.stringify(outcome.metadata).includes("uncommitted-private"), false);
});

test("recovery initialization retains defaults and never overwrites persistence", () => {
  const adapter = new MemoryAdapter();
  adapter.data.set("fitcore.persistence.v1.manifest", "{");
  const writes = adapter.writes().length;
  const fallback = state("fallback");
  const outcome = hydrateFitCoreStoreRuntime(controller(adapter, state("legacy")), fallback);
  assert.equal(outcome.applied, false);
  assert.equal(outcome.state, fallback);
  assert.equal(outcome.metadata.persistenceRequiresReload, true);
  assert.equal(adapter.writes().length, writes);
});

test("zero, false, empty, null, negatives, and missing fields survive store integration", () => {
  const adapter = new MemoryAdapter();
  const runtime = controller(adapter);
  const hydrated = hydrateFitCoreStoreRuntime(runtime, defaultState);
  const next = state();
  next.jarvisLearning = { zero: 0, off: false, empty: "", nullable: null };
  next.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  delete next.profile.name;
  const outcome = commitFitCoreStoreRuntime(runtime, hydrated.state, next);
  assert.equal(outcome.applied, true);
  assert.deepEqual(outcome.state.jarvisLearning, next.jarvisLearning);
  assert.equal(outcome.state.userGoalsProfile.weeklyWeightChangeLb, -0.5);
  assert.equal(Object.hasOwn(outcome.state.profile, "name"), false);
});

test("store persistence metadata is frozen, additive, and contains no state or raw report", () => {
  const adapter = new MemoryAdapter();
  const outcome = hydrateFitCoreStoreRuntime(controller(adapter), defaultState);
  assert.equal(Object.isFrozen(outcome.metadata), true);
  assert.deepEqual(Object.keys(outcome.metadata).sort(), [
    "persistenceRequiresReload",
    "persistenceRequiresReview",
    "persistenceStatus",
  ]);
  const json = JSON.stringify(outcome.metadata);
  for (const forbidden of ["state", "payload", "manifest", "issues", "writeToken", "adapter"])
    assert.equal(json.includes(forbidden), false);
});
