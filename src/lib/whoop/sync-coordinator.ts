import type { WhoopSnapshot } from "./dashboard";

type SyncMode = "automatic" | "manual";
type Change = "updated" | "clear";
type Authorization = "unknown" | "connected" | "blocked";
type SnapshotSource = "live" | "cached";

type Transport = {
  now(): number;
  isOnline?(): boolean;
  setTimer(callback: () => void, delay: number): () => void;
  status(signal: AbortSignal): Promise<Response>;
  records(signal: AbortSignal): Promise<Response>;
  sync(mode: SyncMode, signal: AbortSignal): Promise<Response>;
  onChange(change: Change): void;
  onSync(): void;
  onAuthorizationLost?(): void;
};

const cooldownMs = 120_000;
const requestTimeoutMs = 60_000;
const renewalLeadMs = 15_000;
const maxTimeoutMs = 2_147_483_647;

function retryDeadline(response: Response, now: number) {
  const retryAfter = response.headers.get("Retry-After")?.trim();
  if (!retryAfter) return 0;
  const deadline = /^\d+$/.test(retryAfter)
    ? now + Number(retryAfter) * 1000
    : Date.parse(retryAfter);
  return Number.isFinite(deadline) ? deadline : 0;
}

function isAuthorizationError(response: Response) {
  return response.status === 401 || response.status === 403;
}

function isRecoverable(response: Response) {
  return (
    response.ok ||
    response.status === 408 ||
    response.status === 409 ||
    response.status === 425 ||
    response.status === 429 ||
    response.status >= 500
  );
}

function isSnapshot(value: (WhoopSnapshot & { version?: string }) | null, now: number) {
  return (
    value &&
    typeof value.accessExpiresAt === "string" &&
    Date.parse(value.accessExpiresAt) > now &&
    typeof value.lastSyncedAt === "string" &&
    Array.isArray(value.records)
  );
}

export function createWhoopSyncCoordinator(transport: Transport) {
  let snapshot: WhoopSnapshot | null = null;
  let snapshotSource: SnapshotSource | undefined;
  let expiresAt = Infinity;
  let version: string | undefined;
  let authorization: Authorization = "unknown";
  let blockedStatus = 401;
  let active = false;
  let foreground = false;
  let generation = 0;
  let nextAllowed = 0;
  let statusNotBefore = 0;
  let recordsNotBefore = 0;
  let nextRenewal = 0;
  let rateLimited = false;
  let inFlight: Promise<Response> | undefined;
  let reading: AbortController | undefined;
  let checking: { controller: AbortController; promise: Promise<void> } | undefined;
  let cancelTimer: (() => void) | undefined;

  function publish(value: WhoopSnapshot | null, source: SnapshotSource = "live") {
    if (snapshot === value) return;
    snapshot = value;
    snapshotSource = value ? source : undefined;
    expiresAt = value ? Date.parse(value.accessExpiresAt) : Infinity;
    transport.onChange("updated");
  }

  function expire() {
    if (expiresAt <= transport.now()) publish(null);
  }

  function resetEvidence(change: Change) {
    generation++;
    reading?.abort();
    nextRenewal = 0;
    version = undefined;
    if (change === "updated") {
      publish(null);
    } else {
      snapshot = null;
      snapshotSource = undefined;
      expiresAt = Infinity;
      transport.onChange("clear");
    }
  }

  function block(status: number) {
    const hadAccess = authorization === "connected" || snapshot !== null || inFlight !== undefined;
    authorization = "blocked";
    blockedStatus = status;
    resetEvidence(hadAccess ? "clear" : "updated");
    if (hadAccess && (status === 401 || status === 403)) transport.onAuthorizationLost?.();
  }

  function nextCheck() {
    if (
      !active ||
      !foreground ||
      transport.isOnline?.() === false ||
      authorization === "blocked" ||
      checking ||
      inFlight
    ) {
      return Infinity;
    }
    return Math.max(nextAllowed, nextRenewal, statusNotBefore);
  }

  function arm() {
    cancelTimer?.();
    cancelTimer = undefined;
    // Expiry still applies while hidden/offline; only network work pauses.
    const deadline = Math.min(expiresAt, nextCheck());
    if (!Number.isFinite(deadline)) return;
    const delay = Math.min(Math.max(0, deadline - transport.now()), maxTimeoutMs);
    cancelTimer = transport.setTimer(() => {
      expire();
      if (nextCheck() <= transport.now()) void revalidate(false);
      else arm();
    }, delay);
  }

  function withinDeadline<T>(
    controller: AbortController,
    operation: (signal: AbortSignal) => Promise<T>,
  ) {
    const { signal } = controller;
    let detach: (() => void) | undefined;
    const aborted = new Promise<never>((_, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      detach = () => signal.removeEventListener("abort", onAbort);
    });
    const cancelDeadline = transport.setTimer(() => {
      controller.abort(new DOMException("WHOOP request timed out.", "TimeoutError"));
    }, requestTimeoutMs);
    return Promise.race([aborted, operation(signal)]).finally(() => {
      cancelDeadline();
      detach?.();
    });
  }

  async function restoreCachedSnapshot(signal: AbortSignal) {
    if (transport.now() < recordsNotBefore) return;
    const readGeneration = generation;
    const response = await transport.records(signal);
    signal.throwIfAborted();
    if (readGeneration !== generation) return;
    if (isAuthorizationError(response)) {
      block(response.status);
    } else if (response.ok) {
      return displaySnapshot(response, false, readGeneration, signal);
    } else if (deferRecordsRead(response)) {
      recordCooldown(response);
    }
  }

  async function readStatus(signal: AbortSignal, restoreCache: boolean, checkGeneration: number) {
    const response = await transport.status(signal);
    signal.throwIfAborted();
    const info = response.ok ? await response.json() : null;
    signal.throwIfAborted();
    if (checkGeneration !== generation) return;
    if (info?.status === "connected") {
      const nextVersion = typeof info.version === "string" ? info.version : undefined;
      const versionChanged = version !== undefined && version !== nextVersion;
      if (versionChanged) resetEvidence("updated");
      version = nextVersion;
      authorization = "connected";
      const cachedSnapshotChanged =
        snapshotSource === "cached" &&
        (typeof info.lastSyncedAt === "string" || info.lastSyncedAt === null) &&
        info.lastSyncedAt !== snapshot?.lastSyncedAt;
      if ((restoreCache || versionChanged) && (!snapshot || cachedSnapshotChanged)) {
        await restoreCachedSnapshot(signal);
      }
    } else if (!response.ok && !isAuthorizationError(response)) {
      const now = transport.now();
      const retryAt = retryDeadline(response, now);
      if (response.status === 429 || retryAt > 0) {
        statusNotBefore = Math.max(statusNotBefore, now + cooldownMs, retryAt);
      }
      retryStatus(retryAt);
    } else if (
      response.ok &&
      !["disconnected", "disconnecting", "reconnect_required", "locked", "unavailable"].includes(
        info?.status,
      )
    ) {
      retryStatus();
    } else {
      block(
        isAuthorizationError(response) ? response.status : info?.status === "locked" ? 401 : 503,
      );
    }
  }

  async function checkStatus(signal: AbortSignal, restoreCache: boolean) {
    const checkGeneration = generation;
    // /records independently authenticates the session and current connection.
    // Restore its original authorized lease without waiting for status or WHOOP.
    const restoring =
      restoreCache && !snapshot
        ? restoreCachedSnapshot(signal).catch(() => {
            signal.throwIfAborted();
          })
        : undefined;
    const [, restored] = await Promise.all([
      readStatus(signal, restoreCache && !restoring, checkGeneration).catch(() => {
        signal.throwIfAborted();
        if (checkGeneration === generation) retryStatus();
      }),
      restoring,
    ]);
    // A response issued before the status read can belong to an older revision.
    // Fetch the current authorized server snapshot once, without forcing WHOOP sync.
    if (restored === false && authorization === "connected") await restoreCachedSnapshot(signal);
  }

  function retryStatus(retryAt = 0) {
    authorization = "unknown";
    // A transport failure does not revoke an authenticated records response or
    // an existing lease. Only authorization/lifecycle fences advance generation.
    expire();
    nextRenewal = Math.max(transport.now() + cooldownMs, retryAt);
  }

  function revalidate(restoreCache = true) {
    expire();
    if (!active || !foreground || transport.isOnline?.() === false) {
      arm();
      return Promise.resolve();
    }
    if (checking) return checking.promise;
    if (transport.now() < statusNotBefore) {
      arm();
      return Promise.resolve();
    }
    const controller = new AbortController();
    const checkGeneration = generation;
    const promise = withinDeadline(controller, (signal) => checkStatus(signal, restoreCache))
      .catch(() => {
        if (checking?.controller === controller && checkGeneration === generation) retryStatus();
      })
      .finally(() => {
        if (checking?.controller !== controller) return;
        checking = undefined;
        if (authorization === "connected" && nextCheck() <= transport.now()) {
          void requestSync("automatic").catch(() => {});
        }
        arm();
        transport.onChange("updated");
      });
    checking = { controller, promise };
    transport.onChange("updated");
    arm();
    return promise;
  }

  function cancelStatusCheck() {
    checking?.controller.abort();
    checking = undefined;
  }

  function setForeground(value: boolean) {
    if (value === foreground) return;
    foreground = value;
    if (foreground) {
      expire();
      nextRenewal = 0;
      transport.onChange("updated");
      void revalidate();
    } else {
      cancelStatusCheck();
      generation++;
      reading?.abort();
      expire();
      arm();
    }
  }

  function invalidate() {
    cancelStatusCheck();
    authorization = "blocked";
    blockedStatus = 401;
    resetEvidence("clear");
    arm();
  }

  function recordCooldown(response: Response) {
    const now = transport.now();
    nextAllowed = Math.max(nextAllowed, now + cooldownMs, retryDeadline(response, now));
    rateLimited = response.status === 429;
  }

  function deferRecordsRead(response: Response) {
    if (!isRecoverable(response)) return false;
    const now = transport.now();
    const retryAt = retryDeadline(response, now);
    if (response.status !== 429 && retryAt <= 0) return false;
    recordsNotBefore = Math.max(recordsNotBefore, now + cooldownMs, retryAt);
    return true;
  }

  function handleSyncFailure(response: Response) {
    if (isAuthorizationError(response)) {
      block(response.status);
      cancelStatusCheck();
    } else {
      nextRenewal = 0;
    }
  }

  async function displaySnapshot(
    data: Response,
    live: boolean,
    syncGeneration: number,
    signal: AbortSignal,
  ) {
    const value = await data.json();
    signal.throwIfAborted();
    if (syncGeneration !== generation) return;
    expire();
    if (isSnapshot(value, transport.now())) {
      if (!live) {
        if (
          typeof value.version !== "string" ||
          (version !== undefined && value.version !== version)
        )
          return false;
        version = value.version;
      }
      if (live && typeof value.version === "string") version = value.version;
      if (
        live ||
        !snapshot ||
        (snapshotSource === "cached" &&
          Date.parse(value.lastSyncedAt) >= Date.parse(snapshot.lastSyncedAt))
      ) {
        publish(value, live ? "live" : "cached");
      }
    } else if (!live && snapshotSource === "cached" && value === null) {
      // An authenticated cache read can explicitly withdraw cached evidence.
      publish(null);
    } else {
      // An invalid replacement cannot invalidate the previous authorized lease.
      // expire() above still removes it at its original deadline.
      expire();
    }
  }

  async function sync(mode: SyncMode, syncGeneration: number, signal: AbortSignal) {
    const response = await transport.sync(mode, signal);
    signal.throwIfAborted();
    recordCooldown(response);
    if (syncGeneration !== generation) return response;
    expire();
    if (!response.ok && (response.status !== 409 || snapshotSource === "live")) {
      handleSyncFailure(response);
      return response;
    }

    const live = response.status === 200;
    if (!live) reading = new AbortController();
    const data = reading ? await transport.records(reading.signal) : response.clone();
    signal.throwIfAborted();
    if (syncGeneration !== generation) return response;
    if (!data.ok) {
      deferRecordsRead(data);
      recordCooldown(data);
      handleSyncFailure(data);
      return data;
    }
    await displaySnapshot(data, live, syncGeneration, signal);
    signal.throwIfAborted();
    if (syncGeneration !== generation) return response;
    const target = expiresAt - renewalLeadMs;
    nextRenewal =
      response.ok && snapshot
        ? Math.min(target, live ? Infinity : transport.now() + cooldownMs)
        : 0;
    if (response.ok) transport.onSync();
    return response;
  }

  function requestSync(mode: SyncMode = "manual"): Promise<Response> {
    if (!foreground || transport.isOnline?.() === false)
      return Promise.resolve(new Response(null, { status: 503 }));
    if (inFlight) return inFlight;
    if (checking) {
      return checking.promise.then(() => requestSync(mode));
    }
    if (active && authorization !== "connected") {
      return Promise.resolve(
        new Response(null, { status: authorization === "blocked" ? blockedStatus : 503 }),
      );
    }
    const remaining = nextAllowed - transport.now();
    if (remaining > 0) {
      return Promise.resolve(
        new Response(null, {
          status: rateLimited ? 429 : 409,
          headers: { "Retry-After": String(Math.ceil(remaining / 1000)) },
        }),
      );
    }
    const controller = new AbortController();
    controller.signal.addEventListener("abort", () => reading?.abort(), { once: true });
    const syncGeneration = generation;
    inFlight = withinDeadline(controller, (signal) => sync(mode, syncGeneration, signal))
      .catch((error) => {
        nextAllowed = Math.max(nextAllowed, transport.now() + cooldownMs);
        rateLimited = false;
        if (syncGeneration === generation) nextRenewal = 0;
        throw error;
      })
      .finally(() => {
        inFlight = undefined;
        reading = undefined;
        arm();
        transport.onChange("updated");
      });
    transport.onChange("updated");
    arm();
    return inFlight;
  }

  return {
    getRefreshing() {
      return foreground && Boolean(checking || inFlight);
    },
    getSnapshot() {
      return expiresAt > transport.now() ? snapshot : null;
    },
    start() {
      active = true;
      void revalidate();
    },
    stop() {
      active = false;
      cancelStatusCheck();
      authorization = "unknown";
      resetEvidence("updated");
      arm();
    },
    setForeground,
    revalidate,
    invalidate,
    requestSync,
  };
}
