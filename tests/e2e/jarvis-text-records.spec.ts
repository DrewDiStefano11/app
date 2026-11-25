import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("local text saves confirmed weigh-in, sleep and supplement records", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await gotoDashboard(page);
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page.getByRole("textbox", { name: "Message Jarvis" }).fill("I weigh 182.6 pounds today.");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();

  const input = page.getByPlaceholder("Talk to Jarvis...");
  const send = async (text: string) => {
    await input.fill(text);
    await input.press("Control+Enter");
  };
  const save = page.getByRole("button", { name: "Save", exact: true });
  await save.click();
  await expect(page.getByText("Logged 182.6 lb")).toBeVisible();

  await send("I slept seven and a half hours.");
  await expect(
    page.getByText("You reported 7.5 hours. How would you rate your sleep quality from 1 to 10?"),
  ).toBeVisible();
  expect((await readPersistedFitCoreState(page)).sleepEntries).toEqual([]);
  await send("8/10");
  await save.click();
  await expect(page.getByText("Logged 7.5 hours of sleep, quality 8/10.")).toBeVisible();

  await send("Log 5 grams of creatine.");
  await save.click();
  await expect(page.getByText(/Logged creatine/)).toBeVisible();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.bodyweightEntries).toMatchObject([{ weightLb: 182.6 }]);
  expect(saved.sleepEntries).toMatchObject([
    { hours: 7.5, quality: 8, provenance: { confirmation: "confirmed" } },
  ]);
  expect(saved.supplementLogs).toMatchObject([{ name: "creatine", dose: "5 grams" }]);
});

test("StairMaster follow-ups save only reported values and retain distinct sessions", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await gotoDashboard(page);
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page
    .getByRole("textbox", { name: "Message Jarvis" })
    .fill("I did 2,500 steps on the StairMaster.");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();
  await expect(page.getByText(/How many minutes did you spend on the StairMaster/)).toBeVisible();
  expect((await readPersistedFitCoreState(page)).cardioEntries).toEqual([]);

  const input = page.getByRole("textbox", { name: "Jarvis message" });
  const send = async (message: string) => {
    await input.fill(message);
    await input.press("Control+Enter");
  };
  const save = page.getByRole("button", { name: "Log cardio", exact: true });
  await send("24.5 minutes");
  const firstReview = page.getByText("Log StairMaster: 24.5 min, Reported steps: 2500.");
  await expect(firstReview).toBeVisible();
  await expect(firstReview.locator("..").getByText("kcal", { exact: true })).toHaveCount(0);
  await save.click();
  await expect(page.getByText("Logged StairMaster: 24.5 min, Reported steps: 2500.")).toBeVisible();

  await send("I did 2,700 steps on the StairMaster.");
  await expect(
    page.getByText(/How many minutes did you spend on the StairMaster/).last(),
  ).toBeVisible();
  await send("24.5 minutes");
  await expect(page.getByText("Log StairMaster: 24.5 min, Reported steps: 2700.")).toBeVisible();
  await save.click();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.cardioEntries).toMatchObject([
    { minutes: 24.5, notes: "Reported steps: 2500" },
    { minutes: 24.5, notes: "Reported steps: 2700" },
  ]);
  for (const session of saved.cardioEntries) {
    expect(session).not.toHaveProperty("incline");
    expect(session).not.toHaveProperty("distanceMi");
  }
});

test("recovery ratings collected in follow-ups save together only after review", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await gotoDashboard(page);
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page
    .getByRole("textbox", { name: "Message Jarvis" })
    .fill("My energy is a four out of five today.");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();
  await expect(page.getByText(/You reported energy at 8\/10.*rate soreness/)).toBeVisible();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  const send = async (text: string) => {
    await input.fill(text);
    await input.press("Control+Enter");
  };
  await send("I'm very sore from yesterday.");
  await expect(page.getByText("How strong is the soreness on a scale of 1 to 10?")).toBeVisible();
  await send("7/10");
  await expect(page.getByText(/rate stress from 1 to 10/)).toBeVisible();
  await send("3");
  await expect(page.getByText(/rate motivation from 1 to 10/)).toBeVisible();
  await send("8");
  await expect(
    page.getByText("Daily check-in - energy 8, soreness 7, stress 3, motivation 8"),
  ).toBeVisible();
  expect((await readPersistedFitCoreState(page)).recoveryCheckIns).toEqual([]);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.recoveryCheckIns).toMatchObject([
    { energy: 8, soreness: 7, stress: 3, motivation: 8 },
  ]);

  await send("My energy is five out of five today.");
  await expect(page.getByText("Update today's check-in: energy")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).recoveryCheckIns).toMatchObject([
    { id: saved.recoveryCheckIns[0].id, energy: 10, soreness: 7, stress: 3, motivation: 8 },
  ]);
});

test("workout history, the rest timer, and the schedule answer from saved data offline", async ({
  page,
}) => {
  const now = new Date(2026, 10, 16, 12);
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "today",
        name: "Upper A",
        startedAt: now.getTime() - 60_000,
        restEndsAt: now.getTime() + 55_000,
        exercises: [
          {
            id: "active-bench",
            exerciseId: "bench-press",
            completed: false,
            sets: [{ id: "unlogged-set", completed: false, weight: 300, reps: 1 }],
          },
        ],
      },
      workouts: [9, 13].map((day, index) => ({
        id: `saved-${day}`,
        name: "Upper A",
        startedAt: new Date(2026, 10, day, 12).getTime(),
        endedAt: new Date(2026, 10, day, 13).getTime(),
        exercises: [
          {
            id: `bench-${day}`,
            exerciseId: "bench-press",
            completed: true,
            sets: [
              {
                id: `set-${day}`,
                completed: true,
                weight: index === 0 ? 190 : 195,
                reps: index === 0 ? 5 : 4,
              },
            ],
          },
        ],
      })),
    }),
  );
  await expect(page.getByRole("heading", { name: "Upper A" })).toBeVisible();
  const original = await readPersistedFitCoreState(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/_serverFn/")) requests.push(request.url());
  });
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Open Jarvis" }).click();
  const replies = page.locator(".jarvis-layout");
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  const send = async (message: string) => {
    await input.fill(message);
    await input.press("Control+Enter");
  };
  await send("How much did I bench last Monday?");
  await expect(replies.getByText(/190 lb × 5/)).toBeVisible();
  await send("What about Friday?");
  await expect(replies.getByText(/195 lb × 4/)).toBeVisible();
  await send("Compare the two.");
  await expect(replies.getByText(/190 lb × 5.*195 lb × 4/s)).toBeVisible();
  await send("Compare today's bench sets with last week's.");
  await expect(replies.getByText(/Today: no completed sets logged/)).toBeVisible();
  await send("How much time is left on my rest timer?");
  await expect(replies.getByText("Your rest timer has 55 seconds left.")).toBeVisible();
  await send("What am I supposed to train tomorrow?");
  await expect(replies.getByText(/Scheduled workout: Lower A/)).toBeVisible();
  expect(await readPersistedFitCoreState(page)).toEqual(original);
  expect(requests).toEqual([]);
});
