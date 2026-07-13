import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_IMPORT_INSPECTION_LIMITS,
  FITCORE_IMPORT_INSPECTION_POLICY,
  inspectFitCoreImport,
  type FitCoreImportInspectionCheckCode,
  type FitCoreImportInspectionReport,
  type FitCoreImportInspectionStatus,
} from "../../src/lib/data-import-inspection.ts";
import {
  FITCORE_DATA_INTEGRITY_POLICY,
  validateFitCoreDataIntegrity,
} from "../../src/lib/data-integrity.ts";
import {
  createFitCoreDataRepairPlan,
  FITCORE_DATA_REPAIR_PLAN_POLICY,
} from "../../src/lib/data-repair-plan.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const AT = 1_700_000_000_000;

function state(): AppState {
  return structuredClone(defaultState);
}

function validText(candidate: AppState = state()): string {
  return JSON.stringify(candidate);
}

function check(report: FitCoreImportInspectionReport, code: FitCoreImportInspectionCheckCode) {
  const result = report.checks.find((candidate) => candidate.code === code);
  assert.notEqual(result, undefined);
  return result!;
}

function stage(report: FitCoreImportInspectionReport, code: string) {
  const result = report.stages.find((candidate) => candidate.stage === code);
  assert.notEqual(result, undefined);
  return result!;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function assertDeepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
}

function assertJsonSafe(value: unknown): void {
  const serialized = JSON.stringify(value);
  const roundTrip = JSON.parse(serialized);
  assert.deepEqual(roundTrip, value);
  const visit = (item: unknown): void => {
    assert.notEqual(typeof item, "undefined");
    assert.notEqual(typeof item, "function");
    assert.notEqual(typeof item, "symbol");
    assert.notEqual(typeof item, "bigint");
    if (typeof item === "number") assert.equal(Number.isFinite(item), true);
    if (item !== null && typeof item === "object") {
      assert.equal(item instanceof Date, false);
      assert.equal(item instanceof Map, false);
      assert.equal(item instanceof Set, false);
      for (const child of Object.values(item)) visit(child);
    }
  };
  visit(value);
}

function assertSummary(report: FitCoreImportInspectionReport): void {
  const byStatus = (status: string) =>
    report.checks.filter((item) => item.status === status).length;
  assert.deepEqual(report.summary, {
    totalCheckCount: report.checks.length,
    passedCheckCount: byStatus("passed"),
    warningCheckCount: byStatus("warning"),
    failedCheckCount: byStatus("failed"),
    notRunCheckCount: byStatus("not_run"),
    integrityIssueCount: report.integrityReport?.issueCount ?? 0,
    repairPlanEntryCount: report.repairPlan?.entries.length ?? 0,
    confirmationRequiredCount: report.repairPlan?.summary.confirmationRequiredCount ?? 0,
    structuralLimitViolationCount: report.checks.filter(
      (item) =>
        item.status === "failed" &&
        [
          "payload_character_limit_exceeded",
          "maximum_depth_exceeded",
          "maximum_node_count_exceeded",
          "maximum_array_length_exceeded",
          "maximum_object_key_count_exceeded",
          "maximum_string_length_exceeded",
        ].includes(item.code),
    ).length,
    unsafeKeyCount: report.summary.unsafeKeyCount,
  });
  assert.equal(
    report.summary.passedCheckCount +
      report.summary.warningCheckCount +
      report.summary.failedCheckCount +
      report.summary.notRunCheckCount,
    report.summary.totalCheckCount,
  );
}

function nestedJson(depth: number): string {
  return `${'{"next":'.repeat(depth)}null${"}".repeat(depth)}`;
}

function nodeFixture(valueNodeCount: number): string {
  const lengths = [50_000, 50_000, 50_000, 50_000, valueNodeCount - 200_000];
  const groups = lengths.map((length) => `[${"null,".repeat(length - 1)}null]`);
  return `{"groups":[${groups.join(",")}]}`;
}

test("policy attribution, fixed frozen limits, and arbitrary unknown input are supported", () => {
  assert.equal(FITCORE_IMPORT_INSPECTION_POLICY, "fitcore_import_inspection_v1");
  assert.deepEqual(FITCORE_IMPORT_INSPECTION_LIMITS, {
    maxCharacters: 10_000_000,
    maxDepth: 64,
    maxNodes: 250_000,
    maxArrayLength: 50_000,
    maxObjectKeys: 10_000,
    maxStringLength: 1_000_000,
  });
  assert.equal(Object.isFrozen(FITCORE_IMPORT_INSPECTION_LIMITS), true);
  for (const input of [undefined, null, 1, false, {}, [], new Date(), new Map()]) {
    const report = inspectFitCoreImport(input);
    assert.equal(report.policy, FITCORE_IMPORT_INSPECTION_POLICY);
    assert.equal(report.integrityPolicy, FITCORE_DATA_INTEGRITY_POLICY);
    assert.equal(report.repairPlanPolicy, FITCORE_DATA_REPAIR_PLAN_POLICY);
    assert.equal(report.status, "invalid_input");
  }
});

test("input classification rejects non-text, empty, and whitespace-only values honestly", () => {
  for (const input of [null, {}, []]) {
    const report = inspectFitCoreImport(input);
    assert.equal(report.inputKind, "unsupported");
    assert.equal(report.rootKind, "unavailable");
    assert.equal(report.safeToImport, false);
    assert.equal(stage(report, "input").status, "failed");
    assert.equal(stage(report, "parse").status, "not_run");
  }
  for (const input of ["", "  \r\n\t "]) {
    const report = inspectFitCoreImport(input);
    assert.equal(report.inputKind, "json_text");
    assert.equal(report.status, "invalid_input");
    assert.equal(check(report, "empty_input").status, "failed");
    assert.equal(stage(report, "parse").status, "not_run");
  }
  assert.equal(inspectFitCoreImport("{}").inputKind, "json_text");
});

test("standard JSON parsing blocks malformed, trailing-comma, and commented input without parser detail", () => {
  const sentinels = ["{MALFORMED-SENTINEL", '{"x":1,}', '{/*COMMENT-SENTINEL*/"x":1}'];
  for (const input of sentinels) {
    const report = inspectFitCoreImport(input);
    const serialized = JSON.stringify(report);
    assert.equal(report.status, "blocked");
    assert.equal(check(report, "invalid_json").status, "failed");
    assert.equal(stage(report, "structure").status, "not_run");
    assert.equal(report.integrityReport, null);
    assert.equal(report.repairPlan, null);
    assert.equal(serialized.includes(input), false);
    assert.equal(serialized.includes("SyntaxError"), false);
    assert.equal(serialized.includes("Unexpected"), false);
  }
  assert.deepEqual(inspectFitCoreImport(validText()), inspectFitCoreImport(validText()));
});

test("all parsed root kinds are closed and only object roots continue", () => {
  const cases: [string, string][] = [
    ["[]", "array"],
    ['"text"', "string"],
    ["1", "number"],
    ["false", "boolean"],
    ["null", "null"],
  ];
  for (const [input, rootKind] of cases) {
    const report = inspectFitCoreImport(input);
    assert.equal(report.rootKind, rootKind);
    assert.equal(report.status, "blocked");
    assert.equal(check(report, "unsupported_root").status, "failed");
    assert.equal(stage(report, "integrity").status, "not_run");
  }
  const object = inspectFitCoreImport("{}");
  assert.equal(object.rootKind, "object");
  assert.equal(check(object, "unsupported_root").status, "passed");
  assert.notEqual(object.integrityReport, null);
});

test("character limit allows equality and blocks greater input before parsing", () => {
  const exact = `0${" ".repeat(FITCORE_IMPORT_INSPECTION_LIMITS.maxCharacters - 1)}`;
  const atLimit = inspectFitCoreImport(exact);
  assert.equal(atLimit.structure.characterCount, FITCORE_IMPORT_INSPECTION_LIMITS.maxCharacters);
  assert.equal(check(atLimit, "payload_character_limit_exceeded").status, "passed");
  assert.equal(check(atLimit, "invalid_json").status, "passed");
  assert.equal(atLimit.rootKind, "number");

  const over = `${exact} `;
  const blocked = inspectFitCoreImport(over);
  assert.equal(blocked.status, "blocked");
  assert.equal(check(blocked, "payload_character_limit_exceeded").status, "failed");
  assert.equal(check(blocked, "invalid_json").status, "not_run");
  assert.equal(JSON.stringify(blocked).includes(over), false);
});

test("depth boundary is inclusive and excessive depth is blocked", () => {
  const exact = inspectFitCoreImport(nestedJson(FITCORE_IMPORT_INSPECTION_LIMITS.maxDepth));
  assert.equal(check(exact, "maximum_depth_exceeded").status, "passed");
  assert.equal(exact.structure.maximumDepthObserved, FITCORE_IMPORT_INSPECTION_LIMITS.maxDepth);

  const over = inspectFitCoreImport(nestedJson(FITCORE_IMPORT_INSPECTION_LIMITS.maxDepth + 1));
  assert.equal(over.status, "blocked");
  assert.equal(check(over, "maximum_depth_exceeded").status, "failed");
  assert.equal(stage(over, "integrity").status, "not_run");
});

test("array-length boundary is inclusive and excessive arrays are not truncated", () => {
  const exactText = JSON.stringify({
    items: Array(FITCORE_IMPORT_INSPECTION_LIMITS.maxArrayLength).fill(null),
  });
  const exact = inspectFitCoreImport(exactText);
  assert.equal(check(exact, "maximum_array_length_exceeded").status, "passed");
  assert.equal(exact.structure.arrayCount, 1);

  const overText = JSON.stringify({
    items: Array(FITCORE_IMPORT_INSPECTION_LIMITS.maxArrayLength + 1).fill(null),
  });
  const over = inspectFitCoreImport(overText);
  assert.equal(check(over, "maximum_array_length_exceeded").status, "failed");
  assert.equal(over.status, "blocked");
  assert.equal(JSON.stringify(over).includes(overText), false);
});

test("object-key boundary is inclusive and excessive key counts are blocked", () => {
  const object = (count: number) =>
    Object.fromEntries(Array.from({ length: count }, (_, index) => [`k${index}`, null]));
  const exact = inspectFitCoreImport(
    JSON.stringify(object(FITCORE_IMPORT_INSPECTION_LIMITS.maxObjectKeys)),
  );
  assert.equal(check(exact, "maximum_object_key_count_exceeded").status, "passed");
  assert.equal(exact.structure.topLevelFieldCount, FITCORE_IMPORT_INSPECTION_LIMITS.maxObjectKeys);

  const over = inspectFitCoreImport(
    JSON.stringify(object(FITCORE_IMPORT_INSPECTION_LIMITS.maxObjectKeys + 1)),
  );
  assert.equal(over.status, "blocked");
  assert.equal(check(over, "maximum_object_key_count_exceeded").status, "failed");
});

test("string-length boundary is inclusive and excessive strings are blocked", () => {
  const exactValue = "x".repeat(FITCORE_IMPORT_INSPECTION_LIMITS.maxStringLength);
  const exact = inspectFitCoreImport(JSON.stringify({ field: exactValue }));
  assert.equal(check(exact, "maximum_string_length_exceeded").status, "passed");
  assert.equal(exact.structure.stringCount, 1);

  const overValue = `${exactValue}x`;
  const over = inspectFitCoreImport(JSON.stringify({ field: overValue }));
  assert.equal(over.status, "blocked");
  assert.equal(check(over, "maximum_string_length_exceeded").status, "failed");
  assert.equal(JSON.stringify(over).includes(overValue), false);
});

test("node-count boundary uses root plus every property value and array element", () => {
  const exactValueNodes = FITCORE_IMPORT_INSPECTION_LIMITS.maxNodes - 7;
  const exact = inspectFitCoreImport(nodeFixture(exactValueNodes));
  assert.equal(exact.structure.nodeCount, FITCORE_IMPORT_INSPECTION_LIMITS.maxNodes);
  assert.equal(check(exact, "maximum_node_count_exceeded").status, "passed");

  const over = inspectFitCoreImport(nodeFixture(exactValueNodes + 1));
  assert.equal(over.structure.nodeCount, FITCORE_IMPORT_INSPECTION_LIMITS.maxNodes + 1);
  assert.equal(check(over, "maximum_node_count_exceeded").status, "failed");
  assert.equal(over.status, "blocked");
});

test("top-level and nested unsafe keys block before Task 1 or Task 2", () => {
  const inputs = [
    '{"__proto__":{"NEIGHBOR-SENTINEL":1},"safe":"PRIVATE-SENTINEL"}',
    '{"nested":{"prototype":"PRIVATE-SENTINEL"}}',
    '{"nested":{"deeper":{"constructor":"PRIVATE-SENTINEL"}}}',
  ];
  for (const input of inputs) {
    const report = inspectFitCoreImport(input);
    const serialized = JSON.stringify(report);
    assert.equal(report.status, "blocked");
    assert.equal(check(report, "unsafe_object_key").status, "failed");
    assert.equal(stage(report, "integrity").status, "not_run");
    assert.equal(stage(report, "repair_plan").status, "not_run");
    assert.equal(report.integrityReport, null);
    assert.equal(report.repairPlan, null);
    assert.equal(report.summary.unsafeKeyCount, 1);
    assert.equal(serialized.includes("PRIVATE-SENTINEL"), false);
    assert.equal(serialized.includes("NEIGHBOR-SENTINEL"), false);
  }
});

test("a current valid AppState is eligible but is not imported or returned", () => {
  const text = validText();
  const report = inspectFitCoreImport(text);

  assert.equal(report.status, "eligible");
  assert.equal(report.safeToImport, true);
  assert.equal(report.inputKind, "json_text");
  assert.equal(report.rootKind, "object");
  assert.equal(report.integrityReport?.status, "valid");
  assert.equal(report.integrityReport?.issueCount, 0);
  assert.equal(report.repairPlan?.status, "no_action");
  assert.equal(report.repairPlan?.entries.length, 0);
  assert.equal(
    report.stages.every(({ status }) => status === "passed"),
    true,
  );
  assert.equal(JSON.stringify(report).includes(text), false);
  assert.equal("payload" in report, false);
  assert.equal("parsed" in report, false);
  assert.equal("state" in report, false);
});

test("warning-level integrity and repair proposals require review and never execute", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.unknownField = { private: "NOT-RETURNED" };
  const report = inspectFitCoreImport(JSON.stringify(candidate));

  assert.equal(report.status, "review_required");
  assert.equal(report.safeToImport, false);
  assert.equal(report.integrityReport?.status, "warnings");
  assert.equal(report.integrityReport?.warningCount, 1);
  assert.equal(report.repairPlan?.status, "actions_proposed");
  assert.equal(report.repairPlan?.entries.length, 1);
  assert.equal(report.repairPlan?.entries[0].requiresUserConfirmation, true);
  assert.equal(check(report, "repair_actions_proposed").status, "warning");
  assert.equal(JSON.stringify(report).includes("NOT-RETURNED"), false);
});

test("integrity-invalid current-format objects are blocked without repair or defaults", () => {
  const fixtures = [
    (() => {
      const candidate = state() as unknown as Record<string, unknown>;
      delete candidate.workouts;
      return candidate;
    })(),
    { ...state(), workouts: {} },
    { ...state(), mealEntries: [null] },
    { ...state(), nutritionTargets: { ...state().nutritionTargets, calories: -1 } },
  ];
  for (const fixture of fixtures) {
    const before = structuredClone(fixture);
    const report = inspectFitCoreImport(JSON.stringify(fixture));
    assert.equal(report.status, "blocked");
    assert.equal(report.safeToImport, false);
    assert.equal(report.integrityReport?.status, "invalid");
    assert.equal(check(report, "integrity_invalid").status, "failed");
    assert.notEqual(report.repairPlan, null);
    assert.equal(stage(report, "eligibility").status, "failed");
    assert.deepEqual(fixture, before);
  }
});

test("Task 2 no-action, review, actions, and unavailable states map conservatively", () => {
  const eligible = inspectFitCoreImport(validText());
  assert.equal(eligible.repairPlan?.status, "no_action");
  assert.equal(eligible.status, "eligible");

  const reused = state();
  reused.mealEntries = [
    {
      id: "shared",
      name: "Meal",
      type: "meal",
      calories: 1,
      protein: 1,
      carbs: 1,
      fat: 1,
      createdAt: AT,
    },
  ];
  reused.bodyweightEntries = [{ id: "shared", weightLb: 180, createdAt: AT }];
  const review = inspectFitCoreImport(validText(reused));
  assert.equal(review.repairPlan?.status, "review_required");
  assert.equal(review.status, "review_required");

  const proposed = inspectFitCoreImport(JSON.stringify({ ...state(), extension: true }));
  assert.equal(proposed.repairPlan?.status, "actions_proposed");
  assert.equal(proposed.status, "review_required");

  const rootBlocked = inspectFitCoreImport("[]");
  assert.equal(rootBlocked.repairPlan, null);
  assert.equal(rootBlocked.status, "blocked");
});

test("zero, false, null, optional empty text, and allowed negative values are not reinterpreted", () => {
  const candidate = state();
  candidate.version = 1;
  candidate.onboardingComplete = false;
  candidate.demoMode = false;
  candidate.activeWorkout = null;
  candidate.nutritionTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  candidate.mealEntries = [
    {
      id: "zero-meal",
      name: "Meal",
      type: "meal",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      notes: "",
      confirmed: false,
      createdAt: 0,
    },
  ];
  candidate.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  const eligible = inspectFitCoreImport(validText(candidate));
  assert.equal(eligible.status, "eligible");

  const missing = structuredClone(candidate) as unknown as Record<string, unknown>;
  delete missing.workouts;
  const blocked = inspectFitCoreImport(JSON.stringify(missing));
  assert.equal(blocked.status, "blocked");
  assert.equal(
    blocked.integrityReport?.issues.some(({ code }) => code === "missing_required_top_level_field"),
    true,
  );
});

test("stage results remain honest at every early and downstream stop", () => {
  const cases: [unknown, string, Record<string, string>][] = [
    [1, "invalid_input", { input: "failed", parse: "not_run", structure: "not_run" }],
    ["{", "blocked", { input: "passed", parse: "failed", structure: "not_run" }],
    [
      '{"constructor":1}',
      "blocked",
      { input: "passed", parse: "passed", structure: "failed", integrity: "not_run" },
    ],
    [
      JSON.stringify({ ...state(), workouts: {} }),
      "blocked",
      {
        structure: "passed",
        integrity: "failed",
        repair_plan: "warning",
        eligibility: "failed",
      },
    ],
    [
      validText(),
      "eligible",
      {
        input: "passed",
        parse: "passed",
        structure: "passed",
        integrity: "passed",
        repair_plan: "passed",
        eligibility: "passed",
      },
    ],
  ];
  for (const [input, status, expectedStages] of cases) {
    const report = inspectFitCoreImport(input);
    assert.equal(report.status, status);
    for (const [stageCode, expected] of Object.entries(expectedStages)) {
      assert.equal(stage(report, stageCode).status, expected);
    }
  }
});

test("structural summary follows the documented hand-counted node and depth rules", () => {
  const report = inspectFitCoreImport('{"a":[1,true,null],"b":{"c":"x"}}');
  assert.deepEqual(report.structure, {
    characterCount: 33,
    nodeCount: 7,
    maximumDepthObserved: 2,
    objectCount: 2,
    arrayCount: 1,
    stringCount: 1,
    numberCount: 1,
    booleanCount: 1,
    nullCount: 1,
    topLevelFieldCount: 2,
  });
  for (const value of Object.values(report.structure)) {
    assert.equal(Number.isFinite(value), true);
    assert.equal(Number.isInteger(value), true);
    assert.equal(value >= 0, true);
  }
});

test("check, stage, and limitation ordering are deterministic and key-order independent", () => {
  const firstText = JSON.stringify({ ...state(), zeta: true, alpha: false });
  const reorderedText = JSON.stringify(
    Object.fromEntries(Object.entries(JSON.parse(firstText)).reverse()),
    null,
    2,
  );
  const first = inspectFitCoreImport(firstText);
  const repeated = inspectFitCoreImport(firstText);
  const reordered = inspectFitCoreImport(reorderedText);

  assert.deepEqual(first, repeated);
  assert.equal(JSON.stringify(first), JSON.stringify(repeated));
  assert.deepEqual(first.checks, reordered.checks);
  assert.deepEqual(first.stages, reordered.stages);
  assert.deepEqual(first.integrityReport, reordered.integrityReport);
  assert.deepEqual(first.repairPlan, reordered.repairPlan);
  assert.equal(first.status, reordered.status);
  assert.notEqual(first.structure.characterCount, reordered.structure.characterCount);
  for (const item of first.checks) {
    assert.deepEqual(item.limitationKeys, [...item.limitationKeys].sort());
  }
  assert.deepEqual(
    first.stages.map(({ stage: code }) => code),
    ["input", "parse", "structure", "integrity", "repair_plan", "eligibility"],
  );
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes("Date.now"), false);
  assert.equal(serialized.includes("random"), false);
});

test("sensitive values, submitted text, IDs, parser detail, and fingerprints are excluded", () => {
  const sentinels = [
    "WORKOUT-NAME-811a",
    "EXERCISE-NAME-b2f0",
    "MEAL-NAME-3a9e",
    "AI-MESSAGE-7cc1",
    "SUPPLEMENT-NAME-02fd",
    "RECOVERY-NOTE-e820",
    "GOAL-DESCRIPTION-8f10",
    "PHOTO-METADATA-cb31",
    "AUDIT-PATCH-a0e4",
    "UNKNOWN-VALUE-91fe",
    "MALFORMED-CONTENT-3ddd",
    "RAW-ID-72aa",
  ];
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.workouts = [
    {
      id: sentinels[11],
      name: sentinels[0],
      startedAt: AT,
      exercises: [
        {
          id: "exercise",
          exerciseId: sentinels[1],
          completed: true,
          sets: [],
        },
      ],
    },
  ];
  candidate.mealEntries = [
    {
      id: "meal",
      name: sentinels[2],
      type: "meal",
      calories: 1,
      protein: 1,
      carbs: 1,
      fat: 1,
      createdAt: AT,
      unknownData: sentinels[9],
    },
  ];
  candidate.aiMessages = [{ id: "message", role: "user", content: sentinels[3], createdAt: AT }];
  candidate.supplementLogs = [{ id: "supplement", name: sentinels[4], createdAt: AT }];
  candidate.recoveryCheckIns = [sentinels[10]];
  candidate.recoverySignals = [
    {
      id: "signal",
      sourceLogId: "meal",
      kind: "pain",
      severity: 2,
      notes: sentinels[5],
      createdAt: AT,
      source: "manual",
    },
  ];
  candidate.goals = [{ id: "goal", type: "habit", label: sentinels[6], target: 1, current: 0 }];
  candidate.progressPhotos = [
    { id: "photo", dataUrl: sentinels[7], view: "front", phase: "bulk", createdAt: AT },
  ];
  candidate.jarvisAudit = [
    {
      id: "audit",
      tool: "tool",
      summary: "summary",
      status: "logged",
      patch: { private: sentinels[8] },
      createdAt: AT,
    },
  ];
  const submitted = JSON.stringify(candidate);
  const serialized = JSON.stringify(inspectFitCoreImport(submitted));

  for (const sentinel of sentinels) assert.equal(serialized.includes(sentinel), false);
  assert.equal(serialized.includes(submitted), false);
  assert.equal(serialized.includes("SyntaxError"), false);
  assert.equal(serialized.includes("digest"), false);
  assert.equal(serialized.includes("fingerprint"), false);
});

test("reports are JSON-safe, deeply frozen, and contain no submitted object reference", () => {
  const report = inspectFitCoreImport(validText());
  assertJsonSafe(report);
  assertDeepFrozen(report);
  const before = JSON.stringify(report);

  assert.throws(() => ((report as unknown as { status: string }).status = "blocked"));
  assert.throws(() => (report.checks as unknown as unknown[]).push({}));
  assert.throws(() => (report.integrityReport!.issues as unknown as unknown[]).push({}));
  assert.throws(() => (report.repairPlan!.entries as unknown as unknown[]).push({}));
  assert.equal(JSON.stringify(report), before);

  const objectInput = deepFreeze({ private: { nested: true } });
  const invalid = inspectFitCoreImport(objectInput);
  assert.equal(invalid.status, "invalid_input");
  assert.equal(JSON.stringify(invalid).includes("private"), false);
});

test("inspection does not modify independently produced Task 1 or Task 2 results", () => {
  const parsed = state();
  const integrity = validateFitCoreDataIntegrity(parsed);
  const plan = createFitCoreDataRepairPlan(parsed);
  const integrityBefore = structuredClone(integrity);
  const planBefore = structuredClone(plan);

  inspectFitCoreImport(JSON.stringify(parsed));

  assert.deepEqual(integrity, integrityBefore);
  assert.deepEqual(plan, planBefore);
  assert.deepEqual(parsed, state());
});

test("summary counts reconcile for invalid, structural, review, and eligible reports", () => {
  const reviewCandidate = { ...state(), unknownField: true };
  const reports = [
    inspectFitCoreImport(null),
    inspectFitCoreImport('{"constructor":1}'),
    inspectFitCoreImport(JSON.stringify(reviewCandidate)),
    inspectFitCoreImport(validText()),
  ];
  for (const report of reports) assertSummary(report);
  assert.deepEqual(
    reports.map(({ status }) => status),
    ["invalid_input", "blocked", "review_required", "eligible"],
  );
});

test("approximately 2,000 records inspect deterministically without returning source data", () => {
  const candidate = state();
  candidate.mealEntries = Array.from({ length: 2_000 }, (_, index) => ({
    id: `meal-${index}`,
    name: `PRIVATE-MEAL-${index}`,
    type: "meal",
    calories: 1,
    protein: 1,
    carbs: 1,
    fat: 1,
    createdAt: AT + index,
  }));
  const text = JSON.stringify(candidate);
  const first = inspectFitCoreImport(text);
  const second = inspectFitCoreImport(text);

  assert.equal(first.status, "eligible");
  assert.equal(first.structure.nodeCount > 2_000, true);
  assert.equal(first.structure.nodeCount <= FITCORE_IMPORT_INSPECTION_LIMITS.maxNodes, true);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assertJsonSafe(first);
  assert.equal(JSON.stringify(first).includes("PRIVATE-MEAL"), false);
  assert.equal(JSON.stringify(first).includes(text), false);
});
