import { expect, test } from "bun:test";
import {
  progressPhotoFitsStorage,
  PROGRESS_PHOTO_MAX_CHARACTERS,
} from "../../src/lib/progress-photo";
import { defaultState } from "../../src/lib/types";
import { createFitCoreRuntimePersistenceController } from "../../src/lib/runtime-persistence";

test("twenty bounded photos leave transactional headroom for a workout and meal", () => {
  const values = new Map<string, string>();
  let token = 0;
  const controller = createFitCoreRuntimePersistenceController({
    adapter: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        const next = new Map(values);
        next.set(key, value);
        const bytes = [...next].reduce((sum, [k, v]) => sum + (k.length + v.length) * 2, 0);
        if (bytes > 5_000_000) throw new Error("Synthetic quota exceeded");
        values.set(key, value);
      },
    },
    readLegacyState: () => null,
    createExportedAt: () => "2026-11-23T12:00:00.000Z",
    createWriteToken: () => (++token).toString(16).padStart(32, "0"),
  });
  controller.hydrate();
  const state = structuredClone(defaultState);
  for (let i = 0; i < 20; i++) {
    state.progressPhotos.push({
      id: `photo-${i}`,
      view: "front",
      phase: "maintenance",
      createdAt: Date.now(),
      dataUrl: "data:image/jpeg;base64," + "A".repeat(PROGRESS_PHOTO_MAX_CHARACTERS - 23),
    });
    expect(progressPhotoFitsStorage(state)).toBe(true);
    expect(controller.commit(state).safeToApply).toBe(true);
  }
  state.workouts.push({
    id: "workout",
    name: "Synthetic bench",
    startedAt: Date.now() - 60000,
    endedAt: Date.now(),
    exercises: [
      {
        id: "bench",
        exerciseId: "bench-press",
        completed: true,
        sets: [{ id: "set", completed: true, weight: 185, reps: 8 }],
      },
    ],
  });
  state.mealEntries.push({
    id: "meal",
    name: "Lunch",
    type: "lunch",
    createdAt: Date.now(),
    calories: 500,
    macroStatus: "unreported",
  });
  expect(controller.commit(state).safeToApply).toBe(true);
  expect(controller.getCurrentSnapshot()?.state.progressPhotos).toHaveLength(20);
  expect(controller.getCurrentSnapshot()?.state.workouts).toHaveLength(1);
});

test("photo preflight accounts for legacy images, history, and unrelated device storage", () => {
  const state = structuredClone(defaultState);
  expect(progressPhotoFitsStorage(state, 4_000_000)).toBe(false);
  state.progressPhotos.push({
    id: "legacy",
    view: "front",
    phase: "maintenance",
    createdAt: Date.now(),
    dataUrl: "data:image/jpeg;base64," + "A".repeat(1_000_000),
  });
  expect(progressPhotoFitsStorage(state)).toBe(false);
});
