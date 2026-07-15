# FitCore Jarvis End-to-End Architecture

## Document status

This document represents a proposed architecture baseline for FitCore's Jarvis assistant. Jarvis implementation has not yet begun. Specific model and framework selections remain subject to feasibility testing. The iPhone 15 is the minimum architecture target. Optional iPhone 16 enhancements must remain replaceable components. This document defines component boundaries and data flow, not final vendor selections.

## Architectural goals

The Jarvis architecture aims to achieve the following goals:

- Phone-only core operation without dependence on a continuously running personal computer.
- Local-first processing for core functionality.
- No mandatory recurring AI API charges.
- Consistent core behavior on both the iPhone 15 and iPhone 16.
- Fluid voice and text conversational capabilities.
- Robust interruption support during both generation and playback.
- Deep FitCore screen and state awareness.
- Safe tool execution through clearly defined gateways.
- Deterministic fast paths for essential commands (e.g., logging a set).
- Canonical FitCore business logic (no duplicate data or rules).
- Local memory and preference learning.
- Graceful fallback when components are unavailable.
- Replaceable inference providers.
- Testability at all layer boundaries.
- Privacy by design, enforcing strict boundaries on sensitive data.
- Low coupling between the FitCore React layer and AI providers.

## Architectural non-goals

This architecture does not initially attempt to provide:

- A system-wide Siri replacement.
- Permanent background listening while the FitCore app is closed.
- Unrestricted general internet research or browsing.
- Cloud-only processing architectures.
- Direct model access to persistent storage.
- Direct model access to arbitrary phone resources (e.g., contacts, raw filesystem).
- Medical diagnosis or health-condition forecasting.
- Autonomous destructive actions (e.g., silently deleting historical data).
- Support for every legacy iPhone generation.
- Android support in the initial release.
- Multiple simultaneous large language models running locally.
- Dependence on a home computer or external tether.

## High-level architecture

This architecture relies on robust encapsulation and defined boundaries between standard FitCore services, Native iOS integration, and the Agent loop.

```text
FitCore User
    ↓
FitCore UI and Jarvis Surface
    ↓
Input Controller
    ├── Text input
    └── Voice input
            ↓
Native Audio and Speech Layer
            ↓
Conversation Orchestrator
            ├── Deterministic Command Router
            ├── Local Agent Model Provider
            └── Optional Future Provider
                    ↓
FitCore Tool Gateway
                    ↓
Canonical FitCore Services
                    ↓
FitCore Data and Analytics
                    ↓
Response Composer
                    ↓
Text Transcript and Speech Output
```

Additionally, this architecture includes several distinct utility blocks:

- **Context builder:** Assembles the app's current route, date, selected chart, and active workout into a JSON envelope.
- **Recent conversation state:** Holds the user transcript and assistant text of the current active session.
- **Long-term memory:** Serves approved facts and preferences via a service layer without allowing direct table scans.
- **Interruption controller:** Immediately halts audio generation/playback on new VAD activity, incrementing the revision ID.
- **Model lifecycle manager:** Orchestrates downloading, verifying checksums, loading into memory, and safely unloading weights.
- **Permissions and confirmation layer:** Blocks destructive and potentially harmful operations (like substitutions or overwrites) pending explicit UI acceptance.
- **Undo manager:** Stores a rolling history of audit records from canonical services, enabling the reversal of Jarvis mutations.
- **Telemetry and diagnostics boundary:** Collects inference speeds, error metrics, and cache hits while filtering out any raw inputs or transcripts.

## Layered architecture

### Presentation layer

The presentation layer is responsible for providing the Jarvis button or entry point. It displays the transcript, microphone state, processing state, response output, confirmation dialogs, and Undo affordances. It also handles model-download status, offline status, user settings, and accessibility controls.

### FitCore frontend application layer

The FitCore frontend is responsible for determining the current route, selected date, selected chart, and active workout context. It handles invoking canonical services on behalf of Jarvis, displaying tool results in the normal UI context, providing relevant screen context to the agent, and handling navigation when instructed.

### Native iOS integration layer

The native layer holds direct responsibility for microphone access, audio session lifecycle, Bluetooth routing, echo cancellation, speech recognition, and text-to-speech. Additionally, it handles the local model runtime, model file management, iOS memory pressure and thermal-state handling, app lifecycle events, and the bridge communication logic with the web layer.

### Conversation orchestration layer

The orchestration layer is responsible for turn creation, turn cancellation, interruption, provider selection, and deterministic-command routing. It assembles prompts, manages the tool-call loop, streams response strings, enforces stale-turn rejection and maximum-step limits, handles generation cancellation, and makes response mode selections.

### Agent and tool layer

The tool layer handles tool registry registration, publishes tool schemas, validates arguments, checks permissions, routes to confirmation dialogs, ensures idempotency, initiates Undo registration, returns structured errors on failure, and manages tool result normalization.

### Canonical FitCore service layer

This layer owns the domain logic. It handles workout actions, timers, nutrition operations, recovery calculations, sleep data access, analytics, chart data, user goals, standard persistence, and domain validation.

This layer remains completely authoritative. The model and its gateway cannot bypass it to interact with data.

### Memory and context layer

The memory and context layer evaluates recent turns and the rolling summary. It determines the current topic and tracks active object references. It enforces user-approved preferences and approved limitations. It also handles saved insights, memory context retrieval for the prompt, memory expiration, and user deletion logic.

### Model and asset lifecycle layer

This layer manages the local inference engines by parsing model manifests, executing resumable downloads, performing checksum verification, enforcing versioning and compatibility checks, estimating storage constraints, loading into shared memory on demand, and immediately unloading upon system pressure. It gracefully handles fallback routines, migrations, and model rollbacks.

### Diagnostics layer

The diagnostics layer collects non-sensitive performance metrics (like TTFT), captures tool error codes, audits model status and audio states, and logs memory or thermal warnings during inference.

This layer absolutely must not log raw health data or raw audio by default.

## Web layer versus native layer

The table below clarifies which layer owns which domain responsibility.

| Capability                     | Web/TypeScript             | Native iOS                 | Shared contract          |
| ------------------------------ | -------------------------- | -------------------------- | ------------------------ |
| Current screen context         | Primary                    | Reads supplied snapshot    | Context envelope         |
| Microphone access              | Requests start/stop        | Primary                    | Audio-control API        |
| Local language-model inference | No direct ownership        | Primary                    | Agent request/stream     |
| FitCore tool execution         | Primary                    | Must not bypass            | Tool-call messages       |
| Persistent FitCore data        | Primary canonical services | No direct model access     | Tool results             |
| Voice output                   | Controls settings          | Primary                    | Speech request           |
| Confirmation UI                | Primary                    | May pause inference        | Confirmation event       |
| Long-term memory               | Domain-dependent           | Native storage may host it | Memory service interface |

The model must not call JavaScript persistence or native storage directly.

## Core component inventory

- **Jarvis UI Surface:** Provides the visual interface for text, transcripts, and controls. Inputs: Transcripts, processing states, audio levels, response text. Outputs: User intent (text submissions, voice toggle, confirmation clicks). Dependencies: React, FitCore design system. Prohibited: Direct database interaction or direct native audio session manipulation.
- **Jarvis Session Controller:** Manages the lifecycle of a Jarvis session on the web side. Inputs: UI actions, native bridge events. Outputs: Start/stop commands, UI state updates. Dependencies: UI Surface, Native Bridge. Prohibited: Execution of domain logic.
- **Native Bridge:** Serializes and deserializes communication between JS and Native iOS. Inputs: JSON payloads from either side. Outputs: Async responses, event streams. Dependencies: WebKit message handlers / Capacitor / React Native Bridge (TBD). Prohibited: Caching domain data.
- **Audio Session Manager:** Manages iOS audio routing, categories, and echo cancellation. Inputs: Start/stop intents, app lifecycle events. Outputs: Audio buffer stream, route change events. Dependencies: AVFoundation. Prohibited: Analyzing speech intent.
- **Voice Activity or End-of-Turn Detector:** Detects when a user begins and stops speaking. Inputs: Audio buffer stream. Outputs: Voice Activity Detection (VAD) events, End of Speech triggers. Dependencies: Audio Session Manager. Prohibited: Retaining raw audio.
- **Speech Recognition Provider:** Converts spoken audio into text. Inputs: Audio buffer stream. Outputs: Partial and final text transcripts. Dependencies: Native speech APIs (e.g., SFSpeechRecognizer or local Whisper). Prohibited: Executing commands based on transcripts.
- **Transcript Normalizer:** Cleans up transcription artifacts. Inputs: Raw final transcript. Outputs: Normalized string. Dependencies: None. Prohibited: Modifying domain meaning.
- **Deterministic Command Router:** Quickly matches exact or highly-confident command structures to skip LLM overhead. Inputs: Normalized transcript, Active Context. Outputs: Resolved command intent, or a "no match" signal. Dependencies: Tool Gateway. Prohibited: Making probabilistic guesses on ambiguous input.
- **Conversation Orchestrator:** The main state machine for a single turn of interaction. Inputs: Transcript, Context Envelope, Turn Identity. Outputs: Model provider requests, Response text stream, Tool requests. Dependencies: Provider Router, Tool Gateway. Prohibited: Bypassing permission validation.
- **Agent Model Provider:** The local LLM inference engine generating responses and tool calls. Inputs: System prompt, memory context, current transcript. Outputs: Text tokens, JSON tool call definitions. Dependencies: Native runtime (e.g., MLX), Model Lifecycle Manager. Prohibited: Calling tools directly, accessing files.
- **Provider Router:** Routes inference requests to the active model provider (Local, Remote, Enhanced). Inputs: Abstract inference request. Outputs: Standardized provider response stream. Dependencies: Configured providers. Prohibited: Altering FitCore tool contracts per provider.
- **Context Builder:** Aggregates current FitCore state into a serialized envelope. Inputs: FitCore app state (router, active workout, today's data). Outputs: Context Envelope JSON. Dependencies: FitCore Store. Prohibited: Passing unbounded arrays or raw image data directly to text prompts.
- **Prompt Builder:** Constructs the final system and user prompt for the model. Inputs: Context Envelope, Tools Registry schema, Conversation History. Outputs: Tokenized or formatted prompt string/array. Dependencies: Context Builder. Prohibited: Injecting hardcoded secret keys.
- **Tool Registry:** Maintains the list of accessible tools and their JSON schemas. Inputs: None. Outputs: List of ToolSpecs. Dependencies: None. Prohibited: Validating runtime business rules (only validates schema).
- **Tool Gateway:** Safely dispatches requested tools and captures results. Inputs: Tool name, raw arguments, turn token. Outputs: Structured ToolResult. Dependencies: Tool Registry, Permission Evaluator, Canonical FitCore Services. Prohibited: Changing canonical data directly (must use services).
- **Permission Evaluator:** Checks if a tool call requires confirmation or is prohibited. Inputs: Tool definition, current state. Outputs: Allow, Deny, RequiresConfirmation. Dependencies: Tool Registry. Prohibited: UI rendering.
- **Confirmation Manager:** Pauses orchestration to request user approval. Inputs: Pending tool call. Outputs: Accepted/Rejected event. Dependencies: Jarvis UI Surface. Prohibited: Executing the action itself.
- **Undo Manager:** Reverses a recently executed tool action. Inputs: Audit ID. Outputs: Success/Failure of undo. Dependencies: Canonical FitCore Services. Prohibited: Reversing unrelated data beyond the specific audit boundary.
- **Canonical FitCore Services:** Executes domain logic and persists data. Inputs: Validated domain payloads. Outputs: Success/Error states, new IDs. Dependencies: Persistent Storage. Prohibited: Generating natural language explanations.
- **Response Composer:** Aggregates tool results and model text into a final displayable response. Inputs: Streamed model text, Tool result summaries. Outputs: Formatted UI response object. Dependencies: None. Prohibited: Executing tools.
- **Speech Output Provider:** Converts response text into audio playback. Inputs: Text strings, audio session control. Outputs: Audio playback. Dependencies: Audio Session Manager, iOS AVSpeechSynthesizer. Prohibited: Playing audio when the session is interrupted or backgrounded without permission.
- **Interruption Controller:** Handles new input while generating or speaking. Inputs: New Voice Activity, manual cancel button. Outputs: Cancel signal, increment turn revision. Dependencies: Conversation Orchestrator, Speech Output Provider. Prohibited: Allowing stale tools to fire post-interruption.
- **Turn Revision Guard:** Prevents race conditions from delayed asynchronous callbacks. Inputs: Turn token, current revision ID. Outputs: Valid/Stale boolean. Dependencies: Interruption Controller. Prohibited: Issuing new tool calls.
- **Recent Conversation Store:** Holds transcripts and assistant responses for the current session. Inputs: Turns. Outputs: Conversation history array. Dependencies: None. Prohibited: Storing data indefinitely past session closure.
- **Long-Term Memory Store:** Holds explicit user preferences and saved facts. Inputs: Explicit save commands. Outputs: Key-value or vector records. Dependencies: Database layer. Prohibited: Automatically storing raw unconfirmed transcripts.
- **Memory Retrieval Service:** Fetches relevant long-term memories for the Prompt Builder. Inputs: Topic or context envelope. Outputs: Relevant memory strings. Dependencies: Long-Term Memory Store. Prohibited: Injecting unrelated large payloads.
- **Model Lifecycle Manager:** Handles readiness and availability of local models. Inputs: App launch, pressure events, download status. Outputs: Model readiness state. Dependencies: iOS storage APIs, ML Runtime. Prohibited: Silent background downloading over cellular by default.
- **Model Download Manager:** Downloads and verifies model assets. Inputs: Manifest URLs. Outputs: Checksum-verified files. Dependencies: NSURLSession. Prohibited: Corrupting previous models before the new one is verified.
- **Diagnostics Service:** Gathers health metrics. Inputs: Timing events, error events. Outputs: Local diagnostic logs. Dependencies: None. Prohibited: Logging raw audio or PHI.

## Primary end-to-end flows

### A. Deterministic workout command

Example: “225 for five.”

```text
[User] -> (Speak: "225 for five") -> [Microphone Capture]
                                            |
                                  [Speech Recognition]
                                            |
                                [Transcript Normalizer]
                                            |
                             [Deterministic Command Router]
                                            |
      [Match found: log set] ------> [Active Context Res.]
                                            |
                                     [Tool Gateway]
                                            |
                              [Canonical Service Execution]
                                            |
                                  [Undo Registration]
                                            |
[FitCore UI] <------------------- [Transcript Update]
      |
[Spoken Confirmation]
```

The language model is completely skipped unless confidence is insufficient or no match is possible.

### B. Conversational read request

Example: “How did my bench compare with last week?”

```text
[Transcript Normalizer]
         |
  [Context Creation] -> (Inject previous workouts, charts)
         |
[Agent Model Provider]
         |
  [Tool Gateway] -> (getLastExercisePerformance)
         |
  [FitCore Service] -> (Performs trend calculation)
         |
[Agent Model Provider] -> (Reads result, explains trend)
         |
  [Response Composer]
         |
 [Speech Output / UI]
```

### C. Conversational write request

Example: “Replace this exercise with an easier knee-friendly option.”

```text
[Agent Model Provider] -> (Understand intent, candidate lookup)
         |
[Proposal Generation] -> (Emit `suggestActiveWorkoutChange`)
         |
[Permission Evaluator] -> (Risk class: Requires Confirmation)
         |
   [Preview UI] ----> [User Confirm]
                             |
                      [Tool Gateway]
                             |
               [Canonical Service Execution]
                             |
                    [Undo Registration]
                             |
                  [Response Composer]
```

### D. Interruption flow

Example: Jarvis is speaking. User says: “Stop. Compare it with last month instead.”

```text
[User Speaks] -> [Voice Detector (VAD)] -> [Interruption Controller]
                                                    |
         +------------------------------------------+
         |
         |---> [Halt Speech Output]
         |
         |---> [Halt Agent Generation Token Stream]
         |
         |---> [Increment Turn Revision ID (N -> N+1)]
         |
         |---> [Reject Stale Callbacks] -> (Pending turn N tool calls drop)
         |
         +---> [Process New Transcript] -> (Turn N+1 begins normally)
```

### E. Text-only flow

The same conversation and tool architecture works without microphone or speech output. The flow begins directly at transcript processing from the virtual keyboard and completely skips VAD, audio session buffers, and text-to-speech generation.

### F. Component failure flow

Fallback diagram for gracefully handled degradation states.

```text
       [Jarvis System]
             |
[Is Core Component Available?]
             |
  +----------+----------+
  |          |          |
[No Speech] [No LLM] [No Storage]
  |          |          |
  v          v          v
[Text Mode] [Deterministic] [Notify / Offline]
             |
             v
        [FitCore UI]
```

Graceful fallback is mandatory for each scenario.

- **speech model unavailable:** UI falls back to text-input only with clear error message.
- **language model unavailable:** Router attempts deterministic commands only. Fallback text informs user model is missing.
- **text-to-speech unavailable:** System defaults to Text-Only flow, displaying transcripts normally.
- **tool failure:** Tool Gateway returns a structured error to the model. Model generates an apology and explains why it failed.
- **model download incomplete:** UI shows download progress; Jarvis acts as offline/unavailable until verified.
- **low memory / thermal pressure:** Model Lifecycle Manager unloads the local model. Jarvis enters fallback mode (deterministic only or temporarily disabled) until pressure clears.

## Turn and request lifecycle

State machine for a single conversational turn:

- **Idle:** entry condition: normal finish or cancellation. permitted transitions: Listening, Transcribing. cancellation behavior: none. tools may execute: no. speech may continue: no.
- **Listening:** entry condition: microphone toggle. permitted transitions: Transcribing, Canceled. cancellation behavior: stop audio session. tools may execute: no. speech may continue: no.
- **Transcribing:** entry condition: VAD detect/audio buffer. permitted transitions: Routing, Canceled. cancellation behavior: discard transcript. tools may execute: no. speech may continue: no.
- **Routing:** entry condition: normalized transcript ready. permitted transitions: Generating, Awaiting Tool, Canceled. cancellation behavior: abort routing. tools may execute: no. speech may continue: no.
- **Generating:** entry condition: sent to LLM. permitted transitions: Awaiting Tool, Composing, Interrupted. cancellation behavior: abort generation token. tools may execute: no. speech may continue: no.
- **Awaiting Tool:** entry condition: model emits JSON. permitted transitions: Executing Tool, Awaiting Confirmation, Failed. cancellation behavior: abort call. tools may execute: no. speech may continue: no.
- **Executing Tool:** entry condition: validation pass. permitted transitions: Generating, Composing, Failed. cancellation behavior: depends on service idempotency. tools may execute: yes. speech may continue: no.
- **Awaiting Confirmation:** entry condition: permission evaluator. permitted transitions: Executing Tool, Canceled. cancellation behavior: discard action. tools may execute: no. speech may continue: no.
- **Composing:** entry condition: response ready. permitted transitions: Speaking, Completed. cancellation behavior: none. tools may execute: no. speech may continue: no.
- **Speaking:** entry condition: TTS start. permitted transitions: Completed, Interrupted. cancellation behavior: stop TTS. tools may execute: no. speech may continue: yes.
- **Interrupted:** entry condition: new voice detect. permitted transitions: Transcribing. cancellation behavior: abort all. tools may execute: no. speech may continue: no.
- **Completed:** entry condition: flow finished normally. permitted transitions: Idle. cancellation behavior: none. tools may execute: no. speech may continue: no.
- **Failed:** entry condition: system error. permitted transitions: Idle. cancellation behavior: none. tools may execute: no. speech may continue: no.
- **Canceled:** entry condition: manual abort. permitted transitions: Idle. cancellation behavior: none. tools may execute: no. speech may continue: no.

Only the current active turn may execute tools or publish a final response.

## Turn revision and stale-result protection

To handle asynchronous environments and local processing lags, the system must utilize a unique session identifier, a unique turn identifier, and a monotonically increasing revision token.

A cancellation token must be issued whenever generation is interrupted. Tool-call execution tokens must match the response stream ownership. All stale callback rejections are dropped silently if their token mismatches the current revision.

Consequently, an interrupted turn cannot later execute tools. A canceled turn cannot update memory as completed. Delayed speech or model callbacks are explicitly discarded. Duplicate tool execution is prevented, and confirmation is structurally bound only to the originating turn and action preview.

## Context envelope architecture

The context envelope is a bounded JSON representation of relevant FitCore state:

```text
session
turn
currentRoute
selectedDate
activeWorkout
currentExercise
currentSet
previousSet
activeTimer
selectedChart
selectedMetric
activeFilters
goals
approvedPreferences
approvedLimitations
recentAction
pendingConfirmation
relevantRetrievedRecords
conversationSummary
recentTurns
availableTools
```

Context ownership belongs exclusively to the FitCore frontend. Refresh triggers occur on every turn generation. The size limits must fit local LLM context boundaries, relying on omission of irrelevant records to ensure a safe token budget. Sensitive-field filtering occurs completely pre-serialization. Timestamps are required to prevent using stale data via timestamp delta. Finally, the envelope acts as the serialization boundary that separates TypeScript (web) from native code (inference).

## Deterministic fast-path architecture

Deterministic handling precedes model routing to ensure speed, battery efficiency, and reliability for common actions without LLM overhead.

```text
Normalized transcript
    ↓
High-confidence deterministic match?
    ├── Yes → execute validated command
    └── No → route to agent model
```

Deterministic commands securely handle common numeric workout logging, timers, Undo execution, navigation, next or previous exercise actions, repeated set actions, and simple confirmations. Confidence matches use strict string matching or Regex thresholds; ambiguous phrasing immediately falls through to the Agent Model.

## Local model-provider abstraction

The architecture dictates a replaceable provider interface.

The interface requires implementations for initialization, readiness status checking, model loading and unloading, token streaming via callbacks, structured JSON tool-call generation, safe cancellation handling, context limit enforcement, basic health checks, and error reporting.

The provider categories support a local common provider target for iPhone 15 and iPhone 16. It may also support an optional enhanced provider for highly compatible device subsets, and an optional future remote provider.

The core provider MUST work on the iPhone 15. The optional provider cannot change tool contracts. All provider output must pass through the exact same validation and permission boundaries, and absolutely no provider may directly access FitCore storage.

## Tool-call loop architecture

The bounded loop executes via Gateway validation:

```text
[Agent Model Provider] -> (Tool Call JSON)
          |
  [Schema Validation]
          |
[Permission Classification]
          |
 [UI Confirmation Check]
          |
  [Canonical Execution]
          |
  [Structured Result]
          |
[Agent Model Provider] -> (Contextualizes result)
```

The loop must enforce maximum tool-call iterations per turn to avoid unbounded runaway recursion. It returns structured tool errors when parameters fail validation. It implements an execution timeout. It guarantees idempotency and supports cancellation. Logging occurs without sensitive payloads. Unknown tools are refused immediately without execution, and dynamic arbitrary code execution is strictly prohibited.

## Data ownership and source-of-truth boundaries

| Data Type            | Owner                     | Allowed Readers   | Allowed Writers  | Retention     |
| :------------------- | :------------------------ | :---------------- | :--------------- | :------------ |
| Canonical user data  | FitCore storage           | Services, UI      | FitCore services | Indefinite    |
| Domain logic         | FitCore services          | UI, Gateway       | None             | N/A           |
| Calculated metrics   | Analytics services        | Context Builder   | Analytics        | Dynamic       |
| Conversation records | Jarvis conversation store | Prompt Builder    | Orchestrator     | Session       |
| Approved memories    | Long-term memory store    | Retrieval service | Memory service   | User-managed  |
| Tool history         | FitCore services          | Undo Manager      | Gateway          | Rolling limit |

FitCore services own all domain logic, and FitCore storage owns the canonical user data. Analytics services own calculated metrics. The Jarvis conversation store owns the volatile conversation records, while the long-term memory store owns approved Jarvis facts. Model providers own no authoritative data.

Speech recognition output is strictly provisional until accepted. Model-generated explanations are not canonical records unless explicitly saved by the user. Confirmation previews are strictly temporary, and Undo records form a bounded operational history.

## Memory architecture at a high level

Memory divides into separate stores:

- active turn state (current generation run);
- recent conversation (last 5-10 turns);
- rolling summary (active session background);
- structured long-term memory (facts);
- saved insights (analytics trends);
- tool execution history (undo logs).

Memory retrieval must occur strictly through a service boundary with no raw database access by the model. It requires source and timestamp metadata. Users must retain explicit deletion and user correction rights. Memory expires based on relevance, and there is no automatic promotion of casual statements into permanent storage without bounds.

## Privacy and trust boundaries

Trust boundaries securely segregate components.

```text
[Audio Pipeline] ---(Boundary)---> [Orchestrator]
       |
[Inference Runtime] ---(Boundary)---> [FitCore Web/Frontend]
       |
[Tool Gateway] ---(Boundary)---> [Canonical Services & Storage]
       |
[Diagnostics] ---(Boundary)---> [User Context & Logs]
```

The system does not retain raw audio by default. Processing is local by default, and any external provider is disabled by default. Explicit disclosure is required before sending data externally.

Application secrets are never embedded in model prompts. Tool permissions enforce least-privilege logic, and structured redaction occurs on all logs. The model environment allows no arbitrary filesystem access, no arbitrary network access, and no arbitrary code execution.

## Model and asset lifecycle

The architectural flow coordinates safe asset updates:

```text
[Asset Manifest]
       |
[Compatibility Check]
       |
  [Storage Check]
       |
[Download (Resumable)]
       |
[Checksum Verification]
       |
    [Registration]
       |
  [Load on demand]
       |
   [Health check]
       |
 [Runtime Usage]
       |
[Unload / Evict] -> (Inactivity or Pressure)
```

Downloads are completely resumable and backed by stringent integrity checks via SHA verifications. Version pinning ensures alignment with app versions via a compatibility matrix. The system supports full rollback and deletion, providing proactive storage warnings. Model status reporting alerts the user, and the app never conducts silent multi-gigabyte downloads without permission. The UX exhibits safe behavior when assets are missing.

## Performance and resource-control architecture

The architecture includes mechanisms for model preloading when Jarvis or an active workout opens. It implements delayed unloading so the model remains hot for rapid sets. It enforces immediate responses to iOS memory-pressure callbacks and thermal-state callbacks. It can engage a battery-saving mode to shrink context or throttle generation. It enforces smaller contexts under general pressure, and significantly shorter responses in active workout mode. It gracefully drops to fallback speech output (standard iOS TTS) if neural TTS is too heavy. It can immediately cancel background generation and limit concurrent inference, avoiding simultaneous heavy model work where possible.

All final operational thresholds require empirical device validation on the physical iPhone 15 target.

## App lifecycle and background behavior

The expected architecture behaves consistently through backgrounding. App launch initializes providers lazily. An active workout start triggers pre-warming. App foregrounding reconnects the audio session. Temporary backgrounding explicitly revokes audio contexts and forces generation cancellation. Interruption by a phone call triggers immediate TTS suspension. Bluetooth disconnects drop the audio buffers. Screen locks act exactly as backgrounding. Upon application termination, session state clears. During restoration, the context reconnects without executing pending stale tools.

The first implementation does not promise continuous always-listening behavior while FitCore is entirely closed. Active workout data must remain completely safe even if Jarvis is suspended mid-run. In-progress model generation may be canceled on suspension to save device resources. Conversation restoration must never execute pending stale tools, and microphone and audio session state must always be visibly restored to avoid phantom listening.

## Failure and fallback matrix

| Failure                        | User impact          | Automatic fallback  | Data-safety rule     |
| ------------------------------ | -------------------- | ------------------- | -------------------- |
| microphone permission denied   | Cannot use voice     | Text-input only     | Do not capture audio |
| speech recognition unavailable | Cannot use voice     | Text-input only     | Discard transcripts  |
| local model unavailable        | Complex queries fail | Deterministic only  | Do not guess tools   |
| local model crashes            | Current turn fails   | Restart model       | Do not execute tools |
| TTS unavailable                | No voice output      | Transcript text     | Do not block UI      |
| model download incomplete      | Jarvis offline       | Deterministic only  | Preserve storage     |
| insufficient storage           | Download fails       | Notify user         | Abort download       |
| memory pressure                | System slows         | Unload model        | Prevent overheat     |
| thermal pressure               | Device hot           | Disable inference   | Prevent overheat     |
| Bluetooth disconnect           | Audio lost           | Device speaker/stop | Reset session        |
| malformed tool call            | Tool fails           | Return error        | Do not execute       |
| tool service failure           | Action not saved     | Return error        | Canonical state safe |
| missing FitCore data           | Cannot analyze       | Acknowledge missing | Do not invent data   |
| stale context                  | Action rejected      | Drop turn           | Prevent races        |
| app suspension                 | Generation stops     | Cancel turn         | Protect data         |
| optional provider unavailable  | Feature fails        | Revert to local     | Maintain local-first |

## Extension strategy

Future capabilities can be added without changing the core architecture. This architecture natively accommodates an optional enhanced iPhone 16 provider, an optional cloud LLM, optional cloud speech, optional image understanding, optional meal-photo analysis, and optional web research by mounting them behind the core routing layers. It can easily extend to a future Android client, future desktop client, or future home-gym device because the JS Context Builder and Turn Orchestrator remain platform agnostic.

Future extensions strictly use the same tool gateway, permission system, confirmation rules, context envelope structure, memory service, and provider interfaces.

## Architecture invariants

These invariants must never be broken:

1. Jarvis never writes directly to persistence.
2. Models never become the source of truth for FitCore metrics.
3. The iPhone 15 remains the core compatibility baseline.
4. Apple Intelligence remains optional.
5. Essential workout commands retain a deterministic local path.
6. Only the current active turn may execute tools.
7. Destructive actions require confirmation.
8. Reversible actions create Undo records.
9. Raw audio is not retained by default.
10. Optional cloud providers cannot become mandatory.
11. Provider changes cannot change FitCore tool contracts.
12. UI and Jarvis use canonical FitCore services identically.
13. Missing data must be acknowledged, not invented.
14. Model failures must not corrupt active workout data.
15. The user must always be able to stop speech and generation instantly.

## Architectural assumptions

The following implementation details remain assumptions that require later validation:

- performance and memory safety of native wrapper approaches (e.g. Capacitor vs pure SwiftUI);
- actual Time-to-First-Token performance of local inference on the iPhone 15 A16 Bionic chip;
- voice pipeline concurrency stability over extended Bluetooth sessions;
- acceptable local model quality inside constrained contexts;
- practical audio echo cancellation during open-mic states;
- Apple OS Bluetooth behavior during intermittent silence;
- exact available application RAM under load;
- maximum model storage size permitted by Apple App Store guidelines;
- overall battery and thermal impact during heavy sessions;
- Web-to-Native bridge latency performance;
- aggressive background lifecycle execution limits enforced by iOS 18.

## Open architecture questions

The following dependencies are intentionally unresolved by this proposal:

- final native packaging approach;
- final speech-recognition provider (e.g. Whisper.cpp vs native Speech API);
- final local model selection (e.g. Llama-3-8B vs internal quantization);
- final speech-output provider;
- final long-term-memory store implementation;
- exact bridge protocol for binary serialization;
- exact context limits for the token envelope;
- exact preload timing thresholds;
- exact model-update channel methodology;
- optional iPhone 16 provider policy constraints.

## Architecture review checklist

Future implementation teams must use this checklist:

- Does this change preserve iPhone 15 support?
- Does it keep the provider replaceable?
- Does it use canonical FitCore services?
- Does it avoid direct persistence access?
- Does it preserve stale-turn protection?
- Does it preserve confirmation and Undo rules?
- Does it preserve local fallback?
- Does it avoid mandatory cloud dependence?
- Does it expose safe cancellation?
- Does it avoid logging sensitive data?
