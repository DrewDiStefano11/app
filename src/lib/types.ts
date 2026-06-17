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

export interface Profile {
  goal: "strength" | "hypertrophy" | "lean_bulk" | "cut" | "maintenance";
  experience: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  split: string;
  bodyweightLb: number;
  targetBodyweightLb: number;
  units: "lb" | "kg";
}

export interface NutritionTargets { calories: number; protein: number; carbs: number; fat: number; }

export interface AppState {
  version: number;
  onboardingComplete: boolean;
  profile: Profile;
  nutritionTargets: NutritionTargets;
  workouts: Workout[];
  activeWorkout: Workout | null;
  workoutTemplates: { id: string; name: string; templateId: string }[]; // user pinned
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
}

export const defaultState: AppState = {
  version: 1,
  onboardingComplete: false,
  profile: {
    goal: "hypertrophy",
    experience: "intermediate",
    daysPerWeek: 5,
    split: "Push / Pull / Legs",
    bodyweightLb: 180,
    targetBodyweightLb: 185,
    units: "lb",
  },
  nutritionTargets: { calories: 3100, protein: 180, carbs: 380, fat: 90 },
  workouts: [],
  activeWorkout: null,
  workoutTemplates: [],
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
};
