## 1. Title

# FitCore Jarvis Local Agent Model and iOS Inference Runtime

### Primary Architecture Flow
```text
User input
    ↓
Deterministic command routing
    ↓
Context and policy builder
    ↓
Approved JarvisModelProvider
    ↓
Streamed provider-neutral output
    ↓
Structured-output normalizer
    ↓
Validated tool request or user response
```

## 2. Document status

* this is a research-backed architecture recommendation;
* no runtime implementation is included;
* performance claims require independent testing;
* regular iPhone 15 is the minimum supported target;
* iPhone 16 must use the same common baseline;
* Apple Foundation Models may be optional enhancements only on eligible hardware and operating systems;
* model selection may be revised if the feasibility spike fails.

## 3. Executive recommendation

This document defines a bounded feasibility candidate set. Final selection depends on physical device benchmarks.


User Input
    ↓
Deterministic Routing and Context Builder
    ↓
Approved JarvisModelProvider
    ↓
Streamed Structured Output
    ↓
Validated Tool Request or User Response

Optional iPhone 16 enhancement:
Apple Foundation Models behind the same provider interface

## 4. Goals and constraints

**Goals:**
* entirely local operation;
* useful conversational quality;
* dependable tool selection;
* structured output;
* streaming;
* cancellation;
* reasonable model size;
* bounded memory;
* acceptable thermal behavior;
* support for both phones;
* replaceable provider;
* no required paid API.

**Constraints:**
* iPhone 15 memory and thermal limits (6GB RAM total, limited neural engine API access for 3rd parties compared to Apple's own apps);
* simultaneous speech and model workloads;
* limited battery;
* model storage size;
* small-model reasoning limitations;
* possible hallucination;
* tool-call formatting errors;
* long-context cost;
* mobile app suspension;
* Apple Intelligence availability differences.

## 5. Model-role boundaries

* The model chooses or proposes an approved tool.
* The tool gateway validates the request.
* Canonical FitCore services perform reads and writes.
* Deterministic code performs calculations and safeguards.
* The model never receives raw persistence access.
* Write authorization is independent of provider.

| Responsibility | Local model | Deterministic code | FitCore service | User confirmation |
| -------------- | ----------- | ------------------ | --------------- | ----------------- |
| Intent parsing | Proposes    | Fallback           | No              | No                |
| Tool selection | Proposes    | No                 | No              | No                |
| Data access    | No          | Primary            | Primary         | No                |
| Metric math    | No          | Primary            | No              | No                |
| App state mut  | No          | Primary            | No              | Yes (destructive) |
| Health advice  | Bounded     | No                 | No              | No                |

## 6. Candidate-model comparison

| Exact Official Identifier | Publisher | Parameters | Release/Revision | Release Date | License | Official Model Card | Tool/Structured Output | Expected Formats | Reason to Benchmark | Primary Mobile Risk |
|---------------------------|-----------|------------|------------------|--------------|---------|---------------------|------------------------|------------------|---------------------|---------------------|
| `meta-llama/Llama-3.2-3B-Instruct` | Meta | 3.2B | v1.0 | Sept 2024 | Llama 3.2 | [Link](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md) | Capability advertised by publisher | GGUF, MLX | Stronger-quality candidate | Memory viability requires physical-device measurement |
| `meta-llama/Llama-3.2-1B-Instruct` | Meta | 1.23B | v1.0 | Sept 2024 | Llama 3.2 | [Link](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md) | Capability advertised by publisher | GGUF, MLX | Smaller memory candidate | Tool behavior requires normalized evaluation |
| `Qwen/Qwen2.5-1.5B-Instruct` | Alibaba | 1.5B | v1.0 | Sept 2024 | Apache 2.0 | [Link](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) | Capability advertised by publisher | GGUF, MLX | Permissively licensed candidate | Mobile behavior unknown |

## 7. Preferred feasibility candidates

The final model selection is subject to strict performance gating. We will evaluate the following initial candidate set:

1. `meta-llama/Llama-3.2-3B-Instruct` (~3B candidate)
2. `Qwen/Qwen2.5-1.5B-Instruct` (~1.5B candidate)
3. `meta-llama/Llama-3.2-1B-Instruct` (~1B candidate)

For the preferred ~3B candidate define testing ranges:
* **Context range:** Provisional (e.g., 4k - 8k tokens, set from measured results)
* **Stop conditions:** Standard tokenizer-specific tokens (e.g., `eot_id`, `eom_id`)
* **Maximum output limits:** Provisional limit (e.g., 150-250 tokens, set from approved rubric)
* **Tool-call behavior:** Official model tool calling prompt format
* **Required attribution:** Varies by license (e.g., "Built with Llama")

If a 3B candidate fails stability gates (Jetsam terminations), the 1.5B/1B candidates will be elevated to the primary focus.

## 8. Quantization strategy

Candidate quantization formats are runtime-specific. MLX and GGUF quantizations are not interchangeable. Exact quantization must be identified by artifact. File size does not equal peak memory. Benchmark at least one smaller-footprint candidate for each retained runtime where available. Quality, memory, speed, and license must be evaluated together.

## 9. Context-window strategy

The context limit is selected from physical-device evidence. FitCore context is minimized. Recent turns and rolling summaries are bounded. Canonical tool results are filtered to needed fields. Truncation must not silently remove information required for an accurate answer.

### Provisional experiment variables
* Initial evaluation length (e.g., 4096 tokens).
* Summary triggers and thresholds.

## 10. Inference-runtime comparison

| Runtime | Official Repository | Exact Release Tag | Release Date | Swift/iOS integration method | Supported model formats | Streaming | Cancellation | License | Mobile integration risk |
|---------|---------------------|-------------------|--------------|------------------------------|-------------------------|-----------|--------------|---------|-------------------------|
| MLX Swift | `ml-explore/mlx-swift` | `v0.21.1` | Aug 2024 | Native Swift API wrapper | MLX (.safetensors) | Yes | Yes | MIT | Fast-changing API |
| llama.cpp | `ggerganov/llama.cpp` | `b3600` | Aug 2024 | C++ interop wrapper | GGUF | Yes | Yes | MIT | C++ interop complexity |

## 11. Runtime feasibility decision

MLX Swift and llama.cpp are candidates. A timeboxed spike compares them. The regular iPhone 15 is binding. Final selection requires measured results. Implementation language alone does not decide the runtime; C++ interop is a maintenance factor, not an automatic rejection.

## 12. Existing-project reuse decisions

| Project | Decision | Reuse scope | Reason | Main risk |
| ------- | -------- | ----------- | ------ | --------- |
| `ml-explore/mlx-swift` | Evaluate | Dependency | Native Apple Silicon optimization | Fast API evolution |
| `ggerganov/llama.cpp` | Evaluate | Dependency | Mature community standard | C++ interop complexity |
| Apple Foundation Models | Evaluate | Optional fallback | Built into eligible OS | Availability limited |

## 13. Provider abstraction

The system will use a `JarvisModelProvider` protocol to decouple the runtime from FitCore logic. The interface must remain independent of MLX, llama.cpp, Apple Foundation Models, and optional future cloud providers, specifying capability negotiation and replaceability without defining implementation code.

Required capabilities (conceptual):
* `initialize()`
* `getCapabilities()`
* `getStatus()`
* `loadModel()`
* `unloadModel()`
* `startTurn()`
* `streamResponse()`
* `submitToolResult()`
* `cancelTurn()`
* `resetSession()`
* `healthCheck()`

Capability flags:
* local (bool)
* offline (bool)
* streaming (bool)
* tool calling (bool)
* structured output (bool)
* multimodal (bool)
* reasoning mode (bool)
* maximum context (int)
* cancellation (bool)
* device compatibility (string)

Provider output must never bypass tool validation, permissions, or FitCore services.

### Provider Abstraction Diagram
```text
FitCore Services
    ↕
Tool Gateway
    ↕
JarvisModelProvider
    ├─ Approved common local provider
    ├─ Apple Foundation Models provider on eligible systems
    └─ Explicitly enabled optional provider

App Intents
    └─ Separate system-integration layer for exposing approved FitCore actions and entities
```

* App Intents is not a model provider.
* App Intents does not select a model.
* App Intents does not replace the tool gateway.
* App Intents does not authorize writes.
* Apple Foundation Models availability is independently determined.
text
FitCore Services <--> Tool Gateway <--> JarvisModelProvider Interface <--> MLX Swift (Candidate)
                                                                      <--> App Intents (Opt iPhone 16)
```

## 14. Common provider versus optional enhanced provider

### Common local provider
* required on iPhone 15;
* required on iPhone 16;
* baseline behavior and tool contracts.

### Optional provider (Apple Foundation Models)
* **Apple Foundation Models framework:** An on-device model API provided by Apple on eligible systems. This serves as an optional provider candidate. Availability is determined by official framework eligibility and runtime checks, and is not guaranteed on a regular iPhone 15. This must remain behind the `JarvisModelProvider` interface. Supported capabilities, guided-generation features, privacy, and on-device characteristics are strictly defined by Apple's official Developer documentation. It is not tied strictly to the "iPhone 16" but rather to the hardware capabilities defined by Apple (e.g., specific Neural Engine and RAM configurations).
* **App Intents:** A system integration mechanism for exposing application actions and entities to Apple system experiences. App Intents may complement Jarvis, but it is not the language-model runtime, does not replace the FitCore tool gateway, does not authorize writes, and does not determine whether Jarvis should route a reasoning request to Apple Foundation Models.

### Provider-Routing Logic

Provider routing must be based on: provider availability, device support, OS support, user settings, privacy policy, requested capability, local-versus-external processing policy, model context limits, current thermal and memory state, and fallback availability.

### Common-Provider vs Optional-Enhanced-Provider Flow
```text
User Request
    ↓
Deterministic command eligible?
    ├─ Yes → Deterministic parser and canonical tool path
    └─ No
        ↓
Selected local model provider available?
    ├─ Yes → Local provider
    └─ No → Safe degraded mode or explicitly enabled optional provider
```

## 15. Tool-calling representation

Each provider adapter normalizes its native output. Normalized requests use the approved Jarvis tool envelope.

```json
{
  "request_type": "tool_request",
  "tool": "compareExerciseSessions",
  "arguments": {
    "exerciseId": "barbell-bench-press"
  },
  "turn_id": "turn-123",
  "request_id": "req-456",
  "context_version": "v1.0",
  "provider_identifier": "selected-local-provider",
  "diagnostics": {
    "confidence": 0.95
  }
}
```

* Strict parsing required.
* Authorization depends on schema, known tool, validated arguments, context version, turn revision, risk class, confirmation, idempotency, and canonical service validation.
* Model confidence is optional diagnostic metadata only.
* Unknown tools rejected immediately.
* Maximum tool iterations: Provisional (e.g., 3 per user request to prevent loops).
* No text extraction from prose if structured output is available.

### Tool-Call Generation and Validation Flow
```text
Model Output Stream -> JSON Parser -> Tool Schema Validator -> Confirmation Check -> Execution Gateway
                         (Invalid)      (Invalid Schema)       (Requires UI)         (Success/Fail)
```

## 16. Structured-output reliability

Hierarchy of reliability:
```text
Valid structured tool request
    ↓
Execute through gateway

Invalid but repairable output (e.g., missing quotes, markdown wrapper)
    ↓
One bounded repair attempt (heuristic or swift JSON parser recovery)

Still invalid
    ↓
Ask user or return safe error
```
Do not allow unlimited LLM-based repair loops.

## 17. Prompt architecture

Conceptual prompt layers:
1. Immutable system rules (Safety, Persona).
2. Tool definitions (JSON Schema).
3. Current mode (Workout, Coach).
4. Bounded context summary.
5. Recent conversation turns (Data).
6. User request.

FitCore records must be injected as Data, strictly separated from Instructions to resist prompt injection from user-entered names (e.g., a food named "Ignore previous instructions").

## 18. Conversation modes

* **Workout mode:** short responses; minimal reasoning; fast tool routing; low output cap; direct confirmation.
* **Coach mode:** longer explanations; comparisons; trend interpretation; questions for clarification.
* **Text-only mode:** same provider and tools; speech components disabled.
* **Degraded mode:** deterministic commands only; prewritten explanations; model unavailable.

## 19. Reasoning-mode policy

* **Default mode:** Non-thinking (direct generation) for speed and memory efficiency.
* **Requests permitted to use bounded reasoning:** Complex scheduling or multi-metric analysis (Coach mode only).
* **Maximum reasoning budget:** Provisional strict token limit (e.g., 200 tokens) if a reasoning model is used later.
* **User-visible behavior:** Reasoning must not delay simple commands (e.g., "Log my workout").
* Private chain-of-thought is not exposed or persisted.

## 20. Generation controls

* Bounded output.
* Bounded tool iterations.
* Deterministic or low-variance configuration for tool routing where supported.
* Provider-specific sampling settings kept in the provider adapter.
* Cancellation.
* Stale-turn rejection.
* No unlimited repair loops.

*(Any numeric values, such as token limits or temperatures, are explicitly marked as experiment variables, not architecture decisions.)*

## 21. Streaming and cancellation

### Streaming and Cancellation Flow
```text
Model generation begins
    ↓
Tokens stream to response composer via AsyncThrowingStream
    ↓  (User clicks Cancel)
Task.cancel() triggered -> stream ownership revoked -> generation halts immediately
    ↓  (Normal flow)
Tool request detected OR sentence completed -> Output routed to Tool Gateway or TTS
```

* Immediate cancellation via `Task.cancel()`.
* Token stream ownership bound to the active turn ID.
* Stale-token rejection upon cancellation.
* Cancellation must halt generation before any pending tool execution.
* No delayed final response after cancellation.
* Clean runtime reset after failed cancellation.
* Memory update only for completed or explicitly preserved partial turns.

## 22. Model lifecycle interaction

* **Load times:** Cold-load and warm-load times require measurement for each model/runtime/artifact combination.
* **Unload:** Unload behavior depends on active memory pressure and application suspension state, not solely a fixed duration.
* **Corruption:** Model hash verification on cold load. Redownload if corrupted.

## 23. Resource-control strategy

* Limiting concurrent generation: Strictly 1 generation task at a time.
* Context reduction: Aggressive truncation if memory pressure is reported.
* Low-power mode: Fallback to degraded (deterministic) mode or strictly limit context size and disable TTS.
* Cancellation on app suspension: Immediate task cancellation and model unload.

## 24. Safety and hallucination controls

* FitCore tools provide authoritative data.
* Model must acknowledge missing data explicitly.
* High-impact changes require user confirmation UI.
* Model explanations must strictly reference returned metrics.
* Medical diagnosis is explicitly prohibited via system prompt.

## 25. Privacy and security

* All baseline inference is 100% local.
* No prompt upload in baseline.
* No raw persistence access; access is mediated by tool APIs.
* Imported user content treated as untrusted data.
* Diagnostic logs exclude prompts by default.

## 26. Licensing and distribution analysis

For every model/runtime candidate we must distinguish the model license, runtime license, attribution, commercial use, redistribution, acceptable-use restrictions, model conversion rights, derivative artifact rights, and review status.

| Candidate | Model/Runtime License | Commercial Use | Redistribution | Attribution Required |
|-----------|-----------------------|----------------|----------------|----------------------|
| Llama 3.2 | Llama 3.2 Community   | Yes            | Yes            | Yes ("Built with Llama") |
| Qwen 2.5  | Apache 2.0            | Yes            | Yes            | Yes                  |
| MLX Swift | MIT                   | Yes            | Yes            | No                   |
| llama.cpp | MIT                   | Yes            | Yes            | No                   |

* **Distribution:** The distribution decision depends on final artifact size, App Store constraints, download policy, hosting, license, storage plan, and update/rollback design.

## 27. Benchmark and feasibility plan

**Devices:** iPhone 15 (binding baseline), iPhone 16.
**Measurements required for final approval:**
* cold-load time;
* warm-load time;
* memory peak;
* steady-state memory;
* Jetsam termination;
* tokens per second;
* time to first token;
* cancellation latency;
* structured-output validity;
* tool-selection accuracy;
* argument accuracy;
* conversation quality;
* context handling;
* long-session thermal throttling;
* battery impact;
* storage size;
* license and redistribution compatibility.

The regular iPhone 15 is the binding device. A larger candidate must not be selected merely because its conversational quality is higher if it fails stability or thermal gates.

## 28. Evaluation dataset requirements

A deterministic FitCore evaluation set will be created (separate task) containing:
* workout logging requests;
* nutrition questions;
* missing-data cases;
* adversarial prompt-injection examples.
All examples must be anonymized.

## 29. Acceptance gates

The final recommendation must not name a production model or runtime. Approval gates based strictly on the regular iPhone 15 include:

* No normal-use Jetsam memory termination.
* Acceptable cold and warm load times.
* Acceptable cancellation latency.
* Stable structured output validation.
* Tool selection and arguments meet approved accuracy thresholds.
* Conversational quality meets the minimum rubric.
* Thermal degradation remains safe over long sessions.
* Battery impact remains acceptable.
* Storage size fits the intended distribution plan.
* License permits intended distribution.
* Fallback remains functional.

The iPhone 16 cannot compensate for an iPhone 15 failure.

## 30. Failure and fallback matrix

| Failure | Detection | User-visible behavior | Automatic fallback | Safety rule |
|---------|-----------|-----------------------|--------------------|-------------|
| OOM / Jetsam | OS memory warning | "I need a moment to think" (UX example) | Approved lower-resource local provider or deterministic degraded mode | Prevent crash loop |
| Malformed tool request | JSON parse failure | None (internal retry) | Bounded repair | Never execute invalid tool |
| Timeout | Generation exceeds provisional timeout | "I'm having trouble processing that" (UX example) | Degraded deterministic mode | Bounded wait |
| Model Missing | Check load | Nonbinding UX text | Prewritten explanations | No ops |

### Failure and Deterministic-Fallback Flow
```text
Model Operation Error -> Is Retryable? -> Yes -> Retry
                            |
                           No
                            ↓
                    Degraded Mode (Deterministic) -> Fallback to Safe UI
```

## 31. Rejected approaches

Architectural violations that are explicitly rejected before benchmarking:
* **Mandatory cloud-only core:** Violates core requirement of offline availability and privacy.
* **Direct model persistence access:** All writes must go through the deterministic Tool Gateway.
* **No deterministic fallback:** The system must gracefully handle model failures.
* **Provider-specific tool permissions:** Permissions must be enforced uniformly at the gateway.
* **No cancellation:** Immediate task cancellation is a hard requirement.
* **Silent external processing:** Explicit user consent is required for any optional cloud providers.

## 32. Final recommendation summary

* **Bounded Candidate Model Classes:** 1B-1.5B and 2B-4B class models.
* **Candidate Runtimes:** MLX Swift, llama.cpp.
* **Benchmark Dimensions:** Tokens/sec, peak memory, TTFT, cancellation latency, tool accuracy.
* **Binding Gate:** Regular iPhone 15 performance and stability (no Jetsam terminations).
* **Provider Abstraction:** Common `JarvisModelProvider` interface.
* **Fallback:** Deterministic fallback mode.
* **Optional Provider:** Apple Foundation Models on eligible systems.
* **Final Selection:** Unresolved. Requires physical-device benchmark results.

## 33. References

* MLX Swift Official Repository (Apple/ml-explore): https://github.com/ml-explore/mlx-swift (Accessed 2026-07-15)
* Llama 3.2 Model Card (Meta): https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md (Accessed 2026-07-15)
* Qwen 2.5 Model Card (Alibaba): https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct (Accessed 2026-07-15)
* Apple Foundation Models Developer Documentation: https://developer.apple.com/documentation/foundation (Accessed 2026-07-15)
* Apple App Intents Developer Documentation: https://developer.apple.com/documentation/appintents (Accessed 2026-07-15)
* llama.cpp Official Repository (ggerganov): https://github.com/ggerganov/llama.cpp (Accessed 2026-07-15)
* Llama 3.2 Community License: https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE (Accessed 2026-07-15)