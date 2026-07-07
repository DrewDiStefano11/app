# FitCore Next-Phase Implementation Map

## 1. Project Status Snapshot (Current Sequencing)

| Initiative / PR               | Status      | Notes                                                                      |
| :---------------------------- | :---------- | :------------------------------------------------------------------------- |
| **PR #31 Playwright Helpers** | Merged      | Onboarding bypass logic is now available for E2E tests.                    |
| **PR #32 Data Safety Docs**   | Merge-Ready | Documentation-only; covers privacy and backup principles.                  |
| **PR #33 AI Nutrition Docs**  | Merge-Ready | Documentation-only; covers estimation and confidence rules.                |
| **PR #34 Popup/Sheet Work**   | **Active**  | Critical UI foundation. Must complete before any new sheet-based features. |
| **PR #14 CI Validation**      | Parked      | Waiting for environment stability.                                         |
| **PR #2 Jarvis Voice Mode**   | Parked      | Stale; requires manual verification and hardware testing.                  |
| **Daily Decision Engine**     | Pending     | Codex implementation branch; reviewed separately to ensure determinism.    |

---

## 2. Next-Phase Workstream Map

This map defines the primary workstreams for the upcoming development phase, ensuring alignment with the core FitCore product rules.

### Workstream: Data Trust & Provenance UI

- **Purpose:** Visually communicate the source and confidence of all logged data.
- **Product Rule Alignment:** Improve trust in the data; explain what changed.
- **User Problem Solved:** "Where did this 500-calorie entry come from? Can I trust it?"
- **Allowed File Zones:** `src/components/**`, `src/routes/**`.
- **Forbidden File Zones:** `src/lib/daily-decision.ts`, `src/lib/jarvis/tools.ts`.
- **Expected Data Dependencies:** `AuditMetadata`, `source`, `confidence` fields in `AppState`.
- **Expected UI Surfaces:** Nutrition History, Workout History, Detail Sheets, Dashboard Tiles.
- **Expected Tests:** Playwright tests for badge visibility and tooltip accuracy.
- **Acceptance Criteria:** Every log entry displays a source badge; low-confidence data is visually distinct.
- **Edge Cases:** Legacy data without metadata; multiple sources for a single aggregate.
- **Non-Goals:** Building new logging tools; changing the data model.
- **Merge-Readiness Checklist:** Verified against #34 sheet positioning; no regression in accessibility.

### Workstream: Daily Decision Engine UI

- **Purpose:** Surfaces recommendations from the Codex-built Engine to the user.
- **Product Rule Alignment:** Help the user decide what to do next; connect training/nutrition/recovery.
- **User Problem Solved:** "I'm sore and didn't sleep well—what should I actually do in the gym today?"
- **Allowed File Zones:** `src/components/dashboard/**`, `src/routes/index.tsx`.
- **Forbidden File Zones:** `src/lib/daily-decision.ts` (Logic must stay in Engine PR).
- **Expected Data Dependencies:** `DailyRecommendation` object from the Engine state.
- **Expected UI Surfaces:** Home Screen "Command Center", Readiness Detail Sheet.
- **Expected Tests:** UI state tests for empty, partial, and full data recommendations.
- **Acceptance Criteria:** Displays "What to train", "How hard", and "Why" on the home screen.
- **Edge Cases:** Engine returns "No Data"; user overrides recommendations.
- **Non-Goals:** Modifying the recommendation algorithm; adding social features.
- **Merge-Readiness Checklist:** Does not overlap with active Engine logic work; follows dashboard card rules.

### Workstream: Nutrition Correction & Saved Foods

- **Purpose:** Allow users to fix AI estimates and build a personalized database.
- **Product Rule Alignment:** Reduce logging friction; improve trust in the data.
- **User Problem Solved:** "Jarvis guessed the protein wrong; I want to fix it and save this meal for later."
- **Allowed File Zones:** `src/components/nutrition/**`, `src/lib/jarvis/tools.ts`.
- **Forbidden File Zones:** `src/lib/daily-decision.ts`.
- **Expected Data Dependencies:** `MealEntry`, `SavedFood` types.
- **Expected UI Surfaces:** Nutrition Detail Sheet, Search View, Correction Modal.
- **Expected Tests:** Integration tests for correction → saved food conversion.
- **Acceptance Criteria:** Users can edit any field in an AI log; corrected logs are marked as "User Verified".
- **Edge Cases:** Deleting a saved food used in history; partial corrections.
- **Non-Goals:** Full recipe management system; barcode scanning.
- **Merge-Readiness Checklist:** Data migration plan included if types change.

### Workstream: Data Portability (Import/Export/Backup)

- **Purpose:** Ensure users own their data and can move between devices safely.
- **Product Rule Alignment:** Improve trust in the data.
- **User Problem Solved:** "I'm getting a new phone and don't want to lose my 2 years of training history."
- **Allowed File Zones:** `src/lib/persist.ts`, `src/components/settings/**`.
- **Forbidden File Zones:** UI components unrelated to settings.
- **Expected Data Dependencies:** Full `AppState` JSON structure.
- **Expected UI Surfaces:** Settings View, Data Management Sheet.
- **Expected Tests:** Unit tests for JSON validation; E2E tests for export → clear → import loop.
- **Acceptance Criteria:** One-click export to JSON; robust validation on import with version check.
- **Edge Cases:** Importing corrupted JSON; version mismatch; large file performance.
- **Non-Goals:** Cloud syncing (V2); CSV/Excel export (V1 focus is JSON).
- **Merge-Readiness Checklist:** Verified against `FITCORE_DATA_VERSION`.

### Workstream: Recovery & Readiness Insights

- **Purpose:** Explain the "Why" behind recovery scores and readiness.
- **Product Rule Alignment:** Explain what changed; connect recovery/training.
- **User Problem Solved:** "My score is low, but I don't know if it's because of my sleep or yesterday's leg day."
- **Allowed File Zones:** `src/components/recovery/**`, `src/lib/fitcore-data.ts`.
- **Forbidden File Zones:** `src/lib/jarvis/**`.
- **Expected Data Dependencies:** `RecoverySignal`, `WorkoutHistory`.
- **Expected UI Surfaces:** Recovery View, Readiness Detail Sheet.
- **Expected Tests:** Snapshots of the "Insights" section under different recovery states.
- **Acceptance Criteria:** Displays at least 3 contributing factors for the daily score.
- **Edge Cases:** Conflicting signals (good sleep but high muscle soreness).
- **Non-Goals:** Medical diagnosis; wearable integration (V1).
- **Merge-Readiness Checklist:** Follows "No Diagnosis" AI guardrail.

### Workstream: Jarvis Action Review & Undo Improvements

- **Purpose:** Provide a safety layer for AI-driven state changes.
- **Product Rule Alignment:** Improve trust in the data; reduce logging friction.
- **User Problem Solved:** "Jarvis just logged something by mistake; I need to see exactly what changed and undo it easily."
- **Allowed File Zones:** `src/lib/jarvis/**`, `src/components/jarvis/**`.
- **Forbidden File Zones:** `src/lib/daily-decision.ts`.
- **Expected Data Dependencies:** `AuditMetadata`, `jarvisAudit` state.
- **Expected UI Surfaces:** Jarvis Chat Interface, Notification Toasts, Audit Log Sheet.
- **Expected Tests:** Unit tests for undo logic; E2E tests for "Log -> Review -> Undo" flow.
- **Acceptance Criteria:** Every Jarvis tool action produces a reviewable summary and a 1-click undo option.
- **Edge Cases:** Undoing an action after subsequent manual edits; multiple pending reviews.
- **Non-Goals:** Building a full history of every single keypress (focus on tool actions).
- **Merge-Readiness Checklist:** Verified against `jarvis-tool-safety-audit.md`.
