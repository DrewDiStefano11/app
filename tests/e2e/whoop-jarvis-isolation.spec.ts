import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  // Isolate the foreground coordinator as well as the Jarvis status query.
  for (const endpoint of ["records", "sync"]) {
    await page.route(`**/api/whoop/${endpoint}`, (route) =>
      route.fulfill({
        json: {
          records: [],
          lastSyncedAt: new Date().toISOString(),
          accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      }),
    );
  }
});

test("WHOOP consent sends only the current question and exposes read-only tools", async ({
  page,
}) => {
  await page.route("**/api/whoop/status", (route) =>
    route.fulfill({ json: { status: "connected", jarvisSharingAvailable: true } }),
  );
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { enabled: true, allowCloudText: true },
    }),
  );
  const payloads: string[] = [];
  await page.route("**/_serverFn/**", async (route) => {
    payloads.push(route.request().postData() ?? "");
    await route.fulfill({
      json: {
        result: {
          ok: true,
          content: "Synthetic reply",
          whoopExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    });
  });
  await gotoDashboard(page);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  const send = page.getByRole("button", { name: "Send message to Jarvis" });
  await input.fill("Explain the private earlier question about my routine.");
  await send.click();
  await expect(page.getByText("Synthetic reply", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /Include recent WHOOP measurements/ }).check();
  await input.fill("How did I recover?");
  await send.click();
  await expect.poll(() => payloads.length).toBe(2);
  expect(payloads[1]).toContain("includeWhoop");
  expect(payloads[1]).not.toContain("private earlier question");
  expect(payloads[1]).not.toContain('"s":"logMeal"');
});

test("WHOOP sharing cannot create a local mutation review", async ({ page }) => {
  await page.route("**/api/whoop/status", (route) =>
    route.fulfill({ json: { status: "connected", jarvisSharingAvailable: true } }),
  );
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { enabled: true, allowCloudText: true },
    }),
  );
  let requests = 0;
  await page.route("**/_serverFn/**", async (route) => {
    requests++;
    await route.fulfill({
      json: {
        result: {
          ok: true,
          content: "Read-only synthetic reply",
          whoopExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    });
  });
  await gotoDashboard(page);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  await page.getByRole("checkbox", { name: /Include recent WHOOP measurements/ }).check();
  await page.getByRole("textbox", { name: "Jarvis message" }).fill("Log creatine");
  await page.getByRole("button", { name: "Send message to Jarvis" }).click();
  await expect(page.getByText("Read-only synthetic reply", { exact: true })).toBeVisible();
  expect(requests).toBe(1);
  await expect(page.getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
});
