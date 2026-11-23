import { expect, test } from "bun:test";
import { createWhoopSyncCoordinator } from "../../src/lib/whoop/sync-coordinator";

const start = Date.parse("2026-11-19T12:00:00Z");
const second = 1000;
const minute = 60 * second;

type Sync = (
  mode: "automatic" | "manual",
  now: number,
  signal: AbortSignal,
) => Response | Promise<Response>;

function setup(sync: Sync) {
  let now = start;
  let nextTimer = 0;
  const timers = new Map<number, { when: number; run: () => void }>();
  const requests: { at: number; mode: "automatic" | "manual" }[] = [];
  const changes: string[] = [];
  let status: () => Response | Promise<Response> = () =>
    Response.json({ status: "connected", version: "synthetic:1" });
  let records: (signal: AbortSignal) => Response | Promise<Response> = () => Response.json(null);
  let statusReads = 0;
  let recordsReads = 0;
  let online = true;
  const coordinator = createWhoopSyncCoordinator({
    now: () => now,
    isOnline: () => online,
    setTimer(run, delay) {
      const id = nextTimer++;
      timers.set(id, {
        when: now + delay,
        run() {
          timers.delete(id);
          run();
        },
      });
      return () => timers.delete(id);
    },
    async status() {
      statusReads++;
      return status();
    },
    async records(signal: AbortSignal) {
      recordsReads++;
      return records(signal);
    },
    async sync(mode, signal) {
      requests.push({ mode, at: now - start });
      return sync(mode, now, signal);
    },
    onChange: (change) => changes.push(change),
    onSync() {},
  });

  async function runFor(duration: number) {
    const until = now + duration;
    const next = () => [...timers.values()].sort((a, b) => a.when - b.when)[0];
    for (let timer = next(); timer && timer.when <= until; timer = next()) {
      now = Math.max(now, timer.when);
      timer.run();
      await drain();
    }
    now = until;
    await drain();
  }

  function launch() {
    coordinator.setForeground(true);
    coordinator.start();
  }

  return {
    coordinator,
    requests,
    changes,
    launch,
    runFor,
    setOnline: (value: boolean) => {
      online = value;
    },
    statusReads: () => statusReads,
    recordsReads: () => recordsReads,
    setStatus: (read: typeof status) => {
      status = read;
    },
    setRecords: (read: typeof records) => {
      records = read;
    },
    suspendFor: (duration: number) => {
      now += duration;
    },
  };
}

async function drain() {
  // Response body parsing can finish in a later event-loop turn.
  await Bun.sleep(0);
  await Bun.sleep(0);
}

function snapshot(now: number, life = 5 * minute) {
  return {
    version: "synthetic:1",
    accessExpiresAt: new Date(now + life).toISOString(),
    lastSyncedAt: new Date(now).toISOString(),
    records: [],
  };
}

function live(now: number, life?: number, version = "synthetic:1") {
  return Response.json({ ...snapshot(now, life), version });
}

test("repeated 200 replies renew the snapshot for 35 foreground minutes", async () => {
  const { coordinator, launch, runFor, requests } = setup((_, now) => live(now));
  launch();
  await drain();
  await runFor(35 * minute);
  expect(requests.map(({ at }) => at)).toEqual([
    0, 285_000, 570_000, 855_000, 1_140_000, 1_425_000, 1_710_000, 1_995_000,
  ]);
  expect(coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start + 1_995_000).toISOString());
});

test.each([429, 503, "network"])(
  "transient status %s retains valid authorized evidence until its original deadline",
  async (failure) => {
    const fixture = setup((_, now) => live(now));
    fixture.launch();
    await drain();
    const original = fixture.coordinator.getSnapshot();
    expect(original).not.toBeNull();
    fixture.setStatus(() => {
      if (failure === "network") throw new Error("Synthetic status failure");
      return new Response(null, { status: failure, headers: { "Retry-After": "600" } });
    });
    await fixture.coordinator.revalidate();
    expect(fixture.coordinator.getSnapshot()).toBe(original);
    await fixture.runFor(5 * minute);
    expect(fixture.coordinator.getSnapshot()).toBeNull();
  },
);

test("a malformed renewal never hides unexpired previous evidence or extends its expiry", async () => {
  let calls = 0;
  const fixture = setup((_, now) => (++calls === 1 ? live(now) : Response.json({ invalid: true })));
  fixture.launch();
  await drain();
  const original = fixture.coordinator.getSnapshot();
  await fixture.runFor(285000);
  expect(fixture.coordinator.getSnapshot()).toBe(original);
  await fixture.runFor(15000);
  expect(fixture.coordinator.getSnapshot()).toBeNull();
});

test("continues to retry recoverable 409s and network failures", async () => {
  let attempts = 0;
  const { launch, runFor, requests } = setup((_, now) => {
    attempts++;
    if (attempts === 3) throw new Error("Synthetic network interruption");
    return attempts < 5 ? new Response(null, { status: 409 }) : live(now);
  });
  launch();
  await drain();
  await runFor(8 * minute);
  expect(requests.map(({ at }) => at)).toEqual([0, 120_000, 240_000, 360_000, 480_000]);
});

test("respects Retry-After in seconds and HTTP dates for automatic and manual requests", async () => {
  let attempts = 0;
  const { coordinator, launch, runFor, requests } = setup((_, now) => {
    attempts++;
    const retry = attempts === 1 ? "175" : new Date(start + 400_000).toUTCString();
    return attempts <= 2
      ? new Response(null, { status: 429, headers: { "Retry-After": retry } })
      : live(now);
  });
  launch();
  await drain();
  await runFor(120 * second);
  const cooled = await coordinator.requestSync();
  expect(cooled.status).toBe(429);
  expect(cooled.headers.get("Retry-After")).toBe("55");
  await runFor(279 * second);
  expect(requests.map(({ at }) => at)).toEqual([0, 175_000]);
  await runFor(second);
  expect(requests.map(({ at }) => at)).toEqual([0, 175_000, 400_000]);
});

test("reads authenticated records after each 204 and repeats even if there are no records", async () => {
  const fixture = setup(() => new Response(null, { status: 204 }));
  fixture.setRecords(() => Response.json(snapshot(start, 2 * minute)));
  fixture.launch();
  await drain();
  expect(fixture.coordinator.getSnapshot()?.accessExpiresAt).toBe(
    new Date(start + 2 * minute).toISOString(),
  );
  fixture.setRecords(() => Response.json(null));
  await fixture.runFor(4 * minute);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 120_000, 240_000]);
  expect(fixture.recordsReads()).toBe(4);
  expect(fixture.coordinator.getSnapshot()).toBeNull();
});

test("manual requests join the active automatic request and honor its cooldown after it finishes", async () => {
  const pending = Promise.withResolvers<Response>();
  const { coordinator, launch, requests } = setup(() => pending.promise);
  launch();
  await drain();
  const manual = coordinator.requestSync();
  expect(coordinator.requestSync()).toBe(manual);
  expect(requests).toEqual([{ at: 0, mode: "automatic" }]);
  pending.resolve(live(start));
  const synced = await manual;
  expect(synced.status).toBe(200);
  expect((await synced.json()).version).toBe("synthetic:1");
  const coolingDown = await coordinator.requestSync();
  expect(coolingDown.status).toBe(409);
  expect(coolingDown.headers.get("Retry-After")).toBe("120");
  expect(requests).toHaveLength(1);
});

test("clears at the actual expiration while a renewal request is still loading", async () => {
  const pending = Promise.withResolvers<Response>();
  let attempts = 0;
  const { coordinator, launch, runFor, requests } = setup((_, now) =>
    ++attempts === 1 ? live(now, 3 * minute) : pending.promise,
  );
  launch();
  await drain();
  await runFor(179_999);
  expect(requests.map(({ at }) => at)).toEqual([0, 165_000]);
  expect(coordinator.getSnapshot()).not.toBeNull();
  await runFor(1);
  expect(coordinator.getSnapshot()).toBeNull();
  pending.resolve(live(start + 180_000));
  await drain();
  expect(coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start + 180_000).toISOString());
});

function stalledPost(signal: AbortSignal) {
  return new Promise<Response>((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

test("times out a stalled renewal and retries after a full cooldown", async () => {
  let attempts = 0;
  let stalled: AbortSignal | undefined;
  const fixture = setup((_, now, signal) => {
    if (++attempts !== 2) return live(now, 3 * minute);
    stalled = signal;
    return stalledPost(signal);
  });
  fixture.launch();
  await drain();
  await fixture.runFor(166 * second);
  const result = fixture.coordinator.requestSync().catch((error: DOMException) => error.name);
  await fixture.runFor(14 * second);
  expect(fixture.coordinator.getSnapshot()).toBeNull();
  expect(stalled?.aborted).toBe(false);
  await fixture.runFor(45 * second);
  expect(stalled?.aborted).toBe(true);
  expect(await result).toBe("TimeoutError");
  const cooldown = await fixture.coordinator.requestSync();
  expect(cooldown.status).toBe(409);
  expect(cooldown.headers.get("Retry-After")).toBe("120");
  await fixture.runFor(119_999);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 165_000]);
  await fixture.runFor(1);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 165_000, 345_000]);
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
    new Date(start + 345_000).toISOString(),
  );
});

test("leaving and resuming the foreground cannot overlap a stalled POST", async () => {
  let attempts = 0;
  let stalled: AbortSignal | undefined;
  const fixture = setup((_, now, signal) => {
    if (++attempts !== 1) return live(now);
    stalled = signal;
    return stalledPost(signal);
  });
  fixture.launch();
  await drain();
  fixture.coordinator.setForeground(false);
  expect((await fixture.coordinator.requestSync()).status).toBe(503);
  await fixture.runFor(30 * second);
  fixture.coordinator.setForeground(true);
  await drain();
  expect(fixture.requests).toHaveLength(1);
  fixture.coordinator.setForeground(false);
  await fixture.runFor(3 * minute);
  expect(stalled?.aborted).toBe(true);
  expect(fixture.requests).toHaveLength(1);
  fixture.coordinator.setForeground(true);
  await drain();
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 210_000]);
});

test("a POST that ignores abort cannot retain the singleton request or publish late data", async () => {
  const abandoned = Promise.withResolvers<Response>();
  let attempts = 0;
  const fixture = setup((_, now) => (++attempts === 1 ? abandoned.promise : live(now)));
  fixture.launch();
  await drain();
  await fixture.runFor(180 * second);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 180_000]);
  abandoned.resolve(live(start));
  await drain();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
    new Date(start + 180_000).toISOString(),
  );
});

test("a status request that ignores abort releases authorization checks at its deadline", async () => {
  const abandoned = Promise.withResolvers<Response>();
  let reads = 0;
  const fixture = setup((_, now) => live(now));
  fixture.setStatus(() =>
    ++reads === 1
      ? abandoned.promise
      : Response.json({ status: "connected", version: "synthetic:1" }),
  );
  fixture.launch();
  await drain();
  await fixture.runFor(180 * second);
  expect(fixture.statusReads()).toBe(2);
  expect(fixture.requests.map(({ at }) => at)).toEqual([180_000]);
  abandoned.resolve(new Response(null, { status: 401 }));
  await drain();
  expect(fixture.coordinator.getSnapshot()).not.toBeNull();
});

test("focus and hidden resume respect an outstanding status Retry-After", async () => {
  let reads = 0;
  const fixture = setup((_, now) => live(now));
  fixture.setStatus(() =>
    ++reads === 1
      ? new Response(null, { status: 429, headers: { "Retry-After": "200" } })
      : Response.json({ status: "connected", version: "synthetic:1" }),
  );
  fixture.launch();
  await drain();
  await fixture.runFor(30 * second);
  await fixture.coordinator.revalidate();
  fixture.coordinator.setForeground(false);
  await fixture.runFor(minute);
  fixture.coordinator.setForeground(true);
  await fixture.coordinator.revalidate();
  await fixture.runFor(109_999);
  expect(fixture.statusReads()).toBe(1);
  expect(fixture.requests).toHaveLength(0);
  await fixture.runFor(1);
  expect(fixture.statusReads()).toBe(2);
  expect(fixture.requests.map(({ at }) => at)).toEqual([200_000]);
});

test("focus and hidden resume respect Retry-After on a recoverable status 503", async () => {
  let reads = 0;
  const fixture = setup((_, now) => live(now));
  fixture.setStatus(() =>
    ++reads === 1
      ? new Response(null, {
          status: 503,
          headers: { "Retry-After": new Date(start + 300_000).toUTCString() },
        })
      : Response.json({ status: "connected", version: "synthetic:1" }),
  );
  fixture.launch();
  await drain();
  await fixture.runFor(5 * second);
  await fixture.coordinator.revalidate();
  fixture.coordinator.setForeground(false);
  await fixture.runFor(20 * second);
  fixture.coordinator.setForeground(true);
  await fixture.coordinator.revalidate();
  await fixture.runFor(274_999);
  expect(fixture.statusReads()).toBe(1);
  expect(fixture.requests).toHaveLength(0);
  await fixture.runFor(1);
  expect(fixture.statusReads()).toBe(2);
  expect(fixture.requests.map(({ at }) => at)).toEqual([300_000]);
});

test("cached reads respect their own Retry-After across focus and hidden resume", async () => {
  let reads = 0;
  const fixture = setup(() => new Response(null, { status: 204 }));
  fixture.setRecords(() =>
    ++reads === 1
      ? new Response(null, { status: 429, headers: { "Retry-After": "300" } })
      : Response.json(snapshot(start, 24 * 60 * minute)),
  );
  fixture.launch();
  await drain();
  await fixture.runFor(5 * second);
  await fixture.coordinator.revalidate();
  fixture.coordinator.setForeground(false);
  await fixture.runFor(20 * second);
  fixture.coordinator.setForeground(true);
  await fixture.coordinator.revalidate();
  await fixture.runFor(274_999);
  expect(fixture.recordsReads()).toBe(1);
  expect(fixture.requests).toHaveLength(0);
  await fixture.runFor(1);
  expect(fixture.recordsReads()).toBe(2);
  expect(fixture.requests.map(({ at }) => at)).toEqual([300_000]);

  fixture.coordinator.setForeground(false);
  await fixture.runFor(5 * second);
  fixture.coordinator.setForeground(true);
  await fixture.coordinator.revalidate();
  // Hidden transitions retain this lease, so redisplay needs no records read.
  expect(fixture.recordsReads()).toBe(2);
  expect(fixture.requests).toHaveLength(1);
  expect(fixture.coordinator.getSnapshot()).not.toBeNull();
});

test("a 204 records body that ignores abort cannot block or replace the next renewal", async () => {
  const body = Promise.withResolvers<unknown>();
  let attempts = 0;
  let reads = 0;
  const fixture = setup((_, now) =>
    ++attempts === 1 ? new Response(null, { status: 204 }) : live(now),
  );
  fixture.setRecords(() => {
    if (++reads === 1) return Response.json(null);
    const unreadable = new Response();
    unreadable.json = () => body.promise;
    return unreadable;
  });
  fixture.launch();
  await drain();
  await fixture.runFor(180 * second);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 180_000]);
  body.resolve(snapshot(start));
  await drain();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
    new Date(start + 180_000).toISOString(),
  );
});

test.each([401, 403, 429])(
  "returns the protected records %i to the manual caller after a 204",
  async (code) => {
    const firstSync = Promise.withResolvers<Response>();
    let reads = 0;
    const fixture = setup(() => firstSync.promise);
    fixture.setRecords(() =>
      ++reads === 1
        ? Response.json(null)
        : new Response(null, {
            status: code,
            headers: code === 429 ? { "Retry-After": "200" } : undefined,
          }),
    );
    fixture.launch();
    await drain();
    const manual = fixture.coordinator.requestSync();
    firstSync.resolve(new Response(null, { status: 204 }));
    expect((await manual).status).toBe(code);
    expect((await fixture.coordinator.requestSync()).status).toBe(code);
    if (code === 429) {
      await fixture.runFor(199_999);
      expect(fixture.requests).toHaveLength(1);
      await fixture.runFor(1);
      expect(fixture.requests).toHaveLength(2);
    } else {
      await fixture.runFor(10 * minute);
      expect(fixture.requests).toHaveLength(1);
    }
  },
);

test("loads an authorized cached snapshot after a 409 and renews after the cooldown", async () => {
  let attempts = 0;
  let reads = 0;
  const fixture = setup((_, now) =>
    ++attempts === 1 ? new Response(null, { status: 409 }) : live(now),
  );
  fixture.setRecords(() => Response.json(++reads === 1 ? null : snapshot(start, 24 * 60 * minute)));
  fixture.launch();
  await drain();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start).toISOString());
  await fixture.runFor(2 * minute);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 120_000]);
});

test("loads a still-authorized cached snapshot on foreground and checks every two minutes", async () => {
  const firstSync = Promise.withResolvers<Response>();
  const fixture = setup(() => firstSync.promise);
  fixture.setRecords(() => Response.json(snapshot(start, 24 * 60 * minute)));
  fixture.launch();
  await drain();
  expect(fixture.coordinator.getSnapshot()?.accessExpiresAt).toBe(
    new Date(start + 24 * 60 * minute).toISOString(),
  );
  firstSync.resolve(new Response(null, { status: 204 }));
  await drain();
  await fixture.runFor(4 * minute);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 120_000, 240_000]);
});

test("a newer authenticated status timestamp refreshes cached evidence without changing the version", async () => {
  const fixture = setup(() => new Response(null, { status: 204 }));
  fixture.setRecords(() => Response.json(snapshot(start - minute)));
  fixture.launch();
  await drain();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
    new Date(start - minute).toISOString(),
  );

  fixture.setStatus(() =>
    Response.json({
      status: "connected",
      version: "synthetic:1",
      lastSyncedAt: new Date(start).toISOString(),
    }),
  );
  fixture.setRecords(() => Response.json(snapshot(start)));
  await fixture.coordinator.revalidate();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start).toISOString());
  expect(fixture.requests).toHaveLength(1);
});

test.each(["cached", "live"])(
  "an empty protected read on revalidation clears cached evidence and preserves %s evidence when applicable",
  async (kind) => {
    const fixture = setup((_, now) =>
      kind === "cached" ? new Response(null, { status: 204 }) : live(now),
    );
    fixture.setRecords(() => Response.json(snapshot(start)));
    fixture.launch();
    await drain();
    expect(fixture.coordinator.getSnapshot()).not.toBeNull();

    fixture.setStatus(() =>
      Response.json({ status: "connected", version: "synthetic:1", lastSyncedAt: null }),
    );
    fixture.setRecords(() => Response.json(null));
    await fixture.coordinator.revalidate();
    if (kind === "cached") {
      expect(fixture.coordinator.getSnapshot()).toBeNull();
    } else {
      expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start).toISOString());
    }
  },
);

test("a 409 can reload cached evidence that became available after the status check", async () => {
  const fixture = setup(() => new Response(null, { status: 409 }));
  let reads = 0;
  fixture.setRecords(() => Response.json(snapshot(++reads === 1 ? start - minute : start)));
  fixture.launch();
  await drain();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start).toISOString());
});

test("an empty records response after a 204 leaves still-authorized live data until expiry", async () => {
  let attempts = 0;
  const fixture = setup((_, now) =>
    ++attempts === 1 ? live(now, 3 * minute) : new Response(null, { status: 204 }),
  );
  fixture.launch();
  await drain();
  await fixture.runFor(179_999);
  expect(fixture.requests.map(({ at }) => at)).toEqual([0, 165_000]);
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start).toISOString());
  await fixture.runFor(1);
  expect(fixture.coordinator.getSnapshot()).toBeNull();
});

test("pauses hidden or offline work and revalidates when the foreground returns", async () => {
  const fixture = setup((_, now) => live(now));
  fixture.launch();
  await drain();
  expect(fixture.coordinator.getSnapshot()).not.toBeNull();
  const original = fixture.coordinator.getSnapshot();
  fixture.coordinator.setForeground(false);
  expect(fixture.coordinator.getSnapshot()).toBe(original);
  expect((await fixture.coordinator.requestSync()).ok).toBe(false);
  await fixture.runFor(20 * minute);
  expect(fixture.requests).toHaveLength(1);
  expect(fixture.statusReads()).toBe(1);
  fixture.coordinator.setForeground(true);
  await drain();
  expect(fixture.statusReads()).toBe(2);
  expect(fixture.requests).toHaveLength(2);
  expect(fixture.coordinator.getSnapshot()).not.toBeNull();
});

test("rechecks expiry and status on focus when browser timers have been suspended", async () => {
  const fixture = setup((_, now) => live(now));
  fixture.launch();
  await drain();
  fixture.setStatus(() => new Response(null, { status: 401 }));
  fixture.suspendFor(12 * minute);
  const checked = fixture.coordinator.revalidate();
  expect(fixture.coordinator.getSnapshot()).toBeNull();
  await checked;
  await fixture.runFor(12 * minute);
  expect(fixture.requests).toHaveLength(1);
  expect(fixture.statusReads()).toBe(2);
});

test.each([401, 403])(
  "clears display and stops after sync returns %i until explicitly revalidated",
  async (code) => {
    let attempts = 0;
    const fixture = setup((_, now) =>
      ++attempts === 2 ? new Response(null, { status: code }) : live(now, 3 * minute),
    );
    fixture.launch();
    await drain();
    await fixture.runFor(166 * second);
    expect(fixture.coordinator.getSnapshot()).toBeNull();
    expect(fixture.changes).toContain("clear");
    await fixture.runFor(30 * minute);
    expect(fixture.requests).toHaveLength(2);
    await fixture.coordinator.revalidate();
    await drain();
    expect(fixture.requests).toHaveLength(3);
  },
);

test("unavailable and disconnected statuses stop the loop until a confirmed connection", async () => {
  const fixture = setup((_, now) => live(now));
  fixture.setStatus(() => Response.json({ status: "unavailable" }));
  fixture.launch();
  await drain();
  await fixture.runFor(30 * minute);
  expect(fixture.requests).toHaveLength(0);
  expect(fixture.statusReads()).toBe(1);
  fixture.setStatus(() => Response.json({ status: "disconnected" }));
  await fixture.coordinator.revalidate();
  expect(fixture.requests).toHaveLength(0);
  fixture.setStatus(() => Response.json({ status: "connected", version: "synthetic:1" }));
  await fixture.coordinator.revalidate();
  await drain();
  expect(fixture.requests).toHaveLength(1);
});

test("fences an in-flight body across lock and unlock without overlapping requests", async () => {
  const pending = Promise.withResolvers<Response>();
  let attempts = 0;
  const fixture = setup((_, now) =>
    ++attempts === 1 ? pending.promise : live(now, undefined, "synthetic:2"),
  );
  fixture.launch();
  await drain();
  fixture.coordinator.invalidate();
  fixture.setStatus(() => Response.json({ status: "connected", version: "synthetic:2" }));
  await fixture.coordinator.revalidate();
  expect(fixture.requests).toHaveLength(1);
  pending.resolve(live(start));
  await drain();
  expect(fixture.coordinator.getSnapshot()).toBeNull();
  await fixture.runFor(2 * minute);
  expect(fixture.requests).toHaveLength(2);
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
    new Date(start + 2 * minute).toISOString(),
  );
});

test("ignores a stale status response after invalidation", async () => {
  const pending = Promise.withResolvers<Response>();
  const fixture = setup((_, now) => live(now));
  fixture.setStatus(() => pending.promise);
  fixture.launch();
  await drain();
  fixture.coordinator.invalidate();
  pending.resolve(Response.json({ status: "connected", version: "synthetic:1" }));
  await drain();
  await fixture.runFor(30 * minute);
  expect(fixture.requests).toHaveLength(0);
  expect(fixture.coordinator.getSnapshot()).toBeNull();
});

test("aborts the authenticated records read when leaving the foreground after a 204", async () => {
  let attempts = 0;
  let reads = 0;
  let readingSignal: AbortSignal | undefined;
  const fixture = setup((_, now) =>
    ++attempts === 1 ? new Response(null, { status: 204 }) : live(now),
  );
  fixture.setRecords((signal) => {
    if (++reads !== 2) return Response.json(null);
    readingSignal = signal;
    return new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  });
  fixture.launch();
  await drain();
  expect(fixture.recordsReads()).toBe(2);
  fixture.coordinator.setForeground(false);
  expect(readingSignal?.aborted).toBe(true);

  fixture.coordinator.setForeground(true);
  await drain();
  await fixture.runFor(2 * minute);
  expect(fixture.requests).toHaveLength(2);
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
    new Date(start + 2 * minute).toISOString(),
  );
});

test("provider revision change clears the previous snapshot before the cooldown ends", async () => {
  const fixture = setup((_, now) => live(now));
  fixture.launch();
  await drain();
  expect(fixture.coordinator.getSnapshot()).not.toBeNull();
  fixture.setStatus(() => Response.json({ status: "connected", version: "synthetic:2" }));
  await fixture.coordinator.revalidate();
  expect(fixture.coordinator.getSnapshot()).toBeNull();
  expect(fixture.requests).toHaveLength(1);
});

test.each([30 * second, 5 * minute])(
  "hidden resume after %i ms redisplays the original lease before any status or synchronization completes",
  async (away) => {
    const fixture = setup((_, now) => live(now, 10 * minute));
    fixture.launch();
    await drain();
    const original = fixture.coordinator.getSnapshot();
    fixture.coordinator.setForeground(false);
    expect(fixture.coordinator.getSnapshot()).toBe(original);
    fixture.suspendFor(away);
    const status = Promise.withResolvers<Response>();
    fixture.setStatus(() => status.promise);
    fixture.coordinator.setForeground(true);
    expect(fixture.coordinator.getSnapshot()).toBe(original);
    expect(fixture.coordinator.getSnapshot()?.accessExpiresAt).toBe(
      new Date(start + 10 * minute).toISOString(),
    );
    status.resolve(Response.json({ status: "connected", version: "synthetic:1" }));
    await drain();
  },
);

test("offline resume keeps evidence, performs no network work and clears at the unchanged expiry", async () => {
  const fixture = setup((_, now) => live(now, 10 * minute));
  fixture.launch();
  await drain();
  const original = fixture.coordinator.getSnapshot();
  fixture.setOnline(false);
  fixture.coordinator.setForeground(false);
  await fixture.runFor(5 * minute);
  fixture.coordinator.setForeground(true);
  await fixture.coordinator.revalidate();
  expect(fixture.coordinator.getSnapshot()).toBe(original);
  expect(fixture.statusReads()).toBe(1);
  expect(fixture.requests).toHaveLength(1);
  await fixture.runFor(5 * minute);
  expect(fixture.coordinator.getSnapshot()).toBeNull();
  fixture.setOnline(true);
  await fixture.coordinator.revalidate();
  await drain();
  expect(fixture.requests).toHaveLength(2);
  expect(fixture.coordinator.getSnapshot()).not.toBeNull();
});

test("cold startup restores an authorized server snapshot before slow status and fresh sync complete", async () => {
  const status = Promise.withResolvers<Response>();
  const sync = Promise.withResolvers<Response>();
  const fixture = setup(() => sync.promise);
  fixture.setStatus(() => status.promise);
  fixture.setRecords(() => Response.json(snapshot(start, 10 * minute)));
  fixture.launch();
  await drain();
  expect(fixture.recordsReads()).toBe(1);
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start).toISOString());
  expect(fixture.requests).toHaveLength(0);
  status.resolve(Response.json({ status: "connected", version: "synthetic:1" }));
  await drain();
  expect(fixture.requests).toHaveLength(1);
  sync.resolve(live(start + minute, 9 * minute));
  await drain();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
    new Date(start + minute).toISOString(),
  );
});

test.each(["disconnected", "disconnecting", "reconnect_required", "locked"])(
  "confirmed %s clears a retained lease immediately",
  async (status) => {
    const fixture = setup((_, now) => live(now, 10 * minute));
    fixture.launch();
    await drain();
    expect(fixture.coordinator.getSnapshot()).not.toBeNull();
    fixture.coordinator.setForeground(false);
    fixture.suspendFor(30000);
    fixture.setStatus(() => Response.json({ status }));
    fixture.coordinator.setForeground(true);
    await fixture.coordinator.revalidate();
    expect(fixture.coordinator.getSnapshot()).toBeNull();
    expect(fixture.changes).toContain("clear");
  },
);

test.each([401, 403])("cold authorization %i fences a late protected snapshot", async (status) => {
  const records = Promise.withResolvers<Response>();
  const fixture = setup((_, now) => live(now));
  fixture.setStatus(() => new Response(null, { status }));
  fixture.setRecords(() => records.promise);
  fixture.launch();
  await drain();
  records.resolve(Response.json(snapshot(start, 10 * minute)));
  await drain();
  expect(fixture.coordinator.getSnapshot()).toBeNull();
  expect(fixture.requests).toHaveLength(0);
});

test.each(["records-first", "status-first"])(
  "cold snapshot restoration binds connection revision (%s)",
  async (order) => {
    const status = Promise.withResolvers<Response>();
    const oldRecords = Promise.withResolvers<Response>();
    const fixture = setup(() => new Response(null, { status: 204 }));
    fixture.setStatus(() => status.promise);
    let reads = 0;
    fixture.setRecords(() =>
      ++reads === 1
        ? oldRecords.promise
        : Response.json({
            ...snapshot(start, 10 * minute),
            version: "synthetic:2",
            lastSyncedAt: new Date(start + second).toISOString(),
          }),
    );
    fixture.launch();
    await drain();
    if (order === "records-first") {
      oldRecords.resolve(Response.json(snapshot(start, 10 * minute)));
      await drain();
      expect(fixture.coordinator.getSnapshot()).not.toBeNull();
      status.resolve(Response.json({ status: "connected", version: "synthetic:2" }));
    } else {
      status.resolve(Response.json({ status: "connected", version: "synthetic:2" }));
      await drain();
      oldRecords.resolve(Response.json(snapshot(start, 10 * minute)));
    }
    await drain();
    expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(
      new Date(start + second).toISOString(),
    );
  },
);

test("a concurrent status transport failure cannot undo a definitive records denial", async () => {
  const status = Promise.withResolvers<Response>();
  const fixture = setup((_, now) => live(now));
  fixture.setStatus(() => status.promise);
  fixture.setRecords(() => new Response(null, { status: 403 }));
  fixture.launch();
  await drain();
  status.reject(new Error("Synthetic transport failure"));
  await drain();
  await fixture.runFor(10 * minute);
  expect(fixture.coordinator.getSnapshot()).toBeNull();
  expect(fixture.statusReads()).toBe(1);
  expect(fixture.requests).toHaveLength(0);
});

test("resume can restore authorized server evidence while an earlier POST is still pending", async () => {
  const pending = Promise.withResolvers<Response>();
  const fixture = setup(() => pending.promise);
  fixture.launch();
  await drain();
  expect(fixture.requests).toHaveLength(1);
  fixture.coordinator.setForeground(false);
  fixture.suspendFor(30000);
  fixture.setRecords(() => Response.json(snapshot(start, 10 * minute)));
  fixture.coordinator.setForeground(true);
  await drain();
  expect(fixture.coordinator.getSnapshot()?.lastSyncedAt).toBe(new Date(start).toISOString());
  expect(fixture.requests).toHaveLength(1);
  pending.resolve(live(start + 30000));
  await drain();
});
