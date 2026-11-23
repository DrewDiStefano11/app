import { expect, test } from "bun:test";
import {
  interpretJarvisInput,
  reviewJarvisBatch,
  commitJarvisBatch,
} from "../../../src/lib/jarvis/mixed-commands";
import { defaultState, type AppState } from "../../../src/lib/types";
import { createFitCoreRuntimePersistenceController } from "../../../src/lib/runtime-persistence";
import { commitFitCoreStoreRuntime, hydrateFitCoreStoreRuntime } from "../../../src/lib/store";
import { migrateFitCoreDataIfNeeded } from "../../../src/lib/fitcore-data";

function fixture() {
  const bytes = new Map<string, string>();
  let deny = false,
    commits = 0,
    token = 0;
  const controller = () =>
    createFitCoreRuntimePersistenceController({
      adapter: {
        getItem: (key) => bytes.get(key) ?? null,
        setItem(key, value) {
          if (deny) throw new Error("Synthetic failure");
          bytes.set(key, value);
        },
      },
      readLegacyState: () => null,
      createExportedAt: () => new Date().toISOString(),
      createWriteToken: () => (++token).toString(16).padStart(32, "0"),
    });
  const runtime = controller();
  let state = hydrateFitCoreStoreRuntime(runtime, structuredClone(defaultState)).state;
  return {
    snapshot: () => state,
    reject: () => {
      deny = true;
    },
    commits: () => commits,
    reload: () => hydrateFitCoreStoreRuntime(controller(), defaultState).state,
    set(update: (previous: AppState) => AppState) {
      commits++;
      const next = commitFitCoreStoreRuntime(
        runtime,
        state,
        migrateFitCoreDataIfNeeded(update(state)),
      );
      state = next.state;
      return next.applied;
    },
  };
}
const utterance = "I did 20 minutes treadmill, had 500 calories for lunch, and took creatine.";

function prepare(f: ReturnType<typeof fixture>) {
  const command = interpretJarvisInput(utterance, f.snapshot());
  if (!command || !("actions" in command)) throw new Error("Expected a mixed draft");
  const review = reviewJarvisBatch(command.actions, f.snapshot(), "voice");
  if (!("entries" in review)) throw new Error(review.summary);
  return review;
}

test("mixed cardio, meal and supplement stay in review, then persist once through the authoritative store", () => {
  const f = fixture();
  const review = prepare(f);
  expect(review.entries).toHaveLength(3);
  expect(review.entries.some((entry) => /^Logged\b/.test(entry.summary))).toBe(false);
  expect(f.commits()).toBe(0);
  const result = commitJarvisBatch(review, [0, 1, 2], f.snapshot(), f.set);
  expect(result.ok).toBe(true);
  expect(f.commits()).toBe(1);
  const saved = f.reload();
  expect(saved.cardioEntries).toHaveLength(1);
  expect(saved.mealEntries).toHaveLength(1);
  expect(saved.supplementLogs).toHaveLength(1);
  expect(saved.mealEntries[0]).toMatchObject({ calories: 500, macroStatus: "unreported" });
  expect(
    saved.jarvisAudit
      .filter((entry) => entry.status === "logged")
      .every((entry) => entry.patch?.inputMethod === "voice"),
  ).toBe(true);
  expect(commitJarvisBatch(review, [0, 1, 2], f.snapshot(), f.set).ok).toBe(false);
  expect(f.reload().mealEntries).toHaveLength(1);
});

test("a rejected batch save commits none of its records or audits", () => {
  const f = fixture();
  const review = prepare(f);
  f.reject();
  expect(commitJarvisBatch(review, [0, 1, 2], f.snapshot(), f.set).ok).toBe(false);
  const restored = f.reload();
  expect(restored.cardioEntries).toEqual([]);
  expect(restored.mealEntries).toEqual([]);
  expect(restored.supplementLogs).toEqual([]);
  expect(restored.jarvisAudit).toEqual([]);
});

test("selection excludes unwanted entries and invalid selections never create partial records", () => {
  const f = fixture();
  const review = prepare(f);
  expect(commitJarvisBatch(review, [0, 7], f.snapshot(), f.set).ok).toBe(false);
  expect(f.commits()).toBe(0);
  expect(commitJarvisBatch(review, [2], f.snapshot(), f.set).ok).toBe(true);
  expect(f.reload().supplementLogs).toHaveLength(1);
  expect(f.reload().mealEntries).toEqual([]);
  expect(f.reload().cardioEntries).toEqual([]);
});

test("an ambiguous clause keeps known events for a follow-up and never logs a subset", () => {
  const state = structuredClone(defaultState);
  const first = interpretJarvisInput(
    "Log 20 minutes treadmill; I slept 7 hours; I took creatine",
    state,
  );
  if (!first || !("reply" in first)) throw new Error("Expected clarification");
  expect(first.reply).toMatch(/Nothing has been saved/);
  const misunderstood = interpretJarvisInput("maybe later", state, new Date(), first.nextContext);
  const clarified = interpretJarvisInput(
    "quality 6",
    state,
    new Date(),
    misunderstood?.nextContext,
  );
  expect(
    clarified && "actions" in clarified ? clarified.actions.map((action) => action.tool) : [],
  ).toEqual(["logCardio", "logSleep", "logSupplement"]);
  const cancelled = interpretJarvisInput("cancel", state, new Date(), first.nextContext);
  expect(cancelled).toMatchObject({ reply: "Mixed entry cancelled. Nothing was saved." });
});

test("meal ingredients and thousand separators are not split into separate logging commands", () => {
  const state = structuredClone(defaultState);
  const single = interpretJarvisInput("I had 1,200 calories for dinner", state);
  expect(single).toMatchObject({ tool: "logCaloriesOnly", args: { calories: 1200 } });
  const unknown = interpretJarvisInput("I ate chicken and rice; I took creatine", state);
  expect(unknown && "reply" in unknown ? unknown.reply : "").toMatch(/Nothing has been saved/);
});

test("repeated identical batch clauses require clarification instead of double logging", () => {
  const state = structuredClone(defaultState);
  const command = interpretJarvisInput("Log creatine; log creatine", state);
  if (!command || !("actions" in command)) throw new Error("Expected actions");
  expect(reviewJarvisBatch(command.actions, state, "text")).toMatchObject({ ok: false });
});

test("spoken numeric values use the same interpreter while preserving the original words", () => {
  const command = interpretJarvisInput(
    "I had five hundred calories for lunch",
    structuredClone(defaultState),
  );
  expect(command).toMatchObject({
    tool: "logCaloriesOnly",
    args: { calories: 500, originalText: "I had five hundred calories for lunch" },
  });
  const mixed = interpretJarvisInput(
    "I did twenty minutes treadmill, had five hundred calories for lunch, and took five grams of creatine",
    structuredClone(defaultState),
  );
  expect(mixed && "actions" in mixed ? mixed.actions.map((action) => action.tool) : []).toEqual([
    "logCardio",
    "logCaloriesOnly",
    "logSupplement",
  ]);
});

test("two reviewed bench sets fill distinct planned rows in one transaction", () => {
  const f = fixture();
  f.set((state) => ({
    ...state,
    activeWorkout: {
      id: "bench",
      name: "Bench",
      startedAt: Date.now() - 60_000,
      exercises: [
        {
          id: "row",
          exerciseId: "bench-press",
          completed: false,
          sets: [
            { id: "first", completed: false },
            { id: "second", completed: false },
          ],
        },
      ],
    },
  }));
  const command = interpretJarvisInput(
    "I benched 185 pounds for 8; I benched 195 pounds for 6",
    f.snapshot(),
  );
  if (!command || !("actions" in command)) throw new Error("Expected two sets");
  const review = reviewJarvisBatch(command.actions, f.snapshot(), "voice");
  if (!("entries" in review)) throw new Error(review.summary);
  const before = f.commits();
  expect(commitJarvisBatch(review, [0, 1], f.snapshot(), f.set).ok).toBe(true);
  expect(f.commits() - before).toBe(1);
  expect(f.reload().activeWorkout?.exercises[0].sets).toMatchObject([
    { id: "first", completed: true, weight: 185, reps: 8 },
    { id: "second", completed: true, weight: 195, reps: 6 },
  ]);
});
