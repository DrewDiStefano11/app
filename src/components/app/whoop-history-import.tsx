import { useEffect, useRef, useState } from "react";
import { GhostButton } from "@/components/app/ui";
import { refreshWhoopArchive, whoopApi } from "@/lib/whoop/browser";
import type { WhoopImportProgress } from "@/lib/whoop/archive-store.server";

const complete = (rows: WhoopImportProgress[]) =>
  rows.length === 4 && rows.every((row) => row.completedAt);

export function WhoopHistoryImport() {
  const [progress, setProgress] = useState<WhoopImportProgress[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(whoopApi + "/archive-import", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setProgress((await response.json()).progress);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const step = async () => {
      // Abort cannot guarantee that the server abandoned an accepted page. A
      // remount resumes the committed checkpoint under the same database lease.
      if (pending.current) {
        timer = setTimeout(step, 500);
        return;
      }
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        setMessage("Import paused while offline or in the background. Saved progress is retained.");
        timer = setTimeout(step, 2000);
        return;
      }
      pending.current = true;
      try {
        const response = await fetch(whoopApi + "/archive-import", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const result = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (result?.progress) setProgress(result.progress);
        if (result?.reason === "scope_verification_required") {
          setRunning(false);
          setMessage(
            "Granted WHOOP permissions could not be verified for this collection. Reauthorize the required read permissions before resuming. Saved history is retained.",
          );
          return;
        }
        if (
          response.status === 429 ||
          (response.status === 409 && response.headers.has("Retry-After"))
        ) {
          const seconds = Number(response.headers.get("Retry-After")) || 60;
          setMessage(
            `Waiting for WHOOP availability. Retry in ${seconds} seconds; saved progress is retained.`,
          );
          timer = setTimeout(step, Math.max(1, seconds) * 1000);
          return;
        }
        if (!response.ok || !result?.progress) throw new Error();
        if (complete(result.progress)) {
          setRunning(false);
          setMessage("All available authorized history imported.");
          void refreshWhoopArchive();
          return;
        }
        setMessage(
          "Importing available history. You can keep using FitCore and resume here later.",
        );
        timer = setTimeout(step, 2100);
      } catch {
        if (!controller.signal.aborted) {
          setRunning(false);
          setMessage(
            "Import interrupted. Your saved pages are retained; resume when connected and WHOOP settings are unlocked.",
          );
        }
      } finally {
        pending.current = false;
      }
    };
    void step();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [running]);

  return (
    <section aria-label="Historical WHOOP import" className="space-y-2 border-t border-border pt-3">
      <h4 className="font-semibold">Historical WHOOP import</h4>
      <p className="text-sm text-muted-foreground">
        Import all history available to your authorized WHOOP account. Measurements keep their
        original dates. Progress is saved after each page; no estimated completion percentage is
        invented.
      </p>
      {progress.length > 0 && (
        <ul className="text-sm">
          {progress.map((row) => (
            <li key={row.kind}>
              {row.kind}: {row.recordsSeen} provider records processed across {row.pages} pages ·{" "}
              {row.completedAt ? "Complete" : "In progress"}
            </li>
          ))}
        </ul>
      )}
      {running ? (
        <GhostButton
          type="button"
          onClick={() => {
            setRunning(false);
            setMessage("Paused. Saved progress will resume from the last committed page.");
            void refreshWhoopArchive();
          }}
        >
          Pause historical import
        </GhostButton>
      ) : (
        !complete(progress) && (
          <GhostButton
            type="button"
            onClick={() => {
              setMessage("");
              setRunning(true);
            }}
          >
            {progress.length ? "Resume historical import" : "Import available WHOOP history"}
          </GhostButton>
        )
      )}
      {complete(progress) && (
        <p className="text-sm">
          All four collections complete. Ordinary synchronization continues to update recent
          measurements.
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
