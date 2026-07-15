## 1. Title

# FitCore Jarvis Local Agent Model and iOS Inference Runtime

### Local Model Request Pipeline
```text
User Input (Text/Voice) -> Mode/Context Builder -> MLX Swift Runtime (Llama 3.2 3B)
-> Token Stream -> Tool Call / Response Parser -> Action / Text Output
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

**What the local model should handle:**
* natural-language intent;
* conversation continuity;
* tool selection;
* argument extraction;
* response phrasing;
* concise explanations;
* ambiguity clarification;
* summarization;
* structured memory suggestions.

**What it should not handle directly:**
* canonical calculations;
* database writes;
* raw persistence access;
* timer state;
* personal-record determination;
* exact macro totals;
* workout-volume calculations;
* final safety validation;
* permissions;
* destructive-action approval;
* arbitrary code execution;
* unrestricted medical conclusions.

| Responsibility | Local model | Deterministic code | FitCore service | User confirmation |
| -------------- | ----------- | ------------------ | --------------- | ----------------- |
| Intent parsing | Primary     | Fallback           | No              | No                |
| Tool selection | Primary     | No                 | No              | No                |
| Data access    | No          | Primary            | Primary         | No                |
| Metric math    | No          | Primary            | No              | No                |
| App state mut  | No          | Primary            | No              | Yes (destructive) |
| Health advice  | Bounded     | No                 | No              | No                |

## 6. Candidate-model comparison

| Exact Official Identifier | Publisher | Parameters | Release/Revision | License | Official Model Card | Tool/Structured Output | Expected Formats | Mobile Constraints | Reason to Test | Primary Risk |
|---------------------------|-----------|------------|------------------|---------|---------------------|------------------------|------------------|--------------------|----------------|--------------|
| `meta-llama/Llama-3.2-3B-Instruct` | Meta | 3.2B | Sept 2024 | Llama 3.2 | [Link](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md) | Yes | GGUF, MLX | Memory pressure on 6GB RAM | Strong tool calling baseline | Jetsam terminations on iPhone 15 |
| `meta-llama/Llama-3.2-1B-Instruct` | Meta | 1.23B | Sept 2024 | Llama 3.2 | [Link](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md) | Yes | GGUF, MLX | Weaker reasoning | Safely fits in 6GB RAM | Tool calling accuracy drops |
| `Qwen/Qwen2.5-1.5B-Instruct` | Alibaba | 1.5B | Sept 2024 | Apache 2.0 | [Link](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) | Yes | GGUF, MLX | Weaker reasoning | Excellent size-to-performance ratio | Hallucination on complex tasks |

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

Quantization formats differ significantly between runtimes (e.g., MLX uses specific safetensor layouts, llama.cpp uses GGUF, Core ML uses its own packaged formats).

* **4-bit Class:** Represents the preferred target for mobile inference footprint, but physical-device measurement is required to determine viability.
* **Memory vs. File Size:** Model-size estimates on disk must not be equated to peak memory. Memory usage must account for runtime buffers, KV cache growth, tokenizer state, and framework overhead.
* **Recommendation:** Test 4-bit class quantizations across MLX and GGUF. We will not ship separate model variants for iPhone 16 unless benchmark conditions justify the added distribution complexity.

## 9. Context-window strategy

**Strategy:** Mobile Bounded Context
While Llama 3.2 supports up to 128k context, this is prohibitively expensive in memory and processing time (Time to First Token) on a mobile device.

* **Recommended initial practical context range:** Provisional length (e.g., 4096 tokens).
* **Context-overflow handling:** FIFO sliding window for recent turns, combined with a rolling summary of older turns.
* **Summary refresh:** When context reaches 80% of limit, summarize the oldest 50% of the active conversation.
* **Record truncation:** Database query results passed to tools must be aggressively truncated (e.g., top 5 records) before entering the prompt.
* **Tool-result compression:** Only pass essential fields back to the model, omitting metadata.
* **Sensitive-field filtering:** Strip identifiable keys before insertion into the context.

## 10. Inference-runtime comparison

| Runtime | Official Repository | Current Release/Tag | Swift integration approach | Supported model formats | Streaming | Cancellation | License | Known mobile integration risks |
|---------|---------------------|---------------------|----------------------------|-------------------------|-----------|--------------|---------|--------------------------------|
| MLX Swift | `ml-explore/mlx-swift` | `v0.21.0` (or latest pinned) | Native Swift API wrapper | MLX (.safetensors) | Yes | Yes | MIT | Fast changing API |
| llama.cpp | `ggerganov/llama.cpp` | `b4600` (or latest pinned) | C++ interop wrapper | GGUF | Yes | Yes | MIT | C++ interop complexity |

## 11. Final runtime selection

The final runtime selection will be determined by benchmarking MLX Swift against llama.cpp on the iPhone 15.

* **MLX Swift:** Apple's machine learning framework tailored for unified memory. Fast API evolution.
* **llama.cpp:** Mature community standard with broad GGUF support.

**Recommendation:** Conduct a timeboxed spike comparing MLX Swift and llama.cpp for peak memory and token speed before locking the final runtime.

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

Provider output is normalized into the approved Jarvis tool-request envelope.

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
  "provider_identifier": "local-mlx",
  "diagnostics": {
    "confidence": 0.95
  }
}
```

* Strict parsing required.
* Unknown tools rejected immediately.
* Argument validation is performed strictly against predefined schemas.
* Maximum tool iterations: 3 per user request to prevent loops.
* No text extraction from prose if structured output is available.
* A model-generated confidence value may exist only as optional diagnostics and cannot affect authorization.

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
* **Maximum reasoning budget:** Strict token limit (e.g., 200 tokens) if a reasoning model is used later.
* **User-visible behavior:** Reasoning must not delay simple commands (e.g., "Log my workout").
* Private chain-of-thought is not exposed or persisted.

## 20. Generation controls

* **Maximum output tokens:** 250
* **Maximum tool-call steps:** 3
* **Temperature:** 0.1 (Workout mode / Tool selection), 0.4 (Coach mode)
* **Repetition penalty:** 1.1 - 1.15
* **Stale-turn revision:** Discarded automatically
* **Streaming:** Sentence-level chunking for text-to-speech synchronization.

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

* **Cold load:** App launch or explicit wake. Takes 1-3 seconds.
* **Unload:** Aggressive unloading upon app suspension (backgrounding) or significant OS memory pressure warnings.
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

* **Model (Llama 3.2):** Llama 3.2 Community License. Permits commercial use. Requires specific attribution ("Built with Llama").
* **Runtime (MLX Swift):** MIT License. Unrestricted commercial use.
* **Distribution:** Due to the ~2.6GB size, the model *must* be downloaded post-install, not bundled in the App Store binary, to avoid hitting App Store size limits and cellular download restrictions.

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
| OOM / Jetsam | OS memory warning | "I need a moment to think" | Unload, switch to 1B model | Prevent crash loop |
| Malformed tool request | JSON parse failure | None (internal retry) | Bounded repair (1x) | Never execute invalid tool |
| Timeout | Generation exceeds provisional timeout | "I'm having trouble processing that" | Degraded/Offline deterministic mode | Bounded wait |
| Model Missing | Check load | "I'm downloading my brain" | Prewritten explanations | No ops |

### Failure and Deterministic-Fallback Flow
```text
Model Operation Error -> Is Retryable? -> Yes -> Retry (Max 1x)
                            |
                           No
                            ↓
                    Degraded Mode (Deterministic) -> "I'm having trouble, try a button" -> Fallback to Safe UI
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
* Apple Foundation Models / App Intents Developer Documentation: https://developer.apple.com/documentation/appintents (Accessed 2026-07-15)
* llama.cpp Official Repository (ggerganov): https://github.com/ggerganov/llama.cpp (Accessed 2026-07-15)
* Llama 3.2 Community License: https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE (Accessed 2026-07-15)