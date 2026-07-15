# FitCore Jarvis Conversation and User Experience

## 2. Document status

This is a proposed product and interaction specification. No UI implementation is included. Exact visual styling remains governed by the final FitCore design system. Active premium UI work must not be disrupted. Behavior described here should remain stable across visual redesigns. The regular iPhone 15 is the baseline device. Optional iPhone 16 enhancements must not create a fundamentally different core experience.

## 3. Experience vision

Jarvis should feel like a natural extension of FitCore. It should be available without dominating the interface. It should be fast during workouts, thoughtful during analysis, trustworthy with user data, easy to stop, easy to correct, clear about what it changed, and transparent about limitations.

Jarvis should not feel like a separate chatbot website, an uncontrolled general assistant, a hidden background listener, an AI that invents metrics, an assistant that talks too much during workouts, a feature that requires constant internet access, or a system that hides model downloads or storage use.

## 4. Experience principles

1. User control is always visible.
2. Stop and cancel must be immediate.
3. Voice and text are equal first-class inputs.
4. Workout interactions favor speed and brevity.
5. Analytical interactions favor clarity and evidence.
6. Actions are distinct from explanations.
7. Successful actions show exact results.
8. Material changes require previews.
9. Reversible actions expose Undo.
10. Missing data is stated clearly.
11. Uncertainty is not disguised as confidence.
12. Local or offline status is understandable.
13. Model or feature degradation is graceful.
14. Jarvis does not interrupt the user unnecessarily.
15. The user can inspect and manage saved memory.
16. Accessibility does not depend on speech.
17. The visible experience remains consistent across both supported phones.
18. The user should not need to understand model or runtime terminology.

## 5. Primary user groups and contexts

### Active workout user
Needs: fast set logging, timers, navigation, short answers, minimal interruption, dependable Undo.

### Post-workout reviewer
Needs: workout summary, comparisons, explanations, trend interpretation, recommended next questions.

### Daily health reviewer
Needs: nutrition, recovery, sleep, goals, clear data completeness, concise cross-domain summaries.

### Settings and privacy manager
Needs: model status, storage use, memory controls, speech settings, optional-provider controls, deletion.

### Text-only user
Needs the complete core experience without microphone or spoken output.

## 6. Experience surfaces

### Global entry point
A persistent or readily accessible entry point that can open Jarvis from major FitCore areas. Requirements: recognizable, accessible, does not obscure key controls, reflects active or listening state carefully, works across supported screen sizes.

### Conversation surface
Represented by the `JarvisPanel` component (often surfaced within a `BottomSheet`). Must support: transcript, text input, microphone control, Stop control, current status, tool-result cards or summaries, confirmation previews, errors, settings access, collapse and expand.

### Compact workout surface
A reduced interaction surface for active workouts. Must prioritize: microphone, current transcript, action confirmation, timer status, Undo, Stop.

### Expanded analytical surface
Used for longer explanations, supporting metrics, comparisons, charts, sources within FitCore, and follow-up suggestions.

### Settings and management surface
Used for model assets, storage, speech, memory, conversations, privacy, optional providers, diagnostics.

```text
+-------------------------------------------------------------+
|                      Global Entry Point                     |
|                      (Available app-wide)                   |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|                     Conversation Surface                    |
|             (JarvisPanel / BottomSheet Overlay)             |
+-----------------------------+-------------------------------+
                              |
         +--------------------+---------------------+
         |                    |                     |
+----------------+  +--------------------+  +-----------------+
| Compact Workout|  | Expanded Analytical|  |    Settings &   |
|     Surface    |  |       Surface      |  |    Management   |
+----------------+  +--------------------+  +-----------------+
```

## 7. Entry-point behavior

Jarvis should receive relevant current context without displaying unrelated data when opened.

### From active workout
Jarvis should know: active workout, current exercise, recent set, timer, current unit preference.

### From selected chart
Jarvis should know: metric, date range, filters, display mode, data availability.

### From Fuel
Jarvis should know: selected date, current totals, targets, data completeness.

## 8. First-use onboarding

### Step 1 — Explain Jarvis
Communicate: core features run locally, voice and text are available, required model assets may need downloading, microphone is optional, the user remains in control.

### Step 2 — Choose interaction setup
Options: text only, voice and text, configure later.

### Step 3 — Model installation
Show: download size, installed size, network recommendation, offline benefit, cancel or defer, fallback capability.

### Step 4 — Permissions
Request microphone only when voice is enabled or first used. Do not request unrelated permissions.

### Step 5 — Short demonstration
Examples: "What did I train last?", "Log 225 for five" during a demo state or explanatory preview, "Stop speaking". Do not perform a real write during onboarding without explicit context and approval.

```text
+------------------+     +------------------+     +-------------------+
| 1. Welcome &     | --> | 2. Choose Mode   | --> | 3. Model Download |
|    Explanation   |     |    (Voice/Text)  |     |    (Optional)     |
+------------------+     +------------------+     +-------------------+
                                                            |
+------------------+     +------------------+               |
| 5. Short Demo    | <-- | 4. Mic Permission| <-------------+
|    & Setup Done  |     |    (If Voice)    |
+------------------+     +------------------+
```

## 9. Progressive onboarding

Jarvis can be introduced without a long mandatory tutorial.
Examples: first voice use explains microphone state, first write action explains Undo, first confirmation-required action explains preview behavior, first memory proposal explains permanence, first degraded-mode event explains fallback.

Require: each explanation appears only when useful, explanations remain dismissible, no repeated nagging, help remains accessible later.

## 10. Jarvis modes

### Workout Mode
Optimized for active exercise. Behavior: short responses, faster deterministic commands, minimal follow-up questions, no lengthy unsolicited coaching, timer-aware, prominent Stop and Undo, speech output may be abbreviated, screen context prioritized.

### Coach Mode
Optimized for analytics, planning, comparison, explanation, deeper follow-up. Behavior: more detailed responses, supporting metrics, assumptions and uncertainty, relevant follow-up prompts, no invented data.

### Quiet or Text-Only Mode
Behavior: no spoken output, microphone optional or disabled, full text conversation, same tools and safety rules.

### Degraded Mode
Behavior when the full model stack is unavailable: deterministic commands where supported, text input, system TTS if available, clear unavailable capabilities, no false "offline" claims.

## 11. Mode selection

Define: automatic suggestion based on context, user override, session-only mode switch, saved preference, visible current mode, no mode change that silently alters permissions.

Recommended behavior: opening Jarvis during an active workout defaults to Workout Mode; opening from Stats may default to Coach Mode; the user may switch at any time; current explicit instruction overrides a stored preference.

## 12. Voice interaction model

User-visible voice lifecycle:
Ready -> Listening -> Processing speech -> Understanding -> Using FitCore -> Preparing response -> Speaking -> Stopped -> Error.

Avoid internal model terminology in normal UI. For each state define user-visible status, available controls, microphone behavior, transcript behavior, cancellation behavior.

```text
+---------+    +-----------+    +------------+    +---------------+
|  Ready  | -> | Listening | -> | Processing | -> | Understanding |
+---------+    +-----------+    +------------+    +---------------+
                                                          |
+---------+    +-----------+    +---------------+    +---------------+
| Stopped | <- | Speaking  | <- | Preparing Res | <- | Using FitCore |
+---------+    +-----------+    +---------------+    +---------------+
```

## 13. Microphone control

Controls: tap to begin, tap to stop, optional push-to-talk, optional hands-free session only after feasibility approval, visible active state, clear permission state, immediate stop.

Require: microphone never activates silently, closing or ending the session stops listening, denial leaves text available, microphone state survives no hidden mismatch after app restoration, Stop remains available while Jarvis is speaking.

## 14. Push-to-talk versus hands-free behavior

### Push-to-talk
Recommended reliable baseline for noisy gyms, short commands, clear turn boundaries, lower accidental activation.

### Hands-free conversation
May be available when the user intentionally starts a voice session, the application is foregrounded, the device supports the required pipeline, feasibility gates pass.

Require: obvious active-session state, easy end-session control, no permanent wake-word expectation, no always-listening claim while FitCore is closed.

## 15. Text interaction

Require: text input always available, voice transcript may be edited before submission where practical, text and voice share conversation history, pasted text is treated as untrusted data, Enter/send behavior is consistent, long input shows clear limits, canceled draft remains under user control where practical.

## 16. Transcript behavior

### Live partial transcript
Updates while speaking, visually provisional, may change, must not trigger writes.

### Final user transcript
Stable, used for routing, visible to user, may be corrected.

### Assistant response
Streams progressively where useful, must not display abandoned text as a final completed answer.

### Tool action result
Visually distinct from conversational explanation, exact, structured, not merely model-generated prose.

## 17. Transcript correction

User options: edit before sending, immediate verbal correction, edit recent user message where supported, Undo executed action, retry transcription.

Example:
```text
User transcript:
"Log 215 for five."

User:
"No, 225."
```

Expected: correction targets the recent eligible action; exact updated result displayed; no duplicate set.

## 18. Status language

Recommend plain-language states: Listening, Processing, Checking your workout, Comparing sessions, Updating the set, Waiting for confirmation, Speaking, Offline mode, Download required, Jarvis unavailable.

Avoid exposing by default: token generation, inference provider, context-window usage, quantization, native bridge, tool loop.

## 19. Streaming response behavior

Text may appear progressively, spoken output begins at a natural phrase boundary, exact tool results appear only after confirmed service success, partial model text must not claim completion, canceled output stops updating, old response text is marked interrupted or removed appropriately, long responses may show sections progressively.

## 20. Stop and interruption experience

The user must be able to stop Jarvis through visible Stop control, voice command such as "Stop", closing or ending the session where appropriate.

Expected behavior: Speech stops immediately. Remaining audio is discarded. Generation is canceled. Pending unexecuted actions are canceled. Completed actions remain completed and are reconciled. New user speech or text becomes the active request. Old response does not resume.

The Stop control must not be hidden behind another menu while Jarvis is speaking.

```text
+-----------------------+     +--------------------------+
|  Jarvis is Speaking   | --> | User says "Stop" / Taps  |
|  or Tool is executing |     | Stop control             |
+-----------------------+     +--------------------------+
                                           |
+--------------------------+    +--------------------------+
|  Submit revised question | <- | Speech & Generation halt |
|  or close Jarvis         |    | (Unexecuted actions drop)|
+--------------------------+    +--------------------------+
```

## 21. Interruption display behavior

Example:
```text
Jarvis:
"Your bench volume increased because—"

User:
"Stop. Just compare top sets."
```

Expected display: previous response visibly interrupted, new request appears, no abandoned conclusion saved as final, new analysis starts using the revised request. Interrupted text is retained in a muted state or collapsed (recommended) to maintain read flow.

## 22. Tool-use visibility

Jarvis should communicate tool activity at the level useful to the user. Examples: "Checking your last four bench sessions.", "Logging the set.", "Opening Recovery."

Require: actions are not represented as complete before service success, long-running reads show progress, tool failures are distinct from model failures, the user can cancel a long read where safe.

## 23. Read-result presentation

Requirements: answer first, supporting values, date range, missing-data caveat, optional link or action to open the relevant FitCore view, no unnecessary raw record dump.

Example structure:
```text
Your top bench set was unchanged at 225 lb, but you completed one fewer rep.

Compared:
- Today: 225 × 4
- Previous matching session: 225 × 5
```

## 24. Analytical explanation presentation

Require separation between verified facts, interpretation, uncertainty, recommended next action.

Example:
```text
Verified:
Your total bench volume decreased 6%.

Possible explanation:
You completed fewer working sets.

Not enough data:
FitCore cannot determine whether sleep caused the change.
```

Do not require these literal headings for every answer, but preserve the distinction.

## 25. Action-result presentation

A successful action should display what changed, exact value, affected entity, time where useful, Undo availability.

Example:
```text
Logged 225 lb × 5 for Barbell Bench Press.

Undo
```

A failed action should display no change occurred, clear reason, next recovery action.

## 26. Confirmation previews

Must show proposed action, affected item, current value, proposed value, consequence, Undo availability, Confirm, Cancel (e.g. inside `ConfirmDialog`).

Require: confirmation tied to one exact action, no generic confirmation for multiple pending actions, expired previews close or refresh, context changes invalidate previews.

Example:
```text
Replace Barbell Back Squat with Leg Press?

Current:
Barbell Back Squat — 4 sets

Proposed:
Leg Press — 4 sets

This changes the current workout only.

Confirm
Cancel
```

## 27. Confirmation language

Prefer explicit action labels: Replace exercise, Update target, Delete memory, Finish workout, Cancel. Voice confirmation may accept "yes" only when one clear preview is active.

## 28. Undo experience

Define: immediate Undo affordance after eligible actions, voice command "Undo that", time-bounded availability, clear completion, conflict behavior, no arbitrary deletion.

Example 1:
```text
Set logged.
Undo
```

Example 2:
```text
The set was removed.
Restore
```

If Undo is unavailable:
```text
That action can no longer be undone because the workout changed afterward.
```

```text
+-----------------------+     +-------------------+     +-----------------------+
| User Confirms / Auto  | --> | Action Executed   | --> | Display Result + Undo |
| Execs Mutation        |     |                   |     |                       |
+-----------------------+     +-------------------+     +-----------------------+
                                                                |
+-----------------------+     +-------------------+             | User clicks Undo
| Re-render state to    | <-- | Action Reverted   | <-----------+
| previous values       |     |                   |
+-----------------------+     +-------------------+
```

## 29. Error hierarchy

### Input error
No speech detected, unclear transcript, ambiguous number.
### Context error
No active workout, no current exercise, selected chart changed.
### Capability error
Speech model unavailable, local model unavailable, TTS unavailable.
### Tool error
Set could not be saved, data service unavailable, confirmation expired.
### Device or resource error
Low storage, microphone permission denied, device too warm, model unloaded.
### Security or policy block
Unsupported destructive request, arbitrary data access, action requires confirmation.

## 30. Error-message requirements

Every error should answer: What happened? Did anything change? What can the user do next? Avoid raw stack traces, unexplained error codes, blame, false success.

Example:
```text
I could not log that set because there is no active exercise.

No workout data was changed.

Open an active exercise or tell me which exercise you mean.
```

## 31. Clarification behavior

Clarifications should be narrow, short, actionable, proportional to risk. During a workout, prefer at most one concise clarification before safe failure or text correction.

Example:
```text
Did you mean 215 pounds or two sets of 15?
```

## 32. Missing-data behavior

Require Jarvis to state what data is missing, what period is incomplete, whether a calculation is unavailable, whether an answer is partial. Jarvis must not fill gaps with estimates unless explicitly requested.

Examples:
```text
I only have two bench sessions in the selected month, so this trend is limited.
```

```text
Sleep data is missing for three nights.
```

## 33. Offline experience

### Fully ready offline
All required local assets installed.
### Partial offline capability
Deterministic commands available, text available, local TTS unavailable, optional external features unavailable.
### Download required
Core model asset missing. No generic "network error", clear list of available functions, no mandatory provider sign-in, local mode does not appear inferior.

```text
+-----------------------+     +------------------------+
| App loses connection  | --> | Is local model present?|
+-----------------------+     +------------------------+
                                     |         |
                          +----------+         +---------+
                         Yes                         No
                          |                              |
            +---------------------------+  +---------------------------+
            |  Ready Offline / Partial  |  |  Degraded Mode            |
            |  (Uses on-device compute) |  |  (Deterministic commands) |
            +---------------------------+  +---------------------------+
```

## 34. Model download experience

Requirements: purpose, size, expected installed storage, progress, pause, resume, cancel, verification, ready status, failure recovery, delete later.

## 35. Degraded-mode experience

Speech recognition unavailable: text remains available. Local agent model unavailable: deterministic commands remain available. Enhanced TTS unavailable: system voice or text fallback. Device thermal pressure: shorter answers, optional feature suspension. Low storage: model management action.

## 36. Recovery from app lifecycle events

Require: active workout remains safe, microphone status is accurate, no old speech resumes, no stale confirmation remains, completed actions remain visible, uncompleted actions do not replay, a concise restoration message appears only when useful.

## 37. Bluetooth experience

Current route may be shown in settings, route change acknowledged only when it affects behavior, disconnect falls back safely, microphone and speaker selection remains understandable, no repeated intrusive notifications, user can switch to phone audio.

## 38. Conversation history

Define: current session transcript, optional saved conversations, session title or summary, resume, delete, clear history, privacy status. Distinguish temporary transcript, saved conversation, long-term memory, canonical FitCore data.

## 39. Memory proposal experience

When Jarvis identifies potentially useful durable information, show a proposal.
Require: exact memory shown, category, permanence, edit, reject, no silent storage, high-sensitivity information receives stronger explanation.

```text
+-----------------------+     +-------------------+
| Conversation implies  | --> | Jarvis creates    |
| new durable preference|     | memory proposal   |
+-----------------------+     +-------------------+
                                        |
+-----------------------+     +-------------------+
| Memory is persisted   | <-- | User edits/saves  |
| and inspectable later |     | the proposal UI   |
+-----------------------+     +-------------------+
```

## 40. Memory management experience

Future capabilities: list memories, filter by type, show source, show date, show status, edit, delete, expire, clear all Jarvis memory.

## 41. Speech settings

Speech enabled, response voice, speech rate, response length, automatic speech in Workout Mode, push-to-talk, hands-free session if approved, Bluetooth route information, system voice fallback.

## 42. Response-style settings

Concise, balanced, detailed, Workout Mode default, Coach Mode default, speak confirmations, show supporting values, suggest follow-ups. Current-turn instructions override stored settings.

## 43. Privacy settings

Saved conversations, saved memory, microphone permission status, raw-audio policy explanation, optional provider status, diagnostics, delete memory, clear conversations, delete model assets, view licenses.

## 44. Optional-provider experience

Disabled by default, clearly labeled, explains what data leaves the device, shows possible cost, requires explicit activation, shows when a response uses the provider, can be disabled and credentials removed, local fallback remains available.

## 45. Notification behavior

Jarvis should not generate unnecessary notifications. Valid: model download completed, requested timer completed, critical model repair required. Do not add unsolicited coaching, engagement nudges, persistent promotional notifications.

## 46. Proactive behavior

Initially, Jarvis should generally respond when invoked. Limited proactive behavior: active timer completion, confirmation timeout, clear workout-state warning, explicitly requested reminder. No background conversational monitoring.

## 47. Suggested follow-ups

Limited count, directly relevant, no pressure, no unrelated feature promotion, actions clearly distinguish navigation from data mutation.

## 48. Chart and analytics integration

Requirements: identify metric, date range, filters, selected mode, supporting records, data completeness, option to focus or navigate to the chart. Jarvis should not reproduce every data point in speech.

## 49. Active-workout integration

During an active workout, Jarvis must avoid covering essential controls, remain dismissible, keep action feedback brief, preserve workout state, show current timer, expose Undo, avoid long blocking animations, support one-handed use, remain readable in bright/variable environments, work with speech disabled.

## 50. Safety and medical-boundary experience

Avoid constant repetitive disclaimers. Use safety language when the request materially requires it. (e.g. "FitCore can show that your performance declined, but it cannot determine the medical cause.")

## 51. Trust indicators

Exact data dates, affected record, FitCore source, action completion, Undo availability, missing-data indicator, local or external processing indicator, memory-saved indicator.

## 52. Accessibility requirements

Screen readers: all controls labeled, state changes announced, transcript readable in order.
Dynamic Type: no clipped actions, transcript reflows.
Reduced motion: no essential info conveyed only by animation.
Color and contrast: state not conveyed by color alone.
Motor accessibility: large touch targets, text alternative to voice.

## 53. VoiceOver conversation behavior

Newest message announcement, no forced focus jump, partial transcript updates throttled, final transcript announced clearly, tool success announced, Stop and Undo reachable immediately.

## 54. Responsive behavior

Require: conversation remains usable across iPhone portrait/landscape, larger desktop/web viewport, keyboard open. Active workout controls remain accessible, panels/BottomSheet do not trap the user.

## 55. Empty states

Each empty state should provide one useful next action.

## 56. Loading and progress states

Requirements: distinguish indeterminate from measured progress, cancel where safe, do not block unrelated FitCore use unnecessarily, prevent duplicate user actions.

## 57. Error recovery actions

| Failure | Primary action | Secondary action |
| --- | --- | --- |
| Microphone denied | Open text input | Open permission guidance |
| Model missing | Download model | Use limited mode |
| Low storage | Manage models | Continue text-only |
| Transcript unclear | Retry | Edit transcript |
| No active workout | Open Training | Specify exercise |
| Tool failed | Retry safely | Open affected view |
| Bluetooth lost | Use phone audio | Reconnect device |
| Device too warm | Continue limited mode | End Jarvis session |

## 58. User-flow specifications

### Flow A — First voice setup
1. Open Jarvis.
2. Review local-processing explanation.
3. Install required assets.
4. Grant microphone permission.
5. Run a test request.
6. Finish setup or switch to text-only.

### Flow B — Log a set by voice
1. Active workout open.
2. User activates microphone.
3. User says "225 for five."
4. Partial transcript appears.
5. Final transcript appears.
6. Deterministic command resolves.
7. Set logs.
8. Exact result and Undo appear.
9. Optional short spoken confirmation.

```text
+----------------+   +-------------------+   +--------------------+
| Active Workout | ->| Mic Activated     | ->| Voice input:       |
| Open           |   | (User speaks)     |   | "225 for five"     |
+----------------+   +-------------------+   +--------------------+
                                                        |
+----------------+   +-------------------+   +--------------------+
| Result/Undo    | <-| Set Logged        | <-| Tool executes      |
| Displayed      |   |                   |   | deterministic cmd  |
+----------------+   +-------------------+   +--------------------+
```

### Flow C — Ask an analytical follow-up
1. User asks a comparison question.
2. Jarvis shows data retrieval status.
3. Answer streams.
4. Supporting values appear.
5. Follow-up actions appear.
6. User switches date range.

### Flow D — Interrupt Jarvis
1. Jarvis is speaking.
2. User taps Stop or says "Stop."
3. Speech halts.
4. Old generation cancels.
5. User submits revised question.
6. New answer begins.

### Flow E — Confirmation-required change
1. User requests material change.
2. Jarvis creates preview.
3. User reviews exact before and after.
4. User confirms.
5. Service executes.
6. Result and Undo appear.

### Flow F — Missing model
1. User opens Jarvis.
2. Status explains missing capability.
3. User may download, use deterministic mode, or use text-only fallback.

### Flow G — Memory proposal
1. Jarvis identifies a possible durable preference.
2. Exact proposal appears.
3. User edits, saves, or rejects.
4. Saved memory becomes inspectable.

### Flow H — Bluetooth disconnect
1. Voice session active.
2. Route disconnects.
3. Speech stops or reroutes safely.
4. User sees concise route status.
5. Conversation remains available by text.

## 59. Acceptance criteria by experience area

Define testable acceptance criteria:
- When the user taps Stop while Jarvis is speaking, audible output stops and no additional response text is presented as completed.
- When an action is confirmed, exact result and Undo are shown.

## 60. Experience telemetry boundaries

Useful local or privacy-safe measurements: Jarvis opened, mode selected, voice vs text, Stop used, clarification required, Undo used, degraded mode entered.
Do not include: full transcript, health data, model prompt, exact workout content.

## 61. UX review checklist

Is the Stop control visible? Does the state match microphone state? Is the action result exact? Is Undo available? Does the experience work without speech? Does the experience work offline? Are errors recoverable? Are confirmations tied to exact actions? Does iPhone 15 receive the complete core experience?

## 62. Initial release experience

Required: global or context-aware Jarvis entry, conversation surface, text input, push-to-talk, Workout/Coach Mode, Stop, interruption, deterministic workout commands, read-only analytics, exact action results, confirmation previews, Undo, text-only fallback, system TTS fallback, accessible controls.

Deferred: always-listening wake word, unsolicited workout coaching, multiple pending confirmation stacks.

## 63. Rejected experience approaches

Reject: a separate disconnected chatbot page, voice-only interaction, hidden microphone activation, treating partial transcript as final, announcing action success before service confirmation, generic confirmations, missing Undo, exposing technical model terminology.

## 64. Repository integration map

| Current surface or pattern | Existing implementation | Jarvis UX implication | Constraint | Confidence |
| --- | --- | --- | --- | --- |
| Conversation Panel | `JarvisPanel` | Main UI for Jarvis interactions | Must not trap user | High |
| Bottom Sheet | `BottomSheet` | Renders the Jarvis interface over FitCore | Must dismiss easily | High |
| Confirmations | `ConfirmDialog` | Manages material actions | Requires exact previews | High |
| Active Workout | `active-workout.tsx` | Context provider for logging sets | Fast rendering needed | High |

## 65. Open product and UX questions

Unresolved questions: final Jarvis entry-point placement, transcript-retention default, default speech-output state, confirmation visual pattern after premium UI merges.

## 66. Final recommendation summary

Core experience vision remains grounded in local, verifiable, user-controlled interactions. The `JarvisPanel` component inside a `BottomSheet` is a clear entry point, enabling seamless transition between Workout and Coach modes. Voice and text hold equal weight, ensuring users are never forced to speak in busy environments. Stop and Undo behaviors must be robust, with Offline and degraded modes supporting gracefulness when models are missing. Final integration relies on transparent UX over conversational depth, prioritizing exact actions and offline reliability on the baseline iPhone 15 device.
