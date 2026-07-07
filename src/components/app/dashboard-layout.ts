/**
 * Presentation contract for FitCore dashboard customization.
 *
 * This module is intentionally not imported by runtime screens yet. It defines
 * the committed product direction for a follow-up PR after AI PR #2 merges,
 * without changing current rendering, state, persistence, or data flow.
 */

export type DashboardScreenId =
  | "home"
  | "training"
  | "nutrition"
  | "recovery"
  | "progress"
  | "body"
  | "settings";

export type WidgetCategory =
  | "training"
  | "nutrition"
  | "recovery"
  | "body"
  | "ai"
  | "general";

export type WidgetSize = "small" | "medium" | "large" | "full";
export type DashboardDensity = "compact" | "standard" | "detailed";

export type WidgetId =
  | "fitcore-score"
  | "training-score"
  | "nutrition-score"
  | "recovery-score"
  | "body-score"
  | "longevity-score"
  | "daily-plan"
  | "ai-insight"
  | "weekly-review"
  | "why-this-score"
  | "recommended-action"
  | "workout-volume"
  | "muscle-volume"
  | "pr-trend"
  | "exercise-progress"
  | "active-workout"
  | "workout-history"
  | "previous-performance"
  | "calories-target"
  | "macro-ring"
  | "protein-progress"
  | "hydration-trend"
  | "meal-quality"
  | "supplement-log"
  | "sleep-trend"
  | "fatigue-trend"
  | "soreness-pain"
  | "recovery-actions"
  | "readiness"
  | "muscle-heatmap"
  | "bodyweight-trend"
  | "measurements"
  | "body-balance"
  | "goal-progress"
  | "timeline"
  | "quick-log"
  | "notes"
  | "consistency-calendar";

export interface WidgetDefinition {
  id: WidgetId;
  category: WidgetCategory;
  label: string;
  description: string;
  supportedSizes: readonly WidgetSize[];
  defaultSize: WidgetSize;
  emptyStateLabel: string;
}

export interface WidgetPlacement {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
  order: number;
}

export interface DashboardPreset {
  id: string;
  screen: DashboardScreenId;
  label: string;
  density: DashboardDensity;
  widgets: readonly WidgetPlacement[];
}

export const widgetRegistry: readonly WidgetDefinition[] = [
  {
    id: "fitcore-score",
    category: "general",
    label: "FitCore Score",
    description: "Overall daily health and fitness signal.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Complete your first check-in to build a score.",
  },
  {
    id: "daily-plan",
    category: "ai",
    label: "Daily Plan",
    description: "Today’s recommended focus and next action.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel:
      "Your daily plan will appear when enough context is available.",
  },
  {
    id: "ai-insight",
    category: "ai",
    label: "AI Insight",
    description: "A concise explanation of the most useful signal.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Insights will appear as FitCore learns from your logs.",
  },
  {
    id: "workout-volume",
    category: "training",
    label: "Volume Chart",
    description: "Training volume over time.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Complete a workout to start your volume trend.",
  },
  {
    id: "muscle-volume",
    category: "training",
    label: "Muscle Breakdown",
    description: "Volume distribution by muscle group.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Muscle volume appears after completed working sets.",
  },
  {
    id: "pr-trend",
    category: "training",
    label: "PR Trend",
    description: "Strength progress and recent personal records.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "medium",
    emptyStateLabel: "Log weight and reps to establish a strength trend.",
  },
  {
    id: "active-workout",
    category: "training",
    label: "Active Workout",
    description: "Current workout and next set.",
    supportedSizes: ["large", "full"],
    defaultSize: "full",
    emptyStateLabel: "Start a workout to see it here.",
  },
  {
    id: "calories-target",
    category: "nutrition",
    label: "Calories vs Target",
    description: "Daily calorie progress.",
    supportedSizes: ["small", "medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Log a meal to begin today’s calorie progress.",
  },
  {
    id: "macro-ring",
    category: "nutrition",
    label: "Macro Ring",
    description: "Protein, carbohydrate, and fat balance.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Macro balance appears after your first meal.",
  },
  {
    id: "protein-progress",
    category: "nutrition",
    label: "Protein Progress",
    description: "Daily protein target progress.",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    emptyStateLabel: "Log protein to track this target.",
  },
  {
    id: "hydration-trend",
    category: "nutrition",
    label: "Hydration Trend",
    description: "Hydration progress over time.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Hydration logs will build this trend.",
  },
  {
    id: "readiness",
    category: "recovery",
    label: "Readiness",
    description: "Current readiness and recovery context.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Complete a check-in to calculate readiness.",
  },
  {
    id: "sleep-trend",
    category: "recovery",
    label: "Sleep Trend",
    description: "Sleep duration and quality over time.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Log sleep to begin your recovery trend.",
  },
  {
    id: "soreness-pain",
    category: "recovery",
    label: "Soreness & Pain",
    description: "Recent soreness and pain signals.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Recovery check-ins will populate this view.",
  },
  {
    id: "muscle-heatmap",
    category: "body",
    label: "Muscle Heatmap",
    description: "Muscle load, recovery, and balance.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Train or check in to populate your muscle map.",
  },
  {
    id: "bodyweight-trend",
    category: "body",
    label: "Bodyweight Trend",
    description: "Bodyweight movement over time.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Add two weigh-ins to reveal your trend.",
  },
  {
    id: "goal-progress",
    category: "body",
    label: "Goal Progress",
    description: "Progress toward selected goals.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Add a goal to begin tracking progress.",
  },
  {
    id: "timeline",
    category: "general",
    label: "Daily Timeline",
    description: "Today’s training, nutrition, and recovery activity.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Today’s activity will appear as you log it.",
  },
  {
    id: "quick-log",
    category: "general",
    label: "Quick Log",
    description: "Fast access to common logging actions.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Choose the actions you use most.",
  },
  {
    id: "notes",
    category: "general",
    label: "Notes",
    description: "A simple daily check-in and notes block.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "medium",
    emptyStateLabel: "Add a note for today.",
  },
  {
    id: "consistency-calendar",
    category: "general",
    label: "Consistency",
    description: "A calendar view of completed habits and logs.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Consistency builds as you use FitCore.",
  },
  {
    id: "training-score",
    category: "training",
    label: "Training Score",
    description: "Training consistency and output summary.",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    emptyStateLabel: "Complete workouts to build your training score.",
  },
  {
    id: "nutrition-score",
    category: "nutrition",
    label: "Nutrition Score",
    description: "Daily nutrition adherence summary.",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    emptyStateLabel: "Log meals to build your nutrition score.",
  },
  {
    id: "recovery-score",
    category: "recovery",
    label: "Recovery Score",
    description: "Sleep and recovery summary.",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    emptyStateLabel: "Complete a recovery check-in to build this score.",
  },
  {
    id: "body-score",
    category: "body",
    label: "Body Score",
    description: "Body composition and progress summary.",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    emptyStateLabel: "Add body measurements to build this score.",
  },
  {
    id: "longevity-score",
    category: "general",
    label: "Longevity Score",
    description: "Long-term health habit summary.",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    emptyStateLabel: "More consistent health data is needed for this score.",
  },
  {
    id: "weekly-review",
    category: "ai",
    label: "Weekly Review",
    description: "AI-assisted review of the week.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Your review will appear after a full week of activity.",
  },
  {
    id: "why-this-score",
    category: "ai",
    label: "Why This Score?",
    description: "Plain-language score explanation.",
    supportedSizes: ["medium", "large"],
    defaultSize: "large",
    emptyStateLabel: "Score explanations appear when a score is available.",
  },
  {
    id: "recommended-action",
    category: "ai",
    label: "Recommended Action",
    description: "The next useful action for today.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Recommendations appear when enough context is available.",
  },
  {
    id: "exercise-progress",
    category: "training",
    label: "Exercise Progress",
    description: "Performance trend for a selected exercise.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Choose an exercise with logged sets to see progress.",
  },
  {
    id: "workout-history",
    category: "training",
    label: "Workout History",
    description: "Recent completed sessions.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel: "Completed workouts will appear here.",
  },
  {
    id: "previous-performance",
    category: "training",
    label: "Previous Performance",
    description: "Last-session context for current training.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel:
      "Previous performance appears after repeating an exercise.",
  },
  {
    id: "meal-quality",
    category: "nutrition",
    label: "Meal Quality",
    description: "A visual summary of recent meal balance.",
    supportedSizes: ["medium", "large"],
    defaultSize: "large",
    emptyStateLabel: "Log meals to build your quality summary.",
  },
  {
    id: "supplement-log",
    category: "nutrition",
    label: "Supplement Log",
    description: "Today’s supplement check-off.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Add supplements to begin tracking them.",
  },
  {
    id: "fatigue-trend",
    category: "recovery",
    label: "Fatigue Trend",
    description: "Fatigue movement over time.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Recovery check-ins will build this trend.",
  },
  {
    id: "recovery-actions",
    category: "recovery",
    label: "Recovery Actions",
    description: "Useful recovery actions for today.",
    supportedSizes: ["medium", "large", "full"],
    defaultSize: "large",
    emptyStateLabel:
      "Recovery actions appear when enough context is available.",
  },
  {
    id: "measurements",
    category: "body",
    label: "Measurements",
    description: "Recent body measurements and change.",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    emptyStateLabel: "Add measurements to track change over time.",
  },
  {
    id: "body-balance",
    category: "body",
    label: "Body Balance",
    description: "Left/right and muscle-group balance.",
    supportedSizes: ["large", "full"],
    defaultSize: "large",
    emptyStateLabel: "More balanced training data is needed for this view.",
  },
];

function place(id: WidgetId, order: number, size: WidgetSize): WidgetPlacement {
  return { id, visible: true, size, order };
}

export const defaultDashboardPresets: readonly DashboardPreset[] = [
  {
    id: "home-standard",
    screen: "home",
    label: "FitCore Today",
    density: "standard",
    widgets: [
      place("fitcore-score", 1, "large"),
      place("daily-plan", 2, "large"),
      place("readiness", 3, "medium"),
      place("macro-ring", 4, "medium"),
      place("workout-volume", 5, "large"),
      place("muscle-heatmap", 6, "large"),
      place("ai-insight", 7, "large"),
      place("quick-log", 8, "large"),
    ],
  },
  {
    id: "training-standard",
    screen: "training",
    label: "Training Overview",
    density: "standard",
    widgets: [
      place("active-workout", 1, "full"),
      place("workout-volume", 2, "large"),
      place("muscle-volume", 3, "large"),
      place("previous-performance", 4, "medium"),
      place("pr-trend", 5, "medium"),
      place("workout-history", 6, "large"),
    ],
  },
  {
    id: "nutrition-standard",
    screen: "nutrition",
    label: "Nutrition Overview",
    density: "standard",
    widgets: [
      place("calories-target", 1, "medium"),
      place("macro-ring", 2, "medium"),
      place("protein-progress", 3, "small"),
      place("hydration-trend", 4, "medium"),
      place("meal-quality", 5, "large"),
      place("supplement-log", 6, "medium"),
    ],
  },
  {
    id: "recovery-standard",
    screen: "recovery",
    label: "Recovery Overview",
    density: "standard",
    widgets: [
      place("readiness", 1, "large"),
      place("sleep-trend", 2, "large"),
      place("fatigue-trend", 3, "medium"),
      place("soreness-pain", 4, "medium"),
      place("recovery-actions", 5, "large"),
      place("muscle-heatmap", 6, "large"),
    ],
  },
  {
    id: "progress-standard",
    screen: "progress",
    label: "Progress Overview",
    density: "standard",
    widgets: [
      place("fitcore-score", 1, "large"),
      place("bodyweight-trend", 2, "large"),
      place("pr-trend", 3, "large"),
      place("goal-progress", 4, "large"),
      place("consistency-calendar", 5, "large"),
    ],
  },
  {
    id: "body-standard",
    screen: "body",
    label: "Body Overview",
    density: "standard",
    widgets: [
      place("muscle-heatmap", 1, "full"),
      place("bodyweight-trend", 2, "large"),
      place("body-balance", 3, "large"),
      place("measurements", 4, "medium"),
      place("goal-progress", 5, "large"),
    ],
  },
];
