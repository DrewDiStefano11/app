import { createJarvisProvenance, markProvenanceEdited } from "../fitcore-data";
import { uid } from "../store";
import type { CardioEntry, Confidence, SleepEntry } from "../types";
import { actionKey, normalizeText, pushAudit } from "./action-audit";
import type { ToolHandler } from "./tools";

export const recordActions = {
  logCardio: (args, { state, set, confirmed, now = new Date() }) => {
    const type = String(args.type);
    const measurements = {
      minutes: (args.minutes as number | undefined) ?? 0,
      distanceMi: args.distanceMi as number | undefined,
      calories: args.calories as number | undefined,
      heartRate: args.heartRate as number | undefined,
      speed: args.speed as number | undefined,
      incline: args.incline as number | undefined,
      notes: args.notes as string | undefined,
    };
    const day = now.toDateString();
    const duplicate = state.cardioEntries.find(
      (entry) =>
        new Date(entry.createdAt).toDateString() === day &&
        normalizeText(entry.type) === normalizeText(type) &&
        (Object.keys(measurements) as (keyof typeof measurements)[]).every(
          (field) => entry[field] === measurements[field],
        ),
    );
    if (duplicate) {
      return {
        ok: true,
        summary: "That's already logged.",
        data: { duplicate: true, existing: [duplicate.id] },
      };
    }
    const { minutes, distanceMi, calories, heartRate, speed, incline, notes } = measurements;
    const details = [
      minutes ? `${minutes} min` : undefined,
      distanceMi === undefined ? undefined : `${distanceMi} mi`,
      calories === undefined ? undefined : `${calories} kcal`,
      heartRate === undefined ? undefined : `${heartRate} bpm`,
      speed === undefined ? undefined : `speed ${speed}`,
      incline === undefined ? undefined : `incline ${incline}`,
      notes,
    ].filter(Boolean);
    const summary = `${confirmed ? "Logged" : "Log"} ${type}: ${details.join(", ")}.`;
    if (!confirmed) return { ok: true, summary };

    const id = uid(),
      auditId = uid(),
      createdAt = now.getTime();
    const confidence = (args.confidence as Confidence | undefined) ?? "medium";
    const originalText = args.originalText as string | undefined;
    const entry: CardioEntry = {
      ...measurements,
      id,
      type,
      createdAt,
      provenance: createJarvisProvenance({ confidence, confirmed, auditId, originalText }),
    };
    set((current) => ({ ...current, cardioEntries: [...current.cardioEntries, entry] }));
    pushAudit(set, {
      id: auditId,
      tool: "logCardio",
      summary,
      status: "logged",
      originalText,
      confidence,
      entityIds: [id],
      entityKind: "cardio",
      patch: { entry, actionKey: actionKey("logCardio", args) },
      createdAt,
    });
    return { ok: true, summary, auditId, data: { ...entry, confidence } };
  },
  logSleep: (args, { state, set, confirmed, now = new Date() }) => {
    const hours = Number(args.hours);
    const quality = Number(args.quality);
    const summary = `${confirmed ? "Logged" : "Log"} ${hours} hours of sleep, quality ${quality}/10.`;
    const same = state.sleepEntries.find(
      (item) =>
        new Date(item.createdAt).toDateString() === now.toDateString() &&
        item.hours === hours &&
        item.quality === quality,
    );
    if (same)
      return {
        ok: true,
        summary: "This sleep check-in is already recorded.",
        data: { duplicate: true },
      };
    const id = uid(),
      auditId = uid();
    const entry: SleepEntry = {
      id,
      hours,
      quality,
      createdAt: now.getTime(),
      provenance: createJarvisProvenance({ confidence: "high", confirmed, auditId }),
    };
    set((current) => ({ ...current, sleepEntries: [...current.sleepEntries, entry] }));
    pushAudit(set, {
      id: auditId,
      tool: "logSleep",
      summary,
      status: "logged",
      entityIds: [id],
      entityKind: "sleep",
      patch: { hours, quality, createdAt: entry.createdAt },
      createdAt: now.getTime(),
    });
    return { ok: true, summary, auditId };
  },
  updateBodyWeight: (args, { state, set, confirmed, now = new Date() }) => {
    const previous = state.bodyweightEntries.find((entry) => entry.id === args.id);
    if (!previous) return { ok: false, summary: "Choose an existing weigh-in to correct." };
    const weightLb = Number(args.weightLb);
    if (previous.weightLb === weightLb) {
      return {
        ok: true,
        summary: "That weigh-in already has the requested weight.",
        data: { duplicate: true },
      };
    }
    const auditId = uid();
    const time = new Date(previous.createdAt).toLocaleDateString();
    const summary = `${confirmed ? "Corrected" : "Correct"} the weigh-in from ${time}: ${previous.weightLb} lb to ${weightLb} lb.`;
    const provenance = markProvenanceEdited(previous.provenance, {
      editedBy: "user",
      editedAt: now.getTime(),
      auditId,
    });
    set((current) => ({
      ...current,
      bodyweightEntries: current.bodyweightEntries.map((entry) =>
        entry.id === previous.id ? { ...entry, weightLb, provenance } : entry,
      ),
    }));
    pushAudit(set, {
      id: auditId,
      tool: "updateBodyWeight",
      summary,
      status: "logged",
      entityIds: [previous.id],
      entityKind: "bodyweightEdit",
      patch: {
        weightLb,
        previousWeight: previous.weightLb,
        previousProvenance: previous.provenance,
      },
      createdAt: now.getTime(),
    });
    return { ok: true, summary, auditId };
  },
} satisfies Record<string, ToolHandler>;
