export type SectionId = "home" | "training" | "nutrition" | "recovery" | "progress";

export interface SetEntry {
  id: string;
  reps?: number;
  weight?: number;
  durationMin?: number;
  distanceMi?: number;
  modifier?: "normal" | "warmup" | "drop" | "failure" | "partials" | "unilateral" | "paused" | "tempo";
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
  notes?: string;
  completed: boolean;
  /** Tags applied to the whole exercise (e.g. unilateral, paused). */
  exerciseTags?: NonNullable<SetEntry["modifier"]>[];
}

export interface Workout {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  templateId?: string;
  exercises: WorkoutExercise[];
  notes?: string;
}

export interface CustomExercise {
  id: string;
  name: string;
  primary: string[];
  secondary?: string[];
  equipment: string;
  category: "compound" | "isolation" | "cardio";
  tracking?: "weight_reps" | "time" | "distance" | "bodyweight";
  notes?: string;
  isCustom: true;
  createdAt: number;
}

export interface CardioEntry {
  id: string; type: string; minutes: number;
  distanceMi?: number; calories?: number; heartRate?: number;
  speed?: number; incline?: number; notes?: string; createdAt: number;
}

export interface MealEntry {
  id: string;
  name: string;
  type: string;
  calories: number; protein: number; carbs: number; fat: number;
  notes?: string;
  createdAt: number;
}

export interface BodyweightEntry { id: string; weightLb: number; notes?: string; createdAt: number; }
export interface SleepEntry { id: string; hours: number; quality: number; notes?: string; createdAt: number; }
export interface RecoveryCheckIn { id: string; energy: number; soreness: number; stress: number; motivation: number; notes?: string; createdAt: number; }
export type FatigueLevel = "fresh" | "moderate" | "fatigued" | "very";
export type MuscleFatigueMap = Partial<Record<string, FatigueLevel>>;
export interface PR { id: string; exerciseId: string; type: "1rm" | "weight" | "volume"; value: number; reps?: number; weight?: number; date: number; }
export interface Goal { id: string; type: "lift" | "weekly_workouts" | "bodyweight" | "cardio" | "habit" | "volume" | "sleep" | "readiness" | "macro" | "consistency" | "photo"; label: string; target: number; current: number; section?: SectionId; pinned?: boolean; }
export interface ProgressPhoto { id: string; dataUrl: string; view: "front" | "side" | "back"; phase: "bulk" | "cut" | "maintenance"; notes?: string; createdAt: number; }
export interface AiMessage { id: string; role: "user" | "assistant"; content: string; createdAt: number; }

/* --------------------- Jarvis (AI control layer) --------------------- */

export type DataSource = "manual" | "jarvis" | "jarvis-confirmed" | "barcode" | "camera" | "whoop" | "apple-health" | "imported" | "edited";
export type Confidence = "high" | "medium" | "low";

export interface SourceMeta {
  source?: DataSource;
  confidence?: Confidence;
  originalText?: string;
  assumptions?: string[];
  undoId?: string;
}

export type JarvisPermission = 1 | 2 | 3 | 4;
export type JarvisResponseStyle = "concise" | "normal" | "detailed";
export type JarvisPersonality = "friendly" | "coach" | "siri" | "chatgpt";
export type ProactiveLevel = "off" | "low" | "normal" | "high";

export interface JarvisSettings {
  enabled: boolean;
  permission: JarvisPermission;
  responseStyle: JarvisResponseStyle;
  personality: JarvisPersonality;
  proactive: ProactiveLevel;
  autoLogSupplements: boolean;
  autoLogBodyweight: boolean;
  askBeforeMealEstimates: boolean;
  askBeforeWorkouts: boolean;
  askBeforeActiveWorkoutEdits: boolean;
  learningEnabled: boolean;
  // stubs (UI-only this phase)
  voiceModeEnabled: boolean;
  spokenResponses: boolean;
  useWhoop: boolean;
  useAppleHealth: boolean;
  dailyReviewEnabled: boolean;
  dailyReviewTime: string;
  weeklyReviewEnabled: boolean;
  weeklyReviewDay: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
  weeklyReviewTime: string;
}

export const defaultJarvisSettings: JarvisSettings = {
  enabled: true,
  permission: 2,
  responseStyle: "normal",
  personality: "friendly",
  proactive: "normal",
  autoLogSupplements: true,
  autoLogBodyweight: true,
  askBeforeMealEstimates: true,
  askBeforeWorkouts: true,
  askBeforeActiveWorkoutEdits: true,
  learningEnabled: true,
  voiceModeEnabled: false,
  spokenResponses: false,
  useWhoop: false,
  useAppleHealth: false,
  dailyReviewEnabled: false,
  dailyReviewTime: "21:00",
  weeklyReviewEnabled: false,
  weeklyReviewDay: "sun",
  weeklyReviewTime: "20:00",
};

export type JarvisAuditStatus = "logged" | "suggested" | "edited" | "skipped" | "undone";

export interface JarvisAuditEntry {
  id: string;
  tool: string;
  summary: string;
  status: JarvisAuditStatus;
  originalText?: string;
  assumptions?: string[];
  confidence?: Confidence;
  entityIds?: string[];     // ids of created records
  entityKind?: string;      // e.g. "meal", "bodyweight"
  patch?: Record<string, unknown>;
  createdAt: number;
  undone?: boolean;
}

export type JarvisLearning = Record<string, unknown>;

/* ----------- Goals & Profile (extended subset, Phase 1) ----------- */

export type ExtendedGoal = "bulk" | "cut" | "maintain" | "recomp" | "strength" | "hypertrophy" | "general";

export interface UserGoalsProfile {
  goal?: ExtendedGoal;
  targetBodyweightLb?: number;
  currentBodyweightLb?: number;
  calorieGoal?: number;
  proteinGoal?: number;
  carbGoal?: number;
  fatGoal?: number;
  fiberGoal?: number;
  weeklyWeightChangeLb?: number;
  workoutSplit?: string;
  normalWorkoutDays?: string[];
  normalWorkoutTime?: string;
  weakPoints?: string[];
  injuryAreas?: string[];
  supplementRoutine?: string[];
  normalWeighInTime?: string;
  foodPreferences?: string[];
  dislikedFoods?: string[];
  usualBreakfast?: string;
  usualLunch?: string;
  usualDinner?: string;
  usualSnack?: string;
  usualProteinShake?: string;
  usualPreWorkoutMeal?: string;
  usualPostWorkoutMeal?: string;
  commonRestaurantOrders?: string[];
  preferredCardio?: string[];
  recoveryPriorities?: string[];
}

export type Sex = "male" | "female" | "other";
export type GymOrHome = "gym" | "home" | "both";
export type Intensity = "easy" | "moderate" | "hard";
export type DietStyle = "balanced" | "high_protein" | "low_carb" | "keto" | "vegetarian" | "vegan" | "mediterranean";
export type MacroStrictness = "loose" | "moderate" | "strict";

export interface Profile {
  goal: "strength" | "hypertrophy" | "lean_bulk" | "cut" | "maintenance";
  experience: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  split: string;
  bodyweightLb: number;
  targetBodyweightLb: number;
  units: "lb" | "kg";

  // basics
  name?: string;
  age?: number;
  sex?: Sex;
  heightIn?: number;
  trainingAgeYears?: number;

  // training
  preferredWorkoutDays?: string[];
  preferredWorkoutTime?: "morning" | "midday" | "evening" | "anytime";
  sessionLengthMin?: number;
  favoriteMuscles?: string[];
  weakMuscles?: string[];
  exercisesToAvoid?: string[];
  equipment?: string[];
  gymOrHome?: GymOrHome;
  intensity?: Intensity;

  // nutrition
  dietStyle?: DietStyle;
  carbFatPreference?: "high_carb" | "balanced" | "high_fat";
  mealsPerDay?: number;
  foodsToAvoid?: string[];
  allergies?: string[];
  macroStrictness?: MacroStrictness;

  // recovery
  sleepGoalH?: number;
  stepGoal?: number;
  cardioGoalMin?: number;
  recoveryPriority?: "low" | "moderate" | "high";
  injuries?: string[];
  sorenessSensitivity?: "low" | "normal" | "high";
}

export interface Personalization {
  themeAccent?: "auto" | "purple" | "blue" | "green" | "red";
  defaultDashboardFocus?: "training" | "nutrition" | "recovery" | "progress";
  defaultGraphModes?: { volume?: string; heatmap?: string };
  units?: { weight: "lb" | "kg"; distance: "mi" | "km" };
  reminders?: {
    workoutEnabled: boolean; workoutTime: string;
    weighInEnabled: boolean; weighInTime: string;
    mealLogEnabled: boolean; mealLogTime: string;
  };
  aiCoachTone?: "direct" | "supportive" | "detailed" | "simple";
  aiResponseLength?: "quick" | "detailed";
  uiComplexity?: "simple" | "advanced";
  showAdvancedStats?: boolean;
}

export interface NutritionTargets { calories: number; protein: number; carbs: number; fat: number; }

export interface AppState {
  version: number;
  onboardingComplete: boolean;
  profile: Profile;
  personalization: Personalization;
  nutritionTargets: NutritionTargets;
  workouts: Workout[];
  activeWorkout: Workout | null;
  workoutTemplates: { id: string; name: string; templateId: string }[];
  customExercises: CustomExercise[];
  cardioEntries: CardioEntry[];
  mealEntries: MealEntry[];
  bodyweightEntries: BodyweightEntry[];
  sleepEntries: SleepEntry[];
  recoveryCheckIns: RecoveryCheckIn[];
  muscleFatigue: MuscleFatigueMap;
  prs: PR[];
  goals: Goal[];
  progressPhotos: ProgressPhoto[];
  aiMessages: AiMessage[];
  reminders: { workout: boolean; weighIn: boolean; lunch: boolean };
  demoMode: boolean;
  jarvisSettings: JarvisSettings;
  jarvisAudit: JarvisAuditEntry[];
  jarvisLearning: JarvisLearning;
  userGoalsProfile: UserGoalsProfile;
}

export const defaultPersonalization: Personalization = {
  themeAccent: "auto",
  defaultDashboardFocus: "training",
  defaultGraphModes: { volume: "total", heatmap: "load" },
  units: { weight: "lb", distance: "mi" },
  reminders: {
    workoutEnabled: true, workoutTime: "17:00",
    weighInEnabled: true, weighInTime: "09:00",
    mealLogEnabled: false, mealLogTime: "12:00",
  },
  aiCoachTone: "direct",
  aiResponseLength: "quick",
  uiComplexity: "advanced",
  showAdvancedStats: true,
};

export const defaultState: AppState = {
  version: 2,
  onboardingComplete: false,
  profile: {
    goal: "hypertrophy",
    experience: "intermediate",
    daysPerWeek: 5,
    split: "Push / Pull / Legs",
    bodyweightLb: 180,
    targetBodyweightLb: 185,
    units: "lb",
    sleepGoalH: 8,
    stepGoal: 8000,
    cardioGoalMin: 90,
    mealsPerDay: 4,
    sessionLengthMin: 60,
  },
  personalization: defaultPersonalization,
  nutritionTargets: { calories: 3100, protein: 180, carbs: 380, fat: 90 },
  workouts: [],
  activeWorkout: null,
  workoutTemplates: [],
  customExercises: [],
  cardioEntries: [],
  mealEntries: [],
  bodyweightEntries: [],
  sleepEntries: [],
  recoveryCheckIns: [],
  muscleFatigue: {},
  prs: [],
  goals: [
    { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
    { id: "g2", type: "bodyweight", label: "Reach 185 lb lean", target: 185, current: 180 },
  ],
  progressPhotos: [],
  aiMessages: [],
  reminders: { workout: true, weighIn: true, lunch: false },
  demoMode: false,
  jarvisSettings: defaultJarvisSettings,
  jarvisAudit: [],
  jarvisLearning: {},
  userGoalsProfile: {},
};

/* ----------------------- Format helpers ----------------------- */

export function lbToKg(lb: number) { return Math.round(lb * 0.453592 * 10) / 10; }
export function kgToLb(kg: number) { return Math.round(kg * 2.20462 * 10) / 10; }
export function miToKm(mi: number) { return Math.round(mi * 1.60934 * 10) / 10; }

export function weightUnit(p?: Personalization): "lb" | "kg" {
  return p?.units?.weight ?? "lb";
}

export function formatWeight(lb: number, p?: Personalization, opts?: { unit?: boolean }): string {
  const u = weightUnit(p);
  const v = u === "kg" ? lbToKg(lb) : lb;
  const out = Number.isInteger(v) ? v.toString() : v.toFixed(1);
  return opts?.unit === false ? out : `${out} ${u}`;
}

export function distanceUnit(p?: Personalization): "mi" | "km" {
  return p?.units?.distance ?? "mi";
}
