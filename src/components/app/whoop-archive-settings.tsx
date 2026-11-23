import { useState } from "react";
import { GhostButton } from "@/components/app/ui";
import {
  announceWhoopSnapshot,
  notifyWhoopSessionChanged,
  requestWhoopSync,
  whoopApi,
} from "@/lib/whoop/browser";

export type WhoopArchiveStatus = {
  available: boolean;
  consent: {
    grantedAt: string;
    revokedAt: string | null;
    noticeVersion: string;
    purposes: string[];
    source: string;
  } | null;
};

export function WhoopArchiveSettings({
  archive,
  onChanged,
}: {
  archive: WhoopArchiveStatus;
  onChanged(): Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const active = !!archive.consent && !archive.consent.revokedAt;
  async function change(enable: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        whoopApi + "/archive-consent",
        enable
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                noticeVersion: "owner-measurements-v1",
                authorizePersonalArchive: true,
              }),
            }
          : { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
      setConfirmDelete(false);
      if (!enable) announceWhoopSnapshot("clear");
      notifyWhoopSessionChanged();
      await onChanged();
      if (enable) {
        const synced = await requestWhoopSync();
        await onChanged();
        setMessage(
          synced.ok
            ? "Private history enabled and synchronized."
            : "Private history enabled. Your next successful sync will save measurements.",
        );
      } else
        setMessage(
          "Storage consent withdrawn. Stored WHOOP history and import state were deleted.",
        );
    } catch {
      setMessage(
        "Could not update private history. Check your connection and unlock WHOOP settings if needed.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!archive.available) return null;
  return (
    <section aria-label="Private WHOOP history" className="space-y-2 border-t border-border pt-3">
      <h4 className="font-semibold">Private WHOOP history</h4>
      <p className="text-sm text-muted-foreground">
        Authorize FitCore to store your WHOOP recovery, HRV, resting heart rate, sleep, strain and
        workouts in its private encrypted database for display, historical tracking and personal
        fitness analysis. This does not authorize sharing with AI providers.
      </p>
      <p className="text-sm text-muted-foreground">
        Retention continues until you withdraw consent, disconnect WHOOP or access must end.
        Withdrawal deletes server history and import state. Files you export remain under your
        control.
      </p>
      {active ? (
        <>
          <p className="text-sm">
            Authorized {new Date(archive.consent!.grantedAt).toLocaleString()} · Personal display,
            history and fitness analysis
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={whoopApi + "/archive-export"}
              className="rounded-lg border border-border px-3 py-2 text-sm underline"
              download
            >
              Export WHOOP history
            </a>
            <GhostButton type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Withdraw storage consent
            </GhostButton>
          </div>
          {confirmDelete && (
            <div
              role="group"
              aria-label="Confirm history deletion"
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <p className="text-sm">
                Delete your stored WHOOP measurements and stop saving history? Your WHOOP connection
                can still provide live measurements.
              </p>
              <GhostButton type="button" disabled={busy} onClick={() => void change(false)}>
                Delete WHOOP history
              </GhostButton>
              <GhostButton type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>
                Keep history
              </GhostButton>
            </div>
          )}
        </>
      ) : (
        <>
          {archive.consent?.revokedAt && (
            <p className="text-sm">
              Storage consent withdrawn {new Date(archive.consent.revokedAt).toLocaleString()}.
            </p>
          )}
          <GhostButton type="button" disabled={busy} onClick={() => void change(true)}>
            Authorize private WHOOP history
          </GhostButton>
        </>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
