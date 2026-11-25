import { PushNotificationPreferences } from "./push-notification-preferences";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  REMINDER_CONFIG,
  reminderPreferences,
  validReminderTime,
  type ReminderKind,
} from "@/lib/reminders";
import { Input } from "./ui";

export function ReminderPreferences() {
  const { state, set } = useStore();
  const [error, setError] = useState("");
  const preferences = reminderPreferences(state);
  const report = (saved: boolean) =>
    setError(
      saved ? "" : "Could not save reminder preferences. Your previous choices are retained.",
    );
  return (
    <section aria-label="Reminder preferences" className="space-y-2 pt-2">
      <h3 className="text-sm font-semibold">Reminder preferences</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        In-app reminders appear on Home while FitCore is open. Push notifications are not enabled.
      </p>
      <p className="text-xs text-muted-foreground">
        Due items appear when you open Home or return to the app. Completed items disappear
        automatically. Times use this device's local 24-hour clock.
      </p>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        Enable in-app reminders
        <input
          type="checkbox"
          aria-label="Enable in-app reminders"
          checked={preferences.inAppEnabled === true}
          onChange={(event) => {
            const enabled = event.target.checked;
            report(
              set((current) => ({
                ...current,
                personalization: {
                  ...current.personalization,
                  reminders: { ...reminderPreferences(current), inAppEnabled: enabled },
                },
              })),
            );
          }}
          className="h-5 w-5 accent-[var(--section)]"
        />
      </label>
      {(Object.keys(REMINDER_CONFIG) as ReminderKind[]).map((kind) => {
        const config = REMINDER_CONFIG[kind];
        return (
          <div
            key={kind}
            className="space-y-2 rounded-2xl border border-border bg-[var(--surface-2)] p-3"
          >
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
              {config.label} · {preferences[config.field]}
              <input
                type="checkbox"
                checked={state.reminders[kind]}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  report(
                    set((current) => ({
                      ...current,
                      reminders: { ...current.reminders, [kind]: enabled },
                    })),
                  );
                }}
                aria-label={`Toggle ${kind} reminder`}
                className="h-5 w-5 accent-[var(--section)]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              {config.label} time
              <Input
                type="time"
                aria-label={`${config.label} reminder time`}
                value={preferences[config.field]}
                className="min-h-11 w-32"
                onChange={(event) => {
                  const time = event.target.value;
                  if (!validReminderTime(time)) {
                    setError("Choose a valid reminder time.");
                    return;
                  }
                  report(
                    set((current) => ({
                      ...current,
                      personalization: {
                        ...current.personalization,
                        reminders: { ...reminderPreferences(current), [config.field]: time },
                      },
                    })),
                  );
                }}
              />
            </label>
          </div>
        );
      })}
      <PushNotificationPreferences />
      {error && (
        <p role="status" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
