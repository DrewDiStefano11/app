import assert from "node:assert/strict";
import { test } from "bun:test";
import { normalizeWhoopRecord } from "../../src/lib/whoop/v2.server";
import type { WhoopSnapshot } from "../../src/lib/whoop/dashboard";
import {
  allHistoryDays,
  whoopDailyHistory,
  whoopHistoryChartPoints,
} from "../../src/lib/whoop/history";
import { recordedCorrelation } from "../../src/lib/analytics/recorded-correlation";
import { addCalendarDays, dayKey } from "../../src/lib/analytics/date-time";
import { defaultState } from "../../src/lib/types";

const now = new Date(2026, 10, 24, 12).getTime();
const at = (ago: number) => addCalendarDays(now, -ago) + 8 * 3600000;
function snapshot(days = [0, 1, 2, 3, 4, 5]): WhoopSnapshot {
  return {
    lastSyncedAt: new Date(now).toISOString(),
    accessExpiresAt: new Date(now + 3600000).toISOString(),
    records: days.flatMap((ago) => {
      const end = new Date(at(ago)).toISOString();
      const base = { user_id: 123, created_at: end, updated_at: end, score_state: "SCORED" };
      return [
        normalizeWhoopRecord("sleep", {
          ...base,
          id: `sleep-${ago}`,
          cycle_id: ago + 1,
          nap: false,
          start: new Date(at(ago) - 8 * 3600000).toISOString(),
          end,
          timezone_offset: "-05:00",
          score: {
            sleep_performance_percentage: 90 - (ago % 6),
            stage_summary: {
              total_light_sleep_time_milli: 4 * 3600000,
              total_slow_wave_sleep_time_milli: 3600000,
              total_rem_sleep_time_milli: 2 * 3600000,
              total_no_data_time_milli: 0,
            },
          },
        }),
        normalizeWhoopRecord("recovery", {
          ...base,
          cycle_id: ago + 1,
          sleep_id: `sleep-${ago}`,
          created_at: new Date(at(ago) - 86400000).toISOString(),
          score: {
            recovery_score: 80 - (ago % 6),
            hrv_rmssd_milli: 55 - (ago % 6),
            resting_heart_rate: 60 + ago,
          },
        }),
        normalizeWhoopRecord("cycle", {
          ...base,
          id: ago + 1,
          start: end,
          end,
          score: { strain: ago },
        }),
      ];
    }),
  };
}

test("historical charts use real linked local-wake dates, original units and recorded zero", () => {
  const data = snapshot();
  const before = JSON.stringify(data);
  assert.equal(whoopDailyHistory(data, "hrv", 7, now).length, 6);
  assert.deepEqual(
    whoopDailyHistory(data, "recovery", 7, now).map((point) => point.date),
    [5, 4, 3, 2, 1, 0].map((ago) => dayKey(at(ago))),
  );
  assert.equal(whoopDailyHistory(data, "hrv", 7, now).at(-1)!.value, 55);
  assert.equal(whoopDailyHistory(data, "rhr", 7, now).at(-1)!.value, 60);
  assert.equal(whoopDailyHistory(data, "sleepHours", 7, now).at(-1)!.value, 7);
  assert.equal(whoopDailyHistory(data, "sleepPerformance", 7, now).at(-1)!.value, 90);
  assert.equal(whoopDailyHistory(data, "strain", 7, now).at(-1)!.value, 0);
  assert.equal(JSON.stringify(data), before);
});

test("missing dates break the chart, corrected IDs deduplicate and pending data never becomes zero", () => {
  const data = snapshot([0, 2]);
  const corrected = structuredClone(data.records.find((record) => record.kind === "recovery")!);
  corrected.updated_at = new Date(now).toISOString();
  corrected.score = { recovery_score: 99 };
  data.records.push(corrected);
  const points = whoopDailyHistory(data, "recovery", 7, now);
  assert.equal(points.length, 2);
  assert.equal(points.at(-1)!.value, 99);
  assert.deepEqual(
    whoopHistoryChartPoints(points).map((row) => row.value),
    [78, null, 99],
  );
  corrected.score_state = "PENDING_SCORE";
  assert.equal(whoopDailyHistory(data, "recovery", 7, now).length, 1);
  assert.equal(
    whoopDailyHistory({ ...data, accessExpiresAt: new Date(now).toISOString() }, "hrv", 7, now)
      .length,
    0,
  );
});

test("full-history ranges include old measurements, exclude future records and count calendar days across DST", () => {
  const data = snapshot([0, 400]);
  assert.equal(whoopDailyHistory(data, "hrv", 365, now).length, 1);
  const days = allHistoryDays([at(400), NaN, now + 999999999], now);
  assert.equal(days, 401);
  assert.equal(whoopDailyHistory(data, "hrv", days, now).length, 2);
  const beforeDST = new Date(2026, 2, 7, 12).getTime();
  const afterDST = new Date(2026, 2, 9, 12).getTime();
  assert.equal(allHistoryDays([beforeDST], afterDST), 3);
});

test("naps and incomplete stages do not become main-sleep duration observations", () => {
  const data = snapshot([0]);
  const sleep = data.records.find((record) => record.kind === "sleep")!;
  if ("nap" in sleep) sleep.nap = true;
  assert.equal(whoopDailyHistory(data, "sleepHours", 7, now).length, 0);
  if ("nap" in sleep) sleep.nap = false;
  sleep.score = { sleep_performance_percentage: 80 };
  assert.equal(whoopDailyHistory(data, "sleepHours", 7, now).length, 0);
  assert.equal(whoopDailyHistory(data, "sleepPerformance", 7, now)[0].value, 80);
});

test("WHOOP comparisons reuse actual Pearson pairs and next-day recovery uses calendar alignment", () => {
  const data = snapshot();
  const state = structuredClone(defaultState);
  state.mealEntries = [1, 2, 3, 4, 5].map((ago) => ({
    id: `meal-${ago}`,
    name: "Recorded meal",
    type: "lunch",
    createdAt: at(ago),
    calories: 1000 + ago * 100,
    protein: 50,
    carbs: 100,
    fat: 20,
  }));
  const comparison = recordedCorrelation(state, "calories", "nextRecovery", 7, data, now);
  assert.equal(comparison.result.sampleSize, 5);
  assert.equal(comparison.result.coefficient, -1);
  for (const pair of comparison.pairs) {
    const ago = [1, 2, 3, 4, 5].find((ago) => dayKey(at(ago)) === pair.date)!;
    assert.equal(pair.y, 80 - (ago - 1));
  }
  assert.equal(recordedCorrelation(state, "rhr", "recovery", 7, data, now).result.coefficient, -1);
  assert.equal(
    recordedCorrelation({ ...state, demoMode: true }, "hrv", "recovery", 7, data, now).result
      .sampleSize,
    0,
  );
});
