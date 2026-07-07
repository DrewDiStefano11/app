# Implementation Start Handoff

This document defines the final handoff details transitioning from the documentation and planning wave into runtime feature implementation. Future agents should review this table prior to modifying code within these areas.

| Area | Current status | Source docs to read first | Safe next action | Unsafe next action |
| :--- | :--- | :--- | :--- | :--- |
| Core Logging Popups | Wave 1 queued | `docs/planning/core-logging-popup-implementation-readiness-checklist.md`, `docs/audits/popup-sheet-behavior-inventory.md` | Implement meal/weigh-in/check-in popups one by one following UI standards. | Changing `store.tsx` data structures during popup UI work. |
| Data Propagation Foundation | Wave 2 queued | `docs/planning/data-propagation-and-no-wasted-data-map.md`, `docs/planning/dashboard-graph-propagation-implementation-readiness-checklist.md` | Standardize how state values map to dashboard cards. | Merging PRs that trap logged data on a single view. |
| AI/Jarvis Logging Safety | Wave 3 queued | `docs/planning/ai-jarvis-source-permission-and-logging-map.md`, `docs/planning/source-labels-and-confidence-model-plan.md` | Add explicit user confirmation loops before Jarvis saves data. | Letting Jarvis auto-save health data without explicit tags/confirmation. |
| Active Workout Flow | Wave 4 queued | `docs/planning/active-workout-implementation-readiness-checklist.md`, `docs/audits/active-workout-state-machine-audit.md` | Componentize exercise cards and previous performance display. | Running concurrent UI and state PRs on the active workout at the same time. |
| UI Polish & Graph Interaction | Wave 5 queued | `docs/planning/graph-popup-behavior-acceptance-checklist.md`, `docs/planning/ui-popup-sheet-implementation-dependency-map.md` | Address safe areas, z-index of sheets, and graph touch zones. | Re-writing entire domain views simultaneously. |
| Privacy & Settings | Wave 6 queued | `docs/planning/settings-privacy-implementation-readiness-checklist.md`, `docs/planning/ai-memory-category-control-plan.md` | Implement local-first privacy defaults and explicit AI sync toggles. | Syncing sensitive data to the cloud by default. |
| Demo/Test Account Safety | Wave 7 queued | `docs/planning/demo-mode-seed-data-and-test-account-safety-plan.md` | Enforce strict separation between demo mode and user localStorage. | Accidentally writing AI test data into production user accounts. |
| QA & CI Hardening | Wave 8 queued | `docs/product-bible/book-10-testing-qa-and-platform-engineering/` | Add E2E coverage and baseline TypeScript fixes. | Merging CI blockages while foundational type errors remain. |
