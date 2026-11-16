import { createJarvisProvenance, markProvenanceEdited } from "../fitcore-data";
import { uid } from "../store";
import type { SleepEntry } from "../types";
import { pushAudit } from "./action-audit";
import type { ToolHandler } from "./tools";

export const recordActions = {
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
