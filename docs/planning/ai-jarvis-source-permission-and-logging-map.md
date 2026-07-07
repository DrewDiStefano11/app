# AI/Jarvis Source, Permission, and Logging Map

## 1. AI/Jarvis Responsibilities
The Jarvis assistant will act as a primary interface for data entry and insight generation, governed by the following core responsibilities:
- **Answer questions:** Provide context-aware answers based on the user's fitness, nutrition, and recovery data.
- **Log user-provided data:** Accurately parse and map unstructured text or image inputs into structured logs.
- **Summarize trends:** Synthesize historical data into easy-to-understand progress updates.
- **Explain scores:** Clearly articulate the inputs and reasoning behind aggregate metrics (e.g., FitCore Score, Recovery Score).
- **Explain recommendations:** Provide transparent reasoning for suggested training or nutrition adjustments.
- **Ask for confirmation when needed:** Pause execution and request explicit user approval for destructive, low-confidence, or sensitive actions.
- **Respect disabled categories:** Do not process, log, or answer questions regarding data categories the user has explicitly disabled.
- **Avoid medical diagnosis:** Strictly refuse to provide diagnoses or interpretations of symptoms beyond standard fitness fatigue.
- **Recommend professional care only with cautious red-flag language:** Suggest consulting a doctor if persistent pain or severe symptoms are identified, avoiding any prescriptive medical advice.

## 2. Data Categories AI May Use
Jarvis will be permitted to access and process the following data categories, subject to user permissions:
- Training data (workouts, exercises, sets, performance metrics)
- Nutrition data (meals, macro estimates, typical habits)
- Recovery data (check-ins, readiness scores)
- Body metrics (bodyweight, measurements)
- Sleep data (duration, quality)
- Pain/soreness data (localized fatigue, DOMS, general discomfort)
- Goals (current fitness objectives, target metrics)
- Preferences (dietary restrictions, preferred training styles)
- Injury history (past logged injuries or limitations)
- Medical history (only if explicitly enabled via precision health settings)
- Genetic/lab data (only if explicitly enabled via precision health settings)
- Photos/conversations where applicable (meal photos, chat history)
- Future imported data (wearables, health app sync)

## 3. Permission Levels
To ensure data safety and respect user privacy, Jarvis will operate within the following planning-level permission categories:
- **Always safe context:** General fitness knowledge, aggregated non-sensitive user trends.
- **User-approved fitness context:** Direct access to training, nutrition, and basic recovery logs for logging and analysis.
- **Sensitive health context:** Requires explicit opt-in. Covers pain tracking, detailed injury history, and granular sleep data.
- **Medical/genetic context requiring extra consent:** Strictly isolated. Requires separate, explicit consent for AI processing beyond local storage.
- **Disabled category:** Data types the user has opted out of tracking or AI analysis. Jarvis must treat this data as non-existent.
- **Deleted/hidden data:** Data the user has removed or archived. Jarvis must not reference or use this data for insights.
- **Demo-only data:** Synthetic data used in demo mode. Jarvis must never mix demo data with real persistent state.

## 4. AI Logging Map
When the user requests Jarvis to log data, the following rules apply:

| Action | What Data Should Be Captured | Confirmation Needed? | What Context Updates | Source Label Attached |
| :--- | :--- | :--- | :--- | :--- |
| **Workout** | Exercises, sets, reps, weight, duration, RPE. | If low confidence or high permission level. | Dashboard, Training History. | `jarvis` / `ai-estimated` |
| **Exercise** | Type, sets, reps, weight, RPE. | If ambiguous. | Active Workout, History. | `jarvis` |
| **Set** | Reps, weight, RPE. | Rarely, unless part of a larger ambiguous log. | Active Workout. | `jarvis` |
| **Meal** | Items, estimated calories/macros, portions. | If low confidence (e.g., vague text). | Nutrition Dashboard, Daily Totals. | `jarvis` / `ai-estimated` |
| **Macro estimate** | Explicit macro targets or estimates from photos. | Always, if derived from photos or vague text. | Nutrition Dashboard. | `ai-estimated` / `camera` |
| **Weigh-in** | Bodyweight value, unit. | Only if the parsed value seems wildly out of historical bounds. | Body Metrics, Dashboard. | `jarvis` |
| **Check-in** | Soreness, fatigue, sleep quality, stress. | If overriding an existing check-in for the day. | Recovery Dashboard, Readiness Score. | `jarvis` |
| **Soreness** | Location, intensity. | No, but triggers recovery update. | Recovery Check-in. | `jarvis` |
| **Pain** | Location, intensity. | Yes, to ensure user is aware it's logged as pain, not an injury diagnosis. | Injury/Recovery Log. | `jarvis` |
| **Fatigue** | General fatigue level. | No. | Recovery Check-in. | `jarvis` |
| **Sleep** | Duration, quality. | If conflicting with wearable data. | Recovery Dashboard. | `jarvis` |
| **Injury note** | Location, mechanism, limitation. | Yes, due to sensitive nature. | Injury Profile. | `jarvis` |
| **Medical note** | Symptoms, medications (if enabled). | **Always**. Extra caution required. | Precision Health Profile. | `jarvis` |
| **Goal update** | New target metric or timeline. | Yes, as it alters the AI's future coaching parameters. | User Profile, Coaching Engine. | `jarvis` |
| **Correction to log** | Delta between previous entry and user correction. | No, user initiated. | Relevant Dashboard (Nutrition/Training). | `user_corrected` |

## 5. Source Explainability
To build user trust, Jarvis must be able to explain the provenance of its data and insights:
- **"Why do you know this?"**: UI should provide a mechanism (e.g., an info button) on AI-generated logs detailing the source (e.g., "Extracted from your chat message on [Date]").
- **"Why did you recommend this?"**: Recommendations must link back to specific rules or data points (e.g., "Suggested resting because your soreness level is high").
- **Showing source category**: Every log must visibly display its origin (Manual, Verified, Jarvis, Camera, Imported, Sensor).
- **Data Status Indicators**: The UI must clearly indicate if data is user-entered, AI-estimated, corrected, imported, stale, missing, or conflicting.
- **Not hiding uncertainty**: AI estimates must not masquerade as absolute facts. Medium or low confidence logs must be visually distinct and use language that acknowledges the estimation.

## 6. Tool Safety and Confirmation
Jarvis actions are gated by strict safety and confirmation protocols:
- **Low-confidence actions require confirmation**: Any parsing or estimation that the AI flags as medium or low confidence must pause for user review before saving.
- **Destructive actions require confirmation**: Deleting data (e.g., meals, workouts) always requires explicit user approval.
- **Sensitive data actions require confirmation**: Modifying goals, medical notes, or injury history requires confirmation.
- **Demo mode isolation**: Actions performed while the app is in demo mode must never mutate real user data or leak into the persistent `state`.
- **Undo/audit expectations**: Every AI mutation must generate a reversible audit log entry, allowing the user to easily undo recent Jarvis actions.
- **No silent overwrites**: AI must not silently overwrite user-entered data. Conflicting updates must prompt the user for resolution.

## 7. Medical and Safety Boundaries
Jarvis operates strictly within the bounds of a fitness and wellness assistant:
- **No diagnosis**: Jarvis must never attempt to diagnose an injury, illness, or medical condition.
- **No treatment claims**: Jarvis cannot prescribe medical treatments or claim that a specific protocol will cure a condition.
- **No medical-device claims**: Jarvis must not present its estimations as equivalent to clinical medical devices.
- **Cautious wording for pain/symptoms**: When discussing pain, Jarvis must use neutral, descriptive language (e.g., "localized discomfort" rather than "muscle tear").
- **Urgent care language**: Only used when symptoms are severe, sudden, or worsening (e.g., "If this pain is sharp and sudden, please stop exercising and consult a professional").
- **Professional care recommendation**: Jarvis will suggest consulting a physical therapist or doctor if pain patterns are persistent or concerning, without prescribing specific actions.

## 8. Failure Cases
The system must gracefully handle the following AI failure modes:
- **AI logs wrong category**: Handled via robust undo capability and clear source labeling for easy manual correction.
- **AI uses disabled data**: Strict pre-filtering of context provided to the AI prevents this. If it occurs, the action is blocked at the state mutation layer.
- **AI references deleted data**: Audit logs must correctly clear or tombstone deleted entities so they are not fed back into the AI context window.
- **AI overstates confidence**: Mitigated by system prompts encouraging conservative confidence scoring, and fallback rules that downgrade ambiguous text.
- **AI creates duplicate entries**: Prevented by action key hashing and duplication checks in the tool handler.
- **AI confuses demo and real data**: Mitigated by strict separation of `state` and `view` during tool execution.
- **AI interprets missing data as negative behavior**: AI must be trained to differentiate between "no data logged" and "poor performance."
- **AI makes medical claims**: System prompts strictly forbid this; user reports of such behavior should trigger an immediate review of prompt safety.

## 9. Future Implementation Sequence
To realize this map, the following sequence will be followed:
1. Inventory current AI/Jarvis tools and their mutation capabilities.
2. Define and formalize all source labels (`DataProvenance`, `DataSource`).
3. Define permission categories and integrate them into the user settings UI.
4. Add strict confirmation rules for low-confidence and sensitive actions in `jarvis-panel.tsx`.
5. Add correction and deletion propagation logic to ensure linked data (e.g., Daily Decisions) updates appropriately.
6. Add "Why do you know this?" source explanations to the UI for AI-generated logs.
7. Add robust unit and E2E tests validating permission boundaries and confirmation flows.

## 10. Acceptance Criteria for Future Implementation
Future implementation PRs related to this map will be evaluated against the following criteria:
- AI correctly routes logs into the appropriate data category.
- AI strictly respects disabled tracking categories and does not process related data.
- AI UI provides a clear, accessible explanation of the source data for its logs and insights.
- AI does not reference or utilize data the user has deleted.
- AI responses demonstrably avoid medical diagnosis or prescriptive treatment.
- The UI mandates explicit user confirmation for sensitive, destructive, or low-confidence actions.
- Demo mode state remains perfectly isolated, with zero data bleed into the user's real persistent state.
