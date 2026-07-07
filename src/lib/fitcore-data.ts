import type {
  AppState,
  ConfirmationStatus,
  DataProvenance,
  MealEntry,
  ProvenanceConfidence,
  ProvenanceSource,
  RecoveryCheckIn,
  RecoverySignal,
  Workout,
} from "./types";

export const FITCORE_STORAGE_KEY = "fitcore.v1";
export const FITCORE_DATA_VERSION = 4;
const LEGACY_KEYS = ["fitcore.state", "fitcore.data", "focus-lift-data", "fitcore.v0"];

export type FitCoreLogType =
  | "workout_session"
  | "workout_exercise"
  | "workout_set"
  | "meal"
  | "weigh_in"
  | "check_in"
  | "recovery_signal"
  | "body_metric"
  | "ai_event"
  | "template";
export type FitCoreLogSource = "manual" | "ai" | "camera" | "imported" | "barcode" | "health";
export interface FitCoreLog {
  id: string;
  type: FitCoreLogType;
  subtype?: string;
  createdAt: number;
  updatedAt: number;
  date: string;
  source: FitCoreLogSource;
  notes?: string;
  tags: string[];
  relatedIds: string[];
  metrics: Record<string, unknown>;
  rawInput?: string;
  confidence?: ProvenanceConfidence;
  provenance: DataProvenance;
}
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const isoDay = (n: number) => new Date(n).toISOString().slice(0, 10);
const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const norm = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const cleanText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const cleanAssumptions = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(String)
        .map((x) => x.trim())
        .filter(Boolean)
    : undefined;
const confidence = (value: unknown, fallback: ProvenanceConfidence): ProvenanceConfidence =>
  value === "high" || value === "medium" || value === "low" || value === "unknown"
    ? value
    : fallback;
const confirmation = (value: unknown, fallback: ConfirmationStatus): ConfirmationStatus =>
  value === "confirmed" || value === "unconfirmed" || value === "not-required" ? value : fallback;

export function createManualProvenance(): DataProvenance {
  return { source: "manual", confidence: "high", confirmation: "confirmed" };
}

export function createJarvisProvenance(
  options: {
    confidence?: ProvenanceConfidence;
    confirmed?: boolean;
    auditId?: string;
    originalText?: string;
    assumptions?: string[];
  } = {},
): DataProvenance {
  return {
    source: "jarvis",
    confidence: options.confidence ?? "high",
    confirmation: options.confirmed ? "confirmed" : "unconfirmed",
    auditId: cleanText(options.auditId),
    originalText: cleanText(options.originalText),
    assumptions: cleanAssumptions(options.assumptions),
  };
}

export function createAiEstimateProvenance(
  options: {
    confidence?: ProvenanceConfidence;
    confirmed?: boolean;
    auditId?: string;
    originalText?: string;
    assumptions?: string[];
  } = {},
): DataProvenance {
  return {
    ...createJarvisProvenance({ ...options, confidence: options.confidence ?? "low" }),
    source: "ai-estimated",
  };
}

export function markProvenanceEdited(
  provenance: DataProvenance | undefined,
  options: { editedBy: "user" | "jarvis"; editedAt?: number; auditId?: string },
): DataProvenance {
  const base = provenance ?? createManualProvenance();
  return {
    ...base,
    confirmation: options.editedBy === "user" ? "confirmed" : base.confirmation,
    editedBy: options.editedBy,
    editedAt: options.editedAt ?? Date.now(),
    editAuditId: cleanText(options.auditId),
  };
}

type ProvenanceInput =
  | DataProvenance
  | {
      provenance?: DataProvenance;
      confidence?: ProvenanceConfidence;
    };

function provenanceOf(value: ProvenanceInput | null | undefined): DataProvenance | undefined {
  if (!value) return undefined;
  if ("source" in value && "confirmation" in value) return value as DataProvenance;
  return value.provenance;
}

export function isLowConfidence(value: ProvenanceInput | null | undefined): boolean {
  const metadata = provenanceOf(value);
  return (metadata?.confidence ?? value?.confidence) === "low";
}

export function shouldRequireConfirmation(value: ProvenanceInput | null | undefined): boolean {
  const metadata = provenanceOf(value);
  if (!metadata || metadata.confirmation !== "unconfirmed") return false;
  return (
    metadata.source === "jarvis" ||
    metadata.source === "ai-estimated" ||
    metadata.confidence === "low" ||
    metadata.confidence === "unknown"
  );
}
const STATE_KEYS = new Set<keyof AppState>([
  "version",
  "onboardingComplete",
  "profile",
  "personalization",
  "nutritionTargets",
  "workouts",
  "activeWorkout",
  "workoutTemplates",
  "customExercises",
  "cardioEntries",
  "mealEntries",
  "bodyweightEntries",
  "sleepEntries",
  "recoveryCheckIns",
  "recoverySignals",
  "muscleFatigue",
  "prs",
  "goals",
  "progressPhotos",
  "aiMessages",
  "reminders",
  "demoMode",
  "jarvisSettings",
  "jarvisAudit",
  "jarvisLearning",
  "userGoalsProfile",
  "supplementLogs",
  "dismissedSuggestions",
]);
const ARRAY_KEYS = new Set<keyof AppState>([
  "workouts",
  "workoutTemplates",
  "customExercises",
  "cardioEntries",
  "mealEntries",
  "bodyweightEntries",
  "sleepEntries",
  "recoveryCheckIns",
  "recoverySignals",
  "prs",
  "goals",
  "progressPhotos",
  "aiMessages",
  "jarvisAudit",
  "supplementLogs",
  "dismissedSuggestions",
]);
const OBJECT_KEYS = new Set<keyof AppState>([
  "profile",
  "personalization",
  "nutritionTargets",
  "muscleFatigue",
  "reminders",
  "jarvisSettings",
  "jarvisLearning",
  "userGoalsProfile",
]);
const validStateField = (key: keyof AppState, field: unknown) => {
  if (ARRAY_KEYS.has(key)) return Array.isArray(field);
  if (OBJECT_KEYS.has(key)) return record(field);
  if (key === "onboardingComplete" || key === "demoMode") return typeof field === "boolean";
  if (key === "version") return Number.isFinite(field) && Number(field) >= 1;
  if (key === "activeWorkout") return field === null || record(field);
  return true;
};

/** Reject empty or shape-invalid data before it can replace known-good state. */
export function validateFitCorePayload(value: unknown): Partial<AppState> | null {
  if (!record(value)) return null;
  const keys = Object.keys(value).filter((key): key is keyof AppState =>
    STATE_KEYS.has(key as keyof AppState),
  );
  if (!keys.length) return null;
  for (const key of keys) {
    if (!validStateField(key, value[key])) return null;
  }
  return value as Partial<AppState>;
}

export function parseFitCoreImport(text: string): Partial<AppState> | null {
  try {
    return validateFitCorePayload(JSON.parse(text));
  } catch {
    return null;
  }
}

const parse = (raw: string | null): Partial<AppState> | null => {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    if (!record(value)) return null;
    const repaired = Object.fromEntries(
      Object.entries(value).filter(
        ([key, field]) =>
          STATE_KEYS.has(key as keyof AppState) && validStateField(key as keyof AppState, field),
      ),
    );
    return Object.keys(repaired).length ? (repaired as Partial<AppState>) : null;
  } catch {
    return null;
  }
};

export function loadFitCoreData(fallback: AppState): Partial<AppState> {
  if (typeof window === "undefined") return fallback;
  return (
    parse(localStorage.getItem(FITCORE_STORAGE_KEY)) ??
    LEGACY_KEYS.map((key) => parse(localStorage.getItem(key))).find(Boolean) ??
    fallback
  );
}

export function saveFitCoreData(state: AppState) {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(FITCORE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

const PROVENANCE_SOURCES = new Set<ProvenanceSource>([
  "manual",
  "jarvis",
  "ai-estimated",
  "imported",
  "wearable",
  "apple-health",
  "health-connect",
  "barcode",
  "system-derived",
]);

function normalizeProvenance(
  value: Record<string, unknown>,
  audit?: AppState["jarvisAudit"][number],
  sourceOverride?: ProvenanceSource,
): DataProvenance {
  const existing = record(value.provenance) ? value.provenance : {};
  const legacySource = String(value.source ?? "");
  const inferredSource: ProvenanceSource =
    sourceOverride ??
    (PROVENANCE_SOURCES.has(existing.source as ProvenanceSource)
      ? (existing.source as ProvenanceSource)
      : legacySource === "camera"
        ? "ai-estimated"
        : legacySource === "barcode"
          ? "barcode"
          : legacySource === "imported"
            ? "imported"
            : legacySource === "apple-health"
              ? "apple-health"
              : legacySource === "whoop"
                ? "wearable"
                : legacySource === "wearable" ||
                    legacySource === "health-connect" ||
                    legacySource === "system-derived"
                  ? legacySource
                  : audit ||
                      cleanText(value.auditId) ||
                      legacySource === "jarvis" ||
                      legacySource === "jarvis-confirmed"
                    ? "jarvis"
                    : "manual");
  const defaultConfidence: ProvenanceConfidence =
    inferredSource === "manual"
      ? "high"
      : (audit?.confidence ?? (inferredSource === "system-derived" ? "medium" : "unknown"));
  const explicitlyConfirmed =
    value.confirmed === true || legacySource === "jarvis-confirmed" || legacySource === "edited";
  const defaultConfirmation: ConfirmationStatus =
    inferredSource === "manual" || explicitlyConfirmed
      ? "confirmed"
      : [
            "imported",
            "wearable",
            "apple-health",
            "health-connect",
            "barcode",
            "system-derived",
          ].includes(inferredSource)
        ? "not-required"
        : "unconfirmed";
  return {
    source: inferredSource,
    confidence: confidence(
      existing.confidence ?? value.confidence ?? audit?.confidence,
      defaultConfidence,
    ),
    confirmation: confirmation(existing.confirmation, defaultConfirmation),
    auditId: cleanText(existing.auditId ?? value.auditId ?? audit?.id),
    originalText: cleanText(existing.originalText ?? value.originalText ?? audit?.originalText),
    assumptions: cleanAssumptions(existing.assumptions ?? value.assumptions ?? audit?.assumptions),
    editedBy:
      existing.editedBy === "user" || existing.editedBy === "jarvis"
        ? existing.editedBy
        : legacySource === "edited"
          ? "user"
          : undefined,
    editedAt: Number.isFinite(existing.editedAt)
      ? Number(existing.editedAt)
      : legacySource === "edited" && audit
        ? audit.createdAt
        : undefined,
    editAuditId:
      cleanText(existing.editAuditId) ?? (legacySource === "edited" ? audit?.id : undefined),
  };
}

function withProvenance<T extends object>(
  value: T,
  audit?: AppState["jarvisAudit"][number],
  sourceOverride?: ProvenanceSource,
): T & { provenance: DataProvenance } {
  return {
    ...value,
    provenance: normalizeProvenance(value as Record<string, unknown>, audit, sourceOverride),
  };
}

/** Existing domain arrays stay authoritative; helpers project them into one log shape. */
export function migrateFitCoreDataIfNeeded(input: AppState): AppState {
  const s = input;
  const timestamped = <T extends { id: string; createdAt: number }>(value: unknown) =>
    list<T>(value).filter(
      (x) => record(x) && typeof x.id === "string" && Number.isFinite(x.createdAt),
    );
  const jarvisAudit = timestamped<AppState["jarvisAudit"][number]>(s.jarvisAudit).filter(
    (x) => typeof x.tool === "string" && typeof x.summary === "string",
  );
  const auditFor = (entityId: string) =>
    jarvisAudit.find((x) => !x.undone && x.entityIds?.includes(entityId));
  const hydrateWorkout = (w: Workout) =>
    withProvenance(
      {
        ...w,
        exercises: w.exercises
          .filter(
            (e) =>
              record(e) &&
              typeof e.id === "string" &&
              typeof e.exerciseId === "string" &&
              Array.isArray(e.sets),
          )
          .map((e) =>
            withProvenance(
              {
                ...e,
                sets: e.sets
                  .filter((set) => record(set) && typeof set.id === "string")
                  .map((set) => withProvenance(set, auditFor(set.id))),
              },
              auditFor(e.id),
            ),
          ),
      },
      auditFor(w.id),
    );
  const workouts = list<Workout>(s.workouts)
    .filter(
      (w) =>
        record(w) &&
        typeof w.id === "string" &&
        Number.isFinite(w.startedAt) &&
        Array.isArray(w.exercises),
    )
    .map(hydrateWorkout);
  const activeWorkout =
    s.activeWorkout &&
    record(s.activeWorkout) &&
    typeof s.activeWorkout.id === "string" &&
    Number.isFinite(s.activeWorkout.startedAt) &&
    Array.isArray(s.activeWorkout.exercises)
      ? hydrateWorkout(s.activeWorkout)
      : null;
  const bodyweightEntries = list<AppState["bodyweightEntries"][number]>(s.bodyweightEntries)
    .filter(
      (x) =>
        record(x) &&
        typeof x.id === "string" &&
        Number.isFinite(x.weightLb) &&
        Number(x.weightLb) > 0 &&
        Number.isFinite(x.createdAt),
    )
    .map((x) => withProvenance(x, auditFor(x.id))) as AppState["bodyweightEntries"];
  const mealEntries = timestamped<AppState["mealEntries"][number]>(s.mealEntries)
    .filter(
      (x) =>
        Number.isFinite(x.calories) &&
        Number.isFinite(x.protein) &&
        Number.isFinite(x.carbs) &&
        Number.isFinite(x.fat),
    )
    .map((x) => withProvenance(x, auditFor(x.id)));
  const sleepEntries = timestamped<AppState["sleepEntries"][number]>(s.sleepEntries)
    .filter((x) => Number.isFinite(x.hours) && Number.isFinite(x.quality))
    .map((x) => withProvenance(x, auditFor(x.id)));
  const recoveryCheckIns = timestamped<AppState["recoveryCheckIns"][number]>(s.recoveryCheckIns)
    .filter((x) => [x.energy, x.soreness, x.stress, x.motivation].every(Number.isFinite))
    .map((x) => withProvenance(x, auditFor(x.id)));
  const latestWeight = [...bodyweightEntries].sort((a, b) => b.createdAt - a.createdAt)[0];
  const next: AppState = {
    ...s,
    version: Math.max(FITCORE_DATA_VERSION, Number(s.version) || 1),
    profile: { ...s.profile, ...(latestWeight ? { bodyweightLb: latestWeight.weightLb } : {}) },
    workouts,
    activeWorkout,
    workoutTemplates: list(s.workoutTemplates),
    customExercises: timestamped(s.customExercises),
    cardioEntries: timestamped<AppState["cardioEntries"][number]>(s.cardioEntries).map((x) =>
      withProvenance(x, auditFor(x.id)),
    ),
    mealEntries,
    bodyweightEntries,
    sleepEntries,
    recoveryCheckIns,
    prs: list(s.prs),
    goals: list(s.goals).map((goal) => {
      if (!record(goal)) return goal;
      if (goal.type === "bodyweight" && latestWeight)
        return { ...goal, current: latestWeight.weightLb };
      if (goal.type === "weekly_workouts") {
        const count = workouts.filter((w) => w.startedAt >= Date.now() - 7 * 86400000).length;
        return { ...goal, current: Math.min(Number(goal.target) || count, count) };
      }
      return goal;
    }) as AppState["goals"],
    progressPhotos: list(s.progressPhotos),
    aiMessages: list(s.aiMessages),
    supplementLogs: timestamped<AppState["supplementLogs"][number]>(s.supplementLogs).map((x) =>
      withProvenance(x, auditFor(x.id)),
    ),
    jarvisAudit,
    dismissedSuggestions: list(s.dismissedSuggestions),
    recoverySignals: list<RecoverySignal>(s.recoverySignals)
      .filter((x) => record(x) && typeof x.id === "string" && Number.isFinite(x.createdAt))
      .map((x) => withProvenance(x, auditFor(x.id), "system-derived")),
  };
  const inputs = [
    ...next.workouts.flatMap((w) => [
      { id: w.id, text: w.notes, at: w.endedAt ?? w.startedAt, src: "manual" as const },
      ...w.exercises.map((e) => ({
        id: e.id,
        text: e.notes,
        at: w.endedAt ?? w.startedAt,
        src: "manual" as const,
      })),
    ]),
    ...next.recoveryCheckIns.map((x) => ({
      id: x.id,
      text: x.notes,
      at: x.createdAt,
      src: "manual" as const,
    })),
    ...next.sleepEntries.map((x) => ({
      id: x.id,
      text: x.notes,
      at: x.createdAt,
      src: "manual" as const,
    })),
    ...next.jarvisAudit.map((x) => ({
      id: x.id,
      text: x.originalText ?? x.summary,
      at: x.createdAt,
      src: "ai" as const,
    })),
  ];
  const found = inputs.flatMap((x) =>
    extractRecoverySignalsFromNotes(x.text ?? "", x.id, x.at, x.src),
  );
  next.recoverySignals = [
    ...new Map([...(next.recoverySignals ?? []), ...found].map((x) => [x.id, x])).values(),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 500);
  return next;
}

export function createLog(raw: Partial<FitCoreLog> & Pick<FitCoreLog, "type">): FitCoreLog {
  const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt! : Date.now();
  const fallbackSource: ProvenanceSource =
    raw.source === "ai"
      ? "jarvis"
      : raw.source === "camera"
        ? "ai-estimated"
        : raw.source === "health"
          ? "wearable"
          : raw.source === "barcode" || raw.source === "imported"
            ? raw.source
            : "manual";
  const metadata =
    raw.provenance ?? normalizeProvenance({ source: fallbackSource, confidence: raw.confidence });
  const projectedSource: FitCoreLogSource =
    metadata.source === "jarvis" ||
    metadata.source === "ai-estimated" ||
    metadata.source === "system-derived"
      ? "ai"
      : metadata.source === "barcode" || metadata.source === "imported"
        ? metadata.source
        : metadata.source === "manual"
          ? "manual"
          : "health";
  return {
    id: raw.id?.trim() || id(),
    type: raw.type,
    subtype: raw.subtype,
    createdAt,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt! : createdAt,
    date: raw.date && !Number.isNaN(Date.parse(raw.date)) ? raw.date : isoDay(createdAt),
    source: projectedSource,
    notes: raw.notes?.trim() || undefined,
    tags: [...new Set(list<string>(raw.tags).filter(Boolean))],
    relatedIds: [...new Set(list<string>(raw.relatedIds).filter(Boolean))],
    metrics: raw.metrics ?? {},
    rawInput: raw.rawInput?.trim() || metadata.originalText,
    confidence: raw.confidence ?? metadata.confidence,
    provenance: metadata,
  };
}

export function saveLog(state: AppState, raw: FitCoreLog): AppState {
  const x = createLog(raw);
  if (getLogsByType(state, x.type).some((y) => y.id === x.id)) return state;
  if (x.type === "meal") {
    const nums = ["calories", "protein", "carbs", "fat"].map((k) => Number(x.metrics[k]));
    if (!nums.every(Number.isFinite)) return state;
    const meal: MealEntry = {
      id: x.id,
      name: x.subtype || "Meal",
      type: String(x.metrics.mealType || "meal"),
      calories: nums[0],
      protein: nums[1],
      carbs: nums[2],
      fat: nums[3],
      notes: x.notes,
      createdAt: x.createdAt,
      source: x.source === "ai" ? "jarvis" : x.source === "health" ? "imported" : x.source,
      confidence: x.confidence === "unknown" ? undefined : x.confidence,
      originalText: x.rawInput,
      confirmed: x.provenance.confirmation === "confirmed",
      auditId: x.provenance.auditId,
      provenance: x.provenance,
    };
    return migrateFitCoreDataIfNeeded({ ...state, mealEntries: [...state.mealEntries, meal] });
  }
  if (x.type === "weigh_in") {
    const weightLb = Number(x.metrics.weightLb);
    if (!Number.isFinite(weightLb) || weightLb <= 0) return state;
    return migrateFitCoreDataIfNeeded({
      ...state,
      bodyweightEntries: [
        ...state.bodyweightEntries,
        { id: x.id, weightLb, notes: x.notes, createdAt: x.createdAt, provenance: x.provenance },
      ],
    });
  }
  if (x.type === "check_in") {
    const score = (k: string) => Math.max(1, Math.min(10, Math.round(Number(x.metrics[k]) || 5)));
    const check: RecoveryCheckIn = {
      id: x.id,
      energy: score("energy"),
      soreness: score("soreness"),
      stress: score("stress"),
      motivation: score("motivation"),
      notes: x.notes,
      createdAt: x.createdAt,
      provenance: x.provenance,
    };
    return migrateFitCoreDataIfNeeded({
      ...state,
      recoveryCheckIns: [...state.recoveryCheckIns, check],
    });
  }
  if (x.type === "workout_session") {
    const workout = x.metrics.workout as Workout;
    if (!workout?.exercises) return state;
    return migrateFitCoreDataIfNeeded({
      ...state,
      workouts: [...state.workouts, { ...workout, id: x.id, provenance: x.provenance }],
    });
  }
  return state;
}

export function updateLog(state: AppState, logId: string, patch: Partial<FitCoreLog>): AppState {
  const old = allLogs(state).find((x) => x.id === logId);
  if (!old) return state;
  const x = createLog({ ...old, ...patch, id: logId, type: old.type, updatedAt: Date.now() });
  if (old.type === "meal")
    return migrateFitCoreDataIfNeeded({
      ...state,
      mealEntries: state.mealEntries.map((m) =>
        m.id === logId
          ? ({
              ...m,
              name: x.subtype || m.name,
              notes: x.notes,
              ...Object.fromEntries(
                ["calories", "protein", "carbs", "fat"].map((k) => [
                  k,
                  Number.isFinite(Number(x.metrics[k]))
                    ? Number(x.metrics[k])
                    : m[k as keyof MealEntry],
                ]),
              ),
            } as MealEntry)
          : m,
      ),
    });
  if (old.type === "weigh_in") {
    const weightLb = Number(x.metrics.weightLb);
    return Number.isFinite(weightLb) && weightLb > 0
      ? {
          ...state,
          bodyweightEntries: state.bodyweightEntries.map((w) =>
            w.id === logId ? { ...w, weightLb, notes: x.notes } : w,
          ),
        }
      : state;
  }
  if (old.type === "check_in")
    return migrateFitCoreDataIfNeeded({
      ...state,
      recoveryCheckIns: state.recoveryCheckIns.map((c) =>
        c.id === logId
          ? {
              ...c,
              notes: x.notes,
              energy: Number(x.metrics.energy) || c.energy,
              soreness: Number(x.metrics.soreness) || c.soreness,
              stress: Number(x.metrics.stress) || c.stress,
              motivation: Number(x.metrics.motivation) || c.motivation,
            }
          : c,
      ),
    });
  if (old.type === "workout_session")
    return migrateFitCoreDataIfNeeded({
      ...state,
      workouts: state.workouts.map((w) =>
        w.id === logId ? { ...w, name: x.subtype || w.name, notes: x.notes } : w,
      ),
    });
  return state;
}

export function deleteLog(state: AppState, logId: string): AppState {
  return migrateFitCoreDataIfNeeded({
    ...state,
    workouts: state.workouts.filter((x) => x.id !== logId),
    mealEntries: state.mealEntries.filter((x) => x.id !== logId),
    bodyweightEntries: state.bodyweightEntries.filter((x) => x.id !== logId),
    recoveryCheckIns: state.recoveryCheckIns.filter((x) => x.id !== logId),
    cardioEntries: state.cardioEntries.filter((x) => x.id !== logId),
    sleepEntries: state.sleepEntries.filter((x) => x.id !== logId),
    supplementLogs: state.supplementLogs.filter((x) => x.id !== logId),
    recoverySignals: state.recoverySignals.filter((x) => x.id !== logId && x.sourceLogId !== logId),
  });
}

function projectedProvenance(s: AppState, entity: Record<string, unknown>) {
  const entityId = String(entity.id ?? "");
  const audit = s.jarvisAudit.find((x) => !x.undone && x.entityIds?.includes(entityId));
  const metadata = normalizeProvenance(entity, audit);
  return {
    provenance: metadata,
    rawInput: metadata.originalText,
    confidence: metadata.confidence,
  };
}

function allLogs(s: AppState): FitCoreLog[] {
  const workouts = s.workouts.flatMap((w) => {
    const session = createLog({
      ...projectedProvenance(s, w as unknown as Record<string, unknown>),
      id: w.id,
      type: "workout_session",
      subtype: w.name,
      createdAt: w.startedAt,
      updatedAt: w.endedAt ?? w.startedAt,
      notes: w.notes,
      metrics: {
        completed: !!w.endedAt,
        volume: w.exercises
          .flatMap((e) => e.sets)
          .reduce((n, x) => n + (x.completed ? (x.weight ?? 0) * (x.reps ?? 0) : 0), 0),
      },
    });
    const children = w.exercises.flatMap((e, order) => [
      createLog({
        ...projectedProvenance(s, e as unknown as Record<string, unknown>),
        id: e.id,
        type: "workout_exercise",
        subtype: e.exerciseId,
        createdAt: w.startedAt,
        notes: e.notes,
        relatedIds: [w.id],
        tags: e.exerciseTags,
        metrics: { order, completed: e.completed },
      }),
      ...e.sets.map((x, i) =>
        createLog({
          ...projectedProvenance(s, x as unknown as Record<string, unknown>),
          id: x.id,
          type: "workout_set",
          subtype: e.exerciseId,
          createdAt: w.startedAt,
          relatedIds: [w.id, e.id],
          tags: x.modifier && x.modifier !== "normal" ? [x.modifier] : [],
          metrics: {
            order: i,
            reps: x.reps ?? 0,
            weight: x.weight ?? 0,
            completed: x.completed,
            modifier: x.modifier ?? "normal",
          },
        }),
      ),
    ]);
    return [session, ...children];
  });
  const signals = s.recoverySignals;
  return [
    ...workouts,
    ...s.mealEntries.map((x) =>
      createLog({
        ...projectedProvenance(s, x as unknown as Record<string, unknown>),
        id: x.id,
        type: "meal",
        subtype: x.name,
        createdAt: x.createdAt,
        notes: x.notes,
        metrics: {
          mealType: x.type,
          calories: x.calories,
          protein: x.protein,
          carbs: x.carbs,
          fat: x.fat,
        },
      }),
    ),
    ...s.bodyweightEntries.map((x) =>
      createLog({
        ...projectedProvenance(s, x as unknown as Record<string, unknown>),
        id: x.id,
        type: "weigh_in",
        subtype: "bodyweight",
        createdAt: x.createdAt,
        notes: x.notes,
        metrics: { weightLb: x.weightLb },
      }),
    ),
    ...s.recoveryCheckIns.map((x) =>
      createLog({
        ...projectedProvenance(s, x as unknown as Record<string, unknown>),
        id: x.id,
        type: "check_in",
        subtype: "daily",
        createdAt: x.createdAt,
        notes: x.notes,
        metrics: {
          energy: x.energy,
          soreness: x.soreness,
          stress: x.stress,
          motivation: x.motivation,
        },
      }),
    ),
    ...signals.map((x) =>
      createLog({
        ...projectedProvenance(s, x as unknown as Record<string, unknown>),
        id: x.id,
        type: "recovery_signal",
        subtype: x.kind,
        createdAt: x.createdAt,
        notes: x.notes,
        relatedIds: [x.sourceLogId],
        tags: x.bodyArea ? [x.bodyArea] : [],
        metrics: { severity: x.severity },
      }),
    ),
    ...s.jarvisAudit
      .filter((x) => !x.undone)
      .map((x) =>
        createLog({
          id: `ai:${x.id}`,
          type: "ai_event",
          subtype: x.tool,
          createdAt: x.createdAt,
          provenance: createJarvisProvenance({
            confidence: x.confidence ?? "unknown",
            auditId: x.id,
            originalText: x.originalText,
            assumptions: x.assumptions,
          }),
          notes: x.summary,
          relatedIds: x.entityIds,
          metrics: { status: x.status },
        }),
      ),
  ].sort((a, b) => b.createdAt - a.createdAt);
}

export const getLogsByType = (s: AppState, type: FitCoreLogType) =>
  allLogs(s).filter((x) => x.type === type);
export const getLogsByDateRange = (s: AppState, start: number | Date, end: number | Date) =>
  allLogs(s).filter((x) => x.createdAt >= +start && x.createdAt <= +end);
export const getWorkoutHistory = (s: AppState) =>
  [...s.workouts].sort((a, b) => b.startedAt - a.startedAt);
export function getExerciseHistory(s: AppState, exercise: string) {
  const q = norm(exercise);
  return getWorkoutHistory(s).flatMap((w) =>
    w.exercises
      .filter((e) => norm(e.exerciseId) === q)
      .map((e) => ({ workoutId: w.id, workoutName: w.name, date: w.startedAt, exercise: e })),
  );
}
export const getExercisePreviousPerformance = (
  s: AppState,
  exercise: string,
  before = Date.now(),
) =>
  getExerciseHistory(s, exercise).find(
    (x) => x.date < before && x.exercise.sets.some((set) => set.completed),
  ) ?? null;
export function getLatestMetrics(s: AppState) {
  const weight = [...s.bodyweightEntries].sort((a, b) => b.createdAt - a.createdAt)[0];
  return {
    bodyweightLb: weight?.weightLb ?? null,
    bodyweightAt: weight?.createdAt ?? null,
    checkIn: [...s.recoveryCheckIns].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
  };
}
export function getDailyMacroSummary(s: AppState, at = Date.now()) {
  return s.mealEntries
    .filter((x) => isoDay(x.createdAt) === isoDay(at))
    .reduce(
      (n, x) => ({
        calories: n.calories + x.calories,
        protein: n.protein + x.protein,
        carbs: n.carbs + x.carbs,
        fat: n.fat + x.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}
export function getNutritionSummary(s: AppState, at = Date.now()) {
  return {
    totals: getDailyMacroSummary(s, at),
    targets: s.nutritionTargets,
    meals: s.mealEntries.filter((x) => isoDay(x.createdAt) === isoDay(at)),
  };
}
export function getRecoverySummary(s: AppState) {
  const latest = getLatestMetrics(s).checkIn;
  return {
    latestCheckIn: latest,
    signals: getLogsByType(s, "recovery_signal").slice(0, 12),
    readiness: latest
      ? Math.round(
          ((latest.energy + latest.motivation + 11 - latest.soreness + 11 - latest.stress) / 40) *
            100,
        )
      : null,
  };
}
export function getProgressSeries(s: AppState) {
  return {
    workouts: getLogsByType(s, "workout_session").map((x) => ({
      date: x.createdAt,
      volume: Number(x.metrics.volume) || 0,
    })),
    bodyweight: s.bodyweightEntries.map((x) => ({ date: x.createdAt, weightLb: x.weightLb })),
    nutrition: [...new Set(s.mealEntries.map((x) => isoDay(x.createdAt)))].map((date) => ({
      date,
      ...getDailyMacroSummary(s, Date.parse(`${date}T12:00:00`)),
    })),
    recovery: s.recoveryCheckIns.map((x) => ({
      date: x.createdAt,
      score: Math.round(((x.energy + x.motivation + 11 - x.soreness + 11 - x.stress) / 40) * 100),
    })),
  };
}
export const getRecentActivity = (s: AppState, limit = 8) => {
  const logs = allLogs(s);
  const entityIds = new Set(logs.filter((x) => x.type !== "ai_event").map((x) => x.id));
  return logs
    .filter(
      (x) =>
        x.type !== "workout_exercise" &&
        x.type !== "template" &&
        !(x.type === "ai_event" && x.relatedIds.some((entityId) => entityIds.has(entityId))),
    )
    .slice(0, Math.max(1, limit));
};

export function extractRecoverySignalsFromNotes(
  notes: string,
  sourceLogId = id(),
  createdAt = Date.now(),
  src: FitCoreLogSource = "manual",
): RecoverySignal[] {
  const defs: [RecoverySignal["kind"], RegExp, number][] = [
    ["injury", /\b(injur(?:y|ed)|sprain|strain)\b/i, 8],
    ["pain", /\b(pain|hurt|hurts|aching?)\b/i, 7],
    ["soreness", /\b(sore|soreness)\b/i, 5],
    ["fatigue", /\b(tired|fatigue|fatigued|exhausted|low energy)\b/i, 6],
    ["sleep", /\b(poor sleep|bad sleep|slept bad)\b/i, 6],
    ["discomfort", /\b(discomfort|tight|tightness)\b/i, 5],
  ];
  const area = ["knee", "shoulder", "elbow", "back", "hip", "ankle", "wrist", "neck"].find((x) =>
    new RegExp(`\\b${x}\\b`, "i").test(notes),
  );
  return defs
    .filter(([, re]) => re.test(notes))
    .map(([kind, , severity]) => ({
      id: `recovery:${sourceLogId}:${kind}:${area ?? "general"}`,
      sourceLogId,
      kind,
      bodyArea: area,
      severity,
      notes: notes.trim(),
      createdAt,
      source: src,
      provenance: {
        source: "system-derived",
        confidence: "medium",
        confirmation: "not-required",
      },
    }));
}

export function buildAICoachContext(s: AppState, section: string) {
  const nutrition = getNutritionSummary(s),
    latest = getLatestMetrics(s),
    recovery = getRecoverySummary(s);
  return [
    `Section: ${section}`,
    `Goal: ${s.profile.goal}; ${s.profile.experience}; ${s.profile.daysPerWeek}d/wk; ${s.profile.split}`,
    `Latest bodyweight: ${latest.bodyweightLb ?? "not logged"} lb`,
    `Nutrition today: ${nutrition.totals.calories}/${nutrition.targets.calories} kcal; P${nutrition.totals.protein}/${nutrition.targets.protein} C${nutrition.totals.carbs}/${nutrition.targets.carbs} F${nutrition.totals.fat}/${nutrition.targets.fat}`,
    `Recovery: readiness ${recovery.readiness ?? "not enough data"}; signals ${
      recovery.signals
        .slice(0, 5)
        .map((x) => `${x.subtype}:${x.tags[0] ?? "general"}`)
        .join(", ") || "none"
    }`,
    `Recent workouts: ${JSON.stringify(getWorkoutHistory(s).slice(0, 5))}`,
    `Recent saved activity: ${
      getRecentActivity(s, 8)
        .map((x) => `${x.type}:${x.subtype ?? x.notes ?? x.id}`)
        .join(" | ") || "none"
    }`,
  ].join("\n");
}
