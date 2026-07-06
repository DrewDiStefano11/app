# Local State and Sync Contract

## Purpose

This document defines the architectural contract for the FitCore `AppState`. It establishes the rules for how state is structured, persisted, hydrated, and how it will eventually interact with external sync services (Cloud, Health APIs).

## Current Local-First Architecture

FitCore is a **local-first** application. The `AppState` in `src/lib/types.ts` is the single source of truth.

- **Primary Store:** `localStorage`.
- **Primary Key:** `fitcore.v1`.
- **UI State:** Separated from core data to prevent bloat in the main backup.

## App State Ownership

- The `AppProvider` (or similar store manager) owns the `AppState`.
- All modifications must go through defined actions/reducers to ensure consistency.
- Jarvis tools must use the same action layer as the UI.

## Persistence Responsibilities

- **Saving:** The app should save the `AppState` to `localStorage` on every change (throttled/debounced if necessary).
- **Versioning:** Every saved state must include a `version` number matching `FITCORE_DATA_VERSION`.

## Hydration Responsibilities

- **Loading:** On app start, the store must read from `localStorage`.
- **Defaults:** If no data exists, the `defaultState` is used.
- **Merging:** The store must merge the persisted state with the `defaultState` to ensure new fields in the app code don't cause crashes on old data.

## Migration Responsibilities

- Migrations are handled in `src/lib/fitcore-data.ts`.
- Each version increment must have a corresponding migration function if the schema change is non-trivial.
- **Conservative Migration:** Never delete data unless it is explicitly transformed.

## Import/Export Responsibilities

- Exports must be a direct JSON stringify of the `AppState`.
- Imports must undergo:
  1.  JSON Parsing.
  2.  Schema Validation.
  3.  Version Migration.
  4.  State Hydration.

## Future Sync Responsibilities

When cloud sync or wearable sync is introduced, it must follow these rules:

- **Local-First:** The app remains functional offline.
- **Background Sync:** Syncing happens in the background without blocking the UI.
- **Conflict Resolution:** Use the principles defined below.

## Conflict-Resolution Principles

1.  **Local Beats Remote:** If a conflict occurs between a local edit and a remote change, the local manual edit usually wins unless the remote change is newer AND of higher confidence.
2.  **Manual Beats AI:** Manual user inputs always overwrite AI estimates.
3.  **Newer is Not Always Better:** A 3-day old manual log is more "trusted" than a 1-hour old low-confidence AI estimate.
4.  **Reviewable Conflicts:** If a conflict is significant (e.g., different bodyweights for the same day), the user should be prompted to resolve it.

## Provenance/Confidence Requirements

- Every data point that can be synced or imported MUST have a `DataProvenance` object.
- `source`, `confidence`, and `confirmation` status are required for synchronization logic to determine the "winner" in a conflict.

## Data Integrity Rules

- **Record Stability:** Once a record ID is assigned, it must never change.
- **Immutable Timestamps:** `createdAt` should never be modified once a record is created.
- **Referential Integrity:** Deleting a workout should not leave orphaned `recoverySignals` if they were derived specifically from that workout's notes (or they should be unlinked).

## Non-Goals

- Real-time multi-user collaboration (FitCore is for individuals).
- Serving as a general-purpose file storage.
- Guaranteeing 100% sync consistency across 5+ simultaneous devices (Focus on 1-2 devices).

## Future Sync Contract (Draft)

```typescript
interface SyncEnvelope {
  id: string; // Record ID
  lastModified: number; // Timestamp for LWW (Last Write Wins)
  payload: Partial<AppState>; // The data changed
  provenance: DataProvenance;
}
```

## Future Implementation Checklist

- [ ] Move `localStorage` logic into a dedicated `PersistenceService`.
- [ ] Implement `updatedAt` field for all core data types.
- [ ] Add CRC/Checksum to the `AppState` for corruption detection.
- [ ] Research CRDTs (Conflict-free Replicated Data Types) for potential sync implementation.
