import { expect, test } from "bun:test";
import { markProvenanceEdited, migrateFitCoreDataIfNeeded } from "../../src/lib/fitcore-data";
import { runTool, undoAuditEntry } from "../../src/lib/jarvis/tools";
import { defaultState, type AppState } from "../../src/lib/types";

const lunch = {
  draftId: "jarvis-lunch",
  name: "Chicken bowl",
  mealType: "lunch",
  calories: 520,
  protein: 42,
  carbs: 55,
  fat: 14,
  confidence: "high",
};

function session() {
  let state = {
    ...structuredClone(defaultState),
    jarvisSettings: { ...defaultState.jarvisSettings, enabled: true },
  };
  function set(update: (current: AppState) => AppState) {
    state = migrateFitCoreDataIfNeeded(update(state));
    return true;
  }
  return {
    get state() {
      return state;
    },
    set,
    run(name: string, args: Record<string, unknown>) {
      return runTool(name, args, { state, set, settings: state.jarvisSettings, confirmed: true });
    },
  };
}

test("a manual correction prevents older Jarvis meal undos", () => {
  const app = session();
  const log = app.run("logMeal", lunch);
  const { id } = app.state.mealEntries[0];
  const edit = app.run("updateMeal", { id, patch: { calories: 500 } });
  app.set((state) => ({
    ...state,
    mealEntries: state.mealEntries.map((meal) => ({
      ...meal,
      calories: 450,
      provenance: markProvenanceEdited(meal.provenance, { editedBy: "user" }),
    })),
  }));

  expect(undoAuditEntry(edit.auditId!, app.state, app.set).ok).toBe(false);
  expect(undoAuditEntry(log.auditId!, app.state, app.set).ok).toBe(false);
  expect(app.state.mealEntries[0].calories).toBe(450);
  expect(app.state.jarvisAudit.every((entry) => !entry.undone)).toBe(true);
});

test("undo restores the latest Jarvis meal edit only when its write succeeds", () => {
  const app = session();
  app.run("logMeal", lunch);
  const { id } = app.state.mealEntries[0];
  const edit = app.run("updateMeal", { id, patch: { calories: 500 } });
  expect(
    undoAuditEntry(edit.auditId!, app.state, (update) => {
      update(app.state);
      return false;
    }).ok,
  ).toBe(false);
  expect(app.state.mealEntries[0].calories).toBe(500);
  expect(undoAuditEntry(edit.auditId!, app.state, app.set).ok).toBe(true);
  expect(app.state.mealEntries[0].calories).toBe(520);
});

test("a deleted meal may be logged again while retained audit entries remain available", () => {
  const app = session();
  app.run("logMeal", lunch);
  const original = app.state.mealEntries[0].id;
  expect(app.run("logMeal", lunch).data).toMatchObject({ duplicate: true });
  expect(app.state.mealEntries).toHaveLength(1);
  app.set((state) => ({ ...state, mealEntries: [] }));

  expect(app.run("logMeal", lunch).ok).toBe(true);
  expect(app.state.mealEntries).toHaveLength(1);
  expect(app.state.mealEntries[0].id).not.toBe(original);
  expect(app.state.jarvisAudit.some((entry) => entry.entityIds?.includes(original))).toBe(true);
});
