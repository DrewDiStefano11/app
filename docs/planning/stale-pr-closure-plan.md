# Stale PR Closure Plan

This document outlines the plan for handling stale PRs that are superseded by the current Codex Goal Mode sequence. **Do not close these PRs immediately.** They should only be closed according to the timing specified below to avoid losing context or interrupting ongoing work.

## PR #100: old Progress/Insights Daily View
*   **Why it should not be merged as-is:** This PR contains an outdated approach to the Progress/Insights view and does not align with the strict 8-wave runtime implementation sequence or the new layout primitives. It likely lacks the necessary Zod validation updates.
*   **Which clean Codex task supersedes it:** (Assuming a specific task number here, e.g., Task X - Analytics/Insights Implementation). It will be superseded by the dedicated runtime task for the Insights view in the current sequence.
*   **When it is safe to close it:** After the Codex task that implements the Progress/Insights view is successfully merged into `main`.
*   **Action:** Close only after replacement is merged.
*   **File-overlap risk:** High. It touches core UI and layout files that will be modified by the current sequence. Keeping it open during active work risks merge conflicts if someone accidentally updates it.

## PR #99: old Training Daily View
*   **Why it should not be merged as-is:** This PR represents an older implementation attempt for the Training Daily View that predates the finalized layout constraints and the "no-wasted-data" propagation rules.
*   **Which clean Codex task supersedes it:** (Assuming a specific task number here, e.g., Task Y - Training Implementation). Superseded by the dedicated runtime task for the Training view.
*   **When it is safe to close it:** After the Codex task implementing the Training Daily View is successfully merged.
*   **Action:** Close only after replacement is merged.
*   **File-overlap risk:** High. Touches training dashboard components and layout primitives.

## PR #91: old Recovery Daily View
*   **Why it should not be merged as-is:** This PR is an old attempt at the Recovery Daily View. It does not reflect the current requirements for integrating with the FitCore Hub or the updated popup/sheet standards.
*   **Which clean Codex task supersedes it:** (Assuming a specific task number here, e.g., Task Z - Recovery Implementation). Superseded by the dedicated runtime task for the Recovery view.
*   **When it is safe to close it:** After the Codex task implementing the Recovery Daily View is successfully merged.
*   **Action:** Close only after replacement is merged.
*   **File-overlap risk:** High. Touches recovery dashboard components.

## PR #102: old empty/error state audit if still not mergeable
*   **Why it should not be merged as-is:** If this PR has unresolved conflicts or formatting issues that prevent a clean merge, it should not be forced. The audit information needs to be integrated cleanly.
*   **Which clean Codex task supersedes it:** The information should be absorbed into ongoing layout and runtime implementation tasks where empty/error states are actively built.
*   **When it is safe to close it:** After the contents have been manually verified and incorporated into the active implementation tasks, or if a clean docs-only PR replaces it.
*   **Action:** Keep open for reference until its contents are fully integrated, then close.
*   **File-overlap risk:** Low (docs only), but high risk of merge conflicts within the `docs/` folder if forced.

## PR #82 and #90: old quick popup hardening attempts
*   **Why it should not be merged as-is:** These PRs attempted to harden quick popups before the centralized `layout-primitives.tsx` and the strict 8-wave sequence were established. They may introduce regressions or inconsistent UI patterns.
*   **Which clean Codex task supersedes it:** The specific Codex task targeting Wave 1 (Core logging popups) and Wave 3 (Typed Jarvis logging safety).
*   **When it is safe to close it:** After the Codex tasks for core logging popups are successfully merged.
*   **Action:** Close only after replacement is merged.
*   **File-overlap risk:** High. Modifies global popup files (`quick-popups.tsx`) which are critical paths.

## PR #93: old Hub shell attempt
*   **Why it should not be merged as-is:** This is an outdated attempt at the FitCore Hub shell that does not conform to the final decision to centralize auxiliary views (Profile, Settings, Medical) into a top-right entry point while keeping the 5-tab bottom navigation strictly for core views.
*   **Which clean Codex task supersedes it:** The specific Codex task for FitCore Hub layout implementation.
*   **When it is safe to close it:** After the new Hub shell implementation PR is merged.
*   **Action:** Close only after replacement is merged.
*   **File-overlap risk:** High. Modifies core navigation and layout shell files.
