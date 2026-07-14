import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_ATOMIC_PERSISTENCE_KEYS,
  FITCORE_ATOMIC_PERSISTENCE_POLICY,
  persistFitCoreStateAtomically,
  type FitCoreAtomicPersistenceAdapter,
} from "../../src/lib/atomic-persistence.ts";
import { FITCORE_BACKUP_ENVELOPE_POLICY } from "../../src/lib/data-backup.ts";
import {
  FITCORE_REVISIONED_PERSISTENCE_POLICY,
  FITCORE_REVISION_RECORD_FORMAT,
  FITCORE_REVISION_RECORD_VERSION,
  FITCORE_REVISION_STORAGE_KEY,
  persistFitCoreStateWithRevision,
  readFitCoreRevisionedPersistence,
  type FitCoreRevisionedPersistenceReadResult,
  type FitCoreRevisionedPersistenceWriteResult,
} from "../../src/lib/revisioned-persistence.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const AT = 1_700_000_000_000;
const EXPORTED_AT = "2026-07-13T20:30:15.000Z";
const LATER_AT = "2026-07-13T20:31:15.000Z";
const TOKEN_1 = "0123456789abcdef0123456789abcdef";
const TOKEN_2 = "11111111111111111111111111111111";
const TOKEN_3 = "22222222222222222222222222222222";
const { manifest: MANIFEST, slotA: SLOT_A, slotB: SLOT_B } = FITCORE_ATOMIC_PERSISTENCE_KEYS;

type GetHook = (adapter: MemoryAdapter, key: string, count: number) => string | null | undefined;
type SetHook = (adapter: MemoryAdapter, key: string, value: string, count: number) => void;

class MemoryAdapter implements FitCoreAtomicPersistenceAdapter {
  readonly data = new Map<string, string>();
  readonly operations: string[] = [];
  readonly getCounts = new Map<string, number>();
  readonly setCounts = new Map<string, number>();
  getHook: GetHook | null = null;
  setHook: SetHook | null = null;

  getItem(key: string): string | null {
    this.operations.push(`get:${key}`);
    const count = (this.getCounts.get(key) ?? 0) + 1;
    this.getCounts.set(key, count);
    const hooked = this.getHook?.(this, key, count);
    if (hooked !== undefined) return hooked;
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.operations.push(`set:${key}`);
    const count = (this.setCounts.get(key) ?? 0) + 1;
    this.setCounts.set(key, count);
    if (this.setHook) this.setHook(this, key, value, count);
    else this.data.set(key, value);
  }

  writes(): string[] {
    return this.operations.filter((entry) => entry.startsWith("set:"));
  }
}

function state(): AppState {
  return structuredClone(defaultState);
}

function options(expectedRevision: number | null, writeToken: string, exportedAt = EXPORTED_AT) {
  return { expectedRevision, writeToken, exportedAt };
}

function persist(
  adapter: FitCoreAtomicPersistenceAdapter,
  value: unknown,
  expectedRevision: number | null,
  writeToken: string,
  exportedAt = EXPORTED_AT,
) {
  return persistFitCoreStateWithRevision(
    adapter,
    value,
    options(expectedRevision, writeToken, exportedAt),
  );
}

function revisionJson(revision: number, writeToken: string, activeSlot: "a" | "b"): string {
  return JSON.stringify({
    format: FITCORE_REVISION_RECORD_FORMAT,
    version: FITCORE_REVISION_RECORD_VERSION,
    policy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    atomicPolicy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    revision,
    writeToken,
    activeSlot,
  });
}

function assertDeepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
}

function assertWriteSummary(result: FitCoreRevisionedPersistenceWriteResult): void {
  assert.equal(result.summary.issueCount, result.issues.length);
  assert.equal(
    result.summary.warningCount,
    result.issues.filter(({ severity }) => severity === "warning").length,
  );
  assert.equal(
    result.summary.errorCount,
    result.issues.filter(({ severity }) => severity === "error").length,
  );
  for (const count of Object.values(result.summary)) {
    assert.equal(Number.isSafeInteger(count), true);
    assert.equal(count >= 0, true);
  }
}

function assertReadSummary(result: FitCoreRevisionedPersistenceReadResult): void {
  assert.equal(result.summary.issueCount, result.issues.length);
  assert.equal(
    result.summary.warningCount,
    result.issues.filter(({ severity }) => severity === "warning").length,
  );
  assert.equal(
    result.summary.errorCount,
    result.issues.filter(({ severity }) => severity === "error").length,
  );
}

function warningState(): AppState {
  const value = state();
  (value as unknown as Record<string, unknown>).futureWarning = "warning-sentinel";
  return value;
}

test("exports exact policies, format, version, key, and APIs", () => {
  assert.equal(FITCORE_REVISIONED_PERSISTENCE_POLICY, "fitcore_revisioned_persistence_v1");
  assert.equal(FITCORE_REVISION_RECORD_FORMAT, "fitcore_revision_record");
  assert.equal(FITCORE_REVISION_RECORD_VERSION, 1);
  assert.equal(FITCORE_REVISION_STORAGE_KEY, "fitcore.persistence.v1.revision");
  assert.equal(FITCORE_ATOMIC_PERSISTENCE_POLICY, "fitcore_atomic_persistence_v1");
  assert.equal(FITCORE_BACKUP_ENVELOPE_POLICY, "fitcore_backup_envelope_v1");
  assert.equal(typeof persistFitCoreStateWithRevision, "function");
  assert.equal(typeof readFitCoreRevisionedPersistence, "function");
});

test("empty read is non-writing and distinguishes null revision", () => {
  const adapter = new MemoryAdapter();
  const result = readFitCoreRevisionedPersistence(adapter);
  assert.equal(result.status, "empty");
  assert.equal(result.currentRevision, null);
  assert.equal(result.writeToken, null);
  assert.equal(result.envelope, null);
  assert.deepEqual(adapter.writes(), []);
  assert.equal(result.summary.atomicReadOperationCount, 3);
  assert.equal(result.summary.revisionReadOperationCount, 1);
  assertReadSummary(result);
});

test("first commit installs revision one and proves the complete binding", () => {
  const adapter = new MemoryAdapter();
  const source = state();
  const write = persist(adapter, source, null, TOKEN_1);
  assert.equal(write.status, "committed");
  assert.equal(write.safeToUse, true);
  assert.equal(write.committedRevision, 1);
  assert.equal(write.observedRevision, null);
  assert.equal(write.activeSlot, "a");
  assert.equal(write.writeToken, TOKEN_1);
  assert.deepEqual(JSON.parse(adapter.data.get(FITCORE_REVISION_STORAGE_KEY)!), {
    format: FITCORE_REVISION_RECORD_FORMAT,
    version: 1,
    policy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    atomicPolicy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    revision: 1,
    writeToken: TOKEN_1,
    activeSlot: "a",
  });
  const read = readFitCoreRevisionedPersistence(adapter);
  assert.equal(read.status, "loaded");
  assert.equal(read.currentRevision, 1);
  assert.equal(read.loadedSlot, "a");
  assert.deepEqual(read.envelope!.payload, source);
  assertDeepFrozen(write);
  assertDeepFrozen(read);
});

test("sequential commits increment exactly and follow alternating slots", () => {
  const adapter = new MemoryAdapter();
  const first = persist(adapter, state(), null, TOKEN_1);
  const second = persist(adapter, state(), 1, TOKEN_2, LATER_AT);
  const third = persist(adapter, state(), 2, TOKEN_3, "2026-07-13T20:32:15.000Z");
  assert.deepEqual(
    [first.committedRevision, second.committedRevision, third.committedRevision],
    [1, 2, 3],
  );
  assert.deepEqual([first.activeSlot, second.activeSlot, third.activeSlot], ["a", "b", "a"]);
  assert.equal(readFitCoreRevisionedPersistence(adapter).currentRevision, 3);
});

test("warning backup commits with review and full payload preservation", () => {
  const adapter = new MemoryAdapter();
  const source = warningState();
  const result = persist(adapter, source, null, TOKEN_1);
  assert.equal(result.status, "committed_with_warnings");
  assert.equal(result.requiresReview, true);
  const read = readFitCoreRevisionedPersistence(adapter);
  assert.equal(read.status, "loaded_with_warnings");
  assert.equal(read.requiresReview, true);
  assert.deepEqual(read.envelope!.payload, source);
});

test("stale expected revisions reject before every storage write", () => {
  const staleValues: (number | null)[] = [null, 0, 2];
  for (const expected of staleValues) {
    const adapter = new MemoryAdapter();
    persist(adapter, state(), null, TOKEN_1);
    const writesBefore = adapter.writes().length;
    const result = persist(adapter, state(), expected, TOKEN_2, LATER_AT);
    assert.equal(result.status, "stale_write_rejected");
    assert.equal(result.observedRevision, 1);
    assert.equal(result.committedRevision, null);
    assert.equal(adapter.writes().length, writesBefore);
    assertWriteSummary(result);
  }
  const empty = new MemoryAdapter();
  assert.equal(persist(empty, state(), 0, TOKEN_1).status, "stale_write_rejected");
  assert.deepEqual(empty.writes(), []);
});

test("invalid revisions, tokens, and options block privately", () => {
  const invalid = [
    { expectedRevision: -1, writeToken: TOKEN_1, exportedAt: EXPORTED_AT },
    { expectedRevision: 1.5, writeToken: TOKEN_1, exportedAt: EXPORTED_AT },
    { expectedRevision: Number.MAX_SAFE_INTEGER + 1, writeToken: TOKEN_1, exportedAt: EXPORTED_AT },
    { expectedRevision: "1", writeToken: TOKEN_1, exportedAt: EXPORTED_AT },
    { expectedRevision: null, writeToken: "short", exportedAt: EXPORTED_AT },
    { expectedRevision: null, writeToken: TOKEN_1.toUpperCase(), exportedAt: EXPORTED_AT },
    { expectedRevision: null, writeToken: "private-sensitive-token-text", exportedAt: EXPORTED_AT },
    { expectedRevision: null, writeToken: TOKEN_1 },
  ];
  for (const candidate of invalid) {
    const adapter = new MemoryAdapter();
    const result = persistFitCoreStateWithRevision(
      adapter,
      state(),
      candidate as { exportedAt: string; expectedRevision: number | null; writeToken: string },
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.writeToken, null);
    assert.deepEqual(adapter.writes(), []);
    assert.equal(JSON.stringify(result).includes("private-sensitive-token-text"), false);
  }
});

test("duplicate current token blocks without mutation or revision increment", () => {
  const adapter = new MemoryAdapter();
  persist(adapter, state(), null, TOKEN_1);
  const before = new Map(adapter.data);
  const result = persist(adapter, state(), 1, TOKEN_1, LATER_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.issues[0].code, "duplicate_write_token");
  assert.deepEqual(adapter.data, before);
  assert.equal(readFitCoreRevisionedPersistence(adapter).currentRevision, 1);
});

test("atomic storage without revision and revision without atomic require recovery", () => {
  const atomicOnly = new MemoryAdapter();
  persistFitCoreStateAtomically(atomicOnly, state(), { exportedAt: EXPORTED_AT });
  assert.equal(readFitCoreRevisionedPersistence(atomicOnly).status, "recovery_required");
  const writesBefore = atomicOnly.writes().length;
  assert.equal(persist(atomicOnly, state(), null, TOKEN_1).status, "blocked");
  assert.equal(atomicOnly.writes().length, writesBefore);

  const revisionOnly = new MemoryAdapter();
  revisionOnly.data.set(FITCORE_REVISION_STORAGE_KEY, revisionJson(1, TOKEN_1, "a"));
  const result = readFitCoreRevisionedPersistence(revisionOnly);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.envelope, null);
});

test("revision record validation is closed, canonical, and non-normalizing", () => {
  const mutations: ((value: Record<string, unknown>) => void)[] = [
    (value) => delete value.policy,
    (value) => (value.unknown = true),
    (value) => (value.format = "wrong"),
    (value) => (value.version = 2),
    (value) => (value.policy = "wrong"),
    (value) => (value.atomicPolicy = "wrong"),
    (value) => (value.revision = -1),
    (value) => (value.writeToken = "wrong"),
    (value) => (value.activeSlot = "c"),
  ];
  for (const mutate of mutations) {
    const adapter = new MemoryAdapter();
    persist(adapter, state(), null, TOKEN_1);
    const value = JSON.parse(adapter.data.get(FITCORE_REVISION_STORAGE_KEY)!) as Record<
      string,
      unknown
    >;
    mutate(value);
    adapter.data.set(FITCORE_REVISION_STORAGE_KEY, JSON.stringify(value));
    const result = readFitCoreRevisionedPersistence(adapter);
    assert.equal(result.status, "recovery_required");
    assert.equal(result.envelope, null);
  }
  const malformed = new MemoryAdapter();
  persist(malformed, state(), null, TOKEN_1);
  malformed.data.set(FITCORE_REVISION_STORAGE_KEY, "{private-malformed-revision");
  assert.equal(readFitCoreRevisionedPersistence(malformed).status, "recovery_required");
});

test("revision slot mismatch blocks reads and writes", () => {
  const adapter = new MemoryAdapter();
  persist(adapter, state(), null, TOKEN_1);
  adapter.data.set(FITCORE_REVISION_STORAGE_KEY, revisionJson(1, TOKEN_1, "b"));
  assert.equal(readFitCoreRevisionedPersistence(adapter).status, "recovery_required");
  const writesBefore = adapter.writes().length;
  assert.equal(persist(adapter, state(), 1, TOKEN_2, LATER_AT).status, "blocked");
  assert.equal(adapter.writes().length, writesBefore);
});

test("revision overflow blocks before Task 5", () => {
  const adapter = new MemoryAdapter();
  persist(adapter, state(), null, TOKEN_1);
  adapter.data.set(
    FITCORE_REVISION_STORAGE_KEY,
    revisionJson(Number.MAX_SAFE_INTEGER, TOKEN_1, "a"),
  );
  const writesBefore = adapter.writes().length;
  const result = persist(adapter, state(), Number.MAX_SAFE_INTEGER, TOKEN_2, LATER_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.issues[0].code, "revision_overflow");
  assert.equal(adapter.writes().length, writesBefore);
});

test("concurrent revision mutation before installation is detected without overwrite", () => {
  const adapter = new MemoryAdapter();
  const competing = revisionJson(1, TOKEN_3, "a");
  adapter.getHook = (target, key, count) => {
    if (key === FITCORE_REVISION_STORAGE_KEY && count === 2) {
      target.data.set(key, competing);
      return competing;
    }
    return undefined;
  };
  const result = persist(adapter, state(), null, TOKEN_1);
  assert.equal(result.status, "conflict_detected");
  assert.equal(result.safeToUse, false);
  assert.equal(adapter.data.get(FITCORE_REVISION_STORAGE_KEY), competing);
  assert.equal(adapter.setCounts.get(FITCORE_REVISION_STORAGE_KEY) ?? 0, 0);
});

test("concurrent final revision overwrite detects token and revision mismatch", () => {
  const adapter = new MemoryAdapter();
  const competing = revisionJson(2, TOKEN_3, "a");
  adapter.getHook = (target, key, count) => {
    if (key === FITCORE_REVISION_STORAGE_KEY && count === 4) {
      target.data.set(key, competing);
      return competing;
    }
    return undefined;
  };
  const result = persist(adapter, state(), null, TOKEN_1);
  assert.equal(result.status, "conflict_detected");
  assert.equal(
    result.issues.some(({ code }) => code === "final_revision_mismatch"),
    true,
  );
});

test("concurrent valid backup overwrite fails final byte binding", () => {
  const other = new MemoryAdapter();
  const otherState = state();
  otherState.jarvisLearning = { other: "different-backup-sensitive" };
  persistFitCoreStateAtomically(other, otherState, { exportedAt: LATER_AT });
  const differentBackup = other.data.get(SLOT_A)!;

  const adapter = new MemoryAdapter();
  adapter.setHook = (target, key, value) => {
    target.data.set(key, value);
    if (key === FITCORE_REVISION_STORAGE_KEY) target.data.set(SLOT_A, differentBackup);
  };
  const result = persist(adapter, state(), null, TOKEN_1);
  assert.equal(result.status, "conflict_detected");
  assert.equal(result.issues[0].code, "final_backup_mismatch");
  assert.equal(JSON.stringify(result).includes("different-backup-sensitive"), false);
});

test("concurrent manifest active-slot change is not accepted", () => {
  const adapter = new MemoryAdapter();
  adapter.setHook = (target, key, value) => {
    target.data.set(key, value);
    if (key === FITCORE_REVISION_STORAGE_KEY) {
      const manifest = JSON.parse(target.data.get(MANIFEST)!) as Record<string, unknown>;
      manifest.activeSlot = "b";
      manifest.previousSlot = "a";
      target.data.set(MANIFEST, JSON.stringify(manifest));
    }
  };
  const result = persist(adapter, state(), null, TOKEN_1);
  assert.equal(result.status, "conflict_detected");
  assert.equal(result.safeToUse, false);
});

test("revision write failures distinguish old, new, and unreadable outcomes", () => {
  const old = new MemoryAdapter();
  old.setHook = (target, key, value) => {
    if (key === FITCORE_REVISION_STORAGE_KEY) throw new Error("private-old-write-error");
    target.data.set(key, value);
  };
  const oldResult = persist(old, state(), null, TOKEN_1);
  assert.equal(oldResult.status, "storage_error");
  assert.equal(JSON.stringify(oldResult).includes("private-old-write-error"), false);

  const installed = new MemoryAdapter();
  installed.setHook = (target, key, value) => {
    target.data.set(key, value);
    if (key === FITCORE_REVISION_STORAGE_KEY) throw new Error("private-after-write-error");
  };
  const installedResult = persist(installed, state(), null, TOKEN_1);
  assert.equal(installedResult.status, "committed");
  assert.equal(installedResult.issues[0].code, "revision_write_failed");

  const unknown = new MemoryAdapter();
  unknown.setHook = (target, key, value) => {
    if (key === FITCORE_REVISION_STORAGE_KEY) throw new Error("private-unknown-write");
    target.data.set(key, value);
  };
  unknown.getHook = (_target, key, count) => {
    if (key === FITCORE_REVISION_STORAGE_KEY && count === 3)
      throw new Error("private-unknown-read");
    return undefined;
  };
  const unknownResult = persist(unknown, state(), null, TOKEN_1);
  assert.equal(unknownResult.status, "indeterminate");
  assert.equal(unknownResult.safeToUse, false);
});

test("silent revision readback mismatch is verification failure", () => {
  const adapter = new MemoryAdapter();
  adapter.setHook = (target, key, value) => {
    if (key !== FITCORE_REVISION_STORAGE_KEY) target.data.set(key, value);
  };
  const result = persist(adapter, state(), null, TOKEN_1);
  assert.equal(result.status, "verification_failed");
  assert.equal(result.issues[0].code, "revision_readback_mismatch");
});

test("representative Task 5 verification failure maps without success", () => {
  const adapter = new MemoryAdapter();
  persist(adapter, state(), null, TOKEN_1);
  adapter.setHook = (target, key, value) => {
    target.data.set(key, key === SLOT_B ? "atomic-private-corruption" : value);
  };
  const result = persist(adapter, state(), 1, TOKEN_2, LATER_AT);
  assert.equal(result.status, "verification_failed");
  assert.equal(result.issues[0].code, "atomic_verification_failed");
  assert.equal(JSON.stringify(result).includes("atomic-private-corruption"), false);
});

test("missing versus zero values and revision null remain distinct", () => {
  const adapter = new MemoryAdapter();
  const source = state();
  source.jarvisLearning = { zero: 0, off: false, empty: "", nullable: null };
  source.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  delete source.profile.name;
  assert.equal(persist(adapter, source, null, TOKEN_1).status, "committed");
  const payload = readFitCoreRevisionedPersistence(adapter).envelope!.payload;
  assert.equal(payload.jarvisLearning.zero, 0);
  assert.equal(payload.jarvisLearning.off, false);
  assert.equal(payload.jarvisLearning.empty, "");
  assert.equal(payload.jarvisLearning.nullable, null);
  assert.equal(payload.userGoalsProfile.weeklyWeightChangeLb, -0.5);
  assert.equal(Object.hasOwn(payload.profile, "name"), false);
});

test("revision and backup persistence are deterministic", () => {
  const first = new MemoryAdapter();
  const second = new MemoryAdapter();
  const left = state();
  left.jarvisLearning = { z: { b: 2, a: 1 }, a: [3, 2, 1] };
  const right = state();
  right.jarvisLearning = { a: [3, 2, 1], z: { a: 1, b: 2 } };
  const firstResult = persist(first, left, null, TOKEN_1);
  const secondResult = persist(second, right, null, TOKEN_1);
  assert.deepEqual(firstResult, secondResult);
  assert.equal(first.data.get(SLOT_A), second.data.get(SLOT_A));
  assert.equal(
    first.data.get(FITCORE_REVISION_STORAGE_KEY),
    second.data.get(FITCORE_REVISION_STORAGE_KEY),
  );
  assert.deepEqual(
    readFitCoreRevisionedPersistence(first),
    readFitCoreRevisionedPersistence(first),
  );
});

test("reports are private while successful storage and reads preserve payload", () => {
  const adapter = new MemoryAdapter();
  const source = warningState();
  source.workouts = [
    {
      id: "private-id",
      name: "private-workout-sentinel",
      startedAt: AT,
      endedAt: AT + 1,
      exercises: [],
    },
  ];
  source.aiMessages = [
    { id: "private-ai-id", role: "user", content: "private-ai-sentinel", createdAt: AT },
  ];
  const write = persist(adapter, source, null, TOKEN_1);
  const read = readFitCoreRevisionedPersistence(adapter);
  assert.equal(adapter.data.get(SLOT_A)!.includes("private-workout-sentinel"), true);
  assert.deepEqual(read.envelope!.payload, source);
  assert.equal(JSON.stringify(write).includes("private-workout-sentinel"), false);
  assert.equal(JSON.stringify(write).includes("private-ai-sentinel"), false);
  assert.equal(JSON.stringify(write).includes(adapter.data.get(SLOT_A)!), false);
  assert.equal(JSON.stringify(write).includes("fingerprint"), false);
});

test("all results serialize, round-trip, and remain deeply frozen", () => {
  const adapter = new MemoryAdapter();
  const empty = readFitCoreRevisionedPersistence(adapter);
  const committed = persist(adapter, state(), null, TOKEN_1);
  const loaded = readFitCoreRevisionedPersistence(adapter);
  const stale = persist(adapter, state(), null, TOKEN_2, LATER_AT);
  for (const result of [empty, committed, loaded, stale]) {
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    assertDeepFrozen(result);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.envelope)), loaded.envelope);
});

test("frozen source is accepted without freezing adapter or mutating input", () => {
  const source = warningState();
  const freeze = (value: unknown): void => {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
  };
  freeze(source);
  const before = JSON.stringify(source);
  const adapter = new MemoryAdapter();
  const result = persist(adapter, source, null, TOKEN_1);
  assert.equal(result.safeToUse, true);
  assert.equal(JSON.stringify(source), before);
  assert.equal(Object.isFrozen(adapter), false);
  assert.throws(() => {
    (
      readFitCoreRevisionedPersistence(adapter).envelope!.payload as Record<string, unknown>
    ).version = 9;
  });
});

test("summary counts reconcile for reads, commits, stale, conflict, and failures", () => {
  const adapter = new MemoryAdapter();
  const empty = readFitCoreRevisionedPersistence(adapter);
  const first = persist(adapter, state(), null, TOKEN_1);
  const loaded = readFitCoreRevisionedPersistence(adapter);
  const stale = persist(adapter, state(), null, TOKEN_2, LATER_AT);
  for (const result of [first, stale]) assertWriteSummary(result);
  for (const result of [empty, loaded]) assertReadSummary(result);
  assert.equal(first.summary.revisionWriteOperationCount, 1);
  assert.equal(stale.summary.atomicWriteOperationCount, 0);
});

test("approximately 2,000 records complete two revisioned commits losslessly", () => {
  const source = state();
  source.workouts = Array.from({ length: 2_000 }, (_, index) => ({
    id: `revision-workout-${index.toString().padStart(4, "0")}`,
    name: `Revision Workout ${index}`,
    startedAt: AT + index,
    endedAt: AT + index + 1,
    exercises: [],
  }));
  const before = structuredClone(source);
  const adapter = new MemoryAdapter();
  const first = persist(adapter, source, null, TOKEN_1);
  const firstBytes = adapter.data.get(SLOT_A);
  const second = persist(adapter, source, 1, TOKEN_2, LATER_AT);
  assert.equal(first.committedRevision, 1);
  assert.equal(second.committedRevision, 2);
  assert.equal(second.activeSlot, "b");
  assert.equal(adapter.data.get(SLOT_A), firstBytes);
  const read = readFitCoreRevisionedPersistence(adapter);
  assert.equal(read.currentRevision, 2);
  assert.deepEqual(read.envelope!.payload, source);
  assert.deepEqual(source, before);
  assert.doesNotThrow(() => JSON.stringify(read));
});
