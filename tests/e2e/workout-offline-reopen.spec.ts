import { createServer, request as forwardRequest } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { devices, expect, test } from "@playwright/test";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

test("an initialized app can log a set offline and reopen the same session", async ({
  baseURL,
  browser,
  browserName,
}) => {
  const upstream = new URL(baseURL!);
  expect(["localhost", "127.0.0.1"]).toContain(upstream.hostname);
  let reachable = true;
  // A failed socket exercises service-worker navigation in both engines.
  // WebKit's setOffline emulation fails even with a literal worker response.
  const gateway = createServer((incoming, outgoing) => {
    if (!reachable) {
      incoming.socket.destroy();
      return;
    }
    const requested = new URL(incoming.url ?? "/", upstream);
    const target = new URL(upstream);
    target.pathname = requested.pathname;
    target.search = requested.search;
    const proxied = forwardRequest(
      target,
      { method: incoming.method, headers: incoming.headers },
      (response) => {
        outgoing.writeHead(response.statusCode!, response.headers);
        response.pipe(outgoing);
      },
    );
    proxied.on("error", () => outgoing.destroy());
    incoming.pipe(proxied);
  });
  gateway.listen(0, "127.0.0.1");
  await once(gateway, "listening");
  const origin = `http://127.0.0.1:${(gateway.address() as AddressInfo).port}`;
  const context = await browser.newContext({
    ...(browserName === "webkit"
      ? devices["iPhone 13"]
      : {
          ...devices["Desktop Chrome"],
          viewport: { width: 390, height: 844 },
          isMobile: true,
        }),
    baseURL: origin,
  });
  try {
    const page = await context.newPage();
    await seedMinimalOnboardedState(page);
    await expectDashboardReady(page);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), undefined, {
      timeout: 12_000,
    });

    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    const expand = nav.getByRole("button", { name: "Expand navigation" });
    if (await expand.isVisible()) await expand.click();
    await nav.getByRole("button", { name: "Train", exact: true }).click();
    await page.getByRole("button", { name: "Blank workout", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const picker = page.locator(".sheet-surface");
    await picker.getByPlaceholder("Search exercise or muscle…").fill("Back Squat");
    await picker.getByRole("button", { name: /^Back Squat/i }).click();

    reachable = false;
    await expect(fetch(origin)).rejects.toThrow();
    await page.getByPlaceholder("lb", { exact: true }).first().fill("135");
    await page.getByPlaceholder("reps", { exact: true }).first().fill("8");
    const written = (await readPersistedFitCoreState(page)).activeWorkout;
    expect(written?.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8, completed: true });
    await page.close();

    const reopened = await context.newPage();
    await reopened.goto("/");
    await expect(reopened.getByRole("button", { name: "Finish workout", exact: true })).toBeVisible();
    await expect(reopened.getByPlaceholder("lb", { exact: true }).first()).toHaveValue("135");
    await reopened.getByRole("button", { name: "Finish workout", exact: true }).click();
    await reopened.getByRole("button", { name: "Confirm & save", exact: true }).click();
    await expect(reopened.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
    reachable = true;
    await reopened.reload();
    await expectDashboardReady(reopened);
    const settled = await readPersistedFitCoreState(reopened);
    expect(settled.activeWorkout).toBeNull();
    expect(settled.workouts).toHaveLength(1);
    expect(settled.workouts[0].id).toBe(written?.id);
    expect(settled.workouts[0].exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });
  } finally {
    await context.close();
    await new Promise<void>((resolve, reject) =>
      gateway.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
