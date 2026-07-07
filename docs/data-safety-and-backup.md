# Data Safety and Backup

FitCore is designed as a **local-first** application. This means your data stays on your device, providing privacy and offline availability.

## Local Storage

- **Technology**: The app uses browser `localStorage` for data persistence.
- **Key**: The primary data key is `fitcore.v1`.
- **UI State**: UI-specific preferences (like sidebar state or collapsed sections) are stored under keys prefixed with `fitcore.ui.*`.

## Backup and Portability

Since data is stored locally in the browser, clearing your browser cache or switching devices will result in data loss unless a backup is used.

- **Export**: Users can export their entire app state as a JSON file from the **Settings / Hub** section.
- **Import**: A previously exported JSON file can be imported to restore data or sync across devices.
- **Reset**: The "Reset Data" option in settings will permanently clear `fitcore.v1` from `localStorage`. Use with caution.

## Schema and Migrations

As the app evolves, the data structure (schema) may change.

- **Current Behavior**: FitCore uses a lightweight default-merging pattern. When the app loads, it merges the saved `localStorage` data with the latest `defaultState`. This ensures that new features with new data fields don't crash when loading older saves.
- **Migration Expectations**:
  - Data/schema changes must be tested against existing `localStorage` data.
  - Future schema changes should include explicit migration logic if simple merging is insufficient.
  - Always test backup/import functionality when modifying the data store (`src/lib/store.tsx`).
  - **Never** perform breaking changes that silently overwrite or discard user history without a migration path.

## AI Data

AI interactions, coaching logs (Jarvis), and learning profiles are stored locally alongside your fitness data. They are included in the standard backup export.
