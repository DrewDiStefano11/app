import { describe, expect, test } from "bun:test";
import { readWhoopCollection } from "../../src/lib/whoop/v2.server";

const span = {
  start: "2026-11-15T00:00:00.000Z",
  end: "2026-11-16T00:00:00.000Z",
};
const dateFields = { created_at: span.start, updated_at: span.end, user_id: 1001 };
const recovery = {
  ...dateFields,
  cycle_id: 2001,
  sleep_id: "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
  score_state: "SCORED",
  score: {
    recovery_score: 75,
    hrv_rmssd_milli: 34.5,
    resting_heart_rate: 57,
    user_calibrating: false,
  },
};

describe("WHOOP v2 collections", () => {
  test("paginates an exact time window and retains corrections by source record ID", async () => {
    const requests: URL[] = [];
    const result = await readWhoopCollection("recovery", "synthetic-token", span, {
      fetch: async (url, init) => {
        expect(new Headers(init.headers).get("authorization")).toBe("Bearer synthetic-token");
        requests.push(url);
        return requests.length === 1
          ? Response.json({ records: [recovery], next_token: "encoded=token+value" })
          : Response.json({
              records: [
                {
                  ...recovery,
                  updated_at: "2026-11-16T01:00:00Z",
                  score: { ...recovery.score, recovery_score: 76 },
                },
              ],
              next_token: null,
            });
      },
    });
    expect(requests.map((url) => url.pathname)).toEqual([
      "/developer/v2/recovery",
      "/developer/v2/recovery",
    ]);
    expect(requests[0].searchParams.get("start")).toBe(span.start);
    expect(requests[1].searchParams.get("end")).toBe(span.end);
    expect(requests[1].searchParams.get("nextToken")).toBe("encoded=token+value");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "2001", source: "whoop", score: { recovery_score: 76 } });
  });

  test("gates pending and calibrating scores but honors recorded zero", async () => {
    const result = await readWhoopCollection("recovery", "synthetic-token", span, {
      fetch: async () =>
        Response.json({
          records: [
            { ...recovery, score_state: "PENDING_SCORE" },
            { ...recovery, cycle_id: 2002, score: { ...recovery.score, user_calibrating: true } },
            { ...recovery, cycle_id: 2003, score: { ...recovery.score, recovery_score: 0 } },
          ],
        }),
    });
    expect(result.map((record) => record.score?.recovery_score ?? null)).toEqual([null, null, 0]);
    expect(result[1].calibrating).toBe(true);
  });

  test("surfaces rate limiting and retries a transient failure within its request budget", async () => {
    let calls = 0;
    const result = readWhoopCollection("cycle", "synthetic-token", span, {
      wait: async () => {},
      fetch: async () => {
        calls++;
        return calls === 1
          ? new Response(null, { status: 503 })
          : new Response(null, { status: 429, headers: { "X-RateLimit-Reset": "42" } });
      },
    });
    await expect(result).rejects.toMatchObject({ code: "rate_limited", retryAfterSeconds: 42 });
    expect(calls).toBe(2);
  });

  test("rejects looping pagination instead of reporting a partial success", async () => {
    const result = readWhoopCollection("sleep", "synthetic-token", span, {
      fetch: async () => Response.json({ records: [], next_token: "repeat" }),
    });
    await expect(result).rejects.toMatchObject({ code: "pagination" });
  });
});
