# FitCore Import, Export & Backup Plan

## 1. Goal

Provide users with full ownership of their data through robust, version-aware import and export mechanisms.

---

## 2. Technical Specifications

### Export Format

- **Format:** Single `.json` file.
- **Filename:** `fitcore-backup-YYYY-MM-DD.json`.
- **Content:** The entire `AppState` object, including:
  - `history` (Workouts, Meals, Check-ins)
  - `user` (Profile, Goals)
  - `savedItems` (Foods, Exercises)
  - `audit` (Change logs, Provenance)
  - `version` (The `FITCORE_DATA_VERSION`)

### Import Validation Rules

1. **Version Check:** If `imported.version > current.version`, reject and prompt user to update the app.
2. **Schema Validation:** Use a lightweight validator (or basic key-presence check) to ensure required top-level keys exist.
3. **Data Integrity:** Verify that ID references (e.g., `exerciseId` in a workout) exist or can be gracefully handled.

---

## 3. Import Behavior: Merge vs. Replace

| Strategy            | Behavior                                                       | Default     |
| :------------------ | :------------------------------------------------------------- | :---------- |
| **Replace (Safe)**  | Clear current `localStorage` and overwrite with imported data. | **Yes**     |
| **Merge (Complex)** | Combine history items, avoiding duplicates via ID check.       | **No (V2)** |

### Duplicate Prevention (Replace Strategy)

Before replacing, show a summary:

- "This will replace **242 workouts** and **1,105 meals** with data from **2023-11-12**."
- "Are you sure? Current data will be lost."

---

## 4. Error Handling & Safety

### Corrupt File Handling

- Display a clear error: "Invalid backup file. Please ensure you are uploading a genuine FitCore JSON export."
- Do not clear existing data until the new file is fully validated in memory.

### Provenance Preservation

- All `AuditMetadata` (source, confidence, original timestamps) must be preserved during the export/import cycle.
- The `importedAt` timestamp should be added to the audit log for the entire state.

---

## 5. QA Scenarios for Data Portability

1. **The Round Trip:** Export data → Clear App State → Import data. Verify all history, scores, and settings are identical.
2. **Old Version Import:** Attempt to import a `version: 1` file into a `version: 4` app. Verify migrations run successfully.
3. **Invalid File:** Attempt to import a random JSON or a non-JSON file. Verify graceful failure.
4. **Large Data Performance:** Import a file with 1000+ entries. Verify UI doesn't freeze during hydration.
5. **Missing Provenance:** Import a file where `source` fields are missing (simulating legacy data). Verify it defaults to `manual`.
