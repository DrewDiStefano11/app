import assert from "node:assert/strict";
import { createFitCoreRuntimePersistenceController } from "../../src/lib/runtime-persistence";
import { defaultState, type AppState } from "../../src/lib/types";

const EPOCH = 1_700_000_000_000;
const DAY_MS = 86_400_000;

function dataset(workoutCount: number): AppState {
  const state = structuredClone(defaultState);
  state.onboardingComplete = true;
  state.workouts = Array.from({ length: workoutCount }, (_, workoutIndex) => {
    const startedAt = EPOCH + workoutIndex * DAY_MS;
    return {
      id: `workout-${workoutIndex}`,
      name: "Synthetic session",
      startedAt,
      endedAt: startedAt + 4_500_000,
      exercises: ["bench-press", "squat", "db-row"].map((exerciseId, exerciseIndex) => ({
        id: `exercise-${workoutIndex}-${exerciseIndex}`,
        exerciseId,
        completed: true,
        sets: Array.from({ length: 5 }, (_, setIndex) => ({
          id: `set-${workoutIndex}-${exerciseIndex}-${setIndex}`,
          weight: 135 + setIndex,
          reps: 6,
          completed: true,
        })),
      })),
    };
  });
  state.activeWorkout = {
    id: "ongoing",
    name: "Current session",
    startedAt: 1_900_000_000_000,
    exercises: [{
      id: "current-exercise",
      exerciseId: "squat",
      completed: false,
      sets: [{ id: "current-set", weight: 135, reps: 6, completed: true }],
    }],
  };
  return state;
}

for (const workoutCount of [50, 250, 1_000]) {
  const storage = new Map<string, string>();
  let token = 0;
  const adapter = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
  };
  const dependencies = {
    adapter,
    createExportedAt: () => new Date(1_795_000_000_000 + token).toISOString(),
    createWriteToken: () => String(++token).padStart(32, "0"),
    readLegacyState: () => null,
  };
  const controller = createFitCoreRuntimePersistenceController(dependencies);
  assert.equal(controller.hydrate().status, "empty");
  const state = dataset(workoutCount);

  const start = performance.now();
  assert.equal(controller.commit(state).status, "ready");
  const initialMs = performance.now() - start;
  const samples = [];
  for (let edit = 0; edit < 5; edit += 1) {
    state.activeWorkout!.exercises[0].sets[0].weight = 140 + edit;
    const editStart = performance.now();
    const result = controller.commit(state);
    samples.push(performance.now() - editStart);
    assert.equal(result.status, "ready");
  }

  const reopened = createFitCoreRuntimePersistenceController({
    ...dependencies,
    adapter: { ...adapter },
  }).hydrate();
  assert.equal(reopened.status, "ready");
  const restored = reopened.state as unknown as AppState;
  assert.equal(restored.workouts.length, workoutCount);
  assert.equal(restored.activeWorkout?.exercises[0].sets[0].weight, 144);

  samples.sort((left, right) => left - right);
  console.log(JSON.stringify({
    workoutCount,
    initialMs: Math.round(initialMs),
    editMedianMs: Math.round(samples[2]),
    editSamplesMs: samples.map(Math.round),
  }));
}
