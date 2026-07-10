import { expect, test } from "@playwright/test";

test.describe("FitCore data integrity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("hydrates partial older state without losing data or looping versions", async ({ page }) => {
    const now = Date.now();
    await page.evaluate((createdAt) => {
      localStorage.setItem(
        "fitcore.v1",
        JSON.stringify({
          version: 1,
          onboardingComplete: true,
          profile: { name: "Migration Test", bodyweightLb: 180 },
          personalization: { units: { weight: "kg" } },
          workouts: [
            {
              id: "workout-old",
              name: "Saved Push",
              startedAt: createdAt - 60_000,
              endedAt: createdAt,
              exercises: [],
            },
          ],
          bodyweightEntries: [{ id: "weight-old", weightLb: 177.5, createdAt }],
          mealEntries: [],
          recoveryCheckIns: [],
          goals: "corrupted-field-that-should-be-repaired",
        }),
      );
    }, now);

    await page.reload();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("fitcore.v1") || "{}");
          return {
            version: saved.version,
            name: saved.profile?.name,
            profileWeight: saved.profile?.bodyweightLb,
            storedWeight: saved.bodyweightEntries?.[0]?.weightLb,
            workoutId: saved.workouts?.[0]?.id,
            goalsRepaired: Array.isArray(saved.goals) && saved.goals.length > 0,
            hasCurrentFields:
              Array.isArray(saved.supplementLogs) &&
              Array.isArray(saved.jarvisAudit) &&
              Array.isArray(saved.recoverySignals) &&
              Array.isArray(saved.dismissedSuggestions),
            nestedDefaultPreserved: saved.personalization?.units?.distance === "mi",
          };
        }),
      )
      .toEqual({
        version: 4,
        name: "Migration Test",
        profileWeight: 177.5,
        storedWeight: 177.5,
        workoutId: "workout-old",
        goalsRepaired: true,
        hasCurrentFields: true,
        nestedDefaultPreserved: true,
      });

    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("fitcore.v1") || "{}").version),
      )
      .toBe(4);
  });

  test("rejects broken imports and safely repairs incomplete saved collections", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const importModule = (path: string) => import(path);
      const data = await importModule("/src/lib/fitcore-data.ts");
      const types = await importModule("/src/lib/types.ts");
      const base = structuredClone(types.defaultState);
      const repaired = data.migrateFitCoreDataIfNeeded({
        ...base,
        onboardingComplete: true,
        workouts: [
          null,
          {
            id: "valid-workout",
            name: "Valid",
            startedAt: Date.now(),
            exercises: [null, { id: "valid-exercise", exerciseId: "bench-press", sets: [null] }],
          },
        ],
        mealEntries: [null],
        recoveryCheckIns: [null],
      });
      return {
        empty: data.parseFitCoreImport("{}"),
        wrongArray: data.parseFitCoreImport(JSON.stringify({ workouts: "broken" })),
        partial: data.parseFitCoreImport(JSON.stringify({ workouts: [] })),
        workouts: repaired.workouts.length,
        exercises: repaired.workouts[0]?.exercises.length,
        sets: repaired.workouts[0]?.exercises[0]?.sets.length,
        meals: repaired.mealEntries.length,
        checkIns: repaired.recoveryCheckIns.length,
      };
    });

    expect(result).toEqual({
      empty: null,
      wrongArray: null,
      partial: { workouts: [] },
      workouts: 1,
      exercises: 1,
      sets: 0,
      meals: 0,
      checkIns: 0,
    });
  });

  const clickBottomNav = async (page: any, targetName: string) => {
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    const targetBtn = nav.getByRole("button", { name: targetName, exact: true });

    if (await targetBtn.isVisible()) {
      try {
        await targetBtn.click({ timeout: 2000 });
        return;
      } catch (e) {
        // Fall through to expansion attempt
      }
    }

    const expandBtn = nav.getByRole("button", { name: /Expand navigation/i });
    if (await expandBtn.isVisible()) {
      try {
        await expandBtn.click({ timeout: 2000 });
      } catch (e) {
        // Expand button might have detached, ignore and retry target
      }
    }
    await targetBtn.click();
  };

  test("manual workout, meal, check-in, and weigh-in survive a full reload", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("fitcore.v1", JSON.stringify({ onboardingComplete: true }));
    });
    await page.reload();

    await clickBottomNav(page, "Train");
    await page.getByRole("button", { name: /Start today's plan/i }).click();
    await page.getByRole("button", { name: /Finish workout/i }).click();
    await page.getByRole("button", { name: /Confirm & save/i }).click();

    await clickBottomNav(page, "Fuel");
    await page
      .getByRole("button", { name: /Log meal/i })
      .first()
      .click();
    await page.getByRole("button", { name: "Custom Entry" }).click();
    await page.getByPlaceholder("e.g. Post-workout protein bowl").fill("Integrity meal");
    await page.getByText("Kcal", { exact: true }).locator("..").locator("input").fill("650");
    await page.getByText("P", { exact: true }).locator("..").locator("input").fill("45");
    await page.getByText("C", { exact: true }).locator("..").locator("input").fill("70");
    await page.getByText("F", { exact: true }).locator("..").locator("input").fill("20");
    await page.getByRole("button", { name: "Add to Daily Log" }).click();

    await clickBottomNav(page, "Recover");
    await page.getByRole("button", { name: "Check-in" }).click();
    await page.getByRole("button", { name: "Save check-in" }).click();

    await clickBottomNav(page, "Stats");

    // In Daily View, weigh in is direct. In Deep Dive, we must go to Body.
    if (await page.getByRole('button', { name: 'Deep Dive' }).isVisible()) {
        await page.getByRole('button', { name: 'Deep Dive' }).click();
        await page.getByRole('tab', { name: 'Body', exact: true }).click();
    }
    await page.getByPlaceholder("Weight in lb").fill("179.4");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = JSON.parse(localStorage.getItem("fitcore.v1") || "{}");
          return {
            workouts: state.workouts?.length,
            meals: state.mealEntries?.length,
            checkIns: state.recoveryCheckIns?.length,
            weights: state.bodyweightEntries?.length,
            profileWeight: state.profile?.bodyweightLb,
          };
        }),
      )
      .toEqual({ workouts: 1, meals: 1, checkIns: 1, weights: 1, profileWeight: 179.4 });

    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = JSON.parse(localStorage.getItem("fitcore.v1") || "{}");
          return [
            state.workouts?.[0]?.name,
            state.mealEntries?.[0]?.name,
            state.recoveryCheckIns?.[0]?.energy,
            state.bodyweightEntries?.[0]?.weightLb,
          ];
        }),
      )
      .toEqual(["Push Day", "Integrity meal", 7, 179.4]);

    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByText("Workout completed")).toBeVisible();
    await expect(page.getByText("Meal logged")).toBeVisible();
    await expect(page.getByText("Check-in completed")).toBeVisible();
    await expect(page.getByText("Weigh-in saved")).toBeVisible();
  });

  test("Jarvis logs share projections, require confidence review, dedupe retries, and undo precisely", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const importModule = (path: string) => import(path);
      const tools = await importModule("/src/lib/jarvis/tools.ts");
      const data = await importModule("/src/lib/fitcore-data.ts");
      const types = await importModule("/src/lib/types.ts");
      let state = data.migrateFitCoreDataIfNeeded({
        ...structuredClone(types.defaultState),
        onboardingComplete: true,
        activeWorkout: {
          id: "active",
          name: "Active",
          startedAt: Date.now(),
          exercises: [
            { id: "exercise-a", exerciseId: "bench-press", completed: false, sets: [] },
            {
              id: "exercise-b",
              exerciseId: "bench-press",
              completed: false,
              sets: [{ id: "set-b", weight: 100, reps: 10, completed: true }],
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

      const weightArgs = { weightLb: 181.2, originalText: "I weigh 181.2 pounds" };
      const firstWeight = tools.runTool("logBodyWeight", weightArgs, ctx());
      const duplicateWeight = tools.runTool("logBodyWeight", weightArgs, ctx());
      const lowMeal = tools.runTool(
        "logMeal",
        {
          name: "Maybe pasta",
          mealType: "dinner",
          calories: 700,
          protein: 30,
          carbs: 100,
          fat: 20,
          confidence: "low",
          originalText: "some pasta",
        },
        ctx(),
      );
      const confirmedMeal = tools.runTool(
        "logMeal",
        {
          name: "Maybe pasta",
          mealType: "dinner",
          calories: 700,
          protein: 30,
          carbs: 100,
          fat: 20,
          confidence: "low",
          originalText: "some pasta",
          draftId: "meal-draft",
        },
        ctx(true),
      );

      const deleted = tools.runTool("deleteExerciseSet", { setId: "set-b" }, ctx(true));
      const undoDelete = tools.undoAuditEntry(deleted.auditId, state, set);

      const pain = tools.runTool(
        "logWorkoutPainOrSoreness",
        {
          area: "shoulder",
          notes: "sharp pain",
          severity: 7,
          draftId: "pain-draft",
        },
        ctx(true),
      );
      const checkInsAfterPain = state.recoveryCheckIns.length;
      const undoPain = tools.undoAuditEntry(pain.auditId, state, set);
      const recent = data.getRecentActivity(state, 20);
      const visibleEntityIds = new Set([
        ...state.bodyweightEntries.map((entry: { id: string }) => entry.id),
        ...state.mealEntries.map((entry: { id: string }) => entry.id),
      ]);

      return {
        firstWeight: firstWeight.ok,
        duplicateWeight: (duplicateWeight.data as { duplicate?: boolean })?.duplicate,
        weightEntries: state.bodyweightEntries.length,
        profileWeight: state.profile.bodyweightLb,
        bodyweightGoal: state.goals.find((goal: { type: string }) => goal.type === "bodyweight")
          ?.current,
        lowMealNeedsConfirmation: lowMeal.needsConfirmation,
        meals: state.mealEntries.length,
        confirmedMeal: confirmedMeal.ok,
        restoredFirstExerciseSets: state.activeWorkout?.exercises[0]?.sets.length,
        restoredSecondExerciseSetId: state.activeWorkout?.exercises[1]?.sets[0]?.id,
        undoDelete: undoDelete.ok,
        checkInsAfterPain,
        checkInsAfterUndo: state.recoveryCheckIns.length,
        undoPain: undoPain.ok,
        recentWeightRows: recent.filter((log: { type: string }) => log.type === "weigh_in").length,
        duplicateAiRows: recent.filter(
          (log: { type: string; relatedIds: string[] }) =>
            log.type === "ai_event" && log.relatedIds.some((id) => visibleEntityIds.has(id)),
        ).length,
      };
    });

    expect(result).toEqual({
      firstWeight: true,
      duplicateWeight: true,
      weightEntries: 1,
      profileWeight: 181.2,
      bodyweightGoal: 181.2,
      lowMealNeedsConfirmation: true,
      meals: 1,
      confirmedMeal: true,
      restoredFirstExerciseSets: 0,
      restoredSecondExerciseSetId: "set-b",
      undoDelete: true,
      checkInsAfterPain: 1,
      checkInsAfterUndo: 0,
      undoPain: true,
      recentWeightRows: 1,
      duplicateAiRows: 0,
    });
  });
});
