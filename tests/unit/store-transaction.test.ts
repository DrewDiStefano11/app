import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_ATOMIC_PERSISTENCE_KEYS,
  persistFitCoreStateAtomically,
  type FitCoreAtomicPersistenceAdapter,
} from "../../src/lib/atomic-persistence.ts";
import {
  FITCORE_BACKUP_ENVELOPE_POLICY,
  createFitCoreBackupEnvelope,
} from "../../src/lib/data-backup.ts";
import {
  FITCORE_REVISIONED_PERSISTENCE_POLICY,
  FITCORE_REVISION_STORAGE_KEY,
  persistFitCoreStateWithRevision,
  readFitCoreRevisionedPersistence,
} from "../../src/lib/revisioned-persistence.ts";
import {
  FITCORE_STORE_SNAPSHOT_FORMAT,
  FITCORE_STORE_SNAPSHOT_VERSION,
  FITCORE_STORE_TRANSACTION_POLICY,
  commitFitCoreStoreTransaction,
  readFitCoreStoreTransactionSnapshot,
  type FitCoreStoreTransactionCommitResult,
  type FitCoreStoreTransactionReadResult,
  type FitCoreStoreTransactionRequest,
} from "../../src/lib/store-transaction.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const AT = 1_700_000_000_000;
const EXPORTED_AT = "2026-07-13T20:30:15.000Z";
const LATER_AT = "2026-07-13T20:31:15.000Z";
const THIRD_AT = "2026-07-13T20:32:15.000Z";
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

function changedState(label = "changed"): AppState {
  const value = state();
  value.jarvisLearning = { transactionValue: label };
  return value;
}

function warningState(label = "warning"): AppState {
  const value = state();
  (value as unknown as Record<string, unknown>).futureTransactionField = label;
  return value;
}

function request(
  expectedRevision: number | null,
  baseState: unknown | null,
  nextState: unknown,
  writeToken: string,
  exportedAt = EXPORTED_AT,
): FitCoreStoreTransactionRequest {
  return { expectedRevision, baseState, nextState, exportedAt, writeToken };
}

function commit(
  adapter: FitCoreAtomicPersistenceAdapter,
  expectedRevision: number | null,
  baseState: unknown | null,
  nextState: unknown,
  writeToken: string,
  exportedAt = EXPORTED_AT,
) {
  return commitFitCoreStoreTransaction(
    adapter,
    request(expectedRevision, baseState, nextState, writeToken, exportedAt),
  );
}

function directRevisionedCommit(
  adapter: FitCoreAtomicPersistenceAdapter,
  value: unknown,
  expectedRevision: number | null,
  writeToken: string,
  exportedAt = EXPORTED_AT,
) {
  return persistFitCoreStateWithRevision(adapter, value, {
    expectedRevision,
    writeToken,
    exportedAt,
  });
}

function assertDeepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
}

function assertReadSummary(result: FitCoreStoreTransactionReadResult): void {
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

function assertCommitSummary(result: FitCoreStoreTransactionCommitResult): void {
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

function copyStorage(target: MemoryAdapter, source: MemoryAdapter): void {
  target.data.clear();
  for (const [key, value] of source.data) target.data.set(key, value);
}

function replaceAtPostCommitRead(target: MemoryAdapter, replacement: MemoryAdapter): void {
  target.getHook = (adapter, key, count) => {
    if (key === MANIFEST && count === 6) {
      copyStorage(adapter, replacement);
      return adapter.data.get(key) ?? null;
    }
    return undefined;
  };
}

test("exports exact policies, snapshot constants, and APIs", () => {
  assert.equal(FITCORE_STORE_TRANSACTION_POLICY, "fitcore_store_transaction_v1");
  assert.equal(FITCORE_STORE_SNAPSHOT_FORMAT, "fitcore_store_snapshot");
  assert.equal(FITCORE_STORE_SNAPSHOT_VERSION, 1);
  assert.equal(FITCORE_REVISIONED_PERSISTENCE_POLICY, "fitcore_revisioned_persistence_v1");
  assert.equal(FITCORE_BACKUP_ENVELOPE_POLICY, "fitcore_backup_envelope_v1");
  assert.equal(typeof readFitCoreStoreTransactionSnapshot, "function");
  assert.equal(typeof commitFitCoreStoreTransaction, "function");
});

test("empty read returns a closed frozen snapshot without inventing state or writing", () => {
  const adapter = new MemoryAdapter();
  const result = readFitCoreStoreTransactionSnapshot(adapter);
  assert.equal(result.status, "empty");
  assert.equal(result.safeToApply, true);
  assert.equal(result.requiresReload, false);
  assert.deepEqual(result.snapshot, {
    format: FITCORE_STORE_SNAPSHOT_FORMAT,
    version: FITCORE_STORE_SNAPSHOT_VERSION,
    policy: FITCORE_STORE_TRANSACTION_POLICY,
    revisionPolicy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    revision: null,
    writeToken: null,
    exportedAt: null,
    state: null,
  });
  assert.deepEqual(adapter.writes(), []);
  assertDeepFrozen(result);
  assertReadSummary(result);
});

test("ready and warning reads preserve complete detached state and metadata", () => {
  for (const [source, expectedStatus, review] of [
    [state(), "ready", false],
    [warningState(), "ready_with_warnings", true],
  ] as const) {
    const adapter = new MemoryAdapter();
    directRevisionedCommit(adapter, source, null, TOKEN_1);
    const result = readFitCoreStoreTransactionSnapshot(adapter);
    assert.equal(result.status, expectedStatus);
    assert.equal(result.safeToApply, true);
    assert.equal(result.requiresReview, review);
    assert.equal(result.snapshot!.revision, 1);
    assert.equal(result.snapshot!.writeToken, TOKEN_1);
    assert.equal(result.snapshot!.exportedAt, EXPORTED_AT);
    assert.deepEqual(result.snapshot!.state, source);
    assert.notEqual(result.snapshot!.state, source);
    assertDeepFrozen(result);
  }
});

test("recovery, corrupt, and storage-error reads are reload-only and private", () => {
  const recovery = new MemoryAdapter();
  persistFitCoreStateAtomically(recovery, state(), { exportedAt: EXPORTED_AT });
  const corrupt = new MemoryAdapter();
  corrupt.data.set(MANIFEST, "{private-corrupt-manifest");
  const broken = new MemoryAdapter();
  broken.getHook = () => {
    throw new Error("private-read-error");
  };
  for (const [adapter, expected] of [
    [recovery, "recovery_required"],
    [corrupt, "corrupt"],
    [broken, "storage_error"],
  ] as const) {
    const result = readFitCoreStoreTransactionSnapshot(adapter);
    assert.equal(result.status, expected);
    assert.equal(result.safeToApply, false);
    assert.equal(result.requiresReload, true);
    assert.equal(result.snapshot, null);
    assert.equal(JSON.stringify(result).includes("private-"), false);
  }
});

test("first transaction commits revision one and final authoritative read matches", () => {
  const adapter = new MemoryAdapter();
  const next = changedState("first");
  const result = commit(adapter, null, null, next, TOKEN_1);
  assert.equal(result.status, "committed");
  assert.equal(result.safeToApply, true);
  assert.equal(result.committedRevision, 1);
  assert.equal(result.snapshot!.revision, 1);
  assert.equal(result.snapshot!.writeToken, TOKEN_1);
  assert.equal(result.snapshot!.exportedAt, EXPORTED_AT);
  assert.deepEqual(result.snapshot!.state, next);
  assert.deepEqual(readFitCoreStoreTransactionSnapshot(adapter).snapshot, result.snapshot);
  assert.equal(result.summary.revisionedWriteCount, 1);
  assert.equal(result.summary.revisionedReadCount, 2);
  assertCommitSummary(result);
});

test("sequential transactions increment revisions and preserve exact bases", () => {
  const adapter = new MemoryAdapter();
  const firstState = changedState("one");
  const secondState = changedState("two");
  const thirdState = changedState("three");
  const first = commit(adapter, null, null, firstState, TOKEN_1);
  const second = commit(adapter, 1, firstState, secondState, TOKEN_2, LATER_AT);
  const third = commit(adapter, 2, secondState, thirdState, TOKEN_3, THIRD_AT);
  assert.deepEqual(
    [first.committedRevision, second.committedRevision, third.committedRevision],
    [1, 2, 3],
  );
  assert.deepEqual(third.snapshot!.state, thirdState);
  const manifest = JSON.parse(adapter.data.get(MANIFEST)!) as { activeSlot: string };
  assert.equal(manifest.activeSlot, "a");
});

test("stale snapshots reject all requested revision variants before every write", () => {
  const variants: (number | null)[] = [null, 0, 2, 9];
  for (const expected of variants) {
    const adapter = new MemoryAdapter();
    const current = changedState("current");
    directRevisionedCommit(adapter, current, null, TOKEN_1);
    const writes = adapter.writes().length;
    const result = commit(adapter, expected, current, changedState("next"), TOKEN_2, LATER_AT);
    assert.equal(result.status, "stale_snapshot");
    assert.equal(result.observedRevision, 1);
    assert.equal(result.safeToApply, false);
    assert.equal(result.requiresReload, true);
    assert.equal(result.snapshot, null);
    assert.equal(result.summary.revisionedWriteCount, 0);
    assert.equal(adapter.writes().length, writes);
  }
});

test("base-state mismatch is private and non-writing", () => {
  const adapter = new MemoryAdapter();
  const current = changedState("authoritative-sensitive");
  const supplied = changedState("base-sensitive");
  const next = changedState("next-sensitive");
  directRevisionedCommit(adapter, current, null, TOKEN_1);
  const writes = adapter.writes().length;
  const result = commit(adapter, 1, supplied, next, TOKEN_2, LATER_AT);
  assert.equal(result.status, "base_state_mismatch");
  assert.equal(result.requiresReload, true);
  assert.equal(result.summary.revisionedWriteCount, 0);
  assert.equal(adapter.writes().length, writes);
  const json = JSON.stringify(result);
  for (const sentinel of ["authoritative-sensitive", "base-sensitive", "next-sensitive"])
    assert.equal(json.includes(sentinel), false);
  assert.equal(json.includes("diff"), false);
});

test("canonical base comparison ignores object order and preserves array order", () => {
  const current = warningState("canonical");
  current.jarvisLearning = {
    z: { b: 2, a: 1 },
    a: [1, 2, 3],
    zero: 0,
    off: false,
    empty: "",
    nil: null,
  };
  const reordered = warningState("canonical");
  reordered.jarvisLearning = {
    nil: null,
    empty: "",
    off: false,
    zero: 0,
    a: [1, 2, 3],
    z: { a: 1, b: 2 },
  };
  const adapter = new MemoryAdapter();
  directRevisionedCommit(adapter, current, null, TOKEN_1);
  const noChange = commit(adapter, 1, reordered, reordered, TOKEN_2, LATER_AT);
  assert.equal(noChange.status, "no_change");

  const arrayChanged = structuredClone(reordered);
  (arrayChanged.jarvisLearning.a as number[]).reverse();
  const mismatch = commit(adapter, 1, arrayChanged, changedState(), TOKEN_2, LATER_AT);
  assert.equal(mismatch.status, "base_state_mismatch");
});

test("invalid bases and empty relationships block before Task 6 writes", () => {
  const invalidValues: unknown[] = [{ bad: undefined }, { bad: -0 }, []];
  for (const base of invalidValues) {
    const adapter = new MemoryAdapter();
    const current = state();
    directRevisionedCommit(adapter, current, null, TOKEN_1);
    const result = commit(adapter, 1, base, changedState(), TOKEN_2, LATER_AT);
    assert.equal(result.status, "blocked");
    assert.equal(result.summary.revisionedWriteCount, 0);
  }
  const unsafe = state() as unknown as Record<string, unknown>;
  Object.defineProperty(unsafe, "__proto__", { value: "private-unsafe", enumerable: true });
  const loaded = new MemoryAdapter();
  directRevisionedCommit(loaded, state(), null, TOKEN_1);
  assert.equal(commit(loaded, 1, unsafe, changedState(), TOKEN_2).status, "blocked");
  assert.equal(
    commit(new MemoryAdapter(), null, state(), changedState(), TOKEN_1).status,
    "blocked",
  );
  assert.equal(commit(loaded, 1, null, changedState(), TOKEN_2).status, "blocked");
});

test("no-change preserves revision and token and performs no storage write", () => {
  for (const current of [state(), warningState("review")]) {
    const adapter = new MemoryAdapter();
    directRevisionedCommit(adapter, current, null, TOKEN_1);
    const before = new Map(adapter.data);
    const result = commit(
      adapter,
      1,
      structuredClone(current),
      structuredClone(current),
      TOKEN_2,
      LATER_AT,
    );
    assert.equal(result.status, "no_change");
    assert.equal(result.committedRevision, 1);
    assert.equal(result.writeToken, TOKEN_1);
    assert.equal(result.safeToApply, true);
    assert.equal(
      result.requiresReview,
      current !== defaultState && Object.hasOwn(current, "futureTransactionField"),
    );
    assert.equal(result.summary.revisionedWriteCount, 0);
    assert.deepEqual(adapter.data, before);
    assert.deepEqual(result.snapshot!.state, current);
  }
});

test("a changed transaction writes once, increments, and leaves caller bases unchanged", () => {
  const adapter = new MemoryAdapter();
  const base = changedState("base");
  const next = changedState("next");
  directRevisionedCommit(adapter, base, null, TOKEN_1);
  const baseBefore = structuredClone(base);
  const nextBefore = structuredClone(next);
  const result = commit(adapter, 1, base, next, TOKEN_2, LATER_AT);
  assert.equal(result.status, "committed");
  assert.equal(result.committedRevision, 2);
  assert.equal(result.summary.revisionedWriteCount, 1);
  assert.deepEqual(result.snapshot!.state, next);
  assert.deepEqual(base, baseBefore);
  assert.deepEqual(next, nextBefore);
});

test("warning transaction is safe, reviewable, and complete", () => {
  const adapter = new MemoryAdapter();
  const next = warningState("complete-warning");
  const result = commit(adapter, null, null, next, TOKEN_1);
  assert.equal(result.status, "committed_with_warnings");
  assert.equal(result.safeToApply, true);
  assert.equal(result.requiresReview, true);
  assert.deepEqual(result.snapshot!.state, next);
});

test("Task 6 blocked, storage, verification, conflict, and indeterminate statuses map exactly", () => {
  const cases: [string, (adapter: MemoryAdapter) => void, string][] = [
    [
      "blocked",
      (adapter) => {
        directRevisionedCommit(adapter, state(), null, TOKEN_1);
      },
      "blocked",
    ],
    [
      "storage_error",
      (adapter) => {
        adapter.setHook = (target, key, value) => {
          if (key === FITCORE_REVISION_STORAGE_KEY) throw new Error("private-storage");
          target.data.set(key, value);
        };
      },
      "storage_error",
    ],
    [
      "verification_failed",
      (adapter) => {
        adapter.setHook = (target, key, value) => {
          if (key !== FITCORE_REVISION_STORAGE_KEY) target.data.set(key, value);
        };
      },
      "verification_failed",
    ],
    [
      "conflict_detected",
      (adapter) => {
        adapter.getHook = (target, key, count) => {
          if (key === FITCORE_REVISION_STORAGE_KEY && count === 3) {
            target.data.set(key, '{"competing":true}');
            return target.data.get(key)!;
          }
          return undefined;
        };
      },
      "conflict_detected",
    ],
    [
      "indeterminate",
      (adapter) => {
        adapter.setHook = (target, key, value) => {
          if (key === FITCORE_REVISION_STORAGE_KEY) throw new Error("private-indeterminate");
          target.data.set(key, value);
        };
        adapter.getHook = (_target, key, count) => {
          if (key === FITCORE_REVISION_STORAGE_KEY && count === 4)
            throw new Error("private-indeterminate-read");
          return undefined;
        };
      },
      "indeterminate",
    ],
  ];
  for (const [name, configure, expected] of cases) {
    const adapter = new MemoryAdapter();
    configure(adapter);
    const base = name === "blocked" ? state() : null;
    const expectedRevision = name === "blocked" ? 1 : null;
    const token = name === "blocked" ? TOKEN_1 : TOKEN_2;
    const result = commit(adapter, expectedRevision, base, changedState(name), token, LATER_AT);
    assert.equal(result.status, expected, name);
    assert.equal(result.safeToApply, false, name);
    assert.equal(result.snapshot, null, name);
  }
});

test("post-commit independent read failure is indeterminate and does not retry", () => {
  const adapter = new MemoryAdapter();
  adapter.getHook = (_target, key, count) => {
    if (key === FITCORE_REVISION_STORAGE_KEY && count === 6)
      throw new Error("private-postcommit-read");
    return undefined;
  };
  const result = commit(adapter, null, null, changedState("postcommit"), TOKEN_1);
  assert.equal(result.status, "indeterminate");
  assert.equal(result.summary.revisionedWriteCount, 1);
  assert.equal(result.summary.revisionedReadCount, 2);
  assert.equal(result.snapshot, null);
  assert.equal(JSON.stringify(result).includes("private-postcommit-read"), false);
});

test("final revision mismatch detects a coherent competing transaction", () => {
  const replacement = new MemoryAdapter();
  const one = changedState("replacement-one");
  directRevisionedCommit(replacement, one, null, TOKEN_2, EXPORTED_AT);
  directRevisionedCommit(replacement, changedState("replacement-two"), 1, TOKEN_3, LATER_AT);
  const adapter = new MemoryAdapter();
  replaceAtPostCommitRead(adapter, replacement);
  const result = commit(adapter, null, null, changedState("attempt"), TOKEN_1);
  assert.equal(result.status, "conflict_detected");
  assert.equal(result.issues[0].code, "final_revision_mismatch");
});

test("final token mismatch detects a coherent competing token", () => {
  const replacement = new MemoryAdapter();
  directRevisionedCommit(replacement, changedState("attempt"), null, TOKEN_2, EXPORTED_AT);
  const adapter = new MemoryAdapter();
  replaceAtPostCommitRead(adapter, replacement);
  const result = commit(adapter, null, null, changedState("attempt"), TOKEN_1);
  assert.equal(result.status, "conflict_detected");
  assert.equal(result.issues[0].code, "final_token_mismatch");
});

test("final timestamp mismatch rejects a coherent differently timestamped envelope", () => {
  const replacement = new MemoryAdapter();
  directRevisionedCommit(replacement, changedState("attempt"), null, TOKEN_1, LATER_AT);
  const adapter = new MemoryAdapter();
  replaceAtPostCommitRead(adapter, replacement);
  const result = commit(adapter, null, null, changedState("attempt"), TOKEN_1, EXPORTED_AT);
  assert.equal(result.status, "conflict_detected");
  assert.equal(result.issues[0].code, "final_exported_at_mismatch");
});

test("final state mismatch rejects different canonical bytes", () => {
  const replacement = new MemoryAdapter();
  directRevisionedCommit(replacement, changedState("replacement"), null, TOKEN_1, EXPORTED_AT);
  const adapter = new MemoryAdapter();
  replaceAtPostCommitRead(adapter, replacement);
  const result = commit(adapter, null, null, changedState("attempt"), TOKEN_1, EXPORTED_AT);
  assert.equal(result.status, "conflict_detected");
  assert.equal(result.issues[0].code, "final_state_mismatch");
  assert.equal(result.snapshot, null);
});

test("invalid requests block privately without reads or writes", () => {
  const invalid: unknown[] = [
    null,
    {},
    {
      expectedRevision: -1,
      baseState: null,
      nextState: state(),
      exportedAt: EXPORTED_AT,
      writeToken: TOKEN_1,
    },
    {
      expectedRevision: 1.5,
      baseState: null,
      nextState: state(),
      exportedAt: EXPORTED_AT,
      writeToken: TOKEN_1,
    },
    {
      expectedRevision: null,
      baseState: null,
      nextState: state(),
      exportedAt: "bad-time",
      writeToken: TOKEN_1,
    },
    {
      expectedRevision: null,
      baseState: null,
      nextState: state(),
      exportedAt: EXPORTED_AT,
      writeToken: "private-invalid-token",
    },
    { expectedRevision: null, baseState: null, exportedAt: EXPORTED_AT, writeToken: TOKEN_1 },
  ];
  for (const candidate of invalid) {
    const adapter = new MemoryAdapter();
    const result = commitFitCoreStoreTransaction(
      adapter,
      candidate as FitCoreStoreTransactionRequest,
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.summary.revisionedReadCount, 0);
    assert.deepEqual(adapter.operations, []);
    assert.equal(JSON.stringify(result).includes("private-invalid-token"), false);
  }
  let accessorCalled = false;
  const accessorRequest: Record<string, unknown> = {
    expectedRevision: null,
    baseState: null,
    exportedAt: EXPORTED_AT,
    writeToken: TOKEN_1,
  };
  Object.defineProperty(accessorRequest, "nextState", {
    enumerable: true,
    get: () => {
      accessorCalled = true;
      return state();
    },
  });
  const accessorResult = commitFitCoreStoreTransaction(
    new MemoryAdapter(),
    accessorRequest as unknown as FitCoreStoreTransactionRequest,
  );
  assert.equal(accessorResult.status, "blocked");
  assert.equal(accessorCalled, false);
});

test("missing, zero, false, empty, null, and valid negatives remain exact", () => {
  const adapter = new MemoryAdapter();
  const next = state();
  next.jarvisLearning = { zero: 0, off: false, empty: "", nullable: null };
  next.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  delete next.profile.name;
  const result = commit(adapter, null, null, next, TOKEN_1);
  const stored = result.snapshot!.state as unknown as AppState;
  assert.equal(stored.jarvisLearning.zero, 0);
  assert.equal(stored.jarvisLearning.off, false);
  assert.equal(stored.jarvisLearning.empty, "");
  assert.equal(stored.jarvisLearning.nullable, null);
  assert.equal(stored.userGoalsProfile.weeklyWeightChangeLb, -0.5);
  assert.equal(Object.hasOwn(stored.profile, "name"), false);
});

test("unsafe reports exclude every state, token, exception, raw-byte, and mismatch sentinel", () => {
  const sentinels = [
    "authoritative-state-sentinel",
    "base-state-sentinel",
    "next-state-sentinel",
    "workout-name-sentinel",
    "exercise-name-sentinel",
    "meal-name-sentinel",
    "ai-message-sentinel",
    "supplement-name-sentinel",
    "recovery-note-sentinel",
    "goal-description-sentinel",
    "photo-metadata-sentinel",
    "audit-patch-sentinel",
    "unknown-warning-sentinel",
  ];
  const authoritative = warningState("authoritative-state-sentinel");
  (authoritative as unknown as Record<string, unknown>).privacySentinels = Object.fromEntries(
    sentinels.map((value, index) => [`value${index}`, value]),
  );
  const adapter = new MemoryAdapter();
  directRevisionedCommit(adapter, authoritative, null, TOKEN_1);
  const base = warningState("base-state-sentinel");
  const next = warningState("next-state-sentinel");
  const result = commit(adapter, 1, base, next, TOKEN_2, LATER_AT);
  assert.equal(result.status, "base_state_mismatch");
  const json = JSON.stringify(result);
  for (const sentinel of sentinels) assert.equal(json.includes(sentinel), false);
  for (const forbidden of ["fingerprint", "hash", "payload", "manifest", "patch"])
    assert.equal(json.includes(forbidden), false);
});

test("successful privacy fixture intentionally preserves complete state", () => {
  const source = warningState("unknown-warning-sentinel");
  (source as unknown as Record<string, unknown>).privacySentinels = {
    workout: "workout-name-sentinel",
    exercise: "exercise-name-sentinel",
    meal: "meal-name-sentinel",
    ai: "ai-message-sentinel",
    supplement: "supplement-name-sentinel",
    recovery: "recovery-note-sentinel",
    goal: "goal-description-sentinel",
    photo: "photo-metadata-sentinel",
    audit: "audit-patch-sentinel",
  };
  const result = commit(new MemoryAdapter(), null, null, source, TOKEN_1);
  assert.equal(result.status, "committed_with_warnings");
  assert.deepEqual(result.snapshot!.state, source);
});

test("equivalent reads and no-change results are deterministic and byte-stable", () => {
  const adapter = new MemoryAdapter();
  const source = warningState("deterministic");
  source.jarvisLearning = { z: { b: 2, a: 1 }, a: [3, 2, 1] };
  directRevisionedCommit(adapter, source, null, TOKEN_1);
  const firstRead = readFitCoreStoreTransactionSnapshot(adapter);
  const secondRead = readFitCoreStoreTransactionSnapshot(adapter);
  assert.deepEqual(firstRead, secondRead);
  const first = commit(adapter, 1, source, source, TOKEN_2, LATER_AT);
  const second = commit(
    adapter,
    1,
    structuredClone(source),
    structuredClone(source),
    TOKEN_2,
    LATER_AT,
  );
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("results round-trip, contain no runtime references, and are deeply frozen", () => {
  const adapter = new MemoryAdapter();
  const empty = readFitCoreStoreTransactionSnapshot(adapter);
  const committed = commit(adapter, null, null, state(), TOKEN_1);
  const ready = readFitCoreStoreTransactionSnapshot(adapter);
  const stale = commit(adapter, null, null, changedState(), TOKEN_2, LATER_AT);
  for (const result of [empty, committed, ready, stale]) {
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    assertDeepFrozen(result);
    assert.equal(JSON.stringify(result).includes("getItem"), false);
  }
});

test("every public read and commit status serializes and round-trips", () => {
  const reads: FitCoreStoreTransactionReadResult[] = [];
  reads.push(readFitCoreStoreTransactionSnapshot(new MemoryAdapter()));
  for (const source of [state(), warningState("read-status")]) {
    const adapter = new MemoryAdapter();
    directRevisionedCommit(adapter, source, null, TOKEN_1);
    reads.push(readFitCoreStoreTransactionSnapshot(adapter));
  }
  const recovery = new MemoryAdapter();
  persistFitCoreStateAtomically(recovery, state(), { exportedAt: EXPORTED_AT });
  reads.push(readFitCoreStoreTransactionSnapshot(recovery));
  const corrupt = new MemoryAdapter();
  corrupt.data.set(MANIFEST, "{");
  reads.push(readFitCoreStoreTransactionSnapshot(corrupt));
  const readError = new MemoryAdapter();
  readError.getHook = () => {
    throw new Error("private-read-status-error");
  };
  reads.push(readFitCoreStoreTransactionSnapshot(readError));

  const commits: FitCoreStoreTransactionCommitResult[] = [];
  commits.push(commit(new MemoryAdapter(), null, null, state(), TOKEN_1));
  commits.push(commit(new MemoryAdapter(), null, null, warningState("commit-status"), TOKEN_1));
  const current = new MemoryAdapter();
  directRevisionedCommit(current, state(), null, TOKEN_1);
  commits.push(commit(current, 1, state(), state(), TOKEN_2, LATER_AT));
  commits.push(commit(current, 0, state(), changedState(), TOKEN_2, LATER_AT));
  commits.push(commit(current, 1, changedState("wrong"), changedState(), TOKEN_2, LATER_AT));
  const recoveryCommit = new MemoryAdapter();
  persistFitCoreStateAtomically(recoveryCommit, state(), { exportedAt: EXPORTED_AT });
  commits.push(commit(recoveryCommit, null, null, state(), TOKEN_1));
  commits.push(
    commitFitCoreStoreTransaction(new MemoryAdapter(), {} as FitCoreStoreTransactionRequest),
  );
  const storage = new MemoryAdapter();
  storage.setHook = (target, key, value) => {
    if (key === FITCORE_REVISION_STORAGE_KEY) throw new Error("private-storage-status");
    target.data.set(key, value);
  };
  commits.push(commit(storage, null, null, state(), TOKEN_1));
  const verification = new MemoryAdapter();
  verification.setHook = (target, key, value) => {
    if (key !== FITCORE_REVISION_STORAGE_KEY) target.data.set(key, value);
  };
  commits.push(commit(verification, null, null, state(), TOKEN_1));
  const replacement = new MemoryAdapter();
  directRevisionedCommit(replacement, changedState("other"), null, TOKEN_2);
  const conflict = new MemoryAdapter();
  replaceAtPostCommitRead(conflict, replacement);
  commits.push(commit(conflict, null, null, state(), TOKEN_1));
  const indeterminate = new MemoryAdapter();
  indeterminate.getHook = (_target, key, count) => {
    if (key === FITCORE_REVISION_STORAGE_KEY && count === 6)
      throw new Error("private-indeterminate-status");
    return undefined;
  };
  commits.push(commit(indeterminate, null, null, state(), TOKEN_1));

  assert.deepEqual(
    new Set(reads.map(({ status }) => status)),
    new Set([
      "empty",
      "ready",
      "ready_with_warnings",
      "recovery_required",
      "corrupt",
      "storage_error",
    ]),
  );
  assert.deepEqual(
    new Set(commits.map(({ status }) => status)),
    new Set([
      "committed",
      "committed_with_warnings",
      "no_change",
      "stale_snapshot",
      "base_state_mismatch",
      "recovery_required",
      "blocked",
      "storage_error",
      "verification_failed",
      "conflict_detected",
      "indeterminate",
    ]),
  );
  for (const result of [...reads, ...commits]) {
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    assertDeepFrozen(result);
  }
});

test("frozen request and states remain unchanged while the adapter remains unfrozen", () => {
  const base = state();
  const next = warningState("frozen");
  const freeze = (value: unknown): void => {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
  };
  freeze(base);
  freeze(next);
  const input = request(null, null, next, TOKEN_1);
  freeze(input);
  const before = JSON.stringify(input);
  const adapter = new MemoryAdapter();
  const task4 = createFitCoreBackupEnvelope(next, { exportedAt: EXPORTED_AT });
  const task4Before = JSON.stringify(task4);
  const result = commitFitCoreStoreTransaction(adapter, input);
  const task6 = readFitCoreRevisionedPersistence(adapter);
  const task6Before = JSON.stringify(task6);
  readFitCoreStoreTransactionSnapshot(adapter);
  assert.equal(result.status, "committed_with_warnings");
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(task4), task4Before);
  assert.equal(JSON.stringify(task6), task6Before);
  assert.equal(Object.isFrozen(adapter), false);
  assert.throws(() => {
    (result.snapshot!.state as Record<string, unknown>).version = 9;
  });
  assert.notEqual((result.snapshot!.state as Record<string, unknown>).version, 9);
});

test("summary counts reconcile across representative read and commit outcomes", () => {
  const adapter = new MemoryAdapter();
  const empty = readFitCoreStoreTransactionSnapshot(adapter);
  const current = state();
  const first = commit(adapter, null, null, current, TOKEN_1);
  const ready = readFitCoreStoreTransactionSnapshot(adapter);
  const noChange = commit(adapter, 1, current, current, TOKEN_2, LATER_AT);
  const stale = commit(adapter, 0, current, changedState(), TOKEN_2, LATER_AT);
  const mismatch = commit(adapter, 1, changedState("wrong"), changedState(), TOKEN_2, LATER_AT);
  for (const result of [empty, ready]) assertReadSummary(result);
  for (const result of [first, noChange, stale, mismatch]) assertCommitSummary(result);
  assert.equal(empty.summary.revisionedReadCount, 1);
  assert.equal(first.summary.revisionedReadCount, 2);
  assert.equal(first.summary.revisionedWriteCount, 1);
  assert.equal(noChange.summary.revisionedWriteCount, 0);
  assert.equal(stale.summary.canonicalComparisonCount, 0);
});

test("approximately 2,000 records commit, change, no-change, serialize, and remain untouched", () => {
  const firstState = state();
  firstState.workouts = Array.from({ length: 2_000 }, (_, index) => ({
    id: `transaction-workout-${index.toString().padStart(4, "0")}`,
    name: `Transaction Workout ${index}`,
    startedAt: AT + index,
    endedAt: AT + index + 1,
    exercises: [],
  }));
  const secondState = structuredClone(firstState);
  secondState.workouts[1_999]!.name = "Changed Transaction Workout";
  const beforeFirst = structuredClone(firstState);
  const beforeSecond = structuredClone(secondState);
  const adapter = new MemoryAdapter();
  const first = commit(adapter, null, null, firstState, TOKEN_1);
  const second = commit(adapter, 1, firstState, secondState, TOKEN_2, LATER_AT);
  const writesBefore = adapter.writes().length;
  const noChange = commit(adapter, 2, secondState, structuredClone(secondState), TOKEN_3, THIRD_AT);
  assert.equal(first.committedRevision, 1);
  assert.equal(second.committedRevision, 2);
  assert.equal(noChange.status, "no_change");
  assert.equal(noChange.committedRevision, 2);
  assert.equal(adapter.writes().length, writesBefore);
  assert.deepEqual(noChange.snapshot!.state, secondState);
  assert.deepEqual(firstState, beforeFirst);
  assert.deepEqual(secondState, beforeSecond);
  assert.doesNotThrow(() => JSON.stringify(noChange));
  assertDeepFrozen(noChange);
});

test("slot, manifest, and revision keys remain solely Task 6 concerns", () => {
  const adapter = new MemoryAdapter();
  const result = commit(adapter, null, null, state(), TOKEN_1);
  assert.equal(result.status, "committed");
  assert.equal(adapter.data.has(SLOT_A), true);
  assert.equal(adapter.data.has(SLOT_B), false);
  assert.equal(adapter.data.has(MANIFEST), true);
  assert.equal(adapter.data.has(FITCORE_REVISION_STORAGE_KEY), true);
});
