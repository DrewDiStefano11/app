import { todayStart, uid } from "../store";
import type { AppState, JarvisAuditEntry } from "../types";
import type { ToolResult } from "./tools";

export type Updater = (update: (state: AppState) => AppState) => void;

export function pushAudit(set: Updater, entry: JarvisAuditEntry) {
  set((s) => ({ ...s, jarvisAudit: [entry, ...s.jarvisAudit].slice(0, 200) }));
}

export function hasAuditKey(
  state: AppState,
  tool: string,
  args: Record<string, unknown>,
  recordExists?: (entry: JarvisAuditEntry) => boolean,
) {
  const key = actionKey(tool, args);
  if (!key) return null;
  return (
    state.jarvisAudit.find(
      (a) =>
        !a.undone &&
        a.tool === tool &&
        a.patch?.actionKey === key &&
        Date.now() - a.createdAt < 10 * 60_000 &&
        (recordExists?.(a) ?? true),
    ) ?? null
  );
}

export function actionKey(tool: string, args: Record<string, unknown>) {
  const draftId = String(args.draftId ?? "").trim();
  if (draftId) return `draft:${draftId}`;
  const original = normalizeText(args.originalText);
  if (original) return `text:${original}`;
  if (tool === "logBodyWeight") return `weight:${Number(args.weightLb) || 0}:${todayStart()}`;
  if (tool === "logSupplement") return `supp:${normalizeText(args.name)}:${todayStart()}`;
  if (tool === "logDailyCheckIn")
    return `checkin:${[args.energy, args.soreness, args.stress, args.motivation].map(Number).join(":")}:${normalizeText(args.notes)}:${todayStart()}`;
  if (tool === "logMeal" || tool === "logUsualMeal")
    return `meal:${normalizeText(args.name ?? args.slot)}:${String(args.mealType ?? "")}:${todayStart()}`;
  if (tool === "logCardio")
    return `cardio:${normalizeText(args.type)}:${Number(args.minutes) || 0}:${todayStart()}`;
  if (tool === "logWorkout")
    return `workout:${normalizeText(args.name ?? args.workoutType)}:${todayStart()}`;
  return "";
}

export function duplicateResult(entry: JarvisAuditEntry): ToolResult {
  return {
    ok: true,
    summary: "That's already logged.",
    auditId: entry.id,
    data: { duplicate: true, existing: entry.entityIds ?? [] },
  };
}

export function normalizeText(v: unknown) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}
export function pushRecoveryActivity(set: Updater, summary: string, original?: string) {
  const id = uid();
  pushAudit(set, {
    id,
    tool: "jarvisActivity",
    summary,
    status: "undone",
    originalText: original,
    entityKind: "activity",
    createdAt: Date.now(),
  });
}
