# FitCore Privacy, Health Claim, and User Trust Audit

## 1. Executive summary

- current privacy architecture: Data is persisted locally on the device via synchronous `localStorage` updates without remote backend synchronization.
- current sensitive-data footprint: The application stores granular physical attributes (current/target bodyweight), daily health telemetry (sleep hours, soreness, fatigue, stress), nutrition logs (meals, supplements), and workout history in local state.
- current consent and permission model: Jarvis AI capabilities are governed by a numeric permission level (`1` through `4`) in `src/components/app/jarvis/settings-card.tsx`.
- current user-control model: Users have control to edit or delete records in domain views, export all state to JSON, or reset the local store completely via `src/components/app/views/settings.tsx`.
- current health-language boundaries: The application calculates composite scores (e.g., `fitcoreScore`, Readiness, Recovery in `src/lib/analytics.ts`) and presents them as analytical derivations.
- current recommendation transparency: AI recommendations via Jarvis provide contextual insights. Action receipts surface what operations the AI took in `src/components/app/jarvis/confirm-card.tsx`.
- strongest trust-preserving behavior: The primary local-first persistence model ensures data is not synchronized to a proprietary cloud by default.
- most serious privacy risks: The use of `localStorage` provides no protection against other users on a shared device.
- most serious sensitive-data exposure risks: Progress photos and unstructured text notes (workouts, recovery check-ins) are stored locally and accessible on shared devices.
- most serious health-claim risks: The AI coaching tools (Jarvis) can access `injuryAreas` and potentially generate unregulated treatment or prescriptive fitness advice.
- most serious deletion and retention risks: The global reset clears all state variables, but exported JSON files remain in the user's OS file system indefinitely.
- most serious progress-photo risks: Progress photos persist in local state. Base64 strings inside `localStorage` can lead to storage quota exhaustion and severe shared-device privacy leaks.
- most serious Jarvis trust risks: Unstructured chat context is transmitted to Groq/Gemini APIs (`src/lib/ai.functions.ts`).
- major future Data Safety dependencies: Implementation of asynchronous storage, explicit data transmission boundaries, and shared-device lock schemas.
- most important requirements for future implementation approval: Introduction of shared-device mitigations and clear visual disclosures of what specific data is included in an LLM context payload.

## 2. Method and evidence boundaries

- required base SHA: `3e4326782d761313c4f2644ecfe55503770b360a`
- static inspection methodology: Conducted static analysis via file inspection across the codebase. No tests were executed, and the application was not run.
- source files inspected: `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/ai.functions.ts`, `src/lib/jarvis/tools.ts`, `src/components/app/jarvis/jarvis-panel.tsx`, `src/components/app/views/settings.tsx`, `src/components/app/views/onboarding.tsx`, `src/components/app/views/training.tsx`, `src/components/app/views/nutrition.tsx`, `src/components/app/views/recovery.tsx`, `src/components/app/views/progress.tsx`.
- why no runtime network behavior is being claimed: This is a static code inspection task only.
- why no security assurance is being claimed: No penetration testing or encryption analysis was performed.
- why no legal compliance determination is being made: The audit focuses purely on technical enforcement, not regulatory or legal compliance.
- why no medical-safety determination is being made: Health language is evaluated for safety claim boundaries, not clinical validity.
- how current main is distinguished from unmerged Data Safety work: The audit relies strictly on code present at the specified base commit.

## 3. Local persistence architecture

- Storage Key: `fitcore.v1`.
- Mechanism: Synchronous serialization of `AppState` via `useStore` subscription (`src/lib/store.tsx`).
- Data Categories: Core domain arrays (`workouts`, `mealEntries`, `recoveryCheckIns`, `progressPhotos`, `jarvisAudit`, etc.).
- Risk: All data is locally persisted in a single JSON blob. Storage quota exhaustion could cause data loss without graceful handling.

## 4. Separate storage-key inventory

- AI API Keys: Gemini and Groq user keys are configured in `jarvisSettings` and stored inside the main `AppState` (`fitcore.v1`), meaning they are exported in plain text during a JSON backup.

## 5. Sensitive-data taxonomy

- Bodyweight
  - exact type and field: `Profile.bodyweightLb`, `BodyweightEntry.weightLb`
  - collection: Onboarding, Weigh-in Popup
  - creation path: `src/components/app/views/onboarding.tsx`, `src/components/app/popups/quick-popups.tsx`
  - display path: `src/components/app/views/progress.tsx`, `src/components/app/views/home.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Individual record delete, Global reset
  - AI-context inclusion: potentially transmitted to a configured AI provider
  - shared-device exposure: High (visible on Home dashboard)
  - tests: Minimal/Unknown
  - sensitivity rationale: Highly sensitive physical metric.
- Goals and Injuries
  - exact type and field: `UserGoalsProfile.goal`, `injuryAreas`
  - collection: Settings profile
  - creation path: `src/components/app/views/settings.tsx`
  - display path: `src/components/app/views/settings.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Global reset
  - AI-context inclusion: potentially transmitted
  - shared-device exposure: Medium
  - tests: Minimal/Unknown
  - sensitivity rationale: Aspirational tracking and medical/injury context.
- Workouts and Sets
  - exact type and field: `Workout.exercises`, `SetEntry.weight`, `SetEntry.reps`
  - collection: Active Workout
  - creation path: `src/components/app/active-workout.tsx`
  - display path: `src/components/app/views/training.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Individual workout delete
  - AI-context inclusion: potentially transmitted
  - shared-device exposure: High
  - tests: Minimal/Unknown
  - sensitivity rationale: Detailed behavioral tracking.
- Free-text Notes (Workouts/Meals/Check-ins)
  - exact type and field: `Workout.notes`, `RecoveryCheckIn.notes`
  - collection: Domain views
  - creation path: Domain views
  - display path: Domain views
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Delete parent record
  - AI-context inclusion: potentially transmitted
  - shared-device exposure: High
  - tests: Minimal/Unknown
  - sensitivity rationale: Unstructured free text can contain highly sensitive secrets.
- Meals and Macros
  - exact type and field: `MealEntry.calories`, `protein`, `carbs`, `fat`
  - collection: Nutrition View
  - creation path: `src/components/app/views/nutrition.tsx`
  - display path: `src/components/app/views/nutrition.tsx`, Home
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Individual meal delete
  - AI-context inclusion: potentially transmitted
  - shared-device exposure: High
  - tests: Minimal/Unknown
  - sensitivity rationale: Daily habit tracking.
- Supplements
  - exact type and field: `SupplementLog.name`, `dose`
  - collection: Nutrition View
  - creation path: `src/components/app/views/nutrition.tsx`
  - display path: `src/components/app/views/nutrition.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Individual delete
  - AI-context inclusion: potentially transmitted
  - shared-device exposure: High
  - tests: Minimal/Unknown
  - sensitivity rationale: Health/Wellness and potential medical context.
- Wellness Telemetry (Sleep, Soreness, Fatigue, Stress)
  - exact type and field: `SleepEntry.hours`, `RecoveryCheckIn.soreness`, `stress`
  - collection: Recovery View, Check-in Popup
  - creation path: `src/components/app/views/recovery.tsx`, `src/components/app/popups/quick-popups.tsx`
  - display path: `src/components/app/views/recovery.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Individual delete
  - AI-context inclusion: potentially transmitted
  - shared-device exposure: High
  - tests: Minimal/Unknown
  - sensitivity rationale: Physical and mental well-being telemetry.
- Progress Photos
  - exact type and field: `ProgressPhoto.id`, image blob
  - collection: Progress View
  - creation path: `src/components/app/views/progress.tsx`
  - display path: `src/components/app/views/progress.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Individual delete
  - AI-context inclusion: not verifiable without runtime network inspection
  - shared-device exposure: Critical
  - tests: Minimal/Unknown
  - sensitivity rationale: Highly sensitive visual data.

## 6. Onboarding collection

- Current onboarding explicitly collects: goal, experience, training days (inferred via split), split, current bodyweight, target bodyweight, calorie target, protein target, carbohydrate target, fat target. It does not collect exact age, sex, or height on the primary screen.

## 7. Domain data collection

- Domain collections include workouts, meals, supplements, and recovery telemetry. Note fields exist on almost all domain logs allowing free text.

## 8. Progress photos

- actual accepted file types: HTML default file picker.
- exact size validation: Not present statically.
- Base64/data URL representation: Rendered via `<img src={...}>` from string stored in state.
- local persistence: Yes, in `AppState.progressPhotos`.
- export inclusion: Yes.
- individual delete: Yes, via `ConfirmDialog` in Progress view.
- reset behavior: Removed during global reset.
- AI transmission: Not verifiable without runtime inspection (no explicit `aiChat` image injection logic found).
- quota risk: High (quota exhaustion risk if Base64 encoded in local storage).
- shared-device exposure: Critical.

## 9. Export

- export filename: Uses a dated filename `fitcore-backup-YYYY-MM-DD.json`.
- behavior: Full plain-text JSON blob via `exportJson`. Included data categories: All `AppState`.

## 10. Import

- merge behavior: The `importJson` function parses and validates the payload, then merges it with current/default state via `migrateAppState`. It overwrites imported array fields at the top level and has no granular collection-level conflict resolution or automatic rollback mechanism on failure.

## 11. Reset

- behavior: Global reset `reset()` returns the store to `defaultState`.

## 12. User-control matrix

- profile: create (Yes), view (Yes), edit (Yes), delete (Reset), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- bodyweight: create (Yes), view (Yes), edit (No explicit), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- workouts: create (Yes), view (Yes), edit (Yes), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- active workout: create (Yes), view (Yes), edit (Yes), delete (Discard), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- meals: create (Yes), view (Yes), edit (No explicit), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- supplements: create (Yes), view (Yes), edit (No explicit), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- recovery check-ins: create (Yes), view (Yes), edit (No explicit), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- sleep: create (Yes), view (Yes), edit (No explicit), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- muscle fatigue: create (Derived), view (Yes), edit (No), delete (No), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- goals: create (Yes), view (Yes), edit (Yes), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- progress photos: create (Yes), view (Yes), edit (No), delete (Yes), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- Jarvis audit entries: create (Automated), view (Yes), edit (No), delete (Reset), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (Yes via UI), retention control (No).
- Jarvis conversation messages: create (Yes), view (Yes), edit (No), delete (Clear all), bulk delete (Clear all), export (No, component memory), import (No), reset (Yes, cleared on unmount/clear), undo (No), retention control (No).
- settings: create (Yes), view (Yes), edit (Yes), delete (Reset), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).

## 13. Deletion and retention

- All domain arrays (`workouts`, `mealEntries`, `recoveryCheckIns`) support individual record deletion which removes the item from the array in `AppState`. Retention of these arrays is indefinite until manual deletion or global reset.

## 14. Shared-device exposure

- `localStorage` persists data without auth. Anyone opening the app on a shared device sees the previous user's full health profile.

## 15. Jarvis rendered-message lifecycle

- The `jarvis-panel.tsx` component stores messages in a local React state variable: `const [messages, setMessages] = useState<RenderedMsg[]>([])`.
- panel close behavior: Survives panel close (if component remains mounted or hidden via CSS).
- component unmount behavior: Messages are lost on unmount (component-memory only).
- page reload behavior: Messages are lost on reload.
- app-state export inclusion: Rendered messages are NOT exported in `AppState`.
- classification: component-memory only.

## 16. aiMessages lifecycle

- `aiMessages` does not actively drive the current rendered conversation in `jarvis-panel.tsx`. The panel uses local state `messages`.

## 17. Jarvis audit lifecycle

- `JarvisAuditEntry` items are pushed to `AppState.jarvisAudit` by tools in `src/lib/jarvis/tools.ts`. They are persisted in `localStorage` and included in JSON exports. Distinct from conversation messages.

## 18. AI request construction

- transmitted to a server function: `aiChat` receives the user message, context summary (string), section string, selected tool schemas, and provider config. The full serialized `AppState` is NOT sent by default.

## 19. System-prompt data inclusion

- The system prompt is constructed using the `contextSummary` (which abstracts state fields) rather than raw serialized state.

## 20. Tool-schema transmission

- Selected tool schemas are sent to the AI provider to allow function calling.

## 21. API-key handling

- storage keys: `jarvisSettings.userGeminiApiKey` and `userGroqApiKey`.
- local persistence: Yes, stored in `fitcore.v1` `AppState`.
- export inclusion: Yes (Plain text).
- transmission to server function: Yes, sent in the payload.
- visibility in UI: Masked or managed in Settings UI.
- deletion/clearing behavior: Removed via global reset or manual setting clear.

## 22. Diagnostics handling

- AI diagnostics tracking (`AiCallDiagnostics`) handles telemetry regarding model fallback and token sizing, but does not explicitly persist sensitive chat content.

## 23. Consent and permission controls

- Jarvis Permissions: Settings UI for AI autonomy.
- Missing: Granular, pre-submission AI context-sharing consent checkboxes.

## 24. Health scores

- Readiness:
  - source: `src/lib/analytics.ts`
  - exact or concise paraphrased claim: "Readiness score"
  - input data: Sleep, soreness, fatigue.
  - derived formula: Weighted algorithmic sum.
  - disclaimer: Absent.
  - uncertainty language: Absent.
  - action severity: Low.
  - medical-review need: No.
  - product-review need: Yes.
- Recovery:
  - source: `src/lib/analytics.ts`
  - exact or concise paraphrased claim: "Recovery"
  - input data: Check-in data.
  - derived formula: Algorithmic.
  - disclaimer: Absent.
  - uncertainty language: Absent.
  - action severity: Low.
  - medical-review need: No.
  - product-review need: Yes.
- Momentum:
  - source: `src/lib/analytics.ts`
  - exact or concise paraphrased claim: "Momentum score"
  - input data: Adherence logic.
  - derived formula: Trend analysis.
  - disclaimer: Absent.
  - uncertainty language: Absent.
  - action severity: Low.
  - medical-review need: No.
  - product-review need: Yes.

## 25. Recommendations

- training/muscle/nutrition recommendations:
  - source: AI generated (Jarvis LLM outputs).
  - input data: Context summary provided in prompt.
  - derived formula: N/A.
  - disclaimer: Absent.
  - uncertainty language: Variable.
  - action severity: High.
  - medical-review need: Yes (to establish safe system prompts).
  - product-review need: Yes.

## 26. Pain and injury boundaries

- pain/injury warnings: AI can access `injuryAreas`.
  - source: AI generated.
  - exact or concise paraphrased claim: Context-dependent AI response.
  - input data: `UserGoalsProfile`.
  - derived formula: N/A.
  - disclaimer: Absent.
  - uncertainty language: Variable.
  - action severity: High.
  - medical-review need: Yes (to ensure no prescriptive treatment advice).
  - product-review need: Yes.

## 27. Nutrition and bodyweight language

- bodyweight progress:
  - source: `src/lib/analytics.ts`.
  - exact or concise paraphrased claim: "Momentum".
  - input data: Adherence.
  - derived formula: Trend logic.
  - disclaimer: Absent.
  - uncertainty language: Absent.
  - action severity: Low.
  - medical-review need: No.
  - product-review need: Yes.

## 28. Transparency and explanations

- confidence: System generates confidence metrics (`DataProvenance`) but they are largely internal. Evidence visibility is hidden.

## 29. Undo and recovery

- Jarvis actions have undo via snackbar (`undoAuditEntry`). Manual deletions do not. Imports restore prior states.

## 30. Current disclosures

- Warning on import overwrite. Export implies data stays local.

## 31. Missing disclosures

- No explicit disclosure of AI context transmission boundaries. No shared-device warnings.

## 32. Test coverage

- Tests exist in `tests/e2e/helpers/fitcore-test-state.ts`. Privacy scenarios are not evident from static inspection.

## 33. Privacy-risk register

- Shared-device exposure. `localStorage` persists data without auth.
- Progress photo storage. Unencrypted images in state.
- Export plain text JSON. Full unencrypted data dump to user OS, including API keys.
- AI context transmission. Extent of state context payload sent to LLMs is opaque to user.

## 34. Health-language risk register

- Jarvis injury advice. Lack of hard bounds for treatment advice based on `injuryAreas`.
- Readiness score presentation. Could be interpreted diagnostically without disclaimers.

## 35. User-trust risk register

- Import full state overwrite. Destructive replacement.
- Silent synchronous saves. Lack of visual "saved" confirmation.

## 36. Future design options

- possible mitigation: Shared-device lock/authentication.
- future design option: Asynchronous blob storage for photos.
- future design option: Encrypted backup format.
- unresolved product requirement: Granular context toggles for AI.

## 37. Safe implementation boundaries

- UI component refactoring should not alter `src/lib/store.tsx` persistence structure.
- AI prompt engineering must not bypass existing `JarvisSettings.permission` boundaries.

## 38. Open questions

- Are progress photos serialized as Base64 strings or Object URLs? (Requires runtime network/storage inspection).

## 39. File index

- `src/lib/types.ts`
- `src/lib/store.tsx`
- `src/lib/ai.functions.ts`
- `src/lib/jarvis/tools.ts`
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/jarvis/confirm-card.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/views/onboarding.tsx`
- `src/components/app/views/home.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/sheet.tsx`
- `src/lib/analytics.ts`
- `README.md`
