import { expect, test } from "@playwright/test";
import type {
  AiMessage,
  AppState,
  BodyweightEntry,
  Goal,
  JarvisAuditEntry,
  MealEntry,
  PR,
  ProgressPhoto,
  RecoveryCheckIn,
  SleepEntry,
  Workout,
} from "../../src/lib/types";

const BASE_TIME = new Date("2026-07-06T15:00:00.000Z").getTime();

type ContractState = Pick<
  AppState,
  | "version"
  | "workouts"
  | "mealEntries"
  | "bodyweightEntries"
  | "sleepEntries"
  | "recoveryCheckIns"
  | "prs"
  | "goals"
  | "progressPhotos"
  | "aiMessages"
  | "jarvisAudit"
>;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectNumbersDeep(value: unknown, path = "state"): { path: string; value: number }[] {
  if (typeof value === "number") {
    return [{ path, value }];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectNumbersDeep(item, `${path}[${index}]`));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectNumbersDeep(child, `${path}.${key}`),
  );
}

function expectFiniteNumbersDeep(value: unknown) {
  for (const entry of collectNumbersDeep(value)) {
    expect(Number.isFinite(entry.value), `${entry.path} should be finite`).toBe(true);
  }
}

function collectIdsDeep(value: unknown, path = "state"): { path: string; value: string }[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectIdsDeep(item, `${path}[${index}]`));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    const current =
      key === "id" && typeof child === "string" ? [{ path: childPath, value: child }] : [];
    return [...current, ...collectIdsDeep(child, childPath)];
  });
}

function expectNonEmptyIds(value: unknown) {
  const ids = collectIdsDeep(value);

  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    expect(id.value.trim(), `${id.path} should be a non-empty id`).not.toBe("");
  }
}

function findDuplicateIds(value: unknown): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of collectIdsDeep(value)) {
    if (seen.has(id.value)) {
      duplicates.add(id.value);
    }
    seen.add(id.value);
  }

  return [...duplicates].sort();
}

function expectFiniteTimestamp(value: unknown, path: string) {
  expect(typeof value, `${path} should be a number`).toBe("number");
  expect(Number.isFinite(value), `${path} should be finite`).toBe(true);
}

function expectFiniteTimestampsDeep(value: unknown, path = "state") {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => expectFiniteTimestampsDeep(item, `${path}[${index}]`));
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (["createdAt", "startedAt", "endedAt", "date"].includes(key)) {
      expectFiniteTimestamp(child, childPath);
    }
    expectFiniteTimestampsDeep(child, childPath);
  }
}

function collectTimestampsDeep(value: unknown, path = "state"): { path: string; value: number }[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectTimestampsDeep(item, `${path}[${index}]`));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    const current =
      ["createdAt", "startedAt", "endedAt", "date"].includes(key) && typeof child === "number"
        ? [{ path: childPath, value: child }]
        : [];
    return [...current, ...collectTimestampsDeep(child, childPath)];
  });
}

function expectSortableTimestamps(value: unknown) {
  const timestamps = collectTimestampsDeep(value).map((entry) => entry.value);
  const sorted = [...timestamps].sort((a, b) => a - b);

  expect(sorted).toHaveLength(timestamps.length);
  expect(sorted.every((timestamp, index) => index === 0 || timestamp >= sorted[index - 1])).toBe(
    true,
  );
}

function expectNoMutation<T>(input: T, action: (value: T) => unknown) {
  const before = deepClone(input);
  action(input);
  expect(input).toEqual(before);
}

function makeMealEntry(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "meal-breakfast",
    name: "Protein oats",
    type: "breakfast",
    calories: 620,
    protein: 44,
    carbs: 72,
    fat: 18,
    fiber: 9,
    notes: "Pre-workout meal",
    createdAt: BASE_TIME,
    items: [
      {
        name: "Oats",
        qty: "80g",
        calories: 300,
        protein: 10,
        carbs: 54,
        fat: 6,
      },
    ],
    ...overrides,
  };
}

function makeBodyweightEntry(overrides: Partial<BodyweightEntry> = {}): BodyweightEntry {
  return {
    id: "bodyweight-morning",
    weightLb: 181.4,
    notes: "Morning weigh-in",
    createdAt: BASE_TIME + 1_000,
    ...overrides,
  };
}

function makeRecoveryCheckIn(overrides: Partial<RecoveryCheckIn> = {}): RecoveryCheckIn {
  return {
    id: "recovery-check",
    energy: 8,
    soreness: 3,
    stress: 4,
    motivation: 9,
    notes: "Ready for upper body",
    createdAt: BASE_TIME + 2_000,
    ...overrides,
  };
}

function makeSleepEntry(overrides: Partial<SleepEntry> = {}): SleepEntry {
  return {
    id: "sleep-night",
    hours: 7.75,
    quality: 8,
    notes: "Slept through the night",
    createdAt: BASE_TIME + 3_000,
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "workout-upper",
    name: "Upper Strength",
    startedAt: BASE_TIME + 4_000,
    endedAt: BASE_TIME + 3_604_000,
    notes: "Smooth session",
    exercises: [
      {
        id: "workout-upper-bench",
        exerciseId: "bench-press",
        completed: true,
        notes: "Paused first reps",
        sets: [
          {
            id: "workout-upper-bench-set-1",
            weight: 185,
            reps: 6,
            completed: true,
          },
          {
            id: "workout-upper-bench-set-2",
            weight: 190,
            reps: 5,
            completed: true,
            modifier: "paused",
          },
        ],
      },
    ],
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-bodyweight",
    type: "bodyweight",
    label: "Reach 185 lb",
    target: 185,
    current: 181.4,
    section: "progress",
    pinned: true,
    ...overrides,
  };
}

function makePrEntry(overrides: Partial<PR> = {}): PR {
  return {
    id: "pr-bench-volume",
    exerciseId: "bench-press",
    type: "volume",
    value: 2225,
    reps: 11,
    weight: 190,
    date: BASE_TIME + 5_000,
    ...overrides,
  };
}

function makeProgressPhoto(overrides: Partial<ProgressPhoto> = {}): ProgressPhoto {
  return {
    id: "photo-front",
    dataUrl: "data:image/png;base64,contract",
    view: "front",
    phase: "maintenance",
    createdAt: BASE_TIME + 6_000,
    ...overrides,
  };
}

function makeAiMessage(overrides: Partial<AiMessage> = {}): AiMessage {
  return {
    id: "ai-message-summary",
    role: "assistant",
    content: "Logged your workout summary.",
    createdAt: BASE_TIME + 7_000,
    ...overrides,
  };
}

function makeJarvisAuditEntry(overrides: Partial<JarvisAuditEntry> = {}): JarvisAuditEntry {
  return {
    id: "audit-workout-summary",
    tool: "logWorkout",
    summary: "Logged upper strength session.",
    status: "logged",
    entityIds: ["workout-upper"],
    entityKind: "workout",
    createdAt: BASE_TIME + 8_000,
    ...overrides,
  };
}

function makeState(overrides: Partial<ContractState> = {}): ContractState {
  return {
    version: 4,
    workouts: [makeWorkout()],
    mealEntries: [makeMealEntry()],
    bodyweightEntries: [makeBodyweightEntry()],
    sleepEntries: [makeSleepEntry()],
    recoveryCheckIns: [makeRecoveryCheckIn()],
    prs: [makePrEntry()],
    goals: [makeGoal()],
    progressPhotos: [makeProgressPhoto()],
    aiMessages: [makeAiMessage()],
    jarvisAudit: [makeJarvisAuditEntry()],
    ...overrides,
  };
}

test.describe("FitCore data contract invariants", () => {
  test("representative logged entities keep required ids, numeric fields, and timestamps", () => {
    // This suite is a Wave 2 safety net: it locks down data shape assumptions
    // without exercising UI, navigation, storage, or runtime mutation paths.
    const entities = [
      makeMealEntry(),
      makeBodyweightEntry(),
      makeRecoveryCheckIn(),
      makeSleepEntry(),
      makeWorkout(),
      makeGoal(),
      makePrEntry(),
      makeProgressPhoto(),
      makeAiMessage(),
      makeJarvisAuditEntry(),
    ];

    for (const entity of entities) {
      expectNonEmptyIds(entity);
      expectFiniteNumbersDeep(entity);
      expectFiniteTimestampsDeep(entity);
    }

    expectSortableTimestamps(makeState());
    expect(makeWorkout().exercises[0]).toMatchObject({
      id: "workout-upper-bench",
      exerciseId: "bench-press",
      completed: true,
      sets: expect.any(Array),
    });
    expect(makeWorkout().exercises[0].sets[0]).toMatchObject({
      id: "workout-upper-bench-set-1",
      weight: 185,
      reps: 6,
      completed: true,
    });
  });

  test("optional fields can be omitted while contract helpers remain safe and pure", () => {
    const state = makeState({
      workouts: [
        makeWorkout({
          notes: undefined,
          exercises: [
            {
              id: "exercise-with-minimal-set",
              exerciseId: "pull-up",
              completed: false,
              sets: [{ id: "bodyweight-set", reps: 8, completed: false }],
            },
          ],
        }),
      ],
      mealEntries: [makeMealEntry({ notes: undefined, source: undefined, items: undefined })],
      bodyweightEntries: [makeBodyweightEntry({ notes: undefined })],
      recoveryCheckIns: [makeRecoveryCheckIn({ notes: undefined })],
      sleepEntries: [makeSleepEntry({ notes: undefined })],
      progressPhotos: [makeProgressPhoto({ notes: undefined })],
    });

    expectNoMutation(state, (input) => {
      expectNonEmptyIds(input);
      expectFiniteNumbersDeep(input);
      expectFiniteTimestampsDeep(input);
      expect(findDuplicateIds(input)).toEqual([]);
    });
  });

  test("empty AppState-like collections remain arrays and pass pure contract checks", () => {
    const emptyState = makeState({
      workouts: [],
      mealEntries: [],
      bodyweightEntries: [],
      sleepEntries: [],
      recoveryCheckIns: [],
      prs: [],
      goals: [],
      progressPhotos: [],
      aiMessages: [],
      jarvisAudit: [],
    });

    expect(Object.values(emptyState).filter(Array.isArray)).toHaveLength(10);
    expectNoMutation(emptyState, (input) => {
      expectFiniteNumbersDeep(input);
      expectFiniteTimestampsDeep(input);
      expect(collectIdsDeep(input)).toEqual([]);
    });
  });

  test("representative cross-entity state detects invalid ids without mutating data", () => {
    const state = makeState();

    expectNoMutation(state, (input) => {
      expectNonEmptyIds(input);
      expectFiniteNumbersDeep(input);
      expectFiniteTimestampsDeep(input);
      expect(findDuplicateIds(input)).toEqual([]);
      expect(input.workouts[0].exercises).toEqual(expect.any(Array));
      expect(input.workouts[0].exercises[0].sets).toEqual(expect.any(Array));
      expect(input.mealEntries).toEqual(expect.any(Array));
      expect(input.bodyweightEntries).toEqual(expect.any(Array));
      expect(input.recoveryCheckIns).toEqual(expect.any(Array));
      expect(input.sleepEntries).toEqual(expect.any(Array));
      expect(input.goals).toEqual(expect.any(Array));
    });

    const duplicated = makeState({
      workouts: [
        makeWorkout({
          exercises: [
            {
              id: "duplicate-id",
              exerciseId: "bench-press",
              completed: true,
              sets: [{ id: "duplicate-id", weight: 135, reps: 10, completed: true }],
            },
          ],
        }),
      ],
    });

    expect(findDuplicateIds(duplicated)).toEqual(["duplicate-id"]);
  });
});
