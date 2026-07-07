# Privacy & Deletion QA Checklist

## 1. Purpose
The purpose of this checklist is to verify that user privacy controls, data export capabilities, and deletion flows function exactly as specified. It ensures that sensitive data is protected and that user rights to manage and destroy their data are respected.

## 2. Scope
This checklist covers the privacy controls and data lifecycle management features:
* Settings privacy controls
* AI memory category toggles
* Local-only/cloud-sync choices
* Export flow
* Delete account/data flow
* Specific memory deletion
* Medical/genetics/photos/conversations locks
* Reduced-history/privacy mode future checks
* Deletion propagation to dashboards/graphs/AI context
* Confirmation dialogs
* Recovery from accidental action where appropriate

## 3. When to use this checklist
* Whenever modifying user settings, onboarding, or profile management logic.
* After changing the database schema or local storage persistence layers.
* Prior to releases impacting AI memory context or data synchronization.

## 4. Required preconditions
* Use a test account populated with varied data (meals, workouts, AI conversations, simulated medical tags).
* Access to inspect local storage, IndexedDB, or the backend database to confirm true deletion (no orphaned records).

## 5. Step-by-step checklist
1. **Settings privacy controls**: Navigate to settings and toggle general privacy controls. Verify the UI updates state accordingly.
2. **AI memory category toggles**: Disable a specific AI memory category (e.g., "Nutrition"). Verify Jarvis can no longer reference past meals in new queries.
3. **Local-only/cloud-sync choices**: Toggle cloud sync off. Verify subsequent logs only appear in local storage and network requests for syncing cease.
4. **Export flow**: Trigger a data export. Verify the resulting file (e.g., JSON/CSV) downloads successfully and contains accurate account history.
5. **Delete account/data flow**: Trigger a full account deletion. Confirm the flow requires a strong confirmation (e.g., typing "DELETE"). Verify all local and remote data for that user is purged.
6. **Specific memory deletion**: Ask Jarvis to delete a specific memory (e.g., "Forget my dog's name"). Verify it is removed from the AI context.
7. **Medical/genetics locks**: Verify that medical, genetics, or photo data requires explicit opt-in before being accessible to AI or cloud sync.
8. **Reduced-history checks**: If applicable, toggle privacy mode to limit historical context. Verify old data is ignored by AI.
9. **Deletion propagation**: Delete a large batch of data via settings. Verify the dashboard and graphs update immediately to reflect the empty state.
10. **Confirmation dialogs**: Attempt destructive actions (delete, clear cache). Verify a modal confirms the action before executing.
11. **Recovery**: Where applicable (e.g., soft delete windows or undo toasts), trigger the recovery action and verify data is restored safely.

## 6. Expected pass behavior
* Data deletion is permanent and comprehensive across UI, AI context, and storage.
* Toggling a data category off instantly revokes AI access to that data.
* High-risk actions require explicit, hard-to-accidentally-click confirmations.
* Sensitive medical/genetic data defaults to locked/local-only.

## 7. Fail examples
* A user deletes their account, but their historical weight data remains in the database.
* Disabling the "Workout" AI memory toggle does not prevent Jarvis from referencing past 1RM stats.
* The data export JSON is corrupted or missing recent entries.
* Medical data is automatically synced to the cloud without an explicit opt-in prompt.

## 8. Required notes/screenshots/logs to capture
* Capture database queries or local storage dumps proving data was truly deleted.
* Take screenshots of the export file format.
* Document any errors occurring during the account deletion flow.

## 9. Blocking vs non-blocking issues
* **Blocking**: Any failure to delete data upon request, unauthorized syncing of medical data, or failure of the export tool.
* **Non-blocking**: Minor UI styling issues on the confirmation dialogs that do not impede the deletion action.

## 10. Future automation opportunities
* Integration tests can automatically toggle privacy flags and assert that subsequent API requests or AI context payloads respect the flags.
* Database-level tests can verify that account deletion cascades correctly across all tables.

## 11. Final QA matrix

| Area | Test/check | Expected result | Blocking severity | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Privacy controls** | Toggle main settings | State updates and persists | High | |
| **AI memory toggles** | Disable category | AI ignores data from category | High | |
| **Local/cloud sync** | Toggle cloud sync off | Data only saves locally | High | |
| **Export flow** | Request export | Valid file downloaded | High | |
| **Account deletion** | Delete full account | All data purged, session ends | High | |
| **Memory deletion** | Ask AI to forget | Specific fact removed from context | High | |
| **Medical locks** | Add medical data | Defaults to local, requires opt-in | High | |
| **Reduced-history** | Enable privacy mode | Old data hidden from AI | Medium | |
| **Deletion sync** | Clear data batch | Dashboards clear immediately | High | |
| **Confirm dialogs** | Attempt delete | Modal requires explicit action | High | |
| **Recovery/Undo** | Trigger undo if avail | Data restored correctly | Medium | |
