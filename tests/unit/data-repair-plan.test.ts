import assert from "node:assert/strict";
import test from "node:test";

import {
  createFitCoreDataRepairPlan,
  FITCORE_DATA_REPAIR_PLAN_POLICY,
  type DataRepairPlanDisposition,
  type DataRepairPlanEntry,
  type DataRepairPlanSafety,
  type FitCoreDataRepairActionCode,
} from "../../src/lib/data-repair-plan.ts";
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

function workout(id = "workout-1") {
  return {
    id,
    name: "Strength",
    startedAt: AT,
    endedAt: AT + 3_600_000,
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId: "built-in-bench",
        completed: true,
        sets: [{ id: `${id}-set`, reps: 5, weight: 100, completed: true }],
      },
    ],
  };
}

function meal(id = "meal-1", name = "Breakfast") {
  return {
    id,
    name,
    type: "breakfast",
    calories: 500,
    protein: 40,
    carbs: 55,
    fat: 15,
    createdAt: AT,
  };
}

function mixedIssueState(): unknown {
  const candidate = state() as unknown as Record<string, unknown>;
  delete candidate.dismissedSuggestions;
  candidate.version = 0;
  candidate.personalization = [];
  candidate.unknownTopLevel = { privateValue: "not copied" };

  const blankWorkout = workout(" ");
  blankWorkout.name = " ";
  const invalidTimestamp = workout("invalid-timestamp");
  invalidTimestamp.startedAt = Number.MAX_VALUE;
  const invalidOrder = workout("invalid-order");
  invalidOrder.endedAt = AT - 1;
  const invalidSet = workout("invalid-set");
  Object.assign(invalidSet.exercises[0].sets[0], {
    weight: "not-a-number",
    reps: Number.POSITIVE_INFINITY,
    durationMin: -1,
    modifier: "invented-modifier",
    unknownSetField: { privateValue: true },
  });
  candidate.workouts = [
    null,
    { id: "partial-workout" },
    blankWorkout,
    invalidTimestamp,
    invalidOrder,
    invalidSet,
    workout("duplicate-workout"),
    workout("duplicate-workout"),
  ];
  candidate.mealEntries = [meal("shared-id"), meal("shared-id")];
  candidate.bodyweightEntries = [{ id: "shared-id", weightLb: 180, createdAt: AT }];
  candidate.recoverySignals = [
    {
      id: "signal-1",
      sourceLogId: "missing-source",
      kind: "soreness",
      severity: 3,
      notes: "",
      createdAt: AT,
      source: "manual",
    },
  ];
  return candidate;
}

interface ExpectedMapping {
  disposition: DataRepairPlanDisposition;
  action: FitCoreDataRepairActionCode;
  safety: DataRepairPlanSafety;
  confirmation: boolean;
}

const EXPECTED_MAPPING: Record<DataIntegrityIssueCode, ExpectedMapping> = {
  invalid_root: {
    disposition: "blocked",
    action: "review_root_structure",
    safety: "not_actionable",
    confirmation: false,
  },
  missing_required_top_level_field: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  invalid_top_level_type: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  unknown_top_level_field: {
    disposition: "proposed_action",
    action: "remove_unknown_field",
    safety: "potentially_destructive",
    confirmation: true,
  },
  malformed_record: {
    disposition: "proposed_action",
    action: "quarantine_malformed_record",
    safety: "potentially_destructive",
    confirmation: true,
  },
  partial_record: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  missing_required_field: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  invalid_field_type: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  empty_required_string: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  empty_id: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  duplicate_id: {
    disposition: "proposed_action",
    action: "resolve_duplicate_identifier",
    safety: "potentially_destructive",
    confirmation: true,
  },
  duplicate_id_cross_collection: {
    disposition: "informational",
    action: "review_cross_collection_identifier",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  invalid_timestamp: {
    disposition: "manual_review",
    action: "review_invalid_timestamp",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  invalid_time_order: {
    disposition: "manual_review",
    action: "review_invalid_time_order",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  non_finite_number: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  prohibited_negative_value: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  out_of_range_value: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  invalid_enum_value: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    confirmation: false,
  },
  unknown_record_field: {
    disposition: "proposed_action",
    action: "remove_unknown_field",
    safety: "potentially_destructive",
    confirmation: true,
  },
  orphaned_reference: {
    disposition: "proposed_action",
    action: "clear_or_relink_reference",
    safety: "potentially_destructive",
    confirmation: true,
  },
};

function entriesFor(
  plan: ReturnType<typeof createFitCoreDataRepairPlan>,
  code: DataIntegrityIssueCode,
) {
  return plan.entries.filter(({ source }) => source.issueCode === code);
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
  assert.equal(typeof serialized, "string");
  const parsed = JSON.parse(serialized);
  assert.deepEqual(parsed, value);
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

test("policies are exact and a valid state produces a frozen no-action plan", () => {
  const plan = createFitCoreDataRepairPlan(state());

  assert.equal(FITCORE_DATA_REPAIR_PLAN_POLICY, "fitcore_data_repair_plan_v1");
  assert.equal(plan.policy, FITCORE_DATA_REPAIR_PLAN_POLICY);
  assert.equal(plan.integrityPolicy, FITCORE_DATA_INTEGRITY_POLICY);
  assert.equal(plan.status, "no_action");
  assert.equal(plan.integrityStatus, "valid");
  assert.equal(plan.integrityIssueCount, 0);
  assert.deepEqual(plan.entries, []);
  assert.deepEqual(plan.summary, {
    totalEntries: 0,
    proposedActionCount: 0,
    manualReviewCount: 0,
    informationalCount: 0,
    blockedCount: 0,
    confirmationRequiredCount: 0,
    nonDestructiveCount: 0,
    potentiallyDestructiveCount: 0,
    domainDecisionCount: 0,
    notActionableCount: 0,
  });
  assertDeepFrozen(plan);
});

test("invalid roots produce invalid-input plans with one blocked root entry", () => {
  for (const input of [null, undefined, [], "state", 1, true, new Date(), new Map()]) {
    const plan = createFitCoreDataRepairPlan(input);
    assert.equal(plan.status, "invalid_input");
    assert.equal(plan.entries.length, 1);
    assert.deepEqual(
      {
        disposition: plan.entries[0].disposition,
        action: plan.entries[0].action,
        safety: plan.entries[0].safety,
        confirmation: plan.entries[0].requiresUserConfirmation,
      },
      EXPECTED_MAPPING.invalid_root,
    );
    assert.equal(JSON.stringify(plan).includes("defaultState"), false);
  }
});

test("all 20 Task 1 issue codes map exactly once per originating issue", () => {
  const inputs = [null, mixedIssueState()];
  const seen = new Set<DataIntegrityIssueCode>();

  for (const input of inputs) {
    const report = validateFitCoreDataIntegrity(input);
    const plan = createFitCoreDataRepairPlan(input);
    assert.equal(plan.entries.length, report.issues.length);
    assert.equal(plan.integrityIssueCount, report.issueCount);
    assert.deepEqual(
      plan.entries.map(({ source }) => source.issueKey).sort(),
      report.issues.map(({ issueKey }) => issueKey).sort(),
    );
    for (const entry of plan.entries) {
      seen.add(entry.source.issueCode);
      const expected = EXPECTED_MAPPING[entry.source.issueCode];
      assert.deepEqual(
        {
          disposition: entry.disposition,
          action: entry.action,
          safety: entry.safety,
          confirmation: entry.requiresUserConfirmation,
        },
        expected,
      );
    }
  }

  assert.deepEqual([...seen].sort(), Object.keys(EXPECTED_MAPPING).sort());
});

test("review-only and informational-only issues produce review-required status", () => {
  const missing = state() as unknown as Record<string, unknown>;
  delete missing.workouts;
  const missingPlan = createFitCoreDataRepairPlan(missing);
  assert.equal(missingPlan.status, "review_required");
  assert.equal(missingPlan.summary.proposedActionCount, 0);
  assert.equal(missingPlan.summary.manualReviewCount, 1);

  const reused = state();
  reused.mealEntries = [meal("shared")];
  reused.bodyweightEntries = [{ id: "shared", weightLb: 180, createdAt: AT }];
  const reusedPlan = createFitCoreDataRepairPlan(reused);
  assert.equal(reusedPlan.status, "review_required");
  assert.equal(
    reusedPlan.entries.every(({ disposition }) => disposition === "informational"),
    true,
  );
});

test("unknown fields and malformed records are confirmation-gated proposals only", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.unknown = { raw: "private" };
  candidate.mealEntries = [null];
  const plan = createFitCoreDataRepairPlan(candidate);
  const unknown = entriesFor(plan, "unknown_top_level_field")[0];
  const malformed = entriesFor(plan, "malformed_record")[0];

  assert.equal(unknown.action, "remove_unknown_field");
  assert.equal(unknown.safety, "potentially_destructive");
  assert.equal(unknown.requiresUserConfirmation, true);
  assert.equal(malformed.action, "quarantine_malformed_record");
  assert.equal(malformed.requiresUserConfirmation, true);
  assert.equal(JSON.stringify(plan).includes("private"), false);
  assert.equal("record" in malformed, false);
});

test("missing and invalid values remain manual decisions with no invented replacement", () => {
  const candidate = state() as unknown as Record<string, unknown>;
  delete candidate.workouts;
  candidate.mealEntries = [
    {
      id: "",
      name: "",
      type: "meal",
      calories: "500",
      protein: Number.POSITIVE_INFINITY,
      carbs: -1,
      fat: 10,
      createdAt: Number.MAX_VALUE,
    },
  ];
  const plan = createFitCoreDataRepairPlan(candidate);
  const serialized = JSON.stringify(plan);

  for (const code of [
    "missing_required_top_level_field",
    "empty_id",
    "empty_required_string",
    "invalid_field_type",
    "non_finite_number",
    "prohibited_negative_value",
    "invalid_timestamp",
  ] as const) {
    assert.equal(
      entriesFor(plan, code).every(({ disposition }) => disposition === "manual_review"),
      true,
    );
  }
  assert.equal(serialized.includes("replacementValue"), false);
  assert.equal(serialized.includes("suggestedValue"), false);
  assert.equal(serialized.includes("500"), false);
});

test("duplicate plans never choose a winner, merge records, or auto-change cross-collection reuse", () => {
  const candidate = state();
  candidate.mealEntries = [meal("duplicate"), meal("duplicate")];
  candidate.bodyweightEntries = [{ id: "duplicate", weightLb: 180, createdAt: AT }];
  const plan = createFitCoreDataRepairPlan(candidate);

  for (const entry of entriesFor(plan, "duplicate_id")) {
    assert.equal(entry.action, "resolve_duplicate_identifier");
    assert.equal(entry.requiresUserConfirmation, true);
    assert.equal(
      entry.limitationKeys.includes("repair_plan.limitation.duplicate_winner_unknown"),
      true,
    );
    assert.equal(entry.limitationKeys.includes("repair_plan.limitation.merge_not_permitted"), true);
  }
  for (const entry of entriesFor(plan, "duplicate_id_cross_collection")) {
    assert.equal(entry.disposition, "informational");
    assert.equal(entry.requiresUserConfirmation, false);
  }
  const serialized = JSON.stringify(plan);
  assert.equal(serialized.includes("winnerId"), false);
  assert.equal(serialized.includes("mergedRecord"), false);
});

test("timestamps and orphaned references receive no substitute time or target", () => {
  const candidate = state();
  candidate.workouts = [workout()];
  candidate.workouts[0].endedAt = AT - 1;
  candidate.recoverySignals = [
    {
      id: "signal",
      sourceLogId: "missing-source",
      kind: "pain",
      severity: 2,
      notes: "",
      createdAt: AT,
      source: "manual",
    },
  ];
  const plan = createFitCoreDataRepairPlan(candidate);
  const time = entriesFor(plan, "invalid_time_order")[0];
  const orphan = entriesFor(plan, "orphaned_reference")[0];

  assert.equal(time.action, "review_invalid_time_order");
  assert.equal(time.disposition, "manual_review");
  assert.equal(orphan.action, "clear_or_relink_reference");
  assert.equal(orphan.requiresUserConfirmation, true);
  assert.equal(
    orphan.limitationKeys.includes("repair_plan.limitation.intended_target_unknown"),
    true,
  );
  const serialized = JSON.stringify(plan);
  assert.equal(serialized.includes("replacementTimestamp"), false);
  assert.equal(serialized.includes("replacementTarget"), false);
});

test("zero, false, allowed negative values, and optional empty strings do not become missing", () => {
  const candidate = state();
  candidate.version = 1;
  candidate.onboardingComplete = false;
  candidate.demoMode = false;
  candidate.nutritionTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  candidate.mealEntries = [
    {
      ...meal(),
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      notes: "",
      confirmed: false,
    },
  ];
  candidate.userGoalsProfile.weeklyWeightChangeLb = -0.5;
  const plan = createFitCoreDataRepairPlan(candidate);

  assert.equal(plan.status, "no_action");
  assert.equal(plan.entries.length, 0);

  candidate.mealEntries[0].name = "";
  const emptyRequired = createFitCoreDataRepairPlan(candidate);
  assert.deepEqual(
    emptyRequired.entries.map(({ source }) => source.issueCode),
    ["empty_required_string"],
  );
});

test("ordering and serialized output are deterministic across repeated and key-reordered input", () => {
  const candidate = mixedIssueState() as Record<string, unknown>;
  const reordered = Object.fromEntries(Object.entries(candidate).reverse());
  const first = createFitCoreDataRepairPlan(candidate);
  const second = createFitCoreDataRepairPlan(candidate);
  const reorderedPlan = createFitCoreDataRepairPlan(reordered);

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(JSON.stringify(first), JSON.stringify(reorderedPlan));
  assert.equal(new Set(first.entries.map(({ entryId }) => entryId)).size, first.entries.length);
  assert.equal(JSON.stringify(first).includes("createdAtExecution"), false);
  assert.equal(JSON.stringify(first).includes("random"), false);
});

test("unrelated issues sharing one path remain separate entries", () => {
  const candidate = state();
  candidate.workouts = [workout()];
  candidate.workouts[0].startedAt = Number.POSITIVE_INFINITY;
  const plan = createFitCoreDataRepairPlan(candidate);
  const atPath = plan.entries.filter(({ source }) => source.path === "$.workouts[0].startedAt");

  assert.deepEqual(
    atPath.map(({ source }) => source.issueCode),
    ["invalid_timestamp", "non_finite_number"],
  );
  assert.equal(new Set(atPath.map(({ entryId }) => entryId)).size, 2);
});

test("sensitive source values and raw unknown content are excluded from every plan field", () => {
  const sentinels = [
    "WORKOUT-NAME-72f1",
    "MEAL-NAME-a630",
    "CUSTOM-EXERCISE-f981",
    "AI-CONTENT-b117",
    "SUPPLEMENT-NAME-04ad",
    "UNKNOWN-VALUE-cae2",
    "MALFORMED-VALUE-881d",
  ];
  const candidate = state() as unknown as Record<string, unknown>;
  candidate.workouts = [{ ...workout(), name: sentinels[0] }];
  candidate.mealEntries = [{ ...meal("meal", sentinels[1]), unknownData: sentinels[5] }];
  candidate.customExercises = [
    {
      id: "custom",
      name: sentinels[2],
      primary: ["chest"],
      equipment: "barbell",
      category: "compound",
      isCustom: true,
      createdAt: AT,
    },
  ];
  candidate.aiMessages = [{ id: "message", role: "user", content: sentinels[3], createdAt: AT }];
  candidate.supplementLogs = [{ id: "supplement", name: sentinels[4], createdAt: AT }];
  candidate.recoveryCheckIns = [sentinels[6]];
  const serialized = JSON.stringify(createFitCoreDataRepairPlan(candidate));

  for (const sentinel of sentinels) assert.equal(serialized.includes(sentinel), false);
});

test("plans are JSON-safe, round-trippable, and contain no input references", () => {
  const candidate = mixedIssueState();
  const plan = createFitCoreDataRepairPlan(candidate);
  assertJsonSafe(plan);

  const sourceObjects = new Set<object>();
  const collect = (value: unknown): void => {
    if (value !== null && typeof value === "object" && !sourceObjects.has(value)) {
      sourceObjects.add(value);
      for (const child of Object.values(value)) collect(child);
    }
  };
  collect(candidate);
  const inspect = (value: unknown): void => {
    if (value !== null && typeof value === "object") {
      assert.equal(sourceObjects.has(value), false);
      for (const child of Object.values(value)) inspect(child);
    }
  };
  inspect(plan);
});

test("deep-frozen source input and Task 1 reports remain unchanged", () => {
  const candidate = deepFreeze(mixedIssueState());
  const before = structuredClone(candidate);
  const reportBefore = validateFitCoreDataIntegrity(candidate);
  const reportSnapshot = structuredClone(reportBefore);

  assert.doesNotThrow(() => createFitCoreDataRepairPlan(candidate));
  assert.deepEqual(candidate, before);
  assert.deepEqual(reportBefore, reportSnapshot);
  assert.deepEqual(validateFitCoreDataIntegrity(candidate), reportSnapshot);
});

test("returned plans and every nested array and object are immutable", () => {
  const plan = createFitCoreDataRepairPlan(mixedIssueState());
  const before = JSON.stringify(plan);
  assertDeepFrozen(plan);

  assert.throws(() => (plan.entries as DataRepairPlanEntry[]).push(plan.entries[0]));
  assert.throws(() => ((plan.summary as unknown as { totalEntries: number }).totalEntries = 999));
  assert.throws(() => (plan.entries[0].source.relatedPaths as string[]).push("$.invented"));
  assert.equal(JSON.stringify(plan), before);
});

test("summary counts exactly match independently counted final entries", () => {
  const plan = createFitCoreDataRepairPlan(mixedIssueState());
  const count = <K extends keyof DataRepairPlanEntry>(key: K, expected: DataRepairPlanEntry[K]) =>
    plan.entries.filter((entry) => entry[key] === expected).length;

  assert.deepEqual(plan.summary, {
    totalEntries: plan.entries.length,
    proposedActionCount: count("disposition", "proposed_action"),
    manualReviewCount: count("disposition", "manual_review"),
    informationalCount: count("disposition", "informational"),
    blockedCount: count("disposition", "blocked"),
    confirmationRequiredCount: count("requiresUserConfirmation", true),
    nonDestructiveCount: count("safety", "non_destructive"),
    potentiallyDestructiveCount: count("safety", "potentially_destructive"),
    domainDecisionCount: count("safety", "requires_domain_decision"),
    notActionableCount: count("safety", "not_actionable"),
  });
  assert.equal(
    plan.summary.proposedActionCount +
      plan.summary.manualReviewCount +
      plan.summary.informationalCount +
      plan.summary.blockedCount,
    plan.summary.totalEntries,
  );
});

test("approximately 2,000 records remain deterministic, serializable, and untouched", () => {
  const candidate = state();
  candidate.mealEntries = Array.from({ length: 2_000 }, (_, index) =>
    meal(`meal-${index % 1_900}`),
  );
  const before = structuredClone(candidate);

  const first = createFitCoreDataRepairPlan(candidate);
  const second = createFitCoreDataRepairPlan(candidate);

  assert.equal(first.entries.length, 200);
  assert.equal(
    first.entries.every(({ action }) => action === "resolve_duplicate_identifier"),
    true,
  );
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assertJsonSafe(first);
  assert.deepEqual(candidate, before);
});
