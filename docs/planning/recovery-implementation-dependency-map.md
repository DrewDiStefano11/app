# Recovery Implementation Dependency Map

## 1. Purpose
To map the implementation dependencies required before starting the development of the FitCore Recovery, Sleep, and Readiness features. This ensures that integrations, context sharing, and safety boundaries are clearly defined before code is written.

## 2. Scope
This dependency map covers the following planned features:
- Daily check-in
- Sleep tracking
- Readiness score
- Soreness/pain/tiredness tracking
- Wearables sync
- Morning briefing
- Post-workout felt-good/felt-bad prompt
- Bedtime/day recap
- Do Not Disturb/busy detection
- Recovery dashboard/graphs
- AI/Jarvis context and safety language

## 3. Product Bible Sources to Check
- `docs/product-bible/book-07-recovery-sleep-and-wearables/README.md`
- `docs/product-bible/book-07-recovery-sleep-and-wearables/01-recovery-system-overview.md` (Assumed)
- `docs/product-bible/book-07-recovery-sleep-and-wearables/02-readiness-and-sleep.md` (Assumed)
- `docs/product-bible/book-07-recovery-sleep-and-wearables/03-wearables-and-integrations.md` (Assumed)
- `docs/product-bible/book-08-medical-genetics-and-precision-health/README.md`
- `docs/product-bible/book-05-ux-ui-and-user-experience/README.md`

## 4. Related Planning/Audit Inputs
- `docs/audits/current-data-flow-audit.md`
- `docs/audits/ai-provenance-confidence-audit.md`
- `docs/planning/fitcore-nutrition-recovery-roadmap.md`

## 5. Required Data Dependencies
- **Readiness Formula Definition:** The "Open Question" regarding how RHR, HRV, and subjective soreness weight into a readiness score must be answered and defined algorithmically.
- **Wearable Sync Policies:** Resolution on background vs foreground syncing rules (currently marked as "Needs Decision" in Book 7).
- **Conflict Resolution Logic:** The "Open Question" on handling conflicting sleep data across multiple wearable sources.
- **Subjective Metrics Schema:** Data schemas for subjective pain, soreness, and tiredness levels, linking them to specific dates or workout sessions.

## 6. Required UI Dependencies
- **Popup/Sheet Refinements:** Ensure the daily check-in popup, morning briefing modal, and post-workout prompts utilize correct dynamic viewport heights (`dvh`) and portal rendering.
- **Graphing Components:** Reusable chart components capable of visualizing Readiness scores against Sleep/Recovery metrics over time.

## 7. Required AI/Jarvis Dependencies
- **Safety Threshold Implementation:** Resolution on the "Needs Decision" medical boundary: "At what exact threshold of reported pain should AI coaching refuse to recommend any exercise for that body part?"
- **Context Injection:** Framework to ensure daily check-in values and soreness logs are successfully injected into Jarvis' active memory/context window.

## 8. Required Privacy/Safety Dependencies
- **Local-First Syncing:** Wearables sync logic must strictly adhere to local-first data processing unless explicit opt-in for AI context usage is granted (as per Book 8 rules).
- **Diagnostic Prevention:** Enforcement of strict system prompts to prevent Jarvis from offering medical diagnoses based on sleep issues or excessive fatigue.

## 9. Required QA/Testing Dependencies
- **Mock Wearable Data:** Playwright fixtures established for mock Apple Health/Garmin syncs to test integration logic locally.
- **Safety Prompt E2E Tests:** Verification that the AI refuses specific training requests when high pain thresholds are met.

## 10. Implementation Sequence
1.  **Architecture:** Resolve Open Questions regarding Readiness scoring, Sync logic, and Conflicting Data handling.
2.  **Schema Updates:** Implement subjective metric types and wearable data shapes.
3.  **UI Foundation:** Build standard Check-in popups, Recap Modals, and the Recovery Dashboard.
4.  **Core Logging:** Implement manual Daily check-in and Post-workout prompts.
5.  **Integration Layer:** Implement Wearables sync logic based on the resolved syncing policies.
6.  **Analytics Layer:** Construct the Readiness score engine based on combined subjective and synced data.
7.  **AI Layer:** Implement Morning Briefing, Bedtime recap, and update Jarvis safety constraints regarding pain limits.

## 11. Unsafe Shortcuts
- Guessing the Readiness score weights without Product Bible finalization.
- Sending raw wearable payload data to an external LLM without prior, explicit user consent screens.
- Suppressing or overriding subjective user pain reports with conflicting wearable data.

## 12. Suggested Future PR Breakdown
- PR 1: Recovery Data Model updates and Readiness rule engine.
- PR 2: UI implementation of Daily Check-in and Recaps.
- PR 3: Recovery Dashboards and Graph components.
- PR 4: Wearable sync API boundaries and logic handling.
- PR 5: Jarvis context injection and safety prompt boundaries.

## 13. Acceptance Criteria Before Runtime Work Starts
- Book 7 "Open Questions" (Readiness formula, Sync background policies, Conflict logic) are fully resolved.
- Medical AI boundary around pain thresholds is defined.
- Subjective check-in schemas are confirmed.

## 14. Final Dependency Table

| Dependency | Required before implementation? | Source/planning input | Risk if missing | Recommended next action |
| :--- | :--- | :--- | :--- | :--- |
| Readiness Formula Definition | Yes | `docs/product-bible/book-07-recovery-sleep-and-wearables/README.md` | Flawed or unpredictable Recovery/FitCore Scores | Product team must resolve the formula rule |
| Wearable Sync Background Rules | Yes | `docs/product-bible/book-07-recovery-sleep-and-wearables/README.md` | Battery drain or data desync | Decide syncing frequency |
| Pain Threshold Safety Rules | Yes | `docs/product-bible/book-07-recovery-sleep-and-wearables/README.md` | Jarvis recommending dangerous exercises | Define exact AI constraints for pain |
| Sleep Conflict Logic | Yes | `docs/product-bible/book-07-recovery-sleep-and-wearables/README.md` | Duplicate/Conflicting Dashboard data | Define the 'Source of Truth' rule |
