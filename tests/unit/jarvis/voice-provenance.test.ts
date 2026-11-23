import { interpretJarvisInput } from "../../../src/lib/jarvis/mixed-commands";
import { expect, test } from "bun:test";
import { defaultState } from "../../../src/lib/types";
import { runTool, undoAuditEntry } from "../../../src/lib/jarvis/tools";
import { createFitCoreBackupEnvelope } from "../../../src/lib/data-backup";

test("confirmed voice entries keep channel attribution inside the existing audit and undo path", () => {
  let state = structuredClone(defaultState);
  const set = (update: (current: typeof state) => typeof state) => {
    state = update(state);
    return true;
  };
  const ctx = {
    state,
    set,
    settings: state.jarvisSettings,
    confirmed: true,
    inputMethod: "voice" as const,
  };
  const result = runTool("logSupplement", { name: "Creatine", draftId: "voice-review" }, ctx);
  expect(result.ok).toBe(true);
  expect(state.supplementLogs).toHaveLength(1);
  expect(state.jarvisAudit[0].patch).toMatchObject({ inputMethod: "voice" });
  expect(state.jarvisAudit[0].summary).toMatch(/^Voice:/);
  const beforeRetry = state;
  const replay = runTool("logSupplement", { name: "Creatine", draftId: "voice-review" }, { ...ctx, state });
  expect(replay.data).toMatchObject({ duplicate: true });
  expect(state).toBe(beforeRetry);
  expect(
    createFitCoreBackupEnvelope(JSON.parse(JSON.stringify(state)), {
      exportedAt: new Date().toISOString(),
    }).safeToExport,
  ).toBe(true);
  expect(undoAuditEntry(result.auditId!, state, set).ok).toBe(true);
  expect(state.supplementLogs).toEqual([]);
});

test("a spoken weight-and-rep correction targets the previous set instead of creating another", () => {
  let state = structuredClone(defaultState);
  state.activeWorkout = {
    id: "w",
    name: "Bench",
    startedAt: Date.now() - 60_000,
    exercises: [
      {
        id: "row",
        exerciseId: "bench-press",
        completed: false,
        sets: [{ id: "set", completed: false }],
      },
    ],
  };
  const set = (update: (current: typeof state) => typeof state) => {
    state = update(state);
    return true;
  };
  runTool(
    "logExerciseSet",
    { exerciseEntryId: "row", weight: 185, reps: 8, draftId: "first-voice-set" },
    { state, set, settings: state.jarvisSettings, confirmed: true, inputMethod: "voice" },
  );
  const command = interpretJarvisInput(
    "Actually, that was two hundred thirty-five pounds for six reps.",
    state,
  );
  expect(command).toMatchObject({
    tool: "updateExerciseSet",
    args: { setId: "set", patch: { weight: 235, reps: 6 } },
  });
  if (!command || !("tool" in command)) throw new Error("Expected a correction");
  expect(
    runTool(
      command.tool,
      { ...command.args, draftId: "correct-voice-set" },
      { state, set, settings: state.jarvisSettings, confirmed: true, inputMethod: "voice" },
    ).ok,
  ).toBe(true);
  expect(state.activeWorkout!.exercises[0].sets).toHaveLength(1);
  expect(state.activeWorkout!.exercises[0].sets[0]).toMatchObject({
    id: "set",
    weight: 235,
    reps: 6,
  });
});

test("ambiguous corrected units retain the intended set and refuse a changed target", () => {
  let state = structuredClone(defaultState);
  state.profile.units = "kg";
  state.activeWorkout = {
    id: "w",
    name: "Bench",
    startedAt: Date.now() - 60_000,
    exercises: [
      {
        id: "row",
        exerciseId: "bench-press",
        completed: false,
        sets: [{ id: "set", completed: false }],
      },
    ],
  };
  const set = (update: (current: typeof state) => typeof state) => {
    state = update(state);
    return true;
  };
  runTool(
    "logExerciseSet",
    { exerciseEntryId: "row", weight: 185, reps: 8, draftId: "initial" },
    { state, set, settings: state.jarvisSettings, confirmed: true },
  );
  const question = interpretJarvisInput("Actually that was 235 for 6", state);
  if (!question || !("reply" in question)) throw new Error("Expected unit clarification");
  expect(question.reply).toMatch(/kilograms or pounds/);
  expect(interpretJarvisInput("pounds", state, new Date(), question.nextContext)).toMatchObject({
    tool: "updateExerciseSet",
    args: { setId: "set", patch: { weight: 235, reps: 6 } },
  });
  state.activeWorkout!.exercises[0].sets[0].weight = 200;
  expect(interpretJarvisInput("pounds", state, new Date(), question.nextContext)).toMatchObject({
    reply:
      "That set changed while you were clarifying. Review its current values before correcting it.",
  });
});
