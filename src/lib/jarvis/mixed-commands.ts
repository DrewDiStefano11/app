import { normalizeSpokenNumbers } from "./normalization/spoken-numbers";
import type { AppState } from "../types";
import { uid } from "../store";
import {
  interpretJarvisText,
  type JarvisTextContext,
  type LocalJarvisCommand,
} from "./text-commands";
import { runTool, type ToolResult, type ToolName } from "./tools";
import { commitJarvisAction, type CommitJarvisState } from "./action-transaction";

export type JarvisInputAction = Extract<LocalJarvisCommand, { tool: string }>;
export type JarvisInput =
  LocalJarvisCommand | { actions: JarvisInputAction[]; nextContext?: Partial<JarvisTextContext> };
export type JarvisBatchReview = {
  base: AppState;
  reviewedAt: number;
  inputMethod: "text" | "voice";
  entries: { tool: ToolName; args: Record<string, unknown>; summary: string }[];
};
const allowed = new Set([
  "logCardio",
  "logCaloriesOnly",
  "logReferenceMeal",
  "logMeal",
  "logUsualMeal",
  "logSupplement",
  "logBodyWeight",
  "logSleep",
  "logDailyCheckIn",
  "logExerciseSet",
]);
const failure = (summary: string): ToolResult => ({ ok: false, summary });

function interpretClause(raw: string, state: AppState, now: Date, context: JarvisTextContext) {
  const result = interpretJarvisText(
    normalizeSpokenNumbers(raw).normalizedText,
    state,
    now,
    context,
  );
  if (result && "tool" in result && Object.hasOwn(result.args, "originalText")) {
    return { ...result, args: { ...result.args, originalText: raw } };
  }
  return result;
}

/** Both typed and transcribed input enter this same bounded interpretation path. */
export function interpretJarvisInput(
  raw: string,
  state: AppState,
  now = new Date(),
  context: JarvisTextContext = {},
): JarvisInput | undefined {
  const prior = context.mixedDraft;
  if (prior && /^(?:cancel|forget it|never mind|nevermind)(?: that)?[.!]?$/i.test(raw.trim())) {
    return {
      reply: "Mixed entry cancelled. Nothing was saved.",
      nextContext: { mixedDraft: undefined },
    };
  }
  const clauses =
    prior?.clauses ??
    raw
      .split(
        /;\s*|(?:,\s*(?:and\s+)?|\s+and\s+)(?=(?:i\s+)?(?:log|took|had|ate|did|walked|ran|benched|slept)\b)/i,
      )
      .map((part) => part.trim())
      .filter(Boolean);
  if (!prior && clauses.length < 2) return interpretClause(raw, state, now, context);
  if (raw.length > 4096 || clauses.length > 6 || clauses.some((part) => part.length > 1024)) {
    return {
      reply: "Use up to six short logging commands at a time. Nothing has been saved.",
      nextContext: { mixedDraft: undefined },
    };
  }
  const resolved = prior ? [...prior.resolved] : clauses.map(() => null);
  const baseContext = { focusedExercise: context.focusedExercise, lastMealId: context.lastMealId };
  for (let index = 0; index < clauses.length; index++) {
    if (resolved[index]) continue;
    const original = prior && index === prior.index ? raw : clauses[index];
    const clause = /^(?:took|had|ate|did|walked|ran|benched|slept)\b/i.test(original.trim())
      ? `I ${original.trim()}`
      : original;
    const parsed = interpretClause(clause, state, now, {
      ...baseContext,
      ...(prior && index === prior.index ? prior.pendingContext : {}),
    });
    if (parsed && "tool" in parsed && allowed.has(parsed.tool)) {
      resolved[index] = parsed;
      continue;
    }
    const pendingContext = {
      ...(prior?.pendingContext ?? {}),
      ...(parsed && "reply" in parsed ? parsed.nextContext : {}),
    };
    return {
      reply: `Part ${index + 1} needs clarification: ${parsed && "reply" in parsed ? parsed.reply : "Say a complete logging command for that part."} Nothing has been saved.`,
      nextContext: { mixedDraft: { clauses, resolved, index, pendingContext } },
    };
  }
  return {
    actions: resolved.filter((item): item is JarvisInputAction => item !== null),
    nextContext: { mixedDraft: undefined },
  };
}

export function reviewJarvisBatch(
  actions: JarvisInputAction[],
  state: AppState,
  inputMethod: "text" | "voice",
  now = new Date(),
): JarvisBatchReview | ToolResult {
  if (!actions.length || actions.length > 6) return failure("Review between one and six entries.");
  const entries: JarvisBatchReview["entries"] = [];
  const fingerprints = new Set<string>();
  for (const action of actions) {
    if (!allowed.has(action.tool))
      return failure("Review that action separately. Nothing has been saved.");
    const fingerprint = `${action.tool}:${JSON.stringify(
      Object.entries(action.args)
        .filter(([key]) => !["draftId", "originalText"].includes(key))
        .sort(([left], [right]) => left.localeCompare(right)),
    )}`;
    if (fingerprints.has(fingerprint))
      return failure(
        "Two entries look identical. Clarify them before saving; nothing has been saved.",
      );
    fingerprints.add(fingerprint);
    const result = runTool(action.tool, action.args, {
      state,
      set: () => false,
      settings: state.jarvisSettings,
      now,
    });
    if (!result.ok || !result.needsConfirmation)
      return failure(`${result.summary} Nothing from this group has been saved.`);
    const args =
      action.tool === "logUsualMeal" ? action.args : (result.data as Record<string, unknown>);
    entries.push({
      tool: action.tool,
      args: { ...args, draftId: uid() },
      summary: result.summary.replace(/^Logged\b/, "Log"),
    });
  }
  return { base: state, reviewedAt: now.getTime(), inputMethod, entries };
}

/** Stage existing tool transactions, then persist the selected group once or not at all. */
export function commitJarvisBatch(
  review: JarvisBatchReview,
  selected: number[],
  current: AppState,
  set: CommitJarvisState,
): ToolResult {
  if (
    review.base !== current ||
    new Date(review.reviewedAt).toDateString() !== new Date().toDateString()
  ) {
    return failure("FitCore changed since this review. Ask again to review the current data.");
  }
  if (
    !selected.length ||
    selected.length > review.entries.length ||
    new Set(selected).size !== selected.length ||
    selected.some(
      (index) => !Number.isInteger(index) || index < 0 || index >= review.entries.length,
    )
  ) {
    return failure("Choose the entries to save. Nothing has been saved.");
  }
  return commitJarvisAction(current, set, (stage) => {
    let proposed = current;
    const results: ToolResult[] = [];
    for (const index of [...selected].sort((a, b) => a - b)) {
      const entry = review.entries[index];
      if (!allowed.has(entry.tool))
        return failure("This group contains an unsupported action. Nothing has been saved.");
      const result = runTool(entry.tool, entry.args, {
        state: proposed,
        settings: current.jarvisSettings,
        confirmed: true,
        inputMethod: review.inputMethod,
        set: (update) => {
          proposed = update(proposed);
          return true;
        },
      });
      if (
        !result.ok ||
        result.needsConfirmation ||
        (result.data as { duplicate?: boolean } | undefined)?.duplicate
      )
        return failure(`${result.summary} Nothing from this group has been saved.`);
      results.push(result);
    }
    stage(() => proposed);
    return {
      ok: true,
      summary: `Saved ${results.length} reviewed ${results.length === 1 ? "entry" : "entries"}.`,
      data: { results },
    };
  });
}
