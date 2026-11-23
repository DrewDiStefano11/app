import { todayMealEntries } from "../analytics/observed-fitness";
import { calculateMealTotals } from "../analytics/domain-metrics";
import { resolveLibraryPortions } from "./food-reference";
import { isUsualMealSlot, mealMacroFields, readMealMacros, readUsualMeal, USUAL_MEAL_SLOTS, usualMealSlots, writeUsualMeal, type UsualMealPreference } from "./usual-meals";
import { correctMealPortion } from "./meal-portion";
import { latestRecoveryCheckInToday } from "./recovery-text";
import type { AppState, UserGoalsProfile, JarvisSettings, JarvisAuditEntry, Confidence, MealEntry, MealItem, SupplementLog, RecoveryCheckIn, Workout, WorkoutExercise, SetEntry } from "../types";
import { createAiEstimateProvenance, createJarvisProvenance, markProvenanceEdited } from "../fitcore-data";
import { uid, todayStart, e1RM } from "../store";
import { EXERCISES, WORKOUT_TEMPLATES, exerciseById } from "../data";
import { buildDailyDecision } from "../daily-decision";
import { calculatePersonalScores, scoreStatusLabel } from "../analytics/personal-scores";
import { workoutPersonalRecords } from "../analytics/training-detail-metrics";
import { commitJarvisAction, type CommitJarvisState } from "./action-transaction";
import { canProposeJarvisMutation, validateJarvisMutation } from "./action-schemas";
import { mealItemTotals, type JarvisMealItem } from "./meal-math";
import { sameWorkoutSet } from "./active-exercise";
import { actionKey, duplicateResult, hasAuditKey, normalizeText, pushAudit, type Updater } from "./action-audit";
import { recordActions } from "./record-actions";
import { normalizeSet, textArg, trainingActions } from "./training-actions";

export interface ToolResult {
  ok: boolean;
  summary: string;
  needsConfirmation?: boolean;
  auditId?: string;
  data?: unknown;
  error?: string;
}

export type ToolName =
  | "getTodaySummary" | "getNutritionStatus" | "getTrainingStatus"
  | "getRecoveryStatus" | "getProgressTrends"
  | "getUserGoalsProfile" | "updateUserGoalsProfile"
  | "getJarvisSettings" | "updateJarvisSettings"
  | "logBodyWeight" | "updateBodyWeight" | "logSleep" | "logSupplement" | "logDailyCheckIn"
  | "undoLastAction" | "saveJarvisLearning" | "getJarvisLearnedPreferences"
  | "logMeal" | "logReferenceMeal" | "logCaloriesOnly" | "updateMeal" | "correctMealPortion" | "deleteMeal" | "getMealHistory"
  | "getUsualMeals" | "saveUsualMeal" | "deleteUsualMeal" | "logUsualMeal"
  | "getSupplementStatus" | "getMissedHabits"
  | "getDailyReviewSummary" | "updateDailyCheckIn" | "suggestNutritionAction"
  | "createWorkoutDraft" | "logWorkout" | "updateWorkout" | "deleteWorkout"
  | "getWorkoutHistory" | "getLastWorkoutByType" | "getLastExercisePerformance"
  | "logExerciseSet" | "addPlannedExerciseSet" | "updateExerciseSet" | "deleteExerciseSet" | "logCardio"
  | "updateActiveWorkout" | "suggestActiveWorkoutChange" | "getActiveWorkout"
  | "finishActiveWorkout" | "startScheduledWorkout" | "startRestTimer" | "saveWorkoutTemplate" | "getWorkoutTemplates"
  | "suggestWorkoutProgression" | "suggestExerciseSubstitution" | "logWorkoutNote"
  | "logWorkoutPainOrSoreness" | "getTrainingReadinessContext" | "getDailyDecision";

export interface ToolSpec { name: ToolName; description: string; parameters: Record<string, unknown>; }

const emptyParams = { type: "object", properties: {} };
const workoutExerciseSchema = { type: "array", items: { type: "object", properties: {
  exerciseId: { type: "string" }, name: { type: "string" }, sets: { type: "array", items: { type: "object" } }, notes: { type: "string" },
} } };

export const TOOL_SPECS: ToolSpec[] = [
  { name: "getTodaySummary", description: "Get today's calories, protein, last workout, and last check-in.", parameters: emptyParams },
  { name: "getNutritionStatus", description: "Current calories/macros vs goals for today.", parameters: emptyParams },
  { name: "getTrainingStatus", description: "Recent workouts and current training week summary.", parameters: emptyParams },
  { name: "getRecoveryStatus", description: "Latest soreness / sleep / recovery check-in.", parameters: emptyParams },
  { name: "getProgressTrends", description: "Bodyweight and workout trends over recent weeks.", parameters: emptyParams },
  { name: "getUserGoalsProfile", description: "Read the user's goals and profile.", parameters: emptyParams },
  { name: "updateUserGoalsProfile", description: "Update one or more goal/profile fields. Requires confirmation.", parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] } },
  { name: "getJarvisSettings", description: "Read current Jarvis settings.", parameters: emptyParams },
  { name: "updateJarvisSettings", description: "Update Jarvis settings. Requires confirmation.", parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] } },
  { name: "logBodyWeight", description: "Log a bodyweight measurement in pounds.", parameters: { type: "object", properties: { weightLb: { type: "number" }, notes: { type: "string" }, originalText: { type: "string" }, draftId: { type: "string" } }, required: ["weightLb"] } },
  { name: "logSupplement", description: "Log a supplement intake.", parameters: { type: "object", properties: { name: { type: "string" }, dose: { type: "string" }, notes: { type: "string" }, originalText: { type: "string" }, draftId: { type: "string" } }, required: ["name"] } },
  { name: "logDailyCheckIn", description: "Log a daily recovery check-in (1-10 scales).", parameters: { type: "object", properties: { energy: { type: "number" }, soreness: { type: "number" }, stress: { type: "number" }, motivation: { type: "number" }, notes: { type: "string" }, originalText: { type: "string" }, draftId: { type: "string" } }, required: ["energy", "soreness", "stress", "motivation"] } },
  { name: "undoLastAction", description: "Undo the most recent Jarvis action.", parameters: emptyParams },
  { name: "saveJarvisLearning", description: "Save a learned preference.", parameters: { type: "object", properties: { key: { type: "string" }, value: {} }, required: ["key", "value"] } },
  { name: "getJarvisLearnedPreferences", description: "Get all learned preferences.", parameters: emptyParams },
  { name: "logMeal", description: "Log a meal with totals and optional item estimates.", parameters: { type: "object", properties: { name: { type: "string" }, mealType: { type: "string" }, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" }, fiber: { type: "number" }, items: { type: "array", items: { type: "object" } }, confidence: { type: "string", enum: ["high", "medium", "low"] }, assumptions: { type: "array", items: { type: "string" } }, originalText: { type: "string" }, source: { type: "string" }, draftId: { type: "string" } }, required: ["name", "mealType", "calories", "protein", "carbs", "fat"] } },
  { name: "updateMeal", description: "Update one of the user's recent meals by id.", parameters: { type: "object", properties: { id: { type: "string" }, patch: { type: "object" } }, required: ["id", "patch"] } },
  { name: "deleteMeal", description: "Delete a meal by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "getMealHistory", description: "Recent meals.", parameters: { type: "object", properties: { days: { type: "number" } } } },
  { name: "getUsualMeals", description: "Get saved usual meals.", parameters: emptyParams },
  { name: "saveUsualMeal", description: "Save or update a usual meal slot with macros.", parameters: { type: "object", properties: { slot: { type: "string" }, name: { type: "string" }, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" } }, required: ["slot", "name"] } },
  { name: "logUsualMeal", description: "Log one saved usual meal.", parameters: { type: "object", properties: { slot: { type: "string" }, draftId: { type: "string" } }, required: ["slot"] } },
  { name: "getSupplementStatus", description: "Supplements taken today vs routine.", parameters: emptyParams },
  { name: "getMissedHabits", description: "Habits missed today.", parameters: emptyParams },
  { name: "getDailyReviewSummary", description: "Full daily review.", parameters: emptyParams },
  { name: "updateDailyCheckIn", description: "Patch today's most recent check-in.", parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] } },
  { name: "suggestNutritionAction", description: "Get one concrete nutrition suggestion.", parameters: emptyParams },
  { name: "createWorkoutDraft", description: "Create a structured workout draft/review card from natural language. Does not save until confirmed.", parameters: { type: "object", properties: { name: { type: "string" }, workoutType: { type: "string" }, exercises: workoutExerciseSchema, startedAt: { type: "number" }, endedAt: { type: "number" }, durationMin: { type: "number" }, notes: { type: "string" }, confidence: { type: "string" }, originalText: { type: "string" } }, required: ["exercises"] } },
  { name: "logWorkout", description: "Log a complete strength workout from structured exercises/sets.", parameters: { type: "object", properties: { name: { type: "string" }, workoutType: { type: "string" }, exercises: workoutExerciseSchema, startedAt: { type: "number" }, endedAt: { type: "number" }, durationMin: { type: "number" }, notes: { type: "string" }, confidence: { type: "string" }, originalText: { type: "string" }, draftId: { type: "string" } }, required: ["exercises"] } },
  { name: "updateWorkout", description: "Patch a saved workout by id.", parameters: { type: "object", properties: { id: { type: "string" }, patch: { type: "object" } }, required: ["id", "patch"] } },
  { name: "deleteWorkout", description: "Delete a saved workout by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "getWorkoutHistory", description: "Recent workout history.", parameters: { type: "object", properties: { days: { type: "number" } } } },
  { name: "getLastWorkoutByType", description: "Get the latest workout by type/name.", parameters: { type: "object", properties: { workoutType: { type: "string" } }, required: ["workoutType"] } },
  { name: "getLastExercisePerformance", description: "Get previous set performance for an exercise.", parameters: { type: "object", properties: { exerciseId: { type: "string" }, exerciseName: { type: "string" } } } },
  { name: "logExerciseSet", description: "Add/log a set to the active workout.", parameters: { type: "object", properties: { exerciseId: { type: "string" }, exerciseName: { type: "string" }, weight: { type: "number" }, reps: { type: "number" }, rpe: { type: "number" }, modifier: { type: "string" }, notes: { type: "string" } } } },
  { name: "updateExerciseSet", description: "Patch an active workout set.", parameters: { type: "object", properties: { setId: { type: "string" }, patch: { type: "object" } }, required: ["setId", "patch"] } },
  { name: "deleteExerciseSet", description: "Delete an active workout set.", parameters: { type: "object", properties: { setId: { type: "string" } }, required: ["setId"] } },
  { name: "logCardio", description: "Log cardio: treadmill, walk, stairmaster, bike, run, etc.", parameters: { type: "object", properties: { type: { type: "string" }, minutes: { type: "number" }, distanceMi: { type: "number" }, calories: { type: "number" }, heartRate: { type: "number" }, speed: { type: "number" }, incline: { type: "number" }, notes: { type: "string" }, confidence: { type: "string" }, originalText: { type: "string" }, draftId: { type: "string" } }, required: ["type"] } },
  { name: "updateActiveWorkout", description: "Patch the active workout or change exercise targets. Ask before using unless allowed.", parameters: { type: "object", properties: { patch: { type: "object" }, originalText: { type: "string" } }, required: ["patch"] } },
  { name: "suggestActiveWorkoutChange", description: "Suggest a change to the active workout without applying it.", parameters: { type: "object", properties: { reason: { type: "string" }, request: { type: "string" } } } },
  { name: "getActiveWorkout", description: "Read the active workout.", parameters: emptyParams },
  { name: "finishActiveWorkout", description: "Finish and save the active workout with optional notes.", parameters: { type: "object", properties: { notes: { type: "string" }, endedAt: { type: "number" }, draftId: { type: "string" } } } },
  { name: "saveWorkoutTemplate", description: "Save a workout or active workout as a template.", parameters: { type: "object", properties: { name: { type: "string" }, workoutId: { type: "string" } }, required: ["name"] } },
  { name: "getWorkoutTemplates", description: "Get saved and built-in workout templates.", parameters: emptyParams },
  { name: "suggestWorkoutProgression", description: "Suggest progression for an exercise using history and recovery.", parameters: { type: "object", properties: { exerciseId: { type: "string" }, exerciseName: { type: "string" } } } },
  { name: "suggestExerciseSubstitution", description: "Suggest a safer exercise substitution.", parameters: { type: "object", properties: { exerciseId: { type: "string" }, exerciseName: { type: "string" }, reason: { type: "string" } } } },
  { name: "logWorkoutNote", description: "Add notes to active or saved workout.", parameters: { type: "object", properties: { workoutId: { type: "string" }, notes: { type: "string" } }, required: ["notes"] } },
  { name: "logWorkoutPainOrSoreness", description: "Log pain/soreness/fatigue note into workout and recovery context.", parameters: { type: "object", properties: { area: { type: "string" }, notes: { type: "string" }, severity: { type: "number" } }, required: ["notes"] } },
  { name: "getTrainingReadinessContext", description: "Read readiness, soreness, previous performance, and profile context for training choices.", parameters: emptyParams },
  { name: "getDailyDecision", description: "Get today's structured training, nutrition, recovery, what-changed, confidence, provenance, and single next-action decision.", parameters: emptyParams },
];

export interface RunContext {
  state: AppState;
  set: CommitJarvisState;
  settings: JarvisSettings;
  /** True only after the user accepted a confirmation card. */
  confirmed?: boolean;
  mealPortionEdited?: boolean;
  referenceMeal?: boolean;
  inputMethod?: "text" | "voice";
  now?: Date;
}
type StagedRunContext = Omit<RunContext, "set"> & { set: Updater };
export type ToolHandler = (args: Record<string, unknown>, ctx: StagedRunContext) => ToolResult;

const readOnlySuggestions = new Set(["suggestNutritionAction", "suggestActiveWorkoutChange", "suggestWorkoutProgression", "suggestExerciseSubstitution"]);

export function isReadOnlyJarvisTool(name: string) {
  return name.startsWith("get") || readOnlySuggestions.has(name);
}

function sameDay(a: number, b = Date.now()) { return a >= dayStart(b) && a < dayStart(b) + 86400000; }
function dayStart(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function asConfidence(v: unknown, fallback: Confidence = "medium"): Confidence { return v === "high" || v === "medium" || v === "low" ? v : fallback; }
function loggedMealExists(state: AppState, audit: JarvisAuditEntry) {
  return state.mealEntries.some(meal => audit.entityIds?.includes(meal.id));
}
function todaysMealsTotal(s: AppState) {
  const meals = todayMealEntries(s);
  const totals = { ...calculateMealTotals(meals), mealsWithoutMacros: meals.filter(meal => meal.macroStatus === "unreported").length };
  return totals.mealsWithoutMacros
    ? { ...totals, protein: null, carbs: null, fat: null }
    : totals;
}

function findExerciseId(nameOrId: unknown): string {
  const raw = normalizeText(nameOrId);
  if (!raw) return "bench-press";
  const exact = EXERCISES.find(e => e.id === raw || normalizeText(e.name) === raw);
  if (exact) return exact.id;
  const loose = EXERCISES.find(e => normalizeText(e.name).includes(raw) || raw.includes(normalizeText(e.name).split(" ")[0]));
  return loose?.id ?? raw.replaceAll(" ", "-");
}

function normalizeWorkoutExercises(raw: unknown): WorkoutExercise[] {
  const list = Array.isArray(raw) ? raw as Record<string, unknown>[] : [];
  return list.map((item) => {
    const exerciseId = textArg(item, "exerciseId") ?? findExerciseId(item.name);
    const setsRaw = Array.isArray(item.sets) ? item.sets as Record<string, unknown>[] : [];
    const sets = setsRaw.length ? setsRaw.map(s => normalizeSet(s)) : [{ id: uid(), modifier: "normal", completed: false } as SetEntry];
    return { id: String(item.id ?? uid()), exerciseId, sets, notes: textArg(item, "notes"), completed: sets.some(s => s.completed) };
  }).filter(e => e.exerciseId);
}

function workoutPayload(args: Record<string, unknown>) {
  const exercises = normalizeWorkoutExercises(args.exercises);
  const startedAt = Number(args.startedAt) || Date.now() - Math.max(0, Number(args.durationMin) || 0) * 60000;
  const endedAt = Number(args.endedAt) || (Number(args.durationMin) ? startedAt + Number(args.durationMin) * 60000 : Date.now());
  const workoutType = String(args.workoutType ?? args.type ?? inferWorkoutType(exercises));
  const name = String(args.name ?? `${capitalize(workoutType)} Workout`);
  return { id: uid(), name, startedAt, endedAt, exercises, notes: textArg(args, "notes"), workoutType, confidence: asConfidence(args.confidence), originalText: textArg(args, "originalText") };
}

function inferWorkoutType(exercises: WorkoutExercise[]) {
  const names = exercises.map(e => exerciseById(e.exerciseId)?.name.toLowerCase() ?? e.exerciseId).join(" ");
  if (/squat|leg|rdl|deadlift|calf|lunge/.test(names)) return "legs";
  if (/row|pull|lat|curl|deadlift/.test(names)) return "pull";
  if (/bench|press|fly|tricep|shoulder/.test(names)) return "push";
  if (/run|walk|bike|treadmill|stair/.test(names)) return "cardio";
  return "custom";
}

function capitalize(v: string) { return v ? v[0].toUpperCase() + v.slice(1) : v; }

function maybeDuplicateWorkout(state: AppState, draft: ReturnType<typeof workoutPayload>) {
  return state.workouts.find(w => sameDay(w.startedAt, draft.startedAt) && normalizeText(w.name) === normalizeText(draft.name) && Math.abs(w.exercises.length - draft.exercises.length) <= 1);
}

const handlers: Record<ToolName, ToolHandler> = {
  ...trainingActions,
  ...recordActions,
  correctMealPortion,
  getTodaySummary: (_a, { state }) => {
    const tot = todaysMealsTotal(state), tgt = state.nutritionTargets, last = state.workouts.at(-1), ci = state.recoveryCheckIns.at(-1);
    return { ok: true, summary: "today snapshot", data: { calories: `${tot.calories} / ${tgt.calories}`, protein: tot.protein === null ? "Some meals have unreported macros." : `${tot.protein}g / ${tgt.protein}g`, lastWorkout: last ? { name: last.name, daysAgo: Math.floor((Date.now() - last.startedAt) / 86400000) } : null, lastCheckIn: ci ? { energy: ci.energy, soreness: ci.soreness, stress: ci.stress } : null } };
  },
  getNutritionStatus: (_a, { state }) => {
    const meals = todayMealEntries(state);
    if (!meals.length) return { ok: true, summary: "There are no meals logged today." };
    const totals = todaysMealsTotal(state);
    const summary = totals.protein === null ? `Today's meal log: ${totals.calories} kcal. Some meals have unreported macros.` : `Today's meal log: ${totals.calories} kcal and ${totals.protein} g protein, including saved estimates.`;
    return { ok: true, summary,
      data: { totals, targets: state.nutritionTargets } };
  },
  getTrainingStatus: (_a, { state }) => ({ ok: true, summary: "training status", data: { thisWeek: state.workouts.filter(w => w.startedAt > Date.now() - 7 * 86400000).length, recent: state.workouts.slice(-5), activeWorkout: state.activeWorkout?.name ?? null } }),
  getRecoveryStatus: (_a, { state }) => {
    const checkIn = [...state.recoveryCheckIns].sort((a, b) => b.createdAt - a.createdAt)[0];
    const sleep = [...state.sleepEntries].sort((a, b) => b.createdAt - a.createdAt)[0];
    const summary = [
      checkIn ? `Latest check-in (${new Date(checkIn.createdAt).toLocaleDateString()}): energy ${checkIn.energy}/10 and soreness ${checkIn.soreness}/10.` : "There is no recovery check-in on record.",
      sleep ? `Latest sleep log (${new Date(sleep.createdAt).toLocaleDateString()}): ${sleep.hours} hours.` : "There is no sleep log on record.",
    ].join(" ");
    return { ok: true, summary };
  },
  getProgressTrends: (_a, { state }) => ({ ok: true, summary: "progress trends", data: { bodyweight: state.bodyweightEntries.slice(-8), prCount: workoutPersonalRecords(state.workouts, state.customExercises).length, goals: state.goals } }),
  getUserGoalsProfile: (_a, { state }) => ({ ok: true, summary: "user profile", data: state.userGoalsProfile }),
  updateUserGoalsProfile: (args, { set, state }) => {
    const patch = (args.patch ?? {}) as Partial<UserGoalsProfile>, prev = state.userGoalsProfile, auditId = uid();
    set(s => ({ ...s, userGoalsProfile: { ...s.userGoalsProfile, ...patch } }));
    pushAudit(set, { id: auditId, tool: "updateUserGoalsProfile", summary: `Update profile: ${Object.keys(patch).join(", ")}`, status: "logged", patch: { next: patch, prev }, createdAt: Date.now(), entityKind: "profile" });
    return { ok: true, summary: "Profile updated", auditId };
  },
  getJarvisSettings: (_a, { state }) => ({ ok: true, summary: "jarvis settings", data: state.jarvisSettings }),
  updateJarvisSettings: (args, { set, state }) => {
    const patch = (args.patch ?? {}) as Partial<JarvisSettings>, prev = state.jarvisSettings, auditId = uid();
    set(s => ({ ...s, jarvisSettings: { ...s.jarvisSettings, ...patch } }));
    pushAudit(set, { id: auditId, tool: "updateJarvisSettings", summary: `Update Jarvis settings: ${Object.keys(patch).join(", ")}`, status: "logged", patch: { next: patch, prev }, createdAt: Date.now(), entityKind: "jarvisSettings" });
    return { ok: true, summary: "Settings updated", auditId };
  },
  logBodyWeight: (args, { set, state, confirmed }) => {
    const dupeAudit = hasAuditKey(state, "logBodyWeight", args); if (dupeAudit) return duplicateResult(dupeAudit);
    const weightLb = Number(args.weightLb); if (!Number.isFinite(weightLb) || weightLb < 40 || weightLb > 700) return { ok: false, summary: "invalid weight", error: "Weight must be 40-700 lb" };
    const existing = state.bodyweightEntries.find(b => sameDay(b.createdAt) && Math.abs(b.weightLb - weightLb) < 0.05); if (existing) return { ok: true, summary: "That's already logged.", data: { duplicate: true, existing: [existing.id] } };
    const id = uid(), auditId = uid(), originalText = textArg(args, "originalText"), action = actionKey("logBodyWeight", args);
    const provenance = createJarvisProvenance({ confidence: "high", confirmed, auditId, originalText });
    set(s => ({ ...s, bodyweightEntries: [...s.bodyweightEntries, { id, weightLb, notes: textArg(args, "notes"), createdAt: Date.now(), provenance }] }));
    pushAudit(set, { id: auditId, tool: "logBodyWeight", summary: `Logged ${weightLb} lb`, status: "logged", originalText, confidence: "high", entityIds: [id], entityKind: "bodyweight", patch: { weightLb, actionKey: action }, createdAt: Date.now() });
    return { ok: true, summary: `Logged ${weightLb} lb`, auditId };
  },
  logSupplement: (args, { set, state, confirmed }) => {
    const dupeAudit = hasAuditKey(state, "logSupplement", args); if (dupeAudit) return duplicateResult(dupeAudit);
    const name = String(args.name ?? "").trim(); if (!name) return { ok: false, summary: "missing name", error: "Supplement name required" };
    const existing = state.supplementLogs.find(s => sameDay(s.createdAt) && normalizeText(s.name) === normalizeText(name)); if (existing) return { ok: true, summary: "That's already logged.", data: { duplicate: true, existing: [existing.id] } };
    const id = uid(), auditId = uid(), dose = textArg(args, "dose"), originalText = textArg(args, "originalText"), entry: SupplementLog = { id, name, dose, notes: textArg(args, "notes"), createdAt: Date.now(), source: "jarvis", auditId, provenance: createJarvisProvenance({ confidence: "high", confirmed, auditId, originalText }) };
    set(s => ({ ...s, supplementLogs: [...s.supplementLogs, entry] }));
    const summary = `Logged ${name}${dose ? ` (${dose})` : ""}`;
    pushAudit(set, { id: auditId, tool: "logSupplement", summary, status: "logged", originalText, confidence: "high", entityIds: [id], entityKind: "supplement", patch: { name, dose, actionKey: actionKey("logSupplement", args) }, createdAt: Date.now() });
    return { ok: true, summary, auditId };
  },
  logDailyCheckIn: (args, { set, state, confirmed }) => {
    const dupeAudit = hasAuditKey(state, "logDailyCheckIn", args); if (dupeAudit) return duplicateResult(dupeAudit);
    const energy = clamp10(args.energy), soreness = clamp10(args.soreness), stress = clamp10(args.stress), motivation = clamp10(args.motivation); if ([energy, soreness, stress, motivation].some(v => v == null)) return { ok: false, summary: "invalid scales", error: "Scales must be 1-10" };
    const id = uid(), auditId = uid();
    const originalText = textArg(args, "originalText");
    const provenance = createJarvisProvenance({ confidence: "high", confirmed, auditId, originalText });
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id, energy: energy!, soreness: soreness!, stress: stress!, motivation: motivation!, notes: textArg(args, "notes"), createdAt: Date.now(), provenance }] }));
    const summary = `Daily check-in: energy ${energy}, soreness ${soreness}, stress ${stress}, motivation ${motivation}`;
    pushAudit(set, { id: auditId, tool: "logDailyCheckIn", summary, status: "logged", originalText, confidence: "high", entityIds: [id], entityKind: "checkin", patch: { actionKey: actionKey("logDailyCheckIn", args) }, createdAt: Date.now() });
    return { ok: true, summary, auditId };
  },
  undoLastAction: (args, { state, set, confirmed }) => {
    const target = textArg(args, "targetAuditId");
    const last = state.jarvisAudit.find(a => !a.undone && a.status === "logged" && (target === undefined || a.id === target));
    if (!last) return { ok: false, summary: "There are no recent Jarvis actions to undo." };
    const result = stageUndo(last.id, state, set);
    return result.ok && !confirmed ? { ...result, summary: `Undo: ${last.summary}` } : result;
  },
  saveJarvisLearning: (args, { set, settings }) => { if (!settings.learningEnabled) return { ok: false, summary: "learning disabled", error: "Memory/learning is off" }; const key = String(args.key ?? "").trim(); if (!key) return { ok: false, summary: "missing key", error: "key required" }; set(s => ({ ...s, jarvisLearning: { ...s.jarvisLearning, [key]: args.value } })); return { ok: true, summary: `Learned: ${key}` }; },
  getJarvisLearnedPreferences: (_a, { state }) => ({ ok: true, summary: "learned prefs", data: state.jarvisLearning }),
  logReferenceMeal: (args, ctx) => handlers.logMeal({ ...args, source: "jarvis-confirmed" }, { ...ctx, referenceMeal: true }),
  logCaloriesOnly: (args, { state, set, confirmed, now = new Date() }) => {
    const originalText = textArg(args, "originalText");
    const existing = state.mealEntries.find(meal => originalText
      && sameDay(meal.createdAt, now.getTime())
      && normalizeText(meal.originalText) === normalizeText(originalText));
    if (existing) {
      return { ok: true, summary: "That's already logged.", data: { duplicate: true, existing: [existing.id] } };
    }
    const type = String(args.mealType);
    const calories = Number(args.calories);
    const name = type[0].toUpperCase() + type.slice(1);
    const approximate = args.approximate === true;
    const amounts = `${approximate ? "about " : ""}${calories} kcal, macros unreported`;
    if (!confirmed) return { ok: true, summary: `Log ${name}: ${amounts}?` };
    const id = uid();
    const auditId = uid();
    const createdAt = now.getTime();
    const assumptions = [approximate ? "User-reported approximate calories. Macros were not reported." : "User-reported calories. Macros were not reported."];
    const provenance = createJarvisProvenance({
      confirmed, auditId, originalText, assumptions, confidence: approximate ? "medium" : "high",
    });
    const meal: MealEntry = {
      id, name, type, calories, macroStatus: "unreported", source: "jarvis-confirmed",
      confirmed, provenance, auditId, originalText, createdAt,
    };
    const summary = `Logged ${name}: ${amounts}`;
    set(s => ({ ...s, mealEntries: [...s.mealEntries, meal] }));
    pushAudit(set, {
      id: auditId, tool: "logCaloriesOnly", summary, status: "logged", entityIds: [id], entityKind: "meal",
      patch: { name, mealType: type, calories }, createdAt,
    });
    return { ok: true, summary, auditId, data: { id } };
  },
  logMeal: (args, { set, state, confirmed, mealPortionEdited, referenceMeal }) => {
    const dupeAudit = hasAuditKey(state, "logMeal", args, audit => loggedMealExists(state, audit));
    if (dupeAudit) return duplicateResult(dupeAudit);
    const name = String(args.name ?? "").trim() || "Meal";
    const mealType = String(args.mealType ?? "snack");
    const totals = Array.isArray(args.items)
      ? mealItemTotals(args.items as JarvisMealItem[])
      : {
        calories: Math.round(Number(args.calories) || 0),
        protein: Math.round(Number(args.protein) || 0),
        carbs: Math.round(Number(args.carbs) || 0),
        fat: Math.round(Number(args.fat) || 0),
      };
    const { calories, protein, carbs, fat } = totals;
    if (calories <= 0 && protein <= 0) return { ok: false, summary: "empty meal", error: "Meal needs at least some macros." };
    const existing = state.mealEntries.find(m => sameDay(m.createdAt) && normalizeText(m.originalText) === normalizeText(args.originalText) && normalizeText(args.originalText)); if (existing) return { ok: true, summary: "That's already logged.", data: { duplicate: true, existing: [existing.id] } };
    const confidence = asConfidence(args.confidence), assumptions = Array.isArray(args.assumptions) ? (args.assumptions as unknown[]).map(String) : undefined, originalText = textArg(args, "originalText");
    const id = uid(), auditId = uid(), fiber = args.fiber != null ? Math.round(Number(args.fiber) || 0) : undefined, source = (typeof args.source === "string" ? args.source : "jarvis") as MealEntry["source"];
    const estimated = source !== "jarvis-confirmed";
    const estimateProvenance = estimated
      ? createAiEstimateProvenance({ confidence, confirmed, auditId, originalText, assumptions })
      : createJarvisProvenance({ confidence, confirmed, auditId, originalText, assumptions });
    const provenance = mealPortionEdited
      ? markProvenanceEdited(estimateProvenance, { editedBy: "user", auditId })
      : estimateProvenance;
    const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]).map(it => {
      const itemConfidence = asConfidence(it.confidence, confidence);
      return { name: String(it.name ?? "item"), qty: textArg(it, "qty"), calories: Math.round(Number(it.calories) || 0), protein: Math.round(Number(it.protein) || 0), carbs: Math.round(Number(it.carbs) || 0), fat: Math.round(Number(it.fat) || 0), source: (it.source as MealItem["source"]) ?? "jarvis", confidence: itemConfidence, provenance: (referenceMeal ? createJarvisProvenance : createAiEstimateProvenance)({ confidence: itemConfidence, confirmed, auditId, originalText, assumptions }) };
    }) : undefined;
    const entry: MealEntry = { id, name, type: mealType, calories, protein, carbs, fat, fiber, items, source, confidence, originalText, assumptions, confirmed: provenance.confirmation === "confirmed", auditId, provenance, createdAt: Date.now() };
    set(s => ({ ...s, mealEntries: [...s.mealEntries, entry] }));
    const summary = `Logged ${name} - ${calories} kcal, ${protein}g P / ${carbs}g C / ${fat}g F`;
    pushAudit(set, { id: auditId, tool: "logMeal", summary, status: "logged", originalText, confidence, assumptions, entityIds: [id], entityKind: "meal", patch: { name, mealType, calories, protein, carbs, fat, actionKey: actionKey("logMeal", args) }, createdAt: Date.now() });
    return { ok: true, summary, auditId, data: { id, calories, protein, carbs, fat, fiber, items, confidence, assumptions } };
  },
  updateMeal: (args, { set, state, confirmed }) => {
    const id = String(args.id ?? ""), meal = state.mealEntries.find(m => m.id === id);
    if (!meal) return { ok: false, summary: "meal not found", error: "Meal id not found" };
    const patch = (args.patch ?? {}) as Partial<MealEntry>, auditId = uid(), editedAt = Date.now();
    if (meal.macroStatus === "unreported" && ["protein", "carbs", "fat", "items"].some(field => Object.hasOwn(patch, field))
      && (patch.protein === undefined || patch.carbs === undefined || patch.fat === undefined)) {
      return { ok: false, summary: "Enter protein, carbs, and fat together to complete this meal's macros." };
    }
    if (!confirmed) {
      const changes = Object.entries(patch).map(([field, value]) =>
        field === "items" ? "replace the item list" : `${field}: ${String(meal[field as keyof MealEntry] ?? "unset")} to ${String(value)}`);
      return { ok: true, summary: `Edit ${meal.name} (${new Date(meal.createdAt).toLocaleDateString()}). ${changes.join(", ")}.` };
    }
    const provenance = markProvenanceEdited(meal.provenance, { editedBy: confirmed ? "user" : "jarvis", editedAt, auditId });
    const updated = { ...meal, ...patch, source: "edited" as const, confirmed: confirmed ? true : meal.confirmed, provenance };
    const next: MealEntry = updated.protein === undefined || updated.carbs === undefined || updated.fat === undefined
      ? { ...updated, macroStatus: "unreported", protein: undefined, carbs: undefined, fat: undefined }
      : { ...updated, macroStatus: undefined, protein: updated.protein, carbs: updated.carbs, fat: updated.fat };
    set(s => ({ ...s, mealEntries: s.mealEntries.map(m => m.id === id ? next : m) }));
    pushAudit(set, { id: auditId, tool: "updateMeal", summary: `Edited meal: ${meal.name}`, status: "logged", entityIds: [id], entityKind: "mealEdit", patch: { prev: meal, next: patch }, createdAt: editedAt });
    return { ok: true, summary: `Updated ${meal.name}`, auditId };
  },
  deleteMeal: (args, { set, state, confirmed }) => { const id = String(args.id ?? ""), meal = state.mealEntries.find(m => m.id === id); if (!meal) return { ok: false, summary: "meal not found", error: "Meal id not found" }; if (!confirmed) return { ok: true, summary: `Delete ${meal.name} from ${new Date(meal.createdAt).toLocaleDateString()} (${meal.calories} kcal)?` }; const auditId = uid(); set(s => ({ ...s, mealEntries: s.mealEntries.filter(m => m.id !== id) })); pushAudit(set, { id: auditId, tool: "deleteMeal", summary: `Deleted meal: ${meal.name}`, status: "logged", entityIds: [id], entityKind: "mealDelete", patch: { prev: meal }, createdAt: Date.now() }); return { ok: true, summary: `Deleted ${meal.name}`, auditId }; },
  getMealHistory: (args, { state }) => { const cutoff = Date.now() - Math.min(30, Math.max(1, Number(args.days) || 14)) * 86400000; const meals = state.mealEntries.filter(m => m.createdAt >= cutoff).slice(-50); return { ok: true, summary: `${meals.length} meals`, data: meals }; },
  getUsualMeals: (_a, { state }) => ({
    ok: true, summary: "usual meals",
    data: Object.fromEntries(USUAL_MEAL_SLOTS.map(slot => [slot, readUsualMeal(state, slot)])),
  }),
  saveUsualMeal: (args, { state, set, confirmed }) => {
    const { slot } = args;
    const name = textArg(args, "name"), macros = readMealMacros(args);
    if (!isUsualMealSlot(slot) || !name || !macros) return { ok: false, summary: "Choose a meal slot and supply the meal name and macros." };
    const label = usualMealSlots[slot].label;
    const values = `${macros.calories} kcal, ${macros.protein} g protein, ${macros.carbs} g carbs, ${macros.fat} g fat`;
    const prev = readUsualMeal(state, slot);
    if (!confirmed) {
      const change = prev.name ? `Replace ${prev.name} with ${name} as your usual ${label}` : `Save ${name} as your usual ${label}`;
      return { ok: true, summary: `${change} (${values})?` };
    }
    const auditId = uid(), summary = `Saved usual ${label}: ${name}`;
    set(s => writeUsualMeal(s, slot, { name, macros }));
    pushAudit(set, { id: auditId, tool: "saveUsualMeal", summary, status: "logged", entityKind: "usualMeal", patch: { slot, name, macros, prev }, createdAt: Date.now() });
    return { ok: true, summary, auditId };
  },
  deleteUsualMeal: (args, { state, set, confirmed }) => {
    const { slot } = args;
    if (!isUsualMealSlot(slot)) return { ok: false, summary: "Choose a saved meal slot." };
    const prev = readUsualMeal(state, slot);
    if (!prev.name) return { ok: false, summary: "That usual meal is already empty." };
    const label = usualMealSlots[slot].label;
    if (!confirmed) return { ok: true, summary: `Forget ${prev.name} as your usual ${label}? Your nutrition history will be kept.` };
    const auditId = uid(), summary = `Forgot usual ${label}: ${prev.name}`;
    set(s => writeUsualMeal(s, slot, {}));
    pushAudit(set, { id: auditId, tool: "deleteUsualMeal", summary, status: "logged", entityKind: "usualMeal", patch: { slot, prev }, createdAt: Date.now() });
    return { ok: true, summary, auditId };
  },
  logUsualMeal: (args, ctx) => {
    const { slot } = args;
    if (!isUsualMealSlot(slot)) return { ok: false, summary: "Choose a saved meal slot." };
    const { name, macros } = readUsualMeal(ctx.state, slot);
    if (!name) return { ok: false, summary: `There is no usual ${slot} saved.` };
    if (!macros) return { ok: false, summary: `Save the recipe and macros for ${name} before logging it as a usual meal.` };
    const mealType = usualMealSlots[slot].type;
    return handlers.logMeal({
      ...args, name, mealType, ...macros, confidence: "high",
      assumptions: [`Used saved macros for ${name}`], source: "jarvis-confirmed",
    }, ctx);
  },
  getSupplementStatus: (_a, { state }) => { const today = state.supplementLogs.filter(s => s.createdAt >= todayStart()), routine = state.userGoalsProfile.supplementRoutine ?? [], taken = today.map(s => s.name.toLowerCase()); return { ok: true, summary: `${today.length} taken today`, data: { takenToday: today, routine, missing: routine.filter(r => !taken.some(t => t.includes(r.toLowerCase()))) } }; },
  getMissedHabits: (_a, { state }) => { const missed: { habit: string; reason: string }[] = [], totals = todaysMealsTotal(state), target = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories, ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein; if (totals.protein !== null && totals.protein < ptarget * 0.7 && Date.now() - todayStart() > 12 * 3600000) missed.push({ habit: "protein", reason: `${totals.protein}g / ${ptarget}g target` }); if (totals.calories < target * 0.5 && Date.now() - todayStart() > 14 * 3600000) missed.push({ habit: "calories", reason: `${totals.calories} / ${target} kcal` }); if (!state.bodyweightEntries.some(b => b.createdAt >= todayStart()) && state.userGoalsProfile.normalWeighInTime) missed.push({ habit: "weigh-in", reason: "not logged today" }); if (!state.recoveryCheckIns.some(c => c.createdAt >= todayStart())) missed.push({ habit: "check-in", reason: "no daily check-in yet" }); return { ok: true, summary: `${missed.length} missed habits`, data: missed }; },
  getDailyReviewSummary: (_a, { state }) => { const totals = todaysMealsTotal(state), target = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories, ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein, meals = todayMealEntries(state), supps = state.supplementLogs.filter(s => s.createdAt >= todayStart()), ci = state.recoveryCheckIns.filter(c => c.createdAt >= todayStart()).at(-1), bw = state.bodyweightEntries.filter(b => b.createdAt >= todayStart()).at(-1), workout = state.workouts.find(w => w.startedAt >= todayStart()); return { ok: true, summary: "daily review", data: { calories: { logged: totals.calories, target, remaining: Math.max(0, target - totals.calories) }, protein: { logged: totals.protein, target: ptarget, remaining: totals.protein === null ? null : Math.max(0, ptarget - totals.protein) }, macros: totals, mealsLogged: meals.length, lowConfidenceMeals: meals.filter(m => m.confidence === "low").length, supplementsToday: supps.map(s => s.name), bodyweight: bw?.weightLb ?? null, checkIn: ci ?? null, workoutToday: workout?.name ?? null } }; },
  updateDailyCheckIn: (args, { set, state, confirmed, now = new Date() }) => {
    const last = latestRecoveryCheckInToday(state, now);
    if (!last) return { ok: false, summary: "no check-in today", error: "Run logDailyCheckIn first." };
    const patch = (args.patch ?? {}) as Partial<RecoveryCheckIn>, auditId = uid(), editedAt = Date.now();
    const provenance = markProvenanceEdited(last.provenance, { editedBy: confirmed ? "user" : "jarvis", editedAt, auditId });
    set(s => ({ ...s, recoveryCheckIns: s.recoveryCheckIns.map(c => c.id === last.id ? { ...c, ...patch, provenance } : c) }));
    pushAudit(set, { id: auditId, tool: "updateDailyCheckIn", summary: "Updated today's check-in", status: "logged", entityIds: [last.id], entityKind: "checkinEdit", patch: { prev: last, next: patch }, createdAt: editedAt });
    return { ok: true, summary: "Check-in updated", auditId };
  },
  suggestNutritionAction: (_a, { state, settings }) => {
    if (!settings.nutritionSuggestions) return { ok: true, summary: "nutrition suggestions off", data: { suggestion: null } };
    const totals = todaysMealsTotal(state);
    const proteinTarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein;
    const calorieTarget = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories;
    const proteinGap = proteinTarget > 0 && totals.protein !== null ? proteinTarget - totals.protein : null;
    const calorieGap = calorieTarget > 0 ? calorieTarget - totals.calories : null;
    if (proteinGap === null && calorieGap === null) {
      return { ok: true, summary: "No calorie or protein targets are set.", data: { suggestion: null, proteinGap, calorieGap } };
    }
    const suggestion = proteinGap !== null && proteinGap > 30
      ? `You're ${proteinGap}g short on protein.`
      : calorieGap !== null && calorieGap > 500
        ? `Still ${calorieGap} kcal under target.`
        : "Logged intake is close to your set targets.";
    return { ok: true, summary: suggestion, data: { suggestion, proteinGap, calorieGap } };
  },
  createWorkoutDraft: (args) => { const draft = workoutPayload(args); if (!draft.exercises.length) return { ok: false, summary: "no exercises found", error: "Add at least one exercise." }; return { ok: true, summary: `Review ${draft.name}: ${draft.exercises.length} exercises`, needsConfirmation: true, data: { ...draft, durationMin: Math.round((draft.endedAt - draft.startedAt) / 60000), exercises: draft.exercises.map(e => ({ ...e, name: exerciseById(e.exerciseId)?.name ?? e.exerciseId })) } }; },
  logWorkout: (args, { set, state, confirmed }) => {
    if (state.activeWorkout) return { ok: false, summary: "Finish or resume the active workout before saving a separate workout." };
    const dupeAudit = hasAuditKey(state, "logWorkout", args); if (dupeAudit) return duplicateResult(dupeAudit);
    const exerciseIds = new Set([...EXERCISES.map(row => row.id), ...state.customExercises.map(row => row.id)]);
    const supplied = args.exercises as { exerciseId: string; sets: unknown[] }[];
    if (supplied.some(row => !exerciseIds.has(row.exerciseId))) return { ok: false, summary: "Identify each exercise using a known FitCore exercise." };
    if (supplied.reduce((sum, row) => sum + row.sets.length, 0) > 1_000) return { ok: false, summary: "This workout exceeds FitCore's set limit." };
    const draft = workoutPayload(args); if (draft.endedAt < draft.startedAt || draft.endedAt > Date.now() + 60_000) {
      return { ok: false, summary: "Check the workout's reported start and finish times." };
    }
    if (!draft.exercises.length) return { ok: false, summary: "no exercises found", error: "Add at least one exercise." };
    const existing = maybeDuplicateWorkout(state, draft); if (existing) return { ok: true, summary: `A similar ${draft.name} is already logged today.`, data: { duplicate: true, existing: [existing.id] } };
    const auditId = uid();
    const provenance = createJarvisProvenance({ confidence: draft.confidence, confirmed, auditId, originalText: draft.originalText });
    const exercises = draft.exercises.map(exercise => ({
      ...exercise,
      provenance,
      sets: exercise.sets.map(set => ({ ...set, provenance })),
    }));
    const workout: Workout = { id: draft.id, name: draft.name, startedAt: draft.startedAt, endedAt: draft.endedAt, exercises, notes: draft.notes, provenance };
    set(s => ({ ...s, workouts: [...s.workouts, workout] }));
    pushAudit(set, { id: auditId, tool: "logWorkout", summary: `Logged ${workout.name}`, status: "logged", originalText: draft.originalText, confidence: draft.confidence, entityIds: [workout.id], entityKind: "workout", patch: { prev: null, workout, actionKey: actionKey("logWorkout", args) }, createdAt: Date.now() });
    return { ok: true, summary: `Logged ${workout.name}`, auditId, data: { ...draft, id: workout.id, durationMin: Math.round((draft.endedAt - draft.startedAt) / 60000), exercises: workout.exercises.map(e => ({ ...e, name: exerciseById(e.exerciseId)?.name ?? e.exerciseId })) } };
  },
  updateWorkout: (args, { set, state, confirmed }) => {
    const id = String(args.id ?? ""), workout = state.workouts.find(w => w.id === id);
    if (!workout) return { ok: false, summary: "workout not found" };
    const patch = (args.patch ?? {}) as Partial<Workout>, auditId = uid(), editedAt = Date.now();
    if (!confirmed) return { ok: true, summary: `Edit saved workout ${workout.name} from ${new Date(workout.startedAt).toLocaleDateString()}. ${patch.name ? `New name: ${patch.name}. ` : ""}${patch.notes !== undefined ? `Notes: ${patch.notes || "clear"}.` : ""}` };
    const provenance = markProvenanceEdited(workout.provenance, { editedBy: confirmed ? "user" : "jarvis", editedAt, auditId });
    set(s => ({ ...s, workouts: s.workouts.map(w => w.id === id ? { ...w, ...patch, provenance } : w) }));
    pushAudit(set, { id: auditId, tool: "updateWorkout", summary: `Updated ${workout.name}`, status: "logged", entityIds: [id], entityKind: "workoutEdit", patch: { prev: workout, next: patch }, createdAt: editedAt });
    return { ok: true, summary: `Updated ${workout.name}`, auditId };
  },
  deleteWorkout: (args, { set, state }) => { const id = String(args.id ?? ""), workout = state.workouts.find(w => w.id === id); if (!workout) return { ok: false, summary: "workout not found" }; const auditId = uid(); set(s => ({ ...s, workouts: s.workouts.filter(w => w.id !== id) })); pushAudit(set, { id: auditId, tool: "deleteWorkout", summary: `Deleted ${workout.name}`, status: "logged", entityIds: [id], entityKind: "workoutDelete", patch: { prev: workout }, createdAt: Date.now() }); return { ok: true, summary: `Deleted ${workout.name}`, auditId }; },
  getWorkoutHistory: (args, { state }) => { const cutoff = Date.now() - Math.min(90, Math.max(1, Number(args.days) || 30)) * 86400000; const workouts = state.workouts.filter(w => w.startedAt >= cutoff); return { ok: true, summary: `${workouts.length} workouts`, data: workouts }; },
  getLastWorkoutByType: (args, { state }) => { const q = normalizeText(args.workoutType); const w = [...state.workouts].reverse().find(w => normalizeText(w.name).includes(q)); return { ok: true, summary: w ? `Last ${q}: ${w.name}` : `No ${q} workout found`, data: w ?? null }; },
  getLastExercisePerformance: (args, { state }) => { const id = findExerciseId(args.exerciseId ?? args.exerciseName); const rows = [...state.workouts].reverse().flatMap(w => w.exercises.filter(e => e.exerciseId === id).map(e => ({ workout: w.name, when: w.startedAt, sets: e.sets.filter(s => s.completed) }))).filter(r => r.sets.length); return { ok: true, summary: rows[0] ? `Last ${exerciseById(id)?.name ?? id}: ${rows[0].sets.map(s => `${s.weight ?? ""}x${s.reps ?? "?"}`).join(", ")}` : "No previous sets found", data: rows[0] ?? null }; },
  getActiveWorkout: (_a, { state }) => ({ ok: true, summary: state.activeWorkout ? `Active: ${state.activeWorkout.name}` : "No active workout", data: state.activeWorkout }),
  updateActiveWorkout: (args, { set, state, confirmed }) => {
    if (!state.activeWorkout) return { ok: false, summary: "no active workout" };
    const patch = (args.patch ?? {}) as Partial<Workout>, auditId = uid(), editedAt = Date.now(), prev = state.activeWorkout;
    if (!confirmed) return { ok: true, summary: `Edit active workout ${prev.name}. ${patch.name ? `New name: ${patch.name}. ` : ""}${patch.notes !== undefined ? `Notes: ${patch.notes || "clear"}.` : ""}` };
    const provenance = markProvenanceEdited(prev.provenance, { editedBy: confirmed ? "user" : "jarvis", editedAt, auditId });
    set(s => ({ ...s, activeWorkout: s.activeWorkout ? { ...s.activeWorkout, ...patch, provenance } : null }));
    pushAudit(set, { id: auditId, tool: "updateActiveWorkout", summary: "Updated active workout", status: "logged", originalText: textArg(args, "originalText"), entityIds: [prev.id], entityKind: "activeWorkoutEdit", patch: { prev, next: patch }, createdAt: editedAt });
    return { ok: true, summary: "Active workout updated", auditId };
  },
  suggestActiveWorkoutChange: (args, { state }) => { const active = state.activeWorkout; const request = normalizeText(args.request ?? args.reason); const suggestion = !active ? "Start a workout first." : request.includes("shoulder") ? "Swap incline pressing for cable fly or machine press for 3 sets of 12, and keep pain-free range." : request.includes("20") ? "Shorten to one top set per remaining exercise and skip low-priority accessories." : "Use previous performance and current fatigue: keep the next set 1-2 reps from failure."; return { ok: true, summary: suggestion, data: { suggestion, activeWorkout: active } }; },
  saveWorkoutTemplate: (args, { set, state }) => { const name = String(args.name ?? "").trim(); if (!name) return { ok: false, summary: "template name required" }; const source = state.workouts.find(w => w.id === args.workoutId) ?? state.activeWorkout ?? state.workouts.at(-1); if (!source) return { ok: false, summary: "no workout to template" }; const templateId = `jarvis-${uid()}`, auditId = uid(); set(s => ({ ...s, workoutTemplates: [...s.workoutTemplates, { id: uid(), name, templateId }] })); pushAudit(set, { id: auditId, tool: "saveWorkoutTemplate", summary: `Saved template ${name}`, status: "logged", entityKind: "workoutTemplate", patch: { templateId, source }, createdAt: Date.now() }); return { ok: true, summary: `Saved template ${name}`, auditId }; },
  getWorkoutTemplates: (_a, { state }) => ({ ok: true, summary: `${WORKOUT_TEMPLATES.length + state.workoutTemplates.length} templates`, data: { builtIn: WORKOUT_TEMPLATES, saved: state.workoutTemplates } }),
  suggestWorkoutProgression: (args, { state }) => { const id = findExerciseId(args.exerciseId ?? args.exerciseName); const hist = [...state.workouts].reverse().flatMap(w => w.exercises.filter(e => e.exerciseId === id).flatMap(e => e.sets.filter(s => s.completed && s.weight && s.reps))); const last = hist[0]; const suggestion = !last ? "Start with a comfortable working weight." : last.reps && last.reps >= 8 ? `Try ${Math.round(((last.weight ?? 0) + 5) / 5) * 5} lb for 6-8 reps next time.` : `Repeat ${last.weight ?? "the same weight"} and build reps before adding load.`; return { ok: true, summary: suggestion, data: { exerciseId: id, last, suggestion } }; },
  suggestExerciseSubstitution: (args) => { const id = findExerciseId(args.exerciseId ?? args.exerciseName); const ex = exerciseById(id); const alt = args.reason && normalizeText(args.reason).includes("shoulder") ? EXERCISES.find(e => e.id === "cable-fly") : EXERCISES.find(e => e.primary.some(m => ex?.primary.includes(m)) && e.id !== id); return { ok: true, summary: alt ? `Swap ${ex?.name ?? id} for ${alt.name}.` : "Use a pain-free machine or cable alternative.", data: { from: ex, to: alt } }; },
  logWorkoutNote: (args, { set, state }) => { const notes = String(args.notes ?? "").trim(); if (!notes) return { ok: false, summary: "notes required" }; const workoutId = String(args.workoutId ?? state.activeWorkout?.id ?? ""), auditId = uid(); if (state.activeWorkout?.id === workoutId) set(s => ({ ...s, activeWorkout: s.activeWorkout ? { ...s.activeWorkout, notes: [s.activeWorkout.notes, notes].filter(Boolean).join("\n") } : null })); else set(s => ({ ...s, workouts: s.workouts.map(w => w.id === workoutId ? { ...w, notes: [w.notes, notes].filter(Boolean).join("\n") } : w) })); pushAudit(set, { id: auditId, tool: "logWorkoutNote", summary: "Added workout note", status: "logged", entityIds: [workoutId], entityKind: "workoutNote", patch: { notes }, createdAt: Date.now() }); return { ok: true, summary: "Workout note saved", auditId }; },
  logWorkoutPainOrSoreness: (args, { set, state, confirmed }) => {
    const dupeAudit = hasAuditKey(state, "logWorkoutPainOrSoreness", args); if (dupeAudit) return duplicateResult(dupeAudit);
    const notes = String(args.notes ?? "").trim(); if (!notes) return { ok: false, summary: "notes required" };
    const area = textArg(args, "area"), severity = clamp10(args.severity) ?? 5, auditId = uid(), checkInId = uid();
    const provenance = createJarvisProvenance({ confidence: "medium", confirmed, auditId, originalText: notes });
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id: checkInId, energy: 5, soreness: severity, stress: 5, motivation: 5, notes: [area, notes].filter(Boolean).join(": "), createdAt: Date.now(), provenance }], activeWorkout: s.activeWorkout ? { ...s.activeWorkout, notes: [s.activeWorkout.notes, [area, notes].filter(Boolean).join(": ")].filter(Boolean).join("\n") } : s.activeWorkout }));
    pushAudit(set, { id: auditId, tool: "logWorkoutPainOrSoreness", summary: `Logged recovery note${area ? ` for ${area}` : ""}`, status: "logged", entityIds: [checkInId], entityKind: "checkin", patch: { area, notes, severity, actionKey: actionKey("logWorkoutPainOrSoreness", args) }, createdAt: Date.now() });
    return { ok: true, summary: "Pain/soreness note saved", auditId };
  },
  getTrainingReadinessContext: (_a, { state }) => {
    if (state.demoMode) return { ok: true, summary: "Demo Data. Personal readiness is unavailable." };
    const scores = calculatePersonalScores(state);
    const describe = (metric: typeof scores.readiness) => ({ status: scoreStatusLabel(metric),
      estimate: metric.status === "available" ? metric.value : null,
      evidence: metric.evidence, missing: metric.missing });
    return { ok: true, summary: "training readiness context", data: {
      readiness: describe(scores.readiness), recovery: describe(scores.recovery), profile: state.profile,
    } };
  },
  getDailyDecision: (_a, { state }) => {
    if (state.demoMode) return { ok: true, summary: "Demo Data. Personal recommendations are unavailable." };
    const decision = buildDailyDecision(state);
    return {
      ok: true,
      summary: decision.training.recommendation,
      data: {
        recommendation: {
          decisionType: decision.decisionType,
          training: decision.training,
          nutrition: decision.nutrition,
          recovery: decision.recovery,
          whatChanged: decision.whatChanged,
        },
        explanation: decision.explanation,
        confidence: decision.confidence,
        dataUsed: decision.dataUsed,
        dataMissing: decision.dataMissing,
        warnings: decision.warnings,
        oneAction: decision.oneAction,
      },
    };
  },
};

function clamp10(v: unknown): number | null { const n = Number(v); return Number.isFinite(n) ? Math.max(1, Math.min(10, Math.round(n))) : null; }

export function runTool(name: string, args: Record<string, unknown>, ctx: RunContext): ToolResult {
  if (!Object.hasOwn(handlers, name)) return { ok: false, summary: "Unknown Jarvis tool." };
  if (!ctx.settings.enabled || !ctx.state.jarvisSettings.enabled || ctx.state.demoMode) {
    return { ok: false, summary: "Jarvis actions are unavailable with the current settings." };
  }
  const handler = handlers[name as ToolName];
  if (isReadOnlyJarvisTool(name)) return handler(args, { ...ctx, set: () => {} });
  if (ctx.settings.permission < 2 || ctx.state.jarvisSettings.permission < 2) {
    return { ok: false, summary: "Jarvis is in read-only mode." };
  }
  if (name === "saveUsualMeal" && !ctx.state.jarvisSettings.learningEnabled) return { ok: false, summary: "Enable saved preferences in Jarvis settings to save a usual meal." };
  if (!canProposeJarvisMutation(name)) return { ok: false, summary: "This change needs to be made directly in FitCore." };
  const validated = validateJarvisMutation(name, args);
  if (!validated?.success) return { ok: false, summary: "Jarvis needs valid details before it can propose this change." };
  const checked = validated.data;
  if ((name === "logMeal" || name === "logReferenceMeal") && Array.isArray(checked.items)) {
    const items = checked.items as JarvisMealItem[];
    if (name === "logMeal" && !ctx.confirmed) {
      const referenced = resolveLibraryPortions(items);
      checked.items = referenced.items;
      if (referenced.matched.length) {
        const note = `Used FitCore food library values for ${referenced.matched.join(", ").slice(0, 960)}.`;
        checked.assumptions = [note, ...((checked.assumptions as string[] | undefined) ?? []).slice(0, 11)];
      }
    }
    Object.assign(checked, mealItemTotals(checked.items as JarvisMealItem[]));
  }
  const draftId = textArg(checked, "draftId");
  const existing = draftId ? ctx.state.jarvisAudit.find(entry =>
    entry.patch?.actionKey === `draft:${draftId}`
    && (entry.entityKind !== "meal" || entry.undone || loggedMealExists(ctx.state, entry))) : undefined;
  if (existing?.tool === "undoLastAction") return { ok: true, summary: "This undo has already been applied." };
  if (existing) return existing.undone
    ? { ok: false, summary: "This draft was already resolved. Ask again to start a new draft." }
    : duplicateResult(existing);

  if (!ctx.confirmed) {
    if (name === "undoLastAction") {
      checked.targetAuditId ??= ctx.state.jarvisAudit.find(entry => !entry.undone && entry.status === "logged")?.id;
    }
    const preview = handler(checked, { ...ctx, set: () => {} });
    if (!preview.ok || (preview.data as { duplicate?: boolean } | undefined)?.duplicate) return preview;
    return {
      ok: true,
      summary: name === "logUsualMeal" ? preview.summary.replace(/^Logged /, "Log saved meal ") : preview.summary,
      needsConfirmation: true,
      data: (name === "logUsualMeal" || name === "logWorkout") ? { ...checked, ...preview.data as object } : checked,
    };
  }
  return commitJarvisAction(ctx.state, ctx.set, set => {
    const result = handler(checked, { ...ctx, set });
    if (result.ok && ctx.inputMethod === "voice" && result.auditId) {
      set(next => ({ ...next, jarvisAudit: next.jarvisAudit.map(entry => entry.id === result.auditId
        ? { ...entry, summary: `Voice: ${entry.summary}`, patch: { ...entry.patch, inputMethod: "voice" } } : entry) }));
    }
    if (result.ok && draftId) {
      set(next => ({
        ...next,
        jarvisAudit: next.jarvisAudit.map(entry => entry.id === result.auditId
          ? { ...entry, patch: { ...entry.patch, actionKey: `draft:${draftId}` } }
          : entry),
      }));
    }
    return result;
  });
}

export function undoAuditEntry(auditId: string, state: AppState, set: CommitJarvisState): ToolResult {
  if (state.demoMode) return { ok: false, summary: "Undo is unavailable in demo mode." };
  return commitJarvisAction(state, set, stage => stageUndo(auditId, state, stage));
}

function stageUndo(auditId: string, state: AppState, set: Updater): ToolResult {
  const entry = state.jarvisAudit.find(a => a.id === auditId);
  if (!entry || entry.undone || entry.status !== "logged") return { ok: false, summary: "Nothing to undo." };
  switch (entry.entityKind) {
    case "bodyweight": set(s => ({ ...s, bodyweightEntries: s.bodyweightEntries.filter(e => !(entry.entityIds ?? []).includes(e.id)) })); break;
    case "sleep": {
      const sleep = state.sleepEntries.find(item => entry.entityIds?.includes(item.id));
      if (!sleep || sleep.hours !== entry.patch?.hours || sleep.quality !== entry.patch.quality
        || sleep.createdAt !== entry.patch.createdAt) {
        return { ok: false, summary: "The sleep record has changed since Jarvis saved it." };
      }
      set(s => ({ ...s, sleepEntries: s.sleepEntries.filter(item => item.id !== sleep.id) }));
      break;
    }
    case "bodyweightEdit": {
      const current = state.bodyweightEntries.find(item => entry.entityIds?.includes(item.id));
      const previousWeight = entry.patch?.previousWeight;
      if (!current || current.weightLb !== entry.patch?.weightLb || typeof previousWeight !== "number"
        || current.provenance?.editAuditId !== entry.id) {
        return { ok: false, summary: "The weigh-in has changed since Jarvis corrected it." };
      }
      const provenance = entry.patch?.previousProvenance as typeof current.provenance;
      set(s => ({ ...s, bodyweightEntries: s.bodyweightEntries.map(item =>
        item.id === current.id ? { ...item, weightLb: previousWeight, provenance } : item) }));
      break;
    }
    case "supplement": set(s => ({ ...s, supplementLogs: s.supplementLogs.filter(e => !(entry.entityIds ?? []).includes(e.id)) })); break;
    case "checkin": set(s => ({ ...s, recoveryCheckIns: s.recoveryCheckIns.filter(e => !(entry.entityIds ?? []).includes(e.id)) })); break;
    case "meal": {
      const meal = state.mealEntries.find(item => entry.entityIds?.includes(item.id));
      const saved = entry.patch;
      const editedByAnotherAction = meal?.source === "edited"
        || (meal?.provenance?.editedAt != null && meal.provenance.editAuditId !== entry.id);
      if (!meal || !saved || meal.auditId !== entry.id || editedByAnotherAction
        || meal.name !== saved.name || meal.type !== saved.mealType
        || meal.calories !== saved.calories || meal.protein !== saved.protein
        || meal.carbs !== saved.carbs || meal.fat !== saved.fat) {
        return { ok: false, summary: "The meal has changed since Jarvis saved it." };
      }
      set(s => ({ ...s, mealEntries: s.mealEntries.filter(item => item.id !== meal.id) }));
      break;
    }
    case "cardio": set(s => ({ ...s, cardioEntries: s.cardioEntries.filter(e => !(entry.entityIds ?? []).includes(e.id)) })); break;
    case "workoutStart":
      return { ok: false, summary: "Use the workout screen to discard an active workout after checking for saved sets." };
    case "restTimer": {
      const active = state.activeWorkout;
      if (!active || !entry.entityIds?.includes(active.id) || active.restEndsAt !== entry.patch?.restEndsAt) {
        return { ok: false, summary: "The rest timer has changed since that action." };
      }
      const restored = { ...active };
      if (typeof entry.patch?.prev === "number") restored.restEndsAt = entry.patch.prev;
      else delete restored.restEndsAt;
      set(s => ({ ...s, activeWorkout: restored }));
      break;
    }
    case "workout":
      if (entry.tool === "finishActiveWorkout") return { ok: false, summary: "Review the saved workout in Training history." };
      set(s => ({ ...s, workouts: s.workouts.filter(e => !(entry.entityIds ?? []).includes(e.id)), activeWorkout: s.activeWorkout && (entry.entityIds ?? []).includes(s.activeWorkout.id) ? null : s.activeWorkout })); break;
    case "activeSet":
    case "activeSetEdit":
    case "activeSetDelete": {
      const active = state.activeWorkout;
      const patch = entry.patch as { workoutId?: string; exerciseEntryId?: string; prev?: SetEntry; next?: SetEntry; order?: string[]; index?: number; restKey?: string; restEndsAt?: number; previousRestEndsAt?: number } | undefined;
      const row = active?.exercises.find(item => item.id === patch?.exerciseEntryId);
      if (!active || active.id !== patch?.workoutId || !row) {
        return { ok: false, summary: "The original active workout or exercise is unavailable." };
      }
      let sets = row.sets;
      if (entry.entityKind === "activeSetDelete") {
        if (!patch.prev || patch.index === undefined || !patch.order
          || JSON.stringify(sets.map(item => item.id)) !== JSON.stringify(patch.order)
          || active.exercises.some(item => item.sets.some(set => set.id === patch.prev?.id))) {
          return { ok: false, summary: "The exercise has changed since that set was removed." };
        }
        sets = [...sets.slice(0, patch.index), patch.prev, ...sets.slice(patch.index)];
      } else {
        const current = sets.find(item => item.id === entry.entityIds?.[0]);
        if (!current || !patch.next || !sameWorkoutSet(current, patch.next)) {
          return { ok: false, summary: "That set has changed since Jarvis saved it." };
        }
        sets = sets.flatMap(item => item.id === current.id ? (patch.prev ? [patch.prev] : []) : [item]);
      }
      const restored = { ...active };
      if (patch.restKey) restored.restLoggedSetKeys = active.restLoggedSetKeys?.filter(key => key !== patch.restKey);
      if (patch.restEndsAt !== undefined && active.restEndsAt === patch.restEndsAt) {
        if (patch.previousRestEndsAt === undefined) delete restored.restEndsAt;
        else restored.restEndsAt = patch.previousRestEndsAt;
      }
      set(s => ({ ...s, activeWorkout: {
        ...restored, exercises: active.exercises.map(item => item.id === row.id
          ? { ...row, sets, completed: sets.length > 0 && sets.every(entry => entry.completed) }
          : item),
      } }));
      break;
    }
    case "mealPortionEdit": {
      const current = state.mealEntries.find(item => entry.entityIds?.includes(item.id));
      const patch = entry.patch as { prev?: MealEntry; index?: number; expected?: MealItem; totals?: Pick<MealEntry, "calories"|"protein"|"carbs"|"fat"> } | undefined;
      const index = patch?.index;
      const item = index === undefined ? undefined : current?.items?.[index];
      const old = index === undefined ? undefined : patch?.prev?.items?.[index];
      const previous = patch?.prev, expected = patch?.expected, totals = patch?.totals;
      const fields = ["calories", "protein", "carbs", "fat"] as const;
      if (!current || current.macroStatus === "unreported" || !item || !old || !previous || previous.macroStatus === "unreported" || !expected || !totals
        || current.provenance?.editAuditId !== entry.id || item.name !== expected.name || item.qty !== expected.qty
        || fields.some(field => item[field] !== expected[field] || current[field] !== totals[field])) {
        return { ok: false, summary: "The meal has changed since Jarvis corrected its portion." };
      }
      const restored = { ...current, calories: previous.calories, protein: previous.protein,
        carbs: previous.carbs, fat: previous.fat, provenance: previous.provenance,
        source: previous.source, confirmed: previous.confirmed,
        items: current.items?.map((row, position) => position === index ? old : row) };
      set(s => ({ ...s, mealEntries: s.mealEntries.map(row => row.id === current.id ? restored : row) }));
      break;
    }
    case "mealEdit": {
      const previous = entry.patch?.prev as MealEntry | undefined;
      const current = state.mealEntries.find(meal => meal.id === previous?.id);
      if (!previous || current?.provenance?.editAuditId !== entry.id) {
        return { ok: false, summary: "The meal has changed since Jarvis edited it." };
      }
      set(s => ({ ...s, mealEntries: s.mealEntries.map(meal => meal.id === previous.id ? previous : meal) }));
      break;
    }
    case "mealDelete": {
      const previous = entry.patch?.prev as MealEntry | undefined;
      if (!previous || state.mealEntries.some(meal => meal.id === previous.id)) {
        return { ok: false, summary: "The deleted meal could not be restored safely." };
      }
      set(s => ({ ...s, mealEntries: [...s.mealEntries, previous] }));
      break;
    }
    case "checkinEdit": { const prev = (entry.patch as { prev?: RecoveryCheckIn } | undefined)?.prev; if (prev) set(s => ({ ...s, recoveryCheckIns: s.recoveryCheckIns.map(c => c.id === prev.id ? prev : c) })); break; }
    case "usualMeal": {
      const patch = entry.patch, slot = patch?.slot;
      if (!patch || !isUsualMealSlot(slot)) return { ok: false, summary: "This saved meal could not be restored safely." };
      const current = readUsualMeal(state, slot), savedMacros = readMealMacros(patch.macros);
      if (current.name !== patch.name || mealMacroFields.some(field => current.macros?.[field] !== savedMacros?.[field])) {
        return { ok: false, summary: "The saved meal preference has changed since that action." };
      }
      const previous = patch.prev as UsualMealPreference | undefined;
      set(s => writeUsualMeal(s, slot, { name: previous?.name, macros: readMealMacros(previous?.macros) }));
      break;
    }
    default: return { ok: false, summary: "This action cannot be undone here." };
  }
  const undoAuditId = uid();
  set(s => ({ ...s, jarvisAudit: [ { id: undoAuditId, tool: "undoLastAction", summary: `Undid: ${entry.summary}`, status: "undone" as const, entityIds: entry.entityIds, entityKind: entry.entityKind, createdAt: Date.now() }, ...s.jarvisAudit.map(a => a.id === auditId ? { ...a, undone: true, status: "undone" as const } : a) ].slice(0, 200) }));
  return { ok: true, summary: `Undid: ${entry.summary}`, auditId: undoAuditId };
}
