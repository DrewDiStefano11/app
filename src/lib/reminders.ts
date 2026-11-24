import type { AppState } from "./types";
import { defaultPersonalization } from "./types";
import { addCalendarDays, dayKey } from "./analytics/date-time";
import { hasPerformedSet } from "./analytics/observed-fitness";
import { jarvisScheduledWorkout } from "./jarvis/scheduled-workout";

export type ReminderKind = "workout" | "weighIn" | "lunch";
export const REMINDER_CONFIG = {
  workout: {
    label: "Workout",
    field: "workoutTime",
    fallback: "17:00",
    action: "Open scheduled workout",
  },
  weighIn: { label: "Weigh-in", field: "weighInTime", fallback: "09:00", action: "Log weigh-in" },
  lunch: { label: "Lunch log", field: "mealLogTime", fallback: "12:00", action: "Log lunch" },
} as const;
export const validReminderTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

export function reminderPreferences(state: AppState) {
  return { ...defaultPersonalization.reminders!, ...state.personalization.reminders };
}

/** Foreground Home reminders only. No background notification is scheduled. */
export function dueReminders(state: AppState, now = Date.now()) {
  if (
    !state.onboardingComplete ||
    state.demoMode ||
    state.personalization.reminders?.inAppEnabled !== true ||
    !Number.isFinite(new Date(now).getTime())
  )
    return [];
  const date = dayKey(now);
  const current = new Date(now);
  const minutes = current.getHours() * 60 + current.getMinutes();
  const today = (at: number) => Number.isFinite(at) && at <= now && dayKey(at) === date;
  const recorded = (provenance?: { confirmation?: string; source?: string }) =>
    provenance?.confirmation !== "unconfirmed" &&
    (provenance?.source !== "ai-estimated" || provenance.confirmation === "confirmed");
  const preferences = reminderPreferences(state);
  return (Object.keys(REMINDER_CONFIG) as ReminderKind[]).flatMap((kind) => {
    const id = `reminder:${date}:${kind}`;
    const config = REMINDER_CONFIG[kind];
    const time = preferences[config.field];
    if (
      !state.reminders[kind] ||
      state.dismissedSuggestions.includes(id) ||
      !validReminderTime(time)
    )
      return [];
    const [hour, minute] = time.split(":").map(Number);
    if (minutes < hour * 60 + minute) return [];
    if (
      kind === "weighIn" &&
      state.bodyweightEntries.some(
        (row) => row.weightLb > 0 && today(row.createdAt) && recorded(row.provenance),
      )
    )
      return [];
    if (
      kind === "lunch" &&
      state.mealEntries.some(
        (row) => row.type === "lunch" && today(row.createdAt) && recorded(row.provenance),
      )
    )
      return [];
    if (kind === "workout") {
      if (
        state.activeWorkout ||
        state.workouts.some(
          (row) =>
            today(row.endedAt ?? row.startedAt) &&
            recorded(row.provenance) &&
            row.exercises.some(
              (exercise) => recorded(exercise.provenance) && exercise.sets.some(hasPerformedSet),
            ),
        )
      )
        return [];
      if (!jarvisScheduledWorkout(state, current)) return [];
    }
    return [{ id, kind, time, label: config.label, action: config.action }];
  });
}

export function dismissReminder(state: AppState, id: string, now = Date.now()): AppState {
  if (!dueReminders(state, now).some((row) => row.id === id)) return state;
  const cutoff = dayKey(addCalendarDays(now, -30));
  const retained = state.dismissedSuggestions.filter((key) => {
    const reminder = /^reminder:(\d{4}-\d{2}-\d{2}):(workout|weighIn|lunch)$/.exec(key);
    return !reminder || reminder[1] >= cutoff;
  });
  return { ...state, dismissedSuggestions: [...retained, id] };
}
