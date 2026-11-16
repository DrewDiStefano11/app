import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/whoop/status", (route) =>
    route.fulfill({ json: { status: "connected", jarvisSharingAvailable: true } }),
  );
});

test("Jarvis asks permission for each WHOOP message and fails closed without the integration", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { enabled: true },
    }),
  );
  await page.route("**/_serverFn/**", async (route) => {
    const body = route.request().postData() ?? "";
    if (body.includes("includeWhoop")) await route.continue();
    else await route.abort();
  });
  await gotoDashboard(page);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  const share = page.getByRole("checkbox", { name: /Include recent WHOOP measurements/ });
  const input = page.getByPlaceholder("Talk to Jarvis...");
  await expect(share).not.toBeChecked();

  const send = async (message: string) => {
    await input.fill(message);
    const request = page.waitForRequest("**/_serverFn/**");
    await page.getByRole("button", { name: "Send message" }).click();
    return (await request).postData() ?? "";
  };
  expect(await send("Review my recent workouts")).not.toContain("includeWhoop");
  await expect(share).toBeEnabled();

  await share.check();
  expect(await send("How did I recover?")).toContain("includeWhoop");
  await expect(page.getByText(/Recent WHOOP measurements are unavailable/)).toBeVisible();
  await expect(share).not.toBeChecked();

  expect(await send("Describe my workouts again")).not.toContain("includeWhoop");
});

test("WHOOP replies clear on lock and a delayed reply stays hidden after closing Jarvis", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { enabled: true },
    }),
  );
  let release!: () => void;
  const pending = new Promise<void>((done) => {
    release = done;
  });
  let count = 0;
  await page.route("**/_serverFn/**", async (route) => {
    count++;
    if (count === 2) await pending;
    await route.fulfill({
      json: {
        result: {
          ok: true,
          content: "Synthetic WHOOP recovery: 73%",
          whoopExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    });
  });

  await gotoDashboard(page);
  const showJarvis = () =>
    page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  const share = page.getByRole("checkbox", { name: /Include recent WHOOP measurements/ });
  const reply = page.getByText("Synthetic WHOOP recovery: 73%");
  const sendWithWhoop = async () => {
    await share.check();
    await page.getByPlaceholder("Talk to Jarvis...").fill("How did I recover?");
    const request = page.waitForRequest("**/_serverFn/**");
    await page.getByRole("button", { name: "Send message" }).click();
    await request;
  };

  await showJarvis();
  await sendWithWhoop();
  await expect(reply).toBeVisible();
  await page.evaluate(() => {
    const channel = new BroadcastChannel("fitcore:whoop-snapshot-changed");
    channel.postMessage("clear");
    channel.close();
  });
  await expect(reply).toHaveCount(0);

  const closeJarvis = () =>
    page.locator(".sheet-header").filter({ hasText: "Jarvis" }).getByRole("button").click();
  await closeJarvis();
  await showJarvis();
  await sendWithWhoop();
  await closeJarvis();
  await expect(share).toHaveCount(0);
  await showJarvis();
  release();
  await expect(share).toBeEnabled();
  await expect(reply).toHaveCount(0);
});
