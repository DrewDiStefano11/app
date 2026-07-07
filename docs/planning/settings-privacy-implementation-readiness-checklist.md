# Settings & Privacy Implementation Readiness Checklist

## Purpose
This document outlines the planning and readiness checklist for implementing settings and privacy controls in FitCore. The goal is to ensure user trust, comply with data protection principles, and establish safe boundaries before real testing begins. Note: This is a planning document only; these systems are not yet implemented.

## Scope
This checklist covers user-facing privacy settings, data localization rules, export/deletion paths, and specific protections for highly sensitive data categories across the FitCore ecosystem.

## Product Bible Sources Checked
- Book 8: Medical, Genetics, and Precision Health (for extra-lock requirements)
- Book 9: Analytics, Insights, and Health Twin (for aggregation privacy rules)
- Book 10: Testing, QA, and Platform Engineering (reference guidance)

*(Note: Book 6 is reserved/future-domain and not evaluated here. Unmerged planning files are excluded.)*

## Privacy Settings That Must Exist Before Real Testing
- Opt-in for AI processing of personal health data.
- Opt-in for cloud syncing (defaulting to local-only for sensitive data).
- Toggle for anonymous analytics/usage telemetry.
- Visibility controls for social/sharing features (if applicable).
- Clear account deletion and data export triggers.

## Data Categories Requiring Controls
- Basic Profile (Age, Height, Weight)
- Nutrition Logs
- Workout & Training Logs
- Sleep & Recovery Metrics
- Wearable/Imported Data
- Medical & Genetics (High Sensitivity)
- Photos & Media
- Jarvis Conversations

## Local-Only vs Cloud-Sync Decision Points
- **Local-Only by Default:** Medical profiles, genetics, photos, and personal conversations.
- **Cloud-Sync Optional:** Nutrition, training, and standard recovery data.
- Syncing must require explicit user opt-in and clarify what data leaves the device.

## Medical/Genetics/Photos/Conversations Extra-Lock Requirements
- These categories demand strict, local-first storage.
- Explicit, granular opt-in is required before this data can be utilized by AI or synced to the cloud.
- AI usage of this data acts strictly as a support layer and must never diagnose conditions.

## Export/Delete Account Requirements
- **Export:** Users must be able to export their complete dataset in a standard format (e.g., JSON/CSV).
- **Deletion:** Account deletion must comprehensively wipe user data across local storage, cloud backups, and AI memory states.

## Reduced-History/Privacy Mode Future Note
- Future phases may introduce a "Privacy Mode" or "Reduced History" feature, limiting historical data retention (e.g., auto-deleting logs older than 30 days) for users seeking minimized data footprints.

## Implementation Readiness Checklist
- [ ] Review Product Bible privacy mandates.
- [ ] Define data schema for user privacy preferences.
- [ ] Implement local-first storage logic for high-sensitivity data.
- [ ] Build user-facing settings UI for privacy toggles.
- [ ] Build and test data export mechanism.
- [ ] Build and test comprehensive account deletion (including AI memory wipe).
- [ ] Enforce settings across all data ingestion and AI evaluation endpoints.

## Unsafe Implementation Examples
- Defaulting medical data to cloud sync without prompt.
- Storing unencrypted user photos on generic cloud endpoints.
- "Soft deleting" user accounts while retaining training/nutrition logs for generic AI training.
- Mixing sensitive genetic insights directly into the standard FitCore Score without explicit breakdown boundaries.

## Final Readiness Matrix

| Feature | Category | Planned State | Readiness Status |
|---|---|---|---|
| AI Data Processing | General | Explicit Opt-In required | Needs Implementation |
| Cloud Sync | General | User Toggle (Default Off for sensitive) | Needs Implementation |
| Analytics Telemetry | System | User Toggle | Needs Implementation |
| Medical/Genetics Storage | Sensitive | Local-only by default | Needs Implementation |
| Account Deletion | Core | Full wipe across local/cloud/AI | Needs Implementation |
| Data Export | Core | JSON/CSV package | Needs Implementation |
