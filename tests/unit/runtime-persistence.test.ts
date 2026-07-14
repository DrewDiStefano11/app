import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_ATOMIC_PERSISTENCE_KEYS,
  type FitCoreAtomicPersistenceAdapter,
} from "../../src/lib/atomic-persistence.ts";
import { persistFitCoreStateWithRevision } from "../../src/lib/revisioned-persistence.ts";
import {
  FITCORE_RUNTIME_PERSISTENCE_POLICY,
  createFitCoreBrowserPersistenceDependencies,
  createFitCoreRuntimePersistenceController,
  type FitCoreRuntimePersistenceDependencies,
} from "../../src/lib/runtime-persistence.ts";
import { FITCORE_STORE_TRANSACTION_POLICY } from "../../src/lib/store-transaction.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const EXPORTED_AT = "2026-07-13T20:30:15.000Z";
const LATER_AT = "2026-07-13T20:31:15.000Z";
const TOKEN_1 = "0123456789abcdef0123456789abcdef";
const TOKEN_2 = "11111111111111111111111111111111";
const TOKEN_3 = "22222222222222222222222222222222";
const { manifest: MANIFEST } = FITCORE_ATOMIC_PERSISTENCE_KEYS;

class MemoryAdapter implements FitCoreAtomicPersistenceAdapter {
  readonly data = new Map<string, string>();
  readonly operations: string[] = [];
  getHook:
    | ((adapter: MemoryAdapter, key: string, count: number) => string | null | undefined)
    | null = null;
  setHook: ((adapter: MemoryAdapter, key: string, value: string, count: number) => void) | null =
    null;
  private readonly gets = new Map<string, number>();
  private readonly sets = new Map<string, number>();
  getItem(key: string): string | null {
    this.operations.push(`get:${key}`);
    const count = (this.gets.get(key) ?? 0) + 1;
    this.gets.set(key, count);
    const hooked = this.getHook?.(this, key, count);
    return hooked !== undefined ? hooked : (this.data.get(key) ?? null);
  }
  setItem(key: string, value: string): void {
    this.operations.push(`set:${key}`);
    const count = (this.sets.get(key) ?? 0) + 1;
    this.sets.set(key, count);
    if (this.setHook) this.setHook(this, key, value, count);
    else this.data.set(key, value);
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

function warningState(label = "warning"): AppState {
  const value = state();
  (value as unknown as Record<string, unknown>).futureRuntimeField = label;
  return value;
}

function dependencies(
  options: {
    adapter?: MemoryAdapter;
    legacy?: unknown | null;
    exportedAt?: string;
    token?: string;
    legacyError?: Error;
    timestampError?: Error;
    tokenError?: Error;
  } = {},
) {
  const adapter = options.adapter ?? new MemoryAdapter();
  const calls = { legacy: 0, timestamp: 0, token: 0 };
  const value: FitCoreRuntimePersistenceDependencies = {
    adapter,
    readLegacyState: () => {
      calls.legacy += 1;
      if (options.legacyError) throw options.legacyError;
      return options.legacy ?? null;
    },
    createExportedAt: () => {
      calls.timestamp += 1;
      if (options.timestampError) throw options.timestampError;
      return options.exportedAt ?? EXPORTED_AT;
    },
    createWriteToken: () => {
      calls.token += 1;
      if (options.tokenError) throw options.tokenError;
      return options.token ?? [TOKEN_1, TOKEN_2, TOKEN_3][calls.token - 1] ?? TOKEN_3;
    },
  };
  return { adapter, calls, value };
}

function assertDeepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
}

test("exports exact runtime policy, attribution, browser factory, and controller API", () => {
  assert.equal(FITCORE_RUNTIME_PERSISTENCE_POLICY, "fitcore_runtime_persistence_v1");
  assert.equal(FITCORE_STORE_TRANSACTION_POLICY, "fitcore_store_transaction_v1");
  assert.equal(typeof createFitCoreBrowserPersistenceDependencies, "function");
  const controller = createFitCoreRuntimePersistenceController(dependencies().value);
  for (const method of ["hydrate", "commit", "reload", "getCurrentSnapshot", "getRuntimeStatus"])
    assert.equal(typeof controller[method as keyof typeof controller], "function");
  assert.equal(controller.getRuntimeStatus().status, "uninitialized");
});

test("module and injected controller are safe without browser globals", () => {
  assert.doesNotThrow(() => createFitCoreBrowserPersistenceDependencies());
  assert.doesNotThrow(() => createFitCoreRuntimePersistenceController(dependencies().value));
});

test("empty hydration keeps default behavior without writes or generated metadata", () => {
  const fixture = dependencies();
  const result = createFitCoreRuntimePersistenceController(fixture.value).hydrate();
  assert.equal(result.status, "empty");
  assert.equal(result.source, "default");
  assert.equal(result.safeToApply, true);
  assert.equal(result.state, null);
  assert.deepEqual(fixture.adapter.writes(), []);
  assert.deepEqual(fixture.calls, { legacy: 1, timestamp: 0, token: 0 });
  assert.equal(result.summary.transactionReadCount, 1);
});

test("empty hydration reads legacy at most once per controller lifetime", () => {
  const fixture = dependencies();
  const controller = createFitCoreRuntimePersistenceController(fixture.value);
  assert.equal(controller.hydrate().status, "empty");
  assert.equal(controller.hydrate().status, "empty");
  assert.equal(fixture.calls.legacy, 1);
});

test("browser dependencies lazily parse legacy and generate exactly sixteen secure bytes", () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const values = new Map<string, string>([["fitcore.v1", JSON.stringify(state("browser"))]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_value, index) => (bytes[index] = index));
        return bytes;
      },
    },
  });
  try {
    const browser = createFitCoreBrowserPersistenceDependencies();
    assert.deepEqual(browser.readLegacyState(), state("browser"));
    assert.equal(browser.createWriteToken(), "000102030405060708090a0b0c0d0e0f");
    assert.match(browser.createExportedAt(), /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
    if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    else delete (globalThis as { crypto?: unknown }).crypto;
  }
});

test("browser malformed legacy and unavailable secure randomness map to fixed blocked issues", () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  try {
    values.set("fitcore.v1", "{private-malformed-json");
    let controller = createFitCoreRuntimePersistenceController(
      createFitCoreBrowserPersistenceDependencies(),
    );
    let result = controller.hydrate();
    assert.equal(result.status, "blocked");
    assert.equal(result.issues[0].code, "legacy_invalid_json");
    assert.equal(JSON.stringify(result).includes("private-malformed-json"), false);

    values.set("fitcore.v1", JSON.stringify(state("secure")));
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    controller = createFitCoreRuntimePersistenceController(
      createFitCoreBrowserPersistenceDependencies(),
    );
    result = controller.hydrate();
    assert.equal(result.status, "blocked");
    assert.equal(result.issues[0].code, "secure_random_unavailable");
  } finally {
    if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
    if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    else delete (globalThis as { crypto?: unknown }).crypto;
  }
});

test("ready hydration preserves complete state and never consults legacy", () => {
  for (const [source, expected] of [
    [state("ready"), "ready"],
    [warningState(), "ready_with_warnings"],
  ] as const) {
    const fixture = dependencies({ legacy: state("ignored") });
    persistFitCoreStateWithRevision(fixture.adapter, source, {
      expectedRevision: null,
      exportedAt: EXPORTED_AT,
      writeToken: TOKEN_1,
    });
    const writes = fixture.adapter.writes().length;
    const result = createFitCoreRuntimePersistenceController(fixture.value).hydrate();
    assert.equal(result.status, expected);
    assert.deepEqual(result.state, source);
    assert.equal(result.revision, 1);
    assert.equal(result.source, "revisioned");
    assert.equal(fixture.calls.legacy, 0);
    assert.equal(fixture.adapter.writes().length, writes);
  }
});

test("unsafe revisioned hydration never reads legacy or writes", () => {
  const recovery = dependencies({ legacy: state("private-legacy") });
  recovery.adapter.data.set(MANIFEST, "{private-corrupt");
  const result = createFitCoreRuntimePersistenceController(recovery.value).hydrate();
  assert.equal(result.status, "reload_required");
  assert.equal(result.state, null);
  assert.equal(recovery.calls.legacy, 0);
  assert.equal(recovery.adapter.writes().length, 0);

  const storage = dependencies({ legacy: state("private-legacy") });
  storage.adapter.getHook = () => {
    throw new Error("private-storage");
  };
  const failed = createFitCoreRuntimePersistenceController(storage.value).hydrate();
  assert.equal(failed.status, "storage_error");
  assert.equal(storage.calls.legacy, 0);
  assert.equal(JSON.stringify(failed).includes("private-"), false);
});

test("valid legacy state migrates once through Task 7 and retains its source", () => {
  for (const [legacy, expected] of [
    [state("legacy"), "legacy_migrated"],
    [warningState("legacy-warning"), "legacy_migrated_with_warnings"],
  ] as const) {
    const fixture = dependencies({ legacy });
    const result = createFitCoreRuntimePersistenceController(fixture.value).hydrate();
    assert.equal(result.status, expected);
    assert.equal(result.source, "legacy");
    assert.equal(result.revision, 1);
    assert.deepEqual(result.state, legacy);
    assert.deepEqual(fixture.calls, { legacy: 1, timestamp: 1, token: 1 });
    assert.equal(result.summary.transactionWriteCount, 1);
  }
});

test("invalid legacy data and dependency failures remain private and non-destructive", () => {
  for (const fixture of [
    dependencies({ legacy: { invalid: "private-legacy" } }),
    dependencies({ legacyError: new Error("private-parser-error") }),
    dependencies({ legacy: state(), exportedAt: "invalid-time" }),
    dependencies({ legacy: state(), token: "private-invalid-token" }),
    dependencies({ legacy: state(), tokenError: new Error("private-random-error") }),
  ]) {
    const result = createFitCoreRuntimePersistenceController(fixture.value).hydrate();
    assert.equal(result.status, "blocked");
    assert.equal(result.state, null);
    assert.equal(JSON.stringify(result).includes("private-"), false);
  }
});

test("commit before hydration blocks before generation or storage", () => {
  const fixture = dependencies();
  const result = createFitCoreRuntimePersistenceController(fixture.value).commit(state());
  assert.equal(result.status, "blocked");
  assert.deepEqual(fixture.calls, { legacy: 0, timestamp: 0, token: 0 });
  assert.equal(result.summary.transactionWriteCount, 0);
});

test("successful commit uses verified base and replaces the controller snapshot", () => {
  const fixture = dependencies({ exportedAt: LATER_AT, token: TOKEN_2 });
  const controller = createFitCoreRuntimePersistenceController(fixture.value);
  controller.hydrate();
  const next = state("next");
  const before = structuredClone(next);
  const result = controller.commit(next);
  assert.equal(result.status, "ready");
  assert.equal(result.revision, 1);
  assert.deepEqual(result.state, next);
  assert.deepEqual(next, before);
  assert.equal(result.summary.generatedTimestampCount, 1);
  assert.equal(result.summary.generatedTokenCount, 1);
  assert.equal(result.summary.transactionWriteCount, 1);
  assert.deepEqual(controller.getCurrentSnapshot()!.state, next);
});

test("no change preserves authoritative revision and token without storage writes", () => {
  const fixture = dependencies({ legacy: state("same"), exportedAt: LATER_AT, token: TOKEN_2 });
  const controller = createFitCoreRuntimePersistenceController(fixture.value);
  controller.hydrate();
  const writes = fixture.adapter.writes().length;
  const prior = controller.getCurrentSnapshot()!;
  const result = controller.commit(state("same"));
  assert.equal(result.status, "ready");
  assert.equal(result.revision, prior.revision);
  assert.equal(result.writeToken, prior.writeToken);
  assert.equal(fixture.adapter.writes().length, writes);
});

test("external revision change maps to reload and retains the previous snapshot", () => {
  const fixture = dependencies({ legacy: state("base"), exportedAt: LATER_AT, token: TOKEN_2 });
  const controller = createFitCoreRuntimePersistenceController(fixture.value);
  controller.hydrate();
  const previous = controller.getCurrentSnapshot();
  persistFitCoreStateWithRevision(fixture.adapter, state("external"), {
    expectedRevision: 1,
    exportedAt: LATER_AT,
    writeToken: TOKEN_3,
  });
  const result = controller.commit(state("proposed"));
  assert.equal(result.status, "reload_required");
  assert.equal(result.state, null);
  assert.equal(result.requiresReload, true);
  assert.equal(controller.getCurrentSnapshot(), previous);
});

test("base mismatch and Task 7 storage, verification, conflict, and indeterminate failures map conservatively", () => {
  const baseAdapter = new MemoryAdapter();
  const baseController = createFitCoreRuntimePersistenceController(
    dependencies({ adapter: baseAdapter, legacy: state("base") }).value,
  );
  baseController.hydrate();
  const replacement = new MemoryAdapter();
  persistFitCoreStateWithRevision(replacement, state("other"), {
    expectedRevision: null,
    exportedAt: EXPORTED_AT,
    writeToken: TOKEN_3,
  });
  baseAdapter.data.clear();
  for (const [key, value] of replacement.data) baseAdapter.data.set(key, value);
  assert.equal(baseController.commit(state("next")).status, "reload_required");

  const cases: [string, (adapter: MemoryAdapter) => void, string][] = [
    [
      "storage",
      (adapter) => {
        adapter.setHook = (target, key, value) => {
          if (key.includes("revision")) throw new Error("private-storage");
          target.data.set(key, value);
        };
      },
      "storage_error",
    ],
    [
      "verification",
      (adapter) => {
        adapter.setHook = (target, key, value) => {
          if (!key.includes("revision")) target.data.set(key, value);
        };
      },
      "blocked",
    ],
    [
      "conflict",
      (adapter) => {
        adapter.getHook = (target, key, count) => {
          if (key.includes("revision") && count === 4) {
            target.data.set(key, '{"competing":true}');
            return target.data.get(key)!;
          }
          return undefined;
        };
      },
      "reload_required",
    ],
    [
      "indeterminate",
      (adapter) => {
        adapter.setHook = (target, key, value) => {
          if (key.includes("revision")) throw new Error("private-write");
          target.data.set(key, value);
        };
        adapter.getHook = (_target, key, count) => {
          if (key.includes("revision") && count === 5) throw new Error("private-read");
          return undefined;
        };
      },
      "indeterminate",
    ],
  ];
  for (const [name, configure, expected] of cases) {
    const fixture = dependencies();
    const controller = createFitCoreRuntimePersistenceController(fixture.value);
    controller.hydrate();
    configure(fixture.adapter);
    const result = controller.commit(state(name));
    assert.equal(result.status, expected, name);
    assert.equal(result.state, null, name);
  }
});

test("reload applies safe external state and never reads legacy or writes", () => {
  const fixture = dependencies({ legacy: state("base") });
  const controller = createFitCoreRuntimePersistenceController(fixture.value);
  controller.hydrate();
  persistFitCoreStateWithRevision(fixture.adapter, state("external"), {
    expectedRevision: 1,
    exportedAt: LATER_AT,
    writeToken: TOKEN_2,
  });
  const writes = fixture.adapter.writes().length;
  const legacyReads = fixture.calls.legacy;
  const result = controller.reload();
  assert.equal(result.status, "ready");
  assert.equal(result.revision, 2);
  assert.deepEqual(result.state, state("external"));
  assert.equal(fixture.adapter.writes().length, writes);
  assert.equal(fixture.calls.legacy, legacyReads);
});

test("deterministic dependencies produce equivalent frozen serializable results", () => {
  const first = createFitCoreRuntimePersistenceController(
    dependencies({ legacy: state("det") }).value,
  ).hydrate();
  const second = createFitCoreRuntimePersistenceController(
    dependencies({ legacy: state("det") }).value,
  ).hydrate();
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assertDeepFrozen(first);
});

test("privacy boundaries exclude state and exception sentinels from unsafe reports", () => {
  const sentinels = [
    "private-workout-sentinel",
    "private-meal-sentinel",
    "private-note-sentinel",
    "private-ai-sentinel",
    "private-goal-sentinel",
    "private-supplement-sentinel",
    "private-photo-sentinel",
  ];
  const fixture = dependencies({ legacyError: new Error(sentinels.join(" ")) });
  const result = createFitCoreRuntimePersistenceController(fixture.value).hydrate();
  const json = JSON.stringify(result);
  for (const sentinel of [...sentinels, "fingerprint", "hash"])
    assert.equal(json.includes(sentinel), false);
});

test("approximately 2,000 records migrate, change, no-change, and remain untouched", () => {
  const legacy = state();
  legacy.workouts = Array.from({ length: 2_000 }, (_, index) => ({
    id: `runtime-workout-${index.toString().padStart(4, "0")}`,
    name: `Runtime Workout ${index}`,
    startedAt: 1_700_000_000_000 + index,
    endedAt: 1_700_000_000_001 + index,
    exercises: [],
  }));
  const before = structuredClone(legacy);
  const fixture = dependencies({ legacy });
  const controller = createFitCoreRuntimePersistenceController(fixture.value);
  assert.equal(controller.hydrate().revision, 1);
  const changed = structuredClone(legacy);
  changed.workouts[1_999]!.name = "Changed Runtime Workout";
  assert.equal(controller.commit(changed).revision, 2);
  const writes = fixture.adapter.writes().length;
  assert.equal(controller.commit(structuredClone(changed)).revision, 2);
  assert.equal(fixture.adapter.writes().length, writes);
  assert.deepEqual(legacy, before);
  assertDeepFrozen(controller.getCurrentSnapshot());
});
