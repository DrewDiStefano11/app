# Check-in Current Behavior Audit

## 1. Purpose
To audit the current daily recovery check-in implementation, detailing the fields captured, data flow, and interactions with the broader app ecosystem.

## 2. Scope
This audit covers the entry of check-ins, the specific metrics tracked, downstream effects, and missing functionality like editing and AI interaction limits.

## 3. Source files inspected
- `src/components/app/views/recovery.tsx`
- `src/components/app/popups/quick-popups.tsx`
- `src/lib/daily-decision.ts`

## 4. Current confirmed behavior
- Check-ins are entered via a bottom sheet popup (`CheckInSheet`).
- Fields captured via 1-10 sliders: Energy, Soreness/Fatigue (inverted), Mood/Stress (inverted), and Motivation.
- Sleep data (hours and quality 1-10) can be optionally captured in the same sheet.
- Text notes can be added.
- Submitting the check-in immediately calculates a "Readiness" score and appends the log to `recoveryCheckIns`.

## 5. Current missing or unclear behavior
- There is no visible flow to correct or edit a check-in once submitted.
- Deletion of check-ins is not exposed in the UI.

## 6. Data created or updated by this flow
- `recoveryCheckIns`: Array containing `{ id, energy, soreness, stress, motivation, notes, createdAt }`.
- `sleepEntries`: (Optional) Array containing `{ id, hours, quality, createdAt }`.

## 7. Downstream displays/graphs/summaries affected
- Recovery View (`ReadinessTab` shows history, Readiness score, and recommendations).
- Dashboard Readiness indicators (`home.tsx`).
- Progress View graphs (via `getProgressSeries` in `fitcore-data.ts`).

## 8. AI/Jarvis interaction points
- The Daily Decision engine uses the latest check-in to assess recovery capacity and modulate training intensity recommendations.
- Missing check-ins prompt Jarvis to suggest "Log today's recovery check-in."

## 9. Privacy/safety concerns
- User notes may contain sensitive mental health or personal information.

## 10. Demo/test account concerns
- Demo mode creates realistic check-in data to populate the Readiness history.

## 11. Known risks
- Users cannot fix a typo in their check-in, potentially skewing Readiness scores until the next day.
- Submitting multiple check-ins in a single day is allowed, but the Daily Decision engine only reads the *latest* one.

## 12. Recommended future implementation work
- Add edit and delete capabilities for check-ins.
- Prevent or handle multiple check-ins on the same day more gracefully (e.g., offer to overwrite the existing one).

## 13. Acceptance criteria for future fixes
- Users can access a check-in edit sheet from the Readiness history view.
- Edited check-ins update the original log rather than creating duplicates.

## 14. Do-not-touch boundaries for future PRs
- Do not modify the Readiness score calculation algorithm (`(energy + motivation + (10 - soreness) + (10 - stress)) / 40 * 100`) without product approval.

## 15. Final audit table

| Area | Current behavior | Source checked | Gap/risk | Future action |
|---|---|---|---|---|
| Input Fields | Sheet captures Energy, Soreness, Stress, Motivation, Sleep, Notes | `src/components/app/popups/quick-popups.tsx` | None | None |
| Correction/Deletion | Not implemented in UI | `src/components/app/views/recovery.tsx` | Typos skew readiness data | Implement edit/delete flow |
| Multiple Logs | Appends to list, engine uses latest | `src/lib/daily-decision.ts` | Clutters history | Handle same-day overwrites |
