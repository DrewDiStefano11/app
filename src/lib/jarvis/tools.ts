import type { AppState, JarvisAuditEntry, UserGoalsProfile, JarvisSettings, Confidence, MealEntry, MealItem, SupplementLog, RecoveryCheckIn } from "../types";
import { uid, todayStart } from "../store";

/** A tool result returned to the model and rendered as a confirm card / text. */
export interface ToolResult {
  ok: boolean;
  summary: string;
  /** If true, the UI shows a confirm card before the action is applied. */
  needsConfirmation?: boolean;
  /** Audit entry created by the tool (for undo). */
  auditId?: string;
  /** Arbitrary structured payload echoed to the model. */
  data?: unknown;
  error?: string;
}

export type ToolName =
  | "getTodaySummary" | "getNutritionStatus" | "getTrainingStatus"
  | "getRecoveryStatus" | "getProgressTrends"
  | "getUserGoalsProfile" | "updateUserGoalsProfile"
  | "getJarvisSettings" | "updateJarvisSettings"
  | "logBodyWeight" | "logSupplement" | "logDailyCheckIn"
  | "undoLastAction" | "saveJarvisLearning" | "getJarvisLearnedPreferences"
  // Phase 2
  | "logMeal" | "updateMeal" | "deleteMeal" | "getMealHistory"
  | "getUsualMeals" | "saveUsualMeal" | "logUsualMeal"
  | "getSupplementStatus" | "getMissedHabits"
  | "getDailyReviewSummary" | "updateDailyCheckIn" | "suggestNutritionAction";

export interface ToolSpec {
  name: ToolName;
  description: string;
  /** JSON-schema parameters object (OpenAI tool format). */
  parameters: Record<string, unknown>;
}

/** OpenAI-compatible tool descriptors sent to the model. */
export const TOOL_SPECS: ToolSpec[] = [
  { name: "getTodaySummary", description: "Get a snapshot of the user's today: calories, protein, last workout, last check-in.", parameters: { type: "object", properties: {} } },
  { name: "getNutritionStatus", description: "Current calories/macros vs goals for today.", parameters: { type: "object", properties: {} } },
  { name: "getTrainingStatus", description: "Recent workouts and current training week summary.", parameters: { type: "object", properties: {} } },
  { name: "getRecoveryStatus", description: "Latest soreness / sleep / recovery check-in.", parameters: { type: "object", properties: {} } },
  { name: "getProgressTrends", description: "Bodyweight and workout trends over recent weeks.", parameters: { type: "object", properties: {} } },
  { name: "getUserGoalsProfile", description: "Read the user's goals and profile (goal, calorie/protein targets, usual meals, etc).", parameters: { type: "object", properties: {} } },
  { name: "updateUserGoalsProfile", description: "Update one or more goal/profile fields. Always requires user confirmation.",
    parameters: { type: "object", properties: { patch: { type: "object", description: "Partial UserGoalsProfile" } }, required: ["patch"] } },
  { name: "getJarvisSettings", description: "Read current Jarvis settings.", parameters: { type: "object", properties: {} } },
  { name: "updateJarvisSettings", description: "Update Jarvis settings. Always requires user confirmation.",
    parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] } },
  { name: "logBodyWeight", description: "Log a bodyweight measurement in pounds. Auto-saves when autoLogBodyweight is on.",
    parameters: { type: "object", properties: { weightLb: { type: "number" }, notes: { type: "string" }, originalText: { type: "string" } }, required: ["weightLb"] } },
  { name: "logSupplement", description: "Log a supplement intake (e.g. creatine). Auto-saves when autoLogSupplements is on.",
    parameters: { type: "object", properties: { name: { type: "string" }, notes: { type: "string" }, originalText: { type: "string" } }, required: ["name"] } },
  { name: "logDailyCheckIn", description: "Log a daily recovery check-in (1-10 scales).",
    parameters: { type: "object", properties: {
      energy: { type: "number" }, soreness: { type: "number" }, stress: { type: "number" }, motivation: { type: "number" },
      notes: { type: "string" }, originalText: { type: "string" },
    }, required: ["energy", "soreness", "stress", "motivation"] } },
  { name: "undoLastAction", description: "Undo the most recent Jarvis action.", parameters: { type: "object", properties: {} } },
  { name: "saveJarvisLearning", description: "Save a learned preference (e.g. usualRicePortion=2 cups).",
    parameters: { type: "object", properties: { key: { type: "string" }, value: {} }, required: ["key", "value"] } },
  { name: "getJarvisLearnedPreferences", description: "Get all learned preferences.", parameters: { type: "object", properties: {} } },
  /* ---------- Phase 2: nutrition / supplements / review ---------- */
  { name: "logMeal", description: "Log a meal with totals (and optional items). Use after estimateFoodFromText OR when user provides exact macros. Always shows confirm card unless settings.autoLogMealEstimates is on AND confidence is high.",
    parameters: { type: "object", properties: {
      name: { type: "string" }, mealType: { type: "string" },
      calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" }, fiber: { type: "number" },
      items: { type: "array", items: { type: "object" } },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      assumptions: { type: "array", items: { type: "string" } },
      originalText: { type: "string" },
      source: { type: "string" },
    }, required: ["name", "mealType", "calories", "protein", "carbs", "fat"] } },
  { name: "updateMeal", description: "Update one of the user's recent meals by id.",
    parameters: { type: "object", properties: { id: { type: "string" }, patch: { type: "object" } }, required: ["id", "patch"] } },
  { name: "deleteMeal", description: "Delete a meal by id. Always requires confirmation.",
    parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "getMealHistory", description: "Recent meals (default last 14 days, max 30).",
    parameters: { type: "object", properties: { days: { type: "number" } } } },
  { name: "getUsualMeals", description: "Get the user's saved usual meals (breakfast/lunch/dinner/snack/protein shake/pre/post-workout).", parameters: { type: "object", properties: {} } },
  { name: "saveUsualMeal", description: "Save or update a usual meal slot with macros. slot: breakfast|lunch|dinner|snack|proteinShake|preWorkout|postWorkout.",
    parameters: { type: "object", properties: {
      slot: { type: "string", enum: ["breakfast","lunch","dinner","snack","proteinShake","preWorkout","postWorkout"] },
      name: { type: "string" }, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" },
    }, required: ["slot", "name"] } },
  { name: "logUsualMeal", description: "Log one of the user's saved usual meals (uses saved macros if available, else the profile name).",
    parameters: { type: "object", properties: { slot: { type: "string", enum: ["breakfast","lunch","dinner","snack","proteinShake","preWorkout","postWorkout"] } }, required: ["slot"] } },
  { name: "getSupplementStatus", description: "What supplements were taken today vs the user's routine.", parameters: { type: "object", properties: {} } },
  { name: "getMissedHabits", description: "Habits the user normally tracks but missed today (creatine, protein target, weigh-in, etc).", parameters: { type: "object", properties: {} } },
  { name: "getDailyReviewSummary", description: "A full daily review: calories/protein/macros, meals, supplements, check-in, suggestions.", parameters: { type: "object", properties: {} } },
  { name: "updateDailyCheckIn", description: "Update / patch today's most recent check-in (use to add pain, sickness, sleep quality, appetite, etc).",
    parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] } },
  { name: "suggestNutritionAction", description: "Get a single concrete nutrition suggestion for right now based on goals + today's intake.", parameters: { type: "object", properties: {} } },
];

/* --------------------------- Handlers --------------------------- */

export type Updater = (u: (s: AppState) => AppState) => void;

function pushAudit(set: Updater, entry: JarvisAuditEntry) {
  set(s => ({ ...s, jarvisAudit: [entry, ...s.jarvisAudit].slice(0, 200) }));
}

function todaysMealsTotal(s: AppState) {
  const t = todayStart();
  return s.mealEntries.filter(m => m.createdAt >= t).reduce(
    (a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export interface RunContext {
  state: AppState;
  set: Updater;
  settings: JarvisSettings;
}

export type ToolHandler = (args: Record<string, unknown>, ctx: RunContext) => ToolResult;

const handlers: Record<ToolName, ToolHandler> = {
  getTodaySummary: (_a, { state }) => {
    const tot = todaysMealsTotal(state);
    const tgt = state.nutritionTargets;
    const last = state.workouts[state.workouts.length - 1];
    const ci = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
    return { ok: true, summary: "today snapshot", data: {
      calories: `${tot.calories} / ${tgt.calories}`,
      protein: `${tot.protein}g / ${tgt.protein}g`,
      lastWorkout: last ? { name: last.name, daysAgo: Math.floor((Date.now() - last.startedAt) / 86400000) } : null,
      lastCheckIn: ci ? { energy: ci.energy, soreness: ci.soreness, stress: ci.stress } : null,
    } };
  },
  getNutritionStatus: (_a, { state }) => {
    const tot = todaysMealsTotal(state);
    return { ok: true, summary: "nutrition today", data: { totals: tot, targets: state.nutritionTargets } };
  },
  getTrainingStatus: (_a, { state }) => {
    const week = state.workouts.filter(w => w.startedAt > Date.now() - 7 * 86400000);
    return { ok: true, summary: "training status", data: {
      thisWeek: week.length,
      recent: state.workouts.slice(-5).map(w => ({ name: w.name, when: w.startedAt, exercises: w.exercises.length })),
      activeWorkout: state.activeWorkout?.name ?? null,
    } };
  },
  getRecoveryStatus: (_a, { state }) => ({
    ok: true, summary: "recovery status", data: {
      lastCheckIn: state.recoveryCheckIns[state.recoveryCheckIns.length - 1] ?? null,
      lastSleep: state.sleepEntries[state.sleepEntries.length - 1] ?? null,
      muscleFatigue: state.muscleFatigue,
    },
  }),
  getProgressTrends: (_a, { state }) => ({
    ok: true, summary: "progress trends", data: {
      bodyweight: state.bodyweightEntries.slice(-8),
      prCount: state.prs.length,
      goals: state.goals,
    },
  }),
  getUserGoalsProfile: (_a, { state }) => ({ ok: true, summary: "user profile", data: state.userGoalsProfile }),
  updateUserGoalsProfile: (args, { set, state }) => {
    const patch = (args.patch ?? {}) as Partial<UserGoalsProfile>;
    const auditId = uid();
    const prev = state.userGoalsProfile;
    const summary = `Update profile: ${Object.keys(patch).join(", ")}`;
    pushAudit(set, { id: auditId, tool: "updateUserGoalsProfile", summary, status: "suggested", patch: patch as Record<string, unknown>, createdAt: Date.now(), entityKind: "profile" });
    set(s => ({ ...s, userGoalsProfile: { ...s.userGoalsProfile, ...patch } }));
    // store prev in audit for undo
    set(s => ({ ...s, jarvisAudit: s.jarvisAudit.map(a => a.id === auditId ? { ...a, status: "logged", patch: { next: patch, prev } } : a) }));
    return { ok: true, summary, auditId, needsConfirmation: true };
  },
  getJarvisSettings: (_a, { state }) => ({ ok: true, summary: "jarvis settings", data: state.jarvisSettings }),
  updateJarvisSettings: (args, { set, state }) => {
    const patch = (args.patch ?? {}) as Partial<JarvisSettings>;
    const auditId = uid();
    const prev = state.jarvisSettings;
    set(s => ({ ...s, jarvisSettings: { ...s.jarvisSettings, ...patch } }));
    pushAudit(set, { id: auditId, tool: "updateJarvisSettings", summary: `Update Jarvis settings: ${Object.keys(patch).join(", ")}`, status: "logged", patch: { next: patch, prev } as Record<string, unknown>, createdAt: Date.now(), entityKind: "jarvisSettings" });
    return { ok: true, summary: "Settings updated", auditId, needsConfirmation: true };
  },
  logBodyWeight: (args, { set, settings }) => {
    const weightLb = Number(args.weightLb);
    if (!Number.isFinite(weightLb) || weightLb < 40 || weightLb > 700) return { ok: false, summary: "invalid weight", error: "Weight must be 40–700 lb" };
    const id = uid();
    const auditId = uid();
    const notes = typeof args.notes === "string" ? args.notes : undefined;
    const originalText = typeof args.originalText === "string" ? args.originalText : undefined;
    set(s => ({ ...s, bodyweightEntries: [...s.bodyweightEntries, { id, weightLb, notes, createdAt: Date.now() }] }));
    const summary = `Logged ${weightLb} lb`;
    pushAudit(set, { id: auditId, tool: "logBodyWeight", summary, status: "logged", originalText, confidence: "high", entityIds: [id], entityKind: "bodyweight", patch: { weightLb }, createdAt: Date.now() });
    return { ok: true, summary, auditId, needsConfirmation: !settings.autoLogBodyweight };
  },
  logSupplement: (args, { set, settings }) => {
    const name = String(args.name ?? "").trim();
    if (!name) return { ok: false, summary: "missing name", error: "Supplement name required" };
    const id = uid();
    const auditId = uid();
    const dose = typeof args.dose === "string" ? args.dose : undefined;
    const notes = typeof args.notes === "string" ? args.notes : undefined;
    const originalText = typeof args.originalText === "string" ? args.originalText : undefined;
    const entry: SupplementLog = { id, name, dose, notes, createdAt: Date.now(), source: "jarvis", auditId };
    set(s => ({ ...s, supplementLogs: [...s.supplementLogs, entry] }));
    const summary = `Logged ${name}${dose ? ` (${dose})` : ""}`;
    pushAudit(set, { id: auditId, tool: "logSupplement", summary, status: "logged", originalText, confidence: "high", entityIds: [id], entityKind: "supplement", patch: { name, dose }, createdAt: Date.now() });
    return { ok: true, summary, auditId, needsConfirmation: !settings.autoLogSupplements };
  },
  logDailyCheckIn: (args, { set }) => {
    const energy = clamp10(args.energy), soreness = clamp10(args.soreness), stress = clamp10(args.stress), motivation = clamp10(args.motivation);
    if ([energy, soreness, stress, motivation].some(v => v == null)) return { ok: false, summary: "invalid scales", error: "Scales must be 1–10" };
    const id = uid();
    const auditId = uid();
    const notes = typeof args.notes === "string" ? args.notes : undefined;
    const originalText = typeof args.originalText === "string" ? args.originalText : undefined;
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id, energy: energy!, soreness: soreness!, stress: stress!, motivation: motivation!, notes, createdAt: Date.now() }] }));
    const summary = `Daily check-in: energy ${energy}, soreness ${soreness}, stress ${stress}, motivation ${motivation}`;
    pushAudit(set, { id: auditId, tool: "logDailyCheckIn", summary, status: "logged", originalText, confidence: "high" as Confidence, entityIds: [id], entityKind: "checkin", createdAt: Date.now() });
    return { ok: true, summary, auditId };
  },
  undoLastAction: (_a, { state, set }) => {
    const last = state.jarvisAudit.find(a => !a.undone && a.status === "logged");
    if (!last) return { ok: false, summary: "nothing to undo", error: "No recent action found" };
    return undoAuditEntry(last.id, state, set);
  },
  saveJarvisLearning: (args, { set, settings }) => {
    if (!settings.learningEnabled) return { ok: false, summary: "learning disabled", error: "Memory/learning is off in Jarvis Settings" };
    const key = String(args.key ?? "").trim();
    if (!key) return { ok: false, summary: "missing key", error: "key required" };
    set(s => ({ ...s, jarvisLearning: { ...s.jarvisLearning, [key]: args.value } }));
    return { ok: true, summary: `Learned: ${key}` };
  },
  getJarvisLearnedPreferences: (_a, { state }) => ({ ok: true, summary: "learned prefs", data: state.jarvisLearning }),

  /* ============ Phase 2 ============ */

  logMeal: (args, { set, settings }) => {
    const name = String(args.name ?? "").trim() || "Meal";
    const mealType = String(args.mealType ?? "snack");
    const calories = Math.round(Number(args.calories) || 0);
    const protein = Math.round(Number(args.protein) || 0);
    const carbs = Math.round(Number(args.carbs) || 0);
    const fat = Math.round(Number(args.fat) || 0);
    const fiber = args.fiber != null ? Math.round(Number(args.fiber) || 0) : undefined;
    const confidence = (args.confidence as Confidence) || "medium";
    const assumptions = Array.isArray(args.assumptions) ? (args.assumptions as unknown[]).map(String) : undefined;
    const originalText = typeof args.originalText === "string" ? args.originalText : undefined;
    const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]).map(it => ({
      name: String(it.name ?? "item"),
      qty: typeof it.qty === "string" ? it.qty : undefined,
      calories: Math.round(Number(it.calories) || 0),
      protein: Math.round(Number(it.protein) || 0),
      carbs: Math.round(Number(it.carbs) || 0),
      fat: Math.round(Number(it.fat) || 0),
      source: (it.source as MealItem["source"]) ?? "jarvis",
      confidence: (it.confidence as Confidence) ?? confidence,
    } satisfies MealItem)) : undefined;
    if (calories <= 0 && protein <= 0) return { ok: false, summary: "empty meal", error: "Meal needs at least some macros." };

    const id = uid();
    const auditId = uid();
    const source = (typeof args.source === "string" ? args.source : "jarvis") as MealEntry["source"];
    const entry: MealEntry = {
      id, name, type: mealType, calories, protein, carbs, fat, fiber,
      items, source, confidence, originalText, assumptions,
      confirmed: false, auditId, createdAt: Date.now(),
    };
    set(s => ({ ...s, mealEntries: [...s.mealEntries, entry] }));
    const summary = `Logged ${name} — ${calories} kcal, ${protein}g P / ${carbs}g C / ${fat}g F`;
    pushAudit(set, { id: auditId, tool: "logMeal", summary, status: "logged", originalText, confidence, assumptions, entityIds: [id], entityKind: "meal", patch: { name, mealType, calories, protein, carbs, fat }, createdAt: Date.now() });
    // Auto-log meal estimates only when explicitly enabled and confidence is high.
    const needsConfirmation = settings.askBeforeMealEstimates && !(settings.autoLogMealEstimates && confidence === "high");
    return { ok: true, summary, auditId, needsConfirmation, data: { id, calories, protein, carbs, fat, fiber, items, confidence, assumptions } };
  },

  updateMeal: (args, { set, state }) => {
    const id = String(args.id ?? "");
    const meal = state.mealEntries.find(m => m.id === id);
    if (!meal) return { ok: false, summary: "meal not found", error: "Meal id not found" };
    const patch = (args.patch ?? {}) as Partial<MealEntry>;
    const prev = { ...meal };
    set(s => ({ ...s, mealEntries: s.mealEntries.map(m => m.id === id ? { ...m, ...patch, source: "edited" } : m) }));
    const auditId = uid();
    pushAudit(set, { id: auditId, tool: "updateMeal", summary: `Edited meal: ${meal.name}`, status: "logged", entityIds: [id], entityKind: "mealEdit", patch: { prev, next: patch }, createdAt: Date.now() });
    return { ok: true, summary: `Updated ${meal.name}`, auditId, needsConfirmation: true };
  },

  deleteMeal: (args, { set, state }) => {
    const id = String(args.id ?? "");
    const meal = state.mealEntries.find(m => m.id === id);
    if (!meal) return { ok: false, summary: "meal not found", error: "Meal id not found" };
    const auditId = uid();
    pushAudit(set, { id: auditId, tool: "deleteMeal", summary: `Delete meal: ${meal.name}`, status: "suggested", entityIds: [id], entityKind: "mealDelete", patch: { prev: meal }, createdAt: Date.now() });
    set(s => ({ ...s, mealEntries: s.mealEntries.filter(m => m.id !== id), jarvisAudit: s.jarvisAudit.map(a => a.id === auditId ? { ...a, status: "logged" } : a) }));
    return { ok: true, summary: `Deleted ${meal.name}`, auditId, needsConfirmation: true };
  },

  getMealHistory: (args, { state }) => {
    const days = Math.min(30, Math.max(1, Number(args.days) || 14));
    const cutoff = Date.now() - days * 86400000;
    const meals = state.mealEntries.filter(m => m.createdAt >= cutoff).slice(-50).map(m => ({
      id: m.id, name: m.name, type: m.type, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
      when: m.createdAt, confidence: m.confidence, source: m.source,
    }));
    return { ok: true, summary: `${meals.length} meals in last ${days}d`, data: meals };
  },

  getUsualMeals: (_a, { state }) => {
    const p = state.userGoalsProfile;
    const learned = state.jarvisLearning as Record<string, unknown>;
    const get = (k: string) => learned[`usualMeal_${k}`];
    return { ok: true, summary: "usual meals", data: {
      breakfast: { name: p.usualBreakfast, macros: get("breakfast") },
      lunch: { name: p.usualLunch, macros: get("lunch") },
      dinner: { name: p.usualDinner, macros: get("dinner") },
      snack: { name: p.usualSnack, macros: get("snack") },
      proteinShake: { name: p.usualProteinShake, macros: get("proteinShake") },
      preWorkout: { name: p.usualPreWorkoutMeal, macros: get("preWorkout") },
      postWorkout: { name: p.usualPostWorkoutMeal, macros: get("postWorkout") },
    } };
  },

  saveUsualMeal: (args, { set, state }) => {
    const slot = String(args.slot ?? "");
    const name = String(args.name ?? "").trim();
    if (!slot || !name) return { ok: false, summary: "missing slot/name", error: "slot and name required" };
    const macros = {
      calories: Math.round(Number(args.calories) || 0),
      protein: Math.round(Number(args.protein) || 0),
      carbs: Math.round(Number(args.carbs) || 0),
      fat: Math.round(Number(args.fat) || 0),
    };
    const slotToField: Record<string, keyof UserGoalsProfile> = {
      breakfast: "usualBreakfast", lunch: "usualLunch", dinner: "usualDinner", snack: "usualSnack",
      proteinShake: "usualProteinShake", preWorkout: "usualPreWorkoutMeal", postWorkout: "usualPostWorkoutMeal",
    };
    const field = slotToField[slot];
    if (!field) return { ok: false, summary: "unknown slot", error: `Unknown slot: ${slot}` };
    const prev = { name: state.userGoalsProfile[field], macros: (state.jarvisLearning as Record<string, unknown>)[`usualMeal_${slot}`] };
    set(s => ({
      ...s,
      userGoalsProfile: { ...s.userGoalsProfile, [field]: name },
      jarvisLearning: { ...s.jarvisLearning, [`usualMeal_${slot}`]: macros },
    }));
    const auditId = uid();
    pushAudit(set, { id: auditId, tool: "saveUsualMeal", summary: `Saved usual ${slot}: ${name}`, status: "logged", entityKind: "usualMeal", patch: { slot, name, macros, prev }, createdAt: Date.now() });
    return { ok: true, summary: `Saved usual ${slot}: ${name}`, auditId };
  },

  logUsualMeal: (args, { set, state, settings }) => {
    const slot = String(args.slot ?? "");
    const slotToField: Record<string, keyof UserGoalsProfile> = {
      breakfast: "usualBreakfast", lunch: "usualLunch", dinner: "usualDinner", snack: "usualSnack",
      proteinShake: "usualProteinShake", preWorkout: "usualPreWorkoutMeal", postWorkout: "usualPostWorkoutMeal",
    };
    const field = slotToField[slot];
    if (!field) return { ok: false, summary: "unknown slot", error: `Unknown slot: ${slot}` };
    const name = state.userGoalsProfile[field] as string | undefined;
    if (!name) return { ok: false, summary: "no usual saved", error: `No usual ${slot} saved. Set one in Goals & Profile.` };
    const macros = ((state.jarvisLearning as Record<string, unknown>)[`usualMeal_${slot}`] ?? {}) as { calories?: number; protein?: number; carbs?: number; fat?: number };
    const calories = macros.calories ?? 0, protein = macros.protein ?? 0, carbs = macros.carbs ?? 0, fat = macros.fat ?? 0;

    const id = uid();
    const auditId = uid();
    const entry: MealEntry = {
      id, name, type: slot === "proteinShake" ? "snack" : slot === "preWorkout" ? "pre-workout" : slot === "postWorkout" ? "post-workout" : slot,
      calories, protein, carbs, fat,
      source: "jarvis-confirmed", confidence: macros.calories ? "high" : "medium",
      assumptions: macros.calories ? [`Used saved macros for usual ${slot}`] : [`Used profile name "${name}"; macros not saved`],
      confirmed: false, auditId, createdAt: Date.now(),
    };
    set(s => ({ ...s, mealEntries: [...s.mealEntries, entry] }));
    const summary = `Logged usual ${slot}: ${name}${macros.calories ? ` — ${calories} kcal` : ""}`;
    pushAudit(set, { id: auditId, tool: "logUsualMeal", summary, status: "logged", confidence: macros.calories ? "high" : "medium", entityIds: [id], entityKind: "meal", patch: { slot, name }, createdAt: Date.now() });
    return { ok: true, summary, auditId, needsConfirmation: settings.askBeforeMealEstimates && !macros.calories };
  },

  getSupplementStatus: (_a, { state }) => {
    const t = todayStart();
    const today = state.supplementLogs.filter(s => s.createdAt >= t);
    const routine = state.userGoalsProfile.supplementRoutine ?? [];
    const takenNames = today.map(s => s.name.toLowerCase());
    const missing = routine.filter(r => !takenNames.some(t => t.includes(r.toLowerCase())));
    return { ok: true, summary: `${today.length} taken today`, data: {
      takenToday: today.map(s => ({ name: s.name, when: s.createdAt, dose: s.dose })),
      routine, missing,
    } };
  },

  getMissedHabits: (_a, { state }) => {
    const t = todayStart();
    const missed: { habit: string; reason: string }[] = [];
    const totals = todaysMealsTotal(state);
    const target = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories;
    const ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein;
    if (totals.protein < ptarget * 0.7 && Date.now() - t > 12 * 3600000) missed.push({ habit: "protein", reason: `${totals.protein}g / ${ptarget}g target` });
    if (totals.calories < target * 0.5 && Date.now() - t > 14 * 3600000) missed.push({ habit: "calories", reason: `${totals.calories} / ${target} kcal` });
    const routine = state.userGoalsProfile.supplementRoutine ?? [];
    const takenNames = state.supplementLogs.filter(s => s.createdAt >= t).map(s => s.name.toLowerCase());
    routine.forEach(r => { if (!takenNames.some(n => n.includes(r.toLowerCase()))) missed.push({ habit: `supplement: ${r}`, reason: "not logged today" }); });
    const todayWeighIn = state.bodyweightEntries.some(b => b.createdAt >= t);
    if (!todayWeighIn && state.userGoalsProfile.normalWeighInTime) missed.push({ habit: "weigh-in", reason: "not logged today" });
    const todayCheckIn = state.recoveryCheckIns.some(c => c.createdAt >= t);
    if (!todayCheckIn) missed.push({ habit: "check-in", reason: "no daily check-in yet" });
    return { ok: true, summary: `${missed.length} missed habits`, data: missed };
  },

  getDailyReviewSummary: (_a, { state }) => {
    const t = todayStart();
    const totals = todaysMealsTotal(state);
    const target = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories;
    const ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein;
    const meals = state.mealEntries.filter(m => m.createdAt >= t);
    const supps = state.supplementLogs.filter(s => s.createdAt >= t);
    const ci = state.recoveryCheckIns.filter(c => c.createdAt >= t).slice(-1)[0];
    const bw = state.bodyweightEntries.filter(b => b.createdAt >= t).slice(-1)[0];
    const workout = state.workouts.find(w => w.startedAt >= t);
    const lowConfMeals = meals.filter(m => m.confidence === "low").length;
    const suggestions: string[] = [];
    if (totals.protein < ptarget) suggestions.push(`${ptarget - totals.protein}g protein remaining — a shake gets you close.`);
    if (totals.calories < target * 0.7) suggestions.push(`Only ${totals.calories} kcal so far. ${state.userGoalsProfile.goal === "bulk" ? "Bulking: add a bigger dinner or snack." : "Check if you missed logging meals."}`);
    if (totals.calories > target * 1.05) suggestions.push(`Over calorie target by ${totals.calories - target} kcal — keep remaining meals lighter.`);
    return { ok: true, summary: "daily review", data: {
      calories: { logged: totals.calories, target, remaining: Math.max(0, target - totals.calories) },
      protein: { logged: totals.protein, target: ptarget, remaining: Math.max(0, ptarget - totals.protein) },
      macros: totals,
      mealsLogged: meals.length,
      lowConfidenceMeals: lowConfMeals,
      supplementsToday: supps.map(s => s.name),
      bodyweight: bw?.weightLb ?? null,
      checkIn: ci ? { energy: ci.energy, soreness: ci.soreness, stress: ci.stress, motivation: ci.motivation, notes: ci.notes } : null,
      workoutToday: workout ? workout.name : null,
      suggestions,
    } };
  },

  updateDailyCheckIn: (args, { set, state }) => {
    const t = todayStart();
    const last = [...state.recoveryCheckIns].reverse().find(c => c.createdAt >= t);
    if (!last) return { ok: false, summary: "no check-in today", error: "Run logDailyCheckIn first." };
    const patch = (args.patch ?? {}) as Partial<RecoveryCheckIn>;
    const prev = { ...last };
    set(s => ({ ...s, recoveryCheckIns: s.recoveryCheckIns.map(c => c.id === last.id ? { ...c, ...patch } : c) }));
    const auditId = uid();
    pushAudit(set, { id: auditId, tool: "updateDailyCheckIn", summary: "Updated today's check-in", status: "logged", entityIds: [last.id], entityKind: "checkinEdit", patch: { prev, next: patch }, createdAt: Date.now() });
    return { ok: true, summary: "Check-in updated", auditId };
  },

  suggestNutritionAction: (_a, { state, settings }) => {
    if (!settings.nutritionSuggestions) return { ok: true, summary: "nutrition suggestions off", data: { suggestion: null } };
    const totals = todaysMealsTotal(state);
    const ptarget = state.userGoalsProfile.proteinGoal ?? state.nutritionTargets.protein;
    const ctarget = state.userGoalsProfile.calorieGoal ?? state.nutritionTargets.calories;
    const goal = state.userGoalsProfile.goal;
    const proteinGap = ptarget - totals.protein;
    const calorieGap = ctarget - totals.calories;
    let suggestion = "Macros look on track.";
    if (proteinGap > 30) suggestion = `You're ${proteinGap}g short on protein. A protein shake or chicken would close the gap.`;
    else if (goal === "cut" && totals.calories > ctarget) suggestion = `Over by ${totals.calories - ctarget} kcal. Skip extras for the rest of the day.`;
    else if (goal === "bulk" && calorieGap > 500) suggestion = `Still ${calorieGap} kcal under your bulk target. Bigger dinner or a calorie-dense snack.`;
    return { ok: true, summary: suggestion, data: { suggestion, proteinGap, calorieGap, goal } };
  },
};

function clamp10(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(10, Math.round(n)));
}

export function runTool(name: string, args: Record<string, unknown>, ctx: RunContext): ToolResult {
  const h = handlers[name as ToolName];
  if (!h) return { ok: false, summary: `unknown tool ${name}`, error: "Unknown tool" };
  if (!ctx.settings.enabled) return { ok: false, summary: "jarvis disabled", error: "Jarvis is disabled in Settings" };
  // Permission gates: levels 1-2 → never auto-apply mutations; level >=3 honors auto-log toggles.
  return h(args, ctx);
}

/** Reverse an audited action. Returns a fresh ToolResult. */
export function undoAuditEntry(auditId: string, state: AppState, set: Updater): ToolResult {
  const entry = state.jarvisAudit.find(a => a.id === auditId);
  if (!entry || entry.undone) return { ok: false, summary: "nothing to undo" };
  switch (entry.entityKind) {
    case "bodyweight":
      set(s => ({ ...s, bodyweightEntries: s.bodyweightEntries.filter(e => !(entry.entityIds ?? []).includes(e.id)) }));
      break;
    case "supplement":
    case "checkin":
      set(s => ({ ...s, recoveryCheckIns: s.recoveryCheckIns.filter(e => !(entry.entityIds ?? []).includes(e.id)) }));
      break;
    case "profile": {
      const prev = (entry.patch as { prev?: Record<string, unknown> } | undefined)?.prev;
      if (prev) set(s => ({ ...s, userGoalsProfile: prev as UserGoalsProfile }));
      break;
    }
    case "jarvisSettings": {
      const prev = (entry.patch as { prev?: JarvisSettings } | undefined)?.prev;
      if (prev) set(s => ({ ...s, jarvisSettings: prev }));
      break;
    }
  }
  set(s => ({ ...s, jarvisAudit: s.jarvisAudit.map(a => a.id === auditId ? { ...a, undone: true, status: "undone" } : a) }));
  return { ok: true, summary: `Undid: ${entry.summary}` };
}