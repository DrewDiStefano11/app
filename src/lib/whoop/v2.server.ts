import { z } from "zod";

const paths = {
  recovery: "/recovery",
  cycle: "/cycle",
  sleep: "/activity/sleep",
  workout: "/activity/workout",
} as const;

type Kind = keyof typeof paths;

const instant = z.iso.datetime({ offset: true });
const integerId = z.union([z.int().nonnegative(), z.string().regex(/^\d+$/)]).transform(String);
const opaqueId = z.string().min(1).max(128);
const metric = z.number().nonnegative().nullish();
const timestamps = {
  user_id: integerId,
  created_at: instant,
  updated_at: instant,
  score_state: z.string().min(1),
};
const activity = {
  ...timestamps,
  start: instant,
  end: instant.nullish(),
  timezone_offset: z.string().nullish(),
};
const strainScore = {
  strain: metric,
  average_heart_rate: metric,
  max_heart_rate: metric,
};
const schemas = {
  recovery: z.object({
    ...timestamps,
    cycle_id: integerId,
    sleep_id: opaqueId.nullish(),
    score: z
      .object({
        recovery_score: metric,
        hrv_rmssd_milli: metric,
        resting_heart_rate: metric,
        user_calibrating: z.boolean().nullish(),
      })
      .nullish(),
  }),
  cycle: z.object({
    ...activity,
    id: integerId,
    step_count: metric,
    score: z.object(strainScore).nullish(),
  }),
  sleep: z.object({
    ...activity,
    id: opaqueId,
    cycle_id: integerId.nullish(),
    nap: z.boolean().nullish(),
    score: z
      .object({
        sleep_performance_percentage: metric,
        respiratory_rate: metric,
        stage_summary: z
          .object({
            total_in_bed_time_milli: metric,
            total_awake_time_milli: metric,
            total_no_data_time_milli: metric,
            total_light_sleep_time_milli: metric,
            total_slow_wave_sleep_time_milli: metric,
            total_rem_sleep_time_milli: metric,
          })
          .nullish(),
      })
      .nullish(),
  }),
  workout: z.object({
    ...activity,
    id: opaqueId,
    sport_name: z.string().nullish(),
    score: z
      .object({
        ...strainScore,
        percent_recorded: metric,
        zone_durations: z
          .object({
            zone_zero_milli: metric,
            zone_one_milli: metric,
            zone_two_milli: metric,
            zone_three_milli: metric,
            zone_four_milli: metric,
            zone_five_milli: metric,
          })
          .nullish(),
      })
      .nullish(),
  }),
};
const collection = z.object({
  records: z.array(z.unknown()).max(25),
  next_token: z.string().max(4096).nullish(),
});

function normalizeOrThrow(kind: Kind, input: unknown) {
  const result = schemas[kind].safeParse(input);
  if (!result.success) throw new WhoopReadError("invalid_data");
  const { score, ...record } = result.data;
  const calibrating = !!score && "user_calibrating" in score && score.user_calibrating === true;
  return {
    ...record,
    id: "id" in record ? record.id : record.cycle_id,
    source: "whoop" as const,
    kind,
    calibrating,
    score: record.score_state === "SCORED" && !calibrating ? (score ?? null) : null,
  };
}

export type WhoopV2Record = ReturnType<typeof normalizeOrThrow>;

export class WhoopReadError extends Error {
  constructor(
    public readonly code:
      "unauthorized" | "rate_limited" | "unavailable" | "invalid_data" | "pagination",
    public readonly retryAfterSeconds?: number,
  ) {
    super("WHOOP data could not be retrieved");
    this.name = "WhoopReadError";
  }
}

type Options = {
  fetch?: (url: URL, init: RequestInit) => Promise<Response>;
  wait?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
};

export function whoopRetryAfter(headers: Headers) {
  for (const name of ["Retry-After", "X-RateLimit-Reset"]) {
    const value = headers.get(name);
    if (value && /^\d{1,6}$/.test(value)) return Number(value);
  }
  return undefined;
}

async function fetchPage(url: URL, accessToken: string, options: Options) {
  const send = options.fetch ?? fetch;
  const wait = options.wait ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const budget = options.signal;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (budget?.aborted) throw new WhoopReadError("unavailable");
    const timeout = AbortSignal.timeout(4000);
    const signal = budget ? AbortSignal.any([budget, timeout]) : timeout;
    const response = await send(url, {
      headers: { Authorization: "Bearer " + accessToken },
      redirect: "error",
      signal,
    }).catch(() => null);

    if (response?.ok) {
      const parsed = collection.safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw new WhoopReadError("invalid_data");
      return parsed.data;
    }
    if (response?.status === 401) throw new WhoopReadError("unauthorized");
    if (response?.status === 429) {
      throw new WhoopReadError("rate_limited", whoopRetryAfter(response.headers));
    }
    if (response && response.status < 500) throw new WhoopReadError("unavailable");
    if (attempt === 0 && !budget?.aborted) await wait(250);
  }
  throw new WhoopReadError("unavailable");
}

export async function readWhoopCollection(
  kind: Kind,
  accessToken: string,
  window: { start: string; end: string },
  options: Options = {},
) {
  const endpoint = new URL("https://api.prod.whoop.com/developer/v2" + paths[kind]);
  endpoint.search = new URLSearchParams({ ...window, limit: "25" }).toString();
  const records = new Map<string, WhoopV2Record>();
  const tokens = new Set<string>();

  for (let page = 0; page < 8; page++) {
    const result = await fetchPage(new URL(endpoint), accessToken, options);
    for (const raw of result.records) {
      const record = normalizeOrThrow(kind, raw);
      const previous = records.get(record.id);
      if (!previous || Date.parse(previous.updated_at) <= Date.parse(record.updated_at)) {
        records.set(record.id, record);
      }
    }
    if (!result.next_token) return [...records.values()];
    if (tokens.has(result.next_token)) break;
    tokens.add(result.next_token);
    endpoint.searchParams.set("nextToken", result.next_token);
  }
  throw new WhoopReadError("pagination");
}
