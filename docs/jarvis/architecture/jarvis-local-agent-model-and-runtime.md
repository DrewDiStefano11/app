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

- this is a research-backed architecture recommendation;
- no runtime implementation is included;
- performance claims require independent testing;
- regular iPhone 15 is the minimum supported target;
- iPhone 16 must use the same common baseline;
- Apple Foundation Models may be optional enhancements only on eligible hardware and operating systems;
- model selection may be revised if the feasibility spike fails.

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

- entirely local operation;
- useful conversational quality;
- dependable tool selection;
- structured output;
- streaming;
- cancellation;
- reasonable model size;
- bounded memory;
- acceptable thermal behavior;
- support for both phones;
- replaceable provider;
- no required paid API.

**Constraints:**

- iPhone 15 memory and thermal limits (6GB RAM total, limited neural engine API access for 3rd parties compared to Apple's own apps);
- simultaneous speech and model workloads;
- limited battery;
- model storage size;
- small-model reasoning limitations;
- possible hallucination;
- tool-call formatting errors;
- long-context cost;
- mobile app suspension;
- Apple Intelligence availability differences.

## 5. Model-role boundaries

- The model chooses or proposes an approved tool.
- The tool gateway validates the request.
- Canonical FitCore services perform reads and writes.
- Deterministic code validates, calculates, normalizes, and enforces safeguards.
- The model never receives raw persistence access.
- Write authorization is independent of provider.

| Responsibility | Local model | Deterministic code | FitCore service | User confirmation |
| -------------- | ----------- | ------------------ | --------------- | ----------------- |
| Intent parsing | Proposes    | Fallback           | No              | No                |
| Tool selection | Proposes    | No                 | No              | No                |
| Data access    | No          | Validates          | Primary         | No                |
| Metric math    | No          | Primary            | No              | No                |
| App state mut  | No          | Validates          | No              | Yes (destructive) |
| Health advice  | Bounded     | No                 | No              | No                |

## 6. Candidate-model comparison

| Exact Official Identifier          | Publisher | Parameters | Release Date | Release/Tag | License    | Official Model Card                                                                        | Structured-Output Claim                    | Expected Formats                     | Reason to Benchmark             | Primary Mobile Risk                                   |
| ---------------------------------- | --------- | ---------- | ------------ | ----------- | ---------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------ | ------------------------------- | ----------------------------------------------------- |
| `meta-llama/Llama-3.2-3B-Instruct` | Meta      | 3.2B       | Sept 2024    | `main`      | Llama 3.2  | [Link](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md) | Publisher advertises structured generation | Format support requires verification | Benchmark candidate             | Memory viability requires physical-device measurement |
| `meta-llama/Llama-3.2-1B-Instruct` | Meta      | 1.23B      | Sept 2024    | `main`      | Llama 3.2  | [Link](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md) | Publisher advertises structured generation | Format support requires verification | Smaller memory candidate        | FitCore tool-routing accuracy remains unmeasured      |
| `Qwen/Qwen2.5-1.5B-Instruct`       | Alibaba   | 1.5B       | Sept 2024    | `main`      | Apache 2.0 | [Link](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)                                  | Publisher advertises structured generation | Format support requires verification | Permissively licensed candidate | Quality must be evaluated using FitCore rubric        |

_(Note: Model artifact conversion and runtime-specific compatibility must be evaluated per candidate)_

## 7. Preferred feasibility candidates

The final model selection is subject to strict performance gating on the regular iPhone 15. We will evaluate the candidate set defined in the previous section.

For each retained candidate, define experiment variables appropriate to its tokenizer, runtime, artifact, and device behavior.

If a larger candidate fails stability gates (e.g., memory terminations), smaller memory candidates will be elevated to the primary focus.

## 8. Quantization strategy

Candidate quantization formats are runtime-specific. MLX and GGUF quantizations are not interchangeable. Exact quantization must be identified by artifact. File size does not equal peak memory. Benchmark at least one smaller-footprint candidate for each retained runtime where available. Quality, memory, speed, and license must be evaluated together.

## 9. Context-window strategy

The context limit is selected from physical-device evidence. FitCore context is minimized. Recent turns and rolling summaries are bounded. Canonical tool results are filtered to necessary fields. Truncation must not silently remove information required for an accurate answer. Context behavior may differ by runtime and artifact.

### Nonbinding experiment variables

- Initial evaluation length.
- Summary triggers and thresholds.

## 10. Inference-runtime comparison

| Runtime   | Official Repository    | Exact Release Tag / Commit | Release Date | Swift/iOS integration method | Supported model formats | Streaming | Cancellation | License | Mobile integration risk |
| --------- | ---------------------- | -------------------------- | ------------ | ---------------------------- | ----------------------- | --------- | ------------ | ------- | ----------------------- |
| MLX Swift | `ml-explore/mlx-swift` | `0.22.1`                   | Dec 2024     | Swift API wrapper            | MLX                     | Yes       | Yes          | MIT     | Integration maintenance |
| llama.cpp | `ggerganov/llama.cpp`  | `b4442`                    | Jan 2025     | C++ interop wrapper          | GGUF                    | Yes       | Yes          | MIT     | C++ interop complexity  |

## 11. Runtime feasibility decision

MLX Swift is a candidate. llama.cpp is a candidate. The regular iPhone 15 is binding. Final selection requires measured evidence. Implementation language is not itself a selection criterion. C++ interop is a maintenance factor, not an automatic rejection. No runtime is the baseline yet.

## 12. Existing-project reuse decisions

| Project                 | Decision | Reuse scope       | Reason                            | Main risk              |
| ----------------------- | -------- | ----------------- | --------------------------------- | ---------------------- |
| `ml-explore/mlx-swift`  | Evaluate | Dependency        | Native Apple Silicon optimization | Fast API evolution     |
| `ggerganov/llama.cpp`   | Evaluate | Dependency        | Mature community standard         | C++ interop complexity |
| Apple Foundation Models | Evaluate | Optional fallback | Built into eligible OS            | Availability limited   |

## 13. Provider abstraction

The system will use a `JarvisModelProvider` protocol to decouple the runtime from FitCore logic. The interface must remain independent of MLX, llama.cpp, Apple Foundation Models, and optional future cloud providers, specifying capability negotiation and replaceability without defining implementation code.

Required capabilities (conceptual):

- `initialize()`
- `getCapabilities()`
- `getStatus()`
- `loadModel()`
- `unloadModel()`
- `startTurn()`
- `streamResponse()`
- `submitToolResult()`
- `cancelTurn()`
- `resetSession()`
- `healthCheck()`

Capability flags:

- local (bool)
- offline (bool)
- streaming (bool)
- tool calling (bool)
- structured output (bool)
- multimodal (bool)
- reasoning mode (bool)
- maximum context (int)
- cancellation (bool)
- device compatibility (string)

Provider output must never bypass tool validation, permissions, or FitCore services.

## 14. Common provider versus optional enhanced provider

### Common local provider

- required on iPhone 15;
- required on iPhone 16;
- baseline behavior and tool contracts.

### Optional provider (Apple Foundation Models)

- **Apple Foundation Models framework:** An Apple on-device model framework, available only where the official framework reports support. It serves as an optional implementation of `JarvisModelProvider`, subject to current OS, device, locale, region, availability, and framework capability requirements. It is not guaranteed on the regular iPhone 15, and it is not required for core Jarvis functionality.

### Separate system-integration layer (App Intents)

- **App Intents:** A system-integration mechanism for exposing approved app actions and entities to Apple system experiences. It is separate from model inference. It is not an LLM runtime, not a model provider, not a tool authorization layer, not a substitute for the FitCore tool gateway, and not a reason to route a request to Foundation Models.

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

Provider adapters normalize native output. No provider-specific prompt format becomes the canonical tool format. Normalized requests use the approved Jarvis tool envelope.

```json
{
  "request_type": "tool_request",
  "tool": "compareExerciseSessions",
  "arguments": {
    "exerciseId": "barbell-bench-press"
  },
  "session_id": "sess-123",
  "turn_id": "turn-456",
  "request_id": "req-789",
  "context_version": "v1.0",
  "provider_identifier": "selected-local-provider",
  "protocol_version": "1.0",
  "diagnostics": {
    "provider_metadata": "..."
  }
}
```

- Strict parsing required.
- Authorization depends on schema validation, known tool, arguments, current turn, context version, risk class, confirmation, idempotency, and canonical service validation.
- Optional provider diagnostics can record non-authoritative metadata, but model-generated confidence must not appear in the normal execution envelope.

### Tool-Call Generation and Validation Flow

```text
Streamed Provider Output -> Provider Adapter -> Provider-Neutral Envelope -> Schema Validator -> Execution Gateway
```

## 16. Structured-output reliability

Hierarchy of reliability:

```text
Valid structured tool request
    ↓
Execute through gateway

Invalid but repairable output
    ↓
One bounded deterministic parsing or normalization attempt

Still invalid
    ↓
Ask user or return safe error
```

Do not allow unlimited repair loops.

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

- **Workout mode:** short responses; minimal reasoning; fast tool routing; low output cap; direct confirmation.
- **Coach mode:** longer explanations; comparisons; trend interpretation; questions for clarification.
- **Text-only mode:** same provider and tools; speech components disabled.
- **Degraded mode:** deterministic commands only; prewritten explanations; model unavailable.

## 19. Reasoning-mode policy

- **Standard response mode:** Default mode for speed and memory efficiency.
- **Requests permitted to use advanced capability:** Optional provider-specific advanced reasoning capability for complex tasks.
- **Maximum budget:** Bounded output and latency limits apply.
- **User-visible behavior:** Processing must not delay simple commands (e.g., "Log my workout").
- No hidden reasoning data is required, exposed, or persisted.

## 20. Generation controls

- Bounded output.
- Bounded tool iterations.
- Deterministic or low-variance configuration for tool routing where supported.
- Provider-specific sampling settings kept in the provider adapter.
- Cancellation.
- Stale-turn rejection.
- No unlimited repair loops.

_(Any numeric values, such as token limits or temperatures, are explicitly marked as experiment variables, not architecture decisions.)_

## 21. Streaming and cancellation

### Streaming and Cancellation Flow

```text
Model generation begins
    ↓
Tokens stream to response composer via provider interface
    ↓  (User clicks Cancel)
Provider cancellation primitive triggered -> stream ownership revoked -> generation halts immediately
    ↓  (Normal flow)
Tool request detected OR sentence completed -> Output routed to Tool Gateway or TTS
```

- Provider cancellation primitive enforces halts.
- Active-turn ownership dictates token stream validity.
- Stale-output rejection upon cancellation.
- Cancellation acknowledgment from the provider.
- Provider reset when cancellation fails.

## 22. Model lifecycle interaction

- **Load times:** Cold-load and warm-load times require measurement for each model/runtime/artifact combination.
- **Unload:** Unload behavior depends on active memory pressure and application suspension state, not solely a fixed duration.
- **Corruption:** Model hash verification on cold load. Redownload if corrupted.

## 23. Resource-control strategy

- Limiting concurrent generation: Strictly 1 generation task at a time.
- Context reduction: Aggressive truncation if memory pressure is reported.
- Low-power mode: Fallback to degraded (deterministic) mode or strictly limit context size and disable TTS.
- Cancellation on app suspension: Immediate task cancellation and model unload.

## 24. Safety and hallucination controls

- FitCore tools provide authoritative data.
- Model must acknowledge missing data explicitly.
- High-impact changes require user confirmation UI.
- Model explanations must strictly reference returned metrics.
- Medical diagnosis is explicitly prohibited via system prompt.

## 25. Privacy and security

- The required common baseline is designed for local on-device inference and must not require an external provider.
- No prompt upload in baseline.
- No raw persistence access; access is mediated by tool APIs.
- Imported user content treated as untrusted data.
- Diagnostic logs exclude prompts by default.

## 26. Licensing and distribution analysis

| Candidate         | Type    | Version/Revision   | License             | Commercial Use | Redistribution     | Attribution Required               | Acceptable-Use Restrictions | Conversion/Derivative Rights | Review Status |
| ----------------- | ------- | ------------------ | ------------------- | -------------- | ------------------ | ---------------------------------- | --------------------------- | ---------------------------- | ------------- |
| `Llama 3.2 1B/3B` | Model   | `v1.0` / Sept 2024 | Llama 3.2 Community | Yes            | See License        | Requires specific attribution text | Yes (e.g., safety policy)   | Subject to license           | Pending Legal |
| `Qwen 2.5 1.5B`   | Model   | `v1.0` / Sept 2024 | Apache 2.0          | Yes            | Yes (with notices) | Yes (notices in derivative works)  | General Apache 2.0          | Yes                          | Pending Legal |
| `MLX Swift`       | Runtime | `0.22.1`           | MIT                 | Yes            | Yes                | Yes (MIT Notice)                   | None                        | Yes                          | Pending Legal |
| `llama.cpp`       | Runtime | `b4442`            | MIT                 | Yes            | Yes                | Yes (MIT Notice)                   | None                        | Yes                          | Pending Legal |

- **Distribution:** The distribution decision depends on final artifact size, App Store constraints, download policy, hosting, license, storage plan, and update/rollback design.

## 27. Benchmark and feasibility plan

**Devices:** iPhone 15 (binding baseline), iPhone 16.
**Measurements required for final approval:**

- time to first token;
- sustained decode rate;
- peak memory;
- steady memory;
- KV-cache growth;
- cancellation latency;
- structured-output validity;
- tool selection;
- argument extraction;
- malformed-output rate;
- conversation rubric;
- thermal behavior;
- battery impact;
- storage size;
- license compatibility.

The regular iPhone 15 is the binding device. A larger candidate must not be selected merely because its conversational quality is higher if it fails stability or thermal gates.

## 28. Evaluation dataset requirements

A deterministic FitCore evaluation set will be created (separate task) containing:

- workout logging requests;
- nutrition questions;
- missing-data cases;
- adversarial prompt-injection examples.
  All examples must be anonymized.

## 29. Acceptance gates

The final recommendation must not name a production model or runtime. Approval gates based strictly on the regular iPhone 15 include:

- regular iPhone 15 passes;
- no normal-use crash loop;
- deterministic fallback works;
- no direct persistence access;
- cancellation works;
- provider output normalizes safely;
- tool execution remains provider-independent.

The iPhone 16 cannot compensate for an iPhone 15 failure.

## 30. Failure and fallback matrix

| Failure                | Detection                              | User-visible behavior | Automatic fallback                                                    | Safety rule                |
| ---------------------- | -------------------------------------- | --------------------- | --------------------------------------------------------------------- | -------------------------- |
| OOM / Jetsam           | OS memory warning                      | UX Safe Message       | Approved lower-resource local provider or deterministic degraded mode | Prevent crash loop         |
| Malformed tool request | JSON parse failure                     | None (internal retry) | Bounded repair                                                        | Never execute invalid tool |
| Timeout                | Generation exceeds provisional timeout | UX Safe Message       | Degraded deterministic mode                                           | Bounded wait               |
| Model Missing          | Check load                             | UX Safe Message       | Text-only response / Prewritten explanations                          | No ops                     |

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

- **Mandatory cloud-only core:** Violates core requirement of offline availability and privacy.
- **Direct model persistence access:** All writes must go through the deterministic Tool Gateway.
- **No deterministic fallback:** The system must gracefully handle model failures.
- **Provider-specific tool permissions:** Permissions must be enforced uniformly at the gateway.
- **No cancellation:** Immediate task cancellation is a hard requirement.
- **Silent external processing:** Explicit user consent is required for any optional cloud providers.

## 32. Final recommendation summary

- **Candidate Model Classes:** 1B-1.5B and 2B-4B class models.
- **Candidate Runtimes:** MLX Swift, llama.cpp.
- **Provider Abstraction:** Common `JarvisModelProvider` interface.
- **Binding Gate:** Regular iPhone 15 performance and stability.
- **Fallback:** Deterministic fallback mode.
- **Optional Provider:** Apple Foundation Models on eligible systems.
- **Final Selection:** Unresolved. Final selection requires measured evidence across defined benchmark dimensions.

## 33. References

- MLX Swift Official Repository: https://github.com/ml-explore/mlx-swift (Accessed 2026-07-15)
- Llama 3.2 Model Card (Meta): https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md (Accessed 2026-07-15)
- Qwen 2.5 Model Card (Alibaba): https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct (Accessed 2026-07-15)
- Apple Foundation Models Developer Documentation: https://developer.apple.com/documentation/foundation (Accessed 2026-07-15)
- Apple App Intents Developer Documentation: https://developer.apple.com/documentation/appintents (Accessed 2026-07-15)
- llama.cpp Official Repository: https://github.com/ggerganov/llama.cpp (Accessed 2026-07-15)
- Llama 3.2 Community License: https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE (Accessed 2026-07-15)
