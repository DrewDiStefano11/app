import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

async function chooseExercise(page: Page, action: string, exercise: string) {
  const trigger = page.getByRole("button", { name: action, exact: true });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const sheet = page.locator(".sheet-surface").filter({
    has: page.getByRole("heading", { name: action, exact: true }),
  });
  await sheet.getByPlaceholder("Search exercise or muscle…").fill(exercise);
  await sheet.getByRole("button", { name: new RegExp("^" + exercise) }).first().click();
  await expect(sheet).toBeHidden();
}

test("swap an untouched programmed exercise without changing the bench program", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 16, 12));
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
  await page.getByRole("button", { name: "Start Upper A", exact: true }).click();
  const before = await readPersistedFitCoreState(page);

  await chooseExercise(page, "Swap exercise", "Dumbbell Bench Press");
  const after = await readPersistedFitCoreState(page);
  expect(after.activeWorkout?.id).toBe(before.activeWorkout?.id);
  expect(after.activeWorkout?.startedAt).toBe(before.activeWorkout?.startedAt);
  expect(after.activeWorkout?.exercises[0].exerciseId).toBe("db-bench");
  expect(after.activeWorkout?.exercises[0].target).toBeUndefined();
  expect(after.activeWorkout?.exercises[0].sets.every((set) =>
    !set.completed && set.weight === undefined && set.reps === undefined,
  )).toBe(true);
  expect(after.activeWorkout?.exercises.slice(1)).toEqual(before.activeWorkout?.exercises.slice(1));
  expect(after.workoutTemplates).toEqual(before.workoutTemplates);
  await page.reload();
  await expect(page.getByRole("button", { name: /Dumbbell Bench Press Active/ })).toBeVisible();
  await page.getByRole("button", { name: "Back to Training", exact: true }).click();
  await expect(page.getByText("4 × 4 at 195 lb", { exact: true })).toBeVisible();
});

test("add an alternative beside an exercise with recorded work and keep the original sets", async ({ page }) => {
  const startedAt = Date.now() - 60_000;
  await seedRevisionedFitCoreState(page, currentFitCoreState({
    onboardingComplete: true,
    activeWorkout: {
      id: "ongoing",
      name: "Lower workout",
      startedAt,
      restEndsAt: startedAt + 150_000,
      notes: "Keep the workout note",
      exercises: [{
        id: "squat-row",
        exerciseId: "squat",
        completed: false,
        notes: "Keep the squat note",
        sets: [{ id: "set-1", weight: 135, reps: 8, completed: true }],
      }],
    },
  }));
  const before = await readPersistedFitCoreState(page);
  await chooseExercise(page, "Add alternative", "Leg Press");
  const after = await readPersistedFitCoreState(page);
  expect(after.activeWorkout?.exercises).toHaveLength(2);
  expect(after.activeWorkout?.exercises[0]).toMatchObject(before.activeWorkout!.exercises[0]);
  expect(after.activeWorkout?.exercises[1].exerciseId).toBe("leg-press");
  expect(after.activeWorkout?.exercises[1].sets.every((set) => !set.completed)).toBe(true);
  expect(after.activeWorkout?.notes).toBe("Keep the workout note");
  expect(after.activeWorkout?.restEndsAt).toBe(before.activeWorkout?.restEndsAt);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Leg Press/ })).toBeVisible();
  const restored = await readPersistedFitCoreState(page);
  expect(restored.activeWorkout).toEqual(after.activeWorkout);
});

for (const priorActivity of ["legacy source", "audit reference", "rest timer history", "deleted set audit", "legacy deleted set audit"] as const) {
  test(`keep an apparently blank exercise with ${priorActivity}`, async ({ page }) => {
    const time = Date.now();
    const deletedSet = priorActivity === "deleted set audit" || priorActivity === "legacy deleted set audit";
    const original = {
      id: "squat-row",
      exerciseId: "squat",
      completed: false,
      sets: deletedSet ? [] : [{
        id: "set-1",
        completed: false,
        provenance: { source: "manual" as const, confidence: "high" as const, confirmation: "confirmed" as const },
      }],
      provenance: { source: "manual" as const, confidence: "high" as const, confirmation: "confirmed" as const },
      ...(priorActivity === "legacy source" ? { source: "imported", originalText: "Original set description" } : {}),
    };
    await seedRevisionedFitCoreState(page, currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "ongoing",
        name: "Lower workout",
        startedAt: time - 90_000,
        exercises: [original],
        ...(priorActivity === "rest timer history"
          ? { restLoggedSetKeys: [JSON.stringify(["squat-row", "removed-set"])] }
          : {}),
      },
      jarvisAudit: priorActivity === "audit reference" ? [{
        id: "audit",
        tool: "logSet",
        status: "logged",
        summary: "Logged earlier workout input",
        entityIds: ["set-1"],
        createdAt: time - 1_000,
      }] : deletedSet ? [{
        id: "delete-audit",
        tool: "deleteExerciseSet",
        status: "logged",
        summary: "Deleted active set",
        entityKind: "activeSetDelete",
        entityIds: ["removed-set"],
        patch: {
          prev: { id: "removed-set", weight: 135, reps: 8, completed: true },
          exerciseEntryId: priorActivity === "legacy deleted set audit" ? "" : "squat-row",
          exerciseId: "squat",
        },
        createdAt: time - 1_000,
      }] : [],
    }));
    await chooseExercise(page, "Add alternative", "Leg Press");
    const saved = await readPersistedFitCoreState(page);
    expect(saved.activeWorkout?.exercises).toHaveLength(2);
    expect(saved.activeWorkout?.exercises[0]).toMatchObject({
      id: original.id,
      exerciseId: original.exerciseId,
      ...(priorActivity === "legacy source" ? { originalText: "Original set description" } : {}),
    });
    expect(saved.activeWorkout?.exercises[1].exerciseId).toBe("leg-press");
  });
}
