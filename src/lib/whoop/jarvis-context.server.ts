import { getWhoopDashboard, type WhoopSnapshot } from "./dashboard";

export const whoopJarvisLookbackMs = 48 * 60 * 60 * 1000;

export async function resolveWhoopJarvisContext(
  approved: boolean | undefined,
  load: () => Promise<WhoopSnapshot | null>,
  referenceTime?: number,
) {
  if (approved !== true) return null;
  const snapshot = await load();
  const now = referenceTime ?? Date.now();
  if (!snapshot || !(Date.parse(snapshot.accessExpiresAt) > now)) return null;

  const recent = (date: string) => {
    const age = now - Date.parse(date);
    return age >= 0 && age <= whoopJarvisLookbackMs;
  };
  if (!recent(snapshot.lastSyncedAt)) return null;

  const { recovery, sleep, cycle } = getWhoopDashboard(snapshot.records);
  const observations: string[] = [];
  const add = (
    row: { at: string; state: string } | null,
    values: [label: string, value: number | null | undefined, units: string][],
  ) => {
    if (!row || row.state !== "scored" || !recent(row.at)) return;
    const measured = values.flatMap(([label, value, units]) =>
      value == null ? [] : [`${label} ${value}${units}`],
    );
    if (measured.length) {
      observations.push(
        `${new Date(row.at).toISOString().slice(0, 10)} UTC · ${measured.join(", ")}`,
      );
    }
  };

  add(recovery, [
    ["WHOOP Recovery", recovery?.score, "%"],
    ["HRV", recovery?.hrvMs, " ms"],
    ["Resting heart rate", recovery?.restingHeartRate, " bpm"],
  ]);
  add(sleep, [
    ["Sleep performance", sleep?.performance, "%"],
    ["Time asleep", sleep?.asleepMs == null ? null : Math.round(sleep.asleepMs / 60_000), " min"],
  ]);
  add(cycle, [["Daily Strain", cycle?.strain, ""]]);
  if (!observations.length) return null;

  return {
    text: [
      "WHOOP observations shared for this message:",
      ...observations,
      "Keep WHOOP Recovery separate from FitCore Readiness. Cite dates and call out missing observations.",
      "Use logged strength training to discuss progression. Treat wearable observations as context, not medical advice or a directive to change a workout. This request is read-only.",
    ].join("\n"),
    expiresAt: snapshot.accessExpiresAt,
  };
}
