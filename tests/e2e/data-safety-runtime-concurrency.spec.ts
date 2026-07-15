import { expect, test } from "@playwright/test";

import { FITCORE_ATOMIC_PERSISTENCE_KEYS } from "../../src/lib/atomic-persistence";
import {
  LEGACY_KEYS,
  canonicalRevisionedStorage,
  controlledFailure,
  controllerCall,
  controllerCommit,
  createBrowserController,
  expectPrivate,
  fixtureState,
  monitorBrowserErrors,
  parsedMetadata,
  seedStorage,
  storageSnapshot,
  task7BaseMismatch,
} from "./data-safety-runtime-helpers";

test.describe("FitCore runtime persistence concurrency", () => {
  test("two pages reject a stale writer, reload, and alternate revisions", async ({
    context,
    page: pageA,
  }) => {
    const errorsA = await monitorBrowserErrors(pageA);
    const base = fixtureState("shared-base");
    const stateA = fixtureState("page-a");
    const staleB = fixtureState("private-stale-page-b-sentinel");
    const stateB = fixtureState("page-b-after-reload");
    await seedStorage(pageA, canonicalRevisionedStorage(base));
    await pageA.goto("/");
    const pageB = await context.newPage();
    try {
      const errorsB = await monitorBrowserErrors(pageB);
      await pageB.goto("/");
      expect((await createBrowserController(pageA, "a")).revision).toBe(1);
      expect((await createBrowserController(pageB, "b")).revision).toBe(1);

      const first = await controllerCommit(pageA, "a", stateA);
      expect(first).toMatchObject({ status: "ready", revision: 2 });
      let metadata = parsedMetadata(await storageSnapshot(pageA));
      expect(metadata.manifest).toMatchObject({ activeSlot: "b", previousSlot: "a" });
      expect(metadata.slotB.payload).toEqual(stateA);

      const beforeStale = await storageSnapshot(pageA);
      const stale = await controllerCommit(pageB, "b", staleB);
      expect(stale).toMatchObject({ status: "reload_required", state: null, revision: null });
      expect(await storageSnapshot(pageA)).toEqual(beforeStale);
      expectPrivate(stale, ["private-stale-page-b-sentinel"]);

      expect((await controllerCall(pageB, "b", "reload")).revision).toBe(2);
      const third = await controllerCommit(pageB, "b", stateB);
      expect(third).toMatchObject({ status: "ready", revision: 3 });
      metadata = parsedMetadata(await storageSnapshot(pageA));
      expect(metadata.manifest).toMatchObject({ activeSlot: "a", previousSlot: "b" });
      expect(metadata.slotA.payload).toEqual(stateB);
      expect((await controllerCall(pageA, "a", "getCurrentSnapshot")).revision).toBe(2);
      expect((await controllerCall(pageA, "a", "reload")).revision).toBe(3);
      await errorsA.assertClean();
      await errorsB.assertClean();
    } finally {
      await pageB.close();
    }
  });

  test("base-state mismatch blocks before persistence mutation and stays private", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const base = fixtureState("base-mismatch-authority");
    await seedStorage(page, canonicalRevisionedStorage(base));
    await page.goto("/");
    const before = await storageSnapshot(page);
    const result = await task7BaseMismatch(page, 1, fixtureState("private-next-sentinel"));
    expect(result).toMatchObject({ status: "base_state_mismatch", snapshot: null });
    expect(await storageSnapshot(page)).toEqual(before);
    expectPrivate(result, ["private-next-sentinel", "base-mismatch-authority"]);
    await errors.assertClean();
  });

  test("active-slot corruption after hydration retains the verified snapshot", async ({ page }) => {
    const errors = await monitorBrowserErrors(page);
    const base = fixtureState("retained-after-corruption");
    await seedStorage(page, canonicalRevisionedStorage(base));
    await page.goto("/");
    await createBrowserController(page, "corrupt-after");
    await page.evaluate(
      (key) => localStorage.setItem(key, "{private-active-slot-corruption"),
      FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA,
    );
    const before = await storageSnapshot(page);
    const result = await controllerCommit(
      page,
      "corrupt-after",
      fixtureState("private-proposed-after-corruption"),
    );
    expect(["reload_required", "blocked", "storage_error", "indeterminate"]).toContain(
      result.status,
    );
    expect(result.state).toBeNull();
    expect(await storageSnapshot(page)).toEqual(before);
    const retained = await controllerCall(page, "corrupt-after", "getCurrentSnapshot");
    expect(retained.state).toEqual(base);
    expectPrivate(result, ["private-active-slot-corruption", "private-proposed-after-corruption"]);
    await errors.assertClean();
  });

  test("newer coherent revision record rejects a stale controller without retry", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const base = fixtureState("overwrite-base");
    await seedStorage(page, canonicalRevisionedStorage(base));
    await page.goto("/");
    await createBrowserController(page, "stale");
    await createBrowserController(page, "newer");
    expect((await controllerCommit(page, "newer", fixtureState("newer-writer"))).revision).toBe(2);
    const before = await storageSnapshot(page);
    const stale = await controllerCommit(page, "stale", fixtureState("private-overwrite-proposal"));
    expect(stale.status).toBe("reload_required");
    expect(await storageSnapshot(page)).toEqual(before);
    expect(parsedMetadata(before).revision.revision).toBe(2);
    expectPrivate(stale, ["private-overwrite-proposal"]);
    await errors.assertClean();
  });

  test("controlled browser storage failure is structured, private, and retains state", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const retainedState = fixtureState("retained-storage-failure");
    const privateState = fixtureState("private-storage-state");
    privateState.jarvisLearning = {
      apiKey: "private-api-key-sentinel",
      notes: "private-free-text-sentinel",
      healthRecord: "private-health-record-sentinel",
    };
    await page.goto("/");
    const result = await controlledFailure(
      page,
      "storage",
      privateState,
      canonicalRevisionedStorage(retainedState),
    );
    expect(result).toMatchObject({
      hydrationStatus: "ready",
      result: { status: "storage_error", state: null },
    });
    expect(result.after).toEqual(result.before);
    expect(result.retained).toMatchObject({ revision: 1, state: retainedState });
    expectPrivate(result.result, [
      "private-storage-exception-sentinel",
      "private-api-key-sentinel",
      "private-free-text-sentinel",
      "private-health-record-sentinel",
    ]);
    await errors.assertClean();
  });

  test("unavailable secure randomness blocks writes without insecure fallback", async ({
    page,
  }) => {
    const errors = await monitorBrowserErrors(page);
    const retainedState = fixtureState("retained-random-failure");
    await page.goto("/");
    const result = await controlledFailure(
      page,
      "random",
      fixtureState("private-random-state"),
      canonicalRevisionedStorage(retainedState),
    );
    expect(result).toMatchObject({
      hydrationStatus: "ready",
      result: {
        status: "blocked",
        state: null,
        issues: [{ code: "write_token_generation_failed" }],
      },
    });
    expect(result.after).toEqual(result.before);
    expect(result.retained).toMatchObject({ revision: 1, state: retainedState });
    expectPrivate(result.result, ["private-storage-exception-sentinel", "private-random-state"]);
    await errors.assertClean();
  });

  test("unsafe revisioned state never falls back to legacy in either page", async ({
    context,
    page,
  }) => {
    const errorsA = await monitorBrowserErrors(page);
    const corrupt = "{private-two-page-corruption";
    const legacy = JSON.stringify(fixtureState("private-two-page-legacy"));
    await seedStorage(page, {
      [FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest]: corrupt,
      [LEGACY_KEYS[0]]: legacy,
    });
    await page.goto("/");
    const second = await context.newPage();
    try {
      const errorsB = await monitorBrowserErrors(second);
      await second.goto("/");
      const firstResult = await createBrowserController(page, "unsafe-a");
      const secondResult = await createBrowserController(second, "unsafe-b");
      expect(firstResult).toMatchObject({ status: "reload_required", source: "none", state: null });
      expect(secondResult).toMatchObject({
        status: "reload_required",
        source: "none",
        state: null,
      });
      expect((await controllerCall(page, "unsafe-a", "reload")).source).toBe("none");
      expect((await controllerCall(second, "unsafe-b", "reload")).source).toBe("none");
      const snapshot = await storageSnapshot(page);
      expect(snapshot[FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest]).toBe(corrupt);
      expect(snapshot[LEGACY_KEYS[0]]).toBe(legacy);
      await errorsA.assertClean();
      await errorsB.assertClean();
    } finally {
      await second.close();
    }
  });
});
