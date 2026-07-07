# AI Provenance and Confidence Audit

**Date:** $(date +%Y-%m-%d)
**Branch/Task:** audit/ai-provenance-confidence

> **Note:** This is a docs-only audit task and does not change any runtime behavior.

## Executive Summary

- **Clear Provenance & Confidence Definitions:** The core types (`DataProvenance`, `DataSource`, `Confidence`) clearly define where data comes from (e.g., manual, jarvis, wearable, barcode) and its confidence level (high, medium, low).
- **Audit Logging and Transparency:** Actions taken by AI through Jarvis tools are actively tracked using an audit log (`JarvisAuditEntry`). Summaries, original text, entity ids, patches, and confidence are recorded, establishing a clear trail of operations.
- **AI Influence on Data:** AI (via `logMeal`, `logWorkout`, `logCardio`, `logDailyCheckIn`, etc.) can write data directly to the local store (or as unconfirmed drafts), modifying or creating user records.
- **Confidence Enforcement:** `jarvis-panel.tsx` uses the confidence parameter to decide between auto-logging (e.g., `confidence === "high"`) and pushing to user review. Unconfirmed AI estimates are flagged in the `Daily Decision Engine` which degrades gracefully by asking the user for confirmation.
- **Risk Areas:** Missing explicit explanation ("why") fields on standard records (although audits have `summary`), and there is potential for AI-generated text or decisions touching sensitive health contexts without medical disclaimers directly visible during the logging flow in some tools.

## Files Inspected

- `src/lib/types.ts`: Core data structures defining `DataProvenance`, `Confidence`, `JarvisAuditEntry`, and various log models. Central to ensuring every record supports provenance.
- `src/lib/ai.functions.ts`: Underlying service layer coordinating with Groq/Gemini models. Handles text extractions, prompt logic, and AI fallbacks. Contains tool configurations and diagnostics logging.
- `src/lib/jarvis/tools.ts`: Defines the Jarvis tools that the AI can call (e.g., `logMeal`, `logWorkout`). This bridges AI outputs to data creation. It constructs `provenance` metadata and registers `pushAudit` calls.
- `src/components/app/jarvis/jarvis-panel.tsx`: The UI that wraps Jarvis AI. Uses the confidence score to decide whether to automatically accept a log or pause for user review.
- `src/lib/fitcore-data.ts`: Contains persistence and utility functions, including specific logic (`createJarvisProvenance`, `createAiEstimateProvenance`, `isLowConfidence`) to wrap and validate the integrity and provenance of all created records.
- `src/lib/store.tsx`: The central context that persists and migrates the overarching state, ensuring `provenance` details are kept across local migrations.
- `docs/product/daily-decision-engine-rules.md`: Rules outlining that only high-confidence data should drive strong recommendations, and that unconfirmed or low-confidence data requires user review.

## AI Capability Inventory

| AI Feature / Tool                      | File / Location   | User Input Used   | Data Output Created               | Can It Modify Stored Data? | Confidence/Provenance Present?           | User Explanation Visible?        | Risk Level | Notes                                              |
| -------------------------------------- | ----------------- | ----------------- | --------------------------------- | -------------------------- | ---------------------------------------- | -------------------------------- | ---------- | -------------------------------------------------- |
| Log Meal (`logMeal`)                   | `jarvis/tools.ts` | Text / Photo Info | `MealEntry`, `JarvisAuditEntry`   | Yes                        | Yes                                      | Partial (Assumptions array used) | Medium     | Requires confirmation if medium/low confidence.    |
| Log Workout (`logWorkout`)             | `jarvis/tools.ts` | Natural Language  | `Workout`, `JarvisAuditEntry`     | Yes                        | Yes                                      | Partial                          | Medium     | Can log multiple exercises from unstructured text. |
| Log Cardio (`logCardio`)               | `jarvis/tools.ts` | Natural Language  | `CardioEntry`, `JarvisAuditEntry` | Yes                        | Yes                                      | Partial                          | Low        |                                                    |
| Workout Draft (`createWorkoutDraft`)   | `jarvis/tools.ts` | Natural Language  | Draft State, Audits               | No (Draft only)            | Yes                                      | Yes                              | Low        | Requires explicit confirmation.                    |
| Log Bodyweight (`logBodyWeight`)       | `jarvis/tools.ts` | Natural Language  | Bodyweight Entry, Audits          | Yes                        | Yes                                      | Yes                              | Low        | Forces `confidence: "high"`.                       |
| Log Supplement (`logSupplement`)       | `jarvis/tools.ts` | Natural Language  | `SupplementLog`, Audits           | Yes                        | Yes                                      | Yes                              | Medium     | Touches health data; forces `confidence: "high"`.  |
| Log Daily Check-In (`logDailyCheckIn`) | `jarvis/tools.ts` | Natural Language  | `RecoveryCheckIn`, Audits         | Yes                        | Yes                                      | Yes                              | Medium     | Incorporates recovery signals (soreness, sleep).   |
| Daily Decision (`getDailyDecision`)    | `jarvis/tools.ts` | Multi-domain Data | Dashboard Insights                | No                         | Yes (Data inputs filtered by confidence) | Yes                              | Low        | Follows strict Daily Decision Engine rules.        |

## Data Write and Influence Map

The FitCore app clearly distinguishes and maps AI influence on data in the following ways:

- **AI Suggestions Only:** Daily decisions and dashboard insights pull from existing data to make recommendations. They do not write to state. Draft features (like `createWorkoutDraft`) prepare objects but do not commit them.
- **AI-generated Estimates:** Natural language parsing for meals (`logMeal` using portions/estimates) creates stored data, but attaches `provenance` metadata with `confidence` (e.g., medium/low) and `assumptions`.
- **AI-written Logs:** Jarvis tools directly write unstructured user input into structured logs (`Workout`, `CardioEntry`, `BodyWeightEntry`). These have `provenance` tracking the AI as the source, and generate an explicit `JarvisAuditEntry`.
- **AI-modified Existing Records:** Existing items can be altered (e.g., using a fallback or review), but `fitcore-data.ts` utilities and audit patch tracking are used to keep a record of what changed.
- **AI Summaries:** Aggregated stats (e.g., `getDailyReviewSummary`) do not persist new data. They fetch active context to deliver conversational value.

## Provenance and Source Tracking

Records generated by AI generally include strong provenance metadata:

- **Source Type:** Yes (`DataSource` / `ProvenanceSource` track manual, jarvis, camera, etc.).
- **Source Text/Image:** Yes (`originalText` is captured on drafts and in audits).
- **Confidence Score:** Yes (`confidence` tracks high, medium, low).
- **Timestamp:** Yes (`createdAt` timestamps exist on audits and entities).
- **User Confirmation Flag:** Yes (`ConfirmationStatus: "confirmed" | "unconfirmed"` tracks if the user accepted it).
- **Manual vs AI Marker:** Yes (Differentiated through `source` property).
- **Explanation/Why field:** Partial (Audits have `summary` and `assumptions`, but a dedicated user-facing `why` field on standard models is missing).
- **Source Data References:** Yes (`entityIds` array in `JarvisAuditEntry`).

## Confidence Handling

The system heavily utilizes the `confidence` field to enforce safety and trust:

- **Distinction:** High-confidence outputs are distinguished from low/medium outputs (managed heavily by `asConfidence` fallback).
- **Confirmation:** Low/Medium confidence logs often require explicit user review, as defined in UI wrappers like `jarvis-panel.tsx` which pause auto-logging.
- **Visibility:** Confidence is captured in provenance fields and audits. The Daily Decision Engine states that low-confidence data is flagged or results in a request for manual verification, meaning confidence directly impacts user trust and recommendations.

## Explainability and User Control

- **Why an AI Suggestion Was Made:** Explained via Daily Decision outputs (which state reasoning according to rules), though inline logs primarily use `assumptions` and `summary` arrays.
- **What Data Was Used:** Detailed in the `originalText` and `entityIds` of the audit logs, although exposing this clearly in the UI on a per-log basis could be improved.
- **Is the Result Estimated:** Clearly marked by confidence levels and source markers like `ai-estimated`.
- **Safety / Deletion:** AI tools usually provide mechanisms to undo actions (`JarvisAuditEntry` has an `undone` flag), and low-confidence elements wait for confirmation.
- **Future Need:** A standard, user-facing "Why do you know this?" feature across all AI-generated logs is expected as future validation to elevate trust.

## Privacy and Sensitive Data Concerns

AI interactions touch significant sensitive data:

- **Medical/Injury Data:** `logDailyCheckIn` and recovery insights track soreness, pain, and fatigue.
- **Body Data:** Bodyweight logs and progressive photos capture physical metrics.
- **Nutrition:** Calorie and macronutrient estimates (potentially derived from user-uploaded images or personal conversations).
- **Conversations:** AI messages (`AiMessage`) are persisted, meaning unstructured personal details could be stored.

Currently, this sensitive data resides locally via `localStorage` and `fitcore-data.ts`, but any cloud sync or export functionality introduces risks. AI model calls (via `ai.functions.ts`) send unstructured prompt text and images to Groq/Gemini APIs, meaning sensitive data is temporarily processed externally.

## Medical / Safety Boundary Risks

The AI engine interprets recovery signals (soreness, fatigue) to recommend workout intensity or rest (via the Daily Decision Engine and `logDailyCheckIn`).

- **Risk:** The AI might produce unintended medical recommendations (diagnosing injuries instead of managing fatigue).
- **Current Safeguards:** The `Daily Decision Engine Rules` explicitly forbid diagnosing pain/injuries, mandating that the AI refer only to "soreness" or "fatigue." A boolean config flag (`painBasedWorkoutWarnings`) exists in `JarvisSettings`.
- **Gaps:** Strict disclaimers ("seek medical care" or "not medical advice") are not consistently visible in the UI when AI returns health-related recovery assessments.

## Risk Table

| Risk                          | Evidence                                                       | Affected Feature                 | User Impact                                                                            | Severity | Recommended Future Action                                           | Safe to Fix Now?      |
| ----------------------------- | -------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- | --------------------- |
| Lack of Explicit Disclaimers  | No disclaimers found in `jarvis-panel.tsx` for health data     | Jarvis Recovery, Daily Decisions | Users might take AI recovery advice as medical diagnosis                               | Medium   | Add clear UI disclaimers for health/injury AI prompts.              | No, future runtime PR |
| Implicit Explanations         | `assumptions` array exists but lacks a strict "why" UI field   | All AI logs (Meals, Workouts)    | Users can't easily see exactly why an AI chose specific macros/sets                    | Low      | Implement a "Why do you know this?" popup for AI logs.              | No, future runtime PR |
| External API Data Exposure    | `ai.functions.ts` sends data to Groq/Gemini                    | Chat, Estimations                | Health context or photos are sent to third-party AI APIs without active local warnings | Medium   | Add pre-flight privacy warnings for sensitive image/text uploads.   | No, future runtime PR |
| Hardcoded Confidence Defaults | `logBodyWeight` and `logSupplement` force `confidence: "high"` | Bodyweight, Supplements          | AI might confidently log an incorrect parsed number                                    | Low      | Refactor tools to assess text ambiguity for bodyweight/supplements. | No, future runtime PR |

## Recommended Future Tasks

### Docs/Planning Tasks

- Update AI guidelines to require "Why do you know this?" rules for all generated outputs.
- Create a clear Privacy Policy matrix documenting what data is sent to external AI providers.

### Schema/Data Model Tasks

- Add an explicit `explanation` or `reasoning` string to `DataProvenance` or `MealEntry`/`Workout` models.
- Standardize AI fallbacks for `confidence: "high"` when natural language parsing is potentially ambiguous.

### UI/Explainability Tasks

- Implement a "Why do you know this?" info button on AI-generated logs.
- Add medical/health disclaimers to the Daily Review and Jarvis Panel when discussing recovery or pain.

### Test/Smoke Validation Tasks

- Create Playwright tests that explicitly check if low-confidence AI logs correctly block auto-saving and trigger the confirmation dialog.

### Runtime Implementation Tasks

- (Future Work) Update `jarvis-panel.tsx` to handle medical disclaimers.
- (Future Work) Add `explanation` UI popups hooked to the audit trail.
- (Future Work) Adjust `logBodyWeight` tool to evaluate parsing certainty before hardcoding `confidence: "high"`.
