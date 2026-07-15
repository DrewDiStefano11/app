import { expect, test } from "@playwright/test";

import { FITCORE_ATOMIC_PERSISTENCE_KEYS } from "../../src/lib/atomic-persistence";
import {
  LEGACY_KEYS,
  PERSISTENCE_KEYS,
  REVISION_KEY,
  browserSerializationSafety,
  canonicalRevisionedStorage,
  clearStorage,
  controllerCall,
  controllerCommit,
  controllerCommitWithoutMathRandom,
  createBrowserController,
  expectPrivate,
  fixtureState,
  installWriteCounter,
  largeFixtureState,
  monitorBrowserErrors,
  parsedMetadata,
  persistenceWriteCount,
  seedStorage,
  storageSnapshot,
  storeBoundaryCommit,
  waitForHydrationTurn,
} from "./data-safety-runtime-helpers";

test.describe("FitCore runtime persistence lifecycle", () => {
  test("empty application startup and reload never persist defaults", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    await installWriteCounter(page);
    await seedStorage(page, {});
    await page.goto("/");
    await expect(page).toHaveTitle(/FitCore/);
    await waitForHydrationTurn(page);
    await expect
      .poll(() => storageSnapshot(page))
      .toEqual(Object.fromEntries(PERSISTENCE_KEYS.map((key) => [key, null])));
    expect(await persistenceWriteCount(page)).toBe(0);
    await page.reload();
    await expect.poll(() => persistenceWriteCount(page)).toBe(0);
    expect(await storageSnapshot(page)).toEqual(
      Object.fromEntries(PERSISTENCE_KEYS.map((key) => [key, null])),
    );
    await errors.assertClean();
  });

  test("verified revisioned state hydrates byte-identically across reload", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const state = fixtureState("revisioned-hydration");
    const seeded = canonicalRevisionedStorage(state);
    await seedStorage(page, seeded);
    await page.goto("/");
    expect(await storageSnapshot(page)).toEqual(seeded);
    const result = await createBrowserController(page, "verified");
    expect(result).toMatchObject({
      status: "ready",
      revision: 1,
      source: "revisioned",
      state,
    });
    await page.reload();
    expect(await storageSnapshot(page)).toEqual(seeded);
    await errors.assertClean();
  });

  test("active workout survives navigation, reload, and browser context reopening", async ({
    browser,
    baseURL,
  }) => {
    expect(baseURL).toBeTruthy();
    const active = fixtureState("active-workout-lifecycle");
    active.activeWorkout = {
      id: "browser-lifecycle-active",
      name: "Lifecycle Workout",
      startedAt: 1_700_000_000_000,
      exercises: [],
      provenance: {
        source: "manual",
        confidence: "high",
        confirmation: "confirmed",
      },
    };

    const firstContext = await browser.newContext({ baseURL });
    let savedStorage;
    try {
      const firstPage = await firstContext.newPage();
      try {
        const errors = await monitorBrowserErrors(firstPage);
        await seedStorage(firstPage, canonicalRevisionedStorage(fixtureState("context-base")));
        await firstPage.goto("/");
        await createBrowserController(firstPage, "context-writer");
        expect(await controllerCommit(firstPage, "context-writer", active)).toMatchObject({
          status: "ready",
          revision: 2,
        });

        await firstPage.goto("/favicon.svg");
        await firstPage.goto("/");
        expect(await createBrowserController(firstPage, "after-navigation")).toMatchObject({
          status: "ready",
          revision: 2,
          state: active,
        });
        await firstPage.reload();
        expect(await createBrowserController(firstPage, "after-reload")).toMatchObject({
          status: "ready",
          revision: 2,
          state: active,
        });
        savedStorage = await firstContext.storageState();
        await errors.assertClean();
      } finally {
        await firstPage.close();
      }
    } finally {
      await firstContext.close();
    }

    const reopenedContext = await browser.newContext({ baseURL, storageState: savedStorage });
    try {
      const reopenedPage = await reopenedContext.newPage();
      try {
        const errors = await monitorBrowserErrors(reopenedPage);
        await reopenedPage.goto("/");
        expect(await createBrowserController(reopenedPage, "reopened")).toMatchObject({
          status: "ready",
          revision: 2,
          state: active,
        });
        await errors.assertClean();
      } finally {
        await reopenedPage.close();
      }
    } finally {
      await reopenedContext.close();
    }
  });

  test("historical completion preserves zero and missing fields but rejects invalid-present values", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const historical = {
      version: 1,
      onboardingComplete: true,
      profile: {
        goal: "hypertrophy",
        experience: "intermediate",
        daysPerWeek: 0,
        split: "Push / Pull / Legs",
        bodyweightLb: 180,
        targetBodyweightLb: 185,
        units: "lb",
      },
      workouts: [],
      activeWorkout: null,
      mealEntries: [],
      bodyweightEntries: [],
      goals: [],
    };
    await seedStorage(page, { [LEGACY_KEYS[0]]: JSON.stringify(historical) });
    await page.goto("/");
    const completed = await createBrowserController(page, "historical");
    expect(completed).toMatchObject({
      status: "ready",
      source: "revisioned",
      revision: 1,
    });
    expect(completed.state!.profile.daysPerWeek).toBe(0);
    expect(Object.hasOwn(completed.state!.profile, "name")).toBe(false);
    expect(parsedMetadata(await storageSnapshot(page)).slotA.payload).toEqual(completed.state);

    const invalidPresent = structuredClone(historical) as Record<string, unknown>;
    invalidPresent.profile = { ...historical.profile, goal: 42 };
    await seedStorage(page, { [LEGACY_KEYS[0]]: JSON.stringify(invalidPresent) });
    await page.goto("/");
    const before = await storageSnapshot(page);
    const rejected = await createBrowserController(page, "invalid-present");
    expect(rejected).toMatchObject({ status: "blocked", state: null });
    expect(await storageSnapshot(page)).toEqual(before);
    await errors.assertClean();
  });

  test("browser serialization omits undefined properties and rejects arrays and accessors", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    await seedStorage(page, canonicalRevisionedStorage(fixtureState("serialization-base")));
    await page.goto("/");
    await createBrowserController(page, "serialization");
    const result = await browserSerializationSafety(page, "serialization");
    expect(result.ordinary).toMatchObject({ status: "ready", revision: 2 });
    expect(result.ordinary.state!.profile.daysPerWeek).toBe(0);
    expect(result.auditIdPresent).toBe(false);
    expect(result.invalidResult).toMatchObject({ status: "blocked", state: null });
    expect(result.accessorResult).toMatchObject({ status: "blocked", state: null });
    expect(result.accessorReads).toBe(0);
    expect(result.storageUnchangedAfterInvalid).toBe(true);
    expect(result.storageUnchangedAfterAccessor).toBe(true);
    expectPrivate(result.accessorResult, ["private-accessor-value"]);
    await errors.assertClean();
  });

  test("revisioned state takes precedence over distinct legacy state", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const revisioned = fixtureState("authoritative");
    const legacy = fixtureState("ignored-legacy");
    const seeded = canonicalRevisionedStorage(revisioned);
    seeded[LEGACY_KEYS[0]] = JSON.stringify(legacy);
    await seedStorage(page, seeded);
    await page.goto("/");
    const result = await createBrowserController(page, "precedence");
    expect(result).toMatchObject({ revision: 1, source: "revisioned", state: revisioned });
    expect(await storageSnapshot(page)).toEqual(seeded);
    await errors.assertClean();
  });

  test("legacy migration is non-destructive, canonical, and one-time", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const state = fixtureState("legacy-migration");
    const raw = JSON.stringify(state);
    await seedStorage(page, { [LEGACY_KEYS[0]]: raw });
    await page.goto("/");
    const result = await createBrowserController(page, "legacy-migration");
    expect(result).toMatchObject({
      status: "ready",
      source: "revisioned",
      revision: 1,
      state,
    });
    await expect.poll(async () => (await storageSnapshot(page))[REVISION_KEY]).not.toBeNull();
    const migrated = await storageSnapshot(page);
    const metadata = parsedMetadata(migrated);
    expect(migrated[LEGACY_KEYS[0]]).toBe(raw);
    expect(metadata.manifest).toMatchObject({ activeSlot: "a", previousSlot: null });
    expect(metadata.revision).toMatchObject({ revision: 1, activeSlot: "a" });
    expect(metadata.revision.writeToken).toMatch(/^[0-9a-f]{32}$/);
    expect(metadata.slotA.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(metadata.slotA.payload).toEqual(state);
    const beforeReload = await storageSnapshot(page);
    await page.reload();
    expect(await storageSnapshot(page)).toEqual(beforeReload);
    expect((await storageSnapshot(page))[FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB]).toBeNull();
    await errors.assertClean();
  });

  test("legacy precedence adopts only the first present key", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const first = fixtureState("legacy-first");
    const lower = fixtureState("legacy-lower");
    const firstRaw = JSON.stringify(first);
    const lowerRaw = JSON.stringify(lower);
    await seedStorage(page, { [LEGACY_KEYS[1]]: firstRaw, [LEGACY_KEYS[3]]: lowerRaw });
    await page.goto("/");
    const result = await createBrowserController(page, "legacy-precedence");
    expect(result).toMatchObject({ status: "ready", source: "revisioned", state: first });
    await expect.poll(async () => (await storageSnapshot(page))[REVISION_KEY]).not.toBeNull();
    const snapshot = await storageSnapshot(page);
    expect(parsedMetadata(snapshot).slotA.payload).toEqual(first);
    expect(snapshot[LEGACY_KEYS[1]]).toBe(firstRaw);
    expect(snapshot[LEGACY_KEYS[3]]).toBe(lowerRaw);
    await errors.assertClean();
  });

  test("malformed highest-precedence legacy blocks without fallback or writes", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const malformed = "{private-malformed-legacy-sentinel";
    const lowerRaw = JSON.stringify(fixtureState("lower-valid"));
    await seedStorage(page, { [LEGACY_KEYS[0]]: malformed, [LEGACY_KEYS[1]]: lowerRaw });
    await page.goto("/");
    const before = await storageSnapshot(page);
    const result = await createBrowserController(page, "malformed");
    expect(result).toMatchObject({ status: "blocked", state: null });
    expect(await storageSnapshot(page)).toEqual(before);
    expectPrivate(result, [malformed, "lower-valid"]);
    await errors.assertClean();
  });

  test("integrity-invalid legacy remains byte-identical and blocks fallback", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const invalidRaw = JSON.stringify({ invalid: "private-invalid-state-sentinel" });
    await seedStorage(page, {
      [LEGACY_KEYS[0]]: invalidRaw,
      [LEGACY_KEYS[1]]: JSON.stringify(fixtureState("lower-valid")),
    });
    await page.goto("/");
    const before = await storageSnapshot(page);
    const result = await createBrowserController(page, "invalid");
    expect(result).toMatchObject({ status: "blocked", state: null });
    expect(await storageSnapshot(page)).toEqual(before);
    expectPrivate(result, ["private-invalid-state-sentinel", "lower-valid"]);
    await errors.assertClean();
  });

  test("corrupt revisioned storage never falls back to valid legacy", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const corrupt = "{private-corrupt-revisioned-sentinel";
    const legacyRaw = JSON.stringify(fixtureState("private-valid-legacy-sentinel"));
    await seedStorage(page, {
      [FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest]: corrupt,
      [LEGACY_KEYS[0]]: legacyRaw,
    });
    await page.goto("/");
    const before = await storageSnapshot(page);
    const result = await createBrowserController(page, "corrupt");
    expect(result).toMatchObject({ status: "reload_required", state: null, source: "none" });
    expect(await storageSnapshot(page)).toEqual(before);
    expectPrivate(result, [corrupt, "private-valid-legacy-sentinel"]);
    await errors.assertClean();
  });

  test("browser-generated token uses sixteen secure bytes and is timestamp-independent", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const state = fixtureState("browser-token");
    await seedStorage(page, {});
    await page.goto("/");
    await waitForHydrationTurn(page);
    const result = await createBrowserController(page, "browser-token");
    expect(result).toMatchObject({ status: "empty", revision: null });
    const committed = await controllerCommitWithoutMathRandom(page, "browser-token", state);
    expect(committed).toMatchObject({ status: "ready", revision: 1, state });
    await expect.poll(async () => (await storageSnapshot(page))[REVISION_KEY]).not.toBeNull();
    const metadata = parsedMetadata(await storageSnapshot(page));
    expect(metadata.revision.writeToken).toHaveLength(32);
    expect(metadata.revision.writeToken).toMatch(/^[0-9a-f]{32}$/);
    expect(metadata.revision.writeToken).not.toBe(metadata.revision.exportedAt);
    await errors.assertClean();
  });

  test("store boundary persists a mutation before publishing it", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const current = fixtureState("boundary-current");
    const next = fixtureState("boundary-next");
    await seedStorage(page, canonicalRevisionedStorage(current));
    await page.goto("/");
    await createBrowserController(page, "store-boundary");
    const outcome = await storeBoundaryCommit(page, "store-boundary", current, next);
    expect(outcome).toMatchObject({
      applied: true,
      state: next,
      metadata: { persistenceStatus: "ready", persistenceRequiresReload: false },
    });
    const metadata = parsedMetadata(await storageSnapshot(page));
    expect(metadata.manifest).toMatchObject({ activeSlot: "b", previousSlot: "a" });
    expect(metadata.revision).toMatchObject({ revision: 2, activeSlot: "b" });
    expect(metadata.slotB.payload).toEqual(next);
    await errors.assertClean();
  });

  test("canonical no-change preserves every persistence byte", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const current = fixtureState("no-change");
    await seedStorage(page, canonicalRevisionedStorage(current));
    await page.goto("/");
    await createBrowserController(page, "no-change");
    const before = await storageSnapshot(page);
    const result = await controllerCommit(page, "no-change", structuredClone(current));
    expect(result).toMatchObject({ status: "ready", revision: 1 });
    expect(await storageSnapshot(page)).toEqual(before);
    await errors.assertClean();
  });

  test("explicit reload observes an external verified commit without writing", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const base = fixtureState("reload-base");
    const external = fixtureState("reload-external");
    await seedStorage(page, canonicalRevisionedStorage(base));
    await page.goto("/");
    await createBrowserController(page, "first");
    await createBrowserController(page, "writer");
    expect((await controllerCommit(page, "writer", external)).revision).toBe(2);
    const before = await storageSnapshot(page);
    const reloaded = await controllerCall(page, "first", "reload");
    expect(reloaded).toMatchObject({ status: "ready", revision: 2, state: external });
    expect(await storageSnapshot(page)).toEqual(before);
    await errors.assertClean();
  });

  test("large fixture migrates, changes once, no-changes, and reloads completely", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const state = largeFixtureState();
    await seedStorage(page, { [LEGACY_KEYS[0]]: JSON.stringify(state) });
    await page.goto("/");
    const controller = await createBrowserController(page, "large");
    expect(controller.revision).toBe(1);
    const changed = structuredClone(state);
    changed.workouts[1_999]!.name = "Changed Synthetic Workout";
    expect((await controllerCommit(page, "large", changed)).revision).toBe(2);
    const beforeNoChange = await storageSnapshot(page);
    expect((await controllerCommit(page, "large", structuredClone(changed))).revision).toBe(2);
    expect(await storageSnapshot(page)).toEqual(beforeNoChange);
    const reloaded = await controllerCall(page, "large", "reload");
    expect(reloaded.revision).toBe(2);
    expect(reloaded.state).toEqual(changed);
    const roundTrip = parsedMetadata(await storageSnapshot(page)).slotB.payload;
    expect(roundTrip.jarvisLearning).toEqual({
      sentinel: "synthetic-large",
      zero: 0,
      disabled: false,
      empty: "",
      nullable: null,
      allowedNegative: -7.5,
    });
    await clearStorage(page);
    await errors.assertClean();
  });
});
