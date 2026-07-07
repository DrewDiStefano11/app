# Core Logging Popup Implementation Readiness Checklist

## Purpose
This document provides a readiness checklist for the implementation of the core logging popups (Meal, Check-in, Weigh-in). It details the required behavior for manual and AI input, user confirmation flows, and data propagation to ensure data trust and system consistency. **Note: This is a docs-only planning file. No runtime app code is being modified. Features described here are planned, not necessarily implemented.**

## Scope
The scope covers the entry points from the home page, the internal behavior of the logging popups (manual and AI/camera input), validation rules, error handling, and the subsequent propagation of logged data to dashboards and AI context.

## Product Bible Sources Checked
* Book 4 (Nutrition)
* Book 5 (UX/UI)
* Book 9 (Analytics, Insights, and the Health Twin)
* Book 10 (Testing/QA/Platform Engineering) if merged/existing.
* (Book 6 is reserved/future-domain and is not included).

## Required Behavior for Home Page Buttons
* **Log Meal:** Must initiate the meal logging flow, offering options for manual entry, text AI description, or camera photo.
* **Check in:** Must initiate a holistic check-in flow covering mood, sleep quality, and subjective recovery signals.
* **Weigh in:** Must initiate a quick weigh-in flow to record body weight.

## Requirement That Those Buttons Open Popups/Sheets Instead of Full Page Navigation
* Tapping the core logging buttons on the home page must open a modal sheet (using the `BottomSheet` component) rather than triggering a full-page navigation. This keeps the user anchored to their dashboard context.

## Manual Input Behavior
* Manual input forms must be straightforward, prioritizing speed and ease of use.
* Required fields must be clearly marked.
* Numerical inputs should default to numeric keyboards on mobile.

## AI/Camera Macro Estimate Review Behavior
* When a user uses the camera or AI text input, the system generates macro and calorie estimates.
* These estimates must be presented in a review interface.
* The source (e.g., "Camera", "Jarvis") and confidence level (e.g., "Low", "Medium") must be prominently displayed alongside the estimates.
* The review interface must allow the user to easily edit or override any estimated value before finalizing the log.

## Confirmation Before AI-Generated Save
* The system is strictly forbidden from auto-saving AI-generated data directly to the user's permanent log without explicit user confirmation.
* A clear "Confirm & Log" step is mandatory for all AI-estimated entries.

## Validation/Error Behavior
* Client-side validation should catch obvious errors (e.g., negative weights, impossibly high calories) immediately.
* Network or processing errors during AI estimation must fail gracefully, providing a fallback to manual entry and clear error messaging to the user.

## Correction/Deletion Behavior
* Users must be able to view past logs and apply corrections.
* Edits to AI-estimated logs should preserve the original estimate metadata for provenance while upgrading the log's status to 'user_corrected' with high confidence.
* Deleting a log must completely remove its impact from all derived metrics and AI contexts.

## Dashboard Propagation
* Upon successful logging (whether manual or AI-confirmed), the relevant dashboard cards (e.g., Calorie tracking, Weight trend) must update immediately and reactively, without requiring a page reload.

## Graph Propagation
* Successfully logged data must be instantly available to populate relevant graphs when they are opened, ensuring consistency between the dashboard state and graph views.

## AI/Jarvis Context Propagation
* New logs must be incorporated into the AI/Jarvis context immediately.
* The "no-wasted-data" principle dictates that this newly logged information should be available for subsequent AI reasoning and daily decision engine recommendations.

## Demo/Test Account Separation
* Logging actions performed while in demo mode must be strictly isolated to prevent pollution of real user data or production databases.
* Write boundaries must be strictly enforced.

## Acceptance Checklist
- [ ] Home page buttons (Log meal, Check in, Weigh in) open appropriate sheets, not new pages.
- [ ] Manual input forms function correctly with appropriate mobile keyboards.
- [ ] AI/Camera estimates display source and confidence levels clearly.
- [ ] Explicit user confirmation is required before any AI estimate is saved.
- [ ] Users can edit AI estimates during the review step.
- [ ] Validation prevents invalid entries (e.g., negative values).
- [ ] Error states provide a graceful fallback to manual entry.
- [ ] Corrections to logs update their status to 'user_corrected' while preserving provenance.
- [ ] Dashboard cards update reactively upon successful log save.
- [ ] Logged data is immediately available in the AI/Jarvis context.
- [ ] Demo mode write boundaries are strictly enforced.

## Failure Examples
* Tapping "Log Meal" redirects the user to `/log/meal` instead of opening a sheet.
* AI camera estimates are saved automatically without showing a review screen.
* Modifying an AI-estimated meal deletes the original confidence score instead of appending the 'user_corrected' metadata.
* Logging a weigh-in updates the dashboard card, but opening the weight graph shows stale data until a hard refresh.

## Suggested Future PR Breakdown
1. **Infrastructure:** Component updates to support specific popup flows from home page buttons.
2. **AI Flow:** Implement camera/text AI estimation review and confirmation screens.
3. **Manual Flow:** Implement and refine manual entry forms and validation.
4. **Data Sync:** Ensure reactive propagation to dashboard, graphs, and AI context.

## Final Readiness Matrix
| Area | Status | Notes |
| :--- | :--- | :--- |
| Sheet Navigation | Ready | Must enforce `BottomSheet` usage |
| AI Confirmation | Pending | Critical safety gate requires strict review |
| Provenance Tracking | Ready | Requires metadata schema verification |
| Reactive Updates | Pending | State propagation requires careful testing |
