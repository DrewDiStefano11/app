# FitCore Privacy, Health Claim, and User Trust Audit

## 1. Executive summary

- current privacy architecture: Data is persisted locally on the device via synchronous `localStorage` updates without remote backend synchronization.
- current sensitive-data footprint: The application stores granular physical attributes (height, bodyweight), daily health telemetry (sleep hours, soreness, fatigue, stress), nutrition logs (meals, supplements), and workout history in local state.
- current consent and permission model: Jarvis AI capabilities are governed by a numeric permission level (`1` through `4`) in `src/components/app/jarvis/settings-card.tsx`, but no explicit pre-submission consent gateways exist for sending context to Groq/Gemini APIs.
- current user-control model: Users have control to edit or delete records in domain views, export all state to JSON, or reset the local store completely via `src/components/app/views/settings.tsx`.
- current health-language boundaries: The application calculates composite scores (e.g., `fitcoreScore`, Readiness, Recovery in `src/lib/analytics.ts`) and presents them as analytical derivations. Some Jarvis outputs rely on LLM system prompts lacking hard medical guardrails.
- current recommendation transparency: AI recommendations via Jarvis provide contextual insights based on application state. Action receipts surface what operations the AI took in `src/components/app/jarvis/confirm-card.tsx`.
- strongest trust-preserving behavior: The primary local-first persistence model ensures data is not synchronized to a proprietary cloud by default.
- most serious privacy risks: The use of `localStorage` provides no protection against other users on a shared device. All health and profile data is exposed immediately upon opening the app.
- most serious sensitive-data exposure risks: Progress photos and unstructured text notes (workouts, recovery check-ins) are stored locally and accessible on shared devices.
- most serious health-claim risks: The AI coaching tools (Jarvis) can access `injuryAreas` and generate unregulated treatment or prescriptive fitness advice due to the lack of hard boundary rules before API transmission.
- most serious deletion and retention risks: The global reset clears all state variables, but exported JSON files remain in the user's OS file system indefinitely.
- most serious progress-photo risks: Progress photos persist in local state. Base64 strings inside `localStorage` can lead to storage quota exhaustion and severe shared-device privacy leaks.
- most serious Jarvis trust risks: Unstructured chat messages and full state context are transmitted to Groq/Gemini APIs (`src/lib/ai.functions.ts`). The persistence of `aiMessages` retains this sensitive unstructured context in `localStorage`.
- major future Data Safety dependencies: Implementation of asynchronous storage (IndexedDB), atomic writes, explicit data transmission boundaries, and shared-device lock schemas.
- most important requirements for future implementation approval: Introduction of shared-device mitigations, clear visual disclosures of what specific data is included in an LLM context payload, and granular privacy controls (e.g., hiding weight).

## 2. Method and evidence boundaries

- required base SHA: `3e4326782d761313c4f2644ecfe55503770b360a`
- static inspection methodology: Conducted static analysis via `grep` and file inspection across the codebase. No tests were executed, and the application was not run.
- source files inspected: `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/ai.functions.ts`, `src/lib/jarvis/tools.ts`, `src/components/app/jarvis/jarvis-panel.tsx`, `src/components/app/views/settings.tsx`, `src/components/app/views/home.tsx`, `src/components/app/views/training.tsx`, `src/components/app/views/nutrition.tsx`, `src/components/app/views/recovery.tsx`, `src/components/app/views/progress.tsx`.
- documentation inspected: `README.md`.
- tests inspected: `tests/e2e/helpers/fitcore-test-state.ts`.
- why no runtime network behavior is being claimed: This is a static code inspection task only. Network transmission statements are derived strictly from analyzing fetch/API logic in `src/lib/ai.functions.ts`.
- why no security assurance is being claimed: No penetration testing, runtime debugging, or encryption analysis was performed.
- why no legal compliance determination is being made: The audit focuses purely on technical enforcement and product behavior, not regulatory or legal compliance.
- why no medical-safety determination is being made: Health language is evaluated for safety claim boundaries and disclaimers, not clinical or diagnostic validity.
- how current main is distinguished from unmerged Data Safety work: The audit relies strictly on code present at the specified base commit, disregarding any parked PRs or active feature branches.

## 3. Privacy and data-flow architecture

- what state or context is sent: User prompts, configured system prompt, available tool schemas, and aggregated application state (`AppState`) to provide context to the LLM.
- where the request is constructed: `src/components/app/jarvis/jarvis-panel.tsx` captures input and triggers the server function.
- server-function boundaries: `aiChat` in `src/lib/ai.functions.ts` handles the API calls securely on the backend (if deployed, or locally in dev).
- external provider boundaries evident in code: Fetch calls to Groq and Gemini APIs within `src/lib/ai.functions.ts`.
- whether progress photos are sent: No explicit logic found sending images to LLMs for chat context in `aiChat`.
- whether conversation messages are persisted: Yes, locally in `aiMessages` state array.
- whether activity/audit records are persisted: Yes, locally in `jarvisAudit` state array.
- whether user controls exist for AI context: UI settings for permission level (1-4) dictate tool capability, but no granular data-inclusion toggles exist.
- what remains unclear without runtime network inspection: The exact serialized payload structure and size sent to Groq/Gemini APIs.

## 4. Sensitive-data taxonomy

- Profile fields (Name, Age, Height, Sex)
  - exact type and field: `Profile.name`, `Profile.age`, `Profile.heightIn`, `Profile.sex`
  - collection: Onboarding form
  - creation path: `src/components/app/views/onboarding.tsx`
  - display path: `src/components/app/views/settings.tsx`
  - persistence: locally persisted via `localStorage`
  - export inclusion: Yes
  - deletion path: Global reset only
  - AI-context inclusion: potentially transmitted to a configured AI provider
  - shared-device exposure: High (visible on Settings open)
  - tests: Minimal/Unknown
  - sensitivity rationale: Identifies the user and key demographic attributes.
- Bodyweight
  - exact type and field: `Profile.bodyweightLb`, `BodyweightEntry.weightLb`
  - collection: Onboarding, Weigh-in Popup
  - creation path: `src/components/app/views/onboarding.tsx`, `src/components/app/popups/quick-popups.tsx`
  - display path: `src/components/app/views/progress.tsx`, `src/components/app/views/home.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Individual record delete, Global reset
  - AI-context inclusion: potentially transmitted
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
- Jarvis Conversation Messages
  - exact type and field: `AiMessage.content`
  - collection: Jarvis Panel
  - creation path: `src/components/app/jarvis/jarvis-panel.tsx`
  - display path: `src/components/app/jarvis/jarvis-panel.tsx`
  - persistence: locally persisted
  - export inclusion: Yes
  - deletion path: Clear conversation
  - AI-context inclusion: transmitted to a server function
  - shared-device exposure: High
  - tests: Minimal/Unknown
  - sensitivity rationale: Unstructured disclosure of personal habits.

## 5. Persistence map

- Storage Key: `fitcore.v1`
- Mechanism: Synchronous serialization of the entire `AppState` via `useStore` subscription (`src/lib/store.tsx`).
- Data Categories: Everything (`Profile`, `Workout`, `MealEntry`, `RecoveryCheckIn`, `ProgressPhoto`, `AiMessage`, `JarvisAuditEntry`, etc.).
- Risk: All data is locally persisted in a single JSON blob. Quota exhaustion could cause data loss.

## 6. Export and import exposure

- export format: Full plain-text JSON blob via `exportJson`.
- included data categories: All `AppState`.
- filename: Hardcoded (`fitcore-backup.json`).
- destination behavior: Browser download.
- overwrite behavior: Full state replacement during import.
- Risks: Exported files are unencrypted on the host OS. Imports overwrite entire state destructively.

## 7. User-control matrix

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
- Jarvis conversation messages: create (Yes), view (Yes), edit (No), delete (Clear all), bulk delete (Clear all), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).
- settings: create (Yes), view (Yes), edit (Yes), delete (Reset), bulk delete (No), export (Yes), import (Yes), reset (Yes), undo (No), retention control (No).

## 8. Deletion and retention

- delete workout: Removes from `workouts` array.
- delete meal: Removes from `mealEntries` array.
- delete check-in: Removes from `recoveryCheckIns` array.
- delete weigh-in: Removes from `bodyweightEntries` array.
- delete progress photo: Removes from `progressPhotos` array.
- clear conversation: Clears `aiMessages` array.
- clear all data: `reset()` returns state to `defaultState`.
- retention: All domain records are retained indefinitely in local app state until manual deletion or reset.

## 9. Shared-device exposure

- automatic persistence: locally persisted without authentication.
- exposure risk: Anyone opening the app on a shared device sees the previous user's full health profile.
- mitigation: None currently implemented. (future design option: lock screen).

## 10. Progress-photo handling

- file input: HTML `<input type="file">`.
- accepted formats: Browser default image types.
- size validation: Not verifiable without runtime inspection.
- representation: Rendered via `<img>`. locally persisted in `AppState`.
- local persistence: Yes, stored in local app state.
- export inclusion: Yes.
- delete behavior: Individual delete removes from state array.
- reset behavior: Cleared by global reset.
- AI transmission: Not verifiable without runtime network inspection.
- storage quota risk: High (quota exhaustion risk if Base64 encoded).
- shared-device exposure: Critical.
- user disclosures: None indicating local-only risks.

## 11. Jarvis conversation lifecycle

- stored: locally persisted in `aiMessages`.
- survives panel close: Yes.
- panel unmounts: Component re-mounts read from global `useStore`.
- survives page reload: Yes, retained in `localStorage`.
- export inclusion: Yes.
- action audit entries: Maintained separately in `jarvisAudit`.

## 12. Jarvis action-audit lifecycle

- creation: Tools push to `jarvisAudit`.
- stored: locally persisted.
- persistence: Indefinite unless reset.
- export inclusion: Yes.
- undo: `undoAuditEntry` reverts the patch.

## 13. AI request and data-transmission map

- what state or context is sent: AppState summaries, schemas, and prompts.
- where the request is constructed: `src/components/app/jarvis/jarvis-panel.tsx`.
- server-function boundaries: `aiChat` handles fetch.
- external provider boundaries evident in code: Groq/Gemini APIs.
- whether progress photos are sent: Not verifiable without runtime network inspection.
- whether conversation messages are persisted: Yes, locally persisted.
- whether activity/audit records are persisted: Yes, locally persisted.
- whether user controls exist for AI context: Autonomy levels 1-4.
- what remains unclear without runtime network inspection: Exact serialized payload structure sent to LLMs.

## 14. Consent and permission controls

- Jarvis Permissions: Settings UI for AI autonomy.
- Destructive-action confirmation: `ConfirmDialog`.
- Missing: Pre-submission consent gateways for sending specific contexts to Groq/Gemini APIs.

## 15. Health-score language

- Readiness: "Readiness score"
  - source: `src/lib/analytics.ts`
  - input data: Sleep, soreness, fatigue.
  - calculation: Weighted algorithmic sum.
  - uncertainty language: Absent.
  - disclaimer: Absent.
  - action severity: Low.
  - interpreted diagnostically: Unlikely, but possible.
  - product-review need: Yes.
  - medical-review need: No.
- Recovery: "Recovery"
  - source: `src/lib/analytics.ts`
  - input data: Check-in data.
  - calculation: Algorithmic.
  - uncertainty language: Absent.
  - disclaimer: Absent.
  - action severity: Low.
  - interpreted diagnostically: No.
  - product-review need: Yes.
  - medical-review need: No.
- Fatigue: "Muscle Fatigue Map"
  - source: `src/lib/analytics.ts`
  - input data: Workout volume.
  - calculation: Muscle mapping.
  - uncertainty language: Absent.
  - disclaimer: Absent.
  - action severity: Low.
  - interpreted diagnostically: No.
  - product-review need: No.
  - medical-review need: No.
- Soreness: "Soreness level"
  - source: Check-in.
  - input data: User input.
  - calculation: None.
  - uncertainty language: N/A.
  - disclaimer: N/A.
  - action severity: Low.
  - interpreted diagnostically: No.
  - product-review need: No.
  - medical-review need: No.
- Sleep: "Sleep quality"
  - source: Check-in.
  - input data: User input.
  - calculation: None.
  - uncertainty language: N/A.
  - disclaimer: N/A.
  - action severity: Low.
  - interpreted diagnostically: No.
  - product-review need: No.
  - medical-review need: No.

## 16. Recommendation language

- training recommendations: AI generated. Source: LLM. Input: Context. Calculation: N/A. Uncertainty: Variable. Disclaimer: Absent. Action: Workout suggestions. Diagnostic: Possible. Product-review: Yes. Medical-review: Yes.
- muscle recommendations: AI generated. Source: LLM. Input: Context. Calculation: N/A. Uncertainty: Variable. Disclaimer: Absent. Action: Workout modifications. Diagnostic: No. Product-review: Yes. Medical-review: No.
- nutrition: AI generated. Source: LLM. Input: Meals. Calculation: N/A. Uncertainty: Variable. Disclaimer: Absent. Action: Diet changes. Diagnostic: Possible. Product-review: Yes. Medical-review: Yes.
- AI coaching: Governed by system prompt. Needs robust guardrails to prevent prescriptive advice.

## 17. Pain, injury, and medical boundaries

- pain/injury warnings: AI can access `injuryAreas`.
- exact copy: AI generated.
- source: LLM.
- input data: `UserGoalsProfile`.
- calculation: N/A.
- uncertainty language: Variable.
- disclaimer: Absent.
- action severity: High.
- interpreted diagnostically: Yes.
- product-review need: Yes.
- medical-review need: Yes (to establish safe system prompt rules).

## 18. Nutrition and bodyweight claims

- bodyweight progress: "Momentum score".
- exact copy: "Momentum".
- source: `src/lib/analytics.ts`.
- input data: Adherence.
- calculation: Trend logic.
- uncertainty language: Absent.
- disclaimer: Absent.
- action severity: Low.
- interpreted diagnostically: No.
- product-review need: Yes.
- medical-review need: No.

## 19. Transparency and explanations

- confidence: System generates confidence metrics (`DataProvenance`) but they are largely internal.
- evidence visibility: Hidden.

## 20. Destructive-action trust

- Controls exist via `ConfirmDialog`. Silent saves cause minor trust friction.

## 21. Undo and recovery

- Jarvis actions have undo. Manual deletions do not. Imports restore prior states.

## 22. Current disclosures

- Warning on import overwrite. Export implies data stays local.

## 23. Missing disclosures

- No explicit disclosure of AI context transmission boundaries. No shared-device warnings.

## 24. Test coverage

- Tests exist in `tests/e2e/helpers/fitcore-test-state.ts`. Privacy scenarios are not evident from static inspection.

## 25. Privacy-risk register

- Shared-device exposure. `localStorage` persists data without auth.
- Progress photo storage. Unencrypted images in state. storage quota risk.
- Export plain text JSON. Full unencrypted data dump to user OS.
- AI context transmission. Full extent of state payload sent to LLMs is opaque.

## 26. Health-claim risk register

- Jarvis injury advice. Lack of hard bounds for treatment advice based on `injuryAreas`.
- Readiness score presentation. Could be interpreted diagnostically without disclaimers.

## 27. User-trust risk register

- Import full state overwrite. Destructive replacement.
- Silent synchronous saves. Lack of visual "saved" confirmation.

## 28. Future design options

- possible mitigation: Shared-device lock/authentication.
- future design option: Asynchronous blob storage for photos.
- unresolved product requirement: Granular context toggles for AI.
- requires coordination after Data Safety merge: Encrypted backup format.

## 29. Safe implementation boundaries

- UI component refactoring should not alter `src/lib/store.tsx` persistence structure.
- AI prompt engineering must not bypass existing `JarvisSettings.permission` boundaries.

## 30. Open questions

- Are progress photos serialized as Base64 strings or Object URLs? (Requires runtime network/storage inspection).

## 31. File index

- `src/lib/types.ts`
- `src/lib/store.tsx`
- `src/lib/ai.functions.ts`
- `src/lib/jarvis/tools.ts`
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/jarvis/confirm-card.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/views/home.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/sheet.tsx`
- `src/lib/analytics.ts`
- `README.md`
