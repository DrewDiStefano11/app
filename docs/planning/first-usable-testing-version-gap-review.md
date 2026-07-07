# First Usable Testing Version Gap Review

## 1. Purpose
This document compares the current FitCore app direction against what is still needed for the first usable testing version. It outlines the gap between our current foundation and a complete, testable prototype, strictly prioritizing essential implementation over non-critical nice-to-haves.

## 2. Current merged foundation
- Comprehensive docs, plans, and audits defining product boundaries (Books 1-10).
- Basic layout shell (Bottom nav, views) exist but are missing full functional polish.
- Strict definitions of Daily View vs. Deep Dive exist.
- Foundational architectural decisions on state (Zustand/local storage).
- FitCore Score definitions.

## 3. In-progress work
- Active work mapping UI changes for bottom nav lockdown.
- Deep Dive mode integration.
- Floating AI shell preparations.
- Routine forms finalization.

## 4. Blocked or parked work
- Deep integration of AI Voice mode (Jarvis).
- CI Validation workflows.
- Centralized popup positioning updates.

## 5. Required for first usable testing version
*Already merged / likely done*
- Bottom nav lockdown (Today, Training, Nutrition, Recovery, Insights).
- Basic store/schema initializations.

*In active PRs*
- Today Daily View refinements.
- Training Daily View structure.
- Navigation and global mode separation.

*Needed before testing*
- Nutrition Daily View baseline.
- Recovery Daily View baseline.
- Insights Daily View baseline.
- FitCore Hub shell with basic top-right navigation.
- Routine forms (Morning Check-In, Night Review) functional.
- Floating AI shell toggles (Coach/Jarvis) rendering without crashing.
- Basic Data propagation (ensuring entered data reflects immediately).
- Manual QA checks.
- E2E/data integrity tests for core flows.

*Can wait until after testing*
- Mobile usability polishing.
- Parked popup work.
- Parked Jarvis voice work.
- Parked CI workflow work.

## 6. Nice-to-have but not required for first usable testing version
- Full integration of third-party wearables.
- Advanced genetics/precision health module integrations.
- Comprehensive theming/appearance toggles beyond basic dark/light modes.
- Complex insights correlations (basic FitCore Score generation is enough).
- Cloud sync (local-first storage is acceptable for testing).

## 7. Must-not-touch parked areas
- PR #34: Standardize Popup Positioning & Visibility.
- PR #14: Add CI validation workflow.
- PR #2: Add ChatGPT-style Jarvis voice conversation mode.

## 8. Recommended next implementation order
1. Finalize Bottom Nav & Global Mode (Daily View/Deep Dive toggle).
2. Implement basic layout primitives for Daily Views (Training, Nutrition, Recovery, Insights).
3. Connect minimal Data Propagation to ensure a user flow saves correctly to UI state.
4. Integrate FitCore Hub skeleton.
5. Setup Floating AI Shell basic entry points.
6. Verify E2E Data Integrity constraints.

## 9. Acceptance criteria for “first usable testing version”
- User can successfully complete a full day's basic flow (Morning check-in -> log a workout -> log a meal -> night review).
- No data is silently dropped when logged.
- Bottom navigation never deviates from the 5 locked tabs.
- Daily View / Deep Dive mode cleanly persists and toggles without corrupting state.
- Core pages do not crash on render.

## 10. Open risks
- Data consistency across cards/views relying on separate local states instead of a centralized hook.
- Popup z-index and portal issues blocking critical flows if standard React.createPortal is not adopted.
- Unintentional bundle bloat from adding unapproved sanitization dependencies instead of native React escaping.
