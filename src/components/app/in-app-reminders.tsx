import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { dueReminders, dismissReminder, type ReminderKind } from "@/lib/reminders";
import { Card, GhostButton } from "./ui";

export function InAppReminders({ onOpen }: { onOpen(kind: ReminderKind): void }) {
  const { state, set, hasHydrated } = useStore();
  const [, setNow] = useState(Date.now);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);
  const reminders = hasHydrated ? dueReminders(state, Date.now()) : [];
  if (!reminders.length) return null;
  return (
    <Card>
      <section aria-label="In-app reminders" className="space-y-3">
        <h2 className="text-sm font-semibold">Today's reminders</h2>
        <p className="text-xs text-muted-foreground">
          Shown on Home while FitCore is open. Times follow this device's local clock.
        </p>
        {reminders.map((row) => (
          <div key={row.id} className="space-y-1 border-t border-border pt-2">
            <p className="text-sm">
              {row.label} · due {row.time}
            </p>
            <div className="flex flex-wrap gap-2">
              <GhostButton type="button" className="min-h-11" onClick={() => onOpen(row.kind)}>
                {row.action}
              </GhostButton>
              <GhostButton
                type="button"
                className="min-h-11"
                aria-label={`Dismiss ${row.label.toLowerCase()} reminder for today`}
                onClick={() => {
                  if (!set((current) => dismissReminder(current, row.id, Date.now())))
                    setError(
                      "Could not save this dismissal. Your reminder is retained; retry when device storage is available.",
                    );
                  else setError("");
                }}
              >
                Dismiss today
              </GhostButton>
            </div>
          </div>
        ))}
        {error && (
          <p role="status" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </Card>
  );
}
