import { expect, test, type Page } from "@playwright/test";
import { defaultState } from "../../src/lib/types";
import { FITCORE_STORAGE_KEY } from "./helpers/fitcore-test-state";

const now = () => Date.now();

function recoveryState(overrides: Record<string, unknown> = {}) {
  return {
    ...defaultState,
    onboardingComplete: true,
    demoMode: false,
    profile: { ...defaultState.profile, name: "Drew", sleepGoalH: 8 },
    sleepEntries: [],
    recoveryCheckIns: [],
    muscleFatigue: {},
    supplementLogs: [],
    ...overrides,
  };
}

function completeState() {
  const createdAt = now();
  return recoveryState({
    sleepEntries: [
      {
        id: "sleep-complete",
        hours: 8,
        quality: 8,
        notes: "Bed 10:45 PM · Wake 6:45 AM",
        createdAt,
      },
    ],
    recoveryCheckIns: [
      {
        id: "check-complete",
        energy: 7,
        soreness: 3,
        stress: 3,
        motivation: 8,
        notes: "Long but useful note about a demanding travel day and a late training session.",
        createdAt: createdAt - 1_000,
      },
    ],
    muscleFatigue: { chest: "fresh", quads: "moderate", hamstrings: "very" },
    supplementLogs: [{ id: "supplement", name: "Creatine monohydrate", dose: "5 g", createdAt }],
    userGoalsProfile: {
      ...defaultState.userGoalsProfile,
      supplementRoutine: ["Creatine monohydrate", "Magnesium glycinate"],
    },
  });
}

async function seedState(page: Page, state: Record<string, unknown>) {
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.location.reload();
    },
    { key: FITCORE_STORAGE_KEY, value: state },
  );
  await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible({ timeout: 10_000 });
}

async function openRecovery(page: Page) {
  const expand = page.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();
}

async function openRecoveryWithState(page: Page, state: Record<string, unknown>) {
  await seedState(page, state);
  await openRecovery(page);
}

async function persistedState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), FITCORE_STORAGE_KEY);
}

test.describe("Recovery Daily premium redesign", () => {
  test("renders complete readiness with exact contributors and keeps Deep Dive separate", async ({
    page,
  }, testInfo) => {
    await openRecoveryWithState(page, completeState());

    await expect(page.getByRole("progressbar", { name: "Readiness 81 percent" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "High readiness" })).toBeVisible();
    await expect(page.getByText("90 point contribution", { exact: true })).toBeVisible();
    await expect(page.getByText("73 point contribution", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Missing inputs are excluded, never treated as zero."),
    ).toBeVisible();
    await expect(page.getByText("8 h", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Quality 8/10", { exact: false })).toBeVisible();
    await expect(page.getByText("Quads", { exact: true })).toBeVisible();
    await expect(page.getByText("Moderate", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/no HRV, resting heart rate, or strain values are fabricated/i),
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("recovery-complete.png"), fullPage: true });

    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(page.getByRole("button", { name: "Daily View", exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recovery Deep Dive", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "Recovery date range" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contributor analysis" })).toBeVisible();
    await page.getByRole("button", { name: "Daily View", exact: true }).click();
    await expect(page.getByRole("heading", { name: "High readiness" })).toBeVisible();
  });

  test("shows honest empty, sleep-only, explicit-zero, and invalid states", async ({
    page,
  }, testInfo) => {
    await openRecoveryWithState(page, recoveryState());
    await expect(page.getByRole("img", { name: "Readiness unavailable" })).toBeVisible();
    await expect(page.getByLabel(/Needs more data/i)).toBeVisible();
    await expect(page.getByText("No sleep entry is available.")).toBeVisible();
    await expect(page.getByText("No check-in is available.")).toBeVisible();
    await expect(page.getByText("No muscle status is logged.", { exact: false })).toBeVisible();
    await expect(page.getByText("No recovery activity today", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("recovery-empty.png"), fullPage: true });

    await openRecoveryWithState(
      page,
      recoveryState({
        sleepEntries: [{ id: "zero-sleep", hours: 0, quality: 1, createdAt: now() }],
      }),
    );
    await expect(page.getByRole("progressbar", { name: "Readiness 5 percent" })).toBeVisible();
    await expect(page.getByText("5 point contribution", { exact: true })).toBeVisible();
    await expect(page.getByText("0 h", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/Partial data/i)).toBeVisible();
    await expect(page.getByText("No check-in is available.")).toBeVisible();

    await openRecoveryWithState(
      page,
      recoveryState({
        sleepEntries: [{ id: "invalid-sleep", hours: null, quality: 7, createdAt: now() }],
      }),
    );
    await expect(page.getByLabel(/Needs more data/i)).toBeVisible();
    await expect(page.getByText("No sleep entry is available.")).toBeVisible();
    expect((await persistedState(page)).sleepEntries).toEqual([]);
    await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("recovery-invalid.png"), fullPage: true });
  });

  test("keeps check-in-only and explicit minimum values distinct from missing", async ({
    page,
  }) => {
    await openRecoveryWithState(
      page,
      recoveryState({
        recoveryCheckIns: [
          {
            id: "minimum-check",
            energy: 1,
            soreness: 1,
            stress: 1,
            motivation: 1,
            createdAt: now(),
          },
        ],
      }),
    );

    await expect(page.getByRole("progressbar", { name: "Readiness 50 percent" })).toBeVisible();
    await expect(page.getByText("50 point contribution", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/Partial data/i)).toBeVisible();
    await expect(page.getByText("No sleep entry is available.")).toBeVisible();
    const checkCard = page.getByRole("article").filter({ hasText: "Daily check-in" });
    await expect(checkCard.getByText("1", { exact: true })).toHaveCount(4);
    await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
  });

  test("labels older contributors as stale while keeping their dated values visible", async ({
    page,
  }, testInfo) => {
    const createdAt = now() - 72 * 60 * 60 * 1_000;
    await openRecoveryWithState(
      page,
      recoveryState({
        sleepEntries: [{ id: "stale-sleep", hours: 8, quality: 8, createdAt }],
        recoveryCheckIns: [
          {
            id: "stale-check",
            energy: 7,
            soreness: 3,
            stress: 3,
            motivation: 8,
            createdAt,
          },
        ],
      }),
    );

    await expect(page.getByLabel(/Update needed/i)).toBeVisible();
    await expect(page.getByText("Stale", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Update stale sleep data" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Readiness 81 percent" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("recovery-stale.png"), fullPage: true });
  });

  test("logs and cancels a labeled check-in, then preserves it across reload", async ({ page }) => {
    await openRecoveryWithState(page, recoveryState());
    await page.getByRole("button", { name: "Daily check-in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Daily check-in", exact: true })).toBeVisible();
    for (const label of ["Energy", "Soreness", "Stress", "Motivation", "Notes"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await page.getByLabel("Energy", { exact: true }).fill("6");
    await page.getByLabel("Soreness", { exact: true }).fill("4");
    await page.getByLabel("Stress", { exact: true }).fill("5");
    await page.getByLabel("Motivation", { exact: true }).fill("7");
    await page.getByLabel("Notes", { exact: true }).fill("Calm morning after a long travel day");
    await page.getByRole("button", { name: "Save check-in", exact: true }).click();
    await expect(page.getByText("60 point contribution", { exact: true })).toBeVisible();
    await expect.poll(async () => (await persistedState(page)).recoveryCheckIns?.length).toBe(1);

    await page.getByRole("button", { name: "Log new", exact: true }).last().click();
    await page.getByLabel("Notes", { exact: true }).fill("Should not save");
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await persistedState(page)).recoveryCheckIns?.length).toBe(1);

    await page.reload();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
    await openRecovery(page);
    await expect(page.getByText("60 point contribution", { exact: true })).toBeVisible();
  });

  test("validates, cancels, saves, and reloads sleep without fabricating values", async ({
    page,
  }) => {
    await openRecoveryWithState(page, recoveryState());
    await page.getByRole("button", { name: "Log sleep", exact: true }).first().click();
    await expect(page.getByLabel("Hours", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Quality", { exact: true })).toBeVisible();
    await page.getByLabel("Hours", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Save sleep", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Enter sleep hours greater than 0 and no more than 24.",
    );
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await persistedState(page)).sleepEntries?.length).toBe(0);

    await page.getByRole("button", { name: "Log sleep", exact: true }).first().click();
    await page.getByLabel("Hours", { exact: true }).fill("6.5");
    await page.getByLabel("Quality", { exact: true }).fill("6");
    await page.getByLabel("Bedtime", { exact: true }).fill("12:15 AM");
    await page.getByLabel("Wake", { exact: true }).fill("6:45 AM");
    await page.getByRole("button", { name: "Save sleep", exact: true }).click();
    await expect(page.getByText("71 point contribution", { exact: true })).toBeVisible();
    await expect.poll(async () => (await persistedState(page)).sleepEntries?.[0]?.hours).toBe(6.5);
    await page.reload();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
    await openRecovery(page);
    await expect(page.getByText("6.5 h", { exact: true }).first()).toBeVisible();
  });

  test("preserves accessible fatigue selection and confirmed deletion", async ({
    page,
  }, testInfo) => {
    await openRecoveryWithState(
      page,
      recoveryState({
        sleepEntries: [{ id: "delete-sleep", hours: 7, quality: 7, createdAt: now() }],
        muscleFatigue: { quads: "moderate" },
      }),
    );
    await expect(page.getByText("1 of 10 muscle groups have an explicit status.")).toBeVisible();
    await page.getByRole("button", { name: "Update all", exact: true }).click();
    const fatiguedChest = page.getByRole("button", { name: "chest: fatigued", exact: true });
    await expect(fatiguedChest).toHaveAttribute("aria-pressed", "false");
    await fatiguedChest.focus();
    await fatiguedChest.press("Enter");
    await expect(fatiguedChest).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByText("Fatigued", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete latest sleep entry" }).click();
    await expect(page.getByRole("heading", { name: "Delete sleep?", exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("recovery-delete-dialog.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("79 point contribution", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delete latest sleep entry" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("img", { name: "Readiness unavailable" })).toBeVisible();
    await expect(page.getByText("No sleep entry is available.")).toBeVisible();
    await expect.poll(async () => (await persistedState(page)).sleepEntries?.length).toBe(0);
  });

  test("is keyboard usable, reduced-motion safe, overflow-free, and navigation-safe at every width", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openRecoveryWithState(page, completeState());

    for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `no document overflow at ${width}px`,
      ).toBe(true);
      await expect(page.getByRole("navigation")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`recovery-daily-${width}.png`),
        fullPage: true,
      });
    }

    const checkIn = page.getByRole("button", { name: "Daily check-in", exact: true });
    await checkIn.focus();
    await expect(checkIn).toBeFocused();
    await checkIn.press("Enter");
    await expect(page.getByRole("heading", { name: "Daily check-in", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(checkIn).toBeFocused();
    const transition = await page
      .locator(".recovery-daily-premium")
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(transition).toMatch(/0s|0\.00001s|1e-05s/);
    await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
  });
});
