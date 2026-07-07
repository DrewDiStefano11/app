# Settings & Privacy Current Behavior Audit

## 1. Purpose
To audit the Hub/Settings views, detailing user controls over profile data, app behavior, data export, AI memory, and identifying missing privacy locks.

## 2. Scope
This audit covers the `SettingsView` (Hub), profile configuration, data import/export, reset functionality, and Jarvis AI configurations (permission levels, auto-logging, memory clearing).

## 3. Source files inspected
- `src/components/app/views/settings.tsx`
- `src/components/app/jarvis/settings-card.tsx`

## 4. Current confirmed behavior
- Profile settings allow updating goal, experience, days/week, split, current/target bodyweight, and units.
- Reminder checkboxes exist for workouts, weigh-ins, and meals.
- Demo mode toggle is available to overlay sample data.
- Data export (downloads a JSON file) and import functionality are fully implemented.
- "Reset all data" clears local state.
- Jarvis settings include API key configuration, permission levels (1-4), response style, personality, and proactive suggestions.
- Granular "Auto-log" toggles exist (supplements, bodyweight, high-confidence meals, active workout suggestions).
- "Memory" controls allow clearing Jarvis learning history and activity audit logs.

## 5. Current missing or unclear behavior
- Explicit privacy/security locks (e.g., locking medical/genetics/photos or conversations behind biometric auth) are missing.
- No "reduced-history" or "incognito" mode for the app or Jarvis conversations.
- No explicit toggle to disable local-only storage (the app is entirely local-only by default, but there is no cloud-sync option to toggle).

## 6. Data created or updated by this flow
- Modifies `profile` object in global state.
- Modifies `jarvisSettings` object.
- Modifies `demoMode` boolean.
- Modifies `reminders` object.
- Replaces entire state if Import or Reset are used.

## 7. Downstream displays/graphs/summaries affected
- All app views are affected by profile updates (e.g., goal changes affect macro targets) and data resets.
- Jarvis interaction flows respect the permission levels and auto-log toggles set here.

## 8. AI/Jarvis interaction points
- Jarvis behavior is deeply configured here (LLM provider, personality, permission level).
- AI memory clearing features exist to reset Jarvis context.

## 9. Privacy/safety concerns
- Lack of an explicit lock for sensitive conversations or data means anyone with access to the unlocked device can read all fitness/AI data.
- Exported JSON files are unencrypted plaintext.

## 10. Demo/test account concerns
- The Demo Data toggle is prominently available in Settings for easy testing.

## 11. Known risks
- Importing a malformed JSON file could corrupt the local state if `importJson` validation is insufficient.
- "Reset all data" is destructive and relies entirely on a single confirmation dialog.

## 12. Recommended future implementation work
- Implement privacy locks (e.g., PIN/biometric) for accessing the app or specific sensitive sections (like Jarvis chat history).
- Add functionality to encrypt exported backups.

## 13. Acceptance criteria for future fixes
- A "Require authentication to open" toggle exists and utilizes WebAuthn or similar browser APIs.

## 14. Do-not-touch boundaries for future PRs
- Do not remove the "Clear Jarvis activity history" buttons, as these are critical for AI transparency and debugging.

## 15. Final audit table

| Area | Current behavior | Source checked | Gap/risk | Future action |
|---|---|---|---|---|
| Profile Settings | Goal, experience, weight, units | `src/components/app/views/settings.tsx` | None | None |
| Data Export/Reset | Full JSON export, import, reset | `src/components/app/views/settings.tsx` | Exports are unencrypted | Add optional encryption |
| AI Settings | Permission levels, personality, auto-log toggles | `src/components/app/jarvis/settings-card.tsx` | None | None |
| Privacy Controls | None explicit (relies on local-first architecture) | `src/components/app/views/settings.tsx` | No app-level lock | Implement biometric/PIN lock |
