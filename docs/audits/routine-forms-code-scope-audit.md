# Routine Forms Code Scope Audit

## Purpose
This document audits the technical scope and planning required for implementing the "Morning Check-In" and "Night Review" routine forms. It defines the implementation phases, state requirements, and placement rules to integrate these hybrid compact/expandable forms seamlessly into the FitCore layout without overloading existing check-in mechanisms.

## Current Check-in/Sleep/Recovery Data Paths Inspected
Based on the current architecture:
- Generic check-ins are handled via `CheckInSheet` (likely mapped in `src/components/app/views/home.tsx` or related popup files).
- Global state (`src/lib/types.ts`, `src/lib/store.tsx`) likely stores generic `checkIns` or `recoveryLogs`.
- `ReadinessDetailSheet` and related sheets handle specific recovery focuses.

## Current Today/Home Placement Opportunities
- The forms should appear conditionally on the Today view (`src/components/app/views/home.tsx`), likely above the Quick Actions or near the top of the feed.
- They must only appear when due based on the defined time windows (5 AM - 12 PM for Morning, 7 PM - 2 AM for Night).
- Completed forms need a summary state to remain visible but unobtrusive.

## Current Recovery History Placement Opportunities
- The Recovery view (`src/components/app/views/recovery.tsx`) is the logical place to display the history and trends of completed Morning and Night forms, likely under a specific deep dive subtab in the future (e.g., `Check-Ins` or `Overview`).

## Likely State/Store/Data Files Involved
- `src/lib/types.ts`: Define interfaces for `MorningCheckIn` and `NightReview` data structures, ensuring they encompass the specific required fields (sleep, mood, soreness, etc.).
- `src/lib/store.tsx`: Update state to persist history of these forms and track their daily completion status.
- `src/lib/utils.ts` or a new date helper: Logic to accurately determine if the current time falls within the due windows, handling timezone edges.

## UI Files Likely Involved
- `src/components/app/views/home.tsx`: Conditional rendering logic for the forms on the Today screen.
- `src/components/app/views/recovery.tsx`: History display logic.
- **New Files**: `src/components/app/routine-forms.tsx` or similar feature-local components to contain the complex hybrid compact/expandable UI, keeping `home.tsx` clean.

## Files to Avoid While Current PRs are Active
Do **not** modify the following files while baseline layout PRs are unmerged or while PRs #2, #14, and #34 are parked:
*   `src/components/app/views/home.tsx`
*   `src/routes/index.tsx`
*   `src/components/app/views/hub/hub.tsx`
*   `src/components/app/views/training.tsx`
*   `src/components/app/active-workout.tsx`
*   `src/components/app/views/nutrition.tsx`
*   `src/components/app/views/recovery.tsx`
*   `src/components/app/layout-primitives.tsx`

## Exact Implementation Phases
1.  **UI shell only**: Create the visual React components for the hybrid compact/expandable forms (Morning and Night) using mock data.
2.  **Due-window behavior**: Implement the time-checking logic to display the shells on the Today view only during the 5 AM-12 PM and 7 PM-2 AM windows. Ensure only one shows at a time.
3.  **Store/persistence wiring**: Connect the form inputs to the global store, allowing users to complete and save the forms. Implement the collapse-into-summary state upon completion.
4.  **Recovery history display**: Render the history of completed forms within the Recovery tab.
5.  **Data propagation into scores/insights**: Ensure the specific metrics gathered (sleep, pain, stress) flow into the `FitcoreScore` calculation and Insight models.
6.  **Jarvis note intake later**: Allow Jarvis to parse conversational input (e.g., "I slept terrible") and pre-fill or log these specific check-in forms.

## Risk Areas
*   **Duplicate check-in data**: Confusing these new specific forms with the existing generic "Check In" action.
*   **Overlapping morning/night fields**: Maintaining distinct schemas while handling overlapping concepts (like mood or soreness).
*   **Time-window bugs**: Forms not appearing or disappearing at the right times, especially across midnight.
*   **Timezone behavior**: Ensuring "5 AM" means local user time, not UTC.
*   **Pain/soreness propagation**: Ensuring pain logged here properly updates the `BodyMap` and training readiness, and doesn't get trapped in the form data.
*   **Accidental schema/migration changes**: Introducing these new types must be backwards compatible with existing local storage.
*   **Overloading existing generic check-in behavior**: The existing generic check-ins might need to be deprecated or re-routed once these routine forms are fully operational.

## Acceptance Criteria
- [ ] Exactly two routine forms exist: Morning Check-In and Night Review.
- [ ] Morning form appears only 5 AM – 12 PM. Fields: sleep quality, sleep duration, energy, mood, stress, soreness, pain, readiness feeling, constraints, notes.
- [ ] Night form appears only 7 PM – 2 AM. Fields: day reflection, workout reflection, nutrition reflection, pain/soreness changes, fatigue, mood/stress, notes for tomorrow.
- [ ] Only one due form shows at a time on the Today view.
- [ ] Overdue forms can temporarily move higher in layout priority.
- [ ] Completed forms collapse into concise summaries.
- [ ] Recovery section stores and displays form history.
- [ ] Random pain/soreness/fatigue notes can be ingested via Jarvis as well.

## Manual QA Notes
- Test edge cases around 11:59 AM, 12:00 PM, 6:59 PM, and 7:00 PM local time.
- Verify behavior when the app is left open across a window boundary (e.g., open at 11:50 AM, check back at 12:10 PM).
- Ensure completing a form persists the data across page reloads.
- Verify that pain logged in a morning check-in is visible in the Recovery Body Map.