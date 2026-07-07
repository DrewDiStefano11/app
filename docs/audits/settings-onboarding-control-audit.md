# Settings, Onboarding, and User Control Audit

## Executive summary

This audit provides a comprehensive map of the current state of FitCore's onboarding flow, settings screens, and user control surfaces, identifying critical gaps before the next phase of implementation.

Currently, the app implements a basic linear onboarding sequence and a central Hub/Settings view. However, there are significant gaps in user privacy controls, AI memory management, granular data deletion, and detailed profile configuration. Demo mode currently presents data isolation risks, and the notification system is rudimentary. The current architecture successfully captures essential targets (calories, macros, splits) but lacks the robust permission and data provenance scaffolding required for a secure, local-first health application as outlined in the Product Bible.

## Scope

This audit maps current user-control surfaces and identifies gaps before future implementation starts. It focuses on:
- Settings entry points
- Onboarding behavior
- User profile controls
- Privacy and sensitive-data controls
- AI memory controls
- Demo mode controls
- Notification and daily-experience controls
- Data deletion/export controls
- Safety and permission model

This is a docs-only audit and does not alter runtime behavior.

## Files inspected

- `src/components/app/views/settings.tsx` (Hub/Settings view)
- `src/components/app/views/onboarding.tsx` (Initial onboarding flow)
- `src/components/app/jarvis/jarvis-panel.tsx` (Jarvis AI interface & logic)
- `src/components/app/jarvis/settings-card.tsx` (Jarvis API & behavior settings)
- `src/components/app/jarvis/goals-profile-card.tsx` (Extended user profile settings)
- `src/components/app/jarvis/activity-view.tsx` (AI audit/activity log)
- `src/lib/store.tsx` (App state provider and hydrator)
- `src/lib/types.ts` (Data schemas, profiles, and state definitions)
- `src/lib/fitcore-data.ts` (Data serialization and schemas)
- `src/lib/demo-data.ts` (Demo state builder)
- `docs/architecture/local-state-and-sync-contract.md` (Architecture principles)
- `docs/product/privacy-and-data-permissions-spec.md` (Privacy and permissions)
- `docs/audits/dashboard-graph-data-consistency-audit.md` (Known demo mode risks)

## Current settings/onboarding inventory

### Onboarding Behavior
- **Exists:** Yes, located in `src/components/app/views/onboarding.tsx`.
- **Flow Type:** Sequential screen-based flow (Welcome > Goal > Experience > Split > Weight > Macros > Done).
- **Data Requested:** Primary goal, training experience level, days per week, preferred split, current bodyweight, target bodyweight, and macro targets (calories, protein, carbs, fat).
- **Skippable:** No. The user must progress through all steps to complete onboarding.
- **Persistence:** Yes. Completing the flow sets `onboardingComplete: true` in the `AppState` which persists to `localStorage`.
- **App State Effects:** Directly sets the initial `profile` and `nutritionTargets` in the global state. These set the baseline for the app's functionality and AI context.

### Settings Entry Points
- **Opened From:** The main Home dashboard (`src/components/app/views/home.tsx`) via a settings gear icon in the header.
- **Current Controls:**
  - `JarvisSettingsCard`: AI Provider, API Keys, Permissions, Response Style.
  - `GoalsProfileCard`: Goal, Bodyweight, Nutrition Targets, Injury Areas, Supplement Routine, Usual Meals.
  - Profile (Basic): Goal, Experience, Days/week, Split, Bodyweight, Target, Units.
  - Reminders: Basic checkboxes for Workout, Weigh-in, Lunch.
  - Demo Data: Toggle switch.
  - Data: Export Backup, Import Backup, Reset All Data.
  - About: App version and basic privacy text.
- **Missing Controls:** Privacy settings, AI Memory management, Notification/DND schedules, granular export/deletion.
- **Format:** The Settings view is currently a screen-based view containing local component UI cards.

## Current user-control inventory

### User Profile Controls
- **Fields Stored:**
  - In `Profile` (`src/lib/types.ts`): goal, experience, daysPerWeek, split, bodyweightLb, targetBodyweightLb, units, name, age, sex, heightIn, trainingAgeYears, preferredWorkoutDays, preferredWorkoutTime, sessionLengthMin, favoriteMuscles, weakMuscles, exercisesToAvoid, equipment, gymOrHome.
  - In `UserGoalsProfile` (`src/lib/types.ts`): calorieGoal, proteinGoal, carbGoal, fatGoal, fiberGoal, weeklyWeightChangeLb, normalWorkoutDays, normalWorkoutTime, weakPoints, injuryAreas, supplementRoutine, normalWeighInTime, foodPreferences, dislikedFoods, usualBreakfast, usualLunch, usualDinner, usualSnack, usualProteinShake, usualPreWorkoutMeal, usualPostWorkoutMeal.
- **UI Visibility:**
  - Basic settings (`settings.tsx`) exposes: goal, experience, days/week, split, bodyweight, target bodyweight, units.
  - `GoalsProfileCard` exposes: extended goal, bodyweight, target bodyweight, weigh-in time, weak points, injury areas, supplement routine, and usual meals.
- **Edit/Delete Behavior:** Fields can be edited via `<Input>` and `<Select>` components. Deletion is handled by clearing inputs (which sets values to empty strings or `undefined`).
- **Persistence:** Changes are immediately dispatched to `useStore().set()` and persist to `localStorage`.
- **Cross-screen Effects:** Profile data influences the FitCore Score, macro targets, and Jarvis AI context (`buildAICoachContext` includes these fields).

## Privacy and sensitive-data control table

| Feature | Status | Notes |
| :--- | :--- | :--- |
| Control data categories | Not Yet Implemented | Users cannot currently select which categories of data to track or ignore. |
| Delete specific data | Partial | Users can delete specific logs (e.g., workouts, meals) via their respective UI views, but not bulk-delete by category. |
| Export data | Current | Full JSON export is available in Settings. |
| Local-only clarity | Current | "About" section in settings explicitly states: "Data stays on this device. No accounts, no tracking." |
| Separate medical data | Not Yet Implemented | Medical data is not structurally isolated from general app state. |
| Separate genetics data | Not Yet Implemented | No genetics data schema currently exists. |
| Separate photos | Not Yet Implemented | Progress photos exist in state but lack separate privacy controls. |
| Separate conversations | Not Yet Implemented | AI messages are stored in main state; no separate privacy control. |
| Separate injury notes | Not Yet Implemented | Injury areas are stored in `UserGoalsProfile` but lack separate privacy controls. |
| Separate medical/allergy | Not Yet Implemented | No specific fields for these currently exist. |
| Separate AI memories | Not Yet Implemented | AI Learning is in state but lacks separate privacy controls. |
| Extra confirmation for sensitive actions | Partial | Global reset requires confirmation (`ConfirmDialog`). Individual deletions (e.g., in Jarvis Activity) do not. |

## AI memory and explainability table

| Feature | Status | Notes |
| :--- | :--- | :--- |
| AI memory categories exist | Not Yet Implemented | State has a generic `jarvisLearning: Record<string, unknown>` but no structured categories. |
| Toggle memory categories | Not Yet Implemented | Users cannot toggle what the AI remembers. |
| Delete specific memories | Future | `jarvisLearning` lacks a UI for editing or deleting specific learned facts. |
| Ask why AI knows something | Planned | Users can ask Jarvis via chat, but there is no dedicated UI provenance explorer. |
| Recommendations expose source data | Partial | Jarvis Activity view shows the tool used and original text, but recommendations within the app UI often lack explicit provenance badges. |
| AI memory separated from normal app state | Current | `jarvisLearning` and `aiMessages` are top-level keys in `AppState`, though they share the same persistence mechanism. |

## Demo mode control risks

- **Enable/Disable Location:** Toggle switch located in `src/components/app/views/settings.tsx`.
- **State vs. View Effects:** The toggle modifies the `demoMode` boolean in `AppState`. The application uses a derived `view` state (merging `state` and `demoData`) for many visualizations (e.g., Home dashboard), while other screens (e.g., Progress, Nutrition) rely strictly on `state`.
- **Write Risk:** **High**. As noted in the dashboard graph consistency audit, because some screens rely on `state` and others on `view`, performing manual actions (logging, editing) while Demo Mode is active risks intermingling real user data with demo states or permanently altering the persistent store based on demo context.
- **Visibility:** Current demo mode toggle is clear in settings, but there is no persistent global indicator (e.g., a banner) showing that Demo Mode is active while browsing the app.
- **Reset/Exit Behavior:** Toggling the setting off immediately reverts the `view` to the persistent `state`. However, any data mutated *during* demo mode may persist if not carefully sandboxed.

## Notification/daily-experience control table

| Feature | Status | Notes |
| :--- | :--- | :--- |
| Morning briefing | Planned | Not currently implemented. |
| Workout readiness briefing | Planned | Not currently implemented. |
| Post-workout check-in | Planned | Not currently implemented. |
| Bedtime/day recap | Planned | Not currently implemented. |
| Do Not Disturb (DND) | Future | Not currently implemented. |
| Busy detection | Future | Not currently implemented. |
| One-sentence summary mode | Future | Not currently implemented. |
| Basic Reminders | Current | Basic boolean toggles for Workout, Weigh-in, and Lunch exist in `state.reminders` but lack scheduling logic. |

## Data deletion/export readiness table

| Feature | Status | Notes |
| :--- | :--- | :--- |
| Full app data deletion | Current | "Reset all data" button exists in Settings, clears `localStorage`. |
| Category deletion | Planned | Users cannot currently say "Delete all my nutrition data." |
| AI memory deletion | Planned | No UI exists to delete `jarvisLearning` items. |
| Medical/sensitive deletion | Future | Medical categories are not yet formalized. |
| Export full data | Current | `exportJson` generates a complete `AppState` JSON file. |
| Export medical summary | Future | Not implemented. |
| Export training/nutrition history | Planned | Cannot export specific sub-sections of data. |
| Confirmation requirements | Current | Full reset uses `ConfirmDialog`. Import provides a temporary success/fail message. |

## Safety and permission model

- **Opt-in Data:** All data is currently provided voluntarily via onboarding or manual logging. External integrations (Apple Health) are not yet implemented.
- **Data Used by AI:** Jarvis receives extensive context via `buildAICoachContext`, including profile, goals, active workouts, recent meals, recovery metrics, and audit history.
- **Cross-screen Data Visibility:** Most data is globally available via `useStore().state`.
- **Future Sync Risks:** If cloud sync is introduced, the current monolithic `AppState` will require careful segmentation to ensure sensitive data (medical, photos, AI memory) remains local-only as per Book 8.
- **Missing Permissions:**
  - Granular consent for AI data access (e.g., "Allow AI to see my weight").
  - System permissions for Camera/Photos (currently assumes browser defaults).
  - Explicit confirmation for AI mutative actions outside of active workouts.

## Known gaps

1.  **AI Memory Controls:** There is no UI for a user to see, edit, or delete what Jarvis has "learned" about them in `jarvisLearning`.
2.  **Privacy Controls:** Sensitive data (injury notes, photos) are stored alongside generic data without specific privacy safeguards or opt-outs.
3.  **Onboarding Skipping:** Onboarding is currently rigid; users cannot skip steps or opt-out of providing certain data (e.g., bodyweight) easily.
4.  **Demo Mode Sandboxing:** Interacting with the app while Demo Mode is active poses a risk of data corruption.
5.  **Export/Deletion Granularity:** Users can only export or delete *everything*, lacking the ability to manage specific categories.
6.  **Notification System:** The notification toggles are placeholders; there is no scheduling, DND, or rich daily briefing implementation.

## Recommended future implementation sequence

1.  **Phase 1: Demo Mode Safety (Crucial)**
    *   Implement strict read-only enforcement when Demo Mode is active, or ensure all mutations are routed to a volatile state layer that is discarded when Demo Mode is disabled. Add a global visual indicator for Demo Mode.
2.  **Phase 2: AI Memory UI**
    *   Create a new section in Settings (or an expanded Jarvis card) that lists entries in `jarvisLearning`. Allow users to view and delete individual memories.
3.  **Phase 3: Granular Data Management**
    *   Enhance the Data settings section to allow categorical export and deletion (e.g., "Export Workouts", "Delete Nutrition Logs").
4.  **Phase 4: Privacy Settings Structure**
    *   Create a dedicated Privacy Settings view to manage what data Jarvis can access and prepare the schema for future medical/genetics separation (Book 8).
5.  **Phase 5: Onboarding Flexibility**
    *   Update `onboarding.tsx` to allow users to skip non-essential steps and clearly explain why data (like bodyweight) is being requested.

## Stop conditions for future agents

- Do not implement any runtime UI changes to Settings or Onboarding during this audit phase.
- Do not attempt to fix the Demo Mode state/view issue in this PR.
- Do not create new state variables for privacy or notifications until the foundational architectures are approved.
- Rely solely on `docs-only` modifications for this specific task.

## Validation performed
- Verified current state structure in `src/lib/types.ts`.
- Inspected UI components (`settings.tsx`, `onboarding.tsx`, `jarvis-panel.tsx`) for existing controls.
- Reviewed Product Bible documentation (Book 5, Book 8) and previous audits for context.
- Confirmed no runtime changes were made during this audit.