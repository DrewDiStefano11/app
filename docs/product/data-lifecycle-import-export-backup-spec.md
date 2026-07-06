# Data Lifecycle: Import, Export, and Backup Spec

## Purpose

This document defines the lifecycle of FitCore data and establishes strict rules for how data is handled during creation, modification, deletion, and movement (import/export/backup). The primary goal is to ensure user trust by guaranteeing that fitness, nutrition, and recovery history is never lost or corrupted.

## Product Rule Alignment

- **Improve trust in the data:** By guaranteeing data integrity during migrations and restores.
- **Explain what changed:** By providing summaries of import/restore actions.
- **Connect training, nutrition, recovery, and progress:** By preserving the links and provenance across all data types.

## User Problems Solved

- "I lost my data when I cleared my browser cache."
- "I updated the app and my old workouts are gone."
- "I imported my backup and now I have duplicate entries."
- "I don't know if this data came from my manual log or an AI estimate."

## Data Lifecycle Stages

1.  **Drafting:** Temporary state (e.g., active workout not yet saved).
2.  **Committed:** Saved to local `AppState`.
3.  **Persisted:** Written to `localStorage` (`fitcore.v1`).
4.  **Archived/Exported:** Transferred to an external file (JSON).
5.  **Restored/Imported:** Read from an external file back into `AppState`.
6.  **Deleted:** Removed from `AppState` and `localStorage` (supports Undo).

## Create/Edit/Delete Behavior

- **Atomic Updates:** Every change to the `AppState` must be atomic to prevent partial writes.
- **Record IDs:** Every record (Workout, MealEntry, etc.) must have a unique UUID (v4).
- **Timestamps:** Every record must track `createdAt` and `updatedAt`.
- **Soft Deletes:** Consider soft deletes for critical data to facilitate recovery, though current implementation is hard delete with immediate Undo capability via Jarvis Audit.

## Undo Behavior

- FitCore leverages the `jarvisAudit` log to facilitate undoing actions.
- An "Undo" should restore the previous state of the specific entity, including its original provenance and metadata.

## Import Behavior

- **Validation:** JSON imports must be validated against the current `AppState` schema.
- **Merging vs. Overwriting:** The user should be given a choice to "Merge" (add new records) or "Replace" (wipe current and use imported).
- **Partial Imports:** If a file is partially corrupted, FitCore should attempt to recover valid records rather than failing entirely, but must alert the user.

## Export Behavior

- **Completeness:** The export must include the entire `AppState` object, including `jarvisAudit`, `provenance`, and `userGoalsProfile`.
- **Format:** Standard JSON with a `version` field and a `timestamp`.
- **Anonymization:** Exports are intended for user backups and are not anonymized by default.

## Backup Behavior

- FitCore encourages manual exports via the Settings/Hub.
- **Future:** Periodic automatic triggers to remind the user to export.

## Restore Behavior

- **Version Check:** The app must check the `version` of the imported data.
- **Migration:** If the imported data is from an older version, the migration logic in `src/lib/fitcore-data.ts` must be applied before hydration.
- **Summary:** Display a summary of what was restored (e.g., "Restored 152 workouts, 450 meals").

## Conflict Handling

- **Record Collisions:** If an imported record has the same ID as an existing record:
  - If contents are identical: Ignore.
  - If contents differ: Default to the version with the most recent `updatedAt` (or `createdAt` if unavailable), or prompt the user.

## Duplicate Prevention

- Duplicate detection should use a combination of ID, timestamp, and content hashing.
- For meals/workouts: Check if a record with the same timestamp and primary attributes already exists.

## Versioned Migration Behavior

- **FITCORE_DATA_VERSION:** Every state update that changes the schema must increment this version.
- **Immutability of History:** Migrations must never delete fields unless they are explicitly replaced by a compatible new structure.
- **Legacy Preservation:** Unknown fields found in imported data should be preserved in the `AppState` if possible, to avoid data loss when moving between different app versions.

## Provenance/Confidence Behavior

- All imported/restored data must retain its original `DataProvenance`.
- If provenance is missing (legacy data), it should be tagged as `source: "imported"`.

## Jarvis Audit Behavior

- The `jarvisAudit` history is a critical part of the data lifecycle and must be exported/restored.
- Restoring should preserve the "Undone" status of previous actions.

## Edge Cases

- **Low Disk Space:** Handle `localStorage` quota exceeded errors gracefully by alerting the user.
- **Malformed JSON:** Provide clear error messages for invalid import files.
- **Browser Refresh during Import:** Ensure the import process is robust or can be restarted safely.

## Future Implementation Checklist

- [ ] Implement robust JSON schema validation for imports.
- [ ] Add "Merge vs. Replace" toggle in the Hub.
- [ ] Implement "Data Health Check" to find and fix orphaned records.
- [ ] Add "Export to CSV" for training and nutrition data.
- [ ] Implement automatic periodic backup reminders.
