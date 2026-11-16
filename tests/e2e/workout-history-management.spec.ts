import { expect, test, type Page } from "@playwright/test";
import type { Workout } from "../../src/lib/types";
import { extractRecoverySignalsFromNotes } from "../../src/lib/fitcore-data";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

async function openTraining(page: Page) {
  await expectDashboardReady(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
}

function session(id: string, name: string, startedAt: number, weight: number): Workout {
  return {
    id,
    name,
    startedAt,
    endedAt: startedAt + 3_600_000,
    notes: "Original session note",
    exercises: [
      {
        id: id + "-exercise",
        exerciseId: "bench-press",
        completed: true,
        notes: "Keep the exercise note",
        sets: [
          { id: id + "-set-1", completed: true, weight, reps: 5 },
          { id: id + "-set-2", completed: false, weight: 500, reps: 5 },
        ],
      },
    ],
  };
}

async function seedHistory(page: Page) {
  const now = Date.now();
  const older = session("previous", "Previous day", now - 3 * 86_400_000, 150);
  const latest = session("latest", "Max day", now - 2 * 86_400_000, 200);
  latest.notes = "Shoulder pain after the first set.";
  older.exercises[0].notes = "Elbow soreness after the last set.";
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      workouts: [older, latest],
      recoverySignals: [
        ...extractRecoverySignalsFromNotes(latest.notes, latest.id, latest.endedAt),
        ...extractRecoverySignalsFromNotes(
          older.exercises[0].notes,
          older.exercises[0].id,
          older.endedAt,
        ),
      ],
      prs: [
        {
          id: "legacy-pr",
          exerciseId: "bench-press",
          type: "1rm",
          value: 233,
          weight: 200,
          reps: 5,
          date: latest.endedAt!,
        },
      ],
    }),
  );
  return { older, latest };
}

async function openDetail(page: Page) {
  await page.getByText("Max day", { exact: true }).click();
  const history = page.locator(".sheet-surface").filter({ hasText: "Workout history" });
  await history.getByText("Max day", { exact: true }).click();
  return page.locator(".sheet-surface").filter({
    has: page.getByRole("heading", { name: "Max day", exact: true }),
  });
}

test("correct a saved workout and recompute personal records from completed sets", async ({
  page,
}) => {
  const { older, latest } = await seedHistory(page);
  await openTraining(page);
  const detail = await openDetail(page);
  await detail.getByRole("button", { name: "Edit workout", exact: true }).click();
  await page.getByLabel("Workout name", { exact: true }).fill("Corrected day");
  await page.getByLabel("Workout notes", { exact: true }).fill("First set used 100 lb.");
  await page.getByLabel("Set 1 weight (lb)", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Corrected day", exact: true })).toBeVisible();
  await expect(page.getByText("Set 1: 100lb × 5 ✓", { exact: true })).toBeVisible();
  const after = await readPersistedFitCoreState(page);
  expect(after.workouts).toHaveLength(2);
  expect(after.recoverySignals.map((signal) => signal.sourceLogId)).toEqual([
    older.exercises[0].id,
  ]);
  expect(after.workouts[0]).toMatchObject(older);
  expect(after.workouts[1]).toMatchObject({
    id: latest.id,
    startedAt: latest.startedAt,
    endedAt: latest.endedAt,
    name: "Corrected day",
    notes: "First set used 100 lb.",
    exercises: [
      {
        id: latest.exercises[0].id,
        notes: "Keep the exercise note",
        sets: [
          {
            id: latest.exercises[0].sets[0].id,
            weight: 100,
            reps: 5,
            completed: true,
            provenance: { editedBy: "user" },
          },
          latest.exercises[0].sets[1],
        ],
      },
    ],
  });

  await page.reload();
  await openTraining(page);
  await page.getByText("Open training analytics", { exact: true }).click();
  await expect(page.getByText("150lb × 5", { exact: true })).toBeVisible();
  await expect(page.getByText("200lb × 5", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Close performance panel" }).click();

  await page.getByText("Corrected day", { exact: true }).click();
  const history = page.locator(".sheet-surface").filter({ hasText: "Workout history" });
  await history.getByText("Previous day", { exact: true }).click();
  await page.getByRole("button", { name: "Delete workout", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(history.getByText("Previous day", { exact: true })).toBeHidden();
  expect((await readPersistedFitCoreState(page)).recoverySignals).toHaveLength(0);
  await page.getByRole("button", { name: "Close history panel" }).click();
  await page.getByText("Open training analytics", { exact: true }).click();
  await expect(page.getByText("100lb × 5", { exact: true })).toBeVisible();
  await expect(page.getByText("150lb × 5", { exact: true })).toBeHidden();
});

test("failed history edits and deletions keep the verified workout and the edit draft", async ({
  page,
}) => {
  const { latest } = await seedHistory(page);
  await openTraining(page);
  await (await openDetail(page)).getByRole("button", { name: "Edit workout", exact: true }).click();
  const notes = page.getByLabel("Workout notes", { exact: true });
  await notes.fill("Must survive the rejected write.");
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota limit", "QuotaExceededError");
    };
    window.addEventListener(
      "fitcore-restore-writes",
      () => {
        Storage.prototype.setItem = write;
      },
      { once: true },
    );
  });
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Workout changes could not be saved");
  await expect(notes).toHaveValue("Must survive the rejected write.");
  expect((await readPersistedFitCoreState(page)).workouts[1]).toMatchObject(latest);
  await page.getByRole("button", { name: "Cancel changes", exact: true }).click();
  await page.getByRole("button", { name: "Delete workout", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Workout could not be deleted");
  await expect(page.getByRole("heading", { name: "Max day", exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).workouts[1]).toMatchObject(latest);

  await page.evaluate(() => window.dispatchEvent(new Event("fitcore-restore-writes")));
  await page.getByRole("button", { name: "Delete workout", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Max day", exact: true })).toBeHidden();
  expect((await readPersistedFitCoreState(page)).workouts.map((workout) => workout.id)).toEqual([
    "previous",
  ]);
});
