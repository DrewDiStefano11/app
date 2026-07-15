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
* Apple-provided models may be optional enhancements only;
* model selection may be revised if the feasibility spike fails.

## 3. Executive recommendation

Common baseline:
Llama 3.2 3B Instruct in INT4 quantization (Q4_K_M equivalent)
    ↓
MLX Swift runtime
    ↓
Swift provider wrapper
    ↓
Bounded context and structured FitCore tool calls

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

| Model | Parameters | Typical quantized size | Tool or structured-output support | Context | License | Strengths | Risks | iPhone 15 suitability |
|-------|------------|------------------------|-----------------------------------|---------|---------|-----------|-------|-----------------------|
| Qwen2.5-1.5B-Instruct | 1.5B | ~1.1GB (INT4) | Yes | 32k | Apache 2.0 | Very fast, small footprint | Weaker reasoning | High |
| Llama 3.2 1B Instruct | 1.23B | ~1.3GB (INT4) | Yes | 128k | Llama 3.2 (Custom) | Official mobile focus | Tool-calling accuracy | High |
| **Llama 3.2 3B Instruct** | 3.2B | ~2.6GB (INT4) | Yes | 128k | Llama 3.2 (Custom) | Excellent tool calling, good reasoning | Memory pressure | Medium-High (Requires testing) |
| Gemma-2-2b-it | 2.6B | ~2GB (INT4) | Yes | 8k | Gemma | High quality generation | Tool calling can be brittle | Medium |
| Phi-3-mini-4k-instruct | 3.8B | ~2.3GB (INT4) | Yes | 4k | MIT | Strong reasoning | Specific prompt format, context limit | Medium |

*(Sizes are estimated for 4-bit INT4 / Q4 formats)*

## 7. Final baseline-model selection

**Baseline Model:** Llama 3.2 3B Instruct

* **Exact official model family:** Meta Llama 3.2 (Instruct)
* **Recommended initial parameter size:** 3.2 Billion
* **Recommended quantization range to test:** 4-bit (INT4 / Q4_K_M equivalent)
* **Expected model-file-size range:** 2.0GB - 2.8GB
* **Recommended context range:** 4k - 8k tokens (mobile bounded)
* **Recommended non-thinking or thinking mode:** Non-thinking (direct generation for speed)
* **Maximum output limits:** ~150-250 tokens per turn
* **Stop conditions:** Standard Llama 3 `eot_id`, `eom_id`
* **Repetition controls:** Enabled (penalty ~1.1)
* **Tool-call behavior:** Official Llama 3 tool calling prompt format
* **License:** Llama 3.2 Community License
* **Required attribution:** Required ("Built with Llama")
* **Known risks:** iPhone 15 has 6GB RAM; a 2.6GB model leaves ~3.4GB for OS and app, which may cause Jetsam memory terminations under heavy load. A fallback to Llama 3.2 1B must be tested if 3B fails stability gates.

## 8. Quantization strategy

* **4-bit (INT4):** Striking the best balance between memory footprint, inference speed, and quality. A 3B model at INT4 requires ~2.6GB of memory, which is viable on a 6GB iPhone 15.
* **8-bit (INT8):** Better quality but doubles the memory requirement to ~4-5GB, which is highly likely to cause app termination on an iPhone 15 when combined with system overhead.
* **Recommendation:** Primary quantization for both iPhone 15 and iPhone 16 should be 4-bit. Both phones should initially use the same model file to simplify distribution and caching. We will not ship separate variants for iPhone 16 unless benchmark conditions prove 4-bit is insufficient for quality on iPhone 16 and 8-bit fits cleanly within its memory.

## 9. Context-window strategy

**Strategy:** Mobile Bounded Context
While Llama 3.2 supports up to 128k context, this is prohibitively expensive in memory and processing time (Time to First Token) on a mobile device.

* **Recommended initial practical context range:** 4096 tokens.
* **Context-overflow handling:** FIFO sliding window for recent turns, combined with a rolling summary of older turns.
* **Summary refresh:** When context reaches 80% of limit, summarize the oldest 50% of the active conversation.
* **Record truncation:** Database query results passed to tools must be aggressively truncated (e.g., top 5 records) before entering the prompt.
* **Tool-result compression:** Only pass essential fields back to the model, omitting metadata.
* **Sensitive-field filtering:** Strip identifiable keys before insertion into the context.

## 10. Inference-runtime comparison

| Runtime | iOS support | Swift integration | Metal/ANE support | Model formats | Streaming | Cancellation | Quantization | License | Maturity | Risks |
|---------|-------------|-------------------|-------------------|---------------|-----------|--------------|--------------|---------|----------|-------|
| MLX Swift | Yes | Excellent (Native) | Metal (Unified Mem) | MLX (.safetensors) | Yes | Yes | Native MLX | MIT | Rapidly maturing | Fast changing API |
| llama.cpp | Yes | Good (Wrapper) | Metal | GGUF | Yes | Yes | GGUF | MIT | High | C++ interop overhead |
| ExecuTorch | Yes | Moderate | Metal/ANE | CoreML/PTE | Yes | Difficult | Edge | Custom | Moderate | Complex build process |
| CoreML | Yes | Native | ANE/Metal | MLPackage | Yes | Yes | Native | Apple | High | Static graphs, hard to update models |

## 11. Final runtime selection

**Selected Runtime:** MLX Swift

* **Why it wins:** MLX is Apple's own machine learning framework tailored specifically for Apple Silicon (unified memory architecture). It provides native Swift APIs, completely bypassing C++ interop layers, leading to highly efficient Metal utilization and minimal overhead. Recent community benchmarks show MLX outperforming llama.cpp in token generation speed for smaller models on iOS.
* **Swift integration:** Native Swift API.
* **Wrapper:** We will wrap it behind a `JarvisModelProvider` adapter, rather than exposing MLX directly to FitCore logic.
* **Model loading:** `MLXLLM` library utilities.
* **Streaming:** Async sequences (`AsyncThrowingStream`).
* **Cancellation:** Native Swift structured concurrency (`Task.cancel()`).
* **Version:** Pin to a specific recent stable release tag of `mlx-swift`.
* **Decision:** Wrap behind FitCore adapter.

## 12. Existing-project reuse decisions

| Project | Decision | Reuse scope | Reason | Main risk |
| ------- | -------- | ----------- | ------ | --------- |
| `ml-explore/mlx-swift` | Use directly | Dependency | Native Apple Silicon optimization | Fast API evolution |
| `ggml-org/llama.cpp` | Reject | N/A | MLX provides better native Swift/Metal integration | C++ interop complexity |
| `mattt/llama.swift` | Reject | N/A | MLX chosen instead | Wrapper maintenance |
| ExecuTorch | Reject | N/A | Complex build, less flexible than MLX | Build complexity |
| CoreML / ANE | Reject | N/A | ANE is memory efficient but slower for LLMs, rigid format | Less flexible generation |
| Apple Foundation Models | Wrap | Optional fallback | Built into iOS 18+ on iPhone 16 | Availability limited to newer devices |

## 13. Provider abstraction

The system will use a `JarvisModelProvider` protocol to decouple the runtime from FitCore logic.

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
FitCore Services <--> Tool Gateway <--> JarvisModelProvider Interface <--> MLX Swift (Baseline)
                                                                      <--> App Intents (Opt iPhone 16)
```

## 14. Common provider versus optional enhanced provider

### Common local provider (MLX Swift)
* required on iPhone 15;
* required on iPhone 16;
* baseline behavior and tool contracts.

### Optional iPhone 16 provider (Apple Foundation Models / App Intents)
* Supported requests: General knowledge, deep OS integration.
* Provider-routing criteria: If the user request matches an App Intent registered with Apple Intelligence.
* Fallback: Transparent fallback to MLX Swift if Apple Intelligence cannot handle the request or is unavailable (e.g., region locks, not downloaded).
* **Recommendation:** Included as a phase-two enhancement. The first version must focus entirely on stabilizing the common MLX Swift baseline to ensure feature parity across iPhone 15 and 16.

### Common-Provider vs Optional-Enhanced-Provider Flow
```text
User Request
    ↓
Intent Router (Is Apple App Intent?)
   /      YES        NO (or unsupported device)
 |          |
Apple      MLX Swift
Found.     Common Provider
Model
```

## 15. Tool-calling representation

Structured tool-request format: JSON Schema conforming to Llama 3's expected tool calling structure.

```json
{
  "type": "tool_request",
  "tool": "compareExerciseSessions",
  "arguments": {
    "exerciseId": "barbell-bench-press",
    "comparison": "previous_matching_session"
  },
  "turn_id": "turn-123",
  "confidence": 0.95,
  "requires_confirmation": false
}
```

* Strict parsing required.
* Unknown tools rejected immediately.
* Argument validation is performed strictly against predefined schemas.
* Maximum tool iterations: 3 per user request to prevent loops.
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

**Devices:** iPhone 15, iPhone 16.
**Model configs:** Llama 3.2 3B 4-bit (Primary), Llama 3.2 1B 4-bit (Fallback).
**Measurements:**
* Time to first token (Target: < 1.5s).
* Tokens per second (Target: > 20 tok/s).
* Memory footprint (Target: < 3GB peak).
* Jetsam crash rate over 10 consecutive long-context turns.

## 28. Evaluation dataset requirements

A deterministic FitCore evaluation set will be created (separate task) containing:
* workout logging requests;
* nutrition questions;
* missing-data cases;
* adversarial prompt-injection examples.
All examples must be anonymized.

## 29. Acceptance gates

* Llama 3.2 3B loads on iPhone 15 without Jetsam memory termination during a cold boot.
* Tool requests are structurally valid > 95% of the time.
* Output remains concise in workout mode.
* Cancellation cleanly stops memory allocation and generation.

## 30. Failure and fallback matrix

| Failure | Detection | User-visible behavior | Automatic fallback | Safety rule |
|---------|-----------|-----------------------|--------------------|-------------|
| OOM / Jetsam | OS memory warning | "I need a moment to think" | Unload, switch to 1B model | Prevent crash loop |
| Malformed tool request | JSON parse failure | None (internal retry) | Bounded repair (1x) | Never execute invalid tool |
| Timeout | Generation takes > 10s | "I'm having trouble processing that" | Degraded/Offline deterministic mode | Bounded wait |
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

* **Cloud-only model:** Violates core requirement of offline availability and privacy.
* **Apple Foundation Models as ONLY provider:** Violates requirement to support standard iPhone 15.
* **llama.cpp:** Rejected in favor of MLX Swift for better native integration and potentially higher token throughput on recent Apple Silicon.
* **8-bit Quantization:** Rejected due to excessive memory requirements (>4GB) for a 3B model on a 6GB iPhone 15.

## 32. Final recommendation summary

* **Common model:** Llama 3.2 3B Instruct
* **Runtime:** MLX Swift
* **Swift integration:** Native wrapper around `mlx-swift`
* **Quantization:** 4-bit (INT4)
* **Context range:** 4096 tokens
* **Reasoning policy:** Non-thinking default
* **Tool-call format:** Llama 3 JSON Tool Schema
* **Provider abstraction:** `JarvisModelProvider` protocol
* **Optional iPhone 16 strategy:** Phase 2 enhancement via App Intents
* **Most important unresolved risk:** Jetsam memory terminations on iPhone 15 with 6GB RAM running a 2.6GB model alongside FitCore UI.
* **Required feasibility gate:** Sustained 10-turn memory stress test on physical iPhone 15.

## 33. References

* MLX Swift Repository: https://github.com/ml-explore/mlx-swift (Accessed 2024-05-18)
* Meta Llama 3.2 Model Card: https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct (Accessed 2024-05-18)
* MLX Community Benchmarks: Various Apple Silicon LLM benchmark reports (Accessed 2024-05-18)
