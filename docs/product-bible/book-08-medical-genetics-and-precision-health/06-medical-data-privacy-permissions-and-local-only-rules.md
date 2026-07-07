# 06. Medical Data Privacy, Permissions, and Local-Only Rules

## Privacy Principles for Medical Data

FitCore operates on a local-first philosophy (defined in Book 2), but medical and precision health data require an even stricter interpretation of that philosophy. The core principle is: **The user is the sole owner and absolute controller of their medical data.**

If the user does not explicitly grant permission for data to be stored, used by AI, or synced, FitCore must treat that data as if it does not exist.

## The Local-First Requirement

All medical data must be stored locally on the user's device by default. Cloud syncing of this data is strictly opt-in and must not be bundled with general app state syncing.

## Sensitive Categories Requiring Extra Locks

The following categories require explicit, granular permission checks before any action (storage, AI analysis, display, sync):
- Medical history (conditions, surgeries)
- Genetics
- Photos (especially body/progress photos or medical imaging)
- Conversations (if they contain medical disclosures)
- Injury notes and rehab protocols
- Medications
- Allergies
- Clinician records/notes

## The Permission Model

FitCore must implement a multi-layered permission model for sensitive data:

1.  **Store Permission:** Can the app save this data locally? (Required to use the feature).
2.  **AI-Use Permission:** Can the local/cloud AI read this data to generate insights or modify recommendations?
3.  **Cross-Screen-Use Permission:** Can this data be displayed outside of the Medical Profile (e.g., showing a medication warning on the Nutrition screen)?
4.  **Cloud-Sync Permission:** Can this data leave the device to be backed up or synced to another of the user's devices?
5.  **Export Permission:** Can this data be included in general data exports?
6.  **Sharing Permission:** Can this data be shared with external services (e.g., sending a summary to a PT)?

## Category-Level Toggles and Privacy Mode

Users must be able to toggle these permissions at the category level (e.g., "Sync injuries, but keep medications local-only").

FitCore should also support a "Reduced-History/Privacy Mode" where sensitive records are hidden from the main UI and AI context until the user authenticates (e.g., via FaceID/biometrics) to unlock them.

## Data Deletion

Deletion of medical data must be absolute and verifiable:
- **Full Deletion:** Deleting the app or account must wipe all local and (if applicable) cloud medical data.
- **Category Deletion:** Users can wipe all data in a specific category (e.g., "Delete all genetic data").
- **Memory Deletion:** If the AI has stored facts derived from medical data in its long-term memory (Book 2), deleting the source medical record must also purge the derived AI memory.
- **Medical Record Deletion:** Users can delete individual entries.
- **Confirmation Requirements:** Deleting sensitive data requires a clear, unmistakable confirmation prompt.

## Data Export

Users must have the ability to export their data freely:
- **Full Export:** A standard JSON/CSV export of all FitCore data.
- **Medical Export:** An export containing only the Medical Profile data.
- **Clinician/PT Summary Export:** A cleanly formatted, readable summary (e.g., PDF) designed to be handed to a healthcare professional, outlining current injuries, medications, and relevant training history.
- **Provenance Included:** All exports must include the provenance metadata (source, date, confidence) to ensure data integrity when viewed outside the app.

## Cloud Sync Restrictions

- **Opt-In Only:** Cloud sync for sensitive data is always off by default.
- **Local-Only Default:** The highest sensitivity categories (Genetics, Clinician Records) must default to local-only, requiring explicit, separate approval to sync, even if general Medical Profile sync is enabled.

## Permissions Matrix

| Data Category | Default Storage Mode | AI Use Allowed by Default? | Cloud Sync Allowed by Default? | Export Supported? | Delete Supported? | Extra Confirmation Required? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Injuries (Basic)** | Local | Yes (Training context) | No | Yes | Yes | No | Essential for safe workout generation. |
| **Medications** | Local | No | No | Yes | Yes | Yes | Requires explicit opt-in for AI analysis. |
| **Allergies** | Local | Yes (Safety exclusion) | No | Yes | Yes | No | AI must use this to exclude unsafe suggestions. |
| **Surgeries/Conditions**| Local | No | No | Yes | Yes | Yes | |
| **Genetics** | Local | No | No | Yes | Yes | Yes (Strict) | Highest privacy tier. |
| **Clinician Records** | Local | No | No | Yes | Yes | Yes (Strict) | Highest privacy tier. |
