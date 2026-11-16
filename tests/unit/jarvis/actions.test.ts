import { expect, test } from "bun:test";
import { runTool, undoAuditEntry } from "../../../src/lib/jarvis/tools";
import { commitFitCoreStoreRuntime, hydrateFitCoreStoreRuntime } from "../../../src/lib/store";
import { createFitCoreRuntimePersistenceController } from "../../../src/lib/runtime-persistence";
import { defaultState, type AppState } from "../../../src/lib/types";

function storageFixture() {
  const bytes = new Map<string, string>();
  let denyWrites = false;
  let commits = 0;
  let writeToken = 0;
  const adapter = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem(key: string, value: string) {
      if (denyWrites) throw new Error("Synthetic interrupted write");
      bytes.set(key, value);
    },
  };
  const newController = () =>
    createFitCoreRuntimePersistenceController({
      adapter,
      readLegacyState: () => null,
      createExportedAt: () => "2026-11-16T12:00:00.000Z",
      createWriteToken: () => (++writeToken).toString(16).padStart(32, "0"),
    });
  const controller = newController();
  let state = hydrateFitCoreStoreRuntime(controller, structuredClone(defaultState)).state;
  const set = (update: (previous: AppState) => AppState) => {
    ++commits;
    const outcome = commitFitCoreStoreRuntime(controller, state, update(state));
    state = outcome.state;
    return outcome.applied;
  };
  return {
    snapshot: () => state,
    get commits() {
      return commits;
    },
    blockWrites: () => {
      denyWrites = true;
    },
    reload: () => hydrateFitCoreStoreRuntime(newController(), defaultState).state,
    set,
  };
}

test("a confirmed action commits the record and its audit together", () => {
  const fitcore = storageFixture();
  const state = fitcore.snapshot();
  const result = runTool(
    "logBodyWeight",
    { weightLb: 182.6 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.ok).toBe(true);
  expect(fitcore.commits).toBe(1);
  const saved = fitcore.reload();
  expect(saved.bodyweightEntries).toHaveLength(1);
  expect(saved.bodyweightEntries[0].weightLb).toBe(182.6);
  expect(saved.jarvisAudit[0].entityIds).toEqual([saved.bodyweightEntries[0].id]);
});

test("a rejected storage write cannot produce a success or a receipt", () => {
  const fitcore = storageFixture();
  fitcore.blockWrites();
  const state = fitcore.snapshot();
  const result = runTool(
    "logBodyWeight",
    { weightLb: 182.6 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.ok).toBe(false);
  expect(result.auditId).toBeUndefined();
  expect(fitcore.reload().bodyweightEntries).toEqual([]);
});

test("a model action cannot use confirmation to bypass read-only permissions", () => {
  const fitcore = storageFixture();
  const state = fitcore.snapshot();
  const result = runTool(
    "logSupplement",
    { name: "Creatine" },
    {
      state,
      set: fitcore.set,
      settings: { ...state.jarvisSettings, permission: 1 },
      confirmed: true,
    },
  );
  expect(result.ok).toBe(false);
  expect(fitcore.commits).toBe(0);
});

test("a draft does not write before confirmation", () => {
  const fitcore = storageFixture();
  const state = fitcore.snapshot();
  const result = runTool(
    "logBodyWeight",
    { weightLb: 182.6 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
    },
  );
  expect(result.needsConfirmation).toBe(true);
  expect(fitcore.commits).toBe(0);
});

test("undo commits the reversal and audit in one transaction", () => {
  const fitcore = storageFixture();
  const state = fitcore.snapshot();
  const result = runTool(
    "logBodyWeight",
    { weightLb: 182.6 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.auditId).toBeDefined();
  const beforeUndo = fitcore.commits;
  const reversed = undoAuditEntry(result.auditId!, fitcore.snapshot(), fitcore.set);
  expect(reversed.ok).toBe(true);
  expect(fitcore.commits - beforeUndo).toBe(1);
  expect(fitcore.reload().bodyweightEntries).toEqual([]);
  expect(fitcore.reload().jarvisAudit.find((entry) => entry.id === result.auditId)?.undone).toBe(
    true,
  );
});

test("undo preserves a meal until its later correction has been undone", () => {
  const fitcore = storageFixture();
  const state = fitcore.snapshot();
  const logged = runTool(
    "logMeal",
    { name: "Breakfast", mealType: "breakfast", calories: 310, protein: 24, carbs: 36, fat: 8 },
    { state, set: fitcore.set, settings: state.jarvisSettings, confirmed: true },
  );
  expect(logged.ok).toBe(true);
  const meal = fitcore.snapshot().mealEntries[0];
  const corrected = runTool(
    "updateMeal",
    { id: meal.id, patch: { name: "Breakfast and coffee" } },
    {
      state: fitcore.snapshot(),
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(corrected.ok).toBe(true);

  const beforeUndo = fitcore.commits;
  expect(undoAuditEntry(logged.auditId!, fitcore.snapshot(), fitcore.set).ok).toBe(false);
  expect(fitcore.commits).toBe(beforeUndo);
  expect(fitcore.reload().mealEntries[0].name).toBe("Breakfast and coffee");
  expect(undoAuditEntry(corrected.auditId!, fitcore.snapshot(), fitcore.set).ok).toBe(true);
  expect(undoAuditEntry(logged.auditId!, fitcore.snapshot(), fitcore.set).ok).toBe(true);
  expect(fitcore.reload().mealEntries).toEqual([]);
});

test("a completed bench set fills the next planned row without creating an extra row", () => {
  const fitcore = storageFixture();
  fitcore.set((state) => ({
    ...state,
    activeWorkout: {
      id: "upper-a",
      name: "Upper A",
      startedAt: Date.now() - 10_000,
      exercises: [
        {
          id: "bench-row",
          exerciseId: "bench-press",
          completed: false,
          sets: [
            { id: "set-1", completed: false },
            { id: "set-2", completed: false },
          ],
        },
      ],
    },
  }));
  const state = fitcore.snapshot();
  const result = runTool(
    "logExerciseSet",
    { exerciseName: "bench", weight: 195, reps: 4, draftId: "bench-draft" },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.ok).toBe(true);
  const saved = fitcore.reload();
  const sets = saved.activeWorkout?.exercises[0].sets;
  expect(sets).toHaveLength(2);
  expect(sets?.[0]).toMatchObject({ id: "set-1", completed: true, weight: 195, reps: 4 });
  expect(sets?.[1]).toMatchObject({ id: "set-2", completed: false });
  expect(sets?.[1].weight).toBeUndefined();
  expect(sets?.[1].reps).toBeUndefined();
  expect(saved.workouts).toEqual([]);
  const undone = undoAuditEntry(result.auditId!, fitcore.snapshot(), fitcore.set);
  expect(undone.ok).toBe(true);
  const restored = fitcore.reload().activeWorkout?.exercises[0].sets;
  expect(
    restored?.map(({ id, completed, weight, reps }) => ({ id, completed, weight, reps })),
  ).toEqual([
    { id: "set-1", completed: false, weight: undefined, reps: undefined },
    { id: "set-2", completed: false, weight: undefined, reps: undefined },
  ]);
});

test("an unknown movement cannot create an exercise row in an active workout", () => {
  const fitcore = storageFixture();
  fitcore.set((state) => ({
    ...state,
    activeWorkout: {
      id: "upper-a",
      name: "Upper A",
      startedAt: Date.now() - 10_000,
      exercises: [{ id: "bench-row", exerciseId: "bench-press", completed: false, sets: [] }],
    },
  }));
  const state = fitcore.snapshot();
  const result = runTool(
    "logExerciseSet",
    { exerciseName: "Invented exercise", weight: 195, reps: 4 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.ok).toBe(false);
  expect(fitcore.reload().activeWorkout).toEqual(state.activeWorkout);
});

test("an exercise patch cannot replace the stable set identifier", () => {
  const fitcore = storageFixture();
  fitcore.set((state) => ({
    ...state,
    activeWorkout: {
      id: "upper-a",
      name: "Upper A",
      startedAt: Date.now() - 10_000,
      exercises: [
        {
          id: "bench-row",
          exerciseId: "bench-press",
          completed: false,
          sets: [{ id: "set-1", completed: true, weight: 195, reps: 4 }],
        },
      ],
    },
  }));
  const state = fitcore.snapshot();
  const result = runTool(
    "updateExerciseSet",
    { setId: "set-1", patch: { id: "foreign", weight: 200 } },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.ok).toBe(false);
  expect(fitcore.reload().activeWorkout).toEqual(state.activeWorkout);
});

test("an unqualified set in a single-exercise workout resolves locally", async () => {
  const { interpretJarvisText } = await import("../../../src/lib/jarvis/text-commands");
  const state = structuredClone(defaultState);
  state.activeWorkout = {
    id: "upper-a",
    name: "Upper A",
    startedAt: Date.now(),
    exercises: [{ id: "bench-row", exerciseId: "bench-press", completed: false, sets: [] }],
  };
  expect(interpretJarvisText("195 for 4", state)).toMatchObject({
    tool: "logExerciseSet",
    args: { weight: 195, reps: 4 },
  });
  expect(interpretJarvisText("My bench prescription is 4×4 at 195", state)).toEqual({
    reply: "Tell me the weight and reps you actually completed when you are ready to log a set.",
  });
});

test("meal totals are derived from the reviewed item values and estimates keep provenance", () => {
  const fitcore = storageFixture();
  const state = fitcore.snapshot();
  const result = runTool(
    "logMeal",
    {
      name: "Chicken and rice",
      mealType: "dinner",
      calories: 950,
      protein: 75,
      carbs: 90,
      fat: 25,
      items: [
        { name: "Chicken", qty: "1 portion", calories: 200, protein: 34, carbs: 0, fat: 7 },
        { name: "Rice", qty: "1 cup", calories: 210, protein: 4, carbs: 45, fat: 1 },
      ],
      confidence: "medium",
    },
    { state, set: fitcore.set, settings: state.jarvisSettings, confirmed: true },
  );
  expect(result.ok).toBe(true);
  expect(fitcore.reload().mealEntries[0]).toMatchObject({
    calories: 410,
    protein: 38,
    carbs: 45,
    fat: 8,
    provenance: { source: "ai-estimated", confidence: "medium", confirmation: "confirmed" },
  });
});

test("a scheduled start never replaces an existing workout or logs planned sets as completed", () => {
  const fitcore = storageFixture();
  const monday = new Date(2026, 10, 16, 12);
  const state = fitcore.snapshot();
  const started = runTool(
    "startScheduledWorkout",
    { weekday: monday.getDay() },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
      now: monday,
    },
  );
  expect(started.ok).toBe(true);
  const active = fitcore.reload().activeWorkout;
  expect(active?.exercises.length).toBeGreaterThan(0);
  expect(active?.exercises.flatMap((row) => row.sets).every((set) => !set.completed)).toBe(true);
  const current = fitcore.snapshot();
  const blocked = runTool(
    "startScheduledWorkout",
    { weekday: 2 },
    {
      state: current,
      set: fitcore.set,
      settings: current.jarvisSettings,
      confirmed: true,
      now: monday,
    },
  );
  expect(blocked.ok).toBe(false);
  expect(fitcore.reload().activeWorkout).toEqual(active);
  expect(fitcore.reload().workouts).toEqual([]);
});

test("undo refuses to overwrite a completed set modified in the normal workout view", () => {
  const fitcore = storageFixture();
  fitcore.set((state) => ({
    ...state,
    activeWorkout: {
      id: "upper-a",
      name: "Upper A",
      startedAt: Date.now() - 1_000,
      exercises: [
        {
          id: "bench-row",
          exerciseId: "bench-press",
          completed: false,
          sets: [{ id: "set-1", completed: false }],
        },
      ],
    },
  }));
  const state = fitcore.snapshot();
  const result = runTool(
    "logExerciseSet",
    { exerciseName: "bench", weight: 195, reps: 4 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.ok).toBe(true);
  fitcore.set((current) => ({
    ...current,
    activeWorkout: {
      ...current.activeWorkout!,
      exercises: current.activeWorkout!.exercises.map((row) => ({
        ...row,
        sets: row.sets.map((set) => ({ ...set, weight: 205 })),
      })),
    },
  }));
  expect(undoAuditEntry(result.auditId!, fitcore.snapshot(), fitcore.set).ok).toBe(false);
  expect(fitcore.reload().activeWorkout?.exercises[0].sets[0].weight).toBe(205);
});

test("replaying an approved undo does not reverse a second action", () => {
  const fitcore = storageFixture();
  for (const weightLb of [180, 181]) {
    const state = fitcore.snapshot();
    expect(
      runTool(
        "logBodyWeight",
        { weightLb },
        {
          state,
          set: fitcore.set,
          settings: state.jarvisSettings,
          confirmed: true,
        },
      ).ok,
    ).toBe(true);
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const state = fitcore.snapshot();
    runTool(
      "undoLastAction",
      { draftId: "approved-undo" },
      {
        state,
        set: fitcore.set,
        settings: state.jarvisSettings,
        confirmed: true,
      },
    );
  }
  expect(fitcore.reload().bodyweightEntries.map((entry) => entry.weightLb)).toEqual([180]);
});

test("a confirmed draft fills reps and preserves a weight entered manually", () => {
  const fitcore = storageFixture();
  fitcore.set((state) => ({
    ...state,
    activeWorkout: {
      id: "upper-a",
      name: "Upper A",
      startedAt: Date.now() - 1_000,
      exercises: [
        {
          id: "bench-row",
          exerciseId: "bench-press",
          completed: false,
          sets: [{ id: "set-1", completed: false, weight: 195 }],
        },
      ],
    },
  }));
  const state = fitcore.snapshot();
  const result = runTool(
    "logExerciseSet",
    { exerciseName: "bench", reps: 4 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
    },
  );
  expect(result.ok).toBe(true);
  expect(fitcore.reload().activeWorkout?.exercises[0].sets[0]).toMatchObject({
    id: "set-1",
    completed: true,
    weight: 195,
    reps: 4,
  });
});

test("logging a timed set preserves a manually running rest timer", () => {
  const fitcore = storageFixture();
  const restEndsAt = Date.now() + 60_000;
  fitcore.set((state) => ({
    ...state,
    activeWorkout: {
      id: "timed",
      name: "Conditioning",
      startedAt: Date.now() - 1_000,
      restEndsAt,
      exercises: [
        {
          id: "stairs",
          exerciseId: "stairs",
          completed: false,
          sets: [{ id: "set-1", completed: false }],
        },
      ],
    },
  }));
  const state = fitcore.snapshot();
  expect(
    runTool(
      "logExerciseSet",
      { exerciseId: "stairs", durationMin: 20 },
      {
        state,
        set: fitcore.set,
        settings: state.jarvisSettings,
        confirmed: true,
      },
    ).ok,
  ).toBe(true);
  expect(fitcore.reload().activeWorkout?.restEndsAt).toBe(restEndsAt);
});

test("a confirmed working set starts the same planned rest timer as the workout view", () => {
  const fitcore = storageFixture();
  const start = Date.now();
  fitcore.set((state) => ({
    ...state,
    activeWorkout: {
      id: "upper-a",
      name: "Upper A",
      startedAt: start - 1_000,
      exercises: [
        {
          id: "bench-row",
          exerciseId: "bench-press",
          completed: false,
          target: { reps: "4", sets: 1, rest: 120 },
          sets: [{ id: "set-1", completed: false }],
        },
      ],
    },
  }));
  const state = fitcore.snapshot();
  const result = runTool(
    "logExerciseSet",
    { exerciseName: "bench", weight: 195, reps: 4 },
    {
      state,
      set: fitcore.set,
      settings: state.jarvisSettings,
      confirmed: true,
      now: new Date(start),
    },
  );
  expect(result.ok).toBe(true);
  expect(fitcore.reload().activeWorkout?.restEndsAt).toBe(start + 120_000);
  expect(undoAuditEntry(result.auditId!, fitcore.snapshot(), fitcore.set).ok).toBe(true);
  expect(fitcore.reload().activeWorkout?.restEndsAt).toBeUndefined();
});

test("mixed AI meal drafts use library values where a food and serving match", () => {
  const fitcore = storageFixture();
  const state = fitcore.snapshot();
  const draft = runTool(
    "logMeal",
    {
      name: "Fruit and shake",
      mealType: "snack",
      calories: 400,
      protein: 30,
      carbs: 25,
      fat: 2,
      items: [
        { name: "Banana", qty: "1 medium", calories: 300, protein: 0, carbs: 25, fat: 0 },
        { name: "Protein shake", qty: "1 glass", calories: 100, protein: 30, carbs: 0, fat: 2 },
      ],
    },
    { state, set: fitcore.set, settings: state.jarvisSettings },
  );
  expect(draft.needsConfirmation).toBe(true);
  expect(draft.data).toMatchObject({
    calories: 205,
    protein: 31,
    carbs: 27,
    fat: 2,
    assumptions: ["Used FitCore food library values for Banana."],
  });
  expect(fitcore.commits).toBe(0);
});
