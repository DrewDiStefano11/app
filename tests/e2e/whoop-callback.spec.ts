import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("the Safari handoff works without local onboarding and checks status on resume", async ({
  page,
}) => {
  let status: "locked" | "disconnected" | "connected" = "locked";
  await page.route("**/api/whoop/status", (route) =>
    status === "locked"
      ? route.fulfill({ status: 401 })
      : route.fulfill({ json: { status, lastSyncedAt: null } }),
  );
  await page.goto("/integrations/whoop?whoop=connected");
  await expect(page.getByLabel("FitCore integration access key")).toBeVisible();
  await expect(page.getByText("Connected to WHOOP")).toHaveCount(0);
  await page.goto("/integrations/whoop?whoop=restart");
  await expect(page.getByText(/FitCore could not verify this authorization/)).toBeVisible();
  status = "disconnected";
  await page.goto("/integrations/whoop?whoop=cancelled");
  await expect(page.getByRole("heading", { name: "WHOOP connection" })).toBeVisible();
  await expect(page.getByText("WHOOP authorization was cancelled.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect WHOOP" })).toBeVisible();
  status = "connected";
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page.getByText("Connected to WHOOP")).toBeVisible();
  await expect(page.getByText("WHOOP authorization was cancelled.")).toHaveCount(0);
  await page.getByRole("link", { name: "Privacy and WHOOP support" }).click();
  await expect(page).toHaveURL(/\/privacy#support$/);
  await expect(page.getByRole("link", { name: "ddistefano1210@gmail.com" })).toBeVisible();
});
test("the registered WHOOP callback fails closed without configuration", async ({ request }) => {
  const response = await request.get("/api/whoop/callback?code=synthetic&state=AbcDeF01", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.text()).toBe("");
});

test("disabled WHOOP responds quietly to app startup checks", async ({ request }) => {
  const status = await request.get("/api/whoop/status");
  expect(status.status()).toBe(200);
  expect(await status.json()).toEqual({
    status: "unavailable",
    lastSyncedAt: null,
    jarvisSharingAvailable: false,
  });
  const records = await request.get("/api/whoop/records");
  expect(records.status()).toBe(200);
  expect(records.headers()["cache-control"]).toBe("no-store");
  expect(await records.json()).toBeNull();
  const automatic = await request.post("/api/whoop/sync", {
    headers: { "X-FitCore-Whoop-Sync": "automatic" },
  });
  expect(automatic.status()).toBe(204);
  expect((await request.post("/api/whoop/sync")).status()).toBe(503);
});
