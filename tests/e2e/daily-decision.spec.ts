import { expect, test } from "@playwright/test";

test.describe("FitCore daily decision engine", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("normal and good-recovery days support controlled progression", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const decisionEngine = await import("/src/lib/daily-decision.ts");
      const { defaultState } = await import("/src/lib/types.ts");
      const now = new Date(2026, 6, 6, 15).getTime();
      const manual = { source: "manual", confidence: "high", confirmation: "confirmed" } as const;
      const workout = (id: string, daysAgo: number, weight: number) => ({
        id,
        name: "Push Day",
        startedAt: now - daysAgo * 86_400_000,
        endedAt: now - daysAgo * 86_400_000 + 3_600_000,
        provenance: manual,
        exercises: [
          {
            id: `${id}-bench`,
            exerciseId: "bench-press",
            completed: true,
            provenance: manual,
            sets: [
              { id: `${id}-1`, weight, reps: 8, completed: true, provenance: manual },
              { id: `${id}-2`, weight, reps: 8, completed: true, provenance: manual },
            ],
          },
        ],
      });
      const state = structuredClone(defaultState);
      state.workouts = [workout("prior", 9, 175), workout("recent", 2, 185)];
      state.recoveryCheckIns = [
        {
          id: "check",
          energy: 9,
          soreness: 2,
          stress: 3,
          motivation: 9,
          createdAt: now - 3_600_000,
          provenance: manual,
        },
      ];
      state.sleepEntries = [
        { id: "sleep", hours: 8, quality: 8, createdAt: now - 8 * 3_600_000, provenance: manual },
      ];
      state.mealEntries = [
        {
          id: "meal",
          name: "Lunch",
          type: "lunch",
          calories: 1900,
          protein: 125,
          carbs: 220,
          fat: 55,
          createdAt: now - 3_600_000,
          provenance: manual,
        },
      ];
      state.bodyweightEntries = [0, 1, 2].map((index) => ({
        id: `weight-${index}`,
        weightLb: 180 + index * 0.1,
        createdAt: now - (index + 1) * 86_400_000,
        provenance: manual,
      }));
      const decision = decisionEngine.buildDailyDecision(state, now);
      const repeated = decisionEngine.buildDailyDecision(state, now);
      return { decision, deterministic: JSON.stringify(decision) === JSON.stringify(repeated) };
    });

    expect(["train_normal", "train_hard"]).toContain(result.decision.decisionType);
    expect(["medium", "high"]).toContain(result.decision.confidence);
    expect(result.decision.training.progressionAllowed).toBe(true);
    expect(result.decision.whatChanged.some((signal) => signal.type === "performance")).toBe(true);
    expect(result.deterministic).toBe(true);
  });

  test("high soreness and pain reduce intensity and identify the affected area", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const engine = await import("/src/lib/daily-decision.ts");
      const { defaultState } = await import("/src/lib/types.ts");
      const now = new Date(2026, 6, 6, 15).getTime();
      const manual = { source: "manual", confidence: "high", confirmation: "confirmed" } as const;
      const state = structuredClone(defaultState);
      state.workouts = [
        {
          id: "legs",
          name: "Legs",
          startedAt: now - 86_400_000,
          endedAt: now - 82_800_000,
          provenance: manual,
          exercises: [
            {
              id: "squat-entry",
              exerciseId: "squat",
              completed: true,
              sets: [{ id: "set", weight: 225, reps: 5, completed: true, provenance: manual }],
              provenance: manual,
            },
          ],
        },
      ];
      state.recoveryCheckIns = [
        {
          id: "sore",
          energy: 4,
          soreness: 9,
          stress: 5,
          motivation: 6,
          notes: "legs very sore",
          createdAt: now - 3_600_000,
          provenance: manual,
        },
      ];
      state.recoverySignals = [
        {
          id: "knee-pain",
          sourceLogId: "sore",
          kind: "pain",
          bodyArea: "left knee and leg",
          severity: 7,
          notes: "pain while squatting",
          source: "manual",
          createdAt: now - 3_600_000,
          provenance: manual,
        },
      ];
      state.muscleFatigue = { quads: "very", glutes: "fatigued" };
      const decision = engine.buildDailyDecision(state, now);
      return decision;
    });

    expect(["train_light", "deload", "recover"]).toContain(result.decisionType);
    expect(result.training.muscleGroupsToLimit).toEqual(expect.arrayContaining(["quads"]));
    expect(result.limitingFactors.some((factor) => factor.type === "pain_or_injury_concern")).toBe(
      true,
    );
    expect(result.warnings.join(" ")).toContain("Avoid pushing through pain");
    expect(result.oneAction.toLowerCase()).not.toContain("push through");
  });

  test("under-eating softens hard training and produces one specific nutrition action", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const engine = await import("/src/lib/daily-decision.ts");
      const { defaultState } = await import("/src/lib/types.ts");
      const now = new Date(2026, 6, 6, 18).getTime();
      const manual = { source: "manual", confidence: "high", confirmation: "confirmed" } as const;
      const state = structuredClone(defaultState);
      state.workouts = [
        {
          id: "workout",
          name: "Pull",
          startedAt: now - 2 * 86_400_000,
          endedAt: now - 2 * 86_400_000 + 3_600_000,
          provenance: manual,
          exercises: [
            {
              id: "row",
              exerciseId: "barbell-row",
              completed: true,
              sets: [{ id: "set", weight: 155, reps: 8, completed: true, provenance: manual }],
              provenance: manual,
            },
          ],
        },
      ];
      state.recoveryCheckIns = [
        {
          id: "good",
          energy: 9,
          soreness: 2,
          stress: 2,
          motivation: 9,
          createdAt: now - 3_600_000,
          provenance: manual,
        },
      ];
      state.sleepEntries = [
        { id: "sleep", hours: 8, quality: 9, createdAt: now - 9 * 3_600_000, provenance: manual },
      ];
      state.mealEntries = [
        {
          id: "small-meal",
          name: "Small lunch",
          type: "lunch",
          calories: 700,
          protein: 35,
          carbs: 70,
          fat: 20,
          createdAt: now - 2 * 3_600_000,
          provenance: manual,
        },
      ];
      return engine.buildDailyDecision(state, now);
    });

    expect(result.decisionType).toBe("train_light");
    expect(result.nutrition.underEatingWarning).toBe(true);
    expect(result.limitingFactors.some((factor) => factor.type === "nutrition")).toBe(true);
    expect(result.oneAction).toMatch(/light|protein/i);
    expect(result.nutrition.calorieTargetAdjustment).toBeGreaterThanOrEqual(-500);
    expect(result.nutrition.calorieTargetAdjustment).toBeLessThanOrEqual(500);
  });

  test("unconfirmed AI nutrition is excluded while corrected AI nutrition is usable", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const engine = await import("/src/lib/daily-decision.ts");
      const { defaultState } = await import("/src/lib/types.ts");
      const now = new Date(2026, 6, 6, 18).getTime();
      const state = structuredClone(defaultState);
      state.recoveryCheckIns = [
        {
          id: "check",
          energy: 7,
          soreness: 3,
          stress: 4,
          motivation: 8,
          createdAt: now - 3_600_000,
          provenance: { source: "manual", confidence: "high", confirmation: "confirmed" },
        },
      ];
      const meal = (id: string, confirmation: "unconfirmed" | "confirmed", editedBy?: "user") => ({
        id,
        name: "Photo dinner",
        type: "dinner",
        calories: 1000,
        protein: 70,
        carbs: 110,
        fat: 35,
        createdAt: now - 3_600_000,
        source: "camera" as const,
        confidence: "low" as const,
        confirmed: confirmation === "confirmed",
        provenance: {
          source: "ai-estimated" as const,
          confidence: "low" as const,
          confirmation,
          editedBy,
        },
      });
      state.mealEntries = [meal("pending", "unconfirmed")];
      const pending = engine.buildDailyDecision(state, now);
      state.mealEntries = [meal("corrected", "confirmed", "user")];
      const corrected = engine.buildDailyDecision(state, now);
      return { pending, correctedContext: engine.buildDailyDecisionContext(state, now), corrected };
    });

    expect(result.pending.nutrition.calorieGap).toBe(3100);
    expect(
      result.pending.dataMissing.some((item) => item.suggestedUserAction.includes("Confirm")),
    ).toBe(true);
    expect(result.pending.warnings.join(" ")).toContain("excluded");
    expect(result.pending.confidence).toBe("low");
    expect(result.correctedContext.caloriesToday).toBe(1000);
    expect(result.corrected.dataUsed.some((item) => item.ids.includes("corrected"))).toBe(true);
  });

  test("missing data asks for the highest-value log and missed workouts get a realistic restart", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const engine = await import("/src/lib/daily-decision.ts");
      const { defaultState } = await import("/src/lib/types.ts");
      const now = new Date(2026, 6, 6, 15).getTime();
      const state = structuredClone(defaultState);
      const decision = engine.buildDailyDecision(state, now);
      return { decision, trust: engine.getDataTrustSummary(state, now) };
    });

    expect(result.decision.decisionType).toBe("insufficient_data");
    expect(result.decision.confidence).toBe("insufficient");
    expect(result.decision.oneAction).toBe("Log today's recovery check-in.");
    expect(result.decision.training.recommendation.toLowerCase()).toMatch(/insufficient|restart/);
    expect(result.decision.explanation.toLowerCase()).not.toMatch(/punish|make up|failure|lazy/);
    expect(result.trust.missingKeySignals).toEqual(
      expect.arrayContaining(["recent recovery check-in", "recent training"]),
    );
  });

  test("bodyweight mismatch is cautious and never makes an extreme calorie adjustment", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const engine = await import("/src/lib/daily-decision.ts");
      const { defaultState } = await import("/src/lib/types.ts");
      const now = new Date(2026, 6, 6, 15).getTime();
      const manual = { source: "manual", confidence: "high", confirmation: "confirmed" } as const;
      const state = structuredClone(defaultState);
      state.userGoalsProfile.goal = "bulk";
      state.bodyweightEntries = [181, 180.8, 180.5, 180.2, 180].map((weightLb, index) => ({
        id: `weight-${index}`,
        weightLb,
        createdAt: now - (20 - index * 4) * 86_400_000,
        provenance: manual,
      }));
      state.recoveryCheckIns = [
        {
          id: "check",
          energy: 7,
          soreness: 3,
          stress: 4,
          motivation: 7,
          createdAt: now - 3_600_000,
          provenance: manual,
        },
      ];
      state.mealEntries = [
        {
          id: "meal",
          name: "Lunch",
          type: "lunch",
          calories: 1500,
          protein: 100,
          carbs: 160,
          fat: 45,
          createdAt: now - 3_600_000,
          provenance: manual,
        },
      ];
      return engine.buildDailyDecision(state, now);
    });

    const mismatch = result.whatChanged.find((signal) => signal.type === "bodyweight");
    expect(mismatch?.label).toContain("not matching");
    expect(mismatch?.explanation).toMatch(/review|before/i);
    expect(result.nutrition.calorieTargetAdjustment).toBe(0);
  });

  test("active workouts are respected and Jarvis returns the structured decision contract", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const tools = await import("/src/lib/jarvis/tools.ts");
      const { defaultState } = await import("/src/lib/types.ts");
      const state = structuredClone(defaultState);
      state.activeWorkout = {
        id: "active",
        name: "Pull Day",
        startedAt: Date.now() - 20 * 60_000,
        exercises: [],
        provenance: { source: "manual", confidence: "high", confirmation: "confirmed" },
      };
      const set = () => {
        throw new Error("read-only tool must not mutate state");
      };
      const before = JSON.stringify(state);
      const toolResult = tools.runTool(
        "getDailyDecision",
        {},
        {
          state,
          set,
          settings: state.jarvisSettings,
          confirmed: false,
        },
      );
      return {
        toolResult,
        unchanged: before === JSON.stringify(state),
        registered: tools.TOOL_SPECS.some((spec) => spec.name === "getDailyDecision"),
      };
    });

    expect(result.registered).toBe(true);
    expect(result.unchanged).toBe(true);
    expect(result.toolResult.ok).toBe(true);
    expect(result.toolResult.summary).toContain("Pull Day");
    expect(result.toolResult.data).toMatchObject({
      recommendation: {
        decisionType: expect.any(String),
        training: expect.any(Object),
        nutrition: expect.any(Object),
        recovery: expect.any(Object),
        whatChanged: expect.any(Array),
      },
      explanation: expect.any(String),
      confidence: expect.any(String),
      dataUsed: expect.any(Array),
      dataMissing: expect.any(Array),
      oneAction: expect.any(String),
    });
  });
});
