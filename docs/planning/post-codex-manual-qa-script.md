# Post-Codex Manual QA Script

This script provides a structured manual testing procedure to verify application stability and core functionality after merging Codex Goal Mode PRs. It ensures that runtime changes have not introduced regressions across the app.

## Prerequisites
- Start the local development server (`npm run dev`).
- Access the application at `http://localhost:8080`.
- Bypass onboarding if prompted: Click 'Get Started', 'Continue' (as needed), and 'Enter FitCore'.

## QA Steps

### 1. App Load / SSR Sanity Check
- [ ] Hard refresh the application (`Cmd+Shift+R` or `Ctrl+F5`).
- [ ] Verify the application loads without a white screen.
- [ ] Check the browser console for any critical SSR-related errors (e.g., `TypeError`, `.validator is not a function`).

### 2. Home Dashboard
- [ ] Navigate to the 'Today' tab.
- [ ] Verify the global `[Daily View] [Deep Dive]` toggle is visible and functional.
- [ ] Ensure any due routine forms (e.g., Morning Check-In) are visible or cleanly collapsed if completed.
- [ ] Verify the Floating AI shell is visible in place of the global plus button.

### 3. Log Meal Quick Action
- [ ] Open the Log Meal popup/action (via AI Shell or quick action if present).
- [ ] Enter a manual meal log.
- [ ] Verify input validation (e.g., no negative numbers allowed, or if currently allowed, note it as a known issue).
- [ ] Save the meal and verify it appears in the Nutrition daily view without a page reload.

### 4. Check In Quick Action
- [ ] Open a Check-In form (e.g., Morning Check-In).
- [ ] Complete the form.
- [ ] Verify that saving the form updates relevant metrics and the form collapses into a summary state.

### 5. Weigh In Quick Action
- [ ] Open the Weigh In action.
- [ ] Enter a valid weight.
- [ ] Save and verify the dashboard updates immediately.

### 6. Training Daily View
- [ ] Navigate to the 'Training' tab.
- [ ] Verify the cyan accent color is active.
- [ ] Ensure the layout conforms to the selected `[Daily View] [Deep Dive]` mode.

### 7. Active Workout Flow
- [ ] Start a new active workout.
- [ ] **Minimize:** Minimize the workout to the persistent floating state.
- [ ] **Resume:** Restore the workout from the floating state.
- [ ] **Finish:** Complete the workout and verify the summary appears.
- [ ] **Discard:** Start another workout, select discard, and verify it cleanly resets the state without saving.

### 8. Training Templates / History Access
- [ ] Within the Training view, access templates or programs.
- [ ] Navigate to workout history and performance metrics.
- [ ] Verify screens load correctly without crashing.

### 9. Recovery Daily View
- [ ] Navigate to the 'Recovery' tab.
- [ ] Verify the green accent color is active.
- [ ] Check layout adherence to the global mode toggle.

### 10. Sleep & Body Heatmap Access
- [ ] Within the Recovery view, access detailed sleep data.
- [ ] Access the soreness/body heatmap.
- [ ] Verify data loads and is not communicated solely by color (text/icons must be present).

### 11. Progress Daily View (Insights)
- [ ] Navigate to the 'Insights' tab.
- [ ] Verify the teal accent color is active.
- [ ] Check that metrics aggregate correctly (ensure "no-wasted-data" propagation).

### 12. Nutrition Daily View
- [ ] Navigate to the 'Nutrition' tab.
- [ ] Verify the red accent color is active.
- [ ] Verify recent meals (like the one logged in step 3) are visible.

### 13. Settings / Hub
- [ ] Click the top-right entry point to open the 'FitCore Hub'.
- [ ] Verify auxiliary views (Profile, Settings, Medical, Wearables) are accessible here.
- [ ] Check that changing the global `[Daily View] [Deep Dive]` mode here persists across the app.

### 14. Reload Persistence Checks
- [ ] Hard refresh the page while on a specific tab (e.g., Recovery) and a specific mode (e.g., Deep Dive).
- [ ] Verify the application remembers the tab and mode upon reload.

### 15. Mobile Layout Checks
- [ ] Use browser developer tools to toggle mobile device simulation (e.g., iPhone 12/13).
- [ ] Verify the bottom navigation (5 tabs) fits cleanly.
- [ ] Ensure popups and sheets are usable (not cropped, close buttons accessible).

### 16. Error Reporting Protocol
If any step fails, follow these instructions to document the issue:
- [ ] Take a full-screen screenshot of the error state.
- [ ] If the issue is an interaction bug (e.g., animation, state getting stuck), record a short `.webm` or `.mp4` video.
- [ ] Copy any errors from the browser console.
- [ ] Note the specific PR number and task that introduced the failure.
- [ ] Do **not** proceed with further merges until the issue is investigated.
