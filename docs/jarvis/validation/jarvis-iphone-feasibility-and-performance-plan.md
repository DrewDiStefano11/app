# FitCore Jarvis iPhone Feasibility and Performance Validation Plan

## 2. Document status

This document defines a proposed validation and decision-gate plan for the FitCore Jarvis assistant.
No feasibility implementation or benchmark result is included in this document.
All thresholds are provisional until the first controlled measurements are made.
The regular iPhone 15 is the minimum pass/fail device.
iPhone 16 results may not compensate for failure on the iPhone 15.
Physical-device evidence is required before production approval. Simulator-only validation is insufficient.

## 3. Validation purpose

The goal is not merely to prove that individual models can launch.
The system must prove that the complete user-visible pipeline can operate safely and usefully:

```text
Speech input
    ↓
Transcription and turn detection
    ↓
Command or agent routing
    ↓
Local model inference
    ↓
FitCore tool execution
    ↓
Response generation
    ↓
Speech output
```

while the user is also:

- navigating FitCore;
- logging a workout;
- using Bluetooth earbuds;
- interrupting Jarvis;
- changing app state;
- experiencing realistic device heat and battery conditions.

## 4. Validation principles

1. Test the minimum supported phone first.
2. Measure the complete pipeline, not isolated components only.
3. Safety failures outweigh conversational quality.
4. Duplicate or stale actions are release-blocking.
5. Physical-device evidence is mandatory.
6. Quiet-room success does not prove gym usability.
7. Short demos do not prove workout-session stability.
8. Median latency alone is insufficient; tail latency matters.
9. Benchmark conditions must be reproducible.
10. Failed or missing data must be reported, not hidden.
11. Every measurement must identify device, OS, model, revision, and configuration.
12. iPhone 16 improvements must remain optional.
13. Degraded modes must be tested, not merely documented.
14. Battery and thermal behavior must be evaluated together.
15. User-perceived responsiveness matters in addition to raw model speed.
16. Test data must not contain real sensitive user records unless explicitly approved and protected.

## 5. Validation phases

```text
[Phase 0] Readiness -> [Phase 1] Component Feasibility -> [Phase 2] Integrated Loop
                                                                      ↓
[Phase 5] Model Writes <- [Phase 4] Deterministic Writes <- [Phase 3] Read-only Agent
          ↓
[Phase 6] Long-session -> [Phase 7] Release Regression -> Go/No-Go Decision
```

### Phase 0 — Documentation and environment readiness

Prove:

- architecture assumptions are recorded;
- model and runtime versions are identified;
- licenses are reviewed;
- physical devices are available;
- macOS and Xcode access exists;
- benchmark fixtures are prepared;
- sensitive test-data rules are defined.

### Phase 1 — Isolated component feasibility

Test separately:

- speech recognition;
- end-of-turn detection;
- local model;
- structured tool output;
- TTS;
- model download;
- native bridge.

### Phase 2 — Integrated local voice loop

Test:

- STT → model → TTS;
- streaming;
- cancellation;
- barge-in;
- echo cancellation;
- Bluetooth.

No FitCore writes yet.

### Phase 3 — Read-only FitCore agent

Test:

- context construction;
- read-only tools;
- analytics explanations;
- missing data;
- multi-turn conversation.

### Phase 4 — Deterministic write actions

Test:

- set logging;
- timers;
- navigation;
- Undo;
- idempotency;
- stale-turn rejection.

### Phase 5 — Model-requested writes

Enable only after prior gates pass.
Test:

- schema validation;
- confirmation;
- Undo;
- duplicate protection;
- interruption;
- malformed tool calls.

### Phase 6 — Long-session and field validation

Test:

- 30-minute sessions;
- 60-minute workout sessions;
- actual gym or representative noise;
- Bluetooth;
- low battery;
- thermal pressure;
- app lifecycle events.

### Phase 7 — Release-candidate regression

Test:

- full matrix;
- upgrade;
- rollback;
- model repair;
- accessibility;
- privacy;
- data integrity.

## 6. Required feasibility prototypes

None of these prototypes should include broad production scope.

### Prototype A — Audio and voice loop

Must prove:

- microphone capture;
- partial transcript;
- final transcript;
- endpointing;
- streaming TTS;
- interruption;
- no significant self-transcription.

### Prototype B — Local-model tool routing

Must prove:

- model loads;
- streams;
- cancels;
- emits valid structured tool calls;
- distinguishes read from write;
- handles missing context.

### Prototype C — Native bridge

Must prove:

- typed message;
- streaming event;
- cancellation;
- stale-event rejection;
- mock tool round trip.

### Prototype D — FitCore read-only integration

Must prove:

- current route;
- active workout;
- selected chart;
- canonical service results;
- model explanation.

### Prototype E — Safe deterministic write

Must prove:

- one set logs;
- duplicate callback does not log twice;
- Undo works;
- interruption prevents stale execution.

## 7. Device matrix

| Device            | Role             | Required result                           |
| ----------------- | ---------------- | ----------------------------------------- |
| Regular iPhone 15 | Minimum baseline | Must pass all core gates                  |
| iPhone 16         | Supported device | Must pass all core gates                  |
| iOS simulator     | Development aid  | Cannot satisfy physical-performance gates |

Record for every test:

- exact device model;
- storage capacity;
- battery health where available;
- operating-system version;
- free storage;
- Low Power Mode status;
- thermal state;
- audio route;
- network state;
- model versions;
- application commit;
- build type.

If multiple regular iPhone 15 hardware configurations materially differ, document the limitation.

## 8. Operating-system matrix

Define:

- minimum supported iOS is determined after the approved native container, STT framework, inference runtime, TTS provider, and any optional Apple framework requirements are known;
- the current production iOS release at implementation and release time must be included;
- at least one supported prior version should be evaluated where technically and commercially reasonable;
- beta OS versions do not satisfy final release gates;
- exact minimum OS must be approved during the native and component feasibility phases;
- optional provider tests run only on officially eligible hardware and OS versions.

Every test record should capture:

- exact iOS version and build;
- exact device model;
- native framework versions;
- model revisions;
- whether optional OS AI features are installed and available;
- permission state;
- build configuration.

State that:

- the regular iPhone 15 remains the pass/fail device;
- a newer OS result cannot conceal failure on the chosen minimum OS;
- an iPhone 16 result cannot compensate for iPhone 15 failure;
- unsupported optional features must degrade without affecting deterministic workout behavior;
- the minimum supported OS may be raised only through an explicit compatibility decision supported by evidence.

## 9. Build configuration matrix

Test:

- debug build;
- release or optimized development build;
- production-like release configuration.

State:

- debug builds may materially distort performance;
- final latency and energy gates must use an optimized physical-device build;
- logging levels must be recorded;
- compiler and runtime versions must be recorded.

## 10. Model and runtime configuration record

Every result must identify:

- STT model;
- STT revision;
- endpointing model;
- local LLM;
- quantization;
- context size;
- output limit;
- inference runtime;
- runtime commit or release;
- TTS model;
- voice;
- sample rate;
- preload state;
- warm or cold state;
- active fallback settings.

No result is valid without reproducible configuration metadata.

## 11. Audio-route matrix

Require testing with:

- built-in microphone and speaker;
- built-in microphone with silent text response;
- Bluetooth earbuds;
- Bluetooth headset microphone;
- Bluetooth disconnect during conversation;
- Bluetooth reconnect;
- speaker output after disconnect;
- wired headset where available.

Record:

- input route;
- output route;
- sample rate;
- echo-cancellation state;
- route changes;
- dropped frames;
- user-visible failures.

## 12. Environment matrix

```text
[Device: iPhone 15/16] x [Audio: Built-in/BT] x [Env: Quiet/Mod/Gym] x [State: Moving/Still]
```

Test at minimum:

### Quiet room

Baseline technical condition.

### Moderate background audio

Television or music.

### Simulated gym noise

Recorded or controlled weights, music, voices, and equipment sounds.

### Actual gym

Where practical and safe.

### Moving or handling phone

Phone in hand, pocket transition, bench placement, and screen interaction.

Define repeatable noise conditions where possible.
Do not publish or retain private bystander audio.

## 13. Voice-user matrix

Use an anonymized and consented test set representing:

- different speaking speeds;
- short pauses;
- long pauses;
- quiet speech;
- normal speech;
- louder speech;
- different accents where available;
- number-heavy workout phrases;
- corrections;
- interruption;
- filler words.

Do not claim broad demographic representativeness from a small sample.

## 14. Test-data policy

Require:

- synthetic or anonymized FitCore data;
- no real injury notes unless explicitly approved;
- no real health data in shared reports;
- deterministic seed datasets;
- known expected calculations;
- stable entity IDs;
- recorded data completeness;
- no raw audio committed to the repository;
- no sensitive transcripts in PRs.

## 15. Workload classes

### Workload A — Deterministic command

```text
“225 for five.”
“Same weight for six.”
“Start ninety seconds.”
“Undo that.”
```

### Workload B — Simple read

```text
“What did I bench last week?”
“How much protein do I have left?”
```

### Workload C — Analytical explanation

```text
“Compare today’s bench performance with my last four sessions.”
```

### Workload D — Multi-turn follow-up

```text
“What about last month?”
“Do the same for squats.”
```

### Workload E — Confirmation-required change

```text
“Replace this exercise with a knee-friendly alternative.”
```

### Workload F — Interruption

Jarvis is speaking and the user revises the request.

### Workload G — Missing or incomplete data

### Workload H — Long conversation

### Workload I — Model unavailable or degraded mode

## 16. End-to-end latency definitions

```text
[Speech Start]
     |
     v
[First Partial Transcript] ---> Partial transcript latency
     |
     v
[Speech End]
     |
     v
[Final Transcript] -----------> Finalization latency
     |
     v
[Route Decision] -------------> Time to route decision
     |
     v
[First Model Token] ----------> Time to first token
     |
     v
[Valid Tool Request] ---------> Time to valid tool call
     |
     v
[Tool Result] ----------------> Tool execution latency
     |
     v
[First Text Response] --------> Time to first text response
     |
     v
[First Audible Response] -----> Time to first audible response
     |
     v
[Completed Response] ---------> Total turn duration
```

Define exact timing points.
At minimum:

- speech-start timestamp;
- first partial transcript;
- speech-end timestamp;
- final transcript;
- route decision;
- first model token;
- valid tool request;
- tool result;
- first response text;
- first generated audio;
- first audible response;
- completed response;
- interruption detected;
- speech stopped;
- generation canceled.

Define metrics:

```text
Partial transcript latency
Finalization latency
Endpointing latency
Time to route decision
Time to first token
Time to valid tool call
Tool execution latency
Time to first text response
Time to first audible response
Total turn duration
Barge-in stop latency
Cancellation completion latency
```

## 17. Latency reporting

Require:

- median;
- 75th percentile;
- 90th percentile;
- 95th percentile where sample size supports it;
- worst observed value;
- cold versus warm;
- quiet versus noisy;
- built-in versus Bluetooth;
- iPhone 15 versus iPhone 16.

Do not report averages alone.

## 18. Provisional responsiveness targets

### Deterministic commands

- transcript finalization should feel immediate after speech ends;
- action confirmation should begin quickly;
- no unnecessary LLM invocation.

### Conversational responses

- first audible response should begin within a practical conversational delay;
- long analytical work may take longer but must show visible processing.

### Interruption

- spoken output should stop nearly immediately;
- stale generation and pending tools must be canceled.

You may propose numerical targets, but:

- label them provisional;
- justify them;
- distinguish target from release-blocking maximum;
- require revision after initial measurements.

Do not falsely present repository claims as verified FitCore performance.

## 19. Speech-recognition metrics

Define:

- word error rate;
- numeric token accuracy;
- complete command exact match;
- exercise-name accuracy;
- unit accuracy;
- duration accuracy;
- false finalization;
- missed finalization;
- partial transcript stability;
- correction success.

For workout commands, require separate reporting for:

- weight;
- reps;
- unit;
- exercise;
- duration;
- action verb.

A transcript with correct words but wrong numeric action must count as a serious failure.

## 20. Deterministic-command accuracy

Define:

- command-family accuracy;
- argument accuracy;
- exact structured-candidate accuracy;
- ambiguity detection;
- false execution;
- safe clarification;
- duplicate suppression;
- correction targeting;
- Undo targeting.

Require special attention to phrases such as:

```text
“two fifteen”
“add five”
“same weight”
“restart it”
“undo that”
```

## 21. End-of-turn metrics

Define:

- endpointing delay;
- false early endpoint;
- failure to endpoint;
- long-pause tolerance;
- background-noise false endpoint;
- overlapping-speech behavior;
- interruption detection.

Require separate evaluation for:

- short workout command;
- long question;
- correction;
- hesitation;
- gym noise.

## 22. Echo-cancellation and barge-in metrics

Define:

- Jarvis self-transcription rate;
- interruption detection rate;
- false interruption rate;
- TTS stop latency;
- stale-audio playback;
- stale-token playback;
- new-turn start delay;
- user speech lost during interruption.

Release-blocking failures include:

- Jarvis repeatedly transcribes its own output;
- old audio resumes;
- old tool executes after interruption;
- user speech is consistently clipped.

## 23. Local-model metrics

Define:

- cold load time;
- warm readiness time;
- time to first token;
- tokens per second;
- output completion time;
- context-size effect;
- structured-output validity;
- tool-selection accuracy;
- argument accuracy;
- unsupported-tool rejection;
- missing-data honesty;
- concise-mode compliance;
- repetition or reasoning-loop rate;
- cancellation latency;
- crash rate.

## 24. Tool-calling evaluation

Require a labeled evaluation set.
Report:

- correct tool;
- wrong tool;
- no tool when needed;
- unnecessary tool;
- malformed structure;
- wrong arguments;
- unsafe action;
- correct clarification;
- confirmation correctly required;
- forbidden tool correctly rejected.

Separate:

- read-only;
- reversible write;
- confirmation-required write;
- prohibited request.

## 25. Response-quality evaluation

Define rubric categories:

- factual grounding;
- use of verified FitCore data;
- no invented values;
- relevance;
- concision;
- clarity;
- appropriate uncertainty;
- current-context awareness;
- conversation continuity;
- user correction handling;
- medical-boundary compliance.

Use a consistent ordinal rubric.
Require human review for a representative subset.

## 26. Conversation-continuity evaluation

Test:

- pronoun resolution;
- prior entity reference;
- prior date range;
- topic switch;
- return to prior topic;
- user correction;
- explicitly excluded factor;
- summary refresh;
- session resume;
- text-to-voice transition.

Examples:

```text
“How did bench compare with last week?”
“What about last month?”
“Do the same for squats.”
“Go back to bench.”
```

## 27. Memory evaluation

Test:

- explicit remember request;
- proposal preview;
- approval;
- rejection;
- correction;
- expiration;
- superseded memory;
- deletion;
- irrelevant memory exclusion;
- sensitive-memory approval;
- memory effect explanation.

Persistent memory must not be enabled merely because conversation continuity works.

## 28. Safety metrics

Define zero-tolerance or near-zero-tolerance categories:

- duplicate set writes;
- stale-turn writes;
- destructive action without confirmation;
- claim of success when service failed;
- direct persistence access;
- arbitrary tool execution;
- cross-exercise write caused by stale context;
- memory deletion deleting canonical FitCore data;
- provider secret exposure;
- raw-audio retention without approval.

State which safety failures immediately produce a no-go decision.

## 29. Data-integrity validation

```text
[Interruption Event]
        ↓
    [Halt Model Generation]
        ↓
    [Is Tool Pending?] -> Yes -> [Cancel Tool Call] -> [Reject Write]
        ↓ No
    [Is Event Stale?] -> Yes -> [Reject Event]
        ↓ No
    [Safe to Proceed]
```

Require before-and-after checks for:

- set logging;
- set editing;
- Undo;
- timer state;
- exercise completion;
- workout completion;
- app suspension;
- crash;
- duplicate callback;
- stale bridge event;
- model timeout.

Validate:

- exactly one expected mutation;
- no unrelated mutation;
- correct entity;
- correct unit;
- correct timestamp;
- expected history or Undo record.

## 30. Memory measurements

Measure:

- app resident memory;
- peak resident memory;
- model memory;
- peak during concurrent STT, LLM, and TTS;
- memory after repeated turns;
- memory after cancellation;
- memory after unload;
- memory after app background and foreground;
- memory-warning count;
- termination.

Require separate cold and sustained-session results.

## 31. Thermal measurements

```text
[Session Start: Normal]
        ↓
(Time + Workload)
        ↓
[Thermal State: Elevated] ---> Alert & Log ---> [Degrade Non-Critical AI Tasks]
        ↓
(Continued Workload)
        ↓
[Thermal State: Serious] ----> [Halt Local Model Inference] ---> [Fallback / Text Only]
```

Record:

- starting thermal state;
- state transitions;
- time to elevated thermal state;
- token-speed degradation;
- audio degradation;
- response-latency degradation;
- fallback activation;
- recovery time;
- user-visible warning.

Test:

- 10-minute conversation;
- 30-minute active workout;
- 60-minute active workout;
- charging versus not charging where practical;
- warm room versus normal room where practical.

Avoid unsafe heating tests.

## 32. Battery and energy measurements

Define:

- starting battery percentage;
- ending battery percentage;
- elapsed time;
- screen brightness;
- audio route;
- network state;
- model state;
- number of turns;
- speech duration;
- active workout UI use.

Report:

- approximate battery percentage per 30 minutes;
- approximate battery percentage per hour;
- energy-impact category where tooling supports it;
- uncertainty and device-health limitations.

Do not claim laboratory precision from informal battery tests.

## 33. Storage measurements

Measure:

- app size;
- download size;
- installed model size;
- temporary download space;
- rollback duplicate space;
- conversation-memory growth;
- diagnostic growth;
- model deletion recovery;
- low-storage behavior.

Test:

- adequate space;
- near-minimum space;
- insufficient space;
- interrupted installation;
- update with rollback version retained.

## 34. Long-session stability

Define required scenarios:

### 30-minute conversational session

Frequent voice turns and interruptions.

### 60-minute workout session

Mixed:

- set logging;
- timers;
- navigation;
- short questions;
- occasional analytics;
- Bluetooth.

### Repeated sessions

Multiple sessions without reinstalling or restarting the phone.

Measure:

- crashes;
- hangs;
- audio loss;
- increasing latency;
- memory growth;
- thermal state;
- battery;
- stale responses;
- duplicate actions;
- context drift.

## 35. App lifecycle validation

Test:

- app background and immediate return;
- screen lock;
- phone call;
- Siri interruption where appropriate;
- Bluetooth disconnect;
- Bluetooth reconnect;
- app termination;
- device restart;
- app update;
- model update;
- low-memory termination.

Require:

- no pending write replay;
- no stale confirmation;
- active workout remains safe;
- model status is accurate;
- microphone status is accurate;
- conversation restoration does not execute old tools.

## 36. Offline validation

Test with network disabled after required models are installed:

- application launch;
- active workout;
- deterministic commands;
- local conversation;
- read-only FitCore tools;
- TTS;
- memory;
- Undo;
- model status.

Require:

- no hidden mandatory license check;
- no failure caused solely by provider unavailability;
- clear behavior for features that truly require network.

## 37. Download and model-lifecycle validation

Test:

- first download;
- pause;
- resume;
- app termination;
- checksum mismatch;
- insufficient storage;
- successful install;
- failed health check;
- rollback;
- deletion;
- repair;
- revoked model.

Do not duplicate implementation details; focus on validation evidence.

## 38. Bluetooth validation

Test:

- initial connection;
- route selection;
- microphone quality;
- TTS quality;
- duplex degradation;
- disconnect while listening;
- disconnect while speaking;
- reconnect;
- fallback to phone speaker;
- user-visible route state.

Record product limitations honestly.

## 39. Accessibility validation

Test:

- text-only Jarvis;
- VoiceOver;
- visible transcript;
- captions;
- microphone control labels;
- Stop control;
- confirmation dialog;
- reduced motion;
- larger text;
- speech disabled;
- speech rate;
- error announcements.

Physical-device accessibility testing is required.

## 40. Privacy validation

Test:

- no raw audio remains after processing;
- no sensitive transcript appears in production logs;
- conversation deletion;
- memory deletion;
- clear-all-memory scope;
- provider disabled by default;
- no accidental network request;
- model download contains no personal data;
- diagnostic export preview;
- permission denial and revocation.

## 41. Security validation

Test:

- prompt injection;
- malformed bridge event;
- arbitrary tool request;
- stale turn;
- reused confirmation;
- duplicate idempotency key;
- altered model checksum;
- unsupported model;
- secret redaction;
- oversized input;
- unlimited tool-loop prevention.

## 42. Regression suite categories

Define future automated regression categories:

### Windows-compatible

- deterministic parser;
- context builder;
- tool schema;
- canonical service tests;
- memory logic;
- error taxonomy;
- prompt fixtures;
- simulated bridge.

### macOS simulator

- native bridge;
- permissions UI;
- basic lifecycle;
- model mocks;
- Swift unit tests.

### Physical-device automated or semi-automated

- local inference;
- native audio;
- model loading;
- lifecycle;
- memory pressure.

### Manual field validation

- real gym noise;
- Bluetooth;
- extended conversation;
- perceived fluidity;
- heat and battery.

## 43. Benchmark result schema

Define a conceptual result record containing:

```text
testRunId
scenarioId
applicationCommit
buildConfiguration
deviceModel
osVersion
batteryHealth
freeStorage
audioRoute
networkState
modelConfiguration
startThermalState
endThermalState
measurements
passFail
notes
artifacts
reviewer
timestamp
```

Do not create executable schema files.
Require:

- reproducibility;
- no sensitive payloads;
- result immutability after approval;
- corrections recorded separately.

## 44. Evidence requirements

Every feasibility completion report must provide:

- branch and commit;
- device details;
- build configuration;
- exact model versions;
- exact scenario;
- sample count;
- raw measurement summary;
- percentile results where applicable;
- failures;
- screenshots or logs only when privacy-safe;
- reproduction steps;
- conclusion;
- unresolved issues.

Do not accept:

- “felt fast”;
- one screenshot;
- simulator-only evidence;
- iPhone 16-only evidence;
- author-reported repository performance without reproduction;
- average latency without distribution;
- a short demo as proof of 60-minute stability.

## 45. Provisional acceptance targets

| Metric                               | Target     | Maximum acceptable | Release-blocking condition | Status  |
| ------------------------------------ | ---------- | ------------------ | -------------------------- | ------- |
| Deterministic command action latency | 500ms      | 1000ms             | 1500ms                     | PENDING |
| Final transcript delay               | 300ms      | 800ms              | 1200ms                     | PENDING |
| First audible response               | 1.5s       | 3.0s               | > 5.0s                     | PENDING |
| Barge-in stop latency                | 200ms      | 500ms              | 1000ms                     | PENDING |
| Numeric command accuracy             | 99%        | 95%                | < 90%                      | PENDING |
| Tool structured-output validity      | 100%       | 99%                | < 99%                      | PENDING |
| Tool selection accuracy              | 98%        | 95%                | < 90%                      | PENDING |
| Duplicate writes                     | 0          | 0                  | > 0                        | PENDING |
| Stale writes                         | 0          | 0                  | > 0                        | PENDING |
| Memory termination                   | 0 in 1h    | 0 in 1h            | > 0 in 1h                  | PENDING |
| 60-minute crash rate                 | 0          | 0                  | > 0                        | PENDING |
| Thermal fallback                     | None       | Minor              | Throttles to unusable      | PENDING |
| Battery consumption                  | < 10%/hr   | < 15%/hr           | > 20%/hr                   | PENDING |
| Self-transcription                   | 0          | 0                  | > 0                        | PENDING |
| Bluetooth recovery                   | < 2s       | < 5s               | Requires restart           | PENDING |
| Offline operation                    | Functional | Functional         | Unusable                   | PENDING |

Numerical targets must be:

- clearly marked provisional;
- justified;
- revised after first controlled run;
- separated from zero-tolerance safety conditions.

## 46. Hard release-blocking gates

Define unconditional no-go conditions, including:

1. Duplicate workout writes.
2. Stale or canceled turn executes a write.
3. Destructive action executes without exact confirmation.
4. Model directly bypasses canonical FitCore services.
5. Active workout data corrupts after Jarvis crash.
6. Raw audio is retained without explicit approval.
7. Regular iPhone 15 cannot complete a normal workout session.
8. Frequent iOS memory termination.
9. Jarvis routinely transcribes its own speech.
10. Stop or interruption cannot halt spoken output.
11. Model cannot be canceled safely.
12. Offline deterministic fallback is unavailable.
13. Required model license or redistribution rights are unresolved.
14. Model integrity verification can be bypassed.
15. User cannot delete Jarvis memory.

## 47. Go, conditional-go, and no-go decisions

```text
[Run Core Gates on iPhone 15]
        ↓
    [Hard Gates Pass?]
        ├── No  -> NO-GO / REDESIGN
        └── Yes -> [Evaluate Performance]
                     ├── Below Max Bounds -> NO-GO / REDESIGN
                     └── Above Targets -> GO
                     └── Between Target and Max -> CONDITIONAL GO
```

Define:

### Go

- all hard gates pass;
- performance meets approved thresholds;
- remaining issues are non-blocking;
- fallback paths work.

### Conditional go

- safety passes;
- one optional enhancement fails;
- limited scope is explicitly reduced;
- mitigation and follow-up are documented.

Examples:

- system TTS used instead of enhanced TTS;
- hands-free mode deferred;
- smaller context;
- deterministic commands released before full conversation.

### No-go

- any hard safety gate fails;
- iPhone 15 cannot sustain the workload;
- resource use is unacceptable;
- licenses unresolved;
- voice pipeline unusable in realistic conditions.

### Redesign required

- component interaction causes persistent contention;
- architecture assumption fails;
- native packaging cannot support the required pipeline;
- local model cannot provide acceptable structured tool behavior.

## 48. Feature-degradation decision tree

```text
Full local voice agent fails
    ↓
Keep text agent + deterministic voice commands?
    ↓
Use system TTS instead of enhanced TTS?
    ↓
Reduce model size or context?
    ↓
Disable hands-free and retain push-to-talk?
    ↓
Release deterministic workout assistant first?
    ↓
Stop implementation if safety or core usefulness still fails
```

Require product approval before reducing locked requirements.

## 49. Comparative iPhone 15 and iPhone 16 analysis

Require reporting:

- absolute results per device;
- relative difference;
- whether behavior remains functionally equivalent;
- optional enhancements possible on iPhone 16;
- whether one model configuration can serve both;
- whether separate packs are justified.

The iPhone 16 must not hide an iPhone 15 failure.

## 50. Baseline configuration selection

Define how benchmark results select:

- STT model;
- endpointing model;
- LLM quantization;
- context size;
- TTS provider;
- preload policy;
- warm-idle duration;
- fallback settings.

Use a weighted decision framework prioritizing:

1. Safety.
2. Reliability.
3. iPhone 15 compatibility.
4. Conversation quality.
5. Latency.
6. Battery.
7. Storage.
8. Optional enhancement quality.

## 51. Repetition and sample-size guidance

Define provisional sample expectations.
Examples:

- high-frequency latency scenarios require repeated runs;
- accuracy tests require a sufficiently large labeled phrase set;
- long-session stability requires multiple sessions;
- safety failures must be investigated even if observed once.

Do not claim formal statistical significance unless the study supports it.

## 52. Warm-up and test-order controls

Define:

- cold-run separation;
- warm-run separation;
- device cooldown;
- battery starting range;
- background-app control;
- screen brightness;
- network condition;
- test-order randomization where practical;
- repeated-run spacing.

These controls reduce misleading results.

## 53. Human review rubric

Define reviewer scoring for:

- conversational fluidity;
- interruption naturalness;
- answer relevance;
- response length;
- perceived delay;
- voice clarity;
- transcript trust;
- recovery from mistakes;
- gym usability.

Separate subjective review from objective measurements.

## 54. Defect severity

Define severity categories:

### Critical

Data corruption, unauthorized action, privacy failure, security bypass.

### High

Crash, repeated duplicate prevention failure, unusable interruption, model termination.

### Medium

Noticeable latency, occasional transcription error with safe clarification, route recovery issue.

### Low

Minor wording, cosmetic status mismatch, non-blocking voice preference issue.

Define release implications.

## 55. Failure triage process

Define:

1. Reproduce.
2. Capture configuration.
3. Identify component boundary.
4. Determine safety impact.
5. Reduce to minimum scenario.
6. Add regression case.
7. Retest both phones.
8. Re-run relevant long-session test.
9. Record decision.

Do not allow unresolved critical or high failures to be waived informally.

## 56. Benchmark artifact policy

Future artifacts may include:

- JSON result summaries;
- redacted logs;
- Instruments traces;
- screenshots;
- charts;
- test transcripts;
- audio only with explicit consent.

Require:

- no sensitive user data;
- no bystander recordings;
- retention limits;
- large binary artifacts not committed without repository policy;
- clear naming and versioning.

This task must not create artifacts.

## 57. Validation ownership

Validation ownership relies on clear, distinct responsibilities assigned internally within engineering logic instead of named individuals. Responsibilities are split logically:

- **Frontend tests:** Ensure UI components appropriately interface with the bridge without hanging or breaking.
- **Native bridge tests:** Ensure Swift/Obj-C boundary processes requests idempotently.
- **Audio tests:** Validate acoustic echo cancellation and latency bounds.
- **Model tests:** Validate deterministic generation boundaries and token-per-second constraints.
- **Tool tests:** Ensure correct execution and payload structure from LLM output.
- **Privacy tests:** Ensure bounded memory, local data constraints, and clear data deletion flows work.
- **Security tests:** Validate prompt injection mitigation and payload sanitization.
- **Physical-device review:** Responsible for measuring real thermal footprint and memory limits.
- **Final release decision:** Relies on the aggregation of all sub-systems passing their zero-tolerance safety bounds.

Require independent review for critical safety gates where practical.

## 58. Implementation-phase gate sequence

Define the required gate order:

```text
Documentation approved
    ↓
Native packaging spike
    ↓
Voice-loop spike
    ↓
Local-model spike
    ↓
Read-only FitCore integration
    ↓
Deterministic writes
    ↓
Model-requested writes
    ↓
Memory
    ↓
Long-session field validation
    ↓
Release candidate
```

A later phase may not begin merely because code exists; its prior gate must pass.

## 59. Repository-grounded validation map

| Validation area      | Existing test or infrastructure candidate | Current coverage    | Gap                   | Future action              |
| -------------------- | ----------------------------------------- | ------------------- | --------------------- | -------------------------- |
| E2E tests            | Playwright (`tests/e2e/*.spec.ts`)        | UI logic covered    | Model evaluation      | Add local model testing    |
| CI validation        | `.github/workflows/` scripts              | Basic PR test steps | AI benchmark triggers | Setup performance triggers |
| Unit tests           | Bun test (`tests/unit/`)                  | Types/functions     | AI context tests      | Mock LLM responses         |
| Data-integrity tests | `tests/e2e/data-integrity.spec.ts`        | Base mutations      | Tool safety           | Validate tool mutations    |

Use actual repository paths, test names, commands, and frameworks where discoverable.
Include:

- unit tests;
- Playwright;
- active-workout tests;
- data-integrity tests;
- offline tests;
- accessibility tests;
- analytics tests;
- CI;
- native testing gap;
- device-testing gap.

## 60. Initial validation subset

Recommend the smallest proof that must happen before broad implementation:

1. Package current FitCore UI on both phones.
2. Run a local STT → LLM → TTS conversation loop.
3. Demonstrate barge-in.
4. Demonstrate cancellation.
5. Demonstrate structured read-only tool request.
6. Demonstrate deterministic `225 for five`.
7. Demonstrate duplicate callback does not log twice.
8. Demonstrate Undo.
9. Run a 30-minute mixed session.
10. Run a 60-minute workout simulation.
11. Record latency, memory, thermal, battery, and errors.
12. Make a formal go/no-go decision.

## 61. Deferred validation

May be deferred until the baseline passes:

- optional Apple Foundation Models;
- multiple model packs;
- advanced multimodal input;
- meal-photo analysis;
- web research;
- cloud provider routing;
- cross-device synchronization;
- wake-word listening;
- Android.

## 62. Rejected validation approaches

Reject and explain:

- **Relying on GitHub README performance claims:** General hardware claims rarely apply to constrained mobile deployments running multiple concurrent sub-systems.
- **Simulator-only acceptance:** The iOS Simulator doesn't reflect actual thermal limits, battery degradation, or Bluetooth constraints.
- **iPhone 16-only acceptance:** Fails the primary hardware baseline of regular iPhone 15 compatibility.
- **Testing models independently but not concurrently:** Misses critical resource contention limits (e.g. LLM + TTS concurrently firing).
- **Using only average latency:** Fails to account for severe p99 spikes causing the assistant to feel "broken" mid-workout.
- **Ignoring thermal throttling:** Phones will inevitably heat up under sustained local inference load.
- **Running one short demo:** Doesn't reflect a real 60-minute session where context sizes inflate.
- **Testing only in a quiet room:** Unrealistic for gym environments with heavy background noise.
- **Using live personal health data unnecessarily:** Fails privacy requirements.
- **Enabling writes before stale-turn and idempotency tests pass:** Risks catastrophic database duplication/corruption.
- **Accepting malformed tool output because it “usually works”:** Structured calls require 100% strict adherence.
- **Measuring debug builds as final performance:** Xcode debug builds have massive CPU overheads.
- **Manually editing failed results:** All benchmarks must be reproducibly executed and automated where possible.

## 63. Open questions

The following questions remain unresolved and require empirical testing before final thresholds are established:

- **Exact provisional latency targets:** Are the current proposed targets (e.g. 1.5s first audible response) physically feasible on iPhone 15?
- **Exact sample sizes:** How many repeated tests are required to establish a statistically significant thermal baseline?
- **Available physical iPhone 15 model:** Are we testing on base 128GB units or higher capacities? Does it matter?
- **Sustainable Mac access:** How will CI/CD handle local LLM tests if a physical macOS runner isn't available?
- **Final instrumentation stack:** Are we relying solely on Xcode Instruments, or will custom in-app profiling be required?
- **Actual gym testing feasibility:** Can we reliably conduct controlled acoustic tests in public gyms, or do we rely heavily on simulated gym noise?
- **Battery-health normalization:** How do we account for 85% battery health devices vs 100% battery health devices in benchmarks?
- **External temperature controls:** Do we need a thermally controlled room for reproducible testing?
- **Final baseline model configuration:** Is quantization required at 4-bit, or can we run higher fidelity models locally?
- **Whether system TTS is the baseline:** Do we need enhanced TTS if standard iOS TTS falls within thermal limits better?
- **Required release-supported iOS versions:** Do we backport to iOS 17 or require iOS 18+ for specific Apple Neural Engine improvements?
- **Acceptable model-download size:** Is a 2GB model download acceptable, or must it be streamed in parts?
- **Human reviewer count:** How many individual human reviewers are necessary for subjective metrics like "conversational fluidity"?

## 64. Final recommendation summary

This validation plan asserts that the **iPhone 15 is the binding baseline** for all local FitCore Jarvis implementations. Validation must occur across defined phases (Readiness through Release Regression), proving out integrated voice loops and deterministic writes through constrained physical-device testing.

A comprehensive device, OS, and environmental matrix (including simulated gym noise and Bluetooth routing) is required. Key metrics center around latency (measured to p95 and worst-case), battery decay, thermal throttling, and hard data integrity gates. Provisional targets have been outlined but require controlled baselining to finalize.

Zero-tolerance safety gates, specifically around duplicate writes and privacy leaks, take precedence over conversational fluidity. Furthermore, any validation must encompass a true **long-session requirement** (30-60 minutes) to capture memory and thermal regressions over time, rather than relying on short demonstrations.

If the pipeline fails on the iPhone 15 baseline, a strict **degradation strategy** (e.g. dropping to System TTS or Text-only modes) must be followed rather than abandoning lower-end devices. Ultimately, the Go/No-Go decision process is rooted in empirical, reproducible data without relying on generalized third-party benchmarks. The **largest unresolved feasibility risk** remains the concurrent execution of STT, LLM inference, and TTS without triggering severe thermal fallback or unrecoverable latency spikes.

## 65. References

1. Apple Developer Documentation: Energy Diagnostics and MetricKit (https://developer.apple.com/documentation/metrickit/) - Retrieved 2024-03-20. _Supports battery and thermal baseline tracking logic._
2. Apple Developer Documentation: XCTest and Instruments (https://developer.apple.com/documentation/xcode/instruments) - Retrieved 2024-03-20. _Supports profiling strategy requirements._
3. OWASP Top 10 for Large Language Model Applications (https://owasp.org/www-project-top-10-for-large-language-model-applications/) - Retrieved 2024-03-20. _Supports prompt injection security testing requirements._
4. WER (Word Error Rate) Standard Evaluation Guidelines - OpenSpeech (https://github.com/openspeech-team/openspeech) - Retrieved 2024-03-20. _Supports quantitative speech-recognition metrics definitions._
5. Apple Privacy Manifest guidelines (https://developer.apple.com/documentation/bundleresources/privacy_manifest_files) - Retrieved 2024-03-20. _Supports strict data containment and recording definitions._
