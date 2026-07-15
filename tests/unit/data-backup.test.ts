import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_BACKUP_ENVELOPE_POLICY,
  FITCORE_BACKUP_EXPORT_LIMITS,
  FITCORE_BACKUP_FORMAT,
  FITCORE_BACKUP_FORMAT_VERSION,
  FITCORE_BACKUP_PAYLOAD_KIND,
  FITCORE_BACKUP_PAYLOAD_SCHEMA_VERSION,
  createFitCoreBackupEnvelope,
  inspectFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
  type FitCoreBackupCreationResult,
  type FitCoreBackupEnvelopeV1,
  type FitCoreBackupInspectionReport,
  type FitCoreBackupSerializationResult,
} from "../../src/lib/data-backup.ts";
import { FITCORE_DATA_INTEGRITY_POLICY } from "../../src/lib/data-integrity.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const EXPORTED_AT = "2026-07-13T20:30:15.000Z";
const AT = 1_700_000_000_000;

function state(): AppState {
  return structuredClone(defaultState);
}

function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function create(value: unknown = state(), exportedAt = EXPORTED_AT) {
  return createFitCoreBackupEnvelope(value, { exportedAt });
}

function envelope(value: unknown = state()): FitCoreBackupEnvelopeV1 {
  const result = create(value);
  assert.notEqual(result.envelope, null);
  return result.envelope!;
}

function mutableEnvelope(value: unknown = state()): Record<string, unknown> {
  const serialized = serializeFitCoreBackupEnvelope(envelope(value));
  assert.notEqual(serialized.json, null);
  return JSON.parse(serialized.json!) as Record<string, unknown>;
}

function issueCodes(report: { issues: readonly { code: string }[] }): string[] {
  return report.issues.map(({ code }) => code);
}

function assertDeepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
}

function assertSummary(
  report:
    | FitCoreBackupCreationResult
    | FitCoreBackupInspectionReport
    | FitCoreBackupSerializationResult,
): void {
  const { summary } = report;
  assert.equal(summary.issueCount, report.issues.length);
  assert.equal(
    summary.warningCount,
    report.issues.filter(({ severity }) => severity === "warning").length,
  );
  assert.equal(
    summary.errorCount,
    report.issues.filter(({ severity }) => severity === "error").length,
  );
  for (const count of Object.values(summary)) {
    assert.equal(Number.isSafeInteger(count), true);
    assert.equal(count >= 0, true);
  }
}

function addOwn(record: object, key: string, value: unknown): void {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function nested(depth: number): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let current = root;
  for (let index = 0; index < depth; index += 1) {
    const next: Record<string, unknown> = {};
    current.next = next;
    current = next;
  }
  return root;
}

function nodeFixture(totalNodes: number): Record<string, unknown> {
  const root: Record<string, unknown> = { groups: [] };
  const groups = root.groups as null[][];
  const valueNodes = totalNodes - 7;
  for (let index = 0; index < 5; index += 1) {
    const length = index < 4 ? 50_000 : valueNodes - 200_000;
    groups.push(Array.from({ length }, () => null));
  }
  return root;
}

function warningState(): AppState {
  const value = state();
  asRecord(value).futureField = { keep: "warning-sentinel", zero: 0, off: false };
  asRecord(value.goals[0]).futureRecordField = "record-warning-sentinel";
  return value;
}

function preservationState(): AppState {
  const value = state();
  value.workouts = [
    {
      id: "workout-sentinel-id",
      name: "workout-name-sentinel",
      notes: "recovery-note-sentinel",
      startedAt: AT,
      endedAt: AT + 1,
      exercises: [
        {
          id: "exercise-sentinel-id",
          exerciseId: "exercise-name-sentinel",
          notes: "exercise-note-sentinel",
          completed: false,
          sets: [{ id: "set-sentinel-id", reps: 0, weight: 0, completed: false }],
        },
      ],
    },
  ];
  value.mealEntries = [
    {
      id: "meal-sentinel-id",
      name: "meal-name-sentinel",
      type: "dinner",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      notes: "",
      createdAt: AT,
    },
  ];
  value.aiMessages = [
    { id: "ai-sentinel-id", role: "user", content: "ai-message-sentinel", createdAt: AT },
  ];
  value.supplementLogs = [
    {
      id: "supplement-sentinel-id",
      name: "supplement-name-sentinel",
      notes: "supplement-note-sentinel",
      createdAt: AT,
    },
  ];
  value.recoveryCheckIns = [
    {
      id: "recovery-sentinel-id",
      energy: 0,
      soreness: 0,
      stress: 0,
      motivation: 0,
      notes: "recovery-notes-sentinel",
      createdAt: AT,
    },
  ];
  value.goals = [
    {
      id: "goal-sentinel-id",
      type: "habit",
      label: "goal-description-sentinel",
      target: 0,
      current: 0,
    },
  ];
  value.progressPhotos = [
    {
      id: "photo-sentinel-id",
      dataUrl: "photo-metadata-sentinel",
      view: "front",
      phase: "maintenance",
      notes: "photo-notes-sentinel",
      createdAt: AT,
    },
  ];
  value.jarvisAudit = [
    {
      id: "audit-sentinel-id",
      tool: "audit-tool-sentinel",
      summary: "audit-summary-sentinel",
      status: "logged",
      patch: { patchField: "audit-patch-sentinel", empty: "", nullable: null },
      createdAt: AT,
    },
  ];
  value.jarvisLearning = {
    unknownWarningField: "unknown-warning-sentinel",
    ordered: ["third", "first", "second"],
    nested: { z: 0, a: false, empty: "", nullable: null },
  };
  return value;
}

test("exports the exact frozen policy, format, and limit constants", () => {
  assert.equal(FITCORE_BACKUP_ENVELOPE_POLICY, "fitcore_backup_envelope_v1");
  assert.equal(FITCORE_BACKUP_FORMAT, "fitcore_backup");
  assert.equal(FITCORE_BACKUP_FORMAT_VERSION, 1);
  assert.equal(FITCORE_BACKUP_PAYLOAD_KIND, "fitcore_app_state");
  assert.equal(FITCORE_BACKUP_PAYLOAD_SCHEMA_VERSION, 1);
  assert.equal(FITCORE_DATA_INTEGRITY_POLICY, "fitcore_data_integrity_v1");
  assert.deepEqual(FITCORE_BACKUP_EXPORT_LIMITS, {
    maxSerializedCharacters: 10_000_000,
    maxDepth: 64,
    maxNodes: 250_000,
    maxArrayLength: 50_000,
    maxObjectKeys: 10_000,
    maxStringLength: 1_000_000,
  });
  assertDeepFrozen(FITCORE_BACKUP_EXPORT_LIMITS);
});

test("accepts only a canonical caller-supplied UTC timestamp", () => {
  assert.equal(create().status, "created");
  for (const invalid of [
    "",
    "not-a-date-sensitive-sentinel",
    "2026-07-13T20:30:15Z",
    "2026-07-13T20:30:15.00Z",
    "2026-07-13T20:30:15.000",
    "2026-07-13T16:30:15.000-04:00",
    "2026-02-30T20:30:15.000Z",
  ]) {
    const result = create(state(), invalid);
    assert.equal(result.status, "blocked");
    assert.deepEqual(issueCodes(result), ["invalid_exported_at"]);
    if (invalid.length > 0) assert.equal(JSON.stringify(result).includes(invalid), false);
  }
  const malformed = [undefined, {}, { exportedAt: 1 }, { exportedAt: EXPORTED_AT, extra: true }];
  for (const options of malformed) {
    assert.doesNotThrow(() =>
      createFitCoreBackupEnvelope(state(), options as { exportedAt: string }),
    );
    assert.equal(
      createFitCoreBackupEnvelope(state(), options as { exportedAt: string }).status,
      "blocked",
    );
  }
});

test("hostile proxies return reports instead of throwing", () => {
  const hostile = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error("hostile-proxy-private-sentinel");
      },
    },
  );
  assert.doesNotThrow(() => createFitCoreBackupEnvelope(hostile, { exportedAt: EXPORTED_AT }));
  assert.doesNotThrow(() =>
    createFitCoreBackupEnvelope(state(), hostile as { exportedAt: string }),
  );
  assert.doesNotThrow(() => inspectFitCoreBackupEnvelope(hostile));
  assert.doesNotThrow(() => serializeFitCoreBackupEnvelope(hostile));
  for (const report of [
    createFitCoreBackupEnvelope(hostile, { exportedAt: EXPORTED_AT }),
    inspectFitCoreBackupEnvelope(hostile),
    serializeFitCoreBackupEnvelope(hostile),
  ]) {
    assert.equal(JSON.stringify(report).includes("hostile-proxy-private-sentinel"), false);
  }
});

test("creates a detached, deeply frozen, complete version-one envelope", () => {
  const source = state();
  const before = structuredClone(source);
  const result = create(source);
  assert.equal(result.status, "created");
  assert.equal(result.safeToExport, true);
  assert.equal(result.requiresReview, false);
  assert.notEqual(result.envelope, null);
  assert.deepEqual(result.envelope, {
    format: FITCORE_BACKUP_FORMAT,
    formatVersion: 1,
    payloadKind: FITCORE_BACKUP_PAYLOAD_KIND,
    payloadSchemaVersion: 1,
    exportedAt: EXPORTED_AT,
    policies: {
      backupEnvelope: FITCORE_BACKUP_ENVELOPE_POLICY,
      dataIntegrity: FITCORE_DATA_INTEGRITY_POLICY,
    },
    payload: source,
  });
  assert.notEqual(result.envelope!.payload, source);
  assert.deepEqual(source, before);
  assertDeepFrozen(result);
  assertSummary(result);
  assert.equal(result.summary.integrityIssueCount, 0);
});

test("preserves warnings, unknown record fields, and falsey values", () => {
  const source = warningState();
  const before = structuredClone(source);
  const result = create(source);
  assert.equal(result.status, "created_with_warnings");
  assert.equal(result.safeToExport, true);
  assert.equal(result.requiresReview, true);
  assert.deepEqual(result.envelope!.payload, source);
  assert.equal(asRecord(result.envelope!.payload).futureField !== undefined, true);
  assert.equal((result.envelope!.payload.goals as unknown[]).length, 2);
  assert.deepEqual(source, before);
  assertSummary(result);
  assert.equal(result.summary.warningCount, 1);
  assert.equal(result.summary.integrityIssueCount > 0, true);
});

test("blocks integrity-invalid input without creating defaults or leaking values", () => {
  const source = state();
  const sentinel = "private-invalid-state-sentinel";
  source.profile.goal = "invalid-goal" as AppState["profile"]["goal"];
  source.jarvisLearning = { secret: sentinel };
  const result = create(source);
  assert.equal(result.status, "blocked");
  assert.equal(result.safeToExport, false);
  assert.equal(result.envelope, null);
  assert.deepEqual(issueCodes(result), ["integrity_invalid"]);
  assert.equal(JSON.stringify(result).includes(sentinel), false);
  assertSummary(result);
});

test("preserves all supported JSON values and null-prototype objects", () => {
  const source = state();
  const open = Object.create(null) as Record<string, unknown>;
  open.nullable = null;
  open.off = false;
  open.zero = 0;
  open.empty = "";
  open.negative = -2.5;
  open.nested = [{ z: "last", a: "first" }, [3, 2, 1]];
  source.jarvisLearning = open;
  source.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  const result = create(source);
  assert.equal(result.safeToExport, true);
  assert.deepEqual(result.envelope!.payload, source);
  assert.deepEqual(result.envelope!.payload.jarvisLearning.nested, [
    { a: "first", z: "last" },
    [3, 2, 1],
  ]);
  assert.equal(Object.getPrototypeOf(result.envelope!.payload.jarvisLearning), null);
});

test("blocks every unsupported value without calling custom toJSON", () => {
  class CustomValue {
    field = "class-sentinel";
  }
  let toJsonCalled = false;
  const customToJson = { value: "to-json-sentinel", toJSON: () => (toJsonCalled = true) };
  const unsupported: [string, unknown, string][] = [
    ["undefined", undefined, "unsupported_json_value"],
    ["NaN", Number.NaN, "non_finite_number"],
    ["Infinity", Number.POSITIVE_INFINITY, "non_finite_number"],
    ["negative Infinity", Number.NEGATIVE_INFINITY, "non_finite_number"],
    ["bigint", BigInt(1), "unsupported_json_value"],
    ["symbol", Symbol("value"), "unsupported_json_value"],
    ["function", () => undefined, "unsupported_json_value"],
    ["Date", new Date(EXPORTED_AT), "unsupported_json_value"],
    ["Map", new Map(), "unsupported_json_value"],
    ["Set", new Set(), "unsupported_json_value"],
    ["WeakMap", new WeakMap(), "unsupported_json_value"],
    ["WeakSet", new WeakSet(), "unsupported_json_value"],
    ["RegExp", /sentinel/, "unsupported_json_value"],
    ["Error", new Error("error-sentinel"), "unsupported_json_value"],
    ["Promise", Promise.resolve("promise-sentinel"), "unsupported_json_value"],
    ["class instance", new CustomValue(), "unsupported_json_value"],
    ["typed array", new Uint8Array([1]), "unsupported_json_value"],
    ["ArrayBuffer", new ArrayBuffer(1), "unsupported_json_value"],
    ["custom toJSON", customToJson, "unsupported_json_value"],
  ];
  for (const [name, value, code] of unsupported) {
    const source = state();
    source.jarvisLearning = { safe: "unrelated-private-sentinel", bad: value };
    const result = create(source);
    assert.equal(result.status, "blocked", name);
    assert.equal(result.envelope, null, name);
    assert.deepEqual(issueCodes(result), [code], name);
    assert.equal(JSON.stringify(result).includes("unrelated-private-sentinel"), false, name);
  }
  assert.equal(toJsonCalled, false);
});

test("blocks cycles, sparse arrays, symbol keys, and accessor properties", () => {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  const sparse = new Array(2);
  sparse[1] = "present";
  const symbolKeyed = { safe: true };
  Object.defineProperty(symbolKeyed, Symbol("secret"), { value: "symbol-sentinel" });
  const accessor: Record<string, unknown> = {};
  Object.defineProperty(accessor, "secret", {
    enumerable: true,
    get: () => {
      throw new Error("accessor-sentinel");
    },
  });
  for (const [value, code] of [
    [cycle, "cyclic_reference"],
    [sparse, "sparse_array"],
    [symbolKeyed, "symbol_key"],
    [accessor, "unsupported_json_value"],
  ] as const) {
    const source = state();
    source.jarvisLearning = { value };
    const result = create(source);
    assert.deepEqual(issueCodes(result), [code]);
  }
});

test("blocks negative zero but preserves positive zero", () => {
  const positive = state();
  positive.jarvisLearning = { zero: 0 };
  assert.equal(create(positive).status, "created");
  assert.equal(Object.is(create(positive).envelope!.payload.jarvisLearning.zero, 0), true);

  const negative = state();
  negative.jarvisLearning = { privateText: "negative-zero-private", zero: -0 };
  const result = create(negative);
  assert.equal(result.status, "blocked");
  assert.deepEqual(issueCodes(result), ["negative_zero_not_serializable"]);
  assert.equal(
    result.limitationKeys.includes("backup.limitation.negative_zero_not_preserved"),
    true,
  );
  assert.equal(JSON.stringify(result).includes("negative-zero-private"), false);
});

test("blocks every unsafe key at top level and nested without mutation or leakage", () => {
  for (const key of ["__proto__", "prototype", "constructor"]) {
    for (const nestedKey of [false, true]) {
      const source = state();
      const target = nestedKey ? (source.jarvisLearning = {}) : source;
      addOwn(target, key, `unsafe-value-sentinel-${key}`);
      const beforeNames = Object.getOwnPropertyNames(target);
      const result = create(source);
      assert.deepEqual(issueCodes(result), ["unsafe_object_key"]);
      assert.equal(result.envelope, null);
      assert.deepEqual(Object.getOwnPropertyNames(target), beforeNames);
      assert.equal(JSON.stringify(result).includes("unsafe-value-sentinel"), false);
    }
  }
});

test("enforces exact and over structural depth boundaries", () => {
  const exact = create(nested(FITCORE_BACKUP_EXPORT_LIMITS.maxDepth));
  assert.equal(issueCodes(exact).includes("maximum_depth_exceeded"), false);
  assert.equal(exact.summary.maximumDepthObserved, FITCORE_BACKUP_EXPORT_LIMITS.maxDepth);
  const over = create(nested(FITCORE_BACKUP_EXPORT_LIMITS.maxDepth + 1));
  assert.deepEqual(issueCodes(over), ["maximum_depth_exceeded"]);
});

test("enforces exact and over node-count boundaries", () => {
  const exact = create(nodeFixture(FITCORE_BACKUP_EXPORT_LIMITS.maxNodes));
  assert.equal(issueCodes(exact).includes("maximum_node_count_exceeded"), false);
  assert.equal(exact.summary.nodeCount, FITCORE_BACKUP_EXPORT_LIMITS.maxNodes);
  const over = create(nodeFixture(FITCORE_BACKUP_EXPORT_LIMITS.maxNodes + 1));
  assert.deepEqual(issueCodes(over), ["maximum_node_count_exceeded"]);
  assert.equal(over.summary.nodeCount, FITCORE_BACKUP_EXPORT_LIMITS.maxNodes + 1);
});

test("enforces exact and over array-length boundaries", () => {
  const exact = state();
  exact.jarvisLearning = {
    items: Array.from({ length: FITCORE_BACKUP_EXPORT_LIMITS.maxArrayLength }, () => null),
  };
  assert.equal(create(exact).status, "created");
  const over = state();
  over.jarvisLearning = {
    items: Array.from({ length: FITCORE_BACKUP_EXPORT_LIMITS.maxArrayLength + 1 }, () => null),
  };
  assert.deepEqual(issueCodes(create(over)), ["maximum_array_length_exceeded"]);
});

test("enforces exact and over object-key boundaries", () => {
  const exact = state();
  exact.jarvisLearning = Object.fromEntries(
    Array.from({ length: FITCORE_BACKUP_EXPORT_LIMITS.maxObjectKeys }, (_, index) => [
      `k${index.toString().padStart(5, "0")}`,
      null,
    ]),
  );
  assert.equal(create(exact).status, "created");
  const over = state();
  over.jarvisLearning = {
    ...exact.jarvisLearning,
    overflow: null,
  };
  assert.deepEqual(issueCodes(create(over)), ["maximum_object_key_count_exceeded"]);
});

test("enforces exact and over string-length boundaries", () => {
  const exact = state();
  exact.jarvisLearning = { text: "x".repeat(FITCORE_BACKUP_EXPORT_LIMITS.maxStringLength) };
  assert.equal(create(exact).status, "created");
  const over = state();
  over.jarvisLearning = {
    text: "x".repeat(FITCORE_BACKUP_EXPORT_LIMITS.maxStringLength + 1),
  };
  assert.deepEqual(issueCodes(create(over)), ["maximum_string_length_exceeded"]);
});

test("enforces the exact final serialized-character boundary without truncation", () => {
  const source = state();
  source.jarvisLearning = {
    chunks: Array.from({ length: 10 }, () => "x".repeat(990_000)),
    pad: "",
  };
  const base = create(source);
  assert.equal(base.status, "created");
  const remaining =
    FITCORE_BACKUP_EXPORT_LIMITS.maxSerializedCharacters - base.summary.serializedCharacterCount;
  assert.equal(remaining > 0, true);
  assert.equal(remaining <= FITCORE_BACKUP_EXPORT_LIMITS.maxStringLength, true);
  source.jarvisLearning.pad = "p".repeat(remaining);
  const exact = create(source);
  assert.equal(exact.status, "created");
  assert.equal(
    exact.summary.serializedCharacterCount,
    FITCORE_BACKUP_EXPORT_LIMITS.maxSerializedCharacters,
  );
  source.jarvisLearning.pad += "p";
  const over = create(source);
  assert.deepEqual(issueCodes(over), ["maximum_serialized_characters_exceeded"]);
  assert.equal(over.envelope, null);
});

test("canonicalizes object keys while preserving array order and source insertion order", () => {
  const first = state();
  first.jarvisLearning = { z: { gamma: 3, alpha: 1 }, a: [3, 1, 2] };
  const second = state();
  second.jarvisLearning = { a: [3, 1, 2], z: { alpha: 1, gamma: 3 } };
  const firstKeys = Object.keys(first.jarvisLearning);
  const firstJson = serializeFitCoreBackupEnvelope(envelope(first));
  const secondJson = serializeFitCoreBackupEnvelope(envelope(second));
  assert.equal(firstJson.json, secondJson.json);
  assert.deepEqual(Object.keys(first.jarvisLearning), firstKeys);
  assert.deepEqual(
    (JSON.parse(firstJson.json!) as { payload: { jarvisLearning: { a: number[] } } }).payload
      .jarvisLearning.a,
    [3, 1, 2],
  );
  assert.equal(firstJson.json!.indexOf('"a"') < firstJson.json!.indexOf('"z"'), true);
});

test("creation is deterministic and timestamps are the only caller-selected metadata", () => {
  const source = preservationState();
  const first = create(source);
  const second = create(source);
  assert.deepEqual(first, second);
  const other = create(source, "2026-07-13T20:30:16.000Z");
  assert.deepEqual(first.envelope!.payload, other.envelope!.payload);
  assert.notEqual(first.envelope!.exportedAt, other.envelope!.exportedAt);
  const metadata = JSON.stringify(first.envelope);
  for (const key of ["random", "device", "browser", "commit", "branch", "checksum"]) {
    assert.equal(metadata.includes(key), false);
  }
});

test("inspects valid and warning envelopes and reconciles frozen reports", () => {
  const valid = inspectFitCoreBackupEnvelope(envelope());
  assert.equal(valid.status, "valid");
  assert.equal(valid.validVersionOneEnvelope, true);
  assert.equal(valid.requiresReview, false);
  assertSummary(valid);
  assertDeepFrozen(valid);

  const warnings = inspectFitCoreBackupEnvelope(envelope(warningState()));
  assert.equal(warnings.status, "valid");
  assert.equal(warnings.requiresReview, true);
  assert.deepEqual(issueCodes(warnings), ["integrity_warnings"]);
  assertSummary(warnings);
});

test("rejects malformed closed envelopes and distinguishes unsupported versions", () => {
  const cases: [string, (candidate: Record<string, unknown>) => unknown, string][] = [
    ["missing field", (candidate) => delete candidate.payload, "invalid_envelope_shape"],
    ["wrong field type", (candidate) => (candidate.exportedAt = 1), "invalid_exported_at"],
    ["unknown field", (candidate) => (candidate.unknown = true), "unknown_envelope_field"],
    [
      "unknown policy",
      (candidate) => (asRecord(candidate.policies as object).unknown = true),
      "unknown_envelope_field",
    ],
    ["wrong format", (candidate) => (candidate.format = "other"), "invalid_format_identifier"],
    [
      "wrong payload kind",
      (candidate) => (candidate.payloadKind = "other"),
      "invalid_payload_kind",
    ],
    [
      "invalid timestamp",
      (candidate) => (candidate.exportedAt = "private-bad-time"),
      "invalid_exported_at",
    ],
    ["invalid payload", (candidate) => (candidate.payload = []), "invalid_root"],
    [
      "integrity invalid",
      (candidate) => delete asRecord(candidate.payload as object).workouts,
      "integrity_invalid",
    ],
    [
      "unsupported value",
      (candidate) => (asRecord(candidate.payload as object).privateBad = undefined),
      "unsupported_json_value",
    ],
  ];
  for (const [name, mutate, code] of cases) {
    const candidate = mutableEnvelope();
    mutate(candidate);
    const beforeKeys = Object.keys(candidate);
    const report = inspectFitCoreBackupEnvelope(candidate);
    assert.equal(report.status, "invalid", name);
    assert.deepEqual(issueCodes(report), [code], name);
    assert.deepEqual(Object.keys(candidate), beforeKeys, name);
    assertSummary(report);
  }
  assert.equal(inspectFitCoreBackupEnvelope(null).status, "invalid");

  for (const [field, code] of [
    ["formatVersion", "unsupported_format_version"],
    ["payloadSchemaVersion", "unsupported_payload_schema_version"],
  ] as const) {
    const candidate = mutableEnvelope();
    candidate[field] = 2;
    const report = inspectFitCoreBackupEnvelope(candidate);
    assert.equal(report.status, "unsupported_version");
    assert.deepEqual(issueCodes(report), [code]);
    assertSummary(report);
  }
});

test("inspection blocks unsafe payload keys and cyclic candidates without throwing", () => {
  const unsafe = mutableEnvelope();
  addOwn(asRecord(unsafe.payload as object), "__proto__", "inspection-private-sentinel");
  const unsafeReport = inspectFitCoreBackupEnvelope(unsafe);
  assert.equal(unsafeReport.status, "invalid");
  assert.deepEqual(issueCodes(unsafeReport), ["unsafe_object_key"]);
  assert.equal(JSON.stringify(unsafeReport).includes("inspection-private-sentinel"), false);

  const cyclic = mutableEnvelope();
  const payload = asRecord(cyclic.payload as object);
  payload.cycle = payload;
  assert.doesNotThrow(() => inspectFitCoreBackupEnvelope(cyclic));
  assert.deepEqual(issueCodes(inspectFitCoreBackupEnvelope(cyclic)), ["cyclic_reference"]);

  for (const targetName of ["envelope", "policies"] as const) {
    const candidate = mutableEnvelope();
    const target = targetName === "envelope" ? candidate : asRecord(candidate.policies as object);
    addOwn(target, "constructor", "unsafe-envelope-private-sentinel");
    const report = inspectFitCoreBackupEnvelope(candidate);
    assert.deepEqual(issueCodes(report), ["unsafe_object_key"]);
    assert.equal(JSON.stringify(report).includes("unsafe-envelope-private-sentinel"), false);
  }
});

test("serializes valid envelopes canonically and blocks invalid or unsupported envelopes", () => {
  const source = warningState();
  const candidate = envelope(source);
  const first = serializeFitCoreBackupEnvelope(candidate);
  const second = serializeFitCoreBackupEnvelope(candidate);
  assert.equal(first.status, "serialized");
  assert.equal(first.safeToExport, true);
  assert.equal(first.requiresReview, true);
  assert.notEqual(first.json, null);
  assert.equal(first.characterCount, first.json!.length);
  assert.deepEqual(first, second);
  assert.deepEqual((JSON.parse(first.json!) as { payload: unknown }).payload, source);
  assertSummary(first);
  assertDeepFrozen(first);

  const invalid = mutableEnvelope();
  invalid.format = "invalid-private-format";
  const blocked = serializeFitCoreBackupEnvelope(invalid);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.safeToExport, false);
  assert.equal(blocked.json, null);
  assert.equal(blocked.characterCount, 0);
  assert.equal(JSON.stringify(blocked).includes("invalid-private-format"), false);
  assertSummary(blocked);

  const future = mutableEnvelope();
  future.formatVersion = 2;
  const unsupported = serializeFitCoreBackupEnvelope(future);
  assert.equal(unsupported.status, "unsupported_version");
  assert.equal(unsupported.json, null);
  assertSummary(unsupported);
});

test("preserves sentinels across every requested payload area after canonical round-trip", () => {
  const source = preservationState();
  const result = create(source);
  assert.equal(result.safeToExport, true);
  const serialization = serializeFitCoreBackupEnvelope(result.envelope);
  assert.equal(serialization.status, "serialized");
  const parsed = JSON.parse(serialization.json!) as { payload: AppState };
  assert.deepEqual(parsed.payload, source);
  for (const sentinel of [
    "workout-name-sentinel",
    "exercise-name-sentinel",
    "meal-name-sentinel",
    "ai-message-sentinel",
    "supplement-name-sentinel",
    "recovery-notes-sentinel",
    "goal-description-sentinel",
    "photo-metadata-sentinel",
    "audit-patch-sentinel",
    "unknown-warning-sentinel",
  ]) {
    assert.equal(serialization.json!.includes(sentinel), true);
  }
});

test("failure and inspection reports never expose submitted payload values or keys", () => {
  const sentinel = "failure-private-value-sentinel";
  const privateKey = "failurePrivateKeySentinel";
  const invalid = state();
  invalid.jarvisLearning = { [privateKey]: sentinel, bad: undefined };
  const creation = create(invalid);
  assert.equal(JSON.stringify(creation).includes(sentinel), false);
  assert.equal(JSON.stringify(creation).includes(privateKey), false);

  const candidate = mutableEnvelope();
  const payload = asRecord(candidate.payload as object);
  payload[privateKey] = sentinel;
  payload.bad = undefined;
  const inspection = inspectFitCoreBackupEnvelope(candidate);
  const serialization = serializeFitCoreBackupEnvelope(candidate);
  for (const report of [inspection, serialization]) {
    const json = JSON.stringify(report);
    assert.equal(json.includes(sentinel), false);
    assert.equal(json.includes(privateKey), false);
    assert.equal(json.includes("digest"), false);
    assert.equal(json.includes("fingerprint"), false);
  }
});

test("preserves missing versus zero without truthiness filtering or defaults", () => {
  const source = state();
  source.jarvisLearning = { zero: 0, off: false, empty: "", nullable: null };
  delete source.profile.name;
  const payload = envelope(source).payload;
  assert.equal(payload.jarvisLearning.zero, 0);
  assert.equal(payload.jarvisLearning.off, false);
  assert.equal(payload.jarvisLearning.empty, "");
  assert.equal(payload.jarvisLearning.nullable, null);
  assert.equal(Object.hasOwn(payload.profile, "name"), false);
});

test("round-trips reports and payloads and never shares caller-owned references", () => {
  const source = preservationState();
  const result = create(source);
  const serialized = serializeFitCoreBackupEnvelope(result.envelope);
  const parsedEnvelope = JSON.parse(serialized.json!);
  assert.deepEqual(parsedEnvelope.payload, source);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.deepEqual(
    JSON.parse(JSON.stringify(inspectFitCoreBackupEnvelope(parsedEnvelope))),
    inspectFitCoreBackupEnvelope(parsedEnvelope),
  );
  source.jarvisLearning = { changed: true };
  assert.equal(Object.hasOwn(result.envelope!.payload.jarvisLearning, "changed"), false);
});

test("accepts deeply frozen input and never mutates candidates or returned frozen data", () => {
  const source = preservationState();
  const freeze = (value: unknown): void => {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
  };
  freeze(source);
  const result = create(source);
  assert.equal(result.safeToExport, true);
  assertDeepFrozen(result);
  const before = JSON.stringify(result.envelope);
  assert.throws(() => {
    asRecord(result.envelope!.payload).version = 99;
  });
  assert.equal(JSON.stringify(result.envelope), before);

  const candidate = mutableEnvelope();
  const candidateBefore = structuredClone(candidate);
  inspectFitCoreBackupEnvelope(candidate);
  serializeFitCoreBackupEnvelope(candidate);
  assert.deepEqual(candidate, candidateBefore);
});

test("all creation, inspection, and serialization summaries reconcile", () => {
  const successful = create();
  const warning = create(warningState());
  const blocked = create({});
  const validInspection = inspectFitCoreBackupEnvelope(successful.envelope);
  const unsupportedCandidate = mutableEnvelope();
  unsupportedCandidate.formatVersion = 2;
  const unsupported = inspectFitCoreBackupEnvelope(unsupportedCandidate);
  const invalid = inspectFitCoreBackupEnvelope({});
  const serialized = serializeFitCoreBackupEnvelope(successful.envelope);
  const blockedSerialization = serializeFitCoreBackupEnvelope({});
  for (const report of [
    successful,
    warning,
    blocked,
    validInspection,
    unsupported,
    invalid,
    serialized,
    blockedSerialization,
  ]) {
    assertSummary(report);
  }
});

test("handles a deterministic approximately 2,000-record fixture losslessly", () => {
  const source = state();
  source.workouts = Array.from({ length: 2_000 }, (_, index) => ({
    id: `large-workout-${index.toString().padStart(4, "0")}`,
    name: `Large Workout ${index}`,
    startedAt: AT + index,
    endedAt: AT + index + 1,
    exercises: [],
  }));
  const before = structuredClone(source);
  const first = create(source);
  const second = create(source);
  assert.equal(first.status, "created");
  assert.deepEqual(first, second);
  const inspection = inspectFitCoreBackupEnvelope(first.envelope);
  const serialization = serializeFitCoreBackupEnvelope(first.envelope);
  assert.equal(inspection.status, "valid");
  assert.equal(serialization.status, "serialized");
  assert.equal(
    serialization.characterCount <= FITCORE_BACKUP_EXPORT_LIMITS.maxSerializedCharacters,
    true,
  );
  assert.deepEqual((JSON.parse(serialization.json!) as { payload: AppState }).payload, source);
  assert.deepEqual(source, before);
});
