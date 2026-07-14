import { expect, test } from "@playwright/test";
import { FITCORE_REVISION_STORAGE_KEY } from "../../src/lib/revisioned-persistence";
import { readPersistedFitCoreState } from "./helpers/fitcore-test-state";

test.describe("FitCore provenance foundation", () => {
  test("hydrates historical records with safe defaults without dropping legacy data", async ({
    page,
  }) => {
    const now = Date.now();
    await page.addInitScript((createdAt) => {
      localStorage.setItem(
        "fitcore.v1",
        JSON.stringify({
          version: 3,
          onboardingComplete: true,
          profile: { name: "Provenance Test" },
          workouts: [
            {
              id: "manual-workout",
              name: "Historical workout",
              startedAt: createdAt - 60_000,
              endedAt: createdAt,
              legacyMarker: "keep-workout",
              exercises: [
                {
                  id: "manual-exercise",
                  exerciseId: "bench-press",
                  completed: true,
                  sets: [
                    {
                      id: "manual-set",
                      weight: 185,
                      reps: 5,
                      completed: true,
                      legacyMarker: "keep-set",
                    },
                  ],
                },
              ],
            },
          ],
          mealEntries: [
            {
              id: "manual-meal",
              name: "Manual meal",
              type: "lunch",
              calories: 500,
              protein: 40,
              carbs: 50,
              fat: 15,
              createdAt,
            },
            {
              id: "ai-meal",
              name: "Estimated meal",
              type: "dinner",
              calories: 700,
              protein: 35,
              carbs: 80,
              fat: 25,
              source: "jarvis",
              confidence: "low",
              confirmed: false,
              auditId: "audit-meal",
              originalText: "a plate of pasta",
              createdAt,
            },
            {
              id: "imported-meal",
              name: "Imported meal",
              type: "snack",
              calories: 200,
              protein: 10,
              carbs: 25,
              fat: 5,
              source: "imported",
              createdAt,
            },
          ],
          bodyweightEntries: [
            { id: "manual-weight", weightLb: 181.5, legacyMarker: "keep-weight", createdAt },
          ],
          sleepEntries: [{ id: "manual-sleep", hours: 7.5, quality: 8, createdAt }],
          recoveryCheckIns: [
            { id: "manual-check", energy: 8, soreness: 3, stress: 4, motivation: 9, createdAt },
          ],
          recoverySignals: [
            {
              id: "signal",
              sourceLogId: "manual-check",
              kind: "soreness",
              severity: 3,
              notes: "sore shoulder",
              source: "manual",
              createdAt,
            },
          ],
          cardioEntries: [{ id: "manual-cardio", type: "walk", minutes: 30, createdAt }],
          supplementLogs: [{ id: "manual-supplement", name: "Creatine", createdAt }],
          jarvisAudit: [
            {
              id: "audit-meal",
              tool: "logMeal",
              summary: "Logged estimated meal",
              status: "logged",
              confidence: "low",
              originalText: "a plate of pasta",
              entityIds: ["ai-meal"],
              createdAt,
            },
          ],
        }),
      );
    }, now);

    await page.goto("/");
    await expect
      .poll(() =>
        page.evaluate((key) => window.localStorage.getItem(key), FITCORE_REVISION_STORAGE_KEY),
      )
      .not.toBeNull();

    const state = await readPersistedFitCoreState(page);
    const result = (() => {
      const byId = (rows: Array<{ id: string }>, id: string) => rows.find((row) => row.id === id);
      return {
        version: state.version,
        manualWorkout: state.workouts[0].provenance,
        manualExercise: state.workouts[0].exercises[0].provenance,
        manualSet: state.workouts[0].exercises[0].sets[0].provenance,
        manualMeal: byId(state.mealEntries, "manual-meal")?.provenance,
        aiMeal: byId(state.mealEntries, "ai-meal")?.provenance,
        importedMeal: byId(state.mealEntries, "imported-meal")?.provenance,
        manualWeight: byId(state.bodyweightEntries, "manual-weight")?.provenance,
        sleep: state.sleepEntries[0].provenance,
        checkIn: state.recoveryCheckIns[0].provenance,
        signal: state.recoverySignals[0].provenance,
        cardio: state.cardioEntries[0].provenance,
        supplement: state.supplementLogs[0].provenance,
        legacyMarkers: [
          state.workouts[0].legacyMarker,
          state.workouts[0].exercises[0].sets[0].legacyMarker,
          state.bodyweightEntries[0].legacyMarker,
        ],
      };
    })();

    const manual = { source: "manual", confidence: "high", confirmation: "confirmed" };
    expect(result).toMatchObject({
      version: 4,
      manualWorkout: manual,
      manualExercise: manual,
      manualSet: manual,
      manualMeal: manual,
      manualWeight: manual,
      sleep: manual,
      checkIn: manual,
      cardio: manual,
      supplement: manual,
      aiMeal: {
        source: "jarvis",
        confidence: "low",
        confirmation: "unconfirmed",
        auditId: "audit-meal",
        originalText: "a plate of pasta",
      },
      importedMeal: {
        source: "imported",
        confidence: "unknown",
        confirmation: "not-required",
      },
      signal: {
        source: "system-derived",
        confidence: "medium",
        confirmation: "not-required",
      },
      legacyMarkers: ["keep-workout", "keep-set", "keep-weight"],
    });
  });

  test("manual and Jarvis helpers encode confidence and confirmation consistently", async ({
    page,
  }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const importModule = (path: string) => import(path);
      const data = await importModule("/src/lib/fitcore-data.ts");
      const tools = await importModule("/src/lib/jarvis/tools.ts");
      const types = await importModule("/src/lib/types.ts");
      let state = data.migrateFitCoreDataIfNeeded(structuredClone(types.defaultState));
      const set = (update: (current: typeof state) => typeof state) => {
        state = data.migrateFitCoreDataIfNeeded(update(state));
      };
      const ctx = (confirmed = false) => ({
        state,
        set,
        settings: state.jarvisSettings,
        confirmed,
      });

      const manual = data.createManualProvenance();
      const jarvis = data.createJarvisProvenance({ confidence: "high" });
      const estimate = data.createAiEstimateProvenance({ confidence: "low" });
      const pendingEstimate = tools.runTool(
        "logMeal",
        {
          name: "Photo meal",
          mealType: "dinner",
          calories: 650,
          protein: 35,
          carbs: 75,
          fat: 22,
          confidence: "low",
          source: "camera",
          originalText: "photo of dinner",
        },
        ctx(),
      );
      const confirmedEstimate = tools.runTool(
        "logMeal",
        {
          name: "Photo meal",
          mealType: "dinner",
          calories: 650,
          protein: 35,
          carbs: 75,
          fat: 22,
          confidence: "low",
          source: "camera",
          originalText: "photo of dinner",
          draftId: "photo-meal",
        },
        ctx(true),
      );
      const unconfirmedWeight = tools.runTool(
        "logBodyWeight",
        {
          weightLb: 182.2,
          originalText: "I weigh 182.2",
        },
        ctx(),
      );
      const confirmedWorkout = tools.runTool(
        "logWorkout",
        {
          name: "AI workout",
          exercises: [{ exerciseId: "bench-press", sets: [{ weight: 185, reps: 5 }] }],
          confidence: "high",
          draftId: "workout-draft",
        },
        ctx(true),
      );

      const meal = state.mealEntries[0];
      const weight = state.bodyweightEntries[0];
      const workout = state.workouts[0];
      return {
        manual,
        jarvis,
        estimate,
        pendingNeedsConfirmation: pendingEstimate.needsConfirmation,
        pendingDidNotSave: state.mealEntries.length === 1,
        confirmedEstimate: confirmedEstimate.ok,
        meal: meal.provenance,
        mealIsLowConfidence: data.isLowConfidence(meal),
        mealRequiresConfirmation: data.shouldRequireConfirmation(meal),
        unconfirmedWeight: unconfirmedWeight.ok,
        weight: weight.provenance,
        weightRequiresConfirmation: data.shouldRequireConfirmation(weight),
        confirmedWorkout: confirmedWorkout.ok,
        workout: workout.provenance,
        exercise: workout.exercises[0].provenance,
        set: workout.exercises[0].sets[0].provenance,
      };
    });

    expect(result).toMatchObject({
      manual: { source: "manual", confidence: "high", confirmation: "confirmed" },
      jarvis: { source: "jarvis", confidence: "high", confirmation: "unconfirmed" },
      estimate: { source: "ai-estimated", confidence: "low", confirmation: "unconfirmed" },
      pendingNeedsConfirmation: true,
      pendingDidNotSave: true,
      confirmedEstimate: true,
      meal: { source: "ai-estimated", confidence: "low", confirmation: "confirmed" },
      mealIsLowConfidence: true,
      mealRequiresConfirmation: false,
      unconfirmedWeight: true,
      weight: { source: "jarvis", confidence: "high", confirmation: "unconfirmed" },
      weightRequiresConfirmation: true,
      confirmedWorkout: true,
      workout: { source: "jarvis", confidence: "high", confirmation: "confirmed" },
      exercise: { source: "jarvis", confidence: "high", confirmation: "confirmed" },
      set: { source: "jarvis", confidence: "high", confirmation: "confirmed" },
    });
  });

  test("user corrections preserve origin and add durable edit provenance", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const importModule = (path: string) => import(path);
      const data = await importModule("/src/lib/fitcore-data.ts");
      const tools = await importModule("/src/lib/jarvis/tools.ts");
      const types = await importModule("/src/lib/types.ts");
      const imported = {
        source: "imported",
        confidence: "unknown",
        confirmation: "not-required",
      };
      let state = data.migrateFitCoreDataIfNeeded({
        ...structuredClone(types.defaultState),
        activeWorkout: {
          id: "imported-active",
          name: "Imported active workout",
          startedAt: Date.now(),
          completed: false,
          provenance: imported,
          exercises: [
            {
              id: "imported-exercise",
              exerciseId: "bench-press",
              completed: false,
              provenance: imported,
              sets: [
                {
                  id: "imported-set",
                  weight: 180,
                  reps: 5,
                  completed: true,
                  provenance: imported,
                },
              ],
            },
          ],
        },
      });
      const set = (update: (current: typeof state) => typeof state) => {
        state = data.migrateFitCoreDataIfNeeded(update(state));
      };
      const ctx = (confirmed = false) => ({
        state,
        set,
        settings: state.jarvisSettings,
        confirmed,
      });

      tools.runTool(
        "logMeal",
        {
          name: "Estimated bowl",
          mealType: "dinner",
          calories: 700,
          protein: 35,
          carbs: 90,
          fat: 20,
          confidence: "low",
          source: "camera",
          originalText: "photo of a bowl",
          draftId: "estimated-bowl",
        },
        ctx(true),
      );
      const mealId = state.mealEntries[0].id;
      const mealEdit = tools.runTool(
        "updateMeal",
        {
          id: mealId,
          patch: {
            calories: 610,
            provenance: { source: "manual", confidence: "high", confirmation: "confirmed" },
          },
        },
        ctx(true),
      );

      tools.runTool(
        "logDailyCheckIn",
        {
          energy: 7,
          soreness: 4,
          stress: 5,
          motivation: 8,
          originalText: "feeling okay",
        },
        ctx(),
      );
      const checkInEdit = tools.runTool(
        "updateDailyCheckIn",
        {
          patch: { energy: 8 },
        },
        ctx(true),
      );

      tools.runTool(
        "logWorkout",
        {
          name: "AI workout",
          exercises: [{ exerciseId: "bench-press", sets: [{ weight: 185, reps: 5 }] }],
          confidence: "high",
          draftId: "saved-workout",
        },
        ctx(true),
      );
      const savedWorkoutId = state.workouts[0].id;
      const workoutEdit = tools.runTool(
        "updateWorkout",
        {
          id: savedWorkoutId,
          patch: { name: "Corrected workout" },
        },
        ctx(true),
      );
      const activeEdit = tools.runTool(
        "updateActiveWorkout",
        {
          patch: { name: "Corrected imported workout" },
        },
        ctx(true),
      );
      const setEdit = tools.runTool(
        "updateExerciseSet",
        {
          setId: "imported-set",
          patch: { weight: 190 },
        },
        ctx(true),
      );

      const restored = data.migrateFitCoreDataIfNeeded(structuredClone(state));
      return {
        meal: restored.mealEntries[0],
        mealEditAuditId: mealEdit.auditId,
        checkIn: restored.recoveryCheckIns[0],
        checkInEditAuditId: checkInEdit.auditId,
        workout: restored.workouts[0],
        workoutEditAuditId: workoutEdit.auditId,
        activeWorkout: restored.activeWorkout,
        activeEditAuditId: activeEdit.auditId,
        activeSet: restored.activeWorkout?.exercises[0].sets[0],
        setEditAuditId: setEdit.auditId,
      };
    });

    expect(result.meal).toMatchObject({
      calories: 610,
      source: "edited",
      confirmed: true,
      provenance: {
        source: "ai-estimated",
        confidence: "low",
        confirmation: "confirmed",
        originalText: "photo of a bowl",
        editedBy: "user",
        editAuditId: result.mealEditAuditId,
      },
    });
    expect(result.checkIn).toMatchObject({
      energy: 8,
      provenance: {
        source: "jarvis",
        confidence: "high",
        confirmation: "confirmed",
        editedBy: "user",
        editAuditId: result.checkInEditAuditId,
      },
    });
    expect(result.workout).toMatchObject({
      name: "Corrected workout",
      provenance: {
        source: "jarvis",
        confidence: "high",
        confirmation: "confirmed",
        editedBy: "user",
        editAuditId: result.workoutEditAuditId,
      },
    });
    expect(result.activeWorkout).toMatchObject({
      name: "Corrected imported workout",
      provenance: {
        source: "imported",
        confidence: "unknown",
        confirmation: "confirmed",
        editedBy: "user",
        editAuditId: result.activeEditAuditId,
      },
    });
    expect(result.activeSet).toMatchObject({
      weight: 190,
      provenance: {
        source: "imported",
        confidence: "unknown",
        confirmation: "confirmed",
        editedBy: "user",
        editAuditId: result.setEditAuditId,
      },
    });
    for (const entry of [
      result.meal,
      result.checkIn,
      result.workout,
      result.activeWorkout,
      result.activeSet,
    ]) {
      expect(entry?.provenance.editedAt).toEqual(expect.any(Number));
    }
  });
});
