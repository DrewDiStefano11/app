import { expect, test } from "@playwright/test";
import { gotoDashboard, seedMinimalOnboardedState } from "./helpers/fitcore-test-state";

test("Home and Recovery show measured WHOOP data only while the owner has access", async ({
  page,
}) => {
  const date = "2026-11-16T06:00:00Z";
  const record = {
    source: "whoop",
    user_id: "1",
    created_at: date,
    updated_at: date,
    score_state: "SCORED",
    calibrating: false,
  };
  let connected = true;
  await page.route("**/api/whoop/sync", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/whoop/records", (route) =>
    connected
      ? route.fulfill({
          json: {
            lastSyncedAt: date,
            accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
            records: [
              {
                ...record,
                kind: "recovery",
                id: "1",
                cycle_id: "1",
                sleep_id: "sleep-1",
                score: { recovery_score: 0, hrv_rmssd_milli: 54 },
              },
              {
                ...record,
                kind: "recovery",
                id: "0",
                cycle_id: "0",
                created_at: "2026-11-15T06:00:00Z",
                score: { recovery_score: 83 },
              },
              {
                ...record,
                kind: "sleep",
                id: "sleep-1",
                cycle_id: "1",
                nap: false,
                start: date,
                end: date,
                score: {
                  sleep_performance_percentage: 79,
                  stage_summary: {
                    total_light_sleep_time_milli: 3600000,
                    total_slow_wave_sleep_time_milli: 0,
                    total_rem_sleep_time_milli: 1800000,
                  },
                },
              },
              { ...record, kind: "cycle", id: "1", start: date, score: { strain: 11.3 } },
              {
                ...record,
                kind: "workout",
                id: "workout-1",
                start: date,
                sport_name: "Synthetic WHOOP Cycling",
                score: { average_heart_rate: 136 },
              },
            ],
          },
        })
      : route.fulfill({ status: 401 }),
  );

  await seedMinimalOnboardedState(page);
  await gotoDashboard(page);
  const panel = page.getByRole("region", { name: "WHOOP measurements" });
  await expect(panel.getByText("0%", { exact: true })).toBeVisible();
  await expect(panel.getByText("54 ms")).toBeVisible();
  await expect(panel.getByText("Unavailable")).toBeVisible();
  await expect(panel.getByText("1h 30m")).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Workout/i })).toBeVisible();

  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();
  await expect(panel.getByText("Deep sleep")).toBeVisible();
  await panel.getByText("Recent WHOOP recovery").click();
  await expect(panel.getByText("83%")).toBeVisible();
  await panel.getByText(/Synthetic WHOOP Cycling/).click();
  await expect(panel.getByText("136 bpm")).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Synthetic WHOOP Cycling",
  );

  connected = false;
  await page.evaluate(() => {
    const otherTab = new BroadcastChannel("fitcore:whoop-snapshot-changed");
    otherTab.postMessage("clear");
    otherTab.close();
  });
  await expect(panel).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: /Start Workout/i })).toBeVisible();
  await expect(panel).toHaveCount(0);
});
