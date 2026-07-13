import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_DATA_INTEGRITY_POLICY,
  validateFitCoreDataIntegrity,
  type DataIntegrityIssueCode,
} from "../../src/lib/data-integrity.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const AT = 1_700_000_000_000;

function state(): AppState {
  return structuredClone(defaultState);
}

function workout(id = "workout-1", templateId?: string) {
  return {
    id,
    name: "Strength",
    startedAt: AT,
    endedAt: AT + 3_600_000,
    ...(templateId === undefined ? {} : { templateId }),
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId: "built-in-bench-press",
        completed: true,
        sets: [{ id: `${id}-set`, reps: 5, weight: 100, completed: true }],
      },
    ],
  };
}

function meal(id = "meal-1") {
  return {
    id,
    name: "Breakfast",
    type: "breakfast",
    calories: 500,
    protein: 40,
    carbs: 55,
    fat: 15,
    createdAt: AT,
  };
}

function checkIn(id = "check-1") {
  return {
    id,
    energy: 0,
    soreness: 3,
    stress: 4,
    motivation: 8,
    createdAt: AT,
  };
}

function signal(sourceLogId: string, id = "signal-1") {
  return {
    id,
    sourceLogId,
    kind: "soreness",
    severity: 4,
    notes: "",
    createdAt: AT,
    source: "manual",
  };
}

function issues(
  report: ReturnType<typeof validateFitCoreDataIntegrity>,
  code: DataIntegrityIssueCode,
) {
  return report.issues.filter((issue) => issue.code === code);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function assertJsonSafe(value: unknown): void {
  assert.doesNotThrow(() => JSON.stringify(value));
  const visit = (item: unknown): void => {
    assert.notEqual(typeof item, "undefined");
    assert.notEqual(typeof item, "function");
    assert.notEqual(typeof item, "symbol");
    if (typeof item === "number") assert.equal(Number.isFinite(item), true);
    if (item && typeof item === "object") {
      assert.equal(item instanceof Date, false);
      assert.equal(item instanceof Map, false);
      assert.equal(item instanceof Set, false);
      for (const child of Object.values(item)) visit(child);
    }
  };
  visit(value);
}

test("policy and current default state are valid, deterministic, and serializable", () => {
  const candidate = state();
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(FITCORE_DATA_INTEGRITY_POLICY, "fitcore_data_integrity_v1");
  assert.equal(report.policy, FITCORE_DATA_INTEGRITY_POLICY);
  assert.equal(report.status, "valid");
  assert.equal(report.rootRecognized, true);
  assert.equal(report.issueCount, 0);
  assert.equal(report.errorCount, 0);
  assert.equal(report.warningCount, 0);
  assert.deepEqual(report.checkedCollections, [...report.checkedCollections].sort());
  assert.equal(report.collectionCount, report.checkedCollections.length);
  assertJsonSafe(report);
});

test("ordinary invalid roots return invalid reports without throwing", () => {
  const roots = [
    null,
    undefined,
    [],
    "state",
    1,
    true,
    new Date(),
    new Map(),
    new Set(),
    () => null,
  ];
  for (const root of roots) {
    const report = validateFitCoreDataIntegrity(root);
    assert.equal(report.status, "invalid");
    assert.equal(report.rootRecognized, false);
    assert.equal(report.issueCount, 1);
    assert.equal(report.issues[0].code, "invalid_root");
    assertJsonSafe(report);
  }
});

test("missing top-level fields are reported without inserting defaults", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  delete candidate.workouts;
  delete candidate.profile;
  delete candidate.demoMode;
  const before = structuredClone(candidate);

  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(report.status, "invalid");
  assert.deepEqual(
    issues(report, "missing_required_top_level_field").map((issue) => issue.path),
    ["$.demoMode", "$.profile", "$.workouts"],
  );
  assert.deepEqual(candidate, before);
  assert.equal(Object.hasOwn(candidate, "workouts"), false);
});

test("unknown top-level data stays in the input but its raw value stays out of the report", () => {
  const secret = "distinct-unknown-value-3b81";
  const candidate = { ...state(), zetaExtension: { secret } };
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(report.status, "warnings");
  assert.deepEqual(
    issues(report, "unknown_top_level_field").map((issue) => issue.path),
    ["$.zetaExtension"],
  );
  assert.equal(JSON.stringify(report).includes(secret), false);
  assert.deepEqual(candidate.zetaExtension, { secret });
});

test("invalid top-level array, object, boolean, nullable record, and number types are identified", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.workouts = {};
  candidate.profile = [];
  candidate.demoMode = "false";
  candidate.activeWorkout = [];
  candidate.version = "4";
  candidate.dismissedSuggestions = {};

  const report = validateFitCoreDataIntegrity(candidate);
  assert.deepEqual(
    issues(report, "invalid_top_level_type").map((issue) => issue.path),
    [
      "$.activeWorkout",
      "$.demoMode",
      "$.dismissedSuggestions",
      "$.profile",
      "$.version",
      "$.workouts",
    ],
  );
});

test("every malformed object-collection element is reported", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.mealEntries = [null, "meal", 7, []];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.deepEqual(
    issues(report, "malformed_record").map((issue) => [issue.path, issue.valueType]),
    [
      ["$.mealEntries[0]", "null"],
      ["$.mealEntries[1]", "string"],
      ["$.mealEntries[2]", "number"],
      ["$.mealEntries[3]", "array"],
    ],
  );
});

test("partial workouts, meals, bodyweights, and recovery check-ins receive record and field issues", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.workouts = [{ id: "partial-workout" }];
  candidate.mealEntries = [{ id: "partial-meal", calories: 1 }];
  candidate.bodyweightEntries = [{ id: "partial-weight" }];
  candidate.recoveryCheckIns = [{ id: "partial-check", energy: 0 }];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(issues(report, "partial_record").length, 4);
  assert.equal(issues(report, "missing_required_field").length, 3 + 6 + 2 + 4);
  assert.equal(candidate.workouts[0].name, undefined);
});

test("blank IDs and required strings are distinguished from invalid field types", () => {
  const candidate = state();
  candidate.mealEntries = [
    { ...meal(" "), name: " " },
    { ...meal("meal-2"), id: 42 as unknown as string },
  ];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(issues(report, "empty_id").length, 1);
  assert.equal(issues(report, "empty_required_string").length, 1);
  assert.equal(
    issues(report, "invalid_field_type").some((issue) => issue.path === "$.mealEntries[1].id"),
    true,
  );
});

test("duplicates are found within top-level and nested scopes and across collections", () => {
  const candidate = state();
  const first = workout("same-workout");
  first.exercises.push({
    ...structuredClone(first.exercises[0]),
    sets: [
      structuredClone(first.exercises[0].sets[0]),
      structuredClone(first.exercises[0].sets[0]),
    ],
  });
  candidate.workouts = [first, workout("same-workout")];
  candidate.mealEntries = [meal("same-meal"), meal("same-meal")];
  candidate.bodyweightEntries = [{ id: "same-meal", weightLb: 180, createdAt: AT }];

  const report = validateFitCoreDataIntegrity(candidate);

  const duplicatePaths = issues(report, "duplicate_id").map((issue) => issue.path);
  assert.equal(duplicatePaths.includes("$.workouts[0].id"), true);
  assert.equal(duplicatePaths.includes("$.workouts[1].id"), true);
  assert.equal(duplicatePaths.includes("$.mealEntries[0].id"), true);
  assert.equal(duplicatePaths.includes("$.workouts[0].exercises[0].id"), true);
  assert.equal(duplicatePaths.includes("$.workouts[0].exercises[1].sets[0].id"), true);
  assert.equal(issues(report, "duplicate_id_cross_collection").length, 3);
  assert.deepEqual(report, validateFitCoreDataIntegrity(candidate));
});

test("timestamps reject non-finite and out-of-date-range values and enforce workout ordering", () => {
  const candidate = state();
  candidate.workouts = [
    { ...workout("nan"), startedAt: Number.NaN },
    { ...workout("infinity"), startedAt: Number.POSITIVE_INFINITY },
    { ...workout("negative-infinity"), startedAt: Number.NEGATIVE_INFINITY },
    { ...workout("too-large"), startedAt: Number.MAX_VALUE },
    { ...workout("reversed"), startedAt: AT, endedAt: AT - 1 },
  ];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(issues(report, "invalid_timestamp").length, 4);
  assert.equal(
    issues(report, "non_finite_number").filter((issue) => issue.field === "startedAt").length,
    3,
  );
  assert.equal(issues(report, "invalid_time_order").length, 1);
});

test("recognized numeric fields reject NaN and infinities", () => {
  const candidate = state();
  candidate.mealEntries = [{ ...meal(), calories: Number.NaN }];
  candidate.bodyweightEntries = [
    { id: "weight", weightLb: Number.POSITIVE_INFINITY, createdAt: AT },
  ];
  candidate.recoveryCheckIns = [{ ...checkIn(), stress: Number.NEGATIVE_INFINITY }];
  candidate.workouts = [workout()];
  candidate.workouts[0].exercises[0].sets[0].weight = Number.NaN;
  candidate.goals = [
    { id: "goal", type: "habit", label: "Goal", target: Number.POSITIVE_INFINITY, current: 0 },
  ];
  candidate.nutritionTargets.calories = Number.NEGATIVE_INFINITY;
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(issues(report, "non_finite_number").length, 6);
});

test("negative restrictions are field-specific and weekly weight change may be negative", () => {
  const candidate = state();
  candidate.mealEntries = [{ ...meal(), calories: -1, protein: -2 }];
  candidate.bodyweightEntries = [{ id: "weight", weightLb: -1, createdAt: AT }];
  candidate.sleepEntries = [{ id: "sleep", hours: -1, quality: 0, createdAt: AT }];
  candidate.recoverySignals = [{ ...signal("meal-1"), severity: -1 }];
  candidate.workouts = [workout()];
  Object.assign(candidate.workouts[0].exercises[0].sets[0], {
    reps: -1,
    weight: -2,
    durationMin: -3,
    distanceMi: -4,
  });
  candidate.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(issues(report, "prohibited_negative_value").length, 9);
  assert.equal(
    report.issues.some((issue) => issue.path.includes("weeklyWeightChangeLb")),
    false,
  );
});

test("representative closed enum fields are validated", () => {
  const candidate = state();
  candidate.workouts = [workout()];
  candidate.workouts[0].exercises[0].sets[0].modifier = "invalid" as "normal";
  candidate.recoverySignals = [{ ...signal("meal-1"), kind: "invalid" as "pain" }];
  candidate.progressPhotos = [
    {
      id: "photo",
      dataUrl: "data:image/png;base64,a",
      view: "invalid" as "front",
      phase: "bulk",
      createdAt: AT,
    },
  ];
  candidate.aiMessages = [
    { id: "message", role: "system" as "user", content: "content", createdAt: AT },
  ];
  candidate.goals = [
    { id: "goal", type: "invalid" as "habit", label: "Goal", target: 1, current: 0 },
  ];
  candidate.profile.units = "stone" as "lb";
  candidate.mealEntries = [
    {
      ...meal(),
      provenance: { source: "bad" as "manual", confidence: "high", confirmation: "confirmed" },
    },
  ];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(issues(report, "invalid_enum_value").length, 7);
});

test("unknown closed-record fields warn while open Jarvis learning and audit patches remain open", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.workouts = [{ ...workout(), unknownWorkout: "secret" }];
  candidate.mealEntries = [
    {
      ...meal(),
      unknownMeal: "secret",
      provenance: {
        source: "manual",
        confidence: "high",
        confirmation: "confirmed",
        unknownProvenance: "secret",
      },
    },
  ];
  candidate.recoveryCheckIns = [{ ...checkIn(), unknownCheck: "secret" }];
  candidate.jarvisLearning = { arbitrary: { deeply: { nested: true } } };
  candidate.jarvisAudit = [
    {
      id: "audit",
      tool: "tool",
      summary: "summary",
      status: "logged",
      createdAt: AT,
      patch: { anything: { stays: true } },
    },
  ];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.deepEqual(
    issues(report, "unknown_record_field").map((issue) => issue.path),
    [
      "$.mealEntries[0].provenance.unknownProvenance",
      "$.mealEntries[0].unknownMeal",
      "$.recoveryCheckIns[0].unknownCheck",
      "$.workouts[0].unknownWorkout",
    ],
  );
  assert.equal(
    report.issues.some(
      (issue) => issue.path.includes("jarvisLearning") || issue.path.includes("patch.anything"),
    ),
    false,
  );
});

test("recovery signal references resolve only against recognized log-bearing IDs", () => {
  const candidate = state();
  candidate.recoverySignals = [signal("source-log")];
  let report = validateFitCoreDataIntegrity(candidate);
  assert.equal(issues(report, "orphaned_reference").length, 1);

  candidate.supplementLogs = [{ id: "source-log", name: "Creatine", createdAt: AT }];
  report = validateFitCoreDataIntegrity(candidate);
  assert.equal(issues(report, "orphaned_reference").length, 0);
});

test("workout template references resolve through both template identity fields", () => {
  const candidate = state();
  candidate.workoutTemplates = [
    { id: "template-record", name: "A", templateId: "template-alias" },
    { id: "template-two", name: "B", templateId: "second-alias" },
  ];
  candidate.workouts = [
    workout("by-id", "template-record"),
    workout("by-template-id", "template-alias"),
    workout("missing", "unknown-template"),
  ];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.deepEqual(
    issues(report, "orphaned_reference").map((issue) => issue.path),
    ["$.workouts[2].templateId"],
  );
});

test("built-in exercise, PR, and audit entity references are not treated as orphaned", () => {
  const candidate = state();
  candidate.workouts = [workout()];
  candidate.prs = [{ id: "pr", exerciseId: "built-in-unknown", type: "1rm", value: 100, date: AT }];
  candidate.jarvisAudit = [
    {
      id: "audit",
      tool: "undo",
      summary: "summary",
      status: "undone",
      entityIds: ["deleted-id"],
      createdAt: AT,
    },
  ];
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(issues(report, "orphaned_reference").length, 0);
});

test("legitimate zero values are not mistaken for missing values", () => {
  const candidate = state();
  candidate.mealEntries = [{ ...meal(), calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }];
  candidate.sleepEntries = [{ id: "sleep", hours: 0, quality: 0, createdAt: 0 }];
  candidate.recoveryCheckIns = [
    { ...checkIn(), soreness: 0, stress: 0, motivation: 0, createdAt: 0 },
  ];
  candidate.workouts = [workout()];
  candidate.workouts[0].startedAt = 0;
  Object.assign(candidate.workouts[0].exercises[0].sets[0], {
    reps: 0,
    weight: 0,
    durationMin: 0,
    distanceMi: 0,
  });
  const report = validateFitCoreDataIntegrity(candidate);

  assert.equal(report.status, "valid");
});

test("sensitive field values never appear in serialized reports", () => {
  const secrets = {
    meal: "MEAL-NOTE-8ff2",
    recovery: "RECOVERY-MEDICAL-5a21",
    ai: "AI-CONTENT-912c",
    photo: "data:image/png;base64,PHOTO-31d9",
    original: "ORIGINAL-TEXT-fb77",
    assumption: "ASSUMPTION-cc02",
  };
  const candidate = state();
  candidate.mealEntries = [
    {
      ...meal(),
      notes: secrets.meal,
      unknownMealField: true,
      provenance: {
        source: "manual",
        confidence: "high",
        confirmation: "confirmed",
        originalText: secrets.original,
        assumptions: [secrets.assumption],
      },
    } as never,
  ];
  candidate.recoveryCheckIns = [
    { ...checkIn(), notes: secrets.recovery, unknownCheckField: true } as never,
  ];
  candidate.aiMessages = [
    {
      id: "message",
      role: "user",
      content: secrets.ai,
      createdAt: AT,
      unknownMessageField: true,
    } as never,
  ];
  candidate.progressPhotos = [
    {
      id: "photo",
      dataUrl: secrets.photo,
      view: "front",
      phase: "bulk",
      createdAt: AT,
      unknownPhotoField: true,
    } as never,
  ];
  const serialized = JSON.stringify(validateFitCoreDataIntegrity(candidate));

  for (const secret of Object.values(secrets)) assert.equal(serialized.includes(secret), false);
});

test("deep-frozen valid and invalid input is never mutated", () => {
  const valid = deepFreeze(state());
  const invalid = state() as unknown as Record<string, unknown>;
  invalid.mealEntries = [{ ...meal(), calories: -1, unknown: "preserve" }];
  const frozenInvalid = deepFreeze(invalid);
  const beforeValid = JSON.stringify(valid);
  const beforeInvalid = JSON.stringify(frozenInvalid);

  assert.doesNotThrow(() => validateFitCoreDataIntegrity(valid));
  assert.doesNotThrow(() => validateFitCoreDataIntegrity(frozenInvalid));
  assert.equal(JSON.stringify(valid), beforeValid);
  assert.equal(JSON.stringify(frozenInvalid), beforeInvalid);
});

test("repeated and insertion-order-equivalent validation is deterministic", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.zUnknown = true;
  candidate.aUnknown = false;
  candidate.mealEntries = [
    { ...meal("b"), unknown: true },
    { ...meal("a"), unknown: true },
  ];
  const reordered = Object.fromEntries(Object.entries(candidate).reverse());

  const first = JSON.stringify(validateFitCoreDataIntegrity(candidate));
  assert.equal(JSON.stringify(validateFitCoreDataIntegrity(candidate)), first);
  assert.equal(JSON.stringify(validateFitCoreDataIntegrity(reordered)), first);

  const validOne = state();
  validOne.mealEntries = [meal("b"), meal("a")];
  const validTwo = state();
  validTwo.mealEntries = [meal("a"), meal("b")];
  assert.equal(
    JSON.stringify(validateFitCoreDataIntegrity(validOne)),
    JSON.stringify(validateFitCoreDataIntegrity(validTwo)),
  );
});

test("all public output contains only safe JSON values", () => {
  const candidate = state();
  candidate.mealEntries = [{ ...meal(), calories: Number.NaN }];
  assertJsonSafe(validateFitCoreDataIntegrity(candidate));
});

test("large collections use stable map-based duplicate reporting", () => {
  const candidate = state();
  candidate.mealEntries = Array.from({ length: 2_000 }, (_, index) =>
    meal(`meal-${index % 1_900}`),
  );

  const first = validateFitCoreDataIntegrity(candidate);
  const second = validateFitCoreDataIntegrity(candidate);
  assert.equal(issues(first, "duplicate_id").length, 200);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assertJsonSafe(first);
});
