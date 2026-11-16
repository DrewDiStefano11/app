import type { Workout } from "@/lib/types";
import type { WhoopV2Record } from "./v2.server";

export type WhoopSnapshot = {
  lastSyncedAt: string;
  accessExpiresAt: string;
  records: WhoopV2Record[];
};

function field(record: object | null | undefined, key: string): unknown {
  return record && (record as Record<string, unknown>)[key];
}

function measurement(record: object | null | undefined, key: string) {
  const value = field(record, key);
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function timestamp(record: WhoopV2Record) {
  return record.kind === "sleep" && "end" in record && record.end
    ? record.end
    : "start" in record
      ? record.start
      : record.created_at;
}

function measurementState(record: WhoopV2Record) {
  if (record.calibrating) return "calibrating";
  if (record.score_state === "PENDING_SCORE") return "pending";
  return record.score ? "scored" : "unavailable";
}

function recoveryMetrics(record: WhoopV2Record, linkedSleep?: WhoopV2Record) {
  return {
    id: record.id,
    at:
      linkedSleep && "end" in linkedSleep
        ? (linkedSleep.end ?? record.created_at)
        : record.created_at,
    state: measurementState(record),
    score: measurement(record.score, "recovery_score"),
    hrvMs: measurement(record.score, "hrv_rmssd_milli"),
    restingHeartRate: measurement(record.score, "resting_heart_rate"),
  };
}

export function getWhoopDashboard(records: WhoopV2Record[]) {
  const byLatest = (kind: WhoopV2Record["kind"]) =>
    records
      .filter((row) => row.kind === kind)
      .sort((a, b) => Date.parse(timestamp(b)) - Date.parse(timestamp(a)));
  const primarySleeps = byLatest("sleep").filter((item) => "nap" in item && item.nap === false);
  const sleepById = new Map(primarySleeps.map((item) => [item.id, item]));
  const sleepByCycle = new Map<string, WhoopV2Record | null>();
  for (const item of primarySleeps) {
    const cycleId = field(item, "cycle_id");
    if (typeof cycleId === "string")
      sleepByCycle.set(cycleId, sleepByCycle.has(cycleId) ? null : item);
  }
  const history = records
    .filter((row) => row.kind === "recovery")
    .map((row) => {
      const sleepId = field(row, "sleep_id");
      const byId = typeof sleepId === "string" ? sleepById.get(sleepId) : undefined;
      const linkedSleep = byId ?? sleepByCycle.get(row.id) ?? undefined;
      return { metrics: recoveryMetrics(row, linkedSleep), linkedSleep };
    })
    .sort((a, b) => Date.parse(b.metrics.at) - Date.parse(a.metrics.at));
  const recovery = history[0];
  const linkedSleep = recovery?.linkedSleep;
  const latestSleep = primarySleeps[0];
  // Sleep can arrive before recovery. Give a truly newer sleep its own dated section.
  const sleep =
    linkedSleep &&
    latestSleep &&
    Date.parse(timestamp(linkedSleep)) >= Date.parse(timestamp(latestSleep))
      ? linkedSleep
      : latestSleep;
  const cycle = byLatest("cycle")[0];
  const stages = sleep && field(sleep.score, "stage_summary");
  const stageSummary = typeof stages === "object" ? stages : null;
  const lightMs = measurement(stageSummary, "total_light_sleep_time_milli");
  const deepMs = measurement(stageSummary, "total_slow_wave_sleep_time_milli");
  const remMs = measurement(stageSummary, "total_rem_sleep_time_milli");
  const noDataMs = measurement(stageSummary, "total_no_data_time_milli");
  const asleepMs =
    lightMs !== null && deepMs !== null && remMs !== null && !(noDataMs && noDataMs > 0)
      ? lightMs + deepMs + remMs
      : null;
  return {
    recovery: recovery?.metrics ?? null,
    history: history.slice(0, 7).map(({ metrics }) => metrics),
    sleep: sleep
      ? {
          id: sleep.id,
          at: timestamp(sleep),
          state: measurementState(sleep),
          performance: measurement(sleep.score, "sleep_performance_percentage"),
          asleepMs,
          lightMs,
          deepMs,
          remMs,
          awakeMs: measurement(stageSummary, "total_awake_time_milli"),
        }
      : null,
    cycle: cycle
      ? {
          id: cycle.id,
          at: timestamp(cycle),
          state: measurementState(cycle),
          strain: measurement(cycle.score, "strain"),
          steps: measurement(cycle, "step_count"),
        }
      : null,
    activities: byLatest("workout"),
  };
}

export function getWhoopActivity(record: WhoopV2Record) {
  const sport = field(record, "sport_name");
  const zones = field(record.score, "zone_durations");
  const zoneDurations = typeof zones === "object" ? zones : null;
  return {
    at: timestamp(record),
    sport: typeof sport === "string" && sport.trim() ? sport : "Activity",
    state: measurementState(record),
    strain: measurement(record.score, "strain"),
    averageHeartRate: measurement(record.score, "average_heart_rate"),
    maxHeartRate: measurement(record.score, "max_heart_rate"),
    zoneMs: ["zero", "one", "two", "three", "four", "five"].map((zone) =>
      measurement(zoneDurations, `zone_${zone}_milli`),
    ),
  };
}

function overlapsStrengthSession(record: WhoopV2Record, workout: Workout) {
  if (record.kind !== "workout" || !("start" in record) || !record.end || !workout.endedAt)
    return false;
  const sport = "sport_name" in record ? record.sport_name?.trim().toLowerCase() : null;
  if (sport !== "weightlifting" && sport !== "powerlifting" && sport !== "strength trainer")
    return false;
  if (
    !workout.exercises.some((exercise) =>
      exercise.sets.some((set) => set.completed && (set.reps ?? 0) > 0),
    )
  )
    return false;
  const start = Date.parse(record.start);
  const end = Date.parse(record.end);
  const duration = end - start;
  const workoutDuration = workout.endedAt - workout.startedAt;
  if (!(duration > 0 && workoutDuration > 0)) return false;
  const overlap = Math.min(end, workout.endedAt) - Math.max(start, workout.startedAt);
  return overlap >= Math.max(duration, workoutDuration) * 0.75;
}

export function matchWhoopStrengthWorkout(
  record: WhoopV2Record,
  activities: WhoopV2Record[],
  workouts: Workout[],
) {
  const candidates = workouts.filter((workout) => overlapsStrengthSession(record, workout));
  if (candidates.length !== 1) return null;
  const matchingActivities = activities.filter((activity) =>
    overlapsStrengthSession(activity, candidates[0]),
  );
  return matchingActivities.length === 1 && matchingActivities[0].id === record.id
    ? candidates[0]
    : null;
}
