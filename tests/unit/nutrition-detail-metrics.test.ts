import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  NUTRITION_TARGET_TOLERANCE_PERCENT,
  getCoreDomainAnalytics,
  getExerciseAndMuscleAnalytics,
  getNutritionDetailAnalytics,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState, type MealEntry, type Workout } from "../../src/lib/types.ts";

const NOW = new Date(2026, 1, 7, 18, 0, 0, 0).getTime();

function timestamp(daysAgo: number, hour = 12, minute = 0): number {
  const value = new Date(2026, 1, 7, hour, minute, 0, 0);
  value.setDate(value.getDate() - daysAgo);
  return value.getTime();
}

function meal(id: string, daysAgo: number, patch: Partial<MealEntry> = {}, hour = 12): MealEntry {
  return {
    id,
    name: `Meal ${id}`,
    type: "lunch",
    calories: 500,
    protein: 40,
    carbs: 50,
    fat: 15,
    createdAt: timestamp(daysAgo, hour),
    ...patch,
  };
}

function workout(id: string, daysAgo: number, patch: Partial<Workout> = {}): Workout {
  return {
    id,
    name: `Workout ${id}`,
    startedAt: timestamp(daysAgo, 17),
    endedAt: timestamp(daysAgo, 18),
    exercises: [],
    ...patch,
  };
}

function makeState(patch: Partial<AppState> = {}): AppState {
  return {
    ...defaultState,
    mealEntries: [],
    workouts: [],
    activeWorkout: null,
    bodyweightEntries: [],
    recoveryCheckIns: [],
    recoverySignals: [],
    sleepEntries: [],
    cardioEntries: [],
    customExercises: [],
    ...patch,
  };
}

function analytics(state: AppState, days = 7) {
  return getNutritionDetailAnalytics(state, { now: NOW, days });
}

function assertSafeTree(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeTree(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    assertSafeTree(item, `${path}.${key}`);
    if (typeof item === "number" && key.toLowerCase().includes("count")) {
      assert.ok(item >= 0, `${path}.${key} must not be negative`);
    }
    if (typeof item === "number" && key.toLowerCase().includes("percent")) {
      assert.ok(item >= 0 && item <= 100, `${path}.${key} must be a valid percentage`);
    }
  }
}

test("requirements 1-2: no meals returns finite structured empty analytics", () => {
  const result = analytics(makeState());
  assert.equal(result.availability.status, "unavailable");
  assert.equal(result.mealCounts.today.value, 0);
  assert.equal(result.mealCounts.rangeTotal.value, 0);
  assert.deepEqual(result.mealCounts.dailySeries.value, []);
  assert.equal(result.consistency.calories.status, "needs_more_data");
  assertSafeTree(result);
});

test("requirements 3-5: one meal counts but cannot establish consistency", () => {
  const result = analytics(makeState({ mealEntries: [meal("one", 0)] }));
  assert.equal(result.mealCounts.today.value, 1);
  assert.equal(result.mealCounts.rangeTotal.value, 1);
  assert.equal(result.mealCounts.distinctLoggedDays.value, 1);
  assert.equal(result.consistency.calories.status, "needs_more_data");
  assert.equal(result.consistency.calories.value?.loggedDayCount, 1);
  assert.equal(result.consistency.calories.value?.consistencyScore, null);
});

test("requirements 6-10: logged-day-only macro consistency is safe for every macro", () => {
  const result = analytics(
    makeState({
      mealEntries: [
        meal("d1", 0, { calories: 300, protein: 30, carbs: 35, fat: 10 }),
        meal("d2", 2, { calories: 600, protein: 60, carbs: 70, fat: 20 }),
        meal("d3", 4, { calories: 900, protein: 90, carbs: 105, fat: 30 }),
      ],
    }),
  );
  for (const metric of Object.values(result.consistency)) {
    assert.equal(metric.status, "ready");
    assert.equal(metric.value?.loggedDayCount, 3);
    assert.equal(metric.value?.requestedDayCount, 7);
    assert.equal(metric.value?.dailyValues.length, 3);
    assert.equal(metric.value?.formula, "coefficient_of_variation_v1");
    assert.ok((metric.value?.coefficientOfVariation ?? -1) >= 0);
    assert.ok((metric.value?.consistencyScore ?? -1) >= 0);
  }
  assert.equal(result.consistency.calories.value?.mean, 600);
  assert.equal(result.consistency.protein.value?.mean, 60);
  assert.equal(result.mealCounts.dailySeries.value?.length, 3);
});

test("requirements 11-12: injected calendar boundaries control today and range counts", () => {
  const result = analytics(
    makeState({
      mealEntries: [meal("today", 0), meal("yesterday", 1), meal("outside", 8)],
    }),
  );
  assert.equal(result.mealCounts.today.value, 1);
  assert.equal(result.mealCounts.rangeTotal.value, 2);
  assert.deepEqual(result.mealCounts.rangeTotal.source.entryIds, ["today", "yesterday"]);
  assert.ok(
    result.mealCounts.rangeTotal.source.exclusions.some(
      (exclusion) => exclusion.code === "outside_range" && exclusion.count === 1,
    ),
  );
});

test("requirements 13 and 15: future and invalid-timestamp meals are excluded", () => {
  const future = meal("future", 0, { createdAt: timestamp(0, 22) });
  const invalid = meal("invalid", 0, { createdAt: Number.NaN });
  const result = analytics(makeState({ mealEntries: [future, invalid, meal("valid", 0)] }));
  assert.equal(result.mealCounts.rangeTotal.value, 1);
  assert.ok(result.sourceMetadata.exclusions.some((item) => item.code === "future_timestamp"));
  assert.ok(result.sourceMetadata.exclusions.some((item) => item.code === "invalid_timestamp"));
  assert.ok(result.sourceMetadata.entryIds.includes("valid"));
});

test("requirement 14: duplicate IDs are deterministically counted once and reported", () => {
  const duplicateA = meal("duplicate", 1, { calories: 700 });
  const duplicateB = meal("duplicate", 1, { calories: 900 });
  const result = analytics(makeState({ mealEntries: [duplicateB, duplicateA] }));
  assert.equal(result.mealCounts.rangeTotal.value, 1);
  assert.deepEqual(result.sourceMetadata.entryIds, ["duplicate"]);
  assert.ok(
    result.mealCounts.rangeTotal.reasons.some(
      (reason) => reason.code === "duplicate_meal_excluded",
    ),
  );
});

test("requirements 16-17: invalid nutrient fields do not remove countable meals or unrelated macros", () => {
  const result = analytics(
    makeState({
      mealEntries: [
        meal("bad-calories", 0, { calories: Number.NaN, protein: 30 }),
        meal("bad-protein", 0, { calories: 400, protein: Number.NaN }),
      ],
    }),
  );
  assert.equal(result.mealCounts.rangeTotal.value, 2);
  assert.equal(result.calorieDistribution.validMealCount, 1);
  assert.equal(result.calorieDistribution.total, 400);
  assert.equal(result.proteinDistribution.validMealCount, 1);
  assert.equal(result.proteinDistribution.total, 30);
});

test("requirements 18-19 and 55-56: negative and non-finite macros are excluded and cap confidence", () => {
  const result = analytics(
    makeState({
      mealEntries: [
        meal("valid", 0),
        meal("negative", 1, { calories: -1, protein: -1, carbs: -1, fat: -1 }),
        meal("infinite", 2, {
          calories: Number.POSITIVE_INFINITY,
          protein: Number.POSITIVE_INFINITY,
          carbs: Number.POSITIVE_INFINITY,
          fat: Number.POSITIVE_INFINITY,
        }),
      ],
    }),
  );
  assert.equal(result.mealCounts.rangeTotal.value, 3);
  assert.ok(
    result.consistency.calories.reasons.some((reason) => reason.code === "partial_macro_coverage"),
  );
  assert.notEqual(result.consistency.calories.confidence, "high");
  assert.notEqual(result.calorieDistribution.confidence, "high");
  assertSafeTree(result);
});

test("requirements 20-22: canonical meal-type macros are exact and unknown types are not inferred", () => {
  const result = analytics(
    makeState({
      mealEntries: [
        meal("breakfast", 0, { type: "breakfast", calories: 400, protein: 30 }),
        meal("dinner", 0, { type: "dinner", calories: 600, protein: 50 }),
        meal("unknown", 0, {
          type: "Breakfast",
          name: "Looks like breakfast",
          calories: 200,
          protein: 10,
        }),
      ],
    }),
  );
  const breakfast = result.mealTypeBreakdown.find((item) => item.type === "breakfast");
  const unknown = result.mealTypeBreakdown.find((item) => item.type === "unknown");
  assert.equal(breakfast?.calories, 400);
  assert.equal(breakfast?.protein, 30);
  assert.equal(unknown?.mealCount, 1);
  assert.deepEqual(unknown?.sourceMealIds, ["unknown"]);
  assert.ok(unknown?.reasons.some((reason) => reason.code === "missing_meal_type"));
});

test("requirements 23-24: one valid meal cannot establish protein or calorie distribution", () => {
  const result = analytics(makeState({ mealEntries: [meal("one", 0)] }));
  assert.equal(result.proteinDistribution.status, "needs_more_data");
  assert.equal(result.calorieDistribution.status, "needs_more_data");
  assert.equal(result.proteinDistribution.evennessPercent, null);
  assert.equal(result.calorieDistribution.evennessPercent, null);
});

test("requirements 25-26: positive distribution shares sum to 100 and zero totals stay safe", () => {
  const positive = analytics(
    makeState({
      mealEntries: [
        meal("a", 0, { protein: 10, calories: 100 }),
        meal("b", 0, { protein: 20, calories: 200 }),
        meal("c", 0, { protein: 30, calories: 300 }),
      ],
    }),
  );
  assert.equal(roundedSum(positive.proteinDistribution.shares.map((item) => item.percent)), 100);
  assert.equal(roundedSum(positive.calorieDistribution.shares.map((item) => item.percent)), 100);

  const zero = analytics(
    makeState({
      mealEntries: [
        meal("z1", 0, { calories: 0, protein: 0 }),
        meal("z2", 0, { calories: 0, protein: 0 }),
      ],
    }),
  );
  assert.equal(zero.proteinDistribution.total, 0);
  assert.deepEqual(zero.proteinDistribution.shares, []);
  assert.equal(zero.calorieDistribution.coefficientOfVariation, null);
  assertSafeTree(zero);
});

test("requirements 27-29: zero, negative, non-finite, and missing targets are unavailable", () => {
  for (const calories of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
    const state = makeState({
      mealEntries: [meal("meal", 0)],
      nutritionTargets: {
        ...defaultState.nutritionTargets,
        calories: calories as unknown as number,
      },
    });
    const adherence = analytics(state).targetAdherence.calories;
    assert.equal(adherence.status, "unavailable");
    assert.equal(adherence.underTargetLoggedDayCount, null);
    assert.equal(adherence.overTargetLoggedDayCount, null);
    assert.equal(adherence.withinTargetLoggedDayCount, null);
  }
});

test("requirements 30-34: target adherence separates under, over, within, unlogged, calories, and protein", () => {
  const result = analytics(
    makeState({
      nutritionTargets: { calories: 2_000, protein: 100, carbs: 300, fat: 80 },
      mealEntries: [
        meal("under", 0, { calories: 1_800, protein: 80 }),
        meal("within", 1, { calories: 2_100, protein: 100 }),
        meal("over", 2, { calories: 2_200, protein: 120 }),
      ],
    }),
  );
  const calories = result.targetAdherence.calories;
  assert.equal(calories.tolerancePercent, NUTRITION_TARGET_TOLERANCE_PERCENT);
  assert.equal(calories.underTargetLoggedDayCount, 1);
  assert.equal(calories.withinTargetLoggedDayCount, 1);
  assert.equal(calories.overTargetLoggedDayCount, 1);
  assert.equal(calories.unloggedDayCount, 4);
  assert.equal(
    (calories.underTargetLoggedDayCount ?? 0) +
      (calories.withinTargetLoggedDayCount ?? 0) +
      (calories.overTargetLoggedDayCount ?? 0),
    3,
  );
  assert.equal(result.targetAdherence.protein.underTargetLoggedDayCount, 1);
  assert.equal(result.targetAdherence.protein.withinTargetLoggedDayCount, 1);
  assert.equal(result.targetAdherence.protein.overTargetLoggedDayCount, 1);
});

test("requirements 35-37: protein per pound requires finite positive pound bodyweight", () => {
  for (const bodyweightLb of [0, -180, Number.NaN]) {
    const result = analytics(
      makeState({
        mealEntries: [meal("protein", 0, { protein: 90 })],
        profile: { ...defaultState.profile, units: "lb", bodyweightLb },
      }),
    );
    assert.equal(result.proteinPerBodyweight.metric.status, "unavailable");
    assert.equal(result.proteinPerBodyweight.metric.value, null);
  }
});

test("requirement 38: valid pound profile bodyweight is an explicit fallback", () => {
  const result = analytics(
    makeState({
      mealEntries: [meal("protein", 0, { protein: 90 })],
      profile: { ...defaultState.profile, units: "lb", bodyweightLb: 180 },
    }),
  );
  assert.equal(result.proteinPerBodyweight.metric.value, 0.5);
  assert.equal(result.proteinPerBodyweight.metric.unit, "g/lb");
  assert.equal(result.proteinPerBodyweight.bodyweightSource, "profile");
  assert.equal(result.proteinPerBodyweight.profileFallbackUsed, true);
});

test("requirement 39: latest valid weightLb entry is preferred over profile", () => {
  const result = analytics(
    makeState({
      mealEntries: [meal("protein", 0, { protein: 90 })],
      profile: { ...defaultState.profile, units: "lb", bodyweightLb: 200 },
      bodyweightEntries: [
        { id: "older", weightLb: 170, createdAt: timestamp(5) },
        { id: "latest", weightLb: 180, createdAt: timestamp(1) },
      ],
    }),
  );
  assert.equal(result.proteinPerBodyweight.metric.value, 0.5);
  assert.equal(result.proteinPerBodyweight.bodyweightSource, "bodyweight_entry");
  assert.equal(result.proteinPerBodyweight.bodyweightSourceId, "latest");
  assert.equal(result.proteinPerBodyweight.profileFallbackUsed, false);
});

test("stale bodyweight is reported and prevents high protein-per-pound confidence", () => {
  const result = analytics(
    makeState({
      mealEntries: [meal("protein", 0, { protein: 90 })],
      profile: { ...defaultState.profile, units: "lb", bodyweightLb: 200 },
      bodyweightEntries: [{ id: "stale", weightLb: 180, createdAt: timestamp(40) }],
    }),
  );
  assert.equal(result.proteinPerBodyweight.metric.value, 0.5);
  assert.equal(result.proteinPerBodyweight.staleBodyweight, true);
  assert.equal(result.proteinPerBodyweight.metric.confidence, "low");
  assert.ok(
    result.proteinPerBodyweight.metric.reasons.some((reason) => reason.code === "stale_bodyweight"),
  );
});

test("requirement 40: profile values with kilogram semantics do not produce g/lb", () => {
  const result = analytics(
    makeState({
      mealEntries: [meal("protein", 0, { protein: 90 })],
      profile: { ...defaultState.profile, units: "kg", bodyweightLb: 82 },
      bodyweightEntries: [],
    }),
  );
  assert.equal(result.proteinPerBodyweight.metric.status, "unavailable");
  assert.equal(result.proteinPerBodyweight.metric.value, null);
  assert.equal(result.proteinPerBodyweight.bodyweightSource, null);
});

test("requirements 41-42: explicit pre and post workout meal types are detected", () => {
  const result = analytics(
    makeState({
      workouts: [workout("workout", 1)],
      mealEntries: [
        meal("pre", 1, { type: "pre-workout", createdAt: timestamp(1, 15) }),
        meal("post", 1, { type: "post-workout", createdAt: timestamp(1, 19) }),
      ],
    }),
  );
  assert.equal(result.workoutFuel.preWorkout.evidenceMode, "explicit_meal_type");
  assert.equal(result.workoutFuel.preWorkout.workoutsWithQualifyingMeal, 1);
  assert.equal(result.workoutFuel.postWorkout.evidenceMode, "explicit_meal_type");
  assert.equal(result.workoutFuel.postWorkout.workoutsWithQualifyingMeal, 1);
  assert.deepEqual(result.workoutFuel.preWorkout.sourceMealIds, ["pre"]);
  assert.deepEqual(result.workoutFuel.postWorkout.sourceMealIds, ["post"]);
});

test("workout timing linkage uses named windows and never reuses one meal", () => {
  const result = analytics(
    makeState({
      workouts: [workout("first", 1), workout("second", 0)],
      mealEntries: [
        meal("before-first", 1, { type: "lunch", createdAt: timestamp(1, 15) }),
        meal("after-first", 1, { type: "dinner", createdAt: timestamp(1, 19) }),
      ],
    }),
  );
  assert.equal(result.workoutFuel.preWorkout.evidenceMode, "timestamp_relationship");
  assert.equal(result.workoutFuel.postWorkout.evidenceMode, "timestamp_relationship");
  assert.equal(result.workoutFuel.preWorkout.workoutsWithQualifyingMeal, 1);
  assert.equal(result.workoutFuel.postWorkout.workoutsWithQualifyingMeal, 1);
  assert.equal(result.workoutFuel.preWorkout.workoutsWithoutObservedQualifyingMeal, 1);
  assert.equal(result.workoutFuel.postWorkout.workoutsWithoutObservedQualifyingMeal, 1);
  assert.deepEqual(result.workoutFuel.preWorkout.sourceMealIds, ["before-first"]);
  assert.deepEqual(result.workoutFuel.postWorkout.sourceMealIds, ["after-first"]);
});

test("requirements 43-44: workout fuel is unavailable without supporting timestamps", () => {
  const invalidMeal = meal("invalid", 0, { createdAt: Number.NaN });
  const invalidWorkout = workout("invalid-workout", 0, {
    startedAt: Number.NaN,
    endedAt: Number.NaN,
  });
  const result = analytics(makeState({ mealEntries: [invalidMeal], workouts: [invalidWorkout] }));
  assert.equal(result.workoutFuel.preWorkout.status, "unavailable");
  assert.equal(result.workoutFuel.postWorkout.status, "unavailable");
  assert.equal(result.workoutFuel.preWorkout.evidenceMode, null);
  assert.equal(result.workoutFuel.postWorkout.evidenceMode, null);
});

test("requirement 45: incomplete workouts are never used for meal timing linkage", () => {
  const incomplete = workout("incomplete", 1);
  delete incomplete.endedAt;
  const result = analytics(
    makeState({
      workouts: [incomplete],
      mealEntries: [meal("pre", 1, { type: "pre-workout", createdAt: timestamp(1, 15) })],
    }),
  );
  assert.equal(result.workoutFuel.preWorkout.completedWorkoutsAnalyzed, 0);
  assert.equal(result.workoutFuel.preWorkout.status, "unavailable");
});

test("requirement 46: one meal per day creates no timing gap", () => {
  const result = analytics(
    makeState({ mealEntries: [meal("one", 0, {}, 8), meal("two", 1, {}, 20)] }),
  );
  assert.equal(result.mealTiming.status, "needs_more_data");
  assert.equal(result.mealTiming.gapCount, 0);
  assert.equal(result.mealTiming.averageGapHours, null);
});

test("requirements 47-49: same-day and duplicate timestamps create safe non-overnight gaps", () => {
  const result = analytics(
    makeState({
      mealEntries: [
        meal("morning", 0, { createdAt: timestamp(0, 8) }),
        meal("noon-a", 0, { createdAt: timestamp(0, 12) }),
        meal("noon-b", 0, { createdAt: timestamp(0, 12) }),
        meal("prior-night", 1, { createdAt: timestamp(1, 22) }),
      ],
    }),
  );
  assert.equal(result.mealTiming.status, "ready");
  assert.deepEqual(result.mealTiming.perDayGaps[0].gapHours, [4, 0]);
  assert.equal(result.mealTiming.minimumGapHours, 0);
  assert.equal(result.mealTiming.maximumGapHours, 4);
  assert.equal(result.mealTiming.includesOvernightIntervals, false);
  assert.equal(result.mealTiming.fastingInterpretation, null);
});

test("requirements 50-53: fiber follows actual schema support while absent fields stay unavailable", () => {
  const withFiber = analytics(
    makeState({ mealEntries: [meal("fiber", 0, { fiber: 8 }), meal("no-fiber", 0)] }),
  );
  assert.equal(withFiber.optionalNutrients.fiber.supported, true);
  assert.equal(withFiber.optionalNutrients.fiber.status, "ready");
  assert.equal(withFiber.optionalNutrients.fiber.total, 8);
  assert.equal(withFiber.optionalNutrients.fiber.coveragePercent, 50);

  const withoutFiber = analytics(makeState({ mealEntries: [meal("meal", 0)] }));
  assert.equal(withoutFiber.optionalNutrients.fiber.status, "needs_more_data");
  for (const nutrient of ["sodium", "sugar", "hydration"] as const) {
    assert.equal(withoutFiber.optionalNutrients[nutrient].supported, false);
    assert.equal(withoutFiber.optionalNutrients[nutrient].status, "unavailable");
    assert.ok(
      withoutFiber.optionalNutrients[nutrient].reasons.some(
        (reason) => reason.code === "unsupported_nutrient_field",
      ),
    );
  }
});

test("requirement 54: completeness flags reflect only real supporting data", () => {
  const result = analytics(
    makeState({
      workouts: [workout("workout", 1)],
      mealEntries: [
        meal("pre", 1, { type: "pre-workout", fiber: 5, createdAt: timestamp(1, 15) }),
        meal("post", 0, { type: "post-workout" }),
      ],
      profile: { ...defaultState.profile, units: "lb", bodyweightLb: 180 },
      nutritionTargets: { calories: 2_000, protein: 150, carbs: 250, fat: 70 },
    }),
  );
  assert.equal(result.completeness.hasMeals, true);
  assert.equal(result.completeness.hasMultipleLoggedDays, true);
  assert.equal(result.completeness.hasValidTargets, true);
  assert.equal(result.completeness.hasBodyweight, true);
  assert.equal(result.completeness.hasMealTypes, true);
  assert.equal(result.completeness.hasWorkoutTiming, true);
  assert.equal(result.completeness.hasPreWorkoutEvidence, true);
  assert.equal(result.completeness.hasFiberData, true);
  assert.equal(result.completeness.hasSodiumData, false);
  assert.equal(result.completeness.hasSugarData, false);
  assert.equal(result.completeness.hasHydrationData, false);
});

test("requirements 57-58: source IDs are sorted and deduplicated", () => {
  const result = analytics(makeState({ mealEntries: [meal("z", 0), meal("a", 1), meal("a", 1)] }));
  assert.deepEqual(result.sourceMetadata.entryIds, ["a", "z"]);
  assert.equal(new Set(result.sourceMetadata.entryIds).size, result.sourceMetadata.entryIds.length);
  assert.deepEqual(result.mealCounts.rangeTotal.source.entryIds, ["a", "z"]);
});

test("requirements 59-60: reversed inputs and repeated execution are byte-stable", () => {
  const meals = [
    meal("c", 0, { type: "dinner" }),
    meal("a", 2, { type: "breakfast" }),
    meal("b", 1, { type: "lunch" }),
  ];
  const forward = analytics(makeState({ mealEntries: meals }));
  const reversed = analytics(makeState({ mealEntries: [...meals].reverse() }));
  const repeated = analytics(makeState({ mealEntries: meals }));
  assert.equal(JSON.stringify(forward), JSON.stringify(reversed));
  assert.equal(JSON.stringify(forward), JSON.stringify(repeated));
});

test("requirement 61: Tasks 1-5 compatibility remains intact", () => {
  const state = makeState({ mealEntries: [meal("meal", 0)] });
  const core = getCoreDomainAnalytics(state, NOW);
  const trainingDetail = getExerciseAndMuscleAnalytics(state, { now: NOW });
  assert.equal(core.nutrition.caloriesToday.value, 500);
  assert.equal(core.nutrition.caloriesToday.kind, "point_in_time");
  assert.equal(trainingDetail.availability.status, "unavailable");
});

test("requirement 62: no invalid numbers, counts, or percentages appear anywhere", () => {
  const result = analytics(
    makeState({
      mealEntries: [
        meal("valid", 0),
        meal("bad", 1, {
          calories: Number.NaN,
          protein: Number.POSITIVE_INFINITY,
          carbs: -1,
          fat: Number.NEGATIVE_INFINITY,
          fiber: Number.NaN,
        }),
      ],
      nutritionTargets: {
        calories: 0,
        protein: Number.NaN,
        carbs: Number.POSITIVE_INFINITY,
        fat: -1,
      },
    }),
  );
  assertSafeTree(result);
});

function roundedSum(values: readonly number[]): number {
  return Math.round(safeSumForTest(values) * 100) / 100;
}

function safeSumForTest(values: readonly number[]): number {
  return values.filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
}
