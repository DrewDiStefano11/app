import assert from "node:assert/strict";
import { test } from "bun:test";
import { defaultState } from "../../src/lib/types";
import { dismissReminder, dueReminders } from "../../src/lib/reminders";
import { validateFitCoreDataIntegrity } from "../../src/lib/data-integrity";
import { createFitCoreBackupEnvelope } from "../../src/lib/data-backup";

const now = new Date(2026, 10, 24, 18).getTime();
function state() {
  const value = structuredClone(defaultState);
  value.onboardingComplete = true;
  value.personalization.reminders!.inAppEnabled = true;
  value.reminders = { workout: true, weighIn: true, lunch: true };
  return value;
}

test("delivery requires explicit opt-in and actual local due times, with no prompts on rest days or during a workout", () => {
  const value = state();
  assert.deepEqual(
    dueReminders(
      {
        ...value,
        personalization: {
          ...value.personalization,
          reminders: { ...value.personalization.reminders!, inAppEnabled: undefined },
        },
      },
      now,
    ),
    [],
  );
  assert.deepEqual(dueReminders(value, new Date(2026, 10, 24, 8).getTime()), []);
  assert.deepEqual(
    dueReminders(value, now).map((row) => row.kind),
    ["workout", "weighIn", "lunch"],
  );
  assert.equal(
    dueReminders(value, new Date(2026, 10, 22, 18).getTime()).some((row) => row.kind === "workout"),
    false,
  );
  value.activeWorkout = { id: "active", name: "Active", startedAt: now, exercises: [] };
  assert.equal(
    dueReminders(value, now).some((row) => row.kind === "workout"),
    false,
  );
  assert.deepEqual(dueReminders({ ...value, demoMode: true }, now), []);
});

test("only actual confirmed same-day records satisfy reminders; profile defaults, future entries and earlier meals do not", () => {
  const value = state();
  value.bodyweightEntries = [{ id: "future", weightLb: 180, createdAt: now + 60000 }];
  value.mealEntries = [
    {
      id: "breakfast",
      type: "breakfast",
      name: "Breakfast",
      calories: 300,
      protein: 20,
      carbs: 30,
      fat: 10,
      createdAt: now - 3600000,
    },
  ];
  assert.equal(dueReminders(value, now).length, 3);
  value.bodyweightEntries[0].createdAt = now;
  value.mealEntries[0].type = "lunch";
  assert.deepEqual(
    dueReminders(value, now).map((row) => row.kind),
    ["workout"],
  );
  value.workouts = [
    {
      id: "finished",
      name: "Finished",
      startedAt: now - 3600000,
      endedAt: now,
      exercises: [
        {
          id: "exercise",
          exerciseId: "bench-press",
          sets: [{ id: "set", completed: true, weight: 100, reps: 5 }],
        },
      ],
    },
  ];
  assert.deepEqual(dueReminders(value, now), []);
});

test("dismissal persists through the validated backup, expires by local date and preserves other suggestion metadata", () => {
  const value = state();
  value.dismissedSuggestions = ["unrelated-suggestion", "reminder:2026-01-01:weighIn"];
  const id = dueReminders(value, now).find((row) => row.kind === "weighIn")!.id;
  const dismissed = dismissReminder(value, id, now);
  assert.equal(
    dueReminders(dismissed, now).some((row) => row.kind === "weighIn"),
    false,
  );
  assert.deepEqual(dismissed.dismissedSuggestions, ["unrelated-suggestion", id]);
  assert.equal(validateFitCoreDataIntegrity(dismissed).errorCount, 0);
  const backup = createFitCoreBackupEnvelope(dismissed, {
    exportedAt: new Date(now).toISOString(),
  });
  assert.ok(backup.envelope);
  assert.ok(JSON.stringify(backup.envelope).includes(id));
  const nextDay = new Date(2026, 10, 25, 18).getTime();
  assert.equal(
    dueReminders(dismissed, nextDay).some((row) => row.kind === "weighIn"),
    true,
  );
  assert.equal(dismissReminder(dismissed, id, nextDay), dismissed);
});

test("malformed reminder metadata fails closed without replacing tracking data", () => {
  const value = state();
  value.personalization.reminders!.weighInTime = "25:99";
  assert.equal(
    dueReminders(value, now).some((row) => row.kind === "weighIn"),
    false,
  );
  assert.deepEqual(dueReminders(value, Number.MAX_VALUE), []);
  assert.ok(
    validateFitCoreDataIntegrity({
      ...value,
      personalization: {
        ...value.personalization,
        reminders: { ...value.personalization.reminders, inAppEnabled: "yes" },
      },
    }).errorCount > 0,
  );
});
