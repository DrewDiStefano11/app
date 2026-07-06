# Privacy and Data Permissions Spec

## Purpose

FitCore handles deeply personal information, including bodyweight, nutrition, recovery notes, and AI-generated coaching logs. This document defines the privacy principles and permission structures required to maintain user trust and comply with health data expectations.

## Product Rule Alignment

- **Improve trust in the data:** By ensuring the user knows exactly where their data is and who (or what) has access to it.
- **Explain what changed:** By being transparent about how data is used for AI recommendations.

## User Problems Solved

- "Is my health data being sent to a server?"
- "Can I delete everything I've logged?"
- "Why does Jarvis need to know about my soreness?"
- "I don't want the AI to see my private notes."

## Data Sensitivity Categories

1.  **Public/Generic:** Exercise names, calorie targets (Non-sensitive).
2.  **Personal Fitness:** Workouts, sets, reps, cardio logs (Medium sensitivity).
3.  **Personal Health:** Bodyweight, sleep, nutrition logs, photos (High sensitivity).
4.  **Qualitative/Contextual:** Pain notes, injury details, fatigue notes, recovery signals (Very high sensitivity).
5.  **Metadata:** Jarvis logs, audit trails, provenance (Medium sensitivity).

## Permission Principles

- **Local-First by Default:** All data remains on the user's device in `localStorage`.
- **Explicit Opt-In:** Access to external sensors (Camera, Apple Health) requires explicit user permission.
- **Granular AI Access:** Users should be able to toggle what data Jarvis can "see" (e.g., "Allow Jarvis to read nutrition logs: Yes/No").

## AI/Jarvis Privacy Behavior

- **Processing Context:** Jarvis should only use the minimum data necessary to answer a query or provide a recommendation.
- **No Training on User Data:** Personal fitness/health data is not used to train global AI models.
- **Ephemeral AI Context:** Data sent to the AI provider (e.g., Groq, Gemini) for processing should be treated as ephemeral and not stored by the provider beyond the session (subject to provider TOS).

## Camera/Photo Privacy Behavior

- **Local Storage:** Photos are stored as base64 or local blobs.
- **On-Device Estimation:** Where possible, AI estimation from photos should happen locally or via a privacy-preserving proxy.
- **User Review:** Photos are never "scanned" or "uploaded" without the user initiating a logging action (e.g., "Estimate calories from this photo").

## Health/Wearable Data Privacy Behavior

- **Read-Only by Default:** FitCore should treat wearable data as a source of truth for recovery metrics but not overwrite manual user inputs.
- **Manual Overrides:** Users can always override data imported from Apple Health or Health Connect.
- **Provenance Tracking:** All imported health data must be tagged with `source: "wearable"` or `source: "apple-health"`.

## Local Storage Expectations

- Data is stored in `localStorage` under the `fitcore.v1` key.
- Clearing the browser's "Site Data" will delete this information.
- Users are responsible for their own backups via the Export tool.

## Export/Delete Expectations

- **Right to Delete:** The "Reset Data" button must permanently and completely remove all data from local storage.
- **Right to Export:** Users must be able to export their data in a machine-readable format (JSON) at any time.

## User Trust Rules

1.  **No Silent Uploads:** FitCore never uploads health data to a proprietary server without explicit user consent.
2.  **No Diagnosis:** Jarvis must never provide medical diagnoses, especially regarding pain or injury.
3.  **Clear Labeling:** Data used to drive a recommendation must be cited (e.g., "Based on your 6 hours of sleep...").

## Guardrails

- Jarvis is prohibited from accessing or discussing data the user has marked as "private" (Future feature).
- Sensitive "Pain" or "Injury" notes are used only for workout safety warnings and are never shared or exported to 3rd party AI for non-essential processing.

## Future Implementation Checklist

- [ ] Implement granular privacy toggles in Jarvis Settings.
- [ ] Add "Private" flag for specific workout or recovery notes.
- [ ] Implement "Auto-Purge" for old Jarvis audit logs.
- [ ] Create a "Privacy Report" that shows the user exactly what data has been accessed by Jarvis in the last 7 days.
