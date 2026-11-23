import { expect, test } from "bun:test";
import { addCalendarDays } from "../../src/lib/analytics/date-time";
import { recordedSleepEntries } from "../../src/lib/analytics/observed-fitness";
import { calculatePersonalScores } from "../../src/lib/analytics/personal-scores";
import { buildDailyDecision } from "../../src/lib/daily-decision";
import { defaultState, type SleepEntry } from "../../src/lib/types";

const now = new Date(2026, 10, 16, 18).getTime();
const yesterday = addCalendarDays(now, -1);
const entry = (id: string, createdAt: number, hours: number, quality = 7): SleepEntry => ({
  id,
  createdAt,
  hours,
  quality,
});

test("sleep evidence keeps the latest supported entry per local day", () => {
  const earlier = entry("old", yesterday + 6 * 3_600_000, 5);
  const latest = entry("new", yesterday + 9 * 3_600_000, 7);
  const future = entry("future", now + 1, 12);
  const wearable: SleepEntry = {
    ...entry("wearable", yesterday + 10 * 3_600_000, 10),
    provenance: { source: "wearable", confirmation: "not-required", confidence: "high" },
  };
  const unconfirmed: SleepEntry = {
    ...entry("estimate", now - 60_000, 10),
    provenance: { source: "ai-estimated", confidence: "low", confirmation: "unconfirmed" },
  };
  const empty = entry("invalid", now - 60_000, -1);
  expect(
    recordedSleepEntries(
      { sleepEntries: [future, wearable, latest, earlier, unconfirmed, empty] },
      now,
    ),
  ).toEqual([latest]);
  const unavailable = { ...defaultState, sleepEntries: [empty, unconfirmed, future] };
  expect(calculatePersonalScores(unavailable, now).readiness.value).toBeNull();
  expect(buildDailyDecision(unavailable, now).dataMissing).toContainEqual(
    expect.objectContaining({ suggestedUserAction: "Log last night's sleep." }),
  );
});

test("recorded duration can be shown while unsupported quality stays out of readiness", () => {
  const durationOnly = entry("duration", now - 60_000, 8, 0);
  const state = { ...defaultState, sleepEntries: [durationOnly] };
  expect(recordedSleepEntries(state, now)).toEqual([durationOnly]);
  expect(calculatePersonalScores(state, now).readiness.value).toBeNull();
});

test("the latest short duration affects Recovery without fabricating a quality rating", () => {
  const older = entry("earlier", yesterday + 15 * 3_600_000, 8, 8);
  const latest = entry("short", now - 60_000, 4, 0);
  const state = {
    ...defaultState,
    sleepEntries: [older, latest],
    recoveryCheckIns: [
      {
        id: "check",
        createdAt: now - 10_000,
        energy: 8,
        stress: 4,
        motivation: 8,
        soreness: 2,
      },
    ],
    workouts: [
      {
        id: "routine",
        name: "Routine",
        startedAt: yesterday + 7 * 3_600_000,
        endedAt: yesterday + 8 * 3_600_000,
        exercises: [],
      },
    ],
  };
  const decision = buildDailyDecision(state, now);
  expect(decision.decisionType).toBe("train_light");
  expect(decision.training.reason).toContain("4 hours of sleep");
  expect(decision.recovery.sleepSignal).toBe("poor");
  expect(decision.dataMissing).toContainEqual(
    expect.objectContaining({ suggestedUserAction: "Record sleep quality." }),
  );
  expect(decision.limitingFactors).toContainEqual(
    expect.objectContaining({ type: "sleep", explanation: "4 hours of sleep may limit recovery." }),
  );
});


test("an explicitly recorded zero-hour night remains consistent with native sleep evidence", () => {
  const zero = entry("awake", now - 60_000, 0);
  expect(recordedSleepEntries({ sleepEntries: [zero] }, now)).toEqual([zero]);
});
