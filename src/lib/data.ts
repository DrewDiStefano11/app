// Seed data: exercises, workout templates, food library, meal templates.

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "cardio";

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  equipment: string;
  category: "compound" | "isolation" | "cardio";
  defaultSets: number;
  defaultReps: string;
  cues?: string[];
}

const ex = (
  id: string,
  name: string,
  primary: MuscleGroup[],
  equipment: string,
  category: Exercise["category"] = "compound",
  defaultSets = 3,
  defaultReps = "8-12",
  secondary: MuscleGroup[] = [],
  cues: string[] = [],
): Exercise => ({
  id,
  name,
  primary,
  secondary,
  equipment,
  category,
  defaultSets,
  defaultReps,
  cues,
});

export const EXERCISES: Exercise[] = [
  // Chest
  ex(
    "bench-press",
    "Barbell Bench Press",
    ["chest"],
    "barbell",
    "compound",
    4,
    "5-8",
    ["triceps", "shoulders"],
    ["Plant feet", "Squeeze shoulder blades", "Bar to lower chest"],
  ),
  ex("db-bench", "Dumbbell Bench Press", ["chest"], "dumbbell", "compound", 3, "8-12", [
    "triceps",
    "shoulders",
  ]),
  ex("incline-db", "Incline Dumbbell Press", ["chest"], "dumbbell", "compound", 3, "8-12", [
    "shoulders",
  ]),
  ex("machine-press", "Machine Chest Press", ["chest"], "machine", "compound", 3, "10-15"),
  ex("cable-fly", "Cable Fly", ["chest"], "cable", "isolation", 3, "12-15"),
  ex("pushup", "Pushups", ["chest"], "bodyweight", "compound", 3, "AMRAP"),
  ex("dip", "Dips", ["chest"], "bodyweight", "compound", 3, "8-12", ["triceps"]),
  // Back
  ex("pullup", "Pull-ups", ["back"], "bodyweight", "compound", 4, "5-10", ["biceps"]),
  ex("lat-pulldown", "Lat Pulldown", ["back"], "cable", "compound", 3, "10-12"),
  ex("barbell-row", "Barbell Row", ["back"], "barbell", "compound", 4, "6-10"),
  ex("cable-row", "Seated Cable Row", ["back"], "cable", "compound", 3, "10-12"),
  ex("db-row", "Single Arm Dumbbell Row", ["back"], "dumbbell", "compound", 3, "10-12"),
  ex("deadlift", "Deadlift", ["back", "hamstrings", "glutes"], "barbell", "compound", 3, "3-5"),
  ex(
    "trap-bar-dl",
    "Trap Bar Deadlift",
    ["back", "quads", "glutes"],
    "barbell",
    "compound",
    3,
    "5-8",
  ),
  ex("face-pull", "Face Pulls", ["shoulders", "back"], "cable", "isolation", 3, "12-15"),
  // Shoulders
  ex("ohp", "Overhead Press", ["shoulders"], "barbell", "compound", 4, "5-8", ["triceps"]),
  ex("db-shoulder", "Dumbbell Shoulder Press", ["shoulders"], "dumbbell", "compound", 3, "8-12"),
  ex("lat-raise", "Lateral Raise", ["shoulders"], "dumbbell", "isolation", 3, "12-15"),
  ex("cable-lat-raise", "Cable Lateral Raise", ["shoulders"], "cable", "isolation", 3, "12-15"),
  ex("rear-delt-fly", "Rear Delt Fly", ["shoulders"], "dumbbell", "isolation", 3, "12-15"),
  ex("upright-row", "Upright Row", ["shoulders"], "barbell", "compound", 3, "10-12"),
  // Arms
  ex("bb-curl", "Barbell Curl", ["biceps"], "barbell", "isolation", 3, "8-12"),
  ex("db-curl", "Dumbbell Curl", ["biceps"], "dumbbell", "isolation", 3, "10-12"),
  ex("hammer-curl", "Hammer Curl", ["biceps"], "dumbbell", "isolation", 3, "10-12"),
  ex("tri-pushdown", "Tricep Pushdown", ["triceps"], "cable", "isolation", 3, "10-15"),
  ex("oh-tri", "Overhead Tricep Extension", ["triceps"], "dumbbell", "isolation", 3, "10-12"),
  ex("skullcrusher", "Skullcrushers", ["triceps"], "barbell", "isolation", 3, "8-12"),
  ex("cgbp", "Close Grip Bench Press", ["triceps", "chest"], "barbell", "compound", 3, "6-10"),
  // Legs
  ex("squat", "Back Squat", ["quads", "glutes"], "barbell", "compound", 4, "5-8"),
  ex("front-squat", "Front Squat", ["quads"], "barbell", "compound", 3, "5-8"),
  ex("leg-press", "Leg Press", ["quads", "glutes"], "machine", "compound", 3, "10-15"),
  ex("hack-squat", "Hack Squat", ["quads"], "machine", "compound", 3, "8-12"),
  ex("rdl", "Romanian Deadlift", ["hamstrings", "glutes"], "barbell", "compound", 3, "8-12"),
  ex("lying-curl", "Lying Leg Curl", ["hamstrings"], "machine", "isolation", 3, "10-15"),
  ex("seated-curl", "Seated Leg Curl", ["hamstrings"], "machine", "isolation", 3, "10-15"),
  ex("leg-ext", "Leg Extension", ["quads"], "machine", "isolation", 3, "12-15"),
  ex("bss", "Bulgarian Split Squat", ["quads", "glutes"], "dumbbell", "compound", 3, "8-10"),
  ex("lunge", "Lunges", ["quads", "glutes"], "dumbbell", "compound", 3, "10"),
  ex("hip-thrust", "Hip Thrust", ["glutes"], "barbell", "compound", 3, "8-12"),
  ex("glute-bridge", "Glute Bridge", ["glutes"], "bodyweight", "compound", 3, "10-15"),
  ex("standing-calf", "Standing Calf Raise", ["calves"], "machine", "isolation", 4, "10-15"),
  ex("seated-calf", "Seated Calf Raise", ["calves"], "machine", "isolation", 4, "12-15"),
  // Core
  ex("plank", "Plank", ["core"], "bodyweight", "isolation", 3, "45s"),
  ex("hlr", "Hanging Leg Raise", ["core"], "bodyweight", "isolation", 3, "10-12"),
  ex("cable-crunch", "Cable Crunch", ["core"], "cable", "isolation", 3, "12-15"),
  ex("deadbug", "Deadbug", ["core"], "bodyweight", "isolation", 3, "10"),
  ex("russian-twist", "Russian Twist", ["core"], "bodyweight", "isolation", 3, "20"),
  // Cardio
  ex("treadmill", "Treadmill Walk", ["cardio"], "machine", "cardio", 1, "30m"),
  ex("incline-walk", "Incline Walk", ["cardio"], "machine", "cardio", 1, "30m"),
  ex("run", "Outdoor Run", ["cardio"], "none", "cardio", 1, "30m"),
  ex("bike", "Bike", ["cardio"], "machine", "cardio", 1, "30m"),
  ex("stairs", "Stairmaster", ["cardio"], "machine", "cardio", 1, "20m"),
  ex("rower", "Rowing Machine", ["cardio"], "machine", "cardio", 1, "20m"),
  ex("elliptical", "Elliptical", ["cardio"], "machine", "cardio", 1, "20m"),
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  rest?: number;
  notes?: string;
}
export interface WorkoutTemplate {
  id: string;
  name: string;
  goal: string;
  durationMin: number;
  exercises: TemplateExercise[];
  notes?: string;
}

const T = (
  id: string,
  name: string,
  goal: string,
  durationMin: number,
  exercises: TemplateExercise[],
): WorkoutTemplate => ({ id, name, goal, durationMin, exercises });
const e = (exerciseId: string, sets = 3, reps = "8-12", rest = 90): TemplateExercise => ({
  exerciseId,
  sets,
  reps,
  rest,
});

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  T("push", "Push Day", "Hypertrophy", 60, [
    e("bench-press", 4, "5-8", 150),
    e("incline-db", 3, "8-12"),
    e("machine-press", 3, "10-12"),
    e("lat-raise", 3, "12-15", 60),
    e("tri-pushdown", 3, "10-15", 60),
    e("oh-tri", 3, "10-12", 60),
  ]),
  T("pull", "Pull Day", "Hypertrophy", 60, [
    e("pullup", 4, "6-10", 120),
    e("barbell-row", 4, "6-10", 120),
    e("cable-row", 3, "10-12"),
    e("face-pull", 3, "12-15", 60),
    e("bb-curl", 3, "8-12", 60),
    e("hammer-curl", 3, "10-12", 60),
  ]),
  T("legs", "Legs Day", "Strength + Hypertrophy", 70, [
    e("squat", 4, "5-8", 180),
    e("rdl", 3, "8-12", 120),
    e("leg-press", 3, "10-15"),
    e("lying-curl", 3, "10-15", 60),
    e("leg-ext", 3, "12-15", 60),
    e("standing-calf", 4, "10-15", 60),
  ]),
  T("upper", "Upper Body", "Hypertrophy", 60, [
    e("bench-press", 4, "6-8"),
    e("barbell-row", 4, "6-8"),
    e("db-shoulder", 3, "8-12"),
    e("lat-pulldown", 3, "10-12"),
    e("bb-curl", 3, "10-12", 60),
    e("tri-pushdown", 3, "10-15", 60),
  ]),
  T("lower", "Lower Body", "Strength", 60, [
    e("squat", 4, "5-8", 180),
    e("rdl", 3, "8-10", 120),
    e("bss", 3, "8-10"),
    e("seated-curl", 3, "10-15", 60),
    e("standing-calf", 4, "10-15", 60),
  ]),
  T("full", "Full Body", "General", 60, [
    e("squat", 3, "5-8"),
    e("bench-press", 3, "5-8"),
    e("barbell-row", 3, "6-10"),
    e("db-shoulder", 3, "8-12"),
    e("plank", 3, "45s", 30),
  ]),
  T("beginner3", "Beginner 3-Day", "General Strength", 45, [
    e("squat", 3, "5"),
    e("bench-press", 3, "5"),
    e("barbell-row", 3, "5"),
  ]),
  T("strength4", "Strength Focus 4-Day", "Strength", 65, [
    e("squat", 5, "5"),
    e("bench-press", 5, "5"),
    e("deadlift", 3, "3"),
    e("ohp", 4, "5"),
  ]),
  T("hyper5", "Hypertrophy 5-Day", "Hypertrophy", 60, [
    e("incline-db", 4, "8-12"),
    e("cable-fly", 3, "12-15"),
    e("lat-raise", 4, "12-15", 60),
    e("tri-pushdown", 3, "10-15", 60),
    e("oh-tri", 3, "10-12", 60),
  ]),
  T("deload", "Deload Day", "Recovery", 40, [
    e("bench-press", 3, "5", 120),
    e("squat", 3, "5", 120),
    e("cable-row", 3, "10"),
  ]),
];

export interface Food {
  id: string;
  name: string;
  category: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}
const f = (
  id: string,
  name: string,
  category: string,
  servingLabel: string,
  calories: number,
  p: number,
  c: number,
  fat: number,
  fiber = 0,
): Food => ({ id, name, category, servingLabel, calories, protein: p, carbs: c, fat, fiber });

export const FOODS: Food[] = [
  // Proteins
  f("chicken-breast", "Grilled Chicken Breast", "protein", "6 oz", 280, 52, 0, 6),
  f("ground-turkey", "Lean Ground Turkey", "protein", "6 oz", 240, 42, 0, 8),
  f("cod", "Cod", "protein", "6 oz", 180, 40, 0, 1),
  f("tilapia", "Tilapia", "protein", "6 oz", 220, 42, 0, 4),
  f("tuna", "Tuna", "protein", "1 can (5 oz)", 120, 26, 0, 1),
  f("sirloin", "Sirloin Steak", "protein", "6 oz", 340, 46, 0, 16),
  f("pork-ten", "Pork Tenderloin", "protein", "6 oz", 240, 40, 0, 8),
  f("salmon", "Salmon", "protein", "6 oz", 360, 40, 0, 22),
  f("whole-egg", "Whole Eggs", "protein", "2 large", 140, 12, 1, 10),
  f("egg-white", "Egg Whites", "protein", "4 whites", 70, 15, 1, 0),
  f("greek-yogurt", "Greek Yogurt", "protein", "1 cup", 150, 22, 8, 2),
  f("cottage", "Cottage Cheese", "protein", "1 cup", 200, 28, 8, 5),
  f("skim-milk", "Skim Milk", "protein", "1 cup", 90, 9, 12, 0),
  f("soy-milk", "Soy Milk", "protein", "1 cup", 100, 7, 9, 4),
  f("tofu", "Firm Tofu", "protein", "100g", 145, 17, 4, 9),
  f("tempeh", "Tempeh", "protein", "100g", 195, 20, 8, 11),
  // Carbs
  f("white-rice", "White Rice", "carbs", "1 cup cooked", 205, 4, 45, 0),
  f("brown-rice", "Brown Rice", "carbs", "1 cup cooked", 220, 5, 46, 2),
  f("oats", "Oats", "carbs", "1/2 cup dry", 150, 5, 27, 3, 4),
  f("sweet-potato", "Sweet Potato", "carbs", "1 medium", 112, 2, 26, 0, 4),
  f("white-potato", "White Potato", "carbs", "1 medium", 160, 4, 37, 0, 4),
  f("ww-bread", "Whole Wheat Bread", "carbs", "2 slices", 160, 8, 28, 3, 4),
  f("bagel", "Bagel", "carbs", "1 plain", 280, 11, 55, 2, 2),
  f("pasta", "Pasta", "carbs", "2 oz dry", 200, 7, 42, 1, 2),
  f("quinoa", "Quinoa", "carbs", "1 cup cooked", 220, 8, 39, 4, 5),
  f("chickpeas", "Chickpeas", "carbs", "1 cup", 270, 15, 45, 4, 12),
  f("black-beans", "Black Beans", "carbs", "1 cup", 220, 15, 40, 1, 15),
  f("lentils", "Lentils", "carbs", "1 cup", 230, 18, 40, 1, 16),
  f("rice-cake", "Rice Cakes", "carbs", "2 cakes", 70, 1, 15, 0),
  // Fruits
  f("banana", "Banana", "fruit", "1 medium", 105, 1, 27, 0, 3),
  f("apple", "Apple", "fruit", "1 medium", 95, 0, 25, 0, 4),
  f("blueberries", "Blueberries", "fruit", "1 cup", 85, 1, 21, 0, 4),
  f("strawberries", "Strawberries", "fruit", "1 cup", 50, 1, 12, 0, 3),
  f("orange", "Orange", "fruit", "1 medium", 62, 1, 15, 0, 3),
  // Veg
  f("spinach", "Spinach", "veg", "2 cups", 15, 2, 2, 0, 2),
  f("broccoli", "Broccoli", "veg", "1 cup", 55, 4, 11, 0, 5),
  f("asparagus", "Asparagus", "veg", "1 cup", 30, 3, 6, 0, 3),
  f("green-beans", "Green Beans", "veg", "1 cup", 35, 2, 8, 0, 4),
  f("cucumber", "Cucumber", "veg", "1 cup", 16, 1, 4, 0, 1),
  f("bell-pepper", "Bell Pepper", "veg", "1 medium", 30, 1, 7, 0, 3),
  f("zucchini", "Zucchini", "veg", "1 cup", 20, 2, 4, 0, 1),
  f("kale", "Kale", "veg", "2 cups", 70, 6, 12, 1, 3),
  f("cauliflower", "Cauliflower", "veg", "1 cup", 25, 2, 5, 0, 2),
  f("brussels", "Brussels Sprouts", "veg", "1 cup", 55, 4, 11, 0, 4),
  // Fats
  f("avocado", "Avocado", "fat", "1/2 medium", 160, 2, 9, 15, 7),
  f("olive-oil", "Olive Oil", "fat", "1 tbsp", 120, 0, 0, 14),
  f("pb", "Peanut Butter", "fat", "2 tbsp", 190, 8, 7, 16, 2),
  f("almonds", "Almonds", "fat", "1 oz", 165, 6, 6, 14, 4),
  f("walnuts", "Walnuts", "fat", "1 oz", 185, 4, 4, 18, 2),
  f("chia", "Chia Seeds", "fat", "2 tbsp", 140, 5, 12, 9, 10),
  f("pumpkin-seeds", "Pumpkin Seeds", "fat", "1 oz", 160, 9, 4, 14, 2),
  f("butter", "Butter", "fat", "1 tbsp", 100, 0, 0, 11),
  f("cheese", "Cheese", "fat", "1 oz", 110, 7, 1, 9),
  // Other
  f("honey", "Honey", "other", "1 tbsp", 65, 0, 17, 0),
  f("maple", "Maple Syrup", "other", "1 tbsp", 52, 0, 13, 0),
  f("light-mayo", "Light Mayonnaise", "other", "1 tbsp", 35, 0, 1, 3),
  f("balsamic", "Balsamic Vinegar", "other", "1 tbsp", 15, 0, 3, 0),
  f("whey", "Protein Powder", "protein", "1 scoop", 120, 24, 3, 1),
];

export interface MealTemplateItem {
  foodId: string;
  servings: number;
}
export interface MealTemplate {
  id: string;
  name: string;
  type: string;
  items: MealTemplateItem[];
}
const mt = (id: string, name: string, type: string, items: MealTemplateItem[]): MealTemplate => ({
  id,
  name,
  type,
  items,
});

export const MEAL_TEMPLATES: MealTemplate[] = [
  mt("lean-oats", "Lean Protein Oats", "breakfast", [
    { foodId: "oats", servings: 1 },
    { foodId: "whey", servings: 1 },
    { foodId: "blueberries", servings: 1 },
  ]),
  mt("bagel-eggs", "Muscle Building Bagel & Eggs", "breakfast", [
    { foodId: "bagel", servings: 1 },
    { foodId: "whole-egg", servings: 2 },
    { foodId: "egg-white", servings: 1 },
  ]),
  mt("turkey-wrap", "Turkey & Avocado Wrap", "lunch", [
    { foodId: "ground-turkey", servings: 1 },
    { foodId: "ww-bread", servings: 1 },
    { foodId: "avocado", servings: 1 },
  ]),
  mt("classic", "Classic Chicken Rice Broccoli", "dinner", [
    { foodId: "chicken-breast", servings: 1 },
    { foodId: "white-rice", servings: 1 },
    { foodId: "broccoli", servings: 1 },
  ]),
  mt("salmon-sp", "Salmon & Sweet Potato", "dinner", [
    { foodId: "salmon", servings: 1 },
    { foodId: "sweet-potato", servings: 1 },
    { foodId: "asparagus", servings: 1 },
  ]),
  mt("turkey-pasta", "Turkey Marinara Pasta", "dinner", [
    { foodId: "ground-turkey", servings: 1 },
    { foodId: "pasta", servings: 1 },
  ]),
  mt("yogurt-bowl", "Greek Yogurt Bowl", "snack", [
    { foodId: "greek-yogurt", servings: 1 },
    { foodId: "strawberries", servings: 1 },
    { foodId: "almonds", servings: 1 },
  ]),
  mt("pre-carbs", "Pre-Training Carb Load", "pre-workout", [
    { foodId: "oats", servings: 1 },
    { foodId: "banana", servings: 1 },
    { foodId: "honey", servings: 1 },
  ]),
  mt("post-chicken", "Post-Workout Chicken & Potatoes", "post-workout", [
    { foodId: "chicken-breast", servings: 1 },
    { foodId: "white-potato", servings: 1 },
  ]),
  mt("cottage-night", "Cottage Cheese Night Snack", "snack", [
    { foodId: "cottage", servings: 1 },
    { foodId: "pb", servings: 1 },
  ]),
  mt("tuna-lunch", "Tuna Work Lunch", "lunch", [
    { foodId: "tuna", servings: 1 },
    { foodId: "ww-bread", servings: 1 },
    { foodId: "apple", servings: 1 },
  ]),
  mt("chickpea-quinoa", "Chickpea Quinoa Salad", "lunch", [
    { foodId: "chickpeas", servings: 1 },
    { foodId: "quinoa", servings: 1 },
    { foodId: "spinach", servings: 1 },
  ]),
  mt("steak-pot", "Steak & Potatoes", "dinner", [
    { foodId: "sirloin", servings: 1 },
    { foodId: "white-potato", servings: 1 },
    { foodId: "green-beans", servings: 1 },
  ]),
  mt("smoothie", "Berry Recovery Smoothie", "post-workout", [
    { foodId: "whey", servings: 1 },
    { foodId: "blueberries", servings: 1 },
    { foodId: "banana", servings: 1 },
    { foodId: "skim-milk", servings: 1 },
  ]),
  mt("omelet", "Veggie Omelet", "breakfast", [
    { foodId: "whole-egg", servings: 1 },
    { foodId: "egg-white", servings: 1 },
    { foodId: "spinach", servings: 1 },
    { foodId: "cheese", servings: 1 },
  ]),
];

export const foodById = (id: string) => FOODS.find((x) => x.id === id);
export const mealTotals = (items: MealTemplateItem[]) =>
  items.reduce(
    (a, it) => {
      const food = foodById(it.foodId);
      if (!food) return a;
      return {
        calories: a.calories + food.calories * it.servings,
        protein: a.protein + food.protein * it.servings,
        carbs: a.carbs + food.carbs * it.servings,
        fat: a.fat + food.fat * it.servings,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
