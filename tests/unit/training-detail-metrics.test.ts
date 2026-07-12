import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  BALANCE_TOLERANCE_PERCENT,
  MAX_ESTIMATED_1RM_REPETITIONS,
  STALLED_MINIMUM_SESSIONS,
  getCoreDomainAnalytics,
  getExerciseAndMuscleAnalytics,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState, type SetEntry, type Workout } from "../../src/lib/types.ts";

const NOW = new Date(2026, 0, 31, 18, 0, 0, 0).getTime();

function atDaysAgo(days: number, hour = 12): number {
  const date = new Date(2026, 0, 31, hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.getTime();
}

function completedSet(
  id: string,
  weight: number | undefined,
  reps: number | undefined,
  patch: Partial<SetEntry> = {},
): SetEntry {
  return { id, weight, reps, completed: true, modifier: "normal", ...patch };
}

function workout(
  id: string,
  daysAgo: number,
  exerciseId: string,
  sets: SetEntry[],
  patch: Partial<Workout> = {},
): Workout {
  const endedAt = atDaysAgo(daysAgo);
  return {
    id,
    name: `Workout ${id}`,
    startedAt: endedAt - 60 * 60 * 1000,
    endedAt,
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId,
        completed: true,
        sets,
      },
    ],
    ...patch,
  };
}

function makeState(patch: Partial<AppState> = {}): AppState {
  return {
    ...defaultState,
    workouts: [],
    activeWorkout: null,
    customExercises: [],
    recoverySignals: [],
    recoveryCheckIns: [],
    mealEntries: [],
    bodyweightEntries: [],
    sleepEntries: [],
    cardioEntries: [],
    ...patch,
  };
}

function analytics(state: AppState, historyDays = 90) {
  return getExerciseAndMuscleAnalytics(state, { now: NOW, historyDays, comparisonDays: 30 });
}

function exercise(result: ReturnType<typeof analytics>, id = "bench-press") {
  const found = result.exercises.find((item) => item.identity.id === id);
  assert.ok(found, `expected exercise ${id}`);
  return found;
}

function muscle(result: ReturnType<typeof analytics>, id: string) {
  const found = result.muscleGroups.groups.find((item) => item.id === id);
  assert.ok(found, `expected muscle ${id}`);
  return found;
}

function assertFiniteTree(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteTree(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertFiniteTree(item, `${path}.${key}`);
      if (typeof item === "number" && key.toLocaleLowerCase().includes("percent")) {
        assert.ok(item >= -10_000 && item <= 10_000, `${path}.${key} must be bounded`);
      }
    }
  }
}

test("no workouts returns safe empty exercise analytics", () => {
  const result = analytics(makeState());
  assert.equal(result.availability.status, "unavailable");
  assert.equal(result.availability.sampleSize, 0);
  assert.deepEqual(result.exercises, []);
  assert.equal(result.muscleGroups.status, "unavailable");
  assert.ok(result.sourceMetadata.entryIds.length === 0);
  assert.ok(result.sourceMetadata.excludedRecordCount === 0);
});

test("active and incomplete workouts are not completed history", () => {
  const incomplete = workout("incomplete", 1, "bench-press", [completedSet("s", 100, 5)]);
  delete incomplete.endedAt;
  const active = workout("active", 0, "bench-press", [completedSet("a", 120, 5)]);
  delete active.endedAt;
  const result = analytics(makeState({ workouts: [incomplete], activeWorkout: active }));
  assert.equal(result.availability.status, "unavailable");
  assert.deepEqual(result.exercises, []);
  assert.equal(result.sourceMetadata.exclusions[0]?.code, "outside_range");
});

test("one completed workout creates history with valid totals, dates, and unknown units", () => {
  const endedAt = atDaysAgo(2);
  const result = analytics(
    makeState({
      workouts: [
        workout("w1", 2, "bench-press", [
          completedSet("s1", 100, 5),
          completedSet("s2", 90, 8),
          completedSet("incomplete", 200, 1, { completed: false }),
        ]),
      ],
    }),
  );
  const item = exercise(result);
  assert.equal(item.completedWorkoutAppearances, 1);
  assert.equal(item.distinctPerformanceDays, 1);
  assert.equal(item.validSetCount, 2);
  assert.equal(item.excludedSetCount, 1);
  assert.equal(item.totalRepetitions, 13);
  assert.equal(item.totalVolume, 1_220);
  assert.equal(item.firstPerformedAt, endedAt);
  assert.equal(item.lastPerformedAt, endedAt);
  assert.equal(item.daysSinceLastPerformed, 2);
  assert.equal(item.weightUnit, "unknown");
  assert.equal(item.volumeUnit, "unknown");
  assert.deepEqual(item.sourceWorkoutIds, ["w1"]);
  assert.deepEqual(item.sourceSetIds, ["s1", "s2"]);
});

test("frequency counts completed sessions separately and performance days distinctly", () => {
  const second = workout("w2", 3, "bench-press", [completedSet("s2", 90, 8)]);
  second.startedAt += 2 * 60 * 60 * 1000;
  second.endedAt! += 2 * 60 * 60 * 1000;
  const result = analytics(
    makeState({
      workouts: [workout("w1", 3, "bench-press", [completedSet("s1", 100, 5)]), second],
    }),
  );
  const item = exercise(result);
  assert.equal(item.completedWorkoutAppearances, 2);
  assert.equal(item.distinctPerformanceDays, 1);
  assert.equal(item.lastPerformedAt, second.endedAt);
  assert.ok(item.averageSessionsPerWeek > 0);
});

test("invalid and incomplete sets are excluded with structured reasons", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("w", 1, "bench-press", [
          completedSet("negative-weight", -1, 5),
          completedSet("negative-reps", 100, -1),
          completedSet("nan", Number.NaN, 5),
          completedSet("infinite", 100, Number.POSITIVE_INFINITY),
          completedSet("missing", 100, undefined),
          completedSet("incomplete", 100, 5, { completed: false }),
        ]),
      ],
    }),
  );
  const item = exercise(result);
  assert.equal(item.validSetCount, 0);
  assert.equal(item.excludedSetCount, 6);
  assert.equal(item.status, "needs_more_data");
  assert.ok(item.reasons.some((reason) => reason.code === "invalid_set_values_excluded"));
  assert.equal(item.estimatedOneRepMax.value, null);
});

test("best observed set uses deterministic e1RM, weight, repetitions, timestamp, and ID ordering", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("w", 1, "bench-press", [
          completedSet("b", 100, 5),
          completedSet("a", 90, 10),
          completedSet("c", 100, 5),
        ]),
      ],
    }),
  );
  const best = exercise(result).bestObservedSet;
  assert.ok(best);
  assert.equal(best.setId, "a");
  assert.equal(best.selectionBasis, "estimated_1rm");
  assert.equal(best.unit, "unknown");
});

test("an initial performance is a benchmark and not a false improvement", () => {
  const item = exercise(
    analytics(
      makeState({
        workouts: [
          workout("w", 1, "bench-press", [completedSet("s1", 100, 5), completedSet("s2", 110, 5)]),
        ],
      }),
    ),
  );
  assert.equal(item.personalRecordEvents.length, 1);
  assert.equal(item.personalRecordEvents[0].type, "initial_benchmark");
  assert.equal(item.personalRecordEvents[0].previous, null);
  assert.equal(item.personalRecordEvents[0].improvement, null);
});

test("historical comparable workouts produce weight, e1RM, and repetition PR events", () => {
  const item = exercise(
    analytics(
      makeState({
        workouts: [
          workout("old", 14, "bench-press", [completedSet("old-set", 100, 5)]),
          workout("new", 7, "bench-press", [completedSet("new-set", 110, 5)]),
          workout("reps", 1, "bench-press", [completedSet("rep-set", 110, 7)]),
        ],
      }),
    ),
  );
  const types = item.personalRecordEvents.map((event) => event.type);
  assert.ok(types.includes("highest_observed_weight"));
  assert.ok(types.includes("highest_estimated_1rm"));
  assert.ok(types.includes("highest_repetitions_at_weight"));
  for (const event of item.personalRecordEvents.filter(
    (entry) => entry.type !== "initial_benchmark",
  )) {
    assert.ok(event.previous);
    assert.ok((event.improvement ?? 0) > 0);
  }
});

test("invalid sets never generate PR events", () => {
  const item = exercise(
    analytics(
      makeState({
        workouts: [
          workout("valid", 10, "bench-press", [completedSet("valid-set", 100, 5)]),
          workout("bad", 1, "bench-press", [
            completedSet("negative", -200, 5),
            completedSet("infinite", Number.POSITIVE_INFINITY, 1),
          ]),
        ],
      }),
    ),
  );
  assert.deepEqual(
    item.personalRecordEvents.map((event) => event.type),
    ["initial_benchmark"],
  );
});

test("eligible sets use deterministic Epley estimated 1RM metadata", () => {
  const item = exercise(
    analytics(
      makeState({ workouts: [workout("w", 1, "bench-press", [completedSet("s", 100, 5)])] }),
    ),
  );
  assert.equal(item.estimatedOneRepMax.value, 116.67);
  assert.equal(item.estimatedOneRepMax.unit, "unknown");
  assert.equal(
    item.estimatedOneRepMax.source.calculationId,
    "training.exercise.estimated_1rm.epley.v1",
  );
  assert.ok(item.estimatedOneRepMax.source.notes.some((note) => note.includes("Epley")));
});

test("zero, warmup, bodyweight-only, and unsupported-rep sets do not produce e1RM", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("zero", 4, "bench-press", [completedSet("zero-set", 0, 5)]),
        workout("warmup", 3, "bench-press", [
          completedSet("warmup-set", 100, 5, { modifier: "warmup" }),
        ]),
        workout("unsupported", 2, "bench-press", [
          completedSet("unsupported-set", 50, MAX_ESTIMATED_1RM_REPETITIONS + 1),
        ]),
        workout("bodyweight", 1, "pushup", [completedSet("bodyweight-set", undefined, 20)]),
      ],
    }),
  );
  const bench = exercise(result);
  assert.equal(bench.estimatedOneRepMax.value, null);
  assert.ok(bench.reasons.some((reason) => reason.code === "unsupported_rep_range"));
  assert.equal(exercise(result, "pushup").estimatedOneRepMax.value, null);
  assert.equal(exercise(result, "pushup").totalVolume, 0);
});

test("one comparable workout cannot establish a strength trend", () => {
  const item = exercise(
    analytics(
      makeState({ workouts: [workout("w", 1, "bench-press", [completedSet("s", 100, 5)])] }),
    ),
  );
  assert.equal(item.strengthTrend.status, "needs_more_data");
  assert.equal(item.strengthTrend.trendQuality?.direction, "unknown");
  assert.equal(item.strengthTrend.sampleSize, 1);
  assert.equal(item.estimatedOneRepMax.status, "ready");
});

test("regular comparable history produces a conservative improving trend and ranking", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("w1", 14, "bench-press", [completedSet("s1", 100, 5)]),
        workout("w2", 7, "bench-press", [completedSet("s2", 105, 5)]),
        workout("w3", 0, "bench-press", [completedSet("s3", 110, 5)]),
      ],
    }),
  );
  const item = exercise(result);
  assert.equal(item.strengthTrend.status, "ready");
  assert.equal(item.strengthTrend.trendQuality?.direction, "up");
  assert.ok(item.strengthTrend.trendQuality?.codes.includes("improving"));
  assert.equal(item.strengthTrend.confidence, "medium");
  assert.deepEqual(result.topImprovingExercises.exerciseIds, ["bench-press"]);
});

test("tiny strength changes classify as stable rather than improving", () => {
  const item = exercise(
    analytics(
      makeState({
        workouts: [
          workout("w1", 14, "bench-press", [completedSet("s1", 100, 5)]),
          workout("w2", 7, "bench-press", [completedSet("s2", 100.2, 5)]),
          workout("w3", 0, "bench-press", [completedSet("s3", 100.5, 5)]),
        ],
      }),
    ),
  );
  assert.equal(item.strengthTrend.trendQuality?.direction, "stable");
  assert.ok(item.strengthTrend.trendQuality?.codes.includes("stable_trend"));
});

test("uneven exercise history reduces trend confidence", () => {
  const item = exercise(
    analytics(
      makeState({
        workouts: [
          workout("w1", 23, "bench-press", [completedSet("s1", 100, 5)]),
          workout("w2", 22, "bench-press", [completedSet("s2", 101, 5)]),
          workout("w3", 21, "bench-press", [completedSet("s3", 102, 5)]),
          workout("w4", 1, "bench-press", [completedSet("s4", 110, 5)]),
        ],
      }),
    ),
  );
  assert.ok(item.strengthTrend.trendQuality?.codes.includes("uneven_spacing"));
  assert.equal(item.strengthTrend.confidence, "low");
});

test("old exercise history is marked stale and excluded from improving rankings", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("w1", 50, "bench-press", [completedSet("s1", 100, 5)]),
        workout("w2", 40, "bench-press", [completedSet("s2", 105, 5)]),
        workout("w3", 30, "bench-press", [completedSet("s3", 110, 5)]),
      ],
    }),
  );
  const item = exercise(result);
  assert.equal(item.stale, true);
  assert.equal(item.strengthTrend.confidence, "low");
  assert.ok(item.reasons.some((reason) => reason.code === "stale_exercise_history"));
  assert.deepEqual(result.topImprovingExercises.exerciseIds, []);
});

test("stalled classification requires enough recent regular evidence", () => {
  const tooFew = analytics(
    makeState({
      workouts: [0, 7, 14].map((days, index) =>
        workout(`few-${index}`, days, "bench-press", [completedSet(`few-s-${index}`, 100, 5)]),
      ),
    }),
  );
  assert.deepEqual(tooFew.stalledExercises.exerciseIds, []);

  const enough = analytics(
    makeState({
      workouts: Array.from({ length: STALLED_MINIMUM_SESSIONS }, (_, index) =>
        workout(`stable-${index}`, index * 7, "bench-press", [
          completedSet(`stable-s-${index}`, 100, 5),
        ]),
      ),
    }),
  );
  assert.deepEqual(enough.stalledExercises.exerciseIds, ["bench-press"]);
});

test("missing exercise metadata leaves muscle analytics unavailable", () => {
  const result = analytics(
    makeState({
      workouts: [workout("w", 1, "Mystery Lift", [completedSet("s", 100, 5)])],
    }),
  );
  const item = exercise(result, "name:mystery lift");
  assert.equal(item.identity.strategy, "normalized_name");
  assert.equal(item.identity.displayName, "Mystery Lift");
  assert.equal(item.identity.confidence, "low");
  assert.equal(item.muscleMetadataAvailable, false);
  assert.equal(result.muscleGroups.status, "unavailable");
  assert.deepEqual(result.muscleGroups.groups, []);
});

test("partial muscle mappings report coverage without assigning unmapped volume", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("mapped", 1, "bench-press", [completedSet("mapped-set", 100, 5)]),
        workout("unknown", 2, "Unknown Lift", [completedSet("unknown-set", 500, 10)]),
      ],
    }),
  );
  assert.equal(result.muscleGroups.metadataCoveragePercent, 50);
  assert.ok(
    result.muscleGroups.reasons.some((reason) => reason.code === "partial_muscle_coverage"),
  );
  assert.equal(muscle(result, "chest").currentPeriodVolume, 500);
  assert.ok(!result.muscleGroups.groups.some((item) => item.id === "unknown"));
});

test("muscle volume uses canonical primary and secondary allocation and stays finite", () => {
  const result = analytics(
    makeState({
      workouts: [workout("w", 1, "bench-press", [completedSet("s", 100, 10)])],
    }),
  );
  assert.equal(muscle(result, "chest").currentPeriodVolume, 1_000);
  assert.equal(muscle(result, "shoulders").currentPeriodVolume, 400);
  assert.equal(muscle(result, "triceps").currentPeriodVolume, 400);
  assert.equal(muscle(result, "chest").volumeUnit, "unknown");
  assertFiniteTree(result.muscleGroups);
});

test("muscle frequency counts completed workouts and distinct dates", () => {
  const second = workout("w2", 2, "bench-press", [completedSet("s2", 100, 5)]);
  second.endedAt! += 60 * 60 * 1000;
  const result = analytics(
    makeState({
      workouts: [workout("w1", 2, "bench-press", [completedSet("s1", 100, 5)]), second],
    }),
  );
  const chest = muscle(result, "chest");
  assert.equal(chest.completedWorkoutCount, 2);
  assert.equal(chest.distinctTrainingDays, 1);
  assert.equal(chest.lastTrainedAt, second.endedAt);
});

test("most and least trained ranks only observed muscles with deterministic ties", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("bench", 1, "bench-press", [completedSet("bench-set", 100, 10)]),
        workout("curl", 1, "bb-curl", [completedSet("curl-set", 20, 10)]),
      ],
    }),
  );
  assert.equal(result.muscleGroups.mostTrainedObserved[0], "chest");
  assert.ok(result.muscleGroups.leastTrainedObserved.includes("biceps"));
  assert.ok(!result.muscleGroups.leastTrainedObserved.includes("quads"));
  assert.ok(result.muscleGroups.unobservedCanonicalGroups.includes("quads"));
});

test("zero previous muscle volume keeps percent change unavailable", () => {
  const result = analytics(
    makeState({ workouts: [workout("w", 1, "bench-press", [completedSet("s", 100, 5)])] }),
  );
  const chest = muscle(result, "chest");
  assert.equal(chest.previousPeriodVolume, 0);
  assert.equal(chest.volumeChangePercent, null);
  assert.ok(chest.reasons.some((reason) => reason.code === "zero_comparison_baseline"));
});

test("push pull legs is unavailable without explicit canonical template classification", () => {
  const result = analytics(
    makeState({ workouts: [workout("w", 1, "bench-press", [completedSet("s", 100, 5)])] }),
  );
  assert.equal(result.trainingBalance.pushPullLegs.status, "unavailable");
  assert.deepEqual(result.trainingBalance.pushPullLegs.distribution, []);
});

test("push pull legs works only from explicit canonical workout template IDs", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("push", 3, "bench-press", [completedSet("push-set", 100, 5)], {
          templateId: "push",
        }),
        workout("pull", 2, "barbell-row", [completedSet("pull-set", 100, 5)], {
          templateId: "pull",
        }),
        workout("legs", 1, "squat", [completedSet("legs-set", 100, 5)], {
          templateId: "legs",
        }),
      ],
    }),
  );
  const balance = result.trainingBalance.pushPullLegs;
  assert.equal(balance.status, "ready");
  assert.equal(balance.coveragePercent, 100);
  assert.deepEqual(
    balance.distribution.map((item) => item.id),
    ["push", "pull", "legs"],
  );
  assert.equal(balance.interpretation, "balanced_within_tolerance");
  assert.equal(balance.tolerancePercent, BALANCE_TOLERANCE_PERCENT);
});

test("upper lower uses explicit template IDs while anterior posterior stays unavailable", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("upper", 2, "bench-press", [completedSet("upper-set", 100, 5)], {
          templateId: "upper",
        }),
        workout("lower", 1, "squat", [completedSet("lower-set", 100, 5)], {
          templateId: "lower",
        }),
      ],
    }),
  );
  assert.equal(result.trainingBalance.upperLower.status, "ready");
  assert.deepEqual(
    result.trainingBalance.upperLower.distribution.map((item) => item.id),
    ["upper", "lower"],
  );
  assert.equal(result.trainingBalance.anteriorPosterior.status, "unavailable");
});

test("left right is unavailable without side metadata even for unilateral and bilateral sets", () => {
  const bilateral = analytics(
    makeState({ workouts: [workout("w", 1, "db-curl", [completedSet("s", 20, 10)])] }),
  );
  const unilateral = analytics(
    makeState({
      workouts: [
        workout("w", 1, "db-curl", [completedSet("s", 20, 10, { modifier: "unilateral" })]),
      ],
    }),
  );
  assert.equal(bilateral.trainingBalance.leftRight.status, "unavailable");
  assert.equal(unilateral.trainingBalance.leftRight.status, "unavailable");
  assert.deepEqual(unilateral.trainingBalance.leftRight.distribution, []);
});

test("muscle recovery-risk output is readiness-only and never a medical conclusion", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout("w1", 8, "bench-press", [completedSet("s1", 100, 5)]),
        workout("w2", 1, "bench-press", [completedSet("s2", 105, 5)]),
      ],
      recoverySignals: [
        {
          id: "signal",
          sourceLogId: "manual",
          kind: "soreness",
          bodyArea: "chest",
          severity: 3,
          notes: "logged",
          createdAt: atDaysAgo(1),
          source: "manual",
        },
      ],
    }),
  );
  const readiness = muscle(result, "chest").recoveryRiskReadiness;
  assert.equal(readiness.status, "ready");
  assert.equal(readiness.loadHistoryAvailable, true);
  assert.equal(readiness.bodyAreaRecoveryDataAvailable, true);
  assert.equal(readiness.medicalConclusion, null);
  assert.ok(!JSON.stringify(readiness).toLocaleLowerCase().includes("injury risk"));
});

test("source IDs are sorted, deduplicated, and duplicate workouts do not create duplicate PRs", () => {
  const old = workout("z-workout", 14, "bench-press", [completedSet("z-set", 100, 5)]);
  const current = workout("a-workout", 1, "bench-press", [completedSet("a-set", 110, 5)]);
  const result = analytics(makeState({ workouts: [current, old, { ...old }] }));
  const item = exercise(result);
  assert.deepEqual(item.sourceWorkoutIds, ["a-workout", "z-workout"]);
  assert.deepEqual(result.sourceMetadata.entryIds, [...result.sourceMetadata.entryIds].sort());
  assert.equal(new Set(result.sourceMetadata.entryIds).size, result.sourceMetadata.entryIds.length);
  assert.equal(
    item.personalRecordEvents.filter((event) => event.type === "highest_observed_weight").length,
    1,
  );
});

test("reversing records and repeated execution produce byte-stable output", () => {
  const workouts = [
    workout("b", 14, "bench-press", [completedSet("b-set", 100, 5)]),
    workout("a", 7, "bench-press", [completedSet("a-set", 105, 5)]),
    workout("c", 1, "bench-press", [completedSet("c-set", 110, 5)]),
  ];
  const forward = analytics(makeState({ workouts }));
  const reverse = analytics(makeState({ workouts: [...workouts].reverse() }));
  const repeated = analytics(makeState({ workouts }));
  assert.equal(JSON.stringify(forward), JSON.stringify(reverse));
  assert.equal(JSON.stringify(forward), JSON.stringify(repeated));
});

test("malformed numeric input cannot leak NaN, Infinity, or invalid shares", () => {
  const result = analytics(
    makeState({
      workouts: [
        workout(
          "bad",
          1,
          "bench-press",
          [
            completedSet("nan", Number.NaN, 5),
            completedSet("inf", Number.POSITIVE_INFINITY, 5),
            completedSet("negative", -100, -5),
            completedSet("valid", 100, 5),
          ],
          { templateId: "push" },
        ),
      ],
    }),
  );
  assertFiniteTree(result);
  for (const dimension of Object.values(result.trainingBalance)) {
    for (const item of dimension.distribution) assert.ok(item.percent >= 0 && item.percent <= 100);
  }
});

test("Task 1 through 4 analytics compatibility remains intact", () => {
  const state = makeState({
    workouts: [workout("w", 1, "bench-press", [completedSet("s", 100, 5)])],
  });
  const core = getCoreDomainAnalytics(state, NOW);
  assert.equal(core.training.volume7d.value, 500);
  assert.equal(core.training.volume7d.kind, "aggregate");
  assert.ok(["none", "low", "medium", "high"].includes(core.training.volume7d.confidence));
});
