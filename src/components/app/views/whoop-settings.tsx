import { useEffect, useState, type FormEvent } from "react";
import { GhostButton, Input } from "@/components/app/ui";

type Status =
  | "loading"
  | "unavailable"
  | "locked"
  | "disconnected"
  | "connected"
  | "reconnect_required"
  | "disconnecting";
const api = "/api/whoop";

async function getStatus(signal?: AbortSignal): Promise<Status> {
  const response = await fetch(api + "/status", { cache: "no-store", signal });
  if (response.status === 401) return "locked";
  if (!response.ok) return "unavailable";
  const { status } = await response.json();
  return status === "connected" || status === "reconnect_required" || status === "disconnecting"
    ? status
    : "disconnected";
}

export function WhoopSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = new AbortController();
    const readStatus = () => {
      void getStatus(current.signal)
        .then(setStatus)
        .catch(() => {
          if (!current.signal.aborted) setStatus("unavailable");
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
        setStatus(await getStatus());
      } else {
        setMessage("WHOOP access is unavailable right now.");
      }
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
      setStatus("disconnected");
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
      setStatus("locked");
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
      {signedIn && (
        <div className="flex flex-wrap gap-2">
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
