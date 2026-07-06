# Data Loss and Restore Test Plan

## Purpose

This test plan ensures that FitCore's data integrity is maintained through updates, migrations, exports, and restores. It provides a structured approach for QA to verify that no user data is lost or corrupted during common lifecycle events.

## QA Principles

- **Verify Every Field:** Don't just check if the workout exists; check that every set, rep, weight, and modifier survived.
- **Test the Gaps:** Focus on what happens to data between versions.
- **Trust but Verify:** Manually inspect the `localStorage` and exported JSON files.

## Test Matrix

| Category           | Scenario                                              | Expected Result                                          |
| :----------------- | :---------------------------------------------------- | :------------------------------------------------------- |
| **Export/Restore** | Export current data, clear app, restore.              | State is 100% identical to pre-export state.             |
| **Migration**      | Load data from Version 1 into Version 4.              | Data is correctly migrated; new fields have defaults.    |
| **Conflict**       | Import a record that already exists but was modified. | App handles the conflict (e.g., uses newest or prompts). |
| **Corruption**     | Import a JSON file with missing brackets or fields.   | App provides a clear error and does not crash.           |
| **Large Data**     | Import 1000+ workouts and meals.                      | App remains responsive; data is fully loaded.            |

## Regression Risks

- Adding a new field to `AppState` without a default value (results in `undefined` errors).
- Changing the type of an existing field (e.g., `string` to `number`).
- Renaming a field without a migration path.
- Deleting a field that is still used in older exports.

## Required Test Data Scenarios

1.  **The "Power User":** 100+ workouts, 500+ meals, dozens of custom exercises, 1-year of bodyweight logs.
2.  **The "AI Native":** Data mostly consisting of Jarvis-estimated meals, camera logs, and audit entries.
3.  **The "Old Timer":** Data exported from a version 6 months old.
4.  **The "Multi-Source":** Data containing a mix of manual entries and Apple Health imports.

## Import/Export Tests

- [ ] **Basic Round-trip:** Create data -> Export -> Reset App -> Import -> Verify.
- [ ] **No Data Loss:** Verify that `notes`, `provenance`, and `modifiers` are all preserved.
- [ ] **Empty State Export:** Exporting an empty app and re-importing should work.

## Restore Tests

- [ ] **Partial Restore:** Verify behavior when some records in the import are invalid.
- [ ] **Restore Summary:** Verify that the UI displays an accurate count of restored items.
- [ ] **Graph Verification:** Ensure that Progress and Nutrition graphs immediately reflect restored data.

## Migration Tests

- [ ] **Legacy Version Load:** Manually inject a Version 1 object into `localStorage` and refresh.
- [ ] **Field Addition:** Add a dummy field to `AppState` and verify it populates correctly for old data.
- [ ] **Field Transformation:** Verify that transformed data (e.g., unit conversions) is accurate.

## Provenance/Confidence Tests

- [ ] **Metadata Survival:** Ensure `source`, `confidence`, and `auditId` are preserved after restore.
- [ ] **Unconfirmed State:** Verify that "Unconfirmed" meals stay "Unconfirmed" after restore.

## Jarvis/Audit Tests

- [ ] **Undo Capability:** Verify that a restored action can still be "Undone" if the audit log is present.
- [ ] **Jarvis Memory:** Verify that `jarvisLearning` state is preserved.

## Manual QA Checklist

- [ ] Check `localStorage.getItem('fitcore.v1')` before and after import.
- [ ] Open the exported JSON in a text editor to verify readability.
- [ ] Trigger a "Reset Data" and ensure `localStorage` is empty.
- [ ] Verify that the "Onboarding" screen appears only when data is truly gone.

## Future Automated Test Checklist

- [ ] Create a Playwright test that fills the app with data, exports it, and re-imports it.
- [ ] Write unit tests for every migration function in `src/lib/fitcore-data.ts`.
- [ ] Create a "Schema Validator" test that runs against a library of "Old Version" JSON files.
