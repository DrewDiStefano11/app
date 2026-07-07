# Manual Regression Checklist

## 1. Purpose
The purpose of this checklist is to ensure that the core user flows and vital features of FitCore continue to function as expected prior to any release or major merge. It provides a structured manual testing guide to catch regressions in fundamental behavior that automated tests may miss.

## 2. Scope
This checklist covers the primary end-to-end paths in the application. It includes:
* App launch
* Onboarding
* Home dashboard
* Bottom navigation
* Log meal
* Check-in
* Weigh-in
* Active workout
* Finish workout summary
* Graph popups
* FitCore score popup
* Settings/privacy
* AI/Jarvis typed logging
* Correction/deletion
* Demo mode
* Offline/error recovery

## 3. When to use this checklist
* Before cutting a release candidate for production or beta testing.
* After a significant architectural change or refactor.
* When adding a new feature that intersects with multiple existing domains.
* As part of a manual QA pass prior to the first usable testing version.

## 4. Required preconditions
* Ensure you are running a fresh or clean build of the application.
* You should have an established test account with a baseline of data, or use demo mode if testing demo-specific flows.
* For certain network tests, access to toggle device online/offline states is required.
* No mock servers should be active unless specifically testing offline/error states.

## 5. Step-by-step checklist
1. **App launch**: Open the app and verify the splash screen and initial loading sequence.
2. **Onboarding**: For a new account or reset state, verify the onboarding flow functions without skipping required steps.
3. **Home dashboard**: Ensure data, widgets, and the primary daily summary load correctly.
4. **Bottom navigation**: Tap through all tabs to verify navigation state is preserved and routing is correct.
5. **Log meal**: Use the meal logging flow; check that inputs (manual or AI) are accepted.
6. **Check-in**: Perform a daily check-in and verify it completes.
7. **Weigh-in**: Log a weight and check that the new value is recorded.
8. **Active workout**: Start a workout, manipulate timers/sets, and ensure the active state persists.
9. **Finish workout summary**: Complete the workout and check the summary screen.
10. **Graph popups**: Tap on dashboard graphs to open their detailed popups.
11. **FitCore score popup**: Verify the detailed breakdown of the FitCore score appears when tapped.
12. **Settings/privacy**: Navigate through settings and review privacy toggles.
13. **AI/Jarvis typed logging**: Submit a typed log to Jarvis and check the response and parsed data.
14. **Correction/deletion**: Edit an existing entry and delete an entry; verify both actions succeed.
15. **Demo mode**: Enter demo mode and verify the UI updates to reflect demo data.
16. **Offline/error recovery**: Disconnect from the network, attempt an action, reconnect, and observe the recovery path.

## 6. Expected pass behavior
* All screens render without crashing or hanging.
* Data entered in one view (e.g., logging a meal) propagates correctly to other views (e.g., Home dashboard, Graphs).
* The UI remains responsive during network requests.
* Error states are handled gracefully with user-friendly messages rather than white screens.

## 7. Fail examples
* App crashes immediately upon launch.
* Active workout timer resets when navigating away and back via bottom navigation.
* Logging a meal does not update the daily caloric summary on the dashboard.
* Tapping a graph results in a blank popup.
* Deleting an entry visually removes it, but it reappears upon refresh.

## 8. Required notes/screenshots/logs to capture
* Always capture a screenshot of any visual anomaly, crash, or blank screen.
* If an API call fails or data does not propagate, capture the browser/device console logs and network payload.
* Document the specific device, OS version, and app build number during the test.

## 9. Blocking vs non-blocking issues
* **Blocking**: Any app crash, failure to log a core event (meal, workout, weigh-in), or exposure of incorrect private data. The release must be halted.
* **Non-blocking**: Minor visual misalignments, slightly delayed animations, or edge-case offline sync issues that resolve upon refresh. These should be ticketed for future sprints.

## 10. Future automation opportunities
* Automated E2E tests (e.g., using Playwright) should be implemented for the Home dashboard data propagation.
* Bottom navigation routing and active workout state preservation should be prioritized for integration testing.
* Offline/error recovery can be simulated in unit or integration tests by mocking the network layer.

## 11. Final QA matrix

| Area | Test/check | Expected result | Blocking severity | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **App launch** | Start app from closed state | App opens to Home or Onboarding without crash | High | |
| **Onboarding** | Complete onboarding sequence | User is transitioned to Home dashboard with default data | High | |
| **Home dashboard** | Review dashboard summary | Data is visible, no blank widgets | High | |
| **Bottom navigation** | Tap all nav items | Fast routing, active states correct | Medium | |
| **Log meal** | Submit a meal log | Meal appears in list, summary updates | High | |
| **Check-in** | Complete daily check-in | Status updates to checked-in | High | |
| **Weigh-in** | Log a weight | Weight graph/history updates | High | |
| **Active workout** | Start and interact with workout | Timer runs, inputs accepted, state persists | High | |
| **Finish workout summary** | End workout | Summary shows correct duration/volume | High | |
| **Graph popups** | Tap dashboard graphs | Detailed popup sheet opens with correct data | Medium | |
| **FitCore score popup** | Tap FitCore score | Breakdown details are displayed clearly | Medium | |
| **Settings/privacy** | Open and review settings | Options are visible and interactable | Low | |
| **AI/Jarvis typed logging** | Send typed input | Jarvis parses intent and suggests/logs data | High | |
| **Correction/deletion** | Edit and delete an entry | Item updates or disappears everywhere | High | |
| **Demo mode** | Toggle demo mode | App switches to isolated demo data | High | |
| **Offline/error recovery** | Disable network, trigger action | Graceful error, data queues or rejects cleanly | Medium | |
