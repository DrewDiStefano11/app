import { expect, test } from "bun:test";
import { getWhoopDashboard, matchWhoopStrengthWorkout } from "../../src/lib/whoop/dashboard";
import { readWhoopCollection } from "../../src/lib/whoop/v2.server";

const window = { start: "2026-11-10T00:00:00Z", end: "2026-11-18T00:00:00Z" };
const base = {
  user_id: 123,
  created_at: "2026-11-16T08:00:00Z",
  updated_at: "2026-11-16T09:00:00Z",
  score_state: "SCORED",
};
const activity = { ...base, start: "2026-11-16T06:00:00Z", end: "2026-11-16T07:00:00Z" };

async function collection(kind: "recovery" | "sleep" | "cycle" | "workout", records: unknown[]) {
  return readWhoopCollection(kind, "synthetic", window, {
    fetch: async () => Response.json({ records }),
  });
}

test("joins the latest recovery to its own sleep and keeps zero distinct from missing", async () => {
  const recovery = await collection("recovery", [
    { ...base, cycle_id: 1, sleep_id: "main", score: { recovery_score: 0, hrv_rmssd_milli: 54 } },
    { ...base, created_at: "2026-11-15T08:00:00Z", cycle_id: 2, score: { recovery_score: 83 } },
  ]);
  const sleep = await collection("sleep", [
    {
      ...activity,
      id: "nap",
      cycle_id: 1,
      nap: true,
      score: { sleep_performance_percentage: 100 },
    },
    {
      ...activity,
      id: "main",
      cycle_id: 1,
      nap: false,
      score: {
        sleep_performance_percentage: 79,
        stage_summary: {
          total_light_sleep_time_milli: 3600000,
          total_slow_wave_sleep_time_milli: 0,
          total_rem_sleep_time_milli: 1800000,
        },
      },
    },
  ]);
  const cycle = await collection("cycle", [{ ...activity, id: 3, score: { strain: 11.3 } }]);
  const summary = getWhoopDashboard([...recovery, ...sleep, ...cycle]);
  expect(summary.recovery).toMatchObject({ score: 0, hrvMs: 54, restingHeartRate: null });
  expect(summary.sleep).toMatchObject({
    id: "main",
    performance: 79,
    asleepMs: 5400000,
    deepMs: 0,
  });
  expect(summary.cycle).toMatchObject({ id: "3", strain: 11.3 });
  expect(summary.history.map((row) => row.score)).toEqual([0, 83]);
});

test("reports a newer pending or calibrating recovery and incomplete sleep without filling gaps", async () => {
  const recovery = await collection("recovery", [
    {
      ...base,
      cycle_id: 2,
      sleep_id: "main",
      score: { user_calibrating: true, recovery_score: 91 },
    },
    { ...base, created_at: "2026-11-15T00:00:00Z", cycle_id: 1, score: { recovery_score: 94 } },
  ]);
  const sleep = await collection("sleep", [
    {
      ...activity,
      id: "main",
      nap: false,
      score: {
        stage_summary: { total_light_sleep_time_milli: 3600000, total_no_data_time_milli: 600000 },
      },
    },
  ]);
  const summary = getWhoopDashboard([...recovery, ...sleep]);
  expect(summary.recovery).toMatchObject({ state: "calibrating", score: null, hrvMs: null });
  expect(summary.sleep).toMatchObject({ asleepMs: null, lightMs: 3600000, remMs: null });
  expect(summary.cycle).toBeNull();
});

test("links strength activities only when the match is mutual and unambiguous", async () => {
  const workouts = await collection("workout", [
    { ...activity, id: "strength", sport_name: "Strength Trainer", score: { strain: 9 } },
    { ...activity, id: "bike", sport_name: "Cycling", score: { strain: 8 } },
  ]);
  const manual = {
    id: "manual",
    name: "Bench",
    startedAt: Date.parse(activity.start),
    endedAt: Date.parse(activity.end),
    exercises: [
      { id: "one", exerciseId: "bench", sets: [{ id: "set", completed: true, reps: 5 }] },
    ],
  };
  expect(matchWhoopStrengthWorkout(workouts[0], workouts, [manual])?.id).toBe("manual");
  expect(matchWhoopStrengthWorkout(workouts[1], workouts, [manual])).toBeNull();
  expect(
    matchWhoopStrengthWorkout(workouts[0], workouts, [manual, { ...manual, id: "other" }]),
  ).toBeNull();
  expect(
    matchWhoopStrengthWorkout(
      workouts[0],
      [...workouts, { ...workouts[0], id: "ambiguous" }],
      [manual],
    ),
  ).toBeNull();
});

test("a backfilled older recovery stays ordered by its wake time", async () => {
  const recovery = await collection("recovery", [
    { ...base, cycle_id: 2, sleep_id: "new", score: { recovery_score: 74 } },
    { ...base, cycle_id: 1, created_at: "2026-11-17T08:00:00Z", score: { recovery_score: 85 } },
  ]);
  const sleep = await collection("sleep", [
    { ...activity, id: "new", nap: false, cycle_id: 2 },
    {
      ...activity,
      id: "old",
      nap: false,
      cycle_id: 1,
      start: "2026-11-15T06:00:00Z",
      end: "2026-11-15T07:00:00Z",
    },
  ]);
  const summary = getWhoopDashboard([...recovery, ...sleep]);
  expect(summary.recovery).toMatchObject({ score: 74, at: activity.end });
  expect(summary.history[1]).toMatchObject({ score: 85, at: "2026-11-15T07:00:00Z" });
});
