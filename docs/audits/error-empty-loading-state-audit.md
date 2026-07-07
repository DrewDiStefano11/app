# Error, Empty, and Loading State Audit

Date: July 7, 2024
Branch/Task: audit-error-empty-loading-states

**Note: This is a docs-only audit task and does not change any runtime behavior.**

## Executive Summary

- **Empty States:** The app provides basic `<EmptyState>` UI components (e.g., in `src/components/app/views/training.tsx`, `nutrition.tsx`, `progress.tsx`, `recovery.tsx`, and `active-workout.tsx`). However, components like Home dashboard widgets (e.g., VolumePreview, MacroBar) often use zero values, empty UI blocks, or "No Data" indicators without clear next actions.
- **Loading States:** Currently, most data is loaded synchronously from LocalStorage. True loading states (skeletons or spinners) are absent because network requests are not primary yet, except for AI (Jarvis) interactions which imply processing time.
- **Error States:** LocalStorage parsing is wrapped in `try/catch` in `src/lib/fitcore-data.ts`, but silent failures might result in fallback to default states without notifying the user. AI parsing (`try/catch` in AI tools) could silently drop data or present unclear results without recovery paths.
- **Stale Data:** Stale data risk is medium. Relying entirely on LocalStorage without a sync status indicator means users might see outdated data on different devices.
- **Recovery Paths:** Recovery actions (e.g., "retry," "refresh") are largely missing in the UI, especially for failed AI interactions or invalid stored data.

## Files Inspected

- `src/components/app/views/home.tsx`: Evaluated for dashboard empty states and missing data presentation (e.g., `EmptyMini`).
- `src/components/app/views/training.tsx`: Checked for workout empty states (`EmptyState` for cardio, workouts, PRs).
- `src/components/app/views/nutrition.tsx`: Examined for missing meal data states.
- `src/components/app/views/progress.tsx`: Inspected for missing weigh-ins, photos, and goals.
- `src/components/app/views/recovery.tsx`: Reviewed for missing recovery check-ins.
- `src/components/app/active-workout.tsx`: Looked for active workout empty state ("No exercises yet").
- `src/components/app/jarvis/jarvis-panel.tsx`: Checked for loading/error indicators during AI interactions.
- `src/lib/store.tsx`: Inspected hydration flow, default states, and state merging logic.
- `src/lib/fitcore-data.ts`: Analyzed `try/catch` blocks for local storage hydration and JSON payload validation.
- `src/lib/daily-decision.ts`: Examined daily recommendation fallback behavior when data (sleep, recovery, workouts) is missing.
- `src/lib/jarvis/tools.ts`: Looked for error handling and recovery paths for failed AI tools and commands.

## State Inventory Table

| Screen / Feature       | Empty State Present?       | Loading State Present? | Error State Present? | Stale/Offline State Present? | Recovery Action Present? | User Impact                   | Risk Level | Notes                                     |
| :--------------------- | :------------------------- | :--------------------- | :------------------- | :--------------------------- | :----------------------- | :---------------------------- | :--------- | :---------------------------------------- |
| Home Dashboard         | Yes (Basic "No Data")      | No                     | No                   | No                           | No                       | Users may see blank charts    | Medium     | `EmptyMini` is used but lacks CTA.        |
| Training Screen        | Yes (`EmptyState`)         | No                     | No                   | No                           | No                       | Good guidance on what to log  | Low        | Clear instructions given.                 |
| Active Workout         | Yes ("No exercises yet")   | No                     | No                   | No                           | No                       | Stops confusion               | Low        | Good empty state.                         |
| Nutrition Screen       | Yes (`EmptyState`)         | No                     | No                   | No                           | No                       | Tells user to log meals       | Low        | Clear empty state.                        |
| Progress Graphs        | Yes (`EmptyState`)         | No                     | No                   | No                           | No                       | Empty charts might confuse    | Medium     | Tells users to track weekly.              |
| Recovery Screen        | Yes (`EmptyState`)         | No                     | No                   | No                           | No                       | Good guidance on check-ins    | Low        | Clear empty state.                        |
| Jarvis Assistant       | No                         | Implicit (Processing)  | No (Silent fails)    | No                           | No                       | User left waiting or confused | High       | Needs clearer error/loading states.       |
| LocalStorage Hydration | No (Falls back to default) | No                     | No (Silent fallback) | No                           | No                       | Data loss feels silent        | High       | Uses `try/catch`, returns `defaultState`. |
| AI Macro Estimation    | No                         | No                     | No (Silent fails)    | No                           | No                       | User might not know it failed | High       | Failed estimates just don't log.          |

## Empty State Risks

- **Blank Cards/Charts:** The Home dashboard charts (`VolumePreview`) can show "No Data" or flatlines when data is 0, which might not encourage action as effectively as a dedicated CTA.
- **First-Time User Experience:** A completely fresh state results in many "No Data" sections, making the app feel empty rather than guiding the user.
- **Zero Values vs. No Data:** It is sometimes ambiguous whether a value of `0` means the user hasn't logged anything, or if their calculated metric is actually zero.
- **Missing CTAs:** Some empty states explain what is missing but don't offer a button to immediately add it.
- **Cleared Data:** Resetting or clearing data defaults the app without a confirmation message of the reset state.

## Loading State Risks

- **App Hydration:** The app currently loads synchronously from LocalStorage, but if data grows large or cloud sync is introduced, hydration will need a loading screen.
- **AI/Jarvis Responses:** AI interactions require time to process. Without explicit loading skeletons or spinners, the app feels unresponsive.
- **Camera/Meal Estimation:** Uploading photos and estimating macros takes time. Missing loading states here can lead to users repeatedly tapping buttons.
- **Future Cloud Sync:** When cloud backup/sync is implemented, loading states will be critical to prevent users from modifying data before the sync completes.

## Error State Risks

- **Invalid Stored Data:** If LocalStorage JSON is corrupted, `fitcore-data.ts` catches it and returns `defaultState`. The user's data appears "wiped" without any error message explaining why.
- **Failed AI Responses:** If Jarvis fails to parse a meal or workout, it might return an empty or generic response without clearly stating it failed or asking the user to try again.
- **Missing Required Fields:** If a user logs a workout without weight/reps, the app might accept it but fail to calculate PRs or volume, confusing the user.
- **Future API/Wearable Sync:** Any future external integrations will need robust error handling (e.g., "Failed to connect to Apple Health").

## Stale Data / Offline Risks

- **LocalStorage Reliance:** Since the app relies entirely on LocalStorage, data is strictly tied to the device. A user switching devices will see "stale" (or empty) data, and there is no UI indicator that this data isn't synced.
- **Service Worker / Cache:** If a service worker is used for PWA offline capabilities, app updates might be cached, leading users to run an older version of the app without knowing.
- **Offline Behavior:** The app works offline by default (LocalStorage), but AI features (Jarvis) require network access. There is no clear "Offline Mode" indicator when AI features are disabled due to lack of connection.

## Recovery Path and User Action Audit

- **Missing "Retry":** Failed AI requests do not have a "Retry" button.
- **Missing "Refresh":** There is no manual "Refresh" or "Sync" button if data feels stale.
- **Missing Error Confirmation:** If LocalStorage parsing fails, the user is not given a choice to "Restore from Backup" or "Reset to Default"; it just happens silently.
- **Missing "Edit/Correct":** If AI misinterprets a meal, the user needs a clear way to edit or correct the logged entry (the Nutrition Correction Feedback Loop addresses this, but empty/error states around it need polish).

## UX Copy Recommendations for Future Work

- **No Workouts Yet:** "No workouts logged yet. Start your first session to build your training volume."
- **No Meals Yet:** "Your plate is empty. Log a meal to start tracking your macros for today."
- **No Weight Logs:** "No weigh-ins recorded. Add your current weight to start seeing trends over time."
- **No Sleep Data:** "No sleep data available. Log your sleep to improve your recovery insights."
- **AI Estimate Failed:** "Jarvis couldn't understand that request. Try rephrasing or log it manually."
- **Data May Be Stale:** "You are viewing offline data. Some AI features may be unavailable."
- **Demo Mode Active:** "You are currently viewing demo data. Exit demo mode to view your real data."
- **Local Data Reset:** "Your local data could not be read and has been reset. If you have a backup, you can import it now."

## Risk Table

| Risk                         | Evidence                                       | Affected Screens | User Impact                    | Severity | Recommended Future Action                 | Safe to Fix Now?      |
| :--------------------------- | :--------------------------------------------- | :--------------- | :----------------------------- | :------- | :---------------------------------------- | :-------------------- |
| Silent LocalStorage Failure  | `try/catch` in `load()` returns `defaultState` | Global           | User thinks data is deleted    | High     | Add error toast/screen for corrupted JSON | No, future runtime PR |
| No AI Loading State          | `jarvis-panel.tsx` relies on implicit state    | Jarvis Panel     | App feels unresponsive         | High     | Add typing indicator or skeleton loader   | No, future runtime PR |
| Missing CTAs in Empty States | `EmptyMini` just shows "No Data"               | Home Dashboard   | Friction to start logging      | Medium   | Add quick-log buttons to empty cards      | No, future runtime PR |
| Unclear Offline State        | AI tools fail silently if offline              | Jarvis Panel     | Confusion over AI failures     | Medium   | Add offline indicator banner              | No, future runtime PR |
| No AI Error Recovery         | Failed AI tools don't prompt retry             | Jarvis, Log Meal | User has to type request again | Medium   | Add "Retry" or manual fallback button     | No, future runtime PR |

## Recommended Future Task Queue

**Docs/Planning Tasks:**

- Map out standard empty state illustrations/icons for the design system.
- Define explicit offline behavior requirements for PWA.

**Design/UX Copy Tasks:**

- Finalize UX copy for all empty states based on recommendations.
- Design skeletons for Home Dashboard cards and Jarvis loading states.
- Design a "Corrupted Data" error screen with an "Import Backup" CTA.

**Validation/Test Tasks:**

- Write Playwright tests specifically for corrupted LocalStorage scenarios.
- Write Playwright tests for AI failure scenarios (mocked network errors).
- Add tests to ensure offline mode explicitly disables AI features gracefully.

**Runtime Implementation Tasks (Future):**

- Implement a global Error Boundary for unexpected React crashes.
- Update `fitcore-data.ts` to trigger a specific error state instead of silently falling back to `defaultState` on parse failure.
- Add "Retry" mechanisms to Jarvis AI calls.
- Enhance `<EmptyState>` components on the Home screen to include quick-action CTAs.
- Implement loading skeletons for AI responses.

## Future Smoke Test Checklist

- [ ] **Fresh user/no data:** Verify all screens show helpful onboarding or empty states with CTAs.
- [ ] **Cleared localStorage:** Verify app resets gracefully and prompts onboarding.
- [ ] **Invalid localStorage:** Intentionally corrupt JSON; verify app shows error and backup recovery options.
- [ ] **No workouts but training screen opened:** Verify "No workouts" empty state is visible and accurate.
- [ ] **No meals but nutrition screen opened:** Verify "No meals" empty state is visible and accurate.
- [ ] **No weight logs but progress graphs opened:** Verify "No weigh-ins" empty state is visible and accurate.
- [ ] **Failed AI/Jarvis response:** Mock network failure; verify Jarvis shows clear error and "Retry" option.
- [ ] **Demo mode on/off:** Verify demo data populates empty states, and turning it off restores real/empty states.
- [ ] **Offline/reload behavior:** Disconnect network; verify basic PWA loading and offline indicator for AI.
- [ ] **Graph popup with no data:** Open detail sheet for a 0-value stat; verify "No Data" handles gracefully without crashing.
- [ ] **Active workout interrupted/reloaded:** Start workout, reload page; verify active workout state persists.
