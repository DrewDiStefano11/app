import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
for (const entry of ["Home", "Stats Daily", "Stats Body"] as const) {
  test(`${entry} validates weight and preserves rejected weigh-ins for one successful retry`, async ({
    page,
  }) => {
    await seedRevisionedFitCoreState(
      page,
      currentFitCoreState({
        onboardingComplete: true,
        goals: [
          { id: "weight-goal", type: "bodyweight", label: "Bodyweight", current: 180, target: 175 },
        ],
        profile: { bodyweightLb: 180 },
      }),
    );
    if (entry === "Home") {
      await page.getByRole("button", { name: "Weigh In", exact: true }).click();
    } else {
      if (entry === "Stats Body")
        await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
      await page.getByRole("button", { name: "Stats", exact: true }).click();
      if (entry === "Stats Body")
        await page.getByRole("tab", { name: "Body", exact: true }).click();
    }
    const field = page.getByRole("spinbutton").first();
    const save = page.getByRole("button", {
      name: entry === "Home" ? "Save weigh-in" : "Save",
      exact: true,
    });
    for (const invalid of ["-5", "99999", "", "39.9", "700.1"]) {
      await field.fill(invalid);
      await expect(save).toBeDisabled();
      const state = await readPersistedFitCoreState(page);
      expect(state.bodyweightEntries).toHaveLength(0);
      expect(state.profile.bodyweightLb).toBe(180);
      expect(state.goals[0].current).toBe(180);
    }
    await field.fill("181.4");
    if (entry === "Home")
      await page.getByPlaceholder("Morning, post-bathroom…").fill("Synthetic morning note");
    await page.evaluate(() => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException("Synthetic quota", "QuotaExceededError");
      };
      window.addEventListener(
        "restore-weigh-in-writes",
        () => {
          Storage.prototype.setItem = write;
        },
        { once: true },
      );
    });
    await save.click();
    await expect(page.getByText(/Weigh-in could not be saved/)).toBeVisible();
    await expect(field).toHaveValue("181.4");
    if (entry === "Home")
      await expect(page.getByPlaceholder("Morning, post-bathroom…")).toHaveValue(
        "Synthetic morning note",
      );
    expect((await readPersistedFitCoreState(page)).bodyweightEntries).toHaveLength(0);
    await page.evaluate(() => window.dispatchEvent(new Event("restore-weigh-in-writes")));
    await save.click();
    await expect
      .poll(async () => (await readPersistedFitCoreState(page)).bodyweightEntries.length)
      .toBe(1);
    await page.reload();
    const state = await readPersistedFitCoreState(page);
    expect(state.bodyweightEntries).toHaveLength(1);
    expect(state.bodyweightEntries[0]).toMatchObject({
      weightLb: 181.4,
      ...(entry === "Home" && { notes: "Synthetic morning note" }),
    });
    expect(state.profile.bodyweightLb).toBe(181.4);
    expect(state.goals[0].current).toBe(181.4);
  });
}
