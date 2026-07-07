import type { AppState, Workout, MealEntry, BodyweightEntry, SleepEntry, RecoveryCheckIn, PR } from "./types";
import { defaultState } from "./types";

const DAY = 86400000;

// Deterministic PRNG
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function id(prefix: string, i: number) { return `${prefix}-demo-${i}`; }

const SPLIT = [
  { name: "Push Day", exercises: [
    { exerciseId: "bench-press", sets: [[135, 8], [185, 6], [205, 5], [205, 5]] },
    { exerciseId: "incline-db", sets: [[70, 10], [75, 8], [75, 8]] },
    { exerciseId: "ohp", sets: [[95, 8], [115, 6], [115, 5]] },
    { exerciseId: "lat-raise", sets: [[20, 15], [20, 14], [20, 12]] },
    { exerciseId: "tri-pushdown", sets: [[50, 12], [55, 10], [55, 10]] },
  ]},
  { name: "Pull Day", exercises: [
    { exerciseId: "deadlift", sets: [[225, 5], [275, 5], [315, 3]] },
    { exerciseId: "pullup", sets: [[0, 8], [0, 7], [0, 6]] },
    { exerciseId: "barbell-row", sets: [[135, 8], [155, 8], [155, 8]] },
    { exerciseId: "cable-row", sets: [[120, 10], [130, 10], [130, 10]] },
    { exerciseId: "bb-curl", sets: [[65, 10], [75, 8], [75, 8]] },
  ]},
  { name: "Leg Day", exercises: [
    { exerciseId: "squat", sets: [[185, 8], [225, 6], [245, 5], [245, 5]] },
    { exerciseId: "rdl", sets: [[185, 10], [205, 8], [205, 8]] },
    { exerciseId: "leg-press", sets: [[270, 12], [320, 10], [320, 10]] },
    { exerciseId: "lying-curl", sets: [[80, 12], [90, 10], [90, 10]] },
    { exerciseId: "standing-calf", sets: [[120, 15], [130, 12], [130, 12]] },
  ]},
];

const MEAL_TEMPLATES = [
  { name: "Oats + Whey + Banana", type: "breakfast", calories: 520, protein: 35, carbs: 78, fat: 9 },
  { name: "Chicken Rice Bowl", type: "lunch", calories: 640, protein: 55, carbs: 70, fat: 12 },
  { name: "Greek Yogurt + Berries", type: "snack", calories: 240, protein: 25, carbs: 22, fat: 4 },
  { name: "Salmon, Sweet Potato, Greens", type: "dinner", calories: 720, protein: 48, carbs: 60, fat: 28 },
  { name: "Casein + Almond Butter", type: "snack", calories: 320, protein: 32, carbs: 12, fat: 16 },
];

export function buildDemoState(base: AppState = defaultState): AppState {
  const rnd = seeded(42);
  const now = Date.now();

  // Workouts: ~5/week for last 60 days, following split
  const workouts: Workout[] = [];
  const prs: PR[] = [];
  for (let day = 60; day >= 0; day--) {
    // train on Mon/Tue/Thu/Fri/Sat pattern
    const date = new Date(now - day * DAY);
    const dow = date.getDay();
    if (![1, 2, 4, 5, 6].includes(dow)) continue;
    const split = SPLIT[day % 3];
    const startedAt = date.setHours(17, 30 + Math.floor(rnd() * 30), 0, 0);
    const endedAt = startedAt + (50 + Math.floor(rnd() * 25)) * 60000;
    // progressive overload bump every ~14 days
    const wave = Math.max(0, 1 - day / 60);
    const w: Workout = {
      id: id("w", day),
      name: split.name,
      startedAt,
      endedAt,
      exercises: split.exercises.map((e, i) => ({
        id: id(`we${day}`, i),
        exerciseId: e.exerciseId,
        completed: true,
        sets: e.sets.map(([wt, reps], j) => ({
          id: id(`s${day}_${i}`, j),
          weight: wt > 0 ? Math.round(wt + wave * 15) : 0,
          reps,
          completed: true,
          modifier: "normal" as const,
        })),
      })),
    };
    workouts.push(w);
  }

  // PRs
  prs.push(
    { id: "pr-1", exerciseId: "bench-press", type: "1rm", value: 245, weight: 225, reps: 5, date: now - 14 * DAY },
    { id: "pr-2", exerciseId: "squat", type: "1rm", value: 295, weight: 265, reps: 5, date: now - 9 * DAY },
    { id: "pr-3", exerciseId: "deadlift", type: "1rm", value: 365, weight: 335, reps: 3, date: now - 4 * DAY },
  );

  // Meals: last 14 days
  const mealEntries: MealEntry[] = [];
  for (let day = 13; day >= 0; day--) {
    const date = new Date(now - day * DAY);
    const meals = MEAL_TEMPLATES.slice(0, 4 + Math.floor(rnd() * 2));
    meals.forEach((m, i) => {
      const ts = date.setHours(8 + i * 4, Math.floor(rnd() * 50), 0, 0);
      mealEntries.push({
        id: id(`m${day}`, i),
        ...m,
        createdAt: ts,
      });
    });
  }

  // Bodyweight: 60d trend
  const bodyweightEntries: BodyweightEntry[] = [];
  for (let day = 60; day >= 0; day -= 2) {
    const wt = 180 + (60 - day) * 0.08 + (rnd() - 0.5) * 1.5;
    bodyweightEntries.push({
      id: id("bw", day),
      weightLb: Math.round(wt * 10) / 10,
      createdAt: now - day * DAY,
    });
  }

  // Sleep: 14d
  const sleepEntries: SleepEntry[] = [];
  for (let day = 13; day >= 0; day--) {
    sleepEntries.push({
      id: id("sl", day),
      hours: Math.round((6.5 + rnd() * 2) * 10) / 10,
      quality: 3 + Math.floor(rnd() * 3),
      createdAt: now - day * DAY,
    });
  }

  // Recovery check-ins: 7d
  const recoveryCheckIns: RecoveryCheckIn[] = [];
  for (let day = 6; day >= 0; day--) {
    recoveryCheckIns.push({
      id: id("rc", day),
      energy: 3 + Math.floor(rnd() * 3),
      soreness: 1 + Math.floor(rnd() * 3),
      stress: 1 + Math.floor(rnd() * 3),
      motivation: 3 + Math.floor(rnd() * 3),
      createdAt: now - day * DAY,
    });
  }

  return {
    ...base,
    workouts: [...workouts, ...base.workouts],
    mealEntries: [...mealEntries, ...base.mealEntries],
    bodyweightEntries: [...bodyweightEntries, ...base.bodyweightEntries],
    sleepEntries: [...sleepEntries, ...base.sleepEntries],
    recoveryCheckIns: [...recoveryCheckIns, ...base.recoveryCheckIns],
    prs: [...prs, ...base.prs],
  };
}
