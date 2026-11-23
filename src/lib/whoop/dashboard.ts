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
  return record.score_state === "SCORED" && record.score ? "scored" : "unavailable";
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

export function getWhoopDashboard(
  records: readonly WhoopV2Record[],
  includes: (at: string) => boolean = () => true,
) {
  const latest = new Map<string, WhoopV2Record>();
  for (const record of records) {
    const key = record.kind + ":" + record.id;
    const previous = latest.get(key);
    if (!previous || Date.parse(previous.updated_at) < Date.parse(record.updated_at)) {
      latest.set(key, measurementState(record) === "scored" ? record : { ...record, score: null });
    }
  }
  const observations = [...latest.values()];
  const byLatest = (kind: WhoopV2Record["kind"]) =>
    observations
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
  const history = observations
    .filter((row) => row.kind === "recovery")
    .map((row) => {
      const sleepId = field(row, "sleep_id");
      const linkedSleep =
        typeof sleepId === "string"
          ? sleepById.get(sleepId)
          : (sleepByCycle.get(row.id) ?? undefined);
      return { metrics: recoveryMetrics(row, linkedSleep), linkedSleep, updatedAt: row.updated_at };
    })
    .filter(({ metrics }) => includes(metrics.at))
    .sort(
      (a, b) =>
        Date.parse(b.metrics.at) - Date.parse(a.metrics.at) ||
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        a.metrics.id.localeCompare(b.metrics.id),
    );
  const recovery = history[0];
  const linkedSleep = recovery?.linkedSleep;
  const sleepHistory = primarySleeps
    .filter((item) => includes(timestamp(item)))
    .map((sleep) => {
      const stages = field(sleep.score, "stage_summary");
      const stageSummary = typeof stages === "object" ? stages : null;
      const lightMs = measurement(stageSummary, "total_light_sleep_time_milli");
      const deepMs = measurement(stageSummary, "total_slow_wave_sleep_time_milli");
      const remMs = measurement(stageSummary, "total_rem_sleep_time_milli");
      const noDataMs = measurement(stageSummary, "total_no_data_time_milli");
      return {
        id: sleep.id,
        at: timestamp(sleep),
        start: "start" in sleep ? sleep.start : null,
        end: "end" in sleep ? (sleep.end ?? null) : null,
        timezoneOffset: "timezone_offset" in sleep ? (sleep.timezone_offset ?? null) : null,
        state: measurementState(sleep),
        performance: measurement(sleep.score, "sleep_performance_percentage"),
        respiratoryRate: measurement(sleep.score, "respiratory_rate"),
        asleepMs:
          lightMs !== null && deepMs !== null && remMs !== null && !(noDataMs && noDataMs > 0)
            ? lightMs + deepMs + remMs
            : null,
        lightMs,
        deepMs,
        remMs,
        awakeMs: measurement(stageSummary, "total_awake_time_milli"),
      };
    });
  const latestSleep = sleepHistory[0];
  // Prefer the linked sleep on a tie. A newer sleep may arrive before its recovery.
  const sleep =
    sleepHistory.find(
      ({ id, at }) => id === linkedSleep?.id && Date.parse(at) === Date.parse(latestSleep.at),
    ) ?? latestSleep;
  const cycleHistory = byLatest("cycle")
    .filter((item) => includes(timestamp(item)))
    .map((cycle) => ({
      id: cycle.id,
      at: timestamp(cycle),
      timezoneOffset: "timezone_offset" in cycle ? (cycle.timezone_offset ?? null) : null,
      state: measurementState(cycle),
      strain: measurement(cycle.score, "strain"),
      steps: measurement(cycle, "step_count"),
    }));
  return {
    recovery: recovery?.metrics ?? null,
    history: history.map(({ metrics }) => metrics),
    sleep: sleep ?? null,
    sleepHistory,
    cycle: cycleHistory[0] ?? null,
    cycleHistory,
    activities: byLatest("workout").filter((item) => includes(timestamp(item))),
  };
}

export function getWhoopActivity(record: WhoopV2Record) {
  const sport = field(record, "sport_name");
  const zones = field(record.score, "zone_durations");
  const zoneDurations = typeof zones === "object" ? zones : null;
  return {
    at: timestamp(record),
    timezoneOffset: "timezone_offset" in record ? (record.timezone_offset ?? null) : null,
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
