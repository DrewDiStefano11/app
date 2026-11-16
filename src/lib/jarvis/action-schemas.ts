import { z } from "zod";

const label = z.string().trim().min(1).max(160);
const notes = z.string().trim().max(1_024);
const id = z.string().min(1).max(128);
const draft = { draftId: id.optional() };
const log = { ...draft, notes: notes.optional(), originalText: notes.optional() };
const confidence = z.enum(["low", "medium", "high"]);
const mealType = z.enum(["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"]);
const time = z.number().positive().max(1_440);
const amount = z.number().nonnegative().max(5_000);
const macros = {
  calories: z.number().nonnegative().max(20_000),
  protein: amount,
  carbs: amount,
  fat: amount,
};
const macroItem = z.strictObject({ name: label, qty: label.optional(), ...macros });
const recovery = {
  energy: z.number().int().min(1).max(10),
  soreness: z.number().int().min(1).max(10),
  stress: z.number().int().min(1).max(10),
  motivation: z.number().int().min(1).max(10),
};
export const setValues = z.strictObject({
  weight: z.number().nonnegative().max(2_000).optional(),
  reps: z.number().int().positive().max(1_000).optional(),
  durationMin: time.optional(),
  distanceMi: z.number().positive().max(500).optional(),
  modifier: z
    .enum(["normal", "warmup", "drop", "failure", "partials", "unilateral", "paused", "tempo"])
    .optional(),
});
const nonempty = <T extends z.ZodRawShape>(shape: T) =>
  z
    .strictObject(shape)
    .partial()
    .refine((value) => Object.keys(value).length > 0);
const mealFields = {
  name: label,
  ...macros,
  fiber: amount.optional(),
  items: z.array(macroItem).min(1).max(30).optional(),
};
const slot = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "proteinShake",
  "preWorkout",
  "postWorkout",
]);

const workoutSet = setValues.refine(
  (value) =>
    value.reps !== undefined || value.durationMin !== undefined || value.distanceMi !== undefined,
);
const historicalExercise = z.strictObject({
  exerciseId: id,
  sets: z.array(workoutSet).min(1).max(100),
  notes: notes.optional(),
});
const workoutPatch = nonempty({ name: label, notes });

const schemas: Readonly<Record<string, z.ZodType<Record<string, unknown>>>> = {
  logSleep: z.strictObject({
    ...draft,
    hours: z.number().positive().max(24),
    quality: z.number().int().min(1).max(10),
  }),
  updateBodyWeight: z.strictObject({ ...draft, id, weightLb: z.number().min(40).max(700) }),
  logBodyWeight: z.strictObject({ ...log, weightLb: z.number().min(40).max(700) }),
  logSupplement: z.strictObject({ ...log, name: label, dose: label.optional() }),
  logDailyCheckIn: z.strictObject({ ...log, ...recovery }),
  updateDailyCheckIn: z.strictObject({ ...draft, patch: nonempty({ ...recovery, notes }) }),
  logMeal: z.strictObject({
    ...log,
    ...mealFields,
    mealType,
    confidence: confidence.optional(),
    assumptions: z.array(notes).max(12).optional(),
  }),
  updateMeal: z.strictObject({
    ...draft,
    id,
    patch: nonempty({ ...mealFields, type: mealType, notes }),
  }),
  correctMealPortion: z.strictObject({
    ...draft,
    id,
    index: z.number().int().min(0).max(29),
    quantity: z.number().positive().max(5_000),
    unit: z.enum(["cup", "scoop", "ounce", "gram", "slice", "serving", "portion", "piece"]),
  }),
  deleteMeal: z.strictObject({ ...draft, id }),
  logUsualMeal: z.strictObject({ ...draft, slot }),
  saveUsualMeal: z.strictObject({ ...draft, slot, name: label, ...macros }),
  logWorkout: z.strictObject({
    ...log,
    name: label.optional(),
    workoutType: label.optional(),
    startedAt: z.number().int().positive().optional(),
    endedAt: z.number().int().positive().optional(),
    durationMin: time.optional(),
    confidence: confidence.optional(),
    exercises: z.array(historicalExercise).min(1).max(100),
  }),
  updateWorkout: z.strictObject({ ...draft, id, patch: workoutPatch }),
  updateActiveWorkout: z.strictObject({ ...log, patch: workoutPatch }),
  addPlannedExerciseSet: z.strictObject({
    ...draft,
    exerciseEntryId: id,
    expectedCount: z.number().int().positive().max(1_000).optional(),
  }),
  logExerciseSet: setValues
    .extend({
      ...draft,
      exerciseId: id.optional(),
      exerciseName: label.optional(),
      exerciseEntryId: id.optional(),
    })
    .refine(
      (value) =>
        value.reps !== undefined ||
        value.durationMin !== undefined ||
        value.distanceMi !== undefined,
    ),
  updateExerciseSet: z.strictObject({
    ...draft,
    setId: id,
    patch: nonempty(setValues.shape),
  }),
  deleteExerciseSet: z.strictObject({ ...draft, setId: id }),
  finishActiveWorkout: z.strictObject({ ...draft, notes: notes.optional() }),
  startScheduledWorkout: z.strictObject({
    ...draft,
    weekday: z.number().int().min(0).max(6).optional(),
  }),
  startRestTimer: z.strictObject({ ...draft, seconds: z.number().int().positive().max(86_400) }),
  logCardio: z
    .strictObject({
      ...log,
      type: label,
      minutes: time.optional(),
      distanceMi: z.number().positive().max(500).optional(),
      calories: amount.optional(),
      heartRate: z.number().int().min(25).max(250).optional(),
      speed: z.number().nonnegative().max(50).optional(),
      incline: z.number().min(-25).max(100).optional(),
      confidence: confidence.optional(),
    })
    .refine((value) => value.minutes !== undefined || value.distanceMi !== undefined),
  undoLastAction: z.strictObject({ ...draft, targetAuditId: id.optional() }),
};

export function canProposeJarvisMutation(name: string) {
  return Object.hasOwn(schemas, name);
}

export function validateJarvisMutation(name: string, args: unknown) {
  return canProposeJarvisMutation(name) ? schemas[name].safeParse(args) : undefined;
}
