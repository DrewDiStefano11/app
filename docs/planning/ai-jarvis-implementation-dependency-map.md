# AI/Jarvis Implementation Dependency Map

## 1. Purpose
To map the implementation dependencies required before expanding the FitCore AI/Jarvis functionality. This ensures that memory boundaries, user confirmation flows, explainability, safety thresholds, and architecture hotspots are handled safely.

## 2. Scope
This dependency map covers the following planned features:
- Typed Jarvis logging
- Voice Jarvis parked/future status
- Confirmation before saving user data
- Source explanation
- “Why do you know this?” behavior
- AI memory categories
- Permission checks
- Audit/logging requirements
- Undo/correction/deletion behavior
- Duplicate-prevention
- Safety boundaries for medical/injury content
- Demo/test account behavior

## 3. Product Bible Sources to Check
- `docs/product-bible/book-02-system-architecture/03-ai-context-and-memory.md`
- `docs/product-bible/book-05-ux-ui-and-user-experience/07-ai-assistant-ux-and-explainability.md`
- `docs/product-bible/book-08-medical-genetics-and-precision-health/README.md` (Medical Safety)
- `docs/product-bible/book-04-nutrition-system/03-macro-estimation-and-food-ai.md`

## 4. Related Planning/Audit Inputs
- `docs/audits/jarvis-action-logging-audit.md`
- `docs/audits/jarvis-tool-safety-audit.md`
- `docs/audits/current-code-structure-audit.md` (specifically `tools.ts` hotspot)
- `docs/planning/ai-jarvis-source-permission-and-logging-map.md`

## 5. Required Data Dependencies
- **Action Logging Schema:** A robust internal log to track what Jarvis did, when, based on what user input, and whether it was confirmed/undone.
- **AI Memory Categories:** Structured buckets for AI memory (e.g., Short-term session context, Long-term preferences, Medical boundaries).
- **Duplicate-Prevention Hashes:** Mechanisms to prevent Jarvis from logging the same workout/meal multiple times if the user repeats themselves.

## 6. Required UI Dependencies
- **Confirmation Modals:** The mandatory intermediate UI layer where Jarvis presents extracted data for user approval before persisting it to the store.
- **Explainability UI:** Implement the “Why do you know this?” popover/card that maps an AI statement back to its source (e.g., "From your log on Tuesday").
- **Undo/Correction Surfaces:** Easy, in-context buttons to reverse a Jarvis action immediately after it occurs.

## 7. Required AI/Jarvis Dependencies
- **Hotspot Refactoring:** Splitting `src/lib/jarvis/tools.ts` into domain-specific tool files (e.g., `jarvis-training-tools.ts`, `jarvis-nutrition-tools.ts`) to prevent constant merge conflicts.
- **Voice Parked Status:** A clear architectural separation ensuring Voice-to-Text pipelines remain distinct and parked until explicit future phases.

## 8. Required Privacy/Safety Dependencies
- **Medical Refusal Rules:** Hardcoded prompt instructions refusing diagnosis for sleep, injuries, or illness, redirecting to Book 8 safety boundaries.
- **Permission Gate Checks:** Runtime checks ensuring Jarvis does not read/write to specific memory categories without explicit feature opt-in.
- **Demo Mode Isolation:** Ensuring Jarvis interactions during demo mode are wiped and never train or pollute the real user profile.

## 9. Required QA/Testing Dependencies
- **Tool Safety Tests:** Automated testing verifying Jarvis correctly refuses specific unsafe prompts (e.g., "diagnose my knee pain").
- **State Reversal Tests:** E2E validation that an "Undo" action successfully removes the logged item from `localStorage` without side effects.

## 10. Implementation Sequence
1.  **Architecture:** Refactor `src/lib/jarvis/tools.ts` to solve the code structure hotspot.
2.  **Core Tooling:** Implement robust Audit/Logging schemas and Duplicate-Prevention hashing.
3.  **Safety & Context:** Implement Medical Safety boundaries, Permission checks, and Memory Categories.
4.  **UI Foundation:** Build Confirmation before saving, Explainability ("Why do you know this?"), and Undo UI.
5.  **Logging Actions:** Implement Typed Jarvis logging for standard domains (Meals, Workouts).
6.  **Advanced Logic:** Finalize Demo account behaviors and correction propagation.

## 11. Unsafe Shortcuts
- Allowing Jarvis to auto-commit data without a user confirmation step.
- Leaving `src/lib/jarvis/tools.ts` as a monolithic god-object.
- Failing to log Jarvis actions, making debugging "hallucinations" impossible.
- Utilizing real AI endpoints without mocking during CI, leading to flaky tests.

## 12. Suggested Future PR Breakdown
- PR 1: `jarvis/tools.ts` Architecture Refactor and Hotspot Elimination.
- PR 2: AI Action Auditing, Duplicate Prevention, and Memory Category Schemas.
- PR 3: Confirmation UI, Explainability UI, and Undo logic.
- PR 4: Medical Safety System Prompts and Permission gates.
- PR 5: Typed Logging Tool Implementation (Workouts/Meals) with Confirmation flows.

## 13. Acceptance Criteria Before Runtime Work Starts
- `jarvis/tools.ts` refactor strategy is documented and approved.
- The Confirmation UI layout is approved and adheres to Book 5 standards.
- Action logging and Undo mechanics are explicitly defined.

## 14. Final Dependency Table

| Dependency | Required before implementation? | Source/planning input | Risk if missing | Recommended next action |
| :--- | :--- | :--- | :--- | :--- |
| `tools.ts` Hotspot Refactoring | Yes | `docs/audits/current-code-structure-audit.md` | Severe merge conflicts as multiple agents expand Jarvis | Split tools by domain |
| Confirmation UI / UX Flow | Yes | `docs/audits/jarvis-action-logging-audit.md` | Auto-saving incorrect data, ruining user trust | Build the staging/review component |
| Medical Safety Prompts | Yes | `docs/product-bible/book-08-medical-genetics-and-precision-health/README.md` | Providing dangerous or liable medical advice | Define hard refusal rules in AI config |
| Action Logging & Undo Schema | Yes | `docs/audits/jarvis-action-logging-audit.md` | Inability to revert mistakes or track AI errors | Create audit log types |
