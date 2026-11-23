import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  seedRevisionedFitCoreState,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block" });

test("Gemini cannot receive personal fitness requests under the unpaid-provider policy", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { allowCloudText: true, aiProvider: "gemini" },
    }),
  );
  await gotoDashboard(page);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Explain this synthetic fitness question please.");
  await input.press("Control+Enter");
  await expect(page.getByText(/Gemini is unavailable for personal fitness data/)).toBeVisible();
  await expect(input).toHaveValue("Explain this synthetic fitness question please.");
  expect((await readPersistedFitCoreState(page)).mealEntries).toEqual([]);
});
