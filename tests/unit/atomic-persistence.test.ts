import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_ATOMIC_MANIFEST_FORMAT,
  FITCORE_ATOMIC_MANIFEST_VERSION,
  FITCORE_ATOMIC_PERSISTENCE_KEYS,
  FITCORE_ATOMIC_PERSISTENCE_POLICY,
  persistFitCoreStateAtomically,
  readFitCoreAtomicPersistence,
  type FitCoreAtomicPersistenceAdapter,
  type FitCoreAtomicPersistenceReadResult,
  type FitCoreAtomicPersistenceWriteResult,
} from "../../src/lib/atomic-persistence.ts";
import {
  FITCORE_BACKUP_ENVELOPE_POLICY,
  createFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
} from "../../src/lib/data-backup.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const EXPORTED_AT = "2026-07-13T20:30:15.000Z";
const LATER_AT = "2026-07-13T20:31:15.000Z";
const AT = 1_700_000_000_000;
const { manifest: MANIFEST, slotA: SLOT_A, slotB: SLOT_B } = FITCORE_ATOMIC_PERSISTENCE_KEYS;

type GetBehavior = { kind: "throw"; message: string } | { kind: "return"; value: string | null };
type SetBehavior =
  | { kind: "throw_before"; message: string }
  | { kind: "throw_after"; message: string }
  | { kind: "store_as"; value: string }
  | { kind: "ignore" };

class MemoryAdapter implements FitCoreAtomicPersistenceAdapter {
  readonly data = new Map<string, string>();
  readonly operations: string[] = [];
  readonly getCounts = new Map<string, number>();
  readonly setCounts = new Map<string, number>();
  readonly getBehaviors = new Map<string, Map<number, GetBehavior>>();
  readonly setBehaviors = new Map<string, Map<number, SetBehavior>>();
  marker = "adapter-remains-mutable";

  getItem(key: string): string | null {
    this.operations.push(`get:${key}`);
    const count = (this.getCounts.get(key) ?? 0) + 1;
    this.getCounts.set(key, count);
    const behavior = this.getBehaviors.get(key)?.get(count);
    if (behavior?.kind === "throw") throw new Error(behavior.message);
    if (behavior?.kind === "return") return behavior.value;
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.operations.push(`set:${key}`);
    const count = (this.setCounts.get(key) ?? 0) + 1;
    this.setCounts.set(key, count);
    const behavior = this.setBehaviors.get(key)?.get(count);
    if (behavior?.kind === "throw_before") throw new Error(behavior.message);
    if (behavior?.kind === "ignore") return;
    if (behavior?.kind === "store_as") this.data.set(key, behavior.value);
    else this.data.set(key, value);
    if (behavior?.kind === "throw_after") throw new Error(behavior.message);
  }

  onGet(key: string, count: number, behavior: GetBehavior): void {
    const entries = this.getBehaviors.get(key) ?? new Map<number, GetBehavior>();
    entries.set(count, behavior);
    this.getBehaviors.set(key, entries);
  }

  onSet(key: string, count: number, behavior: SetBehavior): void {
    const entries = this.setBehaviors.get(key) ?? new Map<number, SetBehavior>();
    entries.set(count, behavior);
    this.setBehaviors.set(key, entries);
  }

  writes(): string[] {
    return this.operations.filter((entry) => entry.startsWith("set:"));
  }
}

function state(): AppState {
  return structuredClone(defaultState);
}

function persist(
  adapter: FitCoreAtomicPersistenceAdapter,
  value: unknown = state(),
  exportedAt = EXPORTED_AT,
) {
  return persistFitCoreStateAtomically(adapter, value, { exportedAt });
}

function addOwn(record: object, key: string, value: unknown): void {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function assertDeepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
}

function assertWriteSummary(result: FitCoreAtomicPersistenceWriteResult): void {
  assert.equal(result.summary.issueCount, result.issues.length);
  assert.equal(
    result.summary.warningCount,
    result.issues.filter(({ severity }) => severity === "warning").length,
  );
  assert.equal(
    result.summary.errorCount,
    result.issues.filter(({ severity }) => severity === "error").length,
  );
  assert.equal(
    result.summary.writeOperationCount,
    result.summary.slotWriteCount + result.summary.manifestWriteCount,
  );
  assert.equal(result.summary.verificationReadCount <= result.summary.readOperationCount, true);
  for (const count of Object.values(result.summary)) {
    assert.equal(Number.isSafeInteger(count), true);
    assert.equal(count >= 0, true);
  }
}

function assertReadSummary(result: FitCoreAtomicPersistenceReadResult): void {
  assert.equal(result.summary.issueCount, result.issues.length);
  assert.equal(
    result.summary.warningCount,
    result.issues.filter(({ severity }) => severity === "warning").length,
  );
  assert.equal(
    result.summary.errorCount,
    result.issues.filter(({ severity }) => severity === "error").length,
  );
  if (result.summary.readOperationCount === 3 && result.status !== "storage_error") {
    assert.equal(
      result.summary.validSlotCount +
        result.summary.invalidSlotCount +
        result.summary.missingSlotCount,
      2,
    );
  }
  for (const count of Object.values(result.summary)) {
    assert.equal(Number.isSafeInteger(count), true);
    assert.equal(count >= 0, true);
  }
}

function canonicalBackup(value: unknown = state(), exportedAt = EXPORTED_AT): string {
  const created = createFitCoreBackupEnvelope(value, { exportedAt });
  assert.notEqual(created.envelope, null);
  const serialized = serializeFitCoreBackupEnvelope(created.envelope);
  assert.notEqual(serialized.json, null);
  return serialized.json!;
}

function parsedManifest(adapter: MemoryAdapter): Record<string, unknown> {
  return JSON.parse(adapter.data.get(MANIFEST)!) as Record<string, unknown>;
}

function warningState(): AppState {
  const value = state();
  (value as unknown as Record<string, unknown>).futureWarning = {
    keep: "warning-payload-sentinel",
  };
  return value;
}

function sensitiveState(): AppState {
  const value = state();
  value.workouts = [
    {
      id: "sensitive-workout-id",
      name: "sensitive-workout-name",
      startedAt: AT,
      endedAt: AT + 1,
      exercises: [
        {
          id: "sensitive-exercise-id",
          exerciseId: "sensitive-exercise-name",
          completed: false,
          sets: [],
        },
      ],
    },
  ];
  value.mealEntries = [
    {
      id: "sensitive-meal-id",
      name: "sensitive-meal-name",
      type: "meal",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      createdAt: AT,
    },
  ];
  value.aiMessages = [
    { id: "sensitive-ai-id", role: "user", content: "sensitive-ai-message", createdAt: AT },
  ];
  value.supplementLogs = [
    { id: "sensitive-supplement-id", name: "sensitive-supplement-name", createdAt: AT },
  ];
  value.recoveryCheckIns = [
    {
      id: "sensitive-recovery-id",
      energy: 0,
      soreness: 0,
      stress: 0,
      motivation: 0,
      notes: "sensitive-recovery-note",
      createdAt: AT,
    },
  ];
  value.goals = [
    {
      id: "sensitive-goal-id",
      type: "habit",
      label: "sensitive-goal-description",
      target: 0,
      current: 0,
    },
  ];
  value.progressPhotos = [
    {
      id: "sensitive-photo-id",
      dataUrl: "sensitive-photo-metadata",
      view: "front",
      phase: "maintenance",
      createdAt: AT,
    },
  ];
  value.jarvisAudit = [
    {
      id: "sensitive-audit-id",
      tool: "sensitive-audit-tool",
      summary: "sensitive-audit-summary",
      status: "logged",
      patch: { value: "sensitive-audit-patch" },
      createdAt: AT,
    },
  ];
  value.jarvisLearning = { unknown: "sensitive-unknown-warning-field" };
  return value;
}

test("exports exact policies, manifest constants, keys, slot API, and functions", () => {
  assert.equal(FITCORE_ATOMIC_PERSISTENCE_POLICY, "fitcore_atomic_persistence_v1");
  assert.equal(FITCORE_ATOMIC_MANIFEST_FORMAT, "fitcore_atomic_manifest");
  assert.equal(FITCORE_ATOMIC_MANIFEST_VERSION, 1);
  assert.equal(FITCORE_BACKUP_ENVELOPE_POLICY, "fitcore_backup_envelope_v1");
  assert.deepEqual(FITCORE_ATOMIC_PERSISTENCE_KEYS, {
    manifest: "fitcore.persistence.v1.manifest",
    slotA: "fitcore.persistence.v1.slot.a",
    slotB: "fitcore.persistence.v1.slot.b",
  });
  assertDeepFrozen(FITCORE_ATOMIC_PERSISTENCE_KEYS);
  assert.equal(typeof persistFitCoreStateAtomically, "function");
  assert.equal(typeof readFitCoreAtomicPersistence, "function");
});

test("malformed and hostile adapters return frozen reports without throwing", () => {
  const malformed = [null, {}, { getItem() {} }, { getItem: 1, setItem: 2 }];
  for (const adapter of malformed) {
    assert.doesNotThrow(() =>
      readFitCoreAtomicPersistence(adapter as FitCoreAtomicPersistenceAdapter),
    );
    const read = readFitCoreAtomicPersistence(adapter as FitCoreAtomicPersistenceAdapter);
    const write = persist(adapter as FitCoreAtomicPersistenceAdapter);
    assert.equal(read.status, "storage_error");
    assert.equal(write.status, "blocked");
    assert.equal(JSON.stringify(read).includes("adapter"), true);
    assert.equal(JSON.stringify(read).includes("getItem"), false);
    assertDeepFrozen(read);
    assertDeepFrozen(write);
  }
  const hostile = new Proxy(
    {},
    {
      get() {
        throw new Error("hostile-adapter-secret");
      },
    },
  );
  const report = readFitCoreAtomicPersistence(hostile as FitCoreAtomicPersistenceAdapter);
  assert.equal(report.status, "storage_error");
  assert.equal(JSON.stringify(report).includes("hostile-adapter-secret"), false);
});

test("empty storage reads without writes or slot selection", () => {
  const adapter = new MemoryAdapter();
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "empty");
  assert.equal(result.safeToUse, false);
  assert.equal(result.envelope, null);
  assert.equal(result.activeSlot, null);
  assert.equal(result.loadedSlot, null);
  assert.equal(result.summary.validSlotCount, 0);
  assert.equal(result.summary.missingSlotCount, 2);
  assert.equal(result.summary.readOperationCount, 3);
  assert.deepEqual(adapter.writes(), []);
  assertReadSummary(result);
});

test("first commit writes A, verifies it, writes manifest last, and loads completely", () => {
  const adapter = new MemoryAdapter();
  const source = state();
  const result = persist(adapter, source);
  assert.equal(result.status, "committed");
  assert.equal(result.safeToUse, true);
  assert.equal(result.requiresReview, false);
  assert.equal(result.activeSlot, "a");
  assert.equal(result.previousSlot, null);
  assert.equal(result.stagedSlot, "a");
  assert.deepEqual(adapter.operations, [
    `get:${MANIFEST}`,
    `get:${SLOT_A}`,
    `get:${SLOT_B}`,
    `set:${SLOT_A}`,
    `get:${SLOT_A}`,
    `set:${MANIFEST}`,
    `get:${MANIFEST}`,
    `get:${SLOT_A}`,
  ]);
  assert.equal(adapter.data.has(SLOT_B), false);
  assert.deepEqual(parsedManifest(adapter), {
    format: FITCORE_ATOMIC_MANIFEST_FORMAT,
    version: 1,
    policy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    activeSlot: "a",
    previousSlot: null,
  });
  const loaded = readFitCoreAtomicPersistence(adapter);
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.envelope!.payload, source);
  assert.equal(loaded.loadedSlot, "a");
  assertDeepFrozen(result);
  assertDeepFrozen(loaded);
  assertWriteSummary(result);
  assertReadSummary(loaded);
});

test("successive commits alternate slots and retain the previous committed bytes", () => {
  const adapter = new MemoryAdapter();
  const firstState = state();
  firstState.jarvisLearning = { commit: "first" };
  const first = persist(adapter, firstState, EXPORTED_AT);
  const firstA = adapter.data.get(SLOT_A);
  const secondState = state();
  secondState.jarvisLearning = { commit: "second" };
  const second = persist(adapter, secondState, LATER_AT);
  assert.equal(second.status, "committed");
  assert.equal(second.activeSlot, "b");
  assert.equal(second.previousSlot, "a");
  assert.equal(adapter.data.get(SLOT_A), firstA);
  const secondB = adapter.data.get(SLOT_B);
  const thirdState = state();
  thirdState.jarvisLearning = { commit: "third" };
  const third = persist(adapter, thirdState, "2026-07-13T20:32:15.000Z");
  assert.equal(third.activeSlot, "a");
  assert.equal(third.previousSlot, "b");
  assert.equal(adapter.data.get(SLOT_B), secondB);
  assert.equal(first.activeSlot, "a");
  assert.deepEqual(adapter.writes().filter((entry) => entry === `set:${SLOT_A}`).length, 2);
  assert.deepEqual(adapter.writes().filter((entry) => entry === `set:${SLOT_B}`).length, 1);
});

test("warning-level state commits and loads without filtering", () => {
  const adapter = new MemoryAdapter();
  const source = warningState();
  const write = persist(adapter, source);
  assert.equal(write.status, "committed_with_warnings");
  assert.equal(write.safeToUse, true);
  assert.equal(write.requiresReview, true);
  const read = readFitCoreAtomicPersistence(adapter);
  assert.equal(read.status, "loaded_with_warnings");
  assert.equal(read.requiresReview, true);
  assert.deepEqual(read.envelope!.payload, source);
  assert.equal(adapter.data.get(SLOT_A)!.includes("warning-payload-sentinel"), true);
});

test("Task 4-invalid backups block before all writes and remain privacy-safe", () => {
  const fixtures: unknown[] = [];
  const integrityInvalid = state();
  delete (integrityInvalid as unknown as Record<string, unknown>).workouts;
  fixtures.push(integrityInvalid);
  const unsupported = state();
  unsupported.jarvisLearning = { privateSentinel: "private-blocked-value", bad: undefined };
  fixtures.push(unsupported);
  const negativeZero = state();
  negativeZero.jarvisLearning = { privateSentinel: "private-blocked-value", bad: -0 };
  fixtures.push(negativeZero);
  const unsafe = state();
  addOwn(unsafe.jarvisLearning, "__proto__", "private-blocked-value");
  fixtures.push(unsafe);
  for (const fixture of fixtures) {
    const adapter = new MemoryAdapter();
    const result = persist(adapter, fixture);
    assert.equal(result.status, "blocked");
    assert.equal(result.safeToUse, false);
    assert.equal(result.summary.writeOperationCount, 0);
    assert.deepEqual(adapter.writes(), []);
    assert.equal(JSON.stringify(result).includes("private-blocked-value"), false);
    assertWriteSummary(result);
  }
});

test("malformed options block without reads, writes, or timestamp leakage", () => {
  const options = [undefined, {}, { exportedAt: 1 }, { exportedAt: EXPORTED_AT, extra: true }];
  for (const candidate of options) {
    const adapter = new MemoryAdapter();
    const result = persistFitCoreStateAtomically(
      adapter,
      state(),
      candidate as { exportedAt: string },
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.issues[0].code, "invalid_options");
    assert.equal(result.summary.readOperationCount, 0);
    assert.equal(result.summary.writeOperationCount, 0);
  }
  const invalidTimestamp = persist(new MemoryAdapter(), state(), "private-invalid-time");
  assert.equal(invalidTimestamp.status, "blocked");
  assert.equal(invalidTimestamp.issues[0].code, "invalid_options");
  assert.equal(JSON.stringify(invalidTimestamp).includes("private-invalid-time"), false);
});

test("slot write failure proven absent returns storage_error and never writes manifest", () => {
  const adapter = new MemoryAdapter();
  adapter.onSet(SLOT_A, 1, { kind: "throw_before", message: "private-slot-write-error" });
  const result = persist(adapter);
  assert.equal(result.status, "storage_error");
  assert.equal(result.safeToUse, false);
  assert.equal(
    result.issues.some(({ code }) => code === "slot_write_failed"),
    true,
  );
  assert.equal(
    result.issues.some(({ code }) => code === "slot_missing_after_write"),
    true,
  );
  assert.deepEqual(adapter.writes(), [`set:${SLOT_A}`]);
  assert.equal(adapter.data.has(MANIFEST), false);
  assert.equal(JSON.stringify(result).includes("private-slot-write-error"), false);
});

test("slot set exception may still commit only when exact stored bytes verify", () => {
  const adapter = new MemoryAdapter();
  adapter.onSet(SLOT_A, 1, { kind: "throw_after", message: "private-slot-after-error" });
  const result = persist(adapter);
  assert.equal(result.status, "committed");
  assert.equal(result.safeToUse, true);
  assert.equal(
    result.issues.some(({ code }) => code === "slot_write_failed"),
    true,
  );
  assert.equal(readFitCoreAtomicPersistence(adapter).status, "loaded");
});

test("slot read-back mismatch prevents manifest installation", () => {
  const adapter = new MemoryAdapter();
  adapter.onSet(SLOT_A, 1, { kind: "store_as", value: "slot-corruption-sensitive" });
  const result = persist(adapter);
  assert.equal(result.status, "verification_failed");
  assert.equal(result.issues[0].code, "slot_readback_mismatch");
  assert.equal(adapter.data.has(MANIFEST), false);
  assert.deepEqual(adapter.writes(), [`set:${SLOT_A}`]);
  assert.equal(JSON.stringify(result).includes("slot-corruption-sensitive"), false);
});

test("invalid JSON, invalid backup, and noncanonical staged bytes all stop before manifest", () => {
  const canonical = canonicalBackup();
  const corruptions: [string, string][] = [
    ['{"private-invalid-json-sentinel"', "private-invalid-json-sentinel"],
    [JSON.stringify({ privateInvalidBackupSentinel: true }), "privateInvalidBackupSentinel"],
    [
      JSON.stringify({ ...JSON.parse(canonical), privateNoncanonicalSentinel: true }, null, 2),
      "privateNoncanonicalSentinel",
    ],
  ];
  for (const [corruption, sentinel] of corruptions) {
    const adapter = new MemoryAdapter();
    adapter.onSet(SLOT_A, 1, { kind: "store_as", value: corruption });
    const result = persist(adapter);
    assert.equal(result.status, "verification_failed");
    assert.equal(result.safeToUse, false);
    assert.equal(adapter.data.has(MANIFEST), false);
    assert.deepEqual(adapter.writes(), [`set:${SLOT_A}`]);
    assert.equal(JSON.stringify(result).includes(sentinel), false);
  }
});

test("slot read failure preserves the prior committed manifest", () => {
  const adapter = new MemoryAdapter();
  persist(adapter);
  const manifestBefore = adapter.data.get(MANIFEST);
  const manifestSetCount = adapter.setCounts.get(MANIFEST) ?? 0;
  adapter.onGet(SLOT_B, 2, { kind: "throw", message: "private-slot-read-error" });
  const result = persist(adapter, state(), LATER_AT);
  assert.equal(result.status, "storage_error");
  assert.equal(adapter.data.get(MANIFEST), manifestBefore);
  assert.equal(adapter.setCounts.get(MANIFEST) ?? 0, manifestSetCount);
  assert.equal(readFitCoreAtomicPersistence(adapter).status, "loaded");
});

test("manifest set failure with old manifest proven returns storage_error", () => {
  const adapter = new MemoryAdapter();
  const first = persist(adapter);
  const oldManifest = adapter.data.get(MANIFEST);
  adapter.onSet(MANIFEST, 2, { kind: "throw_before", message: "private-manifest-before" });
  const result = persist(adapter, state(), LATER_AT);
  assert.equal(first.status, "committed");
  assert.equal(result.status, "storage_error");
  assert.equal(result.issues[0].code, "manifest_write_failed");
  assert.equal(adapter.data.get(MANIFEST), oldManifest);
  assert.equal(readFitCoreAtomicPersistence(adapter).loadedSlot, "a");
});

test("manifest set exception with the new manifest proven completes the commit", () => {
  const adapter = new MemoryAdapter();
  adapter.onSet(MANIFEST, 1, { kind: "throw_after", message: "private-manifest-after" });
  const result = persist(adapter);
  assert.equal(result.status, "committed");
  assert.equal(result.safeToUse, true);
  assert.equal(
    result.issues.some(({ code }) => code === "manifest_write_failed"),
    true,
  );
  assert.equal(readFitCoreAtomicPersistence(adapter).status, "loaded");
  assert.equal(JSON.stringify(result).includes("private-manifest-after"), false);
});

test("unreadable manifest outcome is indeterminate and causes no additional write", () => {
  const adapter = new MemoryAdapter();
  adapter.onSet(MANIFEST, 1, { kind: "throw_before", message: "private-manifest-unknown" });
  adapter.onGet(MANIFEST, 2, { kind: "throw", message: "private-manifest-read-unknown" });
  const result = persist(adapter);
  assert.equal(result.status, "indeterminate");
  assert.equal(result.safeToUse, false);
  assert.equal(
    result.issues.some(({ code }) => code === "manifest_read_failed"),
    true,
  );
  assert.equal(
    result.issues.some(({ code }) => code === "commit_outcome_indeterminate"),
    true,
  );
  assert.deepEqual(adapter.writes(), [`set:${SLOT_A}`, `set:${MANIFEST}`]);
  assert.equal(
    result.limitationKeys.includes("persistence.atomic.limitation.fresh_read_required"),
    true,
  );
  assert.equal(JSON.stringify(result).includes("private-manifest"), false);
});

test("silent manifest read-back mismatch is conservative and performs no repair write", () => {
  const adapter = new MemoryAdapter();
  adapter.onSet(MANIFEST, 1, { kind: "ignore" });
  const result = persist(adapter);
  assert.equal(result.status, "verification_failed");
  assert.equal(result.issues[0].code, "manifest_readback_mismatch");
  assert.deepEqual(adapter.writes(), [`set:${SLOT_A}`, `set:${MANIFEST}`]);

  const unknown = new MemoryAdapter();
  unknown.onSet(MANIFEST, 1, { kind: "store_as", value: "{}" });
  const indeterminate = persist(unknown);
  assert.equal(indeterminate.status, "indeterminate");
  assert.equal(indeterminate.safeToUse, false);
});

test("final slot verification failure stops and rechecks only manifest authority", () => {
  const adapter = new MemoryAdapter();
  adapter.onGet(SLOT_A, 3, { kind: "return", value: "final-slot-private-corruption" });
  const result = persist(adapter);
  assert.equal(result.status, "verification_failed");
  assert.equal(result.issues[0].code, "final_verification_failed");
  assert.deepEqual(adapter.writes(), [`set:${SLOT_A}`, `set:${MANIFEST}`]);
  assert.equal(JSON.stringify(result).includes("final-slot-private-corruption"), false);
  assert.equal(readFitCoreAtomicPersistence(adapter).status, "loaded");
});

test("active loads are detached, deeply frozen, canonical, and omit raw strings", () => {
  const adapter = new MemoryAdapter();
  const source = sensitiveState();
  persist(adapter, source);
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "loaded");
  assert.equal(result.safeToUse, true);
  assert.equal(result.loadedSlot, "a");
  assert.notEqual(result.envelope!.payload, source);
  assert.deepEqual(result.envelope!.payload, source);
  assertDeepFrozen(result);
  const reportText = JSON.stringify({ ...result, envelope: null });
  assert.equal(reportText.includes(adapter.data.get(SLOT_A)!), false);
  assert.equal(Object.hasOwn(result, "raw"), false);
});

test("invalid active slot falls back only to explicitly recorded valid previous slot", () => {
  const adapter = new MemoryAdapter();
  const previous = state();
  previous.jarvisLearning = { commit: "previous-preserved" };
  persist(adapter, previous);
  persist(adapter, state(), LATER_AT);
  adapter.data.set(SLOT_B, "invalid-active-private");
  const writesBefore = adapter.writes().length;
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "recovered_previous");
  assert.equal(result.safeToUse, true);
  assert.equal(result.recoveryUsed, true);
  assert.equal(result.requiresRewrite, true);
  assert.equal(result.loadedSlot, "a");
  assert.deepEqual(result.envelope!.payload, previous);
  assert.equal(adapter.writes().length, writesBefore);
});

test("recovered warning-level previous backup retains review requirement", () => {
  const adapter = new MemoryAdapter();
  persist(adapter, warningState());
  persist(adapter, state(), LATER_AT);
  adapter.data.set(SLOT_B, "invalid");
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "recovered_previous");
  assert.equal(result.requiresReview, true);
});

test("missing or invalid manifest never chooses among orphaned slots", () => {
  const cases: ((adapter: MemoryAdapter) => void)[] = [
    (adapter) => adapter.data.set(SLOT_A, canonicalBackup()),
    (adapter) => {
      adapter.data.set(SLOT_A, canonicalBackup(state(), EXPORTED_AT));
      adapter.data.set(SLOT_B, canonicalBackup(state(), LATER_AT));
    },
    (adapter) => {
      adapter.data.set(MANIFEST, "malformed-private-manifest");
      adapter.data.set(SLOT_A, canonicalBackup());
    },
  ];
  for (const arrange of cases) {
    const adapter = new MemoryAdapter();
    arrange(adapter);
    const result = readFitCoreAtomicPersistence(adapter);
    assert.equal(result.status, "recovery_required");
    assert.equal(result.envelope, null);
    assert.equal(result.loadedSlot, null);
    assert.deepEqual(adapter.writes(), []);
  }
});

test("a valid manifest keeps its active slot authoritative over unrecorded staged data", () => {
  const adapter = new MemoryAdapter();
  persist(adapter);
  adapter.data.set(SLOT_B, canonicalBackup(state(), LATER_AT));
  const writesBefore = adapter.writes().length;
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "loaded");
  assert.equal(result.loadedSlot, "a");
  assert.notEqual(result.envelope, null);
  assert.equal(adapter.writes().length, writesBefore);
});

test("manifest validation rejects every closed-shape and relationship violation", () => {
  const mutations: ((manifest: Record<string, unknown>) => void)[] = [
    (value) => delete value.policy,
    (value) => (value.unknown = true),
    (value) => (value.format = "wrong"),
    (value) => (value.version = 2),
    (value) => (value.policy = "wrong"),
    (value) => (value.backupPolicy = "wrong"),
    (value) => (value.activeSlot = "c"),
    (value) => (value.previousSlot = value.activeSlot),
  ];
  for (const mutate of mutations) {
    const adapter = new MemoryAdapter();
    persist(adapter);
    const candidate = parsedManifest(adapter);
    mutate(candidate);
    adapter.data.set(MANIFEST, JSON.stringify(candidate));
    const result = readFitCoreAtomicPersistence(adapter);
    assert.equal(result.status, "recovery_required");
    assert.equal(result.envelope, null);
  }
});

test("semantically valid but noncanonical manifest bytes require recovery", () => {
  const adapter = new MemoryAdapter();
  persist(adapter);
  const manifest = parsedManifest(adapter);
  adapter.data.set(MANIFEST, JSON.stringify(manifest, null, 2));
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.envelope, null);
  assert.equal(result.issues[0].code, "manifest_invalid_shape");
});

test("valid manifest with no usable committed slot is corrupt", () => {
  const adapter = new MemoryAdapter();
  persist(adapter);
  adapter.data.set(SLOT_A, "invalid-active-sensitive");
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "corrupt");
  assert.equal(result.safeToUse, false);
  assert.equal(result.envelope, null);

  const withPrevious = new MemoryAdapter();
  persist(withPrevious);
  persist(withPrevious, state(), LATER_AT);
  withPrevious.data.set(SLOT_A, "invalid-previous-sensitive");
  withPrevious.data.set(SLOT_B, "invalid-active-sensitive");
  assert.equal(readFitCoreAtomicPersistence(withPrevious).status, "corrupt");
});

test("storage read failures are private, frozen, and never guess a slot", () => {
  const adapter = new MemoryAdapter();
  adapter.onGet(MANIFEST, 1, { kind: "throw", message: "private-read-exception" });
  const result = readFitCoreAtomicPersistence(adapter);
  assert.equal(result.status, "storage_error");
  assert.equal(result.safeToUse, false);
  assert.equal(result.envelope, null);
  assert.equal(result.loadedSlot, null);
  assert.equal(result.summary.readOperationCount, 3);
  assert.equal(JSON.stringify(result).includes("private-read-exception"), false);
  assertDeepFrozen(result);
});

test("existing-state gate blocks recovered, recovery-required, corrupt, and storage-error layouts", () => {
  const adapters: MemoryAdapter[] = [];

  const recovered = new MemoryAdapter();
  persist(recovered);
  persist(recovered, state(), LATER_AT);
  recovered.data.set(SLOT_B, "invalid");
  adapters.push(recovered);

  const recoveryRequired = new MemoryAdapter();
  recoveryRequired.data.set(SLOT_A, canonicalBackup());
  adapters.push(recoveryRequired);

  const corrupt = new MemoryAdapter();
  persist(corrupt);
  corrupt.data.set(SLOT_A, "invalid");
  adapters.push(corrupt);

  const storageError = new MemoryAdapter();
  storageError.onGet(MANIFEST, 1, { kind: "throw", message: "gate-private-error" });
  adapters.push(storageError);

  for (const adapter of adapters) {
    const writesBefore = adapter.writes().length;
    const result = persist(adapter, state(), "2026-07-13T20:40:15.000Z");
    assert.equal(["blocked", "storage_error"].includes(result.status), true);
    assert.equal(adapter.writes().length, writesBefore);
  }
});

test("zero, false, empty, null, valid negatives, and missing values round-trip exactly", () => {
  const adapter = new MemoryAdapter();
  const source = state();
  source.jarvisLearning = { zero: 0, off: false, empty: "", nullable: null };
  source.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  delete source.profile.name;
  assert.equal(persist(adapter, source).status, "committed");
  const payload = readFitCoreAtomicPersistence(adapter).envelope!.payload;
  assert.equal(payload.jarvisLearning.zero, 0);
  assert.equal(payload.jarvisLearning.off, false);
  assert.equal(payload.jarvisLearning.empty, "");
  assert.equal(payload.jarvisLearning.nullable, null);
  assert.equal(payload.userGoalsProfile.weeklyWeightChangeLb, -0.5);
  assert.equal(Object.hasOwn(payload.profile, "name"), false);
});

test("canonical slot and manifest bytes are deterministic without timestamp winner selection", () => {
  const first = new MemoryAdapter();
  const second = new MemoryAdapter();
  const stateA = state();
  stateA.jarvisLearning = { z: { beta: 2, alpha: 1 }, a: [3, 1, 2] };
  const stateB = state();
  stateB.jarvisLearning = { a: [3, 1, 2], z: { alpha: 1, beta: 2 } };
  persist(first, stateA);
  persist(second, stateB);
  assert.equal(first.data.get(SLOT_A), second.data.get(SLOT_A));
  assert.equal(first.data.get(MANIFEST), second.data.get(MANIFEST));
  assert.deepEqual(readFitCoreAtomicPersistence(first), readFitCoreAtomicPersistence(first));

  const ambiguous = new MemoryAdapter();
  ambiguous.data.set(SLOT_A, canonicalBackup(state(), LATER_AT));
  ambiguous.data.set(SLOT_B, canonicalBackup(state(), EXPORTED_AT));
  const result = readFitCoreAtomicPersistence(ambiguous);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.loadedSlot, null);
});

test("privacy boundary preserves stored payload but excludes it from write and failure reports", () => {
  const adapter = new MemoryAdapter();
  const source = sensitiveState();
  const write = persist(adapter, source);
  const stored = adapter.data.get(SLOT_A)!;
  for (const sentinel of [
    "sensitive-workout-name",
    "sensitive-exercise-name",
    "sensitive-meal-name",
    "sensitive-ai-message",
    "sensitive-supplement-name",
    "sensitive-recovery-note",
    "sensitive-goal-description",
    "sensitive-photo-metadata",
    "sensitive-audit-patch",
    "sensitive-unknown-warning-field",
  ]) {
    assert.equal(stored.includes(sentinel), true);
    assert.equal(JSON.stringify(write).includes(sentinel), false);
  }
  adapter.data.set(MANIFEST, "failed-manifest-sensitive-value");
  const failedRead = readFitCoreAtomicPersistence(adapter);
  assert.equal(failedRead.envelope, null);
  assert.equal(JSON.stringify(failedRead).includes("failed-manifest-sensitive-value"), false);
  assert.equal(JSON.stringify(write).includes(stored), false);
  assert.equal(JSON.stringify(write).includes("fingerprint"), false);
  assert.equal(JSON.stringify(write).includes("hash"), false);
});

test("all report variants are JSON-safe and preserve round-trip semantics", () => {
  const adapter = new MemoryAdapter();
  const empty = readFitCoreAtomicPersistence(adapter);
  const committed = persist(adapter);
  const loaded = readFitCoreAtomicPersistence(adapter);
  const blocked = persist(new MemoryAdapter(), { bad: undefined });
  for (const report of [empty, committed, loaded, blocked]) {
    const json = JSON.stringify(report);
    assert.doesNotThrow(() => JSON.parse(json));
    assert.deepEqual(JSON.parse(json), report);
    assert.equal(json.includes("[object Object]"), false);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.envelope)), loaded.envelope);
});

test("frozen input remains unchanged and results freeze without freezing the adapter", () => {
  const source = sensitiveState();
  const freeze = (value: unknown): void => {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
  };
  freeze(source);
  const before = JSON.stringify(source);
  const adapter = new MemoryAdapter();
  const write = persist(adapter, source);
  const read = readFitCoreAtomicPersistence(adapter);
  assert.equal(JSON.stringify(source), before);
  assertDeepFrozen(write);
  assertDeepFrozen(read);
  assert.equal(Object.isFrozen(adapter), false);
  adapter.marker = "still-mutable";
  assert.equal(adapter.marker, "still-mutable");
  assert.throws(() => {
    (read.envelope!.payload as Record<string, unknown>).version = 99;
  });
});

test("summary counts reconcile across write and read outcomes", () => {
  const emptyAdapter = new MemoryAdapter();
  const empty = readFitCoreAtomicPersistence(emptyAdapter);
  const first = persist(emptyAdapter);
  const second = persist(emptyAdapter, state(), LATER_AT);
  const active = readFitCoreAtomicPersistence(emptyAdapter);

  const blocked = persist(new MemoryAdapter(), { bad: undefined });
  const mismatchAdapter = new MemoryAdapter();
  mismatchAdapter.onSet(SLOT_A, 1, { kind: "store_as", value: "bad" });
  const mismatch = persist(mismatchAdapter);
  const indeterminateAdapter = new MemoryAdapter();
  indeterminateAdapter.onSet(MANIFEST, 1, { kind: "throw_before", message: "private" });
  indeterminateAdapter.onGet(MANIFEST, 2, { kind: "throw", message: "private" });
  const indeterminate = persist(indeterminateAdapter);

  for (const result of [first, second, blocked, mismatch, indeterminate]) {
    assertWriteSummary(result);
  }
  for (const result of [empty, active]) assertReadSummary(result);
});

test("approximately 2,000 records commit, load, serialize, and remain deterministic", () => {
  const source = state();
  source.workouts = Array.from({ length: 2_000 }, (_, index) => ({
    id: `atomic-workout-${index.toString().padStart(4, "0")}`,
    name: `Atomic Workout ${index}`,
    startedAt: AT + index,
    endedAt: AT + index + 1,
    exercises: [],
  }));
  const before = structuredClone(source);
  const first = new MemoryAdapter();
  const second = new MemoryAdapter();
  const firstWrite = persist(first, source);
  const secondWrite = persist(second, source);
  assert.equal(firstWrite.status, "committed");
  assert.deepEqual(firstWrite, secondWrite);
  assert.equal(first.data.get(SLOT_A), second.data.get(SLOT_A));
  assert.equal(first.data.get(MANIFEST), second.data.get(MANIFEST));
  const loaded = readFitCoreAtomicPersistence(first);
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.envelope!.payload, source);
  assert.deepEqual(source, before);
  assert.doesNotThrow(() => JSON.stringify(loaded));
});
