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
    const notes = typeof args.notes === "string" ? args.notes : undefined;
    const originalText = typeof args.originalText === "string" ? args.originalText : undefined;
    // Stored as a check-in note so it shows in recovery feed (Phase 2 will add a real supplement log).
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id, energy: 5, soreness: 5, stress: 5, motivation: 5, notes: `Supplement: ${name}${notes ? ` — ${notes}` : ""}`, createdAt: Date.now() }] }));
    const summary = `Logged ${name}`;
    pushAudit(set, { id: auditId, tool: "logSupplement", summary, status: "logged", originalText, confidence: "high", entityIds: [id], entityKind: "supplement", patch: { name }, createdAt: Date.now() });
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