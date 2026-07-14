# FitCore Privacy, Health Claim, and User Trust Audit

## 1. Executive summary

- current privacy architecture: Data is stored entirely locally on the device via synchronous `localStorage` updates without remote backend synchronization.
- current sensitive-data footprint: The application stores granular physical attributes (height, bodyweight), daily health telemetry (sleep hours, soreness, fatigue, stress), nutrition logs (meals, supplements), and workout history.
- current consent and permission model: Jarvis AI capabilities are governed by a numeric permission level (`1` through `4`) in `src/components/app/jarvis/settings-card.tsx`, but no granular consent gateways exist for individual domain tracking.
- current user-control model: Users have full control to edit or delete individual domain entries, export all data, or reset the local store via `src/components/app/views/settings.tsx`.
- current health-language boundaries: The application calculates composite scores (e.g., `fitcoreScore` in `src/lib/analytics.ts`) and presents Readiness/Recovery signals as analytical insights rather than definitive medical diagnoses.
- current recommendation transparency: AI recommendations via Jarvis provide context based on the full application state, with action receipts surfacing via `src/components/app/jarvis/confirm-card.tsx`.
- strongest trust-preserving behavior: The local-first persistence model ensures data does not leave the device automatically.
- most serious privacy risks: The use of `localStorage` provides no protection against other users on a shared device. All health and profile data is exposed immediately upon opening the app.
- most serious sensitive-data exposure risks: Progress photos are stored locally and accessible on shared devices without secondary authentication.
- most serious health-claim risks: The application generates Readiness and Recovery scores that could be misinterpreted as physiological facts without sufficient disclaimer boundaries.
- most serious deletion and retention risks: The global reset function in `src/components/app/views/settings.tsx` clears domain data but lacks clarity on clearing exported JSON artifacts outside the app's scope.
- most serious progress-photo risks: Progress photos persist in local state and might bloat storage or persist unexpectedly.
- most serious Jarvis trust risks: Unstructured Jarvis conversations in `src/components/app/jarvis/jarvis-panel.tsx` may retain sensitive data indefinitely.
- major future Data Safety dependencies: Implementation of asynchronous storage, atomic writes, encryption at rest, and robust import validation.
- most important requirements for future implementation approval: Introduction of shared-device mitigations (e.g., locking), explicit data-sharing disclosures before AI usage, and fine-grained data deletion scopes.

- Confirmed current behavior: Local storage persistence, JSON export/import.
- Confirmed missing control: Shared-device lock, granular deletion.
- Probable risk: Shared device exposure of progress photos.
- Future dependency: Data Safety integration for asynchronous storage.
- Requires product review: Readiness score presentation.

## 2. Method and evidence boundaries

- required base SHA: `3e4326782d761313c4f2644ecfe55503770b360a`
- static inspection methodology: Conducted static analysis via `grep` and file inspection without executing the application or running tests.
- source files inspected: `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/jarvis/tools.ts`, `src/components/app/views/settings.tsx`, `src/components/app/views/home.tsx`, `src/components/app/views/training.tsx`, `src/components/app/views/nutrition.tsx`, `src/components/app/views/recovery.tsx`, `src/components/app/views/progress.tsx`.
- documentation inspected: `README.md`, `docs/planning/codex-goal-mode-pr-review-checklist.md`.
- tests inspected: `tests/e2e/`.
- why no runtime network behavior is being claimed: This is a static inspection task only.
- why no security assurance is being claimed: No penetration testing or encryption analysis was performed.
- why no legal compliance determination is being made: The audit focuses purely on technical enforcement and product behavior, not regulatory standards.
- why no medical-safety determination is being made: Health language is evaluated for claim boundaries, not medical accuracy.
- how current main is distinguished from unmerged Data Safety work: The audit relies strictly on code present at the specified base commit, disregarding parked PRs.

Definitions:

- Confirmed implemented: Found in code at base SHA.
- Confirmed missing: Explicitly absent from code at base SHA.
- Confirmed inconsistent: Logic varies across domains in code.
- Partial: Incomplete implementation found.
- Probable risk: Structural risk identified in code.
- Privacy-sensitive: Personally identifying or habit-revealing data.
- Health-sensitive: Physiological, wellness, or nutrition data.
- Trust-sensitive: Destructive actions or state mutations.
- Future dependency: Relies on Data Safety architecture.
- Requires browser verification: Needs runtime testing.
- Requires product review: Needs design/product decision.
- Requires legal review: Needs counsel review.
- Requires medical review: Needs clinician review.
- Unclear: Cannot be determined from static analysis.

## 3. Sensitive-data taxonomy

- name
  - source field or type: `Profile.name` in `src/lib/types.ts`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/onboarding.tsx`
  - read paths: `src/components/app/views/settings.tsx`
  - write paths: `src/components/app/views/settings.tsx`
  - display surfaces: Profile Settings
  - persistence mechanism: `localStorage` via `src/lib/store.tsx`
  - deletion path: Global reset via `src/components/app/views/settings.tsx`
  - export path: `exportJson` in `src/lib/store.tsx`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Identifies the user.
- age
  - source field or type: `Profile.age`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/onboarding.tsx`
  - read paths: `src/components/app/views/settings.tsx`
  - write paths: `src/components/app/views/settings.tsx`
  - display surfaces: Profile Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Personal demographic data.
- height
  - source field or type: `Profile.heightIn`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/onboarding.tsx`
  - read paths: `src/components/app/views/settings.tsx`
  - write paths: `src/components/app/views/settings.tsx`
  - display surfaces: Profile Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Physical attribute.
- bodyweight
  - source field or type: `Profile.bodyweightLb`, `BodyweightEntry`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/onboarding.tsx`, Home quick log
  - read paths: `src/components/app/views/progress.tsx`, `src/components/app/views/home.tsx`
  - write paths: `src/components/app/views/settings.tsx`, Weigh-in popup
  - display surfaces: Home dashboard, Progress charts
  - persistence mechanism: `localStorage`
  - deletion path: Record deletion, global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Highly sensitive physical metric.
- unit preferences
  - source field or type: `Personalization.units`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/settings.tsx`
  - read paths: Global
  - write paths: `src/components/app/views/settings.tsx`
  - display surfaces: Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Low.
- training experience
  - source field or type: `Profile.experience`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/onboarding.tsx`
  - read paths: `src/components/app/views/settings.tsx`
  - write paths: `src/components/app/views/settings.tsx`
  - display surfaces: Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Personal capability context.
- activity level
  - source field or type: `UserGoalsProfile.preferredCardio` (proxy)
  - repository-relative file: `src/lib/types.ts`
  - creation path: Settings
  - read paths: Settings
  - write paths: Settings
  - display surfaces: Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Lifestyle indicator.
- fitness goals
  - source field or type: `Profile.goal`, `ExtendedGoal`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/onboarding.tsx`
  - read paths: `src/components/app/views/settings.tsx`
  - write paths: `src/components/app/views/settings.tsx`
  - display surfaces: Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Personal aspirations.
- workout history
  - source field or type: `Workout`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/training.tsx`
  - read paths: `src/components/app/views/training.tsx`, Home
  - write paths: Active Workout
  - display surfaces: Training log, Dashboard
  - persistence mechanism: `localStorage`
  - deletion path: Delete workout, Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Detailed behavioral tracking.
- exercise selections
  - source field or type: `WorkoutExercise`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Active Workout
  - read paths: Training View
  - write paths: Active Workout
  - display surfaces: Training View
  - persistence mechanism: `localStorage`
  - deletion path: Delete workout
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Behavioral tracking.
- weights and repetitions
  - source field or type: `SetEntry`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Active Workout
  - read paths: Training View
  - write paths: Active Workout
  - display surfaces: Training View
  - persistence mechanism: `localStorage`
  - deletion path: Delete workout
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Performance capability.
- personal records
  - source field or type: `PR`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Analytics propagation
  - read paths: Training View
  - write paths: Store internal
  - display surfaces: Training View
  - persistence mechanism: `localStorage`
  - deletion path: Derived
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Performance capability.
- workout notes
  - source field or type: `Workout.notes`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Active Workout
  - read paths: Training View
  - write paths: Active Workout
  - display surfaces: Training View
  - persistence mechanism: `localStorage`
  - deletion path: Delete workout
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Unstructured free text.
- meal history
  - source field or type: `MealEntry`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/nutrition.tsx`
  - read paths: Nutrition View, Home
  - write paths: Nutrition popup
  - display surfaces: Nutrition View
  - persistence mechanism: `localStorage`
  - deletion path: Delete meal
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Daily habit tracking.
- calorie intake
  - source field or type: `MealEntry.calories`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Nutrition popup
  - read paths: Nutrition View, Home
  - write paths: Nutrition popup
  - display surfaces: Dashboard, Nutrition
  - persistence mechanism: `localStorage`
  - deletion path: Delete meal
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Health metric.
- macro intake
  - source field or type: `MealEntry.protein`, `carbs`, `fat`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Nutrition popup
  - read paths: Nutrition View
  - write paths: Nutrition popup
  - display surfaces: Nutrition View
  - persistence mechanism: `localStorage`
  - deletion path: Delete meal
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Health metric.
- custom foods
  - source field or type: Not structurally distinct on main yet (placeholder expected).
  - repository-relative file: N/A
  - creation path: N/A
  - read paths: N/A
  - write paths: N/A
  - display surfaces: N/A
  - persistence mechanism: N/A
  - deletion path: N/A
  - export path: N/A
  - offline availability: N/A
  - permission boundary: N/A
  - test coverage: N/A
  - sensitivity rationale: Future dependency.
- supplements
  - source field or type: `SupplementLog`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Nutrition View
  - read paths: Nutrition View
  - write paths: Nutrition View
  - display surfaces: Nutrition View
  - persistence mechanism: `localStorage`
  - deletion path: Global reset (no obvious single deletion path on main UI).
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Health/Wellness.
- sleep
  - source field or type: `SleepEntry`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/components/app/views/recovery.tsx`
  - read paths: Recovery View
  - write paths: Recovery View
  - display surfaces: Recovery View
  - persistence mechanism: `localStorage`
  - deletion path: Record delete
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Health/Wellness telemetry.
- soreness
  - source field or type: `RecoveryCheckIn.soreness`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Home Check-in
  - read paths: Recovery View
  - write paths: Home Check-in
  - display surfaces: Recovery View
  - persistence mechanism: `localStorage`
  - deletion path: Delete check-in
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Physical well-being.
- fatigue
  - source field or type: `RecoverySignal.kind` ("fatigue")
  - repository-relative file: `src/lib/types.ts`
  - creation path: Check-in
  - read paths: Recovery
  - write paths: Check-in
  - display surfaces: Recovery
  - persistence mechanism: `localStorage`
  - deletion path: Delete signal
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Physical well-being.
- stress
  - source field or type: `RecoveryCheckIn.stress`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Check-in
  - read paths: Recovery
  - write paths: Check-in
  - display surfaces: Recovery
  - persistence mechanism: `localStorage`
  - deletion path: Delete check-in
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Mental well-being.
- energy
  - source field or type: `RecoveryCheckIn.energy`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Check-in
  - read paths: Recovery
  - write paths: Check-in
  - display surfaces: Recovery
  - persistence mechanism: `localStorage`
  - deletion path: Delete check-in
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Physical well-being.
- Recovery score
  - source field or type: Derived (No distinct state field).
  - repository-relative file: `src/lib/analytics.ts`
  - creation path: Derived on read.
  - read paths: Home, Recovery
  - write paths: N/A
  - display surfaces: Home, Recovery
  - persistence mechanism: None (Derived)
  - deletion path: N/A
  - export path: N/A
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Algorithmic health interpretation.
- Readiness score
  - source field or type: Derived.
  - repository-relative file: `src/lib/analytics.ts`
  - creation path: Derived.
  - read paths: Home.
  - write paths: N/A.
  - display surfaces: Home.
  - persistence mechanism: None.
  - deletion path: N/A.
  - export path: N/A.
  - offline availability: Yes.
  - permission boundary: None.
  - test coverage: Unclear.
  - sensitivity rationale: Algorithmic health interpretation.
- bodyweight trends
  - source field or type: Derived from `BodyweightEntry`.
  - repository-relative file: `src/lib/analytics.ts`
  - creation path: Derived.
  - read paths: Progress View.
  - write paths: N/A.
  - display surfaces: Progress View.
  - persistence mechanism: None.
  - deletion path: N/A.
  - export path: N/A.
  - offline availability: Yes.
  - permission boundary: None.
  - test coverage: Unclear.
  - sensitivity rationale: Derived health metric.
- progress goals
  - source field or type: `Goal`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Home, Progress
  - read paths: Home, Progress
  - write paths: Home, Progress
  - display surfaces: Home, Progress
  - persistence mechanism: `localStorage`
  - deletion path: Delete goal
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Aspirational tracking.
- progress photos
  - source field or type: `ProgressPhoto`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Progress View
  - read paths: Progress View
  - write paths: Progress View
  - display surfaces: Progress View
  - persistence mechanism: `localStorage`
  - deletion path: Delete photo
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Highly sensitive visual data.
- Jarvis conversation history
  - source field or type: `AiMessage`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Jarvis Panel
  - read paths: Jarvis Panel
  - write paths: Jarvis Panel
  - display surfaces: Jarvis Panel
  - persistence mechanism: `localStorage`
  - deletion path: Clear conversation
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Unstructured disclosure of personal habits.
- Jarvis action history
  - source field or type: `JarvisAuditEntry`
  - repository-relative file: `src/lib/types.ts`
  - creation path: `src/lib/jarvis/tools.ts`
  - read paths: Settings
  - write paths: `src/lib/jarvis/tools.ts`
  - display surfaces: Jarvis Settings Activity
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: AI autonomy tracking.
- Settings preferences
  - source field or type: `Personalization`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Settings
  - read paths: Global
  - write paths: Settings
  - display surfaces: Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Low.
- permissions
  - source field or type: `JarvisSettings.permission`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Settings
  - read paths: Jarvis tools
  - write paths: Settings
  - display surfaces: Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Security/Trust.
- notification preferences
  - source field or type: `Personalization.reminders`
  - repository-relative file: `src/lib/types.ts`
  - creation path: Settings
  - read paths: N/A (mostly placeholder logic)
  - write paths: Settings
  - display surfaces: Settings
  - persistence mechanism: `localStorage`
  - deletion path: Global reset
  - export path: `exportJson`
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Low.
- exported files
  - source field or type: JSON Blob
  - repository-relative file: `src/components/app/views/settings.tsx`
  - creation path: Settings export
  - read paths: User file system
  - write paths: Browser downloads
  - display surfaces: File system
  - persistence mechanism: User file system
  - deletion path: Manual OS deletion
  - export path: N/A
  - offline availability: Yes
  - permission boundary: None
  - test coverage: Unclear
  - sensitivity rationale: Unencrypted complete state.
- imported files
  - source field or type: JSON File Input
  - repository-relative file: `src/components/app/views/settings.tsx`
  - creation path: User selection
  - read paths: Settings import parser
  - write paths: `localStorage`
  - display surfaces: File picker
  - persistence mechanism: Transferred to `localStorage`
  - deletion path: Global reset
  - export path: N/A
  - offline availability: Yes
  - permission boundary: Overwrite confirmation
  - test coverage: Unclear
  - sensitivity rationale: Destructive state overwrite.
- backups where currently present
  - source field or type: N/A (Export acts as manual backup).
  - repository-relative file: N/A
  - creation path: N/A
  - read paths: N/A
  - write paths: N/A
  - display surfaces: N/A
  - persistence mechanism: N/A
  - deletion path: N/A
  - export path: N/A
  - offline availability: N/A
  - permission boundary: N/A
  - test coverage: N/A
  - sensitivity rationale: N/A

## 4. Data-flow architecture map

```markdown
User Input -> View State -> Zustand (`src/lib/store.tsx`) -> `localStorage` -> (Export/Import) -> User File System
|
v
Analytics / Charts
|
v
Jarvis AI -> External API (Groq/Gemini)
```

- origin: View interactions.
- destination: `localStorage`.
- data categories: All State.
- transformation: JSON serialization.
- persistence: Browser local storage.
- user visibility: High.
- permission: None for local persistence.
- deletion consequence: Data permanently removed from active view.
- test coverage: Unclear.

## 5. Data-collection inventory

- onboarding: Collects Profile fields. Required for entry. Purpose implies personalization. Persisted to `localStorage`. User can edit later. Tests unclear. Privacy concern: Age and weight required without explanation.
- profile: Collects goals. Optional. Purpose implies Jarvis context. Persisted. Tests unclear. No severe concern.
- workout logging: Collects sets, reps, notes. Optional. Purpose: History tracking. Persisted. Tests unclear. Concern: Notes might contain sensitive info.
- meal logging: Collects macros, names. Optional. Purpose: Diet tracking. Persisted. Tests unclear. No severe concern.
- supplement logging: Collects name, dose. Optional. Purpose: Tracking. Persisted. Tests unclear. Concern: Medical implications.
- Recovery check-ins: Collects soreness, stress. Optional. Purpose: Readiness. Persisted. Tests unclear. Concern: Daily wellness telemetry.
- sleep logging: Collects hours. Optional. Purpose: Readiness. Persisted. Tests unclear. Concern: Wellness telemetry.
- soreness: Part of check-in.
- fatigue: Part of check-in.
- stress: Part of check-in.
- energy: Part of check-in.
- weigh-ins: Collects weight. Optional. Purpose: Progress tracking. Persisted. Tests unclear. Concern: Weight tracking without concealment.
- goals: Collects targets. Optional. Persisted.
- progress photos: Collects images. Optional. Purpose: Visual progress. Persisted. Tests unclear. Concern: Local unencrypted storage of images.
- Jarvis messages: Collects unstructured chat. Optional. Purpose: Coaching. Persisted. Tests unclear. Concern: Unbounded context retention.
- Settings: Collects API keys. Optional. Purpose: Enable AI. Persisted. Tests unclear. Concern: Keys in plain text state.
- imports: Replaces full state. Optional. Purpose: Restore. Persisted. Tests unclear. Concern: Destructive.

Data collected without an obvious user-facing explanation of purpose: Exact birth age in onboarding.

## 6. Data-minimization audit

- Profile.age: clearly used for BMR (inferred).
- Profile.heightIn: clearly used for BMI/BMR.
- Profile.bodyweightLb: clearly used.
- UserGoalsProfile.preferredCardio: conditionally used by Jarvis.
- UserGoalsProfile.injuryAreas: clearly used by Jarvis.
- Personalization.reminders: apparently unused (placeholder UI).
- Profile.sorenessSensitivity: unclear.

## 7. Purpose and disclosure audit

- age: Onboarding. No explanation. Persisted. Precedes collection. Persistent. Gap: Why exact age vs bracket?
- height: Onboarding. No explanation. Persisted. Precedes. Gap: Purpose unstated.
- bodyweight: Onboarding. No explanation. Persisted. Precedes. Gap: Purpose unstated.
- goals: Onboarding. No explanation. Persisted. Precedes. Gap: None.
- training experience: Onboarding. No explanation. Persisted. Gap: None.
- activity level: Settings. No explanation. Gap: None.
- meals: Nutrition. No explanation. Gap: None.
- supplements: Nutrition. No explanation. Gap: None.
- sleep: Recovery. No explanation. Gap: None.
- soreness: Recovery. No explanation. Gap: None.
- fatigue: Recovery. No explanation. Gap: None.
- stress: Recovery. No explanation. Gap: None.
- progress photos: Progress. No explanation of local-only storage. Gap: User might assume cloud backup.
- Jarvis permissions: Settings. Explanation present. Precedes. Gap: Does not explain data sent to LLM.

## 8. Consent and permission inventory

- Jarvis read permissions: settings. visible label: "Autonomy". internal field: `permission`. default: 2. scope: AI tools. persistence: `localStorage`. denial behavior: AI disabled or limited. revocation: takes effect immediately. affected features: Jarvis. tests: Unclear.
- Jarvis write permissions: Same as above (level 3/4).
- notification permissions: Settings. Visible label: "Workout Reminders". internal field: `reminders.workoutEnabled`. default: true. scope: App. persistence: `localStorage`. denial: UI off. revocation: instant. tests: Unclear.
- photo access: Browser native.
- file access: Browser native.
- destructive-action confirmation: `ConfirmDialog` in `src/components/app/sheet.tsx`. Visible label: "Delete". Scope: Record. Persistence: Instant. Denial: Cancel.
- import overwrite confirmation: Settings. Visible label: "Import".
- reset confirmation: Settings. Visible label: "Reset App Data".
- data-clearing confirmation: Settings.
- progress-photo confirmation: `ConfirmDialog`.
- optional analytics controls: Absent.

Sensitive actions without an explicit permission boundary: Logging a quick check-in immediately writes to store.

## 9. Permission-default audit

- Jarvis Permission: default 2. Opt-in via API key. Visible. Persists. Scope clear. Revocation immediate. Data remains. Tests unclear. Trust risk: Level 2 allows suggestions.
- Notifications: default true. Opt-out. Visible. Persists. Scope clear. Revocation immediate. Data remains. Tests unclear. Trust risk: None.

## 10. Settings privacy-control audit

- profile data: `src/components/app/views/settings.tsx`. Implemented. Scope: user. Confirmation: no.
- privacy explanations: Absent.
- permissions: Jarvis settings. Implemented.
- notifications: Implemented (UI only).
- progress-photo controls: Absent from settings.
- data export: Implemented. Scope: All state. Confirmation: None.
- data import: Implemented. Scope: All state. Confirmation: Required.
- data reset: Implemented. Scope: All state. Confirmation: Required.
- domain-specific deletion: Absent.
- full deletion: Implemented (Reset).
- backup and recovery: Absent (relies on manual export/import).
- Jarvis controls: Implemented.

## 11. Local-persistence audit

- storage keys: `fitcore.v1`
- state objects: `AppState`
- conversation state: `aiMessages`
- progress photos: `progressPhotos`
- profile: `profile`
- domain histories: `workouts`, `mealEntries`, etc.
- Settings: `personalization`, `jarvisSettings`
- active workout: `activeWorkout`
- analytics outputs: Not persisted (derived).
- export staging: Memory blob.
- import staging: Memory parser.

For each path:

- source: `src/lib/store.tsx`
- serialization: `JSON.stringify`
- read trigger: App load
- write trigger: Any state change
- clear behavior: `reset()`
- storage-failure behavior: Unhandled (likely console error if quota exceeded).
- shared-device implication: All data visible.
- test coverage: Unclear.

## 12. Shared-device privacy audit

- automatic persistence: `src/lib/store.tsx`. Affected data: All. Mitigation: None. Disclosure: None. Priority: High.
- no authentication: App root. Affected data: All. Mitigation: None. Disclosure: None. Priority: High.
- persistent progress photos: App root. Affected data: Photos. Mitigation: None. Priority: Critical.
- persistent health records: App root. Affected data: All health. Mitigation: None. Priority: High.
- browser-history access: N/A.
- offline access: PWA caching. Affected data: Shell. Mitigation: None. Priority: Low.
- installed PWA access: System level. Affected data: All. Mitigation: None. Priority: Low.
- data remaining after closing: `localStorage`. Affected data: All. Mitigation: None. Priority: High.
- reset behavior: Manual only.
- cached assets: Service worker.
- exported files: User OS. Affected data: Full JSON. Mitigation: None. Priority: High.

## 13. Progress-photo privacy audit

- capture or file selection: HTML file input.
- preview: Rendered in Progress view.
- metadata: None explicit in schema.
- storage: `localStorage` (`ProgressPhoto` string).
- rendering: `<img>` tag in `src/components/app/views/progress.tsx`.
- comparison: Side-by-side UI.
- deletion: `ConfirmDialog` in Progress view.
- replacement: No explicit replace, just delete and add.
- export: Included in full JSON state.
- offline access: Available if stored as Base64.
- cache behavior: None.
- error messages: Standard broken image icon.
- missing-image handling: Placeholder UI.
- mobile behavior: Standard tap.
- accessibility: Assumed basic `alt` tags.
- tests: Unclear.

Risks: Full-resolution images stored indefinitely in `localStorage` could bloat quota and expose highly sensitive visual data on shared devices.

## 14. Nutrition and supplement privacy audit

- meals: Collected via Nutrition view. Displayed on Home. Analytics used for totals. Jarvis access granted. Persisted locally. Deleted via UI. Exported in JSON. No privacy messaging. Tests unclear.
- calories: Same as above.
- macros: Same as above.
- custom foods: Absent.
- saved meals: Absent.
- supplements: Collected via Nutrition view. Displayed on Nutrition view. Jarvis access granted. Persisted locally. Exported. No privacy messaging. Tests unclear.
- meal notes: Absent.
- photo meals: Absent.

Identify: Supplement logs might be sent to LLM context without explicit medical warning.

## 15. Recovery and wellness privacy audit

- sleep: Collected via Recovery view. Displayed on Recovery. Analytics used for Readiness. Jarvis access. Persisted. Exported. No privacy messaging.
- soreness: Collected via Check-in.
- fatigue: Collected via Check-in.
- stress: Collected via Check-in.
- energy: Collected via Check-in.
- Readiness: Derived in `src/lib/analytics.ts`.
- Recovery: Derived.
- muscle recovery: Heatmap derived.
- check-in notes: Collected.

Identify: Wellness info (soreness) shown on Home dashboard without a hide option.

## 16. Bodyweight, goals, and progress privacy audit

- bodyweight: Collected via weigh-in. Displayed on Home, Progress. Jarvis access. Persisted. Exported.
- weight history: Charted on Progress.
- rate or trend: Calculated in `src/lib/analytics.ts`.
- goals: Collected via Onboarding/Settings.
- target dates: Absent.
- Momentum: Calculated in `src/lib/analytics.ts`. Displayed on Home.
- achievements: Absent.
- comparison views: Absent.

Identify: Bodyweight appears prominently on Home dashboard without a concealment option.

## 17. Workout-data privacy audit

- workout history: Collected via Training view. Displayed Training. Jarvis access. Persisted. Exported.
- exercise selection: Same.
- weights: Same.
- repetitions: Same.
- personal records: Derived.
- workout notes: Free text.
- active workout: State tracked.
- templates: Static data.

Identify: Workout notes might contain sensitive free-text exposed to LLM context.

## 18. Jarvis privacy audit

- profile: Read access.
- workout history: Read/Write via tools.
- meals: Read/Write via tools.
- supplements: Read/Write via tools.
- Recovery: Read/Write via tools.
- sleep: Read/Write via tools.
- soreness: Read/Write via tools.
- fatigue: Read/Write via tools.
- bodyweight: Read/Write via tools.
- goals: Read access.
- progress photos: No explicit tool access identified.
- Settings: Read/Write via tools.
- conversation history: Retained in `aiMessages`.

Permission boundary: `JarvisSettings.permission`. Confirmation via `ConfirmDialog` for destructive actions. Error behavior returns text to chat. Tests unclear.

Identify: Jarvis surfaces do not clearly communicate what specific data from `AppState` was sent in the Groq/Gemini context window for a given prompt.

## 19. Jarvis action-receipt privacy audit

- action: Logged in `jarvisAudit`.
- data repeated back: `summary` and `patch` fields.
- sensitive values exposed: E.g., `Update Jarvis settings: {patch keys}`.
- record identifiers exposed: Yes (`entityIds`).
- timestamps exposed: Yes.
- navigation links: None.
- undo: Available via Snackbar.
- error detail: Returned to chat.
- tests: Unclear.

Identify: Receipts in `src/components/app/jarvis/confirm-card.tsx` may display full JSON patches which could expose sensitive data unnecessarily.

## 20. Conversation-retention audit

- session creation: On first message.
- message persistence: `aiMessages` array in `localStorage`.
- reload behavior: Restores from state.
- clearing: `setMessages([])` equivalent.
- deletion: UI clear button.
- maximum history: Unbounded.
- action receipts: Inline.
- errors: Inline.
- imported context: From JSON.
- domain summaries: N/A.

Risk: Indefinite retention of unstructured chat.

## 21. Notification and reminder privacy audit

- workout reminders: UI toggle in Settings.
- meal reminders: UI toggle.
- supplement reminders: Absent.
- Recovery reminders: UI toggle (weigh-in).
- weigh-in reminders: UI toggle.
- goal reminders: Absent.
- notification permission: Browser native (if implemented).
- notification preview text: N/A.
- lock-screen exposure: N/A.
- scheduling: Time picker in Settings.
- disabling: Toggle in Settings.

Platform dependency: Relies on web notification APIs. Currently appears to be UI settings only without active background workers.

## 22. Import privacy audit

- file selection: `src/components/app/views/settings.tsx`.
- file inspection: Basic JSON parse.
- preview: Absent.
- validation: Basic schema check.
- overwrite behavior: Full state replacement.
- sensitive fields imported: All.
- progress photos: Imported.
- malformed-file errors: Caught via try/catch.
- temporary storage: Memory.
- cancellation: Dialog cancel.
- test coverage: Unclear.

Identify: Users are NOT clearly told what specific existing data will be replaced (just a generic warning).

## 23. Export privacy audit

- export format: JSON blob.
- included data categories: All `AppState`.
- progress-photo inclusion: Yes.
- conversation inclusion: Yes.
- metadata: Timestamps.
- filename: `fitcore-backup.json`.
- destination behavior: Browser download.
- user warning: "Current app data stays on this device unless you export it."
- test coverage: Unclear.

Identify: Exported unencrypted files remaining on shared device downloads folders is a high trust risk.

## 24. Backup and recovery privacy audit

- implemented status: Manual export/import only.
- data categories included: All.
- progress-photo inclusion: Yes.
- storage location: User device.
- user control: Manual.
- deletion: Manual OS.
- restore confirmation: Yes.
- test coverage: Unclear.
- future Data Safety dependency: Automated encrypted backups.

## 25. Deletion and reset inventory

- delete workout: Training View. Confirmed. Removes from state.
- delete set: Active workout.
- discard active workout: Active workout.
- delete meal: Nutrition view.
- delete supplement: Nutrition view.
- delete check-in: Recovery view.
- delete weigh-in: Progress view.
- delete goal: Home/Progress.
- delete progress photo: Progress view.
- clear conversation: Jarvis panel.
- reset profile: Settings (Reset app data).
- reset onboarding: Settings.
- clear domain data: Absent (only global reset).
- clear all data: `reset()` in Settings.
- delete imported data: Global reset.
- delete backup: Manual OS.

## 26. Data-deletion completeness audit

- visible UI: Confirmed removed.
- domain state: Confirmed removed via `set(state)`.
- shared state: N/A.
- local storage: Confirmed updated synchronously.
- active selection: N/A.
- analytics: Confirmed updated (derived on read).
- chart caches: N/A (re-rendered).
- progress-photo storage: Confirmed removed from state array.
- Jarvis context: Unclear. If mentioned in `aiMessages`, the text remains.
- export state: Not included in future exports.
- service-worker cache: N/A.

## 27. Retention audit

- indefinite histories: Workouts, Meals, Check-ins retained indefinitely in `localStorage`.
- limited histories: None.
- conversation retention: Indefinite.
- progress-photo retention: Indefinite.
- active-workout retention: Retained in state until completed/discarded.
- cached asset retention: Browser managed.
- exported-file retention outside app control: Indefinite.
- deleted-record references: Might exist in `aiMessages` or `jarvisAudit`.

## 28. Offline and cache privacy audit

- cached application shell: PWA worker.
- cached images: PWA worker.
- progress photos: `localStorage`.
- offline access: Full functionality (minus AI).
- standalone PWA: Yes.
- local histories: `localStorage`.
- service-worker persistence: Shell only.
- stale caches after reset: Reset clears `localStorage`, but service worker cache remains.

## 29. Error-message privacy audit

- profile values: Stack traces might log state if unhandled.
- bodyweight: Same.
- meal contents: Same.
- supplements: Same.
- Recovery values: Same.
- progress-photo paths or data: Same.
- conversation contents: Same.
- imported file contents: JSON parse errors log to console.
- serialized state: Same.
- storage keys: None visible.
- stack traces: Console only.
- internal identifiers: Console only.

Identify: JSON parse errors during import might leak file contents to console.

## 30. Logging and diagnostic-output audit

- `console.log`: Used sporadically.
- `console.error`: Used for API failures (Jarvis).
- debug output: None explicit.
- state dumps: None explicit.
- serialized data: Export/Import.
- import contents: Console logs on failure.
- Jarvis payloads: Network tab only.
- analytics values: None.
- photo metadata: None.

## 31. External transmission and third-party dependency audit

- AI services: Groq and Gemini APIs (`src/lib/ai.functions.ts`).
- analytics services: None.
- APIs: AI only.
- remote fonts: Google fonts (assumed).
- remote images: None user-generated.
- external scripts: None explicit.
- crash reporting: None explicit.
- notifications: None external.

Data sent: AI tool definitions and user prompts. Purpose: Jarvis functionality. Disclosure: Inferred via Settings.

## 32. Health-language inventory

- health: "fitcoreScore".
- recovery: "Recovery", "Readiness".
- readiness: "Readiness score".
- fatigue: "Muscle Fatigue Map".
- soreness: "Soreness level".
- sleep: "Sleep quality".
- nutrition: "Macro targets".
- supplements: "Supplement Log".
- injury: Absent.
- overtraining: "Momentum score" (implied).
- performance: "Personal Records".
- bodyweight: "Bodyweight trend".
- progress: "Progress photos".
- recommendations: Jarvis outputs.

## 33. Health-claim classification

- descriptive: Charts.
- motivational: Momentum score.
- behavioral suggestion: Jarvis.
- fitness recommendation: Jarvis.
- health-adjacent recommendation: Jarvis.
- potentially diagnostic: Readiness scores.
- potentially prescriptive: AI advice.
- causal: Absent.
- predictive: Readiness.
- unsupported certainty: Readiness presented without confidence intervals.
- requires medical review: AI tool prompts.

## 34. Injury and pain-language audit

- pain: Jarvis might address "injuryAreas" from `UserGoalsProfile`.
- soreness: Check-in form.
- injury: `UserGoalsProfile.injuryAreas`.
- recovery from injury: Absent.
- unsafe movement: Absent.
- exercise avoidance: `UserGoalsProfile.exercisesToAvoid`.
- rest: Jarvis advice.
- treatment: Absent.
- professional care: Absent.

Risk: Jarvis providing advice on "injuryAreas" without strict medical disclaimers.

## 35. Nutrition and supplement claim audit

- calorie targets: Analytics derived.
- macro targets: Analytics derived.
- weight change: Analytics derived.
- supplements: User logged.
- deficiencies: Absent.
- hydration: Absent.
- meal quality: Absent.
- body composition: Progress photos.
- expected outcomes: Absent.

Risk: Unbounded supplement recommendations by AI.

## 36. Sleep, Recovery, and Readiness claim audit

- sleep quality: User logged 1-5.
- readiness: App generated score.
- fatigue: User logged.
- soreness: User logged.
- Recovery score: App generated.
- training recommendations: Absent (AI only).
- rest recommendations: Absent (AI only).
- contributor explanations: Absent.

Risk: Scores presented as physiological fact.

## 37. Bodyweight and goal-language audit

- target weight: Profile target.
- rate of weight change: Analytics.
- goal success: Absent.
- failure: Absent.
- adherence: Absent.
- Momentum: Score 0-100.
- progress photos: Visual.
- achievement language: Absent.

Risk: Momentum score dropping could induce negative feelings.

## 38. Causal-language audit

- caused: Absent.
- because: Absent.
- drives: Absent.
- leads to: Absent.
- results in: Absent.
- improves: Absent.
- worsens: Absent.
- predicts: Absent.
- proves: Absent.
- means: Absent.
- indicates: Absent.
- guarantees: Absent.

Classification: Appropriately descriptive (mostly relies on AI for qualitative language).

## 39. Predictive-language audit

- future performance: Absent.
- expected progress: Absent.
- readiness tomorrow: Absent.
- injury risk: Absent.
- recovery time: Absent.
- goal completion date: Absent.
- weight trajectory: Absent.
- workout outcome: Absent.

## 40. Confidence, evidence, and explainability audit

- confidence: `DataProvenance.confidence` exists in types but rarely surfaced in UI.
- sample size: Absent.
- history length: Charts show dates.
- contributors: Absent.
- evidence: Implicit by chart data.
- calculation basis: Source code only.
- data-quality status: Absent.
- limitations: Absent.
- unsupported status: Absent.
- missing data: Empty states present.

Risk: High-confidence presentation of scores without surfacing the `confidence` metadata.

## 41. Recommendation transparency audit

- workout recommendations: Jarvis.
- recovery recommendations: Jarvis.
- nutrition suggestions: Jarvis.
- daily-review actions: Absent.
- goal suggestions: Absent.
- Jarvis recommendations: Dependent on LLM output. Input data basis hidden.

## 42. User-control audit

- entering data: Full.
- editing data: Full.
- deleting data: Full.
- clearing data: Full reset.
- exporting data: Full.
- importing data: Full.
- Jarvis permissions: Full.
- notifications: Full.
- progress photos: Full.
- recommendations: None (AI generated).
- active-workout actions: Full.
- analytics ranges: None (fixed charts).
- comparison metrics: None.

Gap: Granular domain-clearing.

## 43. Trust-feedback audit

- successful save: Absent (synchronous silent save).
- failed save: Unhandled.
- partial success: N/A.
- stale data: N/A.
- unsupported analytics: Empty state.
- needs more data: Empty state message.
- deletion success: Dialog closes.
- deletion failure: Unhandled.
- import success: Success message in Settings.
- import failure: Error message in Settings.
- Jarvis action success: Audit receipt.
- Jarvis action failure: Error message in chat.
- offline state: Browser native.
- update state: N/A.

Risk: Silent saves cause uncertainty.

## 44. Dark-pattern and coercion-risk audit

- hidden deletion: No concern identified.
- confusing Cancel/Confirm hierarchy: No concern identified.
- forced data collection: Age/weight required at onboarding (possible friction).
- preselected permissions: Jarvis default 2 (possible friction).
- misleading disabled states: No concern identified.
- difficulty revoking permission: No concern identified.
- repeated prompts: No concern identified.
- emotionally manipulative goal language: No concern identified.
- unclear permanent actions: Import overwrite warning is brief (potentially misleading).
- install pressure: No concern identified.
- notification pressure: No concern identified.

## 45. Accessibility audit for privacy and trust controls

- permission labels: Partial.
- privacy explanations: Absent.
- destructive confirmations: Partial.
- export/import warnings: Partial.
- progress-photo controls: Partial.
- health disclaimers: Absent.
- Jarvis confirmations: Partial.
- status announcements: Absent.
- focus management: Unclear without browser verification.
- keyboard access: Unclear without browser verification.
- screen-reader semantics: Unclear without browser verification.
- non-color-only warnings: Partial.

## 46. Responsive audit for privacy and trust controls

- long disclosures: Safe-area concern on mobile.
- confirmation dialogs: Strong.
- destructive actions: Strong.
- privacy Settings: Strong.
- export/import summaries: Strong.
- progress-photo previews: Narrow-width concern.
- health warnings: Absent.
- Jarvis receipts: Strong.
- offline notices: Absent.

## 47. Current test-coverage map

- profile privacy: `tests/e2e/helpers/fitcore-test-state.ts` (State seeding, minimal privacy assertion).
- permission defaults: Absent.
- permission denial: Absent.
- permission revocation: Absent.
- progress photos: Absent.
- photo deletion: Absent.
- Jarvis permissions: Absent.
- Jarvis sensitive actions: Absent.
- deletion: Absent.
- reset: Absent.
- export: Absent.
- import: Absent.
- backup: Absent.
- recovery: Absent.
- local persistence: Absent.
- shared-device conditions: Absent.
- offline access: Absent.
- error-message exposure: Absent.
- health-language states: Absent.
- missing-data limitations: Absent.
- confidence and evidence: Absent.
- causal language: Absent.
- notification privacy: Absent.

## 48. Privacy-control matrix

- profile: collection disclosure (weak), read control (strong), write control (strong), edit control (strong), deletion control (strong - via reset), export visibility (strong), persistence visibility (weak), permission (not applicable), confirmation (not applicable), error privacy (unclear), test coverage (absent). `src/components/app/views/settings.tsx`.
- Training: collection disclosure (absent), read control (strong), write control (strong), edit control (strong), deletion control (strong), export visibility (strong), persistence visibility (weak), permission (not applicable), confirmation (strong), error privacy (unclear), test coverage (absent). `src/components/app/views/training.tsx`.
- Fuel/Nutrition: collection disclosure (absent), read control (strong), write control (strong), edit control (strong), deletion control (strong), export visibility (strong), persistence visibility (weak), permission (not applicable), confirmation (strong), error privacy (unclear), test coverage (absent). `src/components/app/views/nutrition.tsx`.
- Recovery: collection disclosure (absent), read control (strong), write control (strong), edit control (strong), deletion control (strong), export visibility (strong), persistence visibility (weak), permission (not applicable), confirmation (strong), error privacy (unclear), test coverage (absent). `src/components/app/views/recovery.tsx`.
- Stats/Progress: collection disclosure (absent), read control (strong), write control (strong), edit control (strong), deletion control (strong), export visibility (strong), persistence visibility (weak), permission (not applicable), confirmation (strong), error privacy (unclear), test coverage (absent). `src/components/app/views/progress.tsx`.
- progress photos: collection disclosure (absent), read control (strong), write control (strong), edit control (absent), deletion control (strong), export visibility (strong), persistence visibility (weak), permission (not applicable), confirmation (strong), error privacy (unclear), test coverage (absent). `src/components/app/views/progress.tsx`.
- Jarvis: collection disclosure (weak), read control (weak), write control (weak), edit control (not applicable), deletion control (strong), export visibility (strong), persistence visibility (weak), permission (strong), confirmation (partial), error privacy (unclear), test coverage (absent). `src/components/app/jarvis/jarvis-panel.tsx`.
- Settings: collection disclosure (absent), read control (strong), write control (strong), edit control (strong), deletion control (strong), export visibility (strong), persistence visibility (weak), permission (not applicable), confirmation (strong), error privacy (unclear), test coverage (absent). `src/components/app/views/settings.tsx`.
- PWA/offline: collection disclosure (absent), read control (absent), write control (absent), edit control (absent), deletion control (absent), export visibility (absent), persistence visibility (absent), permission (absent), confirmation (absent), error privacy (absent), test coverage (absent).

## 49. Health-language matrix

- Home: descriptive language (bounded), recommendation language (absent), causal language (absent), predictive language (absent), diagnostic risk (mixed), evidence visibility (absent), confidence visibility (absent), missing-data limitations (bounded), user override (not applicable), test coverage (absent).
- Training: descriptive language (bounded), recommendation language (absent), causal language (absent), predictive language (absent), diagnostic risk (absent), evidence visibility (absent), confidence visibility (absent), missing-data limitations (bounded), user override (not applicable), test coverage (absent).
- Fuel/Nutrition: descriptive language (bounded), recommendation language (absent), causal language (absent), predictive language (absent), diagnostic risk (absent), evidence visibility (absent), confidence visibility (absent), missing-data limitations (bounded), user override (not applicable), test coverage (absent).
- Recovery: descriptive language (bounded), recommendation language (absent), causal language (absent), predictive language (absent), diagnostic risk (mixed), evidence visibility (absent), confidence visibility (absent), missing-data limitations (bounded), user override (not applicable), test coverage (absent).
- Stats/Progress: descriptive language (bounded), recommendation language (absent), causal language (absent), predictive language (absent), diagnostic risk (absent), evidence visibility (absent), confidence visibility (absent), missing-data limitations (bounded), user override (not applicable), test coverage (absent).
- Jarvis: descriptive language (unclear), recommendation language (unclear), causal language (unclear), predictive language (unclear), diagnostic risk (overconfident), evidence visibility (mixed), confidence visibility (mixed), missing-data limitations (mixed), user override (not applicable), test coverage (absent).

## 50. Deletion and retention matrix

- Profile: create (Yes), view (Yes), edit (Yes), delete (No, Reset only), clear-all inclusion (Yes), export inclusion (Yes), import inclusion (Yes), offline retention (Yes), cache retention (No), conversation retention (Yes), test coverage (No).
- Workouts: create (Yes), view (Yes), edit (Yes), delete (Yes), clear-all inclusion (Yes), export inclusion (Yes), import inclusion (Yes), offline retention (Yes), cache retention (No), conversation retention (Yes), test coverage (No).
- Nutrition: create (Yes), view (Yes), edit (Yes), delete (Yes), clear-all inclusion (Yes), export inclusion (Yes), import inclusion (Yes), offline retention (Yes), cache retention (No), conversation retention (Yes), test coverage (No).
- Wellness: create (Yes), view (Yes), edit (Yes), delete (Yes), clear-all inclusion (Yes), export inclusion (Yes), import inclusion (Yes), offline retention (Yes), cache retention (No), conversation retention (Yes), test coverage (No).
- Photos: create (Yes), view (Yes), edit (No), delete (Yes), clear-all inclusion (Yes), export inclusion (Yes), import inclusion (Yes), offline retention (Yes), cache retention (No), conversation retention (Yes), test coverage (No).

## 51. Prioritized privacy-risk register

- Critical: Shared-device exposure. Data categories: All. Affected surfaces: All. Evidence: `localStorage` usage without auth. User consequence: Full data leak to other device users. Shared-device consequence: Total exposure. Deletion consequence: None. Test gap: Total. Future dependency: Auth/Encryption. Reason for priority: Inherent to web local storage on shared machines.
- High: Progress photo storage. Data categories: Images. Affected surfaces: Progress view, Export. Evidence: Base64/Object URL stored in state. User consequence: Sensitive photos exposed. Shared-device consequence: Total exposure. Deletion consequence: Leaves state, but export artifacts remain. Test gap: Total. Future dependency: IndexedDB blob storage. Reason for priority: Visual sensitivity.
- High: Export plain text JSON. Data categories: All. Affected surfaces: OS Downloads folder. Evidence: `exportJson` output. User consequence: Files remain on device. Shared-device consequence: Exposure via file system. Deletion consequence: File remains after app reset. Test gap: Total. Future dependency: Encrypted backups. Reason for priority: Artifact persistence outside app control.
- Medium: Unstructured AI chat retention. Data categories: Unstructured text. Affected surfaces: Jarvis Panel. Evidence: `aiMessages` retained indefinitely. User consequence: Forgotten secrets linger. Shared-device consequence: Exposure. Deletion consequence: Must be manually cleared. Test gap: Total. Future dependency: Auto-expire chats. Reason for priority: LLM contextual leaks.

## 52. Prioritized health-claim risk register

- High: Jarvis injury advice. Source: System prompt lacking hard boundaries. Wording category: treatment-like advice, diagnostic language. Data basis: `injuryAreas`. User consequence: Physical harm. Review requirement: Medical review. Test gap: Total. Reason for priority: Safety.
- Medium: Readiness score presentation. Source: `src/lib/analytics.ts`. Wording category: potentially prescriptive. Data basis: Sleep/fatigue inputs. User consequence: Over/under training. Review requirement: Product review. Test gap: Total. Reason for priority: Misinterpretation of estimates as medical fact.
- Low: Momentum score. Source: `src/lib/analytics.ts`. Wording category: motivational. Data basis: Adherence. User consequence: Demotivation. Review requirement: Product review. Test gap: Total. Reason for priority: Emotional impact.

## 53. Prioritized user-trust risk register

- High: Import full state overwrite. Source: `src/components/app/views/settings.tsx`. Behavior: Replaces `AppState` completely. User consequence: Irreversible data loss of current state. Evidence: `importJson` logic. Review priority: High.
- Medium: Silent synchronous saves. Source: `src/lib/store.tsx`. Behavior: No UI feedback on state mutation. User consequence: Uncertainty if data is saved. Evidence: Absence of toast notifications on form submit. Review priority: Medium.
- Low: Destructive action UI. Source: `ConfirmDialog`. Behavior: Standard confirmation. User consequence: Minor friction. Evidence: `sheet.tsx`. Review priority: Low.

## 54. Future privacy acceptance checklist

- sensitive fields have a clear purpose;
- optional sensitive fields remain optional;
- permissions are explicit;
- permission defaults are visible;
- denied permissions are respected;
- revoked permissions take effect;
- Jarvis access is bounded by permission;
- sensitive action receipts reveal only necessary data;
- conversation retention is understandable;
- progress-photo handling is clearly disclosed;
- photo deletion has clear scope;
- reset behavior names all affected data;
- export lists included data categories;
- import names replacement scope;
- shared-device persistence is disclosed where appropriate;
- errors do not expose full sensitive records;
- diagnostics do not dump sensitive state;
- offline access behavior is honest;
- deletion and reset receive regression tests;
- privacy controls remain accessible and usable at 320 px.

## 55. Future health-language acceptance checklist

- app-generated scores are identified as estimates or derived outputs where appropriate;
- descriptive data is separated from recommendations;
- recommendations state their data basis;
- missing data limits recommendations;
- partial data is labeled;
- confidence is exposed where supported;
- correlation does not imply causation;
- predictions include boundaries and evidence;
- injury symptoms are not diagnosed;
- treatment advice is not presented as medical fact;
- supplement guidance remains bounded;
- bodyweight language remains neutral;
- goal language avoids shame or moral judgment;
- users can dismiss or override recommendations;
- health-sensitive language receives product and medical review when required;
- tests protect critical limitation language.

## 56. Future Data Safety integration checklist

- validated storage: absent. Intended: Prevent corruption. Surface: Store. Dependency: IndexedDB. Test: Corruption recovery. Privacy: N/A.
- atomic persistence: absent. Intended: No partial writes. Surface: Store. Dependency: Transactional DB. Test: Interrupted save. Privacy: N/A.
- transaction receipts: absent. Intended: User feedback. Surface: Toast. Dependency: UI. Test: Save assert. Privacy: Certainty.
- stale-write feedback: absent. Intended: Conflict resolve. Surface: UI. Dependency: Sync. Test: Conflict. Privacy: N/A.
- another-tab changes: absent. Intended: Real-time update. Surface: UI. Dependency: Storage events. Test: Multi-tab. Privacy: Consistency.
- safe import inspection: absent. Intended: Diff view. Surface: Settings. Dependency: Diff tool. Test: Import diff. Privacy: Data loss prevention.
- export inventory: absent. Intended: List contents. Surface: Settings. Dependency: UI. Test: Export assert. Privacy: Transparency.
- backup envelope: absent. Intended: Encryption. Surface: Export. Dependency: Crypto. Test: Decrypt. Privacy: Offline security.
- recovery: absent. Intended: Undo. Surface: UI. Dependency: Revision history. Test: Undo assert. Privacy: Control.
- corruption handling: absent. Intended: Safe fallback. Surface: App root. Dependency: Error boundary. Test: Corrupt state load. Privacy: Safety.
- full-data reset: implemented. Intended: Clear all. Surface: Settings. Dependency: None. Test: Assert empty. Privacy: Right to be forgotten.
- progress-photo persistence: implemented (unsafe). Intended: Blob storage. Surface: Progress. Dependency: IndexedDB. Test: Render blob. Privacy: Local device security.
- privacy-safe diagnostics: absent. Intended: Masked logs. Surface: Error reporter. Dependency: Logger. Test: Assert masked. Privacy: Telemetry safety.
- deletion verification: absent. Intended: Assert gone. Surface: Store. Dependency: Tests. Test: Delete assert. Privacy: Verification.
- revision-aware undo: absent. Intended: AI undo. Surface: Jarvis. Dependency: Event source. Test: AI rollback. Privacy: AI Safety.

## 57. Required future test matrix

- test ID: PRIV-001; data category: Jarvis; domain: Settings; starting state: Logged in; user action: Deny Jarvis write permission; expected permission behavior: Respect denial; expected UI result: Write tools disabled; expected persisted result: No mutation; expected deletion or retention result: N/A; privacy assertion: Write blocked; viewport: Desktop; recommended test layer: E2E; priority: High.
- test ID: PRIV-002; data category: Full State; domain: Settings; starting state: Populated; user action: Import JSON; expected permission behavior: Prompt confirmation; expected UI result: State replaced; expected persisted result: New state saved; expected deletion or retention result: Old state deleted; privacy assertion: Overwrite consent; viewport: Desktop; recommended test layer: E2E; priority: High.
- test ID: PRIV-003; data category: Photos; domain: Progress; starting state: Photo uploaded; user action: Delete photo; expected permission behavior: N/A; expected UI result: Photo removed; expected persisted result: Removed from store; expected deletion or retention result: Permanently deleted; privacy assertion: Erasure; viewport: Mobile; recommended test layer: E2E; priority: Critical.
- test ID: PRIV-004; data category: Full State; domain: Settings; starting state: Populated; user action: Reset App Data; expected permission behavior: Prompt confirmation; expected UI result: Blank app; expected persisted result: Default state; expected deletion or retention result: All data removed; privacy assertion: Complete Erasure; viewport: Desktop; recommended test layer: E2E; priority: Critical.

## 58. Safe future task boundaries

- privacy Settings hotspots: `src/components/app/views/settings.tsx`.
- Jarvis permission hotspots: `src/lib/jarvis/tools.ts`, `src/components/app/jarvis/settings-card.tsx`.
- progress-photo hotspots: `src/components/app/views/progress.tsx`.
- export/import hotspots: `src/components/app/views/settings.tsx`.
- deletion/reset hotspots: `src/lib/store.tsx`, `src/components/app/views/settings.tsx`.
- health-copy hotspots: `src/lib/analytics.ts`.
- analytics explanation hotspots: `src/components/app/popups/`.
- notification hotspots: `src/components/app/views/settings.tsx`.
- persistence files that must remain untouched during Phase A: `src/lib/store.tsx`.
- files likely to conflict with active UI work: `src/components/app/views/home.tsx`.
- files likely to conflict with Data Safety work: `src/lib/store.tsx`.
- tests requiring coordinated ownership: `tests/e2e/helpers/fitcore-test-state.ts`.
- recommended sequencing boundaries: UI Polish -> Storage Refactor -> Jarvis Permissions.

## 59. Open questions and uncertainties

- Are progress photos serialized as Base64 strings or Object URLs?
  - why unresolved: `ProgressPhoto` type on main is minimal; UI implementation details rely on browser APIs not fully traceable statically.
  - files inspected: `src/lib/types.ts`, `src/components/app/views/progress.tsx`.
  - evidence needed: Runtime `localStorage` inspection.
  - browser verification required: Yes.
  - platform verification required: No.
  - network inspection required: No.
  - product review required: Yes (to decide on quota bloat vs session persistence).
  - legal review required: No.
  - medical review required: No.
  - whether it blocks redesign: No.
  - whether it depends on Data Safety integration: Yes.

## 60. File index

- onboarding: `src/components/app/views/onboarding.tsx`
- profile: `src/lib/types.ts`, `src/components/app/views/settings.tsx`
- Home: `src/components/app/views/home.tsx`
- Training: `src/components/app/views/training.tsx`
- active workout: `src/components/app/active-workout.tsx` (inferred)
- Fuel/Nutrition: `src/components/app/views/nutrition.tsx`
- Recovery: `src/components/app/views/recovery.tsx`
- Stats/Progress: `src/components/app/views/progress.tsx`
- progress photos: `src/components/app/views/progress.tsx`
- Jarvis: `src/components/app/jarvis/jarvis-panel.tsx`, `src/lib/jarvis/tools.ts`, `src/components/app/jarvis/settings-card.tsx`
- Settings: `src/components/app/views/settings.tsx`
- permissions: `src/lib/types.ts`
- notifications: `src/lib/types.ts`
- analytics: `src/lib/analytics.ts`
- recommendations: `src/lib/jarvis/tools.ts`
- health-related copy: `src/lib/analytics.ts`
- deletion/reset: `src/lib/store.tsx`, `src/components/app/views/settings.tsx`
- import/export: `src/components/app/views/settings.tsx`
- persistence: `src/lib/store.tsx`
- PWA/offline: `README.md`
- errors and diagnostics: `src/lib/ai.functions.ts`
- styles: `src/styles.css`
- unit tests: None inspected.
- integration tests: None inspected.
- E2E tests: `tests/e2e/helpers/fitcore-test-state.ts`
- documentation references: `README.md`, `docs/planning/codex-goal-mode-pr-review-checklist.md`
