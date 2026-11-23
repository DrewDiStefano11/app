import type { AppState } from "./types";

// Match the established Jarvis bodyweight-entry/correction limits.
export const MIN_BODYWEIGHT_LB = 40;
export const MAX_BODYWEIGHT_LB = 700;
export const BODYWEIGHT_INPUT_ERROR = "Enter a weight from 40 to 700 lb.";
export const BODYWEIGHT_SAVE_ERROR =
  "Weigh-in could not be saved. Your draft is still here. Resolve the storage warning, then retry.";

export function parseBodyweightLb(input: string): number | undefined {
  const text = input.trim();
  if (!/^\d+(?:\.\d*)?$/.test(text)) return;
  const value = Number(text);
  return Number.isFinite(value) && value >= MIN_BODYWEIGHT_LB && value <= MAX_BODYWEIGHT_LB
    ? value
    : undefined;
}

export function recordManualBodyweight(
  state: AppState,
  entry: AppState["bodyweightEntries"][number],
): AppState {
  if (
    parseBodyweightLb(String(entry.weightLb)) === undefined ||
    !entry.id ||
    !Number.isFinite(entry.createdAt) ||
    entry.createdAt <= 0 ||
    state.bodyweightEntries.some((existing) => existing.id === entry.id)
  )
    return state;
  return {
    ...state,
    bodyweightEntries: [...state.bodyweightEntries, entry],
    profile: { ...state.profile, bodyweightLb: entry.weightLb },
    goals: state.goals.map((goal) =>
      goal.type === "bodyweight" ? { ...goal, current: entry.weightLb } : goal,
    ),
  };
}
