# Wave 3 Typed Jarvis Logging Safety Code-Scope Audit

## 1. Purpose and scope
This audit prepares the codebase for Wave 3 runtime implementation, focusing on typed Jarvis logging safety. Wave 3 will implement explicit user confirmation before saving AI-generated data, source explainability, duplicate prevention, correction/deletion handling, and strict safety boundaries.

**Important Note:** Parked PR #2 (voice Jarvis) remains out of scope. This audit is strictly for typed Jarvis interactions.

## 2. Source docs checked
* `docs/planning/implementation-start-handoff.md`
* `docs/planning/post-product-bible-cleanup-plan.md`
* `docs/planning/post-bible-agent-task-queue.md`
* `docs/planning/ai-jarvis-source-permission-and-logging-map.md`
* `docs/planning/ai-logging-qa-checklist.md`
* `docs/planning/source-labels-and-confidence-model-plan.md`
* `docs/audits/jarvis-action-logging-audit.md`
* `docs/audits/ai-provenance-confidence-audit.md`

## 3. Runtime files inspected
| File path | Ownership | Jarvis flow affected | Risk level | Likely Wave 3 changes | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/components/app/jarvis/jarvis-panel.tsx` | Typed chat UI | Panel interaction, confirmation staging | High | Adding staging/confirmation UI loop for mutating tools. | High traffic component. |
| `src/lib/jarvis/tools.ts` | Tool definitions and execution | All AI data writes | Very High | Implementing duplicate prevention, pausing writes until confirmed, undo logic. | Central hotspot for all AI state changes. |
| `src/lib/ai.functions.ts` | AI LLM interface | Confidence/source parsing | Medium | Updating system prompt instructions to return confidence/source data. | Needs careful tuning to avoid breaking parsing. |
| `src/components/app/jarvis/confirm-card.tsx` | Confirmation UI | User review step | Medium | Formatting staging data (confidence, source) for user review. | |

## 4. Current typed Jarvis logging behavior
Typed logging uses `runTool` in `tools.ts` triggered by LLM tool calls. When the LLM decides to log something (e.g., `logMeal`, `logWorkout`), it executes the tool synchronously, writing directly to the global app state without an explicit, blocking user confirmation loop in the UI.

## 5. Current confirmation behavior
There is a lack of a strict staging/confirmation loop for mutating actions. Actions that should require confirmation (e.g., `logMeal`) are executed immediately. The UI might show what *was* done, but the user didn't get to say "Yes, save this" beforehand.

## 6. Current action audit/undo behavior
The system does have some foundational undo behavior via the `undoAuditEntry` function in `tools.ts` and `JarvisAuditEntry` types. The UI supports an "Undo that" natural language command, but explicit UI buttons for undo immediately following an action may be missing or inconsistent.

## 7. Current source/confidence/provenance handling
Functions like `createAiEstimateProvenance` exist in `fitcore-data.ts`, but the LLM parsing layer (`ai.functions.ts`) and the UI representation (`confirm-card.tsx`, `jarvis-panel.tsx`) do not consistently mandate and display explicit confidence scores (High, Medium, Low) or "Why do you know this?" explanations for every log.

## 8. Current duplicate prevention behavior
Duplicate prevention relies primarily on the AI's context window understanding what it just logged. There is a risk that repeated or ambiguous prompts could lead to identical or near-identical duplicate entries in the state if the AI gets confused.

## 9. Current correction/delete behavior
Users can currently correct or delete data manually via the standard UI, and there are tools (`updateMeal`, `deleteMeal`) for Jarvis to do so. However, ensuring that these actions properly maintain the provenance chain (e.g., marking a record as `user_corrected`) and ensuring AI memory updates accordingly needs tightening.

## 10. Safety gaps and risks
The most critical safety gap is the **lack of a blocking confirmation loop** for mutating tools, violating the core rule that "Jarvis must not silently save data." Additionally, the AI's ability to potentially alter sensitive settings without explicit user opt-in is a risk area needing stricter gating in `tools.ts`.

## 11. File overlap analysis
`src/lib/jarvis/tools.ts` is a massive cross-domain hotspot. Any changes to how tools execute (like adding a 'staged' state) will require corresponding changes in `jarvis-panel.tsx` to handle that state.

## 12. Recommended Wave 3 PR breakdown
* **Recommendation**: **One combined PR**.
* **Reasoning**: The introduction of a confirmation loop requires modifying the return signature and execution flow of tools in `tools.ts` AND simultaneously updating the chat UI in `jarvis-panel.tsx` to handle the new `needsConfirmation` flag and present the `confirm-card.tsx`. Splitting these apart would result in a broken AI interaction flow.

## 13. Out-of-scope list
* Voice Jarvis
* PR #2
* active workout implementation
* graph redesign
* schema migrations
* package/lockfile/config/workflow changes
* service worker changes

## 14. Final recommendation table

| Area | Likely files | Recommended PR | Parallel safe? | Risk | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Confirmation Loop & UI | `jarvis-panel.tsx`, `confirm-card.tsx` | 3A (Combined) | No | High | Must land with tool changes. |
| Tool Execution & Safety | `tools.ts`, `ai.functions.ts` | 3A (Combined) | No | Very High | Extreme risk of breaking AI logic. |
