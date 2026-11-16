import { useEffect, useState, type FormEvent } from "react";
import { GhostButton, Input } from "@/components/app/ui";
import { announceWhoopSnapshot, requestWhoopSync, whoopApi as api } from "@/lib/whoop/browser";

type Status =
  | "loading"
  | "unavailable"
  | "locked"
  | "disconnected"
  | "connected"
  | "reconnect_required"
  | "disconnecting";
type StatusInfo = { status: Status; lastSyncedAt: string | null };

async function getStatus(signal?: AbortSignal): Promise<StatusInfo> {
  const response = await fetch(api + "/status", { cache: "no-store", signal });
  if (response.status === 401) return { status: "locked", lastSyncedAt: null };
  if (!response.ok) return { status: "unavailable", lastSyncedAt: null };
  return response.json();
}

export function WhoopSettings() {
  const [{ status, lastSyncedAt }, setStatusInfo] = useState<StatusInfo>({
    status: "loading",
    lastSyncedAt: null,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = new AbortController();
    const readStatus = () => {
      void getStatus(current.signal)
        .then(setStatusInfo)
        .catch(() => {
          if (!current.signal.aborted) setStatusInfo({ status: "unavailable", lastSyncedAt: null });
        });
    };
    readStatus();
    window.addEventListener("focus", readStatus);
    return () => {
      current.abort();
      window.removeEventListener("focus", readStatus);
    };
  }, []);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const accessKey = String(new FormData(form).get("access_key") ?? "").trim();
    form.reset();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(api + "/session", {
        method: "POST",
        body: new URLSearchParams({ access_key: accessKey }),
      });
      if (response.status === 401) {
        setMessage("That access key did not match.");
      } else if (response.ok) {
        setStatusInfo(await getStatus());
      } else {
        setMessage("WHOOP access is unavailable right now.");
      }
    } catch {
      setMessage("Could not reach FitCore. Try again when you are online.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setMessage("");
    try {
      const response = await requestWhoopSync();
      setStatusInfo(await getStatus());
      if (response.ok) setMessage("WHOOP sync complete.");
      else if (response.status === 409)
        setMessage("WHOOP sync is busy or cooling down. Try again shortly.");
      else if (response.status === 429) setMessage("WHOOP is limiting requests. Try again later.");
      else if (response.status === 401 || response.status === 403)
        setMessage("Unlock or reconnect WHOOP to sync.");
      else setMessage("WHOOP sync was interrupted. Try again when the connection is available.");
    } catch {
      setMessage("Could not reach FitCore. Try again when you are online.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(api + "/disconnect", { method: "DELETE" });
      if (!response.ok) {
        setMessage("FitCore could not disconnect WHOOP. Sign in again if your session expired.");
        return;
      }
      const { revoked } = await response.json();
      announceWhoopSnapshot("clear");
      setStatusInfo({ status: "disconnected", lastSyncedAt: null });
      setMessage(
        revoked
          ? "WHOOP access was removed."
          : "FitCore removed its credentials. Remove FitCore’s access in WHOOP to finish revoking it.",
      );
    } catch {
      setMessage("Could not reach FitCore. Check the WHOOP connection status when you are online.");
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    try {
      const response = await fetch(api + "/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      announceWhoopSnapshot("clear");
      setStatusInfo({ status: "locked", lastSyncedAt: null });
      setMessage("");
    } catch {
      setMessage("Could not lock this session. Try again when you are online.");
    } finally {
      setBusy(false);
    }
  }

  const signedIn =
    status === "disconnected" ||
    status === "connected" ||
    status === "reconnect_required" ||
    status === "disconnecting";
  return (
    <section className="mb-3 space-y-3 rounded-2xl border border-border p-3">
      <h3 className="font-semibold">WHOOP</h3>
      {status === "loading" && <p role="status">Checking connection…</p>}
      {status === "unavailable" && (
        <p className="text-sm text-muted-foreground">WHOOP connection is unavailable.</p>
      )}
      {status === "locked" && (
        <form
          className="space-y-2"
          action={api + "/session"}
          method="post"
          onSubmit={(event) => void unlock(event)}
        >
          <label htmlFor="whoop-owner-key" className="text-sm font-medium">
            FitCore integration access key
          </label>
          <Input
            id="whoop-owner-key"
            name="access_key"
            type="password"
            autoComplete="current-password"
            required
          />
          <GhostButton type="submit" disabled={busy}>
            Unlock WHOOP settings
          </GhostButton>
        </form>
      )}
      {status === "disconnected" && (
        <form action={api + "/connect"} method="post">
          <GhostButton type="submit" disabled={busy}>
            Connect WHOOP
          </GhostButton>
        </form>
      )}
      {status === "disconnecting" && <p className="text-sm">WHOOP disconnection is in progress.</p>}
      {(status === "connected" || status === "reconnect_required") && (
        <p className="text-sm">
          {status === "connected" ? "Connected to WHOOP" : "WHOOP needs to be reconnected."}
        </p>
      )}
      {status === "connected" && (
        <p className="text-sm text-muted-foreground">
          {lastSyncedAt
            ? "Last synced " + new Date(lastSyncedAt).toLocaleString()
            : "Waiting for the first successful sync."}
        </p>
      )}
      {signedIn && (
        <div className="flex flex-wrap gap-2">
          {status === "connected" && (
            <GhostButton type="button" disabled={busy} onClick={() => void syncNow()}>
              Sync Now
            </GhostButton>
          )}
          {status !== "disconnected" && (
            <GhostButton type="button" disabled={busy} onClick={() => void disconnect()}>
              Disconnect WHOOP
            </GhostButton>
          )}
          <GhostButton type="button" disabled={busy} onClick={() => void lock()}>
            Lock WHOOP settings
          </GhostButton>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
