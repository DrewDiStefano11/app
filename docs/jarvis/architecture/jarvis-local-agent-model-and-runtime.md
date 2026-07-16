# FitCore Jarvis Local Agent Model and Runtime Architecture

## 1. Title and document status

This document is an architecture and feasibility recommendation for the FitCore Jarvis local agent model and runtime. It contains no runtime implementation.

The regular iPhone 15 is the binding minimum device for evaluating and selecting the local agent model and runtime. Final selection requires physical-device testing; no final model or runtime has been selected yet. This document may be revised if feasibility gates fail during physical testing.

## 2. Current repository state

FitCore currently has an existing cloud-backed Jarvis implementation. This includes:

- A mounted Jarvis interface.
- Groq and Gemini provider configuration.
- Read and write tools.
- Permission settings.
- Confirmation behavior.
- Audit records.
- Undo behavior.
- Direct connections to application state.

The planned local/native provider must migrate or wrap the existing implementation rather than create a separate uncontrolled assistant system.

## 3. Goals and constraints

The transition to a local agent model and runtime is guided by the following constraints and goals:

- No required paid API for the baseline functionality.
- Local and offline operation capabilities.
- iPhone 15 memory limits constrain the size and peak memory of any candidate model.
- Concurrent STT (Speech-to-Text), LLM (Large Language Model), and TTS (Text-to-Speech) pressure must be managed.
- Battery consumption must remain acceptable during interactions.
- Thermal throttling must be monitored and avoided during sustained usage.
- Model storage footprint must be bounded.
- Context limits must fit within available memory while supporting necessary functionality.
- Tool-call reliability must be demonstrably high.
- Cancellation of inference must be supported and prompt.
- Streaming of responses is required to minimize latency.
- Privacy must be maintained by keeping core operations local.
- Replaceable providers must be supported to allow fallback or user-selected enhancements.

## 4. Model-role boundaries

There is a strict responsibility separation between components:

- **Model inference:** Evaluates context and user input to generate structured tool calls or text responses.
- **Deterministic parsers:** Ensure output conforms to expected schema formats.
- **Tool gateway:** Routes validated tool calls to the correct domain logic.
- **Canonical FitCore services:** Own and manipulate the actual domain data.
- **Persistence:** Handles the storage of data changes securely.
- **Confirmation UI:** Requires explicit user approval before destructive or major changes.
- **Undo:** Provides robust rollback capabilities for user actions.
- **Validation and calculations:** Are strictly handled by FitCore services, not the model.

The model must never receive raw storage access or directly mutate FitCore state.

## 5. Candidate-model comparison

The following models are physical-device feasibility candidates. Memory and performance figures are estimates until measured.

### meta-llama/Llama-3.2-3B-Instruct

- **Official identifier:** `meta-llama/Llama-3.2-3B-Instruct`
- **Publisher:** Meta
- **Parameter count:** 3 Billion
- **Release/model-card source:** [Hugging Face / Meta Llama](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct)
- **License:** Llama 3.2 Community License
- **Expected quantization options:** 4-bit, 8-bit
- **Expected artifact format:** MLX format or GGUF
- **Structured-output evidence:** Proven instruction following and tool-calling capabilities.
- **Expected memory risk:** High risk of OOM (Out Of Memory) or application termination on baseline iPhone 15 if not heavily quantized.
- **Expected quality risk:** Moderate. Will it maintain tool-calling accuracy at heavy quantization?
- **Reason to benchmark:** Strong capabilities in a relatively small form factor.
- **Conditions that would eliminate:** Cannot run within Jetsam limits on iPhone 15 with STT/TTS active.

### meta-llama/Llama-3.2-1B-Instruct

- **Official identifier:** `meta-llama/Llama-3.2-1B-Instruct`
- **Publisher:** Meta
- **Parameter count:** 1 Billion
- **Release/model-card source:** [Hugging Face / Meta Llama](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct)
- **License:** Llama 3.2 Community License
- **Expected quantization options:** 4-bit, 8-bit, 16-bit
- **Expected artifact format:** MLX format or GGUF
- **Structured-output evidence:** Baseline capabilities, may require specialized prompting.
- **Expected memory risk:** Low to Moderate. Should fit easily within memory limits but must be verified.
- **Expected quality risk:** High. 1B models often struggle with complex tool selection and JSON structuring.
- **Reason to benchmark:** Extremely lightweight, potential for fast time-to-first-token and low battery impact.
- **Conditions that would eliminate:** Unacceptable tool-calling reliability or poor reasoning even with single-shot prompts.

### Qwen/Qwen2.5-1.5B-Instruct

- **Official identifier:** `Qwen/Qwen2.5-1.5B-Instruct`
- **Publisher:** Alibaba Cloud
- **Parameter count:** 1.5 Billion
- **Release/model-card source:** [Hugging Face / Qwen](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- **License:** Apache 2.0
- **Expected quantization options:** 4-bit, 8-bit
- **Expected artifact format:** MLX format or GGUF
- **Structured-output evidence:** Strong coding and structured generation scores for its size class.
- **Expected memory risk:** Moderate. Balances the 1B and 3B risks.
- **Expected quality risk:** Moderate.
- **Reason to benchmark:** Open license (Apache 2.0) and high efficiency/quality ratio.
- **Conditions that would eliminate:** Memory footprint exceeds limits during concurrent processing, or poor handling of English-only domain tools.

## 6. Quantization strategy

- MLX and GGUF quantization formats are not interchangeable.
- File size does not equal peak runtime memory (activations require additional memory).
- 4-bit quantization may be a candidate but is not automatically approved without quality testing.
- 8-bit quantization may be tested where feasible.
- Quality, speed, peak memory, storage, and thermal behavior must be measured together on device.

We do not claim that all 8-bit variants necessarily cause an out-of-memory termination; this must be tested on the iPhone 15.

## 7. Context-window strategy

The context window will be carefully managed:

- Bounded recent conversation history.
- Rolling summaries for older context.
- Filtered FitCore context (only necessary data).
- No full-database prompts.
- Physical-device-selected context limit (to be measured, e.g., do not lock production context to 4,096 tokens without evidence; it is an initial benchmark variable).
- Safe truncation for excessive lengths.
- Context-version identifiers to manage state.
- Stale-context rejection to prevent actions based on outdated information.

## 8. Inference-runtime comparison

Both MLX Swift and llama.cpp remain candidates until a feasibility spike selects one based on physical-device testing.

### MLX Swift

- **Official repository:** [https://github.com/ml-explore/mlx-swift](https://github.com/ml-explore/mlx-swift)
- **Exact tested version/commit requirements:** To be defined in the feasibility spike.
- **Model formats:** MLX format.
- **Swift integration:** Native Swift framework, highly integrated with Apple Silicon.
- **Streaming:** Supported natively.
- **Cancellation:** Supported.
- **Memory observability:** Standard iOS tooling.
- **Thermal observability:** Standard iOS tooling.
- **Maintenance burden:** Moderate (rapidly evolving).
- **License:** MIT.
- **Build complexity:** Low (Swift Package Manager).
- **Physical-device risk:** May lack optimization maturity compared to llama.cpp for arbitrary device constraints.

### llama.cpp

- **Official repository:** [https://github.com/ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp)
- **Exact tested version/commit requirements:** To be defined in the feasibility spike.
- **Model formats:** GGUF.
- **Swift integration:** Requires an isolated Swift/C++ integration layer. We do not reject llama.cpp solely because it uses C++ interoperability.
- **Streaming:** Supported.
- **Cancellation:** Supported via context flags.
- **Memory observability:** Available, but C++ allocations require careful profiling.
- **Thermal observability:** Available via system APIs.
- **Maintenance burden:** High (C++ bridging and rapid upstream changes).
- **License:** MIT.
- **Build complexity:** High (CMake/C++ integration into Xcode).
- **Physical-device risk:** Well-tested on iOS devices, but bridging can introduce overhead.

## 9. Provider abstraction

The system will use a provider-neutral conceptual `JarvisModelProvider` interface.

Capabilities:

- Initialize.
- Report capabilities.
- Load and unload model.
- Health check.
- Start turn.
- Stream output.
- Submit tool results.
- Cancel.
- Reset session.
- Report memory or thermal degradation where available.

This abstraction must support:

- A local model provider.
- An optional Apple Foundation Models provider.
- Existing cloud provider migration or fallback (only where user-enabled and policy-approved).
- A text-only degraded mode.

_Note on Apple frameworks:_

- Apple Foundation Models framework and App Intents are distinct.
- App Intents are a system-integration mechanism and are not an LLM inference provider.
- Apple Foundation Models are an optional enhanced provider only. They may not be required for the common iPhone 15 baseline. Do not assume Apple Foundation Models are available on all iOS 18 devices. Availability is tied to supported Apple hardware, supported operating-system versions, locale and region availability, and framework capability checks at runtime.

## 10. Structured-output and tool-calling strategy

A provider-neutral structured envelope will be used, containing at minimum:

- Protocol version.
- Provider identifier.
- Session ID.
- Turn ID.
- Request ID.
- Context version.
- Tool name.
- Arguments.
- Diagnostics separated from executable fields.

Requirements:

- Strict schema validation.
- Known-tool allowlist.
- Argument validation.
- Stale-turn rejection.
- Confirmation enforcement.
- Idempotency.
- One bounded repair attempt on malformed output.
- Deterministic safe fallback.
- No execution of malformed output.

Llama-specific prompt formats are not the canonical tool protocol; the protocol must be provider-neutral.

## 11. Existing Jarvis migration boundary

Future implementation must safely handle the existing cloud-backed runtime:

- Inventory current providers and settings.
- Inventory existing tools and permissions.
- Inventory mutation paths.
- Inventory API-key storage.
- Preserve or explicitly migrate existing user settings.
- Prevent simultaneous old and new write pipelines.
- Add canonical service wrappers for safe integration.
- Freeze expansion of direct store mutations by the current Jarvis.
- Maintain rollback capability for the new provider.

## 12. Resource-management strategy

To operate safely on physical devices:

- Lazy model loading.
- Unload policy controlled by memory, thermal conditions, backgrounding events, and active session status.
- Cancellation support.
- Progressive degradation.
- Shorter output limits when under pressure.
- Smaller model fallback where validated.
- System TTS fallback.
- Text-only fallback.
- Safe behavior during application suspension.
- No write replay after provider restart.

## 13. Physical-device feasibility program

The regular iPhone 15 is the pass/fail baseline. The simulator may assist development but may not make the final go/no-go decision.

Required testing includes:

- Cold model load.
- Warm model load.
- Peak memory usage.
- Sustained memory usage.
- Token latency.
- First-token latency.
- Cancellation latency.
- Structured-output validity.
- Correct tool selection.
- Invalid-tool rejection.
- Ten-turn conversations.
- 30-minute sessions.
- 60-minute workout sessions.
- Simultaneous STT, LLM, and TTS behavior.
- Application backgrounding and restoration.
- Memory warnings behavior.
- Thermal warnings behavior.
- Battery consumption.
- Jetsam termination boundaries.
- Storage requirements.

## 14. Decision matrix and fallback rules

Decisions will be made based on measured conditions on the physical device for:

- Primary candidate model selection.
- Smaller candidate model fallback selection.
- Runtime fallback selection.
- Activation of text-only mode.
- Activation of the optional Apple Foundation Models provider.
- No-go redesign (if all options fail feasibility).

We do not invent final numeric thresholds unless explicitly marked as provisional.

## 15. Licensing and distribution

The solution encompasses multiple licensing domains that must be separated:

- Runtime license (e.g., MIT for MLX or llama.cpp).
- Model license (e.g., Llama 3.2 Community License, Apache 2.0).
- Tokenizer license.
- Converted model artifact terms.
- Redistribution rights.
- Attribution requirements.
- Commercial-use conditions.
- Model-download terms.
- Exact source revision identifiers.

A permissive runtime license does not grant redistribution rights for model weights. Ensure full compliance with each respective model license for distribution.

## 16. Security and privacy boundaries

The following constraints are strictly required:

- No raw audio logging.
- No prompt or transcript diagnostics by default.
- No API keys inside prompts.
- No arbitrary file loading.
- Verified model manifests.
- SHA-256 or stronger integrity checks for downloaded weights.
- Trusted download sources only.
- Provider isolation.
- Local-first behavior.
- Explicit opt-in required for optional external providers.

## 17. Recommended initial feasibility subset

The recommended smallest experiment to answer critical questions:

- Package the current FitCore app in the chosen native container candidate.
- Initialize one small model candidate (e.g., Qwen2.5-1.5B or Llama-3.2-1B).
- Submit text.
- Stream output.
- Cancel output.
- Produce a provider-neutral mock tool request.
- Validate and reject malformed requests.
- Measure memory and thermal behavior on an iPhone 15.
- Do not enable production data writes during this spike.

## 18. Open questions and decision ownership

Unresolved questions to be answered during the feasibility spike phase:

- Which quantization level provides acceptable structured output accuracy for each candidate? (Feasibility Phase)
- Can the iPhone 15 sustain memory limits during simultaneous STT and 3B model inference? (Feasibility Phase)
- Which runtime (MLX Swift or llama.cpp) demonstrates superior thermal behavior for token streams? (Feasibility Phase)
- What is the safe context window limit for the selected model on an iPhone 15 before Jetsam intervenes? (Feasibility Phase)
