# FitCore Jarvis Deterministic Command Language

## 2. Document status

* This is a proposed command-language and parser specification.
* No parser is implemented by this PR.
* Examples are normative only where explicitly marked.
* Exact service bindings must be confirmed after the active UI work is merged.
* Commands that cannot be safely resolved must not execute.
* The deterministic parser precedes language-model routing.

## 3. Purpose

FitCore requires a deterministic command path to ensure high-frequency, low-ambiguity actions execute instantly and reliably. Relying solely on a generative language model for basic interactions introduces unnecessary latency, hallucinatory risk, and numeric instability.

The deterministic path is intended to provide:
* Fast workout logging.
* Reliable numbers.
* Offline support.
* Reduced latency.
* Reduced model errors.
* Easier validation.
* Safe, repeatable actions.
* Consistent behavior across supported phones (iPhone 15 minimum target).

Deterministic commands do not replace conversational Jarvis; they handle actions for which a constrained parser is safer and faster.

## 4. Scope

**Initial command domains:**
* Set logging.
* Set repetition.
* Recent-set editing.
* Timer control.
* Active-workout navigation.
* Exercise completion.
* Workout completion proposals.
* Undo and correction.
* Response-mode controls.
* Speech controls where appropriate.

**Out-of-scope command domains for the first deterministic implementation:**
* Unrestricted nutrition interpretation.
* Free-form meal analysis.
* Complex program design.
* Medical advice.
* Open-ended analytics explanation.
* Arbitrary exercise substitution.
* Arbitrary date-range analysis.
* Destructive bulk deletion.
* Unrestricted navigation.
* Arbitrary device control.

## 5. Parser design principles

1. **Safety before convenience:** Do not perform writes unless perfectly understood.
2. **No execution without sufficient context:** An ambiguous action must wait for clarification.
3. **Explicit numeric interpretation:** Spoken numbers must be converted mathematically without guess-work.
4. **Explicit units after normalization:** All extracted numbers must be paired with resolved units.
5. **Canonical identifiers before execution:** Target entities (workouts, exercises) must be resolved to exact IDs.
6. **Deterministic precedence:** Strict evaluation order prevents command overlap.
7. **No silent guessing for materially ambiguous commands:** Ask the user if two actions are equally plausible.
8. **No duplicate writes:** Actions must be idempotent against retries.
9. **No stale-turn execution:** Do not execute a command after a topic shift or long delay.
10. **Every reversible action should support Undo.**
11. **Destructive or high-impact actions require confirmation.**
12. **Original transcript and normalized interpretation remain distinguishable:** The user sees what they said, while the parser operates on a clean variant.
13. **The user can correct a mistaken interpretation immediately.**
14. **The parser must produce structured command candidates, not execute services directly:** An independent gateway routes the parsed intention.
15. **The parser must defer when confidence is insufficient:** Fallback to the generative agent model safely.

## 6. Processing pipeline

The conceptual pipeline operates sequentially:

```text
Raw transcript
    ↓
Text cleanup
    ↓
Spoken-number normalization
    ↓
Unit and duration normalization
    ↓
Phrase and alias normalization
    ↓
Command-family detection
    ↓
Argument extraction
    ↓
Current-context resolution
    ↓
Ambiguity and confidence evaluation
    ↓
Structured command candidate
    ↓
Tool gateway validation and execution
```

**For each stage:**
* **Inputs:** The output of the previous stage, plus active app context (e.g., active workout).
* **Outputs:** Augmented payload (e.g., normalized numbers, extracted tokens).
* **Prohibited behavior:** The normalization process must not mutate the original transcript shown to the user.
* **Failure behavior:** If a stage fatally fails (e.g., no active workout when required), parsing halts, and a failure or deferral candidate is returned.

## 7. Transcript representations

* **Original transcript:** The exact or near-exact speech-recognition output displayed to the user.
* **Normalized text:** Lowercased and standardized text used for parsing.
* **Parsed command candidate:** Structured action, arguments, references, confidence, and required context.
* **Confirmed tool request:** The validated request passed to the approved FitCore tool gateway.

**Conceptual example:**
```text
Original:
“Two twenty-five for five.”

Normalized:
“225 for 5”

Candidate:
action = log_set
weight = 225
weightUnit = lb
reps = 5

Validated request:
training.logSet(...)
```

## 8. Command-candidate envelope

The parser produces a standard structure, such as:

```json
{
  "matched": true,
  "commandFamily": "set.log",
  "action": "log_set",
  "arguments": {
    "weight": 225,
    "weightUnit": "lb",
    "reps": 5
  },
  "references": {
    "exercise": "current",
    "workout": "active"
  },
  "confidence": "high",
  "requiresClarification": false,
  "requiresConfirmation": false,
  "sourceTranscript": "Two twenty-five for five.",
  "normalizedTranscript": "225 lb 5 reps",
  "parserVersion": "1.0",
  "ambiguityReason": null
}
```

## 9. Confidence classes

* **High confidence:** Exact supported structure; required context exists; units are known; values pass validation; one safe interpretation.
* **Medium confidence:** Likely interpretation; minor ambiguity; may be resolved through current context; should not execute a material write without confirmation or clarification.
* **Low confidence:** Multiple plausible actions; unclear values; unclear units; missing context; speech-recognition uncertainty; unsupported phrasing.

**General policy:**
```text
High confidence + safe action
→ tool validation

Medium confidence
→ confirmation or clarification

Low confidence
→ no execution; ask the user
```

## 10. Command-family precedence

Deterministic precedence to prevent conflicting interpretations (evaluated in order):
1. Stop and cancel controls.
2. Correction and Undo.
3. Confirmation or rejection.
4. Timer commands.
5. Set logging and editing.
6. Exercise navigation.
7. Exercise or workout state commands.
8. App navigation.
9. Response or speech preferences.
10. No deterministic match → agent-model routing.

Cancellation and correction have the highest priority so that an interrupted user is always obeyed before a long-running data operation begins.

## 11. Spoken-number normalization

Required handling:
* Zero through thousands.
* Common weight expressions ("two twenty-five" → 225 only when context fits).
* Repetitions.
* Timer durations ("ninety seconds" → 90 seconds).
* Decimals ("seven point five" → 7.5).
* Fractions (only if supported safely, e.g., "half a pound").
* Negative numbers (where relevant).
* Ordinal references ("set three").
* Dates (only where needed).

**Risky interpretations:**
```text
“two fifteen”
```
This might mean: 215 pounds; two sets of fifteen; or 2:15 duration. This requires context and grammar to disambiguate.

## 12. Weight and unit normalization

Behavior definitions:
* pounds, lbs, lb
* kilos, kilograms, kg
* bodyweight, assisted bodyweight
* plate-based phrases (only if explicitly supported)
* machine-stack values
* dumbbell-per-hand values (only if explicitly supported by data model)

**Requirements:**
* Explicit normalized unit must be set.
* Use current user preference only when the phrase omits units and context is clear.
* Require clarification when the unit cannot be determined safely.
* Canonical internal conversion must only happen in FitCore services; the parser should not silently convert and store values itself.

**Examples:**
```text
“225 pounds for five”
→ 225 lb × 5

“100 kilos for three”
→ 100 kg × 3

“bodyweight for ten”
→ bodyweight set only if current exercise permits it

“fifty each hand”
→ defer unless the active exercise and data model explicitly support per-hand values
```

## 13. Repetition normalization

Handling includes:
* “for five”
* “five reps”
* “did five”
* “same weight for six”
* zero reps
* failed repetitions

The parser must reject or request clarification for implausible repetition values (e.g., "for five hundred reps").

## 14. Effort and set-metadata normalization

FitCore's current data model (`SetEntry` in `src/lib/types.ts`) tracks modifiers, but explicit RPE/RIR fields are currently absent.
Supported modifiers: `normal`, `warmup`, `drop`, `failure`, `partials`, `unilateral`, `paused`, `tempo`.

**Examples (Supported):**
```text
“mark that as a warm-up set”
“add a set to failure”
“log partials”
```

**Examples (Deferred until supported by data schema):**
* “225 for five at RPE nine” (Deferred)
* “same weight, two reps in reserve” (Deferred)
* “pain scale 5” (Deferred)

If the runtime does not currently support these fields, they are marked as deferred rather than inventing storage behavior.

## 15. Duration normalization

Timer parsing:
* seconds, minutes, minutes and seconds
* restart, add time, subtract time, pause, resume, stop

**Examples:**
```text
“Start ninety seconds”
→ 90 seconds

“Start a minute and a half”
→ 90 seconds

“Add thirty seconds”
→ timer adjustment only when a timer exists

“Restart the timer”
→ repeat previous configured duration when known
```
Maximum and minimum validation is service-owned.

## 16. Context resolution

Context resolution determines:
* active workout
* current exercise
* current set position
* previous set
* last Jarvis action
* active timer
* next/previous exercise
* selected screen

**Requirements:**
* Explicit failure when active context is missing.
* No guessing across multiple active candidates.
* State version or timestamp checks before execution.
* Context refresh if the transcript was delayed.
* No use of stale selected-chart context for workout commands.

**Examples:**
```text
“Same weight for six”
```
Requires: active workout, current exercise, previous eligible set, known unit.

```text
“Undo that”
```
Requires: one recent reversible action, action still eligible for Undo, no unresolved competing candidate.

## 17. Set-logging command grammar

Supported conceptual patterns:
```text
<weight> for <reps>
<weight> pounds for <reps>
<weight> kilos for <reps>
same weight for <reps>
repeat that set
repeat the last set
add <amount> and do <reps>
drop <amount> for <reps>
bodyweight for <reps>
```

For each pattern, the parser must extract fields, evaluate ambiguity risks, and verify if immediate execution is permitted, returning an expected tool candidate.

## 18. Recent-set editing commands

Commands such as:
```text
“Change that to six reps.”
“Make the last set 230.”
“Actually, that was 225.”
“Mark the last set as a warm-up.”
```

**Requirements:**
* Recent eligible set in context.
* Precise target identified.
* One unambiguous edit.
* Undo or version history maintained.
* No modification of older history without explicit date or set selection.
* Confirmation when the intended set is unclear.

## 19. Timer command grammar

Commands such as:
```text
“Start a ninety-second timer.” (Deterministic action)
“Start two minutes.” (Deterministic action)
“Pause the timer.” (Direct control)
“Resume.” (Direct control)
“Stop the timer.” (Direct control)
“Add thirty seconds.” (Deterministic action, requires active timer)
“Restart it.” (Deterministic action)
“How much time is left?” (Deterministic read)
```

## 20. Exercise navigation commands

Commands such as:
```text
“Next exercise.”
“Go back one exercise.”
“Open bench press.”
“Show the next set.”
“Skip this exercise.”
```

**Requirements:**
* Allowlisted workout navigation only.
* No arbitrary route execution.
* Confirmation if “skip” changes workout completion state.
* Distinction between navigation and data mutation.
* Handling for supersets or grouped exercises if they exist.

## 21. Exercise and workout state commands

Commands such as:
```text
“Mark this exercise complete.”
“Reopen this exercise.”
“Finish the workout.”
“Cancel the workout.”
“Save and exit.”
```

**Requirements:**
* Immediate execution only for safe reversible state changes.
* Confirmation for finishing or canceling when data could be lost.
* No destructive cancellation from ambiguous speech.
* State conflict checks and current workout identification.

## 22. Undo commands

Forms such as:
```text
“Undo.”
“Undo that.”
“Take that set back.”
“Remove the set I just logged.”
“Put it back.”
```

**Requirements:**
* Eligible recent-action window.
* Direct relation to Undo history.
* Clarification when “that” is ambiguous.
* One-time token use.
* Behavior after another conflicting change blocks execution.
* No arbitrary deletion disguised as Undo.

## 23. Correction commands

Immediate correction flow:

```text
User: “225 for five.”
Jarvis: “Logged 225 for five.”
User: “No, 235.”
Expected: Interpret as correction to the immediately logged set when context is clear.
```

Other forms: “No, I said six.”, “Actually, make that 230.”, “I meant kilograms.”, “That was the previous exercise.”

**Requirements:**
* Narrow correction window.
* Target action identification.
* Preview when correction materially changes meaning.
* No assumption after topic changes.
* Preservation of original action history where required for Undo.

## 24. Confirmation and rejection language

Deterministic interpretation of:
```text
“Yes.” / “Confirm.” / “Do it.” / “Apply that.”
“No.” / “Cancel.” / “Never mind.” / “Don’t change it.”
```

**Requirements:**
* Confirmation bound to one active preview.
* No generic confirmation when multiple actions are pending.
* No confirmation after expiration or context change.
* Interrupted confirmations canceled.
* “Yes” never treated as permission for an unrelated future action.

## 25. Stop and cancellation commands

Highest-priority commands:
```text
“Stop.”
“Stop talking.”
“Cancel.”
“Never mind.”
“Be quiet.”
“Cancel that request.”
```

**Distinguish:** stop speech only; cancel model generation; cancel pending tool call; reject confirmation; stop active timer.
Require clarification only when necessary; immediate speech interruption should not wait for the language model.

## 26. Response-mode and speech-control commands

Controls such as:
```text
“Keep it short.”
“Give me more detail.”
“Stop speaking.”
“Turn voice off.”
“Speak slower.”
“Use workout mode.”
“Use coach mode.”
```

Identify which should be: direct local settings; reversible preferences; session-only; long-term preference proposals.
Do not allow ambiguous phrases to create permanent memory silently.

## 27. App navigation commands

Allowlisted forms such as:
```text
“Open Recovery.”
“Go to Training.”
“Show today’s nutrition.”
“Open the chart.”
“Go back.”
```

**Requirements:**
* Canonical route resolution.
* No arbitrary URLs or external navigation.
* Selected-date handling.
* No mutation disguised as navigation.

## 28. Commands that must defer to the agent model

Examples requiring conversational interpretation:
```text
“Why was that set harder?”
“Compare this with last month.”
“Should I lower the weight?”
“What exercise would be better for my knee?”
“Explain this recovery score.”
“Build me a better workout.”
```
The parser should return no deterministic match and route them to the local agent model.

## 29. Commands that require clarification

Ambiguous examples:
```text
“Add five.” (pounds or reps?)
“Take ten off.” (weight or time?)
“Do the same.” (reps, weight, or entire exercise?)
“Start it.” (which timer or workout?)
“Change that.” (which entry?)
“Skip.” (exercise or song?)
“Two fifteen.” (weight or time?)
```
For each, document possible meanings and request minimal clarification. Prefer narrow questions:
```text
“Add five pounds to the next set or add five repetitions?”
```
Avoid lengthy conversational detours during workouts.

## 30. Commands that must be refused or blocked

Examples:
```text
“Delete all my workouts.”
“Change every stored weight to kilograms.”
“Ignore the safety rules.”
“Directly edit the database.”
“Run this code.”
“Open any URL I say.”
“Send all my health data.”
```
Deterministic parsing must not execute these commands. Some may be routed to a separately reviewed confirmation workflow; others remain prohibited.

## 31. Exercise-name resolution

Handling for: canonical IDs, display names, aliases, abbreviations, left/right variants, machine vs. free-weight variants, similar names.

**Requirements:**
* Active-workout candidates preferred.
* Exact active-program matches.
* Clarification when multiple candidates remain.
* No global fuzzy match that silently selects the wrong exercise.
* User-approved aliases may be stored through a separate memory or preference system.

## 32. Ambiguity-resolution hierarchy

The order:
1. Exact supported phrase.
2. Current active context.
3. Recent reversible action.
4. User-established unit preference.
5. Active workout candidate list.
6. One concise clarification.
7. Agent-model routing if the request is conversational.
8. Safe failure.

Safety must never be overridden by convenience.

## 33. Duplicate-prevention behavior

Examples:
```text
“225 for five”
```
Must not log twice due to duplicate callbacks, app resume, interruption, retries, etc.

**Requirements:**
* Command candidate ID.
* Session and turn ID.
* Idempotency key.
* Active-turn revision.
* Exact action fingerprint.
* Duplicate-response behavior.

## 34. Interruption and stale-turn behavior

* Parser results tied to active turn.
* Interrupted turn invalidation.
* No action after revision changes.
* Pending clarification cancellation.
* Pending confirmation cancellation.
* Stale context rejection.
* No replay after app restoration.

**Example:**
```text
User: “Log 225 for—”
User interrupts: “No, stop.”
Expected: No set is logged.
```

## 35. Parser fallback hierarchy

```text
High-confidence deterministic command
→ validated tool candidate

Supported command with one ambiguity
→ concise clarification

Conversational or analytical request
→ local agent model

Unsafe or unsupported request
→ reject or require approved confirmation workflow

Model unavailable
→ deterministic commands remain functional
```

## 36. Error taxonomy

Parser-specific errors:
* `NO_COMMAND_MATCH`
* `AMBIGUOUS_COMMAND`
* `MISSING_ACTIVE_WORKOUT`
* `MISSING_CURRENT_EXERCISE`
* `MISSING_PREVIOUS_SET`
* `UNKNOWN_EXERCISE`
* `UNKNOWN_UNIT`
* `INVALID_NUMBER`
* `INVALID_DURATION`
* `UNSUPPORTED_SET_TYPE`
* `LOW_TRANSCRIPT_CONFIDENCE`
* `STALE_CONTEXT`
* `STALE_TURN`
* `DUPLICATE_COMMAND`
* `CONFIRMATION_REQUIRED`
* `UNDO_UNAVAILABLE`
* `COMMAND_NOT_ALLOWED`

For each category: define its meaning, if clarification is possible, model routing appropriateness, and user-facing response style.

## 37. User-facing confirmation language

**Successful actions:**
```text
“Logged 225 for five.”
“Updated the last set to six reps.”
“Timer started for ninety seconds.”
“Last set removed. Undo is available.”
“Opening Recovery.”
```

**Clarification templates:**
```text
“Did you mean 215 pounds or two sets of fifteen?”
“Add five pounds or five reps?”
“Which exercise should I open?”
```

**Safe failure templates:**
```text
“I don’t have an active workout to apply that to.”
“I couldn’t determine the weight unit.”
“That action needs confirmation.”
```

*(Templates are examples, not final UI copy.)*

## 38. Grammar versioning

* Parser version.
* Command-family version.
* Backward compatibility.
* Migration.
* Telemetry comparison.
* Deprecation.
* User alias versioning.

Command changes must be tested and reviewed because previously accepted phrases may create writes.

## 39. Localization considerations

The first implementation may be English-only.
Future considerations: locale-specific numbers, decimal separators, kilograms versus pounds, translated exercise names, time expressions, speech-recognition locale, command aliases. Multilingual support is not required in the first implementation unless product requirements dictate otherwise.

## 40. Privacy and diagnostics

**Permitted diagnostics:**
command family, match outcome, confidence category, error code, latency, duplicate detection, execution result category.

**Do not log by default:**
raw audio, full sensitive transcripts, health details, full tool payloads, permanent user identifiers.
Any retained transcript sample for debugging must require explicit opt-in and redaction.

## 41. Initial command subset

Conservative first-release subset recommendation:

**Phase 1 core:**
```text
<weight> for <reps>
same weight for <reps>
repeat the last set
change the last set to <...>
undo that
```

**Phase 1 timer controls:**
```text
start <duration>
pause timer
resume timer
stop timer
time remaining
```

**Phase 1 workout navigation:**
```text
next exercise
previous exercise
open <active-workout exercise>
```

**Phase 1 session controls:**
```text
stop speaking
cancel
keep it short
```

**Phase 2 / Deferred / Prohibited:**
Deferred: Unrestricted nutrition, RPE/RIR tracking (until schema supports it), complex substitutions.
Prohibited: Destructive bulk actions, raw data editing.

## 42. Repository service mapping

| Command family | Proposed tool/service | Existing implementation candidate | Confidence | Gap |
| --- | --- | --- | --- | --- |
| Set logging | `training.logSet` | `FitCoreData` / `useStore` set push | Medium | Needs API facade |
| Set editing | `training.editSet` | `FitCoreData` updates | Medium | Needs API facade |
| Timer start | `timer.start` | Local timer state | Low | UI vs Store timer missing |
| Timer stop | `timer.stop` | Local timer state | Low | UI vs Store timer missing |
| Exercise navigation | `workout.navigate` | Route / AppState selection | Medium | Route abstraction |
| Exercise completion | `workout.completeExercise` | `workout.exercises.completed` field | High | Direct store |
| Workout completion | `workout.finish` | `workout.endedAt` population | High | Direct store |
| Undo | `jarvis.undo` | `jarvisAudit` / `storeTransaction` | Low | Transaction infra |

*(Mapping represents speculative connections based on current types and data objects)*

## 43. Test matrix

Future parser tests must include:
* **Exact commands:** standard weights and reps, pounds, kilograms, timers, Undo, navigation.
* **Natural variants:** word order, filler words, contractions, plural forms, number words, abbreviations.
* **Ambiguity:** “add five”, “two fifteen”, “do the same”, “start it.”
* **Missing context:** no active workout, no current exercise, no previous set, no active timer.
* **Corrections:** weight correction, rep correction, unit correction, wrong exercise correction.
* **Duplicates and stale turns:** duplicate transcript callback, repeated bridge delivery, app suspension, interruption, delayed execution.
* **Invalid input:** negative weight, impossible reps, unsupported units, malformed duration, unknown exercise.
* **Safety:** destructive request, direct-storage request, arbitrary code request, expired confirmation.

## 44. Evaluation corpus requirements

A future anonymized command corpus should contain:
clean speech, gym noise, music, Bluetooth microphone, different speaking speeds, short pauses, corrections, accents, number-heavy phrases, ambiguous phrases, false wake-ups, partial commands, interruptions.
Requires expected outputs and acceptable alternatives.

## 45. Acceptance gates

Before deterministic write commands are enabled:
* Command-family tests pass.
* Numeric interpretation reaches approved accuracy.
* Ambiguous commands do not silently execute.
* Unit handling is reliable.
* Missing context blocks execution.
* Duplicate callbacks do not duplicate writes.
* Interruption prevents stale execution.
* Corrections target only eligible recent actions.
* Undo works for supported writes.
* Service validation remains authoritative.
* Parser never directly touches storage.
* Command matching remains functional offline.
* Text input and voice transcripts produce equivalent candidates.

## 46. Rejected approaches

* Routing every command through the LLM.
* Regex-only parsing without structured stages.
* Silently assuming pounds for all users.
* Interpreting all two-number phrases as weight and reps.
* Fuzzy global exercise selection without clarification.
* Executing medium-confidence writes.
* Unrestricted historical editing through pronouns.
* Generic “yes” confirming any pending action.
* Retrying writes without idempotency.
* Storing normalized transcript as if it were the original transcript.

## 47. Open questions

* Exact unit preference source.
* Final supported set metadata (RPE, RIR missing in schema).
* Exact active-workout service names.
* Whether bodyweight and assisted sets share one representation.
* Whether supersets require special navigation grammar.
* Exact correction window.
* Exact Undo retention window.
* Final speech-confidence signals.
* Whether exercise aliases are user-configurable.
* Final maximum numeric ranges.

## 48. Final recommendation summary

* **Deterministic parser's role:** Provide instant, safe, offline-capable action execution for highly unambiguous commands.
* **Initial command families:** Set logging, timers, workout navigation, session controls.
* **Processing stages:** Enforce a strict pipeline from transcript to structured candidate.
* **Confidence behavior:** High confidence executes safely; medium clarifies; low routes to agent.
* **Context-resolution policy:** All ambiguous commands must resolve cleanly against active context or fail safely.
* **Correction policy:** Immediate narrow corrections to the last logged item.
* **Ambiguity policy:** Never execute a destructive/write operation based on guesses.
* **Duplicate protection:** Strong idempotency keys to drop retries.
* **Model fallback:** Route complex queries, nutrition, or analysis to the LLM.
* **First implementation subset:** Focus heavily on set tracking, navigation, and timers.
* **Largest unresolved risk:** Lacking dedicated service wrappers (the "tool gateway") around FitCore state mutations.

---

# Diagrams

### 1. Transcript-to-command pipeline
```text
+-------------------+       +-----------------------+       +-------------------+
| Original Text     | ----> | Number/Unit/Alias     | ----> | Argument Extract  |
+-------------------+       | Normalization         |       +-------------------+
                                                           |
                                                           v
+-------------------+       +-----------------------+       +-------------------+
| Tool Execution    | <---- | Ambiguity/Confidence  | <---- | Context Resolve   |
| Gateway           |       | Evaluator             |       | (Workout State)   |
+-------------------+       +-----------------------+       +-------------------+
```

### 2. Confidence and ambiguity-routing flow
```text
[ Command Candidate ]
         |
         +--> (High Confidence) ----> [ Validate & Execute Write ]
         |
         +--> (Medium Confidence) --> [ Request Clarification ]
         |
         +--> (Low Confidence) -----> [ Route to Agent LLM ]
```

### 3. Set-logging resolution flow
```text
"225 for five"
      |
      v
[ Active Workout Context? ] --No--> [ Reject ]
      | Yes
      v
[ Current Exercise Found? ] --No--> [ Reject ]
      | Yes
      v
[ Emit: training.logSet(current_exercise, 225, lb, 5) ]
```

### 4. Correction and Undo flow
```text
"Make that 230"
      |
      v
[ Locate Last Action Token ]
      |
      v
[ Is Action Reversible/Editable? ] --No--> [ Clarify ]
      | Yes
      v
[ Revert Last Action / Apply Patch ]
```

### 5. Duplicate and stale-turn rejection flow
```text
[ Incoming Request ] --> [ Check Idempotency Key ] --Match--> [ Drop/Return Cache ]
      | (New Key)
      v
[ Check Context Revision ] --Stale--> [ Reject ]
      | (Valid)
      v
[ Proceed to Parse ]
```

### 6. Deterministic-versus-agent-model routing flow
```text
[ Raw Transcript ]
      |
      v
[ Deterministic Parser Match? ]
      |
    Yes --No--> [ Route to Agent Model ]
      |
[ Safe to Execute? ]
      |
    Yes --No--> [ Ask for Confirmation / Clarify ]
      |
[ Tool Gateway ]
```
