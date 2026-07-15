# FitCore Jarvis Context, Conversation, and Memory Architecture

## 2. Document status

- this is a proposed architecture and behavior specification;
- no memory or conversation runtime is implemented by this PR;
- exact persistence choices remain subject to repository and feasibility review;
- the minimum device target is a regular iPhone 15;
- the system must remain useful without cloud memory services;
- the model may consume approved context but must not directly access persistence.

## 3. Purpose

Jarvis requires multiple distinct state layers to provide a cohesive experience without:

- sending the full database to the model;
- losing the current topic;
- confusing recent and permanent facts;
- retaining unnecessary sensitive information;
- allowing speculative model output to become authoritative memory.

## 4. Design principles

1. FitCore data remains authoritative.
2. Conversation state is not the same as permanent memory.
3. Relevant context should be minimal and current.
4. Recent state should be preferred over broad historical retrieval.
5. Casual statements are not automatically permanent facts.
6. Model speculation is never stored as fact without validation.
7. Long-term memory must include source and timestamps.
8. Sensitive memory should require explicit approval.
9. Users must be able to inspect, edit, forget, and delete memory.
10. Stale turns cannot update completed conversation state.
11. Interrupted responses cannot silently promote memories.
12. Memory retrieval is performed by an approved service, not raw model access.
13. Structured FitCore data should be queried through canonical services.
14. Context must be bounded for mobile performance.
15. Missing context must be acknowledged rather than invented.
16. Optional cloud providers must use the same context and privacy boundaries.
17. Memory behavior must remain deterministic enough to test.

## 5. State and memory taxonomy

### A. Active turn state

Contains only information for the current request:

- original transcript or text;
- normalized text;
- turn identifier;
- revision;
- cancellation token;
- selected provider;
- current tool request;
- pending tool result;
- response stream;
- speech state;
- interruption state;
- pending confirmation.

Retention:

- temporary;
- removed or finalized after the turn;
- not automatically promoted to permanent storage.

### B. Active session state

Contains information for the current Jarvis session:

- session identifier;
- current mode;
- current topic;
- recent references;
- recent actions;
- current route;
- active workout context;
- current selected chart;
- recent conversation turns;
- current rolling summary;
- pending confirmation;
- current Undo target.

Retention:

- session-scoped;
- may survive temporary app suspension;
- must not execute pending stale actions after restoration.

### C. Recent conversation history

Contains a bounded number of recent turns needed for natural follow-ups.

Examples:

- recent user messages;
- recent assistant responses;
- relevant tool summaries;
- clarification state;
- current subject.

Retention:

- bounded by count, tokens, or relevance;
- older turns become summary candidates.

### D. Rolling conversation summary

Contains a compact representation of older relevant conversation.

Example:

```text
The user is comparing current bench performance with prior push workouts.
They asked Jarvis not to focus on sleep as the main explanation.
The current analysis focuses on strength trend across four sessions.
```

Requirements:

- preserve user corrections;
- preserve unresolved questions;
- preserve current objective;
- exclude irrelevant phrasing;
- distinguish verified FitCore results from hypotheses;
- avoid converting speculation into facts.

### E. Structured long-term memory

Contains durable, reviewable information such as:

- explicit goals;
- approved preferences;
- response-style preferences;
- exercise preferences;
- user-entered restrictions;
- approved recurring schedule information;
- corrections the user wants remembered;
- approved stable aliases;
- explicitly saved insights.

### F. Saved analytical insights

Contains an approved observation derived from FitCore data.

Examples:

- a repeated training pattern;
- a preferred exercise substitution;
- a user-approved coaching observation.

Require:

- supporting data reference;
- generated timestamp;
- confidence;
- review or expiration date;
- distinction between observation and proven cause.

### G. Operational history

Contains limited operational records such as:

- recent tool execution;
- Undo eligibility;
- confirmation history;
- duplicate-prevention identifiers;
- errors.

Operational history is not the same as conversational memory.

## 6. Data ownership

| Information         | Authoritative owner | Jarvis may read | Jarvis may write | Retention         |
| ------------------- | ------------------- | --------------- | ---------------- | ----------------- |
| workouts            | FitCore services    | Yes             | No               | Permanent         |
| sets                | FitCore services    | Yes             | No               | Permanent         |
| timers              | FitCore services    | Yes             | No               | Temporary         |
| nutrition totals    | FitCore services    | Yes             | No               | Permanent         |
| recovery metrics    | FitCore services    | Yes             | No               | Permanent         |
| sleep               | FitCore services    | Yes             | No               | Permanent         |
| body metrics        | FitCore services    | Yes             | No               | Permanent         |
| goals               | FitCore services    | Yes             | No               | Permanent         |
| preferences         | FitCore services    | Yes             | No               | Permanent         |
| conversation turns  | Jarvis memory       | Yes             | Yes              | Bounded           |
| summaries           | Jarvis memory       | Yes             | Yes              | Bounded           |
| long-term memories  | Jarvis memory       | Yes             | Yes              | User-controlled   |
| analytical insights | Jarvis memory       | Yes             | Yes              | User-controlled   |
| tool history        | Jarvis memory       | Yes             | Yes              | Short-term        |
| raw audio           | None                | No              | No               | Not retained      |
| transcripts         | Jarvis memory       | Yes             | Yes              | User-configurable |

- FitCore services own domain data.
- Analytics services own calculated values.
- Jarvis memory owns only Jarvis-specific conversational and approved-memory records.
- The language model owns no authoritative persisted data.
- Raw audio is not retained by default.
- Transcripts must not silently replace canonical records.

## 7. Context-envelope purpose

The context envelope is the bounded, structured snapshot supplied to the conversation system for a single turn.

It should answer:

- where the user is;
- what the user is doing;
- what they are referring to;
- which FitCore data is relevant;
- which tools are available;
- which memories are relevant;
- what the recent conversation was about.

It is:

- generated per turn;
- timestamped;
- versioned;
- limited;
- filtered;
- not equivalent to the full database.

## 8. Proposed context-envelope sections

- `request`: The current user input. Required.
- `session`: Identifies the session. Required.
- `screen`: Identifies the current app view. Required.
- `selectedDate`: Identifies the viewed day. Required.
- `activeWorkout`: State of a current training session. Included if active.
- `currentExercise`: Focused exercise. Included if active.
- `currentSet`: Focused set. Included if active.
- `previousSet`: Context for the current exercise. Included if available.
- `activeTimer`: Running timer state. Included if active.
- `selectedVisualization`: Chart details if on screen. Included if present.
- `activeFilters`: Any applied view filters. Included if present.
- `goals`: Relevant user goals. Included if relevant to the request.
- `approvedPreferences`: Relevant preferences. Included if relevant.
- `approvedLimitations`: Relevant limits (e.g. injury). Included if relevant.
- `recentActions`: Very recent tool outcomes. Included.
- `pendingConfirmation`: Awaiting approval. Included if present.
- `recentConversation`: Bounded recent turns. Included.
- `conversationSummary`: Rolled-up prior context. Included if present.
- `retrievedMemories`: Search results for memory. Included if relevant.
- `retrievedFitCoreData`: Search results for domain data. Included if requested/relevant.
- `availableTools`: Allowed actions. Included based on mode.
- `capabilities`: System abilities. Included.

Purpose, source, freshness, and sensitivity apply to each section individually to minimize token usage.

## 9. Context-envelope metadata

Require metadata including:

- envelope version;
- generated timestamp;
- session ID;
- turn ID;
- turn revision;
- route version or navigation snapshot;
- active-workout version where available;
- selected-date timestamp;
- data freshness;
- source identifiers;
- omitted-section reasons;
- sensitivity classification where applicable.

## 10. Context minimization

Define rules for keeping prompts small enough for mobile use.

Include:

- include only relevant domains;
- prefer summaries to raw records;
- prefer canonical calculated results;
- limit historical date ranges;
- limit recent turns;
- omit large chart datasets when a summary is sufficient;
- retain exact values only when needed;
- compress tool results;
- exclude hidden UI state unrelated to the question;
- exclude secrets;
- exclude raw audio;
- exclude full internal logs;
- exclude unrelated memories;
- avoid duplicate information.

### Example: active workout command

Include:

- active workout;
- current exercise;
- previous set;
- unit preference;
- recent action.

Omit:

- full nutrition history;
- unrelated sleep history;
- all prior conversations.

### Example: monthly bench trend

Include:

- selected exercise;
- relevant date range;
- FitCore-calculated trend data;
- current goal;
- recent conversation topic.

Omit:

- all raw workout records when summarized results are sufficient.

## 11. Context refresh triggers

Define when context must be rebuilt:

- new turn;
- navigation change;
- selected-date change;
- active-workout mutation;
- exercise change;
- set logged or edited;
- timer change;
- chart selection change;
- filter change;
- goal update;
- memory correction;
- confirmation preview;
- app restoration;
- provider switch.

Require stale context to be rejected rather than silently used for writes.

## 12. Context freshness and conflict handling

Define:

- timestamps;
- state versions;
- expected version checks;
- stale-context errors;
- re-fetch behavior;
- conflict clarification.

Example:

```text
Jarvis prepares “log 225 for five” for Exercise A.
The user manually navigates to Exercise B before execution.

Expected:
The stale command must not execute against Exercise B.
```

Require:

- writes bind to exact entity IDs;
- context names alone are insufficient;
- delayed model calls cannot reinterpret the new screen silently;
- context refresh may require user confirmation.

## 13. Relevant FitCore data retrieval

Historical FitCore records should be accessed through bounded retrieval requests.

Examples:

- last matching workout;
- prior four bench sessions;
- current day nutrition totals;
- seven-day recovery trend;
- selected chart range.

Require retrieval results to include:

- source domain;
- record IDs where appropriate;
- date range;
- calculation method identifier where available;
- data completeness;
- missing-data indicators;
- timestamps.

Do not allow the model to query an arbitrary database language.

## 14. Recent-turn retention

Provisional strategy for recent conversation.

Address:

- retaining the latest meaningful turns;
- excluding low-value system chatter;
- retaining unresolved clarification;
- retaining tool results in summarized form;
- retaining exact wording only where references depend on it;
- removing canceled or invalidated turn content;
- handling voice and text equivalently.

Recommend an initial bounded range for testing, such as a small number of recent turns, but label it provisional. Token size matters more than a fixed message count.

## 15. Reference resolution

Define how Jarvis should resolve references such as:

```text
“that set”
“the one before that”
“last week”
“the first chart”
“do the same for squats”
“undo that”
“compare it again”
```

Use a resolution hierarchy:

1. Pending confirmation object.
2. Most recent eligible Jarvis action.
3. Current screen selection.
4. Active workout object.
5. Current conversation topic.
6. Recent conversation references.
7. One concise clarification.
8. Safe failure.

Require:

- exact entity binding;
- no broad historical guessing;
- ambiguity surfaced clearly;
- reference invalidation after material context changes.

## 16. Topic tracking

Session topic state such as:

- active domain;
- primary entity;
- comparison entity;
- active date range;
- current analytical question;
- unresolved follow-up;
- excluded factors specified by the user.

Example:

```text
Domain: Training
Primary entity: Barbell bench press
Date range: Last four matching sessions
Question: Strength trend
User constraint: Do not focus on sleep
```

Require topic updates when:

- the user explicitly switches topic;
- the selected screen changes materially;
- the previous topic is completed;
- the user returns to a prior topic.

Do not treat topic state as permanent memory.

## 17. Conversation turn lifecycle

Memory-related state changes across:

```text
Created
Listening or Entering Text
Interpreting
Awaiting Tool
Awaiting Confirmation
Generating
Speaking
Interrupted
Canceled
Completed
Failed
```

Require:

- only completed turns can normally enter conversation history as completed;
- interrupted partial user input may be retained only where needed;
- canceled assistant output must not be summarized as a completed answer;
- stale callbacks cannot modify the rolling summary;
- tool execution success may be retained operationally even if speech is interrupted;
- failed turns record concise recoverable state, not speculative content.

## 18. Interruption behavior

Define what happens when the user interrupts Jarvis.

Require:

- active response generation canceled;
- speech queue canceled;
- stale tokens discarded;
- old assistant response not marked completed;
- pending unexecuted tools canceled;
- completed tools reconciled;
- current topic retained where useful;
- new request becomes the active turn;
- rolling summary not updated using abandoned model output.

Example:

```text
Jarvis:
“Your recovery was lower because—”

User:
“Stop. Only compare training volume.”

Expected:
The abandoned recovery explanation must not be stored as a concluded insight.
```

## 19. Rolling-summary generation

Define:

- when a summary is created;
- when it is refreshed;
- what information it must preserve;
- what information it must discard;
- maximum size;
- validation.

Summary inputs may include:

- completed conversation turns;
- verified tool results;
- explicit user corrections;
- current objectives.

Summary inputs must exclude:

- private model reasoning;
- canceled output;
- malformed tool requests;
- speculative unsupported claims;
- raw audio.

Require structured summary sections such as:

- active objective;
- verified findings;
- user preferences for this session;
- unresolved questions;
- important references;
- explicitly excluded assumptions.

## 20. Summary reliability

Define safeguards:

- verified FitCore results labeled as verified;
- model interpretation labeled as interpretation;
- user statements labeled as user-provided;
- no unsupported causal claims;
- corrections override older contradictory summary content;
- summary regeneration must not silently remove unresolved issues;
- summary corruption should fall back to recent turns.

Recommend periodic deterministic checks where possible.

## 21. Long-term-memory eligibility

Define what may be eligible for long-term memory.

### Eligible with explicit user request

Examples:

```text
“Remember that I prefer short workout answers.”

“Remember that I use kilograms.”

“Remember that I avoid deep knee flexion.”
```

### Potentially eligible after preview and approval

Examples:

- repeated exercise preference;
- stable training-day preference;
- recurring response-style preference;
- approved alias;
- approved long-term goal.

### Not automatically eligible

- casual comments;
- temporary soreness;
- one-day mood;
- speculative model observations;
- unverified injuries;
- sensitive diagnoses;
- one-time workout performance;
- transient screen context;
- raw transcripts.

## 22. Memory sensitivity classes

Define classes such as:

### Low sensitivity

- response length;
- speech enabled;
- preferred units;
- interface preferences.

### Moderate sensitivity

- exercise preferences;
- training schedule;
- nutrition preference;
- goal information.

### High sensitivity

- injury limitations;
- health-related details;
- sleep or recovery concerns;
- potentially medical information.

Define approval and display requirements by sensitivity.

Require high-sensitivity memory to:

- be explicitly user-provided;
- be previewed before permanent storage;
- be clearly editable and deletable;
- not be sent externally by default.

## 23. Memory-record structure

Conceptual memory record containing:

```text
memoryId
memoryType
canonicalValue
displaySummary
sourceType
sourceReference
createdAt
updatedAt
userApproved
confidence
sensitivity
status
expiresAt
reviewAt
supersedes
contradicts
```

Require:

- stable ID;
- source;
- timestamp;
- approval state;
- sensitivity;
- lifecycle status;
- expiration or review where appropriate.

## 24. Memory source types

Define source categories:

- explicit user instruction;
- user-approved proposal;
- imported FitCore preference;
- verified FitCore goal;
- user correction;
- approved analytical insight.

Reject as permanent sources:

- hidden model reasoning;
- unverified inference;
- canceled assistant response;
- external content without approval;
- transcript ambiguity;
- diagnostic logs.

## 25. Memory proposal flow

Define:

```text
Potential durable information identified
    ↓
Jarvis creates a memory proposal
    ↓
FitCore displays exact proposed memory
    ↓
User approves, edits, or rejects
    ↓
Approved memory stored
```

Require proposal preview to show:

- exact memory;
- category;
- source;
- sensitivity;
- expiration or review behavior;
- how it will affect future responses.

The model must not silently store the proposal.

## 26. Explicit “remember this” flow

Define behavior when the user directly requests memory.

Example:

```text
“Remember that I want brief answers during workouts.”
```

Expected:

1. Parse the requested preference.
2. Produce an exact preview.
3. Confirm if the meaning is materially ambiguous or sensitive.
4. Save through an approved memory service.
5. Return confirmation.
6. Allow Undo or deletion.

Simple low-sensitivity preferences may use streamlined confirmation if approved by future product design, but the stored value must still be visible.

## 27. Memory correction and contradiction

Define behavior for:

```text
“Actually, I use pounds, not kilograms.”

“My knee restriction is no longer current.”

“Forget that I avoid squats.”
```

Require:

- old memory identified;
- conflict preview;
- update or supersede rather than silently duplicate;
- preservation of limited history only where operationally necessary;
- current active value clearly marked;
- retrieval excludes superseded memories;
- sensitive corrections reflected immediately.

## 28. Memory expiration and review

Define expiration categories:

### Session-only

Expires when the session ends.

### Short-lived

Examples:

- temporary soreness;
- short-term training modification;
- current travel schedule.

Requires expiration date.

### Long-lived but reviewable

Examples:

- exercise preferences;
- training schedule;
- goals.

May require periodic review.

### Persistent until deleted

Examples:

- preferred response style;
- preferred units.

Require:

- expired memories excluded from normal retrieval;
- users may reactivate or update them;
- expiration does not delete canonical FitCore data;
- review reminders remain optional.

## 29. Memory retrieval

Define retrieval priorities:

1. Exact active entity memories.
2. Explicit user preferences relevant to current mode.
3. Approved limitations relevant to proposed action.
4. Active goals relevant to current domain.
5. Recent approved insight relevant to question.
6. Broader memory only when needed.

Require:

- bounded result count;
- relevance explanation;
- sensitivity filtering;
- expired-memory exclusion;
- superseded-memory exclusion;
- no raw full-store prompt injection.

## 30. Structured retrieval versus vector retrieval

Evaluate conceptually:

### Structured retrieval

Use:

- memory type;
- domain;
- exercise ID;
- goal ID;
- date;
- status;
- sensitivity.

Strengths:

- deterministic;
- transparent;
- efficient;
- easy to test;
- appropriate for known FitCore entities.

### Text or semantic retrieval

Potentially useful for:

- older conversation topics;
- user-authored notes;
- loosely phrased saved insights.

Risks:

- false matches;
- additional model or embedding cost;
- storage complexity;
- privacy complexity;
- mobile resource use.

Recommendation: The likely initial recommendation should favor structured retrieval and full-text search before adding a vector database.

## 31. Full-text search

Define where local full-text search may be sufficient:

- conversation titles;
- transcript text;
- memory summaries;
- saved insights;
- exercise aliases.

Require:

- no arbitrary raw model query;
- bounded results;
- sensitivity filtering;
- date filtering;
- user-visible source when used in an answer.

## 32. Vector-memory decision

Decisive first-version recommendation: rejected initially.

Structured FitCore data already has strong identifiers; simple local search provides sufficient recall without the device storage, privacy, and evaluation burden of embeddings. No demonstrated need yet.

## 33. Conversation persistence

Transcripts should be optionally saved, automatically retained for a limited period, and user-configurable. Balances continuity with privacy and storage. Require user to be able to delete saved conversations.

Distinguish:

- displayed transcript;
- retained transcript;
- rolling summary;
- long-term memory.

## 34. New-session behavior

Define what a new session loads:

- current screen context;
- current active workout;
- relevant approved preferences;
- relevant limitations;
- current goals;
- optional previous session summary only when useful or explicitly resumed.

Do not automatically load all prior conversations.

## 35. Resume-conversation behavior

Define:

- explicit session selection;
- retained summary;
- referenced data refresh;
- stale date-range detection;
- current app context update;
- no stale pending tools;
- no stale confirmations;
- no automatic replay of unfinished speech.

## 36. App suspension and restoration

Define behavior when:

- app temporarily backgrounds;
- screen locks;
- phone call occurs;
- app is terminated;
- app returns.

Require:

- active workout remains safe;
- in-progress generation may be canceled;
- pending tools reconciled;
- stale confirmations invalidated;
- recent conversation may restore;
- microphone state visibly reset;
- no automatic action replay;
- memory writes complete transactionally or fail clearly.

## 37. Memory deletion behavior

Define deletion levels:

### Delete one memory

Removes or tombstones one item.

### Forget a topic

Removes eligible Jarvis memory related to a topic without deleting canonical FitCore records.

### Clear conversation history

Removes saved transcripts and conversation summaries as configured.

### Clear all Jarvis memory

Deletes Jarvis-specific durable memory after explicit confirmation.

Require:

- exact preview;
- distinction from deleting workouts or health records;
- confirmation for broad deletion;
- clear completion result;
- no hidden backup retained beyond documented operational needs.

## 38. FitCore-data deletion distinction

Lock the rule:

```text
“Forget my bench preference”
```

must not mean:

```text
Delete all bench workout history
```

Jarvis memory deletion and canonical FitCore-data deletion are separate operations with separate confirmations and tools.

## 39. User memory-management interface requirements

Define future UI needs:

- list saved memories;
- filter by type;
- show source;
- show created and updated date;
- show sensitivity;
- show expiration;
- edit;
- delete;
- approve pending proposals;
- reject proposals;
- search;
- clear conversation history;
- clear all Jarvis memory;
- export only if separately approved.

## 40. Memory influence on behavior

Define how stored preferences may affect Jarvis:

- answer length;
- preferred units;
- workout versus coach mode;
- exercise substitutions;
- restriction warnings;
- common aliases.

Require:

- memory cannot override safety;
- memory cannot override current explicit user instruction;
- current-turn instruction normally takes precedence;
- expired memory ignored;
- conflicting memory clarified;
- user can see why a memory affected an answer.

## 41. Memory precedence rules

Define precedence:

1. Current explicit instruction.
2. Current confirmed action preview.
3. Current FitCore canonical state.
4. Active session preference.
5. Approved current long-term memory.
6. General default.
7. Clarification.

Example:

Stored memory says:

```text
Preferred unit: pounds
```

Current user says:

```text
“Log 100 kilograms for five.”
```

The explicit current instruction wins.

## 42. Data completeness and uncertainty

Require context and memory records to communicate:

- missing data;
- partial date ranges;
- stale records;
- user-provided versus device-measured data;
- inferred versus explicit information;
- confidence.

Jarvis must not convert incomplete historical data into confident conclusions.

## 43. Privacy requirements

Define:

- local storage by default;
- no cloud memory service required;
- raw audio excluded;
- full prompts not logged by default;
- high-sensitivity memory approval;
- external provider data filtering;
- user deletion;
- no silent training use;
- least-privilege retrieval;
- no unrelated memory included in prompts;
- diagnostic redaction.

State that this is an engineering architecture document, not the final legal privacy policy.

## 44. Security and prompt-injection protections

Treat the following as untrusted data:

- workout names;
- exercise notes;
- meal names;
- imported text;
- saved conversation text;
- memory summaries;
- user-authored notes.

Require:

- records marked as data;
- records cannot change system rules;
- memory content cannot expand tool permissions;
- retrieved text cannot create arbitrary tools;
- embedded code or instructions ignored;
- model provider receives allowlisted context only.

## 45. Storage-engine requirements

Define required properties:

- local;
- transactional;
- indexed;
- supports structured records;
- supports deletion;
- supports migrations;
- supports timestamps;
- supports full-text search if adopted;
- supports encryption options consistent with the application;
- safe under app interruption;
- compatible with the native app packaging strategy.

Existing FitCore storage or native SQLite may be appropriate; a separate vector database is unnecessary initially.
This is a recommendation and remains an open question for final implementation.

## 46. Context and memory size controls

Define limits for:

- recent-turn tokens;
- summary size;
- retrieved FitCore data;
- retrieved memories;
- tool definitions;
- tool results;
- maximum total context.

Require dynamic reduction under:

- memory pressure;
- thermal pressure;
- degraded mode;
- smaller provider context limits.

Define context-priority order:

1. System and safety rules.
2. Current user request.
3. Current FitCore context.
4. Required tool definitions.
5. Current confirmation state.
6. Recent relevant turns.
7. Rolling summary.
8. Relevant memory.
9. Supporting historical records.

## 47. Failure and fallback behavior

| Failure                        | Detection          | User-visible behavior            | Fallback             | Safety rule      |
| ------------------------------ | ------------------ | -------------------------------- | -------------------- | ---------------- |
| conversation store unavailable | storage error      | "Could not load history"         | new session          | do not block app |
| summary generation failure     | model error        | "Could not summarize"            | retain old summary   | don't overwrite  |
| malformed summary              | parsing error      | fallback                         | regenerate           | exclude invalid  |
| memory-store write failure     | storage error      | "Could not save preference"      | retry                | fail safely      |
| memory retrieval failure       | query error        | normal answer                    | answer without       | do not guess     |
| stale context                  | timestamp mismatch | "Context changed, re-evaluating" | refresh              | block execution  |
| conflicting memory             | multiple active    | ask user to clarify              | default              | don't guess      |
| expired memory                 | date check         | normal answer                    | ignore               | don't apply      |
| missing source                 | audit              | normal answer                    | tombstone            | do not trust     |
| app suspension                 | lifecycle event    | cancel generation                | reset turn           | no action replay |
| low storage                    | space check        | warning                          | limit context        | prioritize safe  |
| migration failure              | startup check      | "Storage error"                  | reset                | do not corrupt   |
| corrupted record               | hash/parse error   | normal answer                    | ignore               | exclude invalid  |
| context overflow               | token count        | normal answer                    | drop lowest priority | fit limits       |
| model unavailable              | network error      | "Cannot process"                 | offline fallback     | wait             |
| user deletion in progress      | status flag        | "Deleting..."                    | block actions        | clean safely     |

## 48. Diagnostics

Define safe diagnostics such as:

- context size;
- number of retrieved memories;
- summary refresh count;
- retrieval latency;
- stale-context count;
- memory proposal outcome;
- memory error code.

Do not log by default:

- full sensitive transcripts;
- raw audio;
- high-sensitivity memory content;
- full prompts;
- full FitCore record payloads.

## 49. Testing requirements

Define future tests for:

### Context construction

- active workout;
- selected chart;
- navigation changes;
- date changes;
- stale context;
- missing data;
- irrelevant-domain omission.

### Conversation continuity

- pronoun resolution;
- topic switch;
- return to topic;
- long conversation;
- interrupted response;
- canceled turn;
- text-to-voice switch.

### Summary behavior

- preserves verified facts;
- preserves user correction;
- omits canceled output;
- retains unresolved question;
- avoids unsupported causality.

### Long-term memory

- explicit remember request;
- proposal approval;
- proposal rejection;
- correction;
- contradiction;
- expiration;
- deletion;
- sensitivity filtering;
- superseded memory exclusion.

### Retrieval

- exact entity;
- relevant preference;
- unrelated memory omitted;
- expired memory omitted;
- bounded result count.

### Lifecycle

- suspension;
- restoration;
- app termination;
- low storage;
- migration failure.

## 50. Evaluation scenarios

### Multi-turn workout comparison

```text
“How did bench compare with last week?”
“What about last month?”
“Do the same for squats.”
```

### Reference resolution

```text
“Log 225 for five.”
“Undo that.”
```

### User correction

```text
“Remember that I use kilograms.”
“Actually, use pounds.”
```

### Temporary limitation

```text
“My knee is sore today.”
```

Expected:

- session context or temporary suggestion;
- not automatically permanent high-sensitivity memory.

### Explicit memory

```text
“Remember that I prefer short answers while training.”
```

### Memory deletion

```text
“Forget my preference for dumbbell bench.”
```

### Topic switch

```text
“Why was recovery low?”
“Never mind. How much protein do I have left?”
```

### Interruption

Jarvis begins a speculative explanation and is stopped before completion.

Expected:

- abandoned explanation not stored as a verified insight.

## 51. Acceptance gates

Define go/no-go conditions before persistent memory is enabled.

Include:

- state layers are clearly separated;
- context excludes irrelevant data;
- stale context blocks writes;
- interrupted turns cannot update completed summaries;
- model speculation cannot become permanent memory automatically;
- memory proposals are reviewable;
- high-sensitivity memory requires explicit approval;
- user can inspect, edit, and delete memory;
- expired and superseded memories are excluded;
- canonical FitCore data remains separate;
- retrieval is bounded;
- raw audio is not retained;
- no cloud memory dependency exists;
- storage survives app lifecycle safely;
- memory deletion does not delete FitCore records.

## 52. Initial implementation subset

Recommend a conservative first version.

### Initial

- active turn state;
- active session state;
- recent bounded turns;
- current screen context;
- active workout context;
- rolling summary;
- explicit user-approved preferences;
- explicit user-approved limitations;
- memory list and delete controls;
- structured retrieval.

### Later

- saved analytical insights;
- automatic memory proposals;
- conversation search;
- richer semantic retrieval;
- cross-session topic resumption.

### Deferred initially

- vector database;
- automatic personality profiling;
- passive storage of all transcripts;
- automatic inference of health conditions;
- cloud memory synchronization;
- invisible permanent memory.

## 53. Rejected approaches

Reject and explain:

- storing every conversation permanently;
- treating all user statements as facts;
- allowing the model direct database access;
- putting the entire FitCore database in the prompt;
- storing private chain-of-thought;
- using one undifferentiated “memory” table without lifecycle fields;
- automatic high-sensitivity memory;
- vector retrieval before demonstrating a need;
- cloud-only memory;
- allowing canceled output into the summary;
- letting old context execute against a new active workout;
- using display names as the only entity identity.

## 54. Repository mapping

| Needed state or data | Existing source candidate             | Confidence | Gap                   | Future integration need |
| -------------------- | ------------------------------------- | ---------- | --------------------- | ----------------------- |
| current route        | `router` state                        | High       | none                  | context sync            |
| selected date        | `view` in `Store`                     | High       | none                  | map to tools            |
| active workout       | `activeWorkout` in `AppState`         | High       | none                  | mapping to tools        |
| current exercise     | `activeWorkout.exercises`             | High       | none                  | map to tools            |
| current set          | `activeWorkout.sets`                  | High       | none                  | map to tools            |
| timer                | `activeTimer` in `AppState`           | High       | none                  | map to tools            |
| selected chart       | UI state / `progress.tsx`             | Medium     | local state           | promote to `Store`      |
| goals                | `nutritionTargets` / `profile`        | Medium     | lacks training        | unify                   |
| preferences          | `personalization` / `jarvisSettings`  | High       | fine-grained          | map to DB               |
| limitations          | `profile`                             | Low        | mostly absent         | schema addition         |
| existing storage     | `FitCoreRuntimePersistenceController` | High       | needs generic objects | expand schema           |
| history              | `FitCoreData` logs                    | High       | none                  | mapping                 |
| analytics            | `progress.tsx` logic                  | Medium     | deeply coupled UI     | decouple calculation    |

## 55. Open questions

Document unresolved questions such as:

- final storage engine;
- whether existing storage can support Jarvis records;
- exact recent-turn size;
- exact summary token limit;
- transcript retention default;
- exact memory-review UX;
- encryption-at-rest strategy;
- whether semantic embeddings are ever necessary;
- exact expiration defaults;
- how sensitive limitations map to existing FitCore data;
- final app lifecycle behavior;
- whether conversation sessions should sync between devices in the future.

## 56. Final recommendation summary

State is layered (turn, session, history, memory). Context is bounded, structured, and strictly timestamped to reject stale actions. Memory requires user approval (especially sensitive data) and is cleanly separated from FitCore domain data. We recommend structured local retrieval initially and explicitly reject a vector DB or cloud requirement for the iPhone 15 launch. The largest unresolved risk is selecting the exact local storage engine for durable memory records.

---

### 1. State and memory-layer diagram

```text
+-----------------------+
| Active turn state     | (Temporary)
+-----------------------+
| Active session state  | (Session-scoped)
+-----------------------+
| Recent conv. history  | (Bounded context)
+-----------------------+
| Rolling summary       | (Compressed history)
+-----------------------+
| Long-term memory      | (User-controlled)
| (Insights, goals)     |
+-----------------------+
| Operational history   | (Tool history, Undo)
+-----------------------+
```

### 2. Per-turn context-construction flow

```text
+----------------+    +----------------+    +------------------+
| User input     | -> | Navigation/App | -> | Timestamp check  |
| "Log 5 reps"   |    | Context        |    | Reject if stale  |
+----------------+    +----------------+    +------------------+
                             |
                             v
                      +----------------+
                      | Retrieve       |
                      | Relevant       |
                      | Memories       |
                      +----------------+
                             |
                             v
                      +----------------+
                      | Build Bounded  |
                      | Context        |
                      | Envelope       |
                      +----------------+
                             |
                             v
                      +----------------+
                      | Model request  |
                      +----------------+
```

### 3. Recent-turn to rolling-summary flow

```text
+-----------------+    +-----------------+    +-------------------+
| Completed turn  | -> | Bounded History | -> | Capacity Reached  |
+-----------------+    +-----------------+    +-------------------+
                                                      |
                                                      v
                                              +-------------------+
                                              | Summarize Older   |
                                              | Relevant Turns    |
                                              +-------------------+
                                                      |
                                                      v
                                              +-------------------+
                                              | Update Rolling    |
                                              | Summary           |
                                              +-------------------+
```

### 4. Memory proposal and approval flow

```text
+---------------+    +-------------------+    +-----------------+
| Insight found | -> | Generate Proposal | -> | Display Preview |
| (e.g. unit)   |    | (Preview form)    |    | to User         |
+---------------+    +-------------------+    +-----------------+
                                                     |
                                            +--------+--------+
                                            |                 |
                                      [Approved]          [Rejected]
                                            |                 |
                                     +------+------+    +-----+-----+
                                     | Save to DB  |    | Discard   |
                                     +-------------+    +-----------+
```

### 5. Memory correction and expiration flow

```text
+-----------------+    +------------------+    +-----------------+
| Corrective turn | -> | Identify Match   | -> | Show Conflict   |
| "Use lbs now"   |    | (e.g. Unit: kg)  |    | Preview         |
+-----------------+    +------------------+    +-----------------+
                                                      |
                             +------------------------+
                             |
                             v
                     +-----------------+
                     | Expire or       |
                     | Supersede Old   |
                     | Memory          |
                     +-----------------+
```

### 6. Stale-context rejection flow

```text
+-----------------+    +-------------------+    +-----------------+
| Awaiting tool   | -> | User Navigates to | -> | Tool Execution  |
| confirmation    |    | Different Screen  |    | Attempted       |
+-----------------+    +-------------------+    +-----------------+
                                                      |
                                                      v
                                              +-------------------+
                                              | Compare Timestamp/|
                                              | Context IDs       |
                                              +-------------------+
                                                      |
                                                      v
                                              +-------------------+
                                              | Mismatch Detected |
                                              | -> Reject Write   |
                                              +-------------------+
```

### 7. Interruption and summary-safety flow

```text
+-----------------+    +-------------------+    +-----------------+
| Jarvis starts   | -> | User Interrupts:  | -> | Cancel ongoing  |
| speculative     |    | "Stop."           |    | generation      |
| generation      |    +-------------------+    +-----------------+
+-----------------+                                   |
                                                      v
                                              +-------------------+
                                              | Discard abandoned |
                                              | text from memory  |
                                              +-------------------+
                                                      |
                                                      v
                                              +-------------------+
                                              | Retain topic but  |
                                              | omit speculation  |
                                              | from summary      |
                                              +-------------------+
```
