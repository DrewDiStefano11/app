import type {
  AppState,
  JarvisAuditEntry,
  UserGoalsProfile,
  JarvisSettings,
  Confidence,
  MealEntry,
  MealItem,
  SupplementLog,
  RecoveryCheckIn,
  Workout,
  WorkoutExercise,
  SetEntry,
  CardioEntry,
} from "../types";
import { uid, todayStart, e1RM } from "../store";
import { EXERCISES, WORKOUT_TEMPLATES, exerciseById } from "../data";

export interface ToolResult {
  ok: boolean;
  summary: string;
  needsConfirmation?: boolean;
  auditId?: string;
  data?: unknown;
  error?: string;
}

export type ToolName =
  | "getTodaySummary"
  | "getNutritionStatus"
  | "getTrainingStatus"
  | "getRecoveryStatus"
  | "getProgressTrends"
  | "getUserGoalsProfile"
  | "updateUserGoalsProfile"
  | "getJarvisSettings"
  | "updateJarvisSettings"
  | "logBodyWeight"
  | "logSupplement"
  | "logDailyCheckIn"
  | "undoLastAction"
  | "saveJarvisLearning"
  | "getJarvisLearnedPreferences"
  | "logMeal"
  | "updateMeal"
  | "deleteMeal"
  | "getMealHistory"
  | "getUsualMeals"
  | "saveUsualMeal"
  | "logUsualMeal"
  | "getSupplementStatus"
  | "getMissedHabits"
  | "getDailyReviewSummary"
  | "updateDailyCheckIn"
  | "suggestNutritionAction"
  | "createWorkoutDraft"
  | "logWorkout"
  | "updateWorkout"
  | "deleteWorkout"
  | "getWorkoutHistory"
  | "getLastWorkoutByType"
  | "getLastExercisePerformance"
  | "logExerciseSet"
  | "updateExerciseSet"
  | "deleteExerciseSet"
  | "logCardio"
  | "updateActiveWorkout"
  | "suggestActiveWorkoutChange"
  | "getActiveWorkout"
  | "finishActiveWorkout"
  | "saveWorkoutTemplate"
  | "getWorkoutTemplates"
  | "suggestWorkoutProgression"
  | "suggestExerciseSubstitution"
  | "logWorkoutNote"
  | "logWorkoutPainOrSoreness"
  | "getTrainingReadinessContext";

export interface ToolSpec {
  name: ToolName;
  description: string;
  parameters: Record<string, unknown>;
}

const emptyParams = { type: "object", properties: {} };
const workoutExerciseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      exerciseId: { type: "string" },
      name: { type: "string" },
      sets: { type: "array", items: { type: "object" } },
      notes: { type: "string" },
    },
  },
};

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "getTodaySummary",
    description: "Get today's calories, protein, last workout, and last check-in.",
    parameters: emptyParams,
  },
  {
    name: "getNutritionStatus",
    description: "Current calories/macros vs goals for today.",
    parameters: emptyParams,
  },
  {
    name: "getTrainingStatus",
    description: "Recent workouts and current training week summary.",
    parameters: emptyParams,
  },
  {
    name: "getRecoveryStatus",
    description: "Latest soreness / sleep / recovery check-in.",
    parameters: emptyParams,
  },
  {
    name: "getProgressTrends",
    description: "Bodyweight and workout trends over recent weeks.",
    parameters: emptyParams,
  },
  {
    name: "getUserGoalsProfile",
    description: "Read the user's goals and profile.",
    parameters: emptyParams,
  },
  {
    name: "updateUserGoalsProfile",
    description: "Update one or more goal/profile fields. Requires confirmation.",
    parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] },
  },
  {
    name: "getJarvisSettings",
    description: "Read current Jarvis settings.",
    parameters: emptyParams,
  },
  {
    name: "updateJarvisSettings",
    description: "Update Jarvis settings. Requires confirmation.",
    parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] },
  },
  {
    name: "logBodyWeight",
    description: "Log a bodyweight measurement in pounds.",
    parameters: {
      type: "object",
      properties: {
        weightLb: { type: "number" },
        notes: { type: "string" },
        originalText: { type: "string" },
        draftId: { type: "string" },
      },
      required: ["weightLb"],
    },
  },
  {
    name: "logSupplement",
    description: "Log a supplement intake.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        dose: { type: "string" },
        notes: { type: "string" },
        originalText: { type: "string" },
        draftId: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "logDailyCheckIn",
    description: "Log a daily recovery check-in (1-10 scales).",
    parameters: {
      type: "object",
      properties: {
        energy: { type: "number" },
        soreness: { type: "number" },
        stress: { type: "number" },
        motivation: { type: "number" },
        notes: { type: "string" },
        originalText: { type: "string" },
        draftId: { type: "string" },
      },
      required: ["energy", "soreness", "stress", "motivation"],
    },
  },
  {
    name: "undoLastAction",
    description: "Undo the most recent Jarvis action.",
    parameters: emptyParams,
  },
  {
    name: "saveJarvisLearning",
    description: "Save a learned preference.",
    parameters: {
      type: "object",
      properties: { key: { type: "string" }, value: {} },
      required: ["key", "value"],
    },
  },
  {
    name: "getJarvisLearnedPreferences",
    description: "Get all learned preferences.",
    parameters: emptyParams,
  },
  {
    name: "logMeal",
    description: "Log a meal with totals and optional item estimates.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        mealType: { type: "string" },
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
        fiber: { type: "number" },
        items: { type: "array", items: { type: "object" } },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        assumptions: { type: "array", items: { type: "string" } },
        originalText: { type: "string" },
        source: { type: "string" },
        draftId: { type: "string" },
      },
      required: ["name", "mealType", "calories", "protein", "carbs", "fat"],
    },
  },
  {
    name: "updateMeal",
    description: "Update one of the user's recent meals by id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" }, patch: { type: "object" } },
      required: ["id", "patch"],
    },
  },
  {
    name: "deleteMeal",
    description: "Delete a meal by id.",
    parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "getMealHistory",
    description: "Recent meals.",
    parameters: { type: "object", properties: { days: { type: "number" } } },
  },
  { name: "getUsualMeals", description: "Get saved usual meals.", parameters: emptyParams },
  {
    name: "saveUsualMeal",
    description: "Save or update a usual meal slot with macros.",
    parameters: {
      type: "object",
      properties: {
        slot: { type: "string" },
        name: { type: "string" },
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
      required: ["slot", "name"],
    },
  },
  {
    name: "logUsualMeal",
    description: "Log one saved usual meal.",
    parameters: {
      type: "object",
      properties: { slot: { type: "string" }, draftId: { type: "string" } },
      required: ["slot"],
    },
  },
  {
    name: "getSupplementStatus",
    description: "Supplements taken today vs routine.",
    parameters: emptyParams,
  },
  { name: "getMissedHabits", description: "Habits missed today.", parameters: emptyParams },
  { name: "getDailyReviewSummary", description: "Full daily review.", parameters: emptyParams },
  {
    name: "updateDailyCheckIn",
    description: "Patch today's most recent check-in.",
    parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] },
  },
  {
    name: "suggestNutritionAction",
    description: "Get one concrete nutrition suggestion.",
    parameters: emptyParams,
  },
  {
    name: "createWorkoutDraft",
    description:
      "Create a structured workout draft/review card from natural language. Does not save until confirmed.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        workoutType: { type: "string" },
        exercises: workoutExerciseSchema,
        startedAt: { type: "number" },
        endedAt: { type: "number" },
        durationMin: { type: "number" },
        notes: { type: "string" },
        confidence: { type: "string" },
        originalText: { type: "string" },
      },
      required: ["exercises"],
    },
  },
  {
    name: "logWorkout",
    description: "Log a complete strength workout from structured exercises/sets.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        workoutType: { type: "string" },
        exercises: workoutExerciseSchema,
        startedAt: { type: "number" },
        endedAt: { type: "number" },
        durationMin: { type: "number" },
        notes: { type: "string" },
        confidence: { type: "string" },
        originalText: { type: "string" },
        draftId: { type: "string" },
      },
      required: ["exercises"],
    },
  },
  {
    name: "updateWorkout",
    description: "Patch a saved workout by id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" }, patch: { type: "object" } },
      required: ["id", "patch"],
    },
  },
  {
    name: "deleteWorkout",
    description: "Delete a saved workout by id.",
    parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "getWorkoutHistory",
    description: "Recent workout history.",
    parameters: { type: "object", properties: { days: { type: "number" } } },
  },
  {
    name: "getLastWorkoutByType",
    description: "Get the latest workout by type/name.",
    parameters: {
      type: "object",
      properties: { workoutType: { type: "string" } },
      required: ["workoutType"],
    },
  },
  {
    name: "getLastExercisePerformance",
    description: "Get previous set performance for an exercise.",
    parameters: {
      type: "object",
      properties: { exerciseId: { type: "string" }, exerciseName: { type: "string" } },
    },
  },
  {
    name: "logExerciseSet",
    description: "Add/log a set to the active workout.",
    parameters: {
      type: "object",
      properties: {
        exerciseId: { type: "string" },
        exerciseName: { type: "string" },
        weight: { type: "number" },
        reps: { type: "number" },
        rpe: { type: "number" },
        modifier: { type: "string" },
        notes: { type: "string" },
      },
    },
  },
  {
    name: "updateExerciseSet",
    description: "Patch an active workout set.",
    parameters: {
      type: "object",
      properties: { setId: { type: "string" }, patch: { type: "object" } },
      required: ["setId", "patch"],
    },
  },
  {
    name: "deleteExerciseSet",
    description: "Delete an active workout set.",
    parameters: { type: "object", properties: { setId: { type: "string" } }, required: ["setId"] },
  },
  {
    name: "logCardio",
    description: "Log cardio: treadmill, walk, stairmaster, bike, run, etc.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string" },
        minutes: { type: "number" },
        distanceMi: { type: "number" },
        calories: { type: "number" },
        heartRate: { type: "number" },
        speed: { type: "number" },
        incline: { type: "number" },
        notes: { type: "string" },
        confidence: { type: "string" },
        originalText: { type: "string" },
        draftId: { type: "string" },
      },
      required: ["type"],
    },
  },
  {
    name: "updateActiveWorkout",
    description:
      "Patch the active workout or change exercise targets. Ask before using unless allowed.",
    parameters: {
      type: "object",
      properties: { patch: { type: "object" }, originalText: { type: "string" } },
      required: ["patch"],
    },
  },
  {
    name: "suggestActiveWorkoutChange",
    description: "Suggest a change to the active workout without applying it.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" }, request: { type: "string" } },
    },
  },
  { name: "getActiveWorkout", description: "Read the active workout.", parameters: emptyParams },
  {
    name: "finishActiveWorkout",
    description: "Finish and save the active workout with optional notes.",
    parameters: {
      type: "object",
      properties: {
        notes: { type: "string" },
        endedAt: { type: "number" },
        draftId: { type: "string" },
      },
    },
  },
  {
    name: "saveWorkoutTemplate",
    description: "Save a workout or active workout as a template.",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, workoutId: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "getWorkoutTemplates",
    description: "Get saved and built-in workout templates.",
    parameters: emptyParams,
  },
  {
    name: "suggestWorkoutProgression",
    description: "Suggest progression for an exercise using history and recovery.",
    parameters: {
      type: "object",
      properties: { exerciseId: { type: "string" }, exerciseName: { type: "string" } },
    },
  },
  {
    name: "suggestExerciseSubstitution",
    description: "Suggest a safer exercise substitution.",
    parameters: {
      type: "object",
      properties: {
        exerciseId: { type: "string" },
        exerciseName: { type: "string" },
        reason: { type: "string" },
      },
    },
  },
  {
    name: "logWorkoutNote",
    description: "Add notes to active or saved workout.",
    parameters: {
      type: "object",
      properties: { workoutId: { type: "string" }, notes: { type: "string" } },
      required: ["notes"],
    },
  },
  {
    name: "logWorkoutPainOrSoreness",
    description: "Log pain/soreness/fatigue note into workout and recovery context.",
    parameters: {
      type: "object",
      properties: {
        area: { type: "string" },
        notes: { type: "string" },
        severity: { type: "number" },
      },
      required: ["notes"],
    },
  },
  {
    name: "getTrainingReadinessContext",
    description:
      "Read readiness, soreness, previous performance, and profile context for training choices.",
    parameters: emptyParams,
  },
];

export type Updater = (u: (s: AppState) => AppState) => void;
export interface RunContext {
  state: AppState;
  set: Updater;
  settings: JarvisSettings;
}
export type ToolHandler = (args: Record<string, unknown>, ctx: RunContext) => ToolResult;

function pushAudit(set: Updater, entry: JarvisAuditEntry) {
  set((s) => ({ ...s, jarvisAudit: [entry, ...s.jarvisAudit].slice(0, 200) }));
}

function hasAuditKey(state: AppState, tool: string, args: Record<string, unknown>) {
  const key = actionKey(tool, args);
  if (!key) return null;
  return (
    state.jarvisAudit.find(
      (a) =>
        !a.undone &&
        a.tool === tool &&
        a.patch?.actionKey === key &&
        Date.now() - a.createdAt < 10 * 60_000,
    ) ?? null
  );
}

function actionKey(tool: string, args: Record<string, unknown>) {
  const draftId = String(args.draftId ?? "").trim();
  if (draftId) return `draft:${draftId}`;
  const original = normalizeText(args.originalText);
  if (original) return `text:${original}`;
  if (tool === "logBodyWeight") return `weight:${Number(args.weightLb) || 0}:${todayStart()}`;
  if (tool === "logSupplement") return `supp:${normalizeText(args.name)}:${todayStart()}`;
  if (tool === "logMeal" || tool === "logUsualMeal")
    return `meal:${normalizeText(args.name ?? args.slot)}:${String(args.mealType ?? "")}:${todayStart()}`;
  if (tool === "logCardio")
    return `cardio:${normalizeText(args.type)}:${Number(args.minutes) || 0}:${todayStart()}`;
  if (tool === "logWorkout")
    return `workout:${normalizeText(args.name ?? args.workoutType)}:${todayStart()}`;
  return "";
}

function duplicateResult(entry: JarvisAuditEntry): ToolResult {
  return {
    ok: true,
    summary: "That's already logged.",
    auditId: entry.id,
    data: { duplicate: true, existing: entry.entityIds ?? [] },
  };
}

function normalizeText(v: unknown) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}
function sameDay(a: number, b = Date.now()) {
  return a >= dayStart(b) && a < dayStart(b) + 86400000;
}
function dayStart(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function asConfidence(v: unknown, fallback: Confidence = "medium"): Confidence {
  return v === "high" || v === "medium" || v === "low" ? v : fallback;
}
function textArg(args: Record<string, unknown>, key: string) {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function todaysMealsTotal(s: AppState) {
  const t = todayStart();
  return s.mealEntries
    .filter((m) => m.createdAt >= t)
    .reduce(
      (a, m) => ({
        calories: a.calories + m.calories,
        protein: a.protein + m.protein,
        carbs: a.carbs + m.carbs,
        fat: a.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

function pushRecoveryActivity(set: Updater, summary: string, original?: string) {
  const id = uid();
  pushAudit(set, {
    id,
    tool: "jarvisActivity",
    summary,
    status: "undone",
    originalText: original,
    entityKind: "activity",
    createdAt: Date.now(),
  });
}

function findExerciseId(nameOrId: unknown): string {
  const raw = normalizeText(nameOrId);
  if (!raw) return "bench-press";
  const exact = EXERCISES.find((e) => e.id === raw || normalizeText(e.name) === raw);
  if (exact) return exact.id;
  const loose = EXERCISES.find(
    (e) => normalizeText(e.name).includes(raw) || raw.includes(normalizeText(e.name).split(" ")[0]),
  );
  return loose?.id ?? raw.replaceAll(" ", "-");
}

function normalizeSet(input: Record<string, unknown>, completed = true): SetEntry {
  const modifier = [
    "normal",
    "warmup",
    "drop",
    "failure",
    "partials",
    "unilateral",
    "paused",
    "tempo",
  ].includes(String(input.modifier))
    ? (String(input.modifier) as SetEntry["modifier"])
    : "normal";
  return {
    id: String(input.id ?? uid()),
    reps: input.reps == null ? undefined : Number(input.reps),
    weight: input.weight == null ? undefined : Number(input.weight),
    durationMin: input.durationMin == null ? undefined : Number(input.durationMin),
    distanceMi: input.distanceMi == null ? undefined : Number(input.distanceMi),
    modifier,
    completed,
  };
}

function normalizeWorkoutExercises(raw: unknown): WorkoutExercise[] {
  const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return list
    .map((item) => {
      const exerciseId = findExerciseId(item.exerciseId ?? item.name);
      const setsRaw = Array.isArray(item.sets) ? (item.sets as Record<string, unknown>[]) : [];
      const sets = setsRaw.length
        ? setsRaw.map((s) => normalizeSet(s))
        : [{ id: uid(), modifier: "normal", completed: false } as SetEntry];
      return {
        id: String(item.id ?? uid()),
        exerciseId,
        sets,
        notes: textArg(item, "notes"),
        completed: sets.some((s) => s.completed),
      };
    })
    .filter((e) => e.exerciseId);
}

function workoutPayload(args: Record<string, unknown>) {
  const exercises = normalizeWorkoutExercises(args.exercises);
  const startedAt =
    Number(args.startedAt) || Date.now() - Math.max(0, Number(args.durationMin) || 0) * 60000;
  const endedAt =
    Number(args.endedAt) ||
    (Number(args.durationMin) ? startedAt + Number(args.durationMin) * 60000 : Date.now());
  const workoutType = String(args.workoutType ?? args.type ?? inferWorkoutType(exercises));
  const name = String(args.name ?? `${capitalize(workoutType)} Workout`);
  return {
    id: uid(),
    name,
    startedAt,
    endedAt,
    exercises,
    notes: textArg(args, "notes"),
    workoutType,
    confidence: asConfidence(args.confidence),
    originalText: textArg(args, "originalText"),
  };
}

function inferWorkoutType(exercises: WorkoutExercise[]) {
  const names = exercises
    .map((e) => exerciseById(e.exerciseId)?.name.toLowerCase() ?? e.exerciseId)
    .join(" ");
  if (/squat|leg|rdl|deadlift|calf|lunge/.test(names)) return "legs";
  if (/row|pull|lat|curl|deadlift/.test(names)) return "pull";
  if (/bench|press|fly|tricep|shoulder/.test(names)) return "push";
  if (/run|walk|bike|treadmill|stair/.test(names)) return "cardio";
  return "custom";
}

function capitalize(v: string) {
  return v ? v[0].toUpperCase() + v.slice(1) : v;
}

function maybeDuplicateWorkout(state: AppState, draft: ReturnType<typeof workoutPayload>) {
  return state.workouts.find(
    (w) =>
      sameDay(w.startedAt, draft.startedAt) &&
      normalizeText(w.name) === normalizeText(draft.name) &&
      Math.abs(w.exercises.length - draft.exercises.length) <= 1,
  );
}

function cardioSummary(entry: CardioEntry) {
  return `Logged ${entry.type}${entry.minutes ? ` for ${entry.minutes} min` : ""}${entry.distanceMi ? `, ${entry.distanceMi} mi` : ""}`;
}

const handlers: Record<ToolName, ToolHandler> = {
  getTodaySummary: (_a, { state }) => {
    const tot = todaysMealsTotal(state),
      tgt = state.nutritionTargets,
      last = state.workouts.at(-1),
      ci = state.recoveryCheckIns.at(-1);
    return {
      ok: true,
      summary: "today snapshot",
      data: {
        calories: `${tot.calories} / ${tgt.calories}`,
        protein: `${tot.protein}g / ${tgt.protein}g`,
        lastWorkout: last
          ? { name: last.name, daysAgo: Math.floor((Date.now() - last.startedAt) / 86400000) }
          : null,
        lastCheckIn: ci ? { energy: ci.energy, soreness: ci.soreness, stress: ci.stress } : null,
      },
    };
  },
  getNutritionStatus: (_a, { state }) => ({
    ok: true,
    summary: "nutrition today",
    data: { totals: todaysMealsTotal(state), targets: state.nutritionTargets },
  }),
  getTrainingStatus: (_a, { state }) => ({
    ok: true,
    summary: "training status",
    data: {
      thisWeek: state.workouts.filter((w) => w.startedAt > Date.now() - 7 * 86400000).length,
      recent: state.workouts.slice(-5),
      activeWorkout: state.activeWorkout?.name ?? null,
    },
  }),
  getRecoveryStatus: (_a, { state }) => ({
    ok: true,
    summary: "recovery status",
    data: {
      lastCheckIn: state.recoveryCheckIns.at(-1) ?? null,
      lastSleep: state.sleepEntries.at(-1) ?? null,
      muscleFatigue: state.muscleFatigue,
    },
  }),
  getProgressTrends: (_a, { state }) => ({
    ok: true,
    summary: "progress trends",
    data: {
      bodyweight: state.bodyweightEntries.slice(-8),
      prCount: state.prs.length,
      goals: state.goals,
    },
  }),
  getUserGoalsProfile: (_a, { state }) => ({
    ok: true,
    summary: "user profile",
    data: state.userGoalsProfile,
  }),
  updateUserGoalsProfile: (args, { set, state }) => {
    const patch = (args.patch ?? {}) as Partial<UserGoalsProfile>,
      prev = state.userGoalsProfile,
      auditId = uid();
    set((s) => ({ ...s, userGoalsProfile: { ...s.userGoalsProfile, ...patch } }));
    pushAudit(set, {
      id: auditId,
      tool: "updateUserGoalsProfile",
      summary: `Update profile: ${Object.keys(patch).join(", ")}`,
      status: "logged",
      patch: { next: patch, prev },
      createdAt: Date.now(),
      entityKind: "profile",
    });
    return { ok: true, summary: "Profile updated", auditId };
  },
  getJarvisSettings: (_a, { state }) => ({
    ok: true,
    summary: "jarvis settings",
    data: state.jarvisSettings,
  }),
  updateJarvisSettings: (args, { set, state }) => {
    const patch = (args.patch ?? {}) as Partial<JarvisSettings>,
      prev = state.jarvisSettings,
      auditId = uid();
    set((s) => ({ ...s, jarvisSettings: { ...s.jarvisSettings, ...patch } }));
    pushAudit(set, {
      id: auditId,
      tool: "updateJarvisSettings",
      summary: `Update Jarvis settings: ${Object.keys(patch).join(", ")}`,
      status: "logged",
      patch: { next: patch, prev },
      createdAt: Date.now(),
      entityKind: "jarvisSettings",
    });
    return { ok: true, summary: "Settings updated", auditId };
  },
  logBodyWeight: (args, { set, state }) => {
    const dupeAudit = hasAuditKey(state, "logBodyWeight", args);
    if (dupeAudit) return duplicateResult(dupeAudit);
    const weightLb = Number(args.weightLb);
    if (!Number.isFinite(weightLb) || weightLb < 40 || weightLb > 700)
      return { ok: false, summary: "invalid weight", error: "Weight must be 40-700 lb" };
    const existing = state.bodyweightEntries.find(
      (b) => sameDay(b.createdAt) && Math.abs(b.weightLb - weightLb) < 0.05,
    );
    if (existing)
      return {
        ok: true,
        summary: "That's already logged.",
        data: { duplicate: true, existing: [existing.id] },
      };
    const id = uid(),
      auditId = uid(),
      originalText = textArg(args, "originalText"),
      action = actionKey("logBodyWeight", args);
    set((s) => ({
      ...s,
      bodyweightEntries: [
        ...s.bodyweightEntries,
        { id, weightLb, notes: textArg(args, "notes"), createdAt: Date.now() },
      ],
    }));
    pushAudit(set, {
      id: auditId,
      tool: "logBodyWeight",
      summary: `Logged ${weightLb} lb`,
      status: "logged",
      originalText,
      confidence: "high",
      entityIds: [id],
      entityKind: "bodyweight",
      patch: { weightLb, actionKey: action },
      createdAt: Date.now(),
    });
    return { ok: true, summary: `Logged ${weightLb} lb`, auditId };
  },
  logSupplement: (args, { set, state }) => {
    const dupeAudit = hasAuditKey(state, "logSupplement", args);
    if (dupeAudit) return duplicateResult(dupeAudit);
    const name = String(args.name ?? "").trim();
    if (!name) return { ok: false, summary: "missing name", error: "Supplement name required" };
    const existing = state.supplementLogs.find(
      (s) => sameDay(s.createdAt) && normalizeText(s.name) === normalizeText(name),
    );
    if (existing)
      return {
        ok: true,
        summary: "That's already logged.",
        data: { duplicate: true, existing: [existing.id] },
      };
    const id = uid(),
      auditId = uid(),
      dose = textArg(args, "dose"),
      originalText = textArg(args, "originalText"),
      entry: SupplementLog = {
        id,
        name,
        dose,
        notes: textArg(args, "notes"),
        createdAt: Date.now(),
        source: "jarvis",
        auditId,
      };
    set((s) => ({ ...s, supplementLogs: [...s.supplementLogs, entry] }));
    const summary = `Logged ${name}${dose ? ` (${dose})` : ""}`;
    pushAudit(set, {
      id: auditId,
      tool: "logSupplement",
      summary,
      status: "logged",
      originalText,
      confidence: "high",
      entityIds: [id],
      entityKind: "supplement",
      patch: { name, dose, actionKey: actionKey("logSupplement", args) },
      createdAt: Date.now(),
    });
    return { ok: true, summary, auditId };
  },
  logDailyCheckIn: (args, { set }) => {
    const energy = clamp10(args.energy),
      soreness = clamp10(args.soreness),
      stress = clamp10(args.stress),
      motivation = clamp10(args.motivation);
    if ([energy, soreness, stress, motivation].some((v) => v == null))
      return { ok: false, summary: "invalid scales", error: "Scales must be 1-10" };
    const id = uid(),
      auditId = uid();
    set((s) => ({
      ...s,
      recoveryCheckIns: [
        ...s.recoveryCheckIns,
        {
          id,
          energy: energy!,
          soreness: soreness!,
          stress: stress!,
          motivation: motivation!,
          notes: textArg(args, "notes"),
          createdAt: Date.now(),
        },
      ],
    }));
    const summary = `Daily check-in: energy ${energy}, soreness ${soreness}, stress ${stress}, motivation ${motivation}`;
    pushAudit(set, {
      id: auditId,
      tool: "logDailyCheckIn",
      summary,
      status: "logged",
      originalText: textArg(args, "originalText"),
      confidence: "high",
      entityIds: [id],
      entityKind: "checkin",
      patch: { actionKey: actionKey("logDailyCheckIn", args) },
      createdAt: Date.now(),
    });
    return { ok: true, summary, auditId };
  },
  undoLastAction: (_a, { state, set }) => {
    const last = state.jarvisAudit.find((a) => !a.undone && a.status === "logged");
    return last
      ? undoAuditEntry(last.id, state, set)
      : { ok: false, summary: "nothing to undo", error: "No recent action found" };
  },
  saveJarvisLearning: (args, { set, settings }) => {
    if (!settings.learningEnabled)
      return { ok: false, summary: "learning disabled", error: "Memory/learning is off" };
    const key = String(args.key ?? "").trim();
    if (!key) return { ok: false, summary: "missing key", error: "key required" };
    set((s) => ({ ...s, jarvisLearning: { ...s.jarvisLearning, [key]: args.value } }));
    return { ok: true, summary: `Learned: ${key}` };
  },
  getJarvisLearnedPreferences: (_a, { state }) => ({
    ok: true,
    summary: "learned prefs",
    data: state.jarvisLearning,
  }),
  logMeal: (args, { set, state }) => {
    const dupeAudit = hasAuditKey(state, "logMeal", args);
    if (dupeAudit) return duplicateResult(dupeAudit);
    const name = String(args.name ?? "").trim() || "Meal",
      mealType = String(args.mealType ?? "snack"),
      calories = Math.round(Number(args.calories) || 0),
      protein = Math.round(Number(args.protein) || 0),
      carbs = Math.round(Number(args.carbs) || 0),
      fat = Math.round(Number(args.fat) || 0);
    if (calories <= 0 && protein <= 0)
      return { ok: false, summary: "empty meal", error: "Meal needs at least some macros." };
    const existing = state.mealEntries.find(
      (m) =>
        sameDay(m.createdAt) &&
        normalizeText(m.originalText) === normalizeText(args.originalText) &&
        normalizeText(args.originalText),
    );
    if (existing)
      return {
        ok: true,
        summary: "That's already logged.",
        data: { duplicate: true, existing: [existing.id] },
      };
    const confidence = asConfidence(args.confidence),
      assumptions = Array.isArray(args.assumptions)
        ? (args.assumptions as unknown[]).map(String)
        : undefined,
      originalText = textArg(args, "originalText");
    const items = Array.isArray(args.items)
      ? (args.items as Record<string, unknown>[]).map((it) => ({
          name: String(it.name ?? "item"),
          qty: textArg(it, "qty"),
          calories: Math.round(Number(it.calories) || 0),
          protein: Math.round(Number(it.protein) || 0),
          carbs: Math.round(Number(it.carbs) || 0),
          fat: Math.round(Number(it.fat) || 0),
          source: (it.source as MealItem["source"]) ?? "jarvis",
          confidence: asConfidence(it.confidence, confidence),
        }))
      : undefined;
    const id = uid(),
      auditId = uid(),
      fiber = args.fiber != null ? Math.round(Number(args.fiber) || 0) : undefined,
      source = (typeof args.source === "string" ? args.source : "jarvis") as MealEntry["source"];
    const entry: MealEntry = {
      id,
      name,
      type: mealType,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      items,
      source,
      confidence,
      originalText,
      assumptions,
      confirmed: true,
      auditId,
      createdAt: Date.now(),
    };
    set((s) => ({ ...s, mealEntries: [...s.mealEntries, entry] }));
    const summary = `Logged ${name} - ${calories} kcal, ${protein}g P / ${carbs}g C / ${fat}g F`;
    pushAudit(set, {
      id: auditId,
      tool: "logMeal",
      summary,
      status: "logged",
      originalText,
      confidence,
      assumptions,
      entityIds: [id],
      entityKind: "meal",
      patch: {
        name,
        mealType,
        calories,
        protein,
        carbs,
        fat,
        actionKey: actionKey("logMeal", args),
      },
      createdAt: Date.now(),
    });
    return {
      ok: true,
      summary,
      auditId,
      data: { id, calories, protein, carbs, fat, fiber, items, confidence, assumptions },
    };
  },
  updateMeal: (args, { set, state }) => {
    const id = String(args.id ?? ""),
      meal = state.mealEntries.find((m) => m.id === id);
    if (!meal) return { ok: false, summary: "meal not found", error: "Meal id not found" };
    const patch = (args.patch ?? {}) as Partial<MealEntry>,
      auditId = uid();
    set((s) => ({
      ...s,
      mealEntries: s.mealEntries.map((m) =>
        m.id === id ? { ...m, ...patch, source: "edited" } : m,
      ),
    }));
    pushAudit(set, {
      id: auditId,
      tool: "updateMeal",
      summary: `Edited meal: ${meal.name}`,
      status: "logged",
      entityIds: [id],
      entityKind: "mealEdit",
      patch: { prev: meal, next: patch },
      createdAt: Date.now(),
    });
    return { ok: true, summary: `Updated ${meal.name}`, auditId };
  },
  deleteMeal: (args, { set, state }) => {
    const id = String(args.id ?? ""),
      meal = state.mealEntries.find((m) => m.id === id);
    if (!meal) return { ok: false, summary: "meal not found", error: "Meal id not found" };
    const auditId = uid();
    set((s) => ({ ...s, mealEntries: s.mealEntries.filter((m) => m.id !== id) }));
    pushAudit(set, {
      id: auditId,
      tool: "deleteMeal",
      summary: `Deleted meal: ${meal.name}`,
      status: "logged",
      entityIds: [id],
      entityKind: "mealDelete",
      patch: { prev: meal },
      createdAt: Date.now(),
    });
    return { ok: true, summary: `Deleted ${meal.name}`, auditId };
  },
  getMealHistory: (args, { state }) => {
    const cutoff = Date.now() - Math.min(30, Math.max(1, Number(args.days) || 14)) * 86400000;
    const meals = state.mealEntries.filter((m) => m.createdAt >= cutoff).slice(-50);
    return { ok: true, summary: `${meals.length} meals`, data: meals };
  },
  getUsualMeals: (_a, { state }) => {
    const p = state.userGoalsProfile,
      learned = state.jarvisLearning as Record<string, unknown>,
      get = (k: string) => learned[`usualMeal_${k}`];
    return {
      ok: true,
      summary: "usual meals",
      data: {
        breakfast: { name: p.usualBreakfast, macros: get("breakfast") },
        lunch: { name: p.usualLunch, macros: get("lunch") },
        dinner: { name: p.usualDinner, macros: get("dinner") },
        snack: { name: p.usualSnack, macros: get("snack") },
        proteinShake: { name: p.usualProteinShake, macros: get("proteinShake") },
        preWorkout: { name: p.usualPreWorkoutMeal, macros: get("preWorkout") },
        postWorkout: { name: p.usualPostWorkoutMeal, macros: get("postWorkout") },
      },
    };
  },
  saveUsualMeal: (args, { set, state }) => {
    const slot = String(args.slot ?? ""),
      name = String(args.name ?? "").trim();
    if (!slot || !name)
      return { ok: false, summary: "missing slot/name", error: "slot and name required" };
    const macros = {
        calories: Math.round(Number(args.calories) || 0),
        protein: Math.round(Number(args.protein) || 0),
        carbs: Math.round(Number(args.carbs) || 0),
        fat: Math.round(Number(args.fat) || 0),
      },
      field = slotField(slot);
    if (!field) return { ok: false, summary: "unknown slot", error: `Unknown slot: ${slot}` };
    const prev = {
        name: state.userGoalsProfile[field],
        macros: (state.jarvisLearning as Record<string, unknown>)[`usualMeal_${slot}`],
      },
      auditId = uid();
    set((s) => ({
      ...s,
      userGoalsProfile: { ...s.userGoalsProfile, [field]: name },
      jarvisLearning: { ...s.jarvisLearning, [`usualMeal_${slot}`]: macros },
    }));
    pushAudit(set, {
      id: auditId,
      tool: "saveUsualMeal",
      summary: `Saved usual ${slot}: ${name}`,
      status: "logged",
      entityKind: "usualMeal",
      patch: { slot, name, macros, prev },
      createdAt: Date.now(),
    });
    return { ok: true, summary: `Saved usual ${slot}: ${name}`, auditId };
  },
  logUsualMeal: (args, ctx) => {
    const slot = String(args.slot ?? ""),
      field = slotField(slot);
    if (!field) return { ok: false, summary: "unknown slot", error: `Unknown slot: ${slot}` };
    const name = ctx.state.userGoalsProfile[field] as string | undefined;
    if (!name) return { ok: false, summary: "no usual saved", error: `No usual ${slot} saved.` };
    const macros = ((ctx.state.jarvisLearning as Record<string, unknown>)[`usualMeal_${slot}`] ??
      {}) as { calories?: number; protein?: number; carbs?: number; fat?: number };
    return handlers.logMeal(
      {
        ...args,
        name,
        mealType: slot === "proteinShake" ? "snack" : slot,
        calories: macros.calories ?? 0,
        protein: macros.protein ?? 0,
        carbs: macros.carbs ?? 0,
        fat: macros.fat ?? 0,
        confidence: macros.calories ? "high" : "medium",
        assumptions: macros.calories
          ? [`Used saved macros for usual ${slot}`]
          : [`Used profile name; macros not saved`],
        source: "jarvis-confirmed",
      },
      ctx,
    );
  },
  getSupplementStatus: (_a, { state }) => {
    const today = state.supplementLogs.filter((s) => s.createdAt >= todayStart()),
      routine = state.userGoalsProfile.supplementRoutine ?? [],
      taken = today.map((s) => s.name.toLowerCase());
    return {
      ok: true,
      summary: `${today.length} taken today`,
      data: {
        takenToday: today,
        routine,
        missing: routine.filter((r) => !taken.some((t) => t.includes(r.toLowerCase()))),
      },
    };
  },
  getMissedHabits: (_a, { state }) => {
    const missed: { habit: string; reason: string }[] = [],
      totals = todaysMealsTotal(state),
      target = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories,
      ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein;
    if (totals.protein < ptarget * 0.7 && Date.now() - todayStart() > 12 * 3600000)
      missed.push({ habit: "protein", reason: `${totals.protein}g / ${ptarget}g target` });
    if (totals.calories < target * 0.5 && Date.now() - todayStart() > 14 * 3600000)
      missed.push({ habit: "calories", reason: `${totals.calories} / ${target} kcal` });
    if (
      !state.bodyweightEntries.some((b) => b.createdAt >= todayStart()) &&
      state.userGoalsProfile.normalWeighInTime
    )
      missed.push({ habit: "weigh-in", reason: "not logged today" });
    if (!state.recoveryCheckIns.some((c) => c.createdAt >= todayStart()))
      missed.push({ habit: "check-in", reason: "no daily check-in yet" });
    return { ok: true, summary: `${missed.length} missed habits`, data: missed };
  },
  getDailyReviewSummary: (_a, { state }) => {
    const totals = todaysMealsTotal(state),
      target = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories,
      ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein,
      meals = state.mealEntries.filter((m) => m.createdAt >= todayStart()),
      supps = state.supplementLogs.filter((s) => s.createdAt >= todayStart()),
      ci = state.recoveryCheckIns.filter((c) => c.createdAt >= todayStart()).at(-1),
      bw = state.bodyweightEntries.filter((b) => b.createdAt >= todayStart()).at(-1),
      workout = state.workouts.find((w) => w.startedAt >= todayStart());
    return {
      ok: true,
      summary: "daily review",
      data: {
        calories: {
          logged: totals.calories,
          target,
          remaining: Math.max(0, target - totals.calories),
        },
        protein: {
          logged: totals.protein,
          target: ptarget,
          remaining: Math.max(0, ptarget - totals.protein),
        },
        macros: totals,
        mealsLogged: meals.length,
        lowConfidenceMeals: meals.filter((m) => m.confidence === "low").length,
        supplementsToday: supps.map((s) => s.name),
        bodyweight: bw?.weightLb ?? null,
        checkIn: ci ?? null,
        workoutToday: workout?.name ?? null,
      },
    };
  },
  updateDailyCheckIn: (args, { set, state }) => {
    const last = [...state.recoveryCheckIns].reverse().find((c) => c.createdAt >= todayStart());
    if (!last)
      return { ok: false, summary: "no check-in today", error: "Run logDailyCheckIn first." };
    const patch = (args.patch ?? {}) as Partial<RecoveryCheckIn>,
      auditId = uid();
    set((s) => ({
      ...s,
      recoveryCheckIns: s.recoveryCheckIns.map((c) => (c.id === last.id ? { ...c, ...patch } : c)),
    }));
    pushAudit(set, {
      id: auditId,
      tool: "updateDailyCheckIn",
      summary: "Updated today's check-in",
      status: "logged",
      entityIds: [last.id],
      entityKind: "checkinEdit",
      patch: { prev: last, next: patch },
      createdAt: Date.now(),
    });
    return { ok: true, summary: "Check-in updated", auditId };
  },
  suggestNutritionAction: (_a, { state, settings }) => {
    if (!settings.nutritionSuggestions)
      return { ok: true, summary: "nutrition suggestions off", data: { suggestion: null } };
    const totals = todaysMealsTotal(state),
      ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein,
      ctarget = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories,
      proteinGap = ptarget - totals.protein,
      calorieGap = ctarget - totals.calories;
    const suggestion =
      proteinGap > 30
        ? `You're ${proteinGap}g short on protein.`
        : calorieGap > 500
          ? `Still ${calorieGap} kcal under target.`
          : "Macros look on track.";
    return { ok: true, summary: suggestion, data: { suggestion, proteinGap, calorieGap } };
  },
  createWorkoutDraft: (args) => {
    const draft = workoutPayload(args);
    if (!draft.exercises.length)
      return { ok: false, summary: "no exercises found", error: "Add at least one exercise." };
    return {
      ok: true,
      summary: `Review ${draft.name}: ${draft.exercises.length} exercises`,
      needsConfirmation: true,
      data: {
        ...draft,
        durationMin: Math.round((draft.endedAt - draft.startedAt) / 60000),
        exercises: draft.exercises.map((e) => ({
          ...e,
          name: exerciseById(e.exerciseId)?.name ?? e.exerciseId,
        })),
      },
    };
  },
  logWorkout: (args, { set, state }) => {
    const dupeAudit = hasAuditKey(state, "logWorkout", args);
    if (dupeAudit) return duplicateResult(dupeAudit);
    const draft = workoutPayload(args);
    if (!draft.exercises.length)
      return { ok: false, summary: "no exercises found", error: "Add at least one exercise." };
    const existing = maybeDuplicateWorkout(state, draft);
    if (existing)
      return {
        ok: true,
        summary: `A similar ${draft.name} is already logged today.`,
        data: { duplicate: true, existing: [existing.id] },
      };
    const auditId = uid(),
      workout: Workout = {
        id: draft.id,
        name: draft.name,
        startedAt: draft.startedAt,
        endedAt: draft.endedAt,
        exercises: draft.exercises,
        notes: draft.notes,
      };
    set((s) => ({ ...s, workouts: [...s.workouts, workout] }));
    pushAudit(set, {
      id: auditId,
      tool: "logWorkout",
      summary: `Logged ${workout.name}`,
      status: "logged",
      originalText: draft.originalText,
      confidence: draft.confidence,
      entityIds: [workout.id],
      entityKind: "workout",
      patch: { prev: null, workout, actionKey: actionKey("logWorkout", args) },
      createdAt: Date.now(),
    });
    return {
      ok: true,
      summary: `Logged ${workout.name}`,
      auditId,
      data: {
        ...draft,
        id: workout.id,
        durationMin: Math.round((draft.endedAt - draft.startedAt) / 60000),
        exercises: draft.exercises.map((e) => ({
          ...e,
          name: exerciseById(e.exerciseId)?.name ?? e.exerciseId,
        })),
      },
    };
  },
  updateWorkout: (args, { set, state }) => {
    const id = String(args.id ?? ""),
      workout = state.workouts.find((w) => w.id === id);
    if (!workout) return { ok: false, summary: "workout not found" };
    const patch = (args.patch ?? {}) as Partial<Workout>,
      auditId = uid();
    set((s) => ({ ...s, workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
    pushAudit(set, {
      id: auditId,
      tool: "updateWorkout",
      summary: `Updated ${workout.name}`,
      status: "logged",
      entityIds: [id],
      entityKind: "workoutEdit",
      patch: { prev: workout, next: patch },
      createdAt: Date.now(),
    });
    return { ok: true, summary: `Updated ${workout.name}`, auditId };
  },
  deleteWorkout: (args, { set, state }) => {
    const id = String(args.id ?? ""),
      workout = state.workouts.find((w) => w.id === id);
    if (!workout) return { ok: false, summary: "workout not found" };
    const auditId = uid();
    set((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
    pushAudit(set, {
      id: auditId,
      tool: "deleteWorkout",
      summary: `Deleted ${workout.name}`,
      status: "logged",
      entityIds: [id],
      entityKind: "workoutDelete",
      patch: { prev: workout },
      createdAt: Date.now(),
    });
    return { ok: true, summary: `Deleted ${workout.name}`, auditId };
  },
  getWorkoutHistory: (args, { state }) => {
    const cutoff = Date.now() - Math.min(90, Math.max(1, Number(args.days) || 30)) * 86400000;
    const workouts = state.workouts.filter((w) => w.startedAt >= cutoff);
    return { ok: true, summary: `${workouts.length} workouts`, data: workouts };
  },
  getLastWorkoutByType: (args, { state }) => {
    const q = normalizeText(args.workoutType);
    const w = [...state.workouts].reverse().find((w) => normalizeText(w.name).includes(q));
    return {
      ok: true,
      summary: w ? `Last ${q}: ${w.name}` : `No ${q} workout found`,
      data: w ?? null,
    };
  },
  getLastExercisePerformance: (args, { state }) => {
    const id = findExerciseId(args.exerciseId ?? args.exerciseName);
    const rows = [...state.workouts]
      .reverse()
      .flatMap((w) =>
        w.exercises
          .filter((e) => e.exerciseId === id)
          .map((e) => ({
            workout: w.name,
            when: w.startedAt,
            sets: e.sets.filter((s) => s.completed),
          })),
      )
      .filter((r) => r.sets.length);
    return {
      ok: true,
      summary: rows[0]
        ? `Last ${exerciseById(id)?.name ?? id}: ${rows[0].sets.map((s) => `${s.weight ?? ""}x${s.reps ?? "?"}`).join(", ")}`
        : "No previous sets found",
      data: rows[0] ?? null,
    };
  },
  getActiveWorkout: (_a, { state }) => ({
    ok: true,
    summary: state.activeWorkout ? `Active: ${state.activeWorkout.name}` : "No active workout",
    data: state.activeWorkout,
  }),
  logExerciseSet: (args, { set, state }) => {
    const active = state.activeWorkout;
    if (!active) return { ok: false, summary: "no active workout" };
    const exerciseId = findExerciseId(args.exerciseId ?? args.exerciseName),
      setId = uid(),
      newSet = normalizeSet({ ...args, id: setId });
    const nextExercise = (e: WorkoutExercise) => ({
      ...e,
      sets: [...e.sets, newSet],
      completed: false,
    });
    const exists = active.exercises.some((e) => e.exerciseId === exerciseId);
    set((s) => ({
      ...s,
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: exists
              ? s.activeWorkout.exercises.map((e) =>
                  e.exerciseId === exerciseId ? nextExercise(e) : e,
                )
              : [
                  ...s.activeWorkout.exercises,
                  { id: uid(), exerciseId, sets: [newSet], completed: false },
                ],
          }
        : s.activeWorkout,
    }));
    const auditId = uid();
    pushAudit(set, {
      id: auditId,
      tool: "logExerciseSet",
      summary: `Logged set for ${exerciseById(exerciseId)?.name ?? exerciseId}`,
      status: "logged",
      entityIds: [setId],
      entityKind: "activeSet",
      patch: { workoutId: active.id, exerciseId },
      createdAt: Date.now(),
    });
    return { ok: true, summary: "Set logged", auditId };
  },
  updateExerciseSet: (args, { set, state }) => {
    const setId = String(args.setId ?? ""),
      patch = (args.patch ?? {}) as Partial<SetEntry>,
      prev = state.activeWorkout?.exercises.flatMap((e) => e.sets).find((s) => s.id === setId);
    if (!prev) return { ok: false, summary: "set not found" };
    set((s) => ({
      ...s,
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) => ({
              ...e,
              sets: e.sets.map((st) => (st.id === setId ? { ...st, ...patch } : st)),
            })),
          }
        : null,
    }));
    const auditId = uid();
    pushAudit(set, {
      id: auditId,
      tool: "updateExerciseSet",
      summary: "Updated active set",
      status: "logged",
      entityIds: [setId],
      entityKind: "activeSetEdit",
      patch: { prev, next: patch },
      createdAt: Date.now(),
    });
    return { ok: true, summary: "Set updated", auditId };
  },
  deleteExerciseSet: (args, { set, state }) => {
    const setId = String(args.setId ?? ""),
      active = state.activeWorkout;
    if (!active) return { ok: false, summary: "no active workout" };
    const ex = active.exercises.find((e) => e.sets.some((s) => s.id === setId));
    const prev = ex?.sets.find((s) => s.id === setId);
    if (!ex || !prev) return { ok: false, summary: "set not found" };
    set((s) => ({
      ...s,
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) => ({
              ...e,
              sets: e.sets.filter((st) => st.id !== setId),
            })),
          }
        : null,
    }));
    const auditId = uid();
    pushAudit(set, {
      id: auditId,
      tool: "deleteExerciseSet",
      summary: "Deleted active set",
      status: "logged",
      entityIds: [setId],
      entityKind: "activeSetDelete",
      patch: { prev, exerciseId: ex.exerciseId },
      createdAt: Date.now(),
    });
    return { ok: true, summary: "Set deleted", auditId };
  },
  logCardio: (args, { set, state }) => {
    const dupeAudit = hasAuditKey(state, "logCardio", args);
    if (dupeAudit) return duplicateResult(dupeAudit);
    const type = String(args.type ?? "Cardio").trim(),
      minutes = Math.round(Number(args.minutes) || 0),
      distanceMi = args.distanceMi == null ? undefined : Number(args.distanceMi),
      calories = args.calories == null ? undefined : Math.round(Number(args.calories) || 0);
    if (!minutes && !distanceMi)
      return { ok: false, summary: "missing cardio amount", error: "Add duration or distance." };
    const existing = state.cardioEntries.find(
      (c) =>
        sameDay(c.createdAt) &&
        normalizeText(c.type) === normalizeText(type) &&
        Math.abs((c.minutes || 0) - minutes) < 1,
    );
    if (existing)
      return {
        ok: true,
        summary: "That's already logged.",
        data: { duplicate: true, existing: [existing.id] },
      };
    const id = uid(),
      auditId = uid(),
      entry: CardioEntry = {
        id,
        type,
        minutes,
        distanceMi,
        calories,
        heartRate: args.heartRate == null ? undefined : Number(args.heartRate),
        speed: args.speed == null ? undefined : Number(args.speed),
        incline: args.incline == null ? undefined : Number(args.incline),
        notes: textArg(args, "notes"),
        createdAt: Date.now(),
      };
    set((s) => ({ ...s, cardioEntries: [...s.cardioEntries, entry] }));
    const summary = cardioSummary(entry);
    pushAudit(set, {
      id: auditId,
      tool: "logCardio",
      summary,
      status: "logged",
      originalText: textArg(args, "originalText"),
      confidence: asConfidence(args.confidence),
      entityIds: [id],
      entityKind: "cardio",
      patch: { entry, actionKey: actionKey("logCardio", args) },
      createdAt: Date.now(),
    });
    return {
      ok: true,
      summary,
      auditId,
      data: { ...entry, confidence: asConfidence(args.confidence) },
    };
  },
  updateActiveWorkout: (args, { set, state }) => {
    if (!state.activeWorkout) return { ok: false, summary: "no active workout" };
    const patch = (args.patch ?? {}) as Partial<Workout>,
      auditId = uid(),
      prev = state.activeWorkout;
    set((s) => ({
      ...s,
      activeWorkout: s.activeWorkout ? { ...s.activeWorkout, ...patch } : null,
    }));
    pushAudit(set, {
      id: auditId,
      tool: "updateActiveWorkout",
      summary: "Updated active workout",
      status: "logged",
      originalText: textArg(args, "originalText"),
      entityIds: [prev.id],
      entityKind: "activeWorkoutEdit",
      patch: { prev, next: patch },
      createdAt: Date.now(),
    });
    return { ok: true, summary: "Active workout updated", auditId };
  },
  suggestActiveWorkoutChange: (args, { state }) => {
    const active = state.activeWorkout;
    const request = normalizeText(args.request ?? args.reason);
    const suggestion = !active
      ? "Start a workout first."
      : request.includes("shoulder")
        ? "Swap incline pressing for cable fly or machine press for 3 sets of 12, and keep pain-free range."
        : request.includes("20")
          ? "Shorten to one top set per remaining exercise and skip low-priority accessories."
          : "Use previous performance and current fatigue: keep the next set 1-2 reps from failure.";
    return { ok: true, summary: suggestion, data: { suggestion, activeWorkout: active } };
  },
  finishActiveWorkout: (args, { set, state }) => {
    if (!state.activeWorkout) return { ok: false, summary: "no active workout" };
    const w: Workout = {
      ...state.activeWorkout,
      endedAt: Number(args.endedAt) || Date.now(),
      notes: textArg(args, "notes") ?? state.activeWorkout.notes,
    };
    const auditId = uid();
    set((s) => ({ ...s, activeWorkout: null, workouts: [...s.workouts, w] }));
    pushAudit(set, {
      id: auditId,
      tool: "finishActiveWorkout",
      summary: `Finished ${w.name}`,
      status: "logged",
      entityIds: [w.id],
      entityKind: "workout",
      patch: { workout: w, actionKey: actionKey("finishActiveWorkout", args) },
      createdAt: Date.now(),
    });
    if (/(pain|sore|tired|fatigue|tight|sick|poor sleep|low motivation)/i.test(w.notes ?? ""))
      pushRecoveryActivity(set, `Recovery note from workout: ${w.notes}`, w.notes);
    return { ok: true, summary: `Finished ${w.name}`, auditId, data: w };
  },
  saveWorkoutTemplate: (args, { set, state }) => {
    const name = String(args.name ?? "").trim();
    if (!name) return { ok: false, summary: "template name required" };
    const source =
      state.workouts.find((w) => w.id === args.workoutId) ??
      state.activeWorkout ??
      state.workouts.at(-1);
    if (!source) return { ok: false, summary: "no workout to template" };
    const templateId = `jarvis-${uid()}`,
      auditId = uid();
    set((s) => ({
      ...s,
      workoutTemplates: [...s.workoutTemplates, { id: uid(), name, templateId }],
    }));
    pushAudit(set, {
      id: auditId,
      tool: "saveWorkoutTemplate",
      summary: `Saved template ${name}`,
      status: "logged",
      entityKind: "workoutTemplate",
      patch: { templateId, source },
      createdAt: Date.now(),
    });
    return { ok: true, summary: `Saved template ${name}`, auditId };
  },
  getWorkoutTemplates: (_a, { state }) => ({
    ok: true,
    summary: `${WORKOUT_TEMPLATES.length + state.workoutTemplates.length} templates`,
    data: { builtIn: WORKOUT_TEMPLATES, saved: state.workoutTemplates },
  }),
  suggestWorkoutProgression: (args, { state }) => {
    const id = findExerciseId(args.exerciseId ?? args.exerciseName);
    const hist = [...state.workouts]
      .reverse()
      .flatMap((w) =>
        w.exercises
          .filter((e) => e.exerciseId === id)
          .flatMap((e) => e.sets.filter((s) => s.completed && s.weight && s.reps)),
      );
    const last = hist[0];
    const suggestion = !last
      ? "Start with a comfortable working weight."
      : last.reps && last.reps >= 8
        ? `Try ${Math.round(((last.weight ?? 0) + 5) / 5) * 5} lb for 6-8 reps next time.`
        : `Repeat ${last.weight ?? "the same weight"} and build reps before adding load.`;
    return { ok: true, summary: suggestion, data: { exerciseId: id, last, suggestion } };
  },
  suggestExerciseSubstitution: (args) => {
    const id = findExerciseId(args.exerciseId ?? args.exerciseName);
    const ex = exerciseById(id);
    const alt =
      args.reason && normalizeText(args.reason).includes("shoulder")
        ? EXERCISES.find((e) => e.id === "cable-fly")
        : EXERCISES.find((e) => e.primary.some((m) => ex?.primary.includes(m)) && e.id !== id);
    return {
      ok: true,
      summary: alt
        ? `Swap ${ex?.name ?? id} for ${alt.name}.`
        : "Use a pain-free machine or cable alternative.",
      data: { from: ex, to: alt },
    };
  },
  logWorkoutNote: (args, { set, state }) => {
    const notes = String(args.notes ?? "").trim();
    if (!notes) return { ok: false, summary: "notes required" };
    const workoutId = String(args.workoutId ?? state.activeWorkout?.id ?? ""),
      auditId = uid();
    if (state.activeWorkout?.id === workoutId)
      set((s) => ({
        ...s,
        activeWorkout: s.activeWorkout
          ? { ...s.activeWorkout, notes: [s.activeWorkout.notes, notes].filter(Boolean).join("\n") }
          : null,
      }));
    else
      set((s) => ({
        ...s,
        workouts: s.workouts.map((w) =>
          w.id === workoutId ? { ...w, notes: [w.notes, notes].filter(Boolean).join("\n") } : w,
        ),
      }));
    pushAudit(set, {
      id: auditId,
      tool: "logWorkoutNote",
      summary: "Added workout note",
      status: "logged",
      entityIds: [workoutId],
      entityKind: "workoutNote",
      patch: { notes },
      createdAt: Date.now(),
    });
    return { ok: true, summary: "Workout note saved", auditId };
  },
  logWorkoutPainOrSoreness: (args, { set, state }) => {
    const notes = String(args.notes ?? "").trim(),
      area = textArg(args, "area"),
      severity = clamp10(args.severity) ?? 5,
      auditId = uid();
    set((s) => ({
      ...s,
      recoveryCheckIns: [
        ...s.recoveryCheckIns,
        {
          id: uid(),
          energy: 5,
          soreness: severity,
          stress: 5,
          motivation: 5,
          notes: [area, notes].filter(Boolean).join(": "),
          createdAt: Date.now(),
        },
      ],
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            notes: [s.activeWorkout.notes, [area, notes].filter(Boolean).join(": ")]
              .filter(Boolean)
              .join("\n"),
          }
        : s.activeWorkout,
    }));
    pushAudit(set, {
      id: auditId,
      tool: "logWorkoutPainOrSoreness",
      summary: `Logged recovery note${area ? ` for ${area}` : ""}`,
      status: "logged",
      entityKind: "checkin",
      patch: { area, notes, severity },
      createdAt: Date.now(),
    });
    return { ok: true, summary: "Pain/soreness note saved", auditId };
  },
  getTrainingReadinessContext: (_a, { state }) => ({
    ok: true,
    summary: "training readiness context",
    data: {
      profile: state.profile,
      latestCheckIn: state.recoveryCheckIns.at(-1),
      sleep: state.sleepEntries.at(-1),
      fatigue: state.muscleFatigue,
      recentWorkouts: state.workouts.slice(-5),
      goals: state.goals,
    },
  }),
};

function slotField(slot: string): keyof UserGoalsProfile | null {
  return (
    (
      {
        breakfast: "usualBreakfast",
        lunch: "usualLunch",
        dinner: "usualDinner",
        snack: "usualSnack",
        proteinShake: "usualProteinShake",
        preWorkout: "usualPreWorkoutMeal",
        postWorkout: "usualPostWorkoutMeal",
      } as Record<string, keyof UserGoalsProfile>
    )[slot] ?? null
  );
}

function clamp10(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.min(10, Math.round(n))) : null;
}

export function runTool(name: string, args: Record<string, unknown>, ctx: RunContext): ToolResult {
  const h = handlers[name as ToolName];
  if (!h) return { ok: false, summary: `unknown tool ${name}`, error: "Unknown tool" };
  if (!ctx.settings.enabled)
    return { ok: false, summary: "jarvis disabled", error: "Jarvis is disabled in Settings" };
  return h(args, ctx);
}

export function undoAuditEntry(auditId: string, state: AppState, set: Updater): ToolResult {
  const entry = state.jarvisAudit.find((a) => a.id === auditId);
  if (!entry || entry.undone) return { ok: false, summary: "nothing to undo" };
  switch (entry.entityKind) {
    case "bodyweight":
      set((s) => ({
        ...s,
        bodyweightEntries: s.bodyweightEntries.filter(
          (e) => !(entry.entityIds ?? []).includes(e.id),
        ),
      }));
      break;
    case "supplement":
      set((s) => ({
        ...s,
        supplementLogs: s.supplementLogs.filter((e) => !(entry.entityIds ?? []).includes(e.id)),
      }));
      break;
    case "checkin":
      set((s) => ({
        ...s,
        recoveryCheckIns: s.recoveryCheckIns.filter((e) => !(entry.entityIds ?? []).includes(e.id)),
      }));
      break;
    case "meal":
      set((s) => ({
        ...s,
        mealEntries: s.mealEntries.filter((e) => !(entry.entityIds ?? []).includes(e.id)),
      }));
      break;
    case "cardio":
      set((s) => ({
        ...s,
        cardioEntries: s.cardioEntries.filter((e) => !(entry.entityIds ?? []).includes(e.id)),
      }));
      break;
    case "workout":
      set((s) => ({
        ...s,
        workouts: s.workouts.filter((e) => !(entry.entityIds ?? []).includes(e.id)),
        activeWorkout:
          s.activeWorkout && (entry.entityIds ?? []).includes(s.activeWorkout.id)
            ? null
            : s.activeWorkout,
      }));
      break;
    case "activeSet":
      set((s) => ({
        ...s,
        activeWorkout: s.activeWorkout
          ? {
              ...s.activeWorkout,
              exercises: s.activeWorkout.exercises.map((e) => ({
                ...e,
                sets: e.sets.filter((st) => !(entry.entityIds ?? []).includes(st.id)),
              })),
            }
          : null,
      }));
      break;
    case "mealEdit": {
      const prev = (entry.patch as { prev?: MealEntry } | undefined)?.prev;
      if (prev)
        set((s) => ({
          ...s,
          mealEntries: s.mealEntries.map((m) => (m.id === prev.id ? prev : m)),
        }));
      break;
    }
    case "mealDelete": {
      const prev = (entry.patch as { prev?: MealEntry } | undefined)?.prev;
      if (prev) set((s) => ({ ...s, mealEntries: [...s.mealEntries, prev] }));
      break;
    }
    case "workoutEdit":
    case "activeWorkoutEdit": {
      const prev = (entry.patch as { prev?: Workout } | undefined)?.prev;
      if (prev)
        set((s) =>
          entry.entityKind === "activeWorkoutEdit"
            ? { ...s, activeWorkout: prev }
            : { ...s, workouts: s.workouts.map((w) => (w.id === prev.id ? prev : w)) },
        );
      break;
    }
    case "workoutDelete": {
      const prev = (entry.patch as { prev?: Workout } | undefined)?.prev;
      if (prev) set((s) => ({ ...s, workouts: [...s.workouts, prev] }));
      break;
    }
    case "activeSetEdit": {
      const prev = (entry.patch as { prev?: SetEntry } | undefined)?.prev;
      if (prev)
        set((s) => ({
          ...s,
          activeWorkout: s.activeWorkout
            ? {
                ...s.activeWorkout,
                exercises: s.activeWorkout.exercises.map((e) => ({
                  ...e,
                  sets: e.sets.map((st) => (st.id === prev.id ? prev : st)),
                })),
              }
            : null,
        }));
      break;
    }
    case "activeSetDelete": {
      const p = entry.patch as { prev?: SetEntry; exerciseId?: string } | undefined;
      if (p?.prev && p.exerciseId)
        set((s) => ({
          ...s,
          activeWorkout: s.activeWorkout
            ? {
                ...s.activeWorkout,
                exercises: s.activeWorkout.exercises.map((e) =>
                  e.exerciseId === p.exerciseId ? { ...e, sets: [...e.sets, p.prev!] } : e,
                ),
              }
            : null,
        }));
      break;
    }
    case "checkinEdit": {
      const prev = (entry.patch as { prev?: RecoveryCheckIn } | undefined)?.prev;
      if (prev)
        set((s) => ({
          ...s,
          recoveryCheckIns: s.recoveryCheckIns.map((c) => (c.id === prev.id ? prev : c)),
        }));
      break;
    }
    case "usualMeal": {
      const patch = entry.patch as
          | { slot?: string; prev?: { name?: string; macros?: unknown } }
          | undefined,
        slot = patch?.slot,
        field = slot ? slotField(slot) : null;
      if (slot && field)
        set((s) => ({
          ...s,
          userGoalsProfile: { ...s.userGoalsProfile, [field]: patch?.prev?.name },
          jarvisLearning: { ...s.jarvisLearning, [`usualMeal_${slot}`]: patch?.prev?.macros },
        }));
      break;
    }
    case "profile": {
      const prev = (entry.patch as { prev?: Record<string, unknown> } | undefined)?.prev;
      if (prev) set((s) => ({ ...s, userGoalsProfile: prev as UserGoalsProfile }));
      break;
    }
    case "jarvisSettings": {
      const prev = (entry.patch as { prev?: JarvisSettings } | undefined)?.prev;
      if (prev) set((s) => ({ ...s, jarvisSettings: prev }));
      break;
    }
  }
  set((s) => ({
    ...s,
    jarvisAudit: [
      {
        id: uid(),
        tool: "undoLastAction",
        summary: `Undid: ${entry.summary}`,
        status: "undone" as const,
        entityIds: entry.entityIds,
        entityKind: entry.entityKind,
        createdAt: Date.now(),
      },
      ...s.jarvisAudit.map((a) =>
        a.id === auditId ? { ...a, undone: true, status: "undone" as const } : a,
      ),
    ].slice(0, 200),
  }));
  return { ok: true, summary: `Undid: ${entry.summary}` };
}
