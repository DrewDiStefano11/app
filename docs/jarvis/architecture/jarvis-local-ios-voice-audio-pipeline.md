# FitCore Jarvis Local iOS Voice and Audio Pipeline

## 2. Document status

This is a research-backed architecture recommendation. No runtime implementation is included. All performance claims require independent verification. The regular iPhone 15 is the minimum device target. The iPhone 16 must use the same baseline architecture. Optional enhancements must not create incompatible behavior.

## 3. Executive recommendation

The preferred feasibility configuration (candidates requiring validation) is:

```text
AVAudioSession and AVAudioEngine (SharedAudioEngine)
    ↓
Voice-processing input with hardware echo cancellation (AEC)
    ↓
Local streaming speech recognition (Parakeet EOU via FluidAudio)
    ↓
Jarvis conversation pipeline (LLM streaming)
    ↓
Streaming local speech synthesis (PocketTTS via FluidAudio)
    ↓
Apple system speech fallback
```

Raw audio is discarded immediately after processing.

## 4. Goals and constraints

**Goals:**

- Entirely phone-local operation (no mandatory cloud APIs).
- Support for iPhone 15 and iPhone 16 equally.
- Fluid conversation and fast first response.
- Interruption (barge-in) capability.
- Bluetooth (AirPods/headsets) compatibility.
- Noisy-gym usability.
- Offline operation.
- Low latency.
- Controlled memory and battery use.
- No default audio retention.

**Constraints:**

- iOS background restrictions (audio sessions).
- Microphone permissions.
- Audio-route changes (headset connect/disconnect).
- Model memory limits (STT, LLM, TTS sharing memory).
- Thermal pressure under sustained use.
- Gym noise masking speech.
- Overlapping speaker and microphone audio (hardware echo cancellation needed).
- Limited mobile processing resources.

## 5. Candidate comparison

### Speech recognition

| Candidate                          | Fully local   | Streaming   | Partial transcripts | End-of-turn support | iOS-native integration | Approximate asset size | License          | Strengths                                     | Risks                                 |
| ---------------------------------- | ------------- | ----------- | ------------------- | ------------------- | ---------------------- | ---------------------- | ---------------- | --------------------------------------------- | ------------------------------------- |
| FluidAudio + Parakeet Realtime EOU | Yes           | Yes         | Yes                 | Yes                 | CoreML (ANE)           | ~600MB (est)           | MIT / Apache 2.0 | Optimized for Apple Neural Engine, low power. | Framework maturity.                   |
| WhisperKit                         | Yes           | No (pseudo) | No                  | No                  | CoreML                 | Variable               | MIT              | Highly accurate offline.                      | High latency, no true streaming.      |
| whisper.cpp                        | Yes           | No (pseudo) | No                  | No                  | Metal/CPU              | Variable               | MIT              | Portable, robust.                             | CPU/GPU heavy, battery drain.         |
| Apple Speech                       | Yes (offline) | Yes         | Yes                 | No                  | Native API             | N/A (System)           | Proprietary      | Zero extra footprint.                         | Inconsistent offline mode, lacks EOU. |

### Speech output

| Candidate                 | Fully local | Streaming | Voice quality | Time-to-first-audio claims | iOS integration | Approximate asset size | License     | Strengths                          | Risks                                 |
| ------------------------- | ----------- | --------- | ------------- | -------------------------- | --------------- | ---------------------- | ----------- | ---------------------------------- | ------------------------------------- |
| PocketTTS (FluidAudio)    | Yes         | Yes       | High          | < 100ms (claimed)          | CoreML          | ~200MB (est)           | MIT         | Very fast streaming TTS on device. | Requires sentence chunking.           |
| Apple AVSpeechSynthesizer | Yes         | Yes       | Medium        | < 50ms                     | Native API      | N/A (System)           | Proprietary | Zero footprint, built-in.          | Robotic voices.                       |
| Piper                     | Yes         | Yes       | Medium-High   | ~200ms                     | C++             | Variable               | MIT         | Fast, many voices.                 | Integration overhead, CPU bound.      |
| Kokoro (mobile)           | Yes         | No        | Very High     | > 500ms                    | ONNX/CoreML     | ~300MB                 | Apache 2.0  | Best quality.                      | Not streaming natively, high latency. |

### Voice-assistant foundations

| Candidate             | Reuse value     | Maintenance status | License | Architecture fit | Production-readiness risk | Recommendation         |
| --------------------- | --------------- | ------------------ | ------- | ---------------- | ------------------------- | ---------------------- |
| Volocal               | High (patterns) | Active             | MIT     | Perfect          | Low                       | Reference for patterns |
| FluidAudio examples   | Medium          | Active             | MIT     | Good             | Low                       | Use as dependency      |
| Custom implementation | Low             | N/A                | N/A     | Variable         | High                      | Reject                 |

## 6. Candidate component selection

Final selection requires physical iPhone 15 tests, current framework compatibility, exact model revisions, licensing review, memory and thermal evaluation, Bluetooth validation, noisy-gym accuracy, and barge-in reliability.

- **Audio-session manager:** `AVAudioSession` (Native). Why it wins: Mandatory for iOS. Known compromises: strict category rules.
- **Microphone capture:** `AVAudioEngine` (Native). Why it wins: Integrated echo cancellation via voice processing mode.
- **Echo cancellation:** Voice-Processing I/O node (Native). Why it wins: Hardware-accelerated, prevents TTS from feeding into STT.
- **Speech recognition:** Parakeet Realtime EOU (via FluidAudio). Why it wins: True streaming, built-in end-of-utterance, runs on ANE. Needs validation: Gym noise robustness.
- **Partial transcript delivery:** FluidAudio callbacks.
- **End-of-turn detection:** Parakeet Realtime EOU integrated detector. Why it wins: Prevents premature cut-offs better than silence timeouts.
- **Interruption detection:** Continuous acoustic monitoring via the STT engine.
- **Speech generation:** PocketTTS (via FluidAudio). Why it wins: Fast streaming TTS allows fluid conversation.
- **System fallback:** Apple `AVSpeechSynthesizer`.
- **Model-asset management boundary:** FluidAudio's download manager or a custom wrapper for lazy loading.

_Note: Language model is excluded as per task scope._

## 7. Existing-project reuse decision

- **Volocal:** Reference only. FitCore should reproduce patterns (like `SharedAudioEngine` and `SentenceBuffer`) without forking the whole app to maintain control over the FitCore architecture.
- **FluidAudio:** Use as dependency. Provides the CoreML wrappers for STT and TTS.
- **Parakeet Realtime EOU (Model):** Use as dependency (via FluidAudio).
- **WhisperKit:** Reject for baseline. Lacks streaming and EOU.
- **whisper.cpp:** Reject for baseline. High battery drain.
- **PocketTTS:** Use as dependency (via FluidAudio).
- **Apple native speech APIs:** Use as fallback for TTS only.

## 8. Audio-session architecture

- **Ownership:** A singleton `AudioManager` configures `AVAudioSession`.
- **Category:** `playAndRecord`. Allows simultaneous input and output.
- **Mode:** `voiceChat`. Enables hardware acoustic echo cancellation and optimized voice processing.
- **Options:** `allowBluetooth`, `allowBluetoothA2DP`, `defaultToSpeaker`.
- **Lifecycle:** Session activates on Jarvis launch or workout start, deactivates when closed. Must handle `AVAudioSession.interruptionNotification` and `AVAudioSession.routeChangeNotification`.
- **Sample Rate:** Generally 16kHz or 48kHz depending on the models, requiring conversion in `AVAudioEngine`.

## 9. Shared audio-engine design

Jarvis should use **one shared audio engine** (`SharedAudioEngine` pattern, similar to Volocal).

```text
AVAudioSession (VoiceChat Mode)
       ↓
AVAudioEngine (Shared Instance)
       ├─> Input Node (Microphone + Hardware AEC) ─> STT
       └─> Output Node (Speaker) <─ TTS
```

A single `AVAudioEngine` with a voice-processing I/O node handles both input (mic) and output (TTS). This is crucial because Apple's voice processing mode (hardware AEC) is most effective when both input and output run through the same I/O node. It is expected to prevent the mic from capturing the TTS output (barge-in support), requiring measurement.

## 10. Voice-request sequence

```text
User begins speaking
    ↓
Microphone frames captured (AVAudioEngine)
    ↓
Streaming recognizer receives frames (Parakeet)
    ↓
Partial transcript displayed
    ↓
End of utterance detected (Parakeet EOU)
    ↓
Transcript finalized
    ↓
Transcript normalized (text processing)
    ↓
Conversation system receives request
```

- **Timeout:** A configurable hard safety timeout prevents endless listening. Exact values remain provisional until physical-device testing.
- **No-speech:** Yields safely back to idle state. Partial transcripts must never trigger writes.

## 11. Spoken-response streaming sequence

```text
Response text begins streaming (from LLM)
    ↓
Sentence buffer splits at punctuation (.!?:;)
    ↓
Speech synthesis request (PocketTTS)
    ↓
First audio chunk produced (< 100ms)
    ↓
Playback begins (AVAudioEngine player node)
    ↓
Additional chunks queued continuously
    ↓
Response completes
```

- **Chunking:** Max ~200 characters per chunk.
- **Fallback:** If PocketTTS fails, Apple `AVSpeechSynthesizer` speaks the buffered sentence.

## 12. Interruption and barge-in flow

When the user speaks while Jarvis is talking:

```text
Jarvis Speaking → User Speaks (Microphone Active)
       ↓
Hardware AEC Suppresses TTS from Mic
       ↓
Parakeet Detects Actual User Speech
       ↓
Turn Revision ID Incremented → TTS Stops & Queues Discarded
       ↓
LLM Generation Canceled & Stale Callbacks Ignored
       ↓
New Speech Transcribed → New Turn Begins
```

## 13. Turn-detection strategy

- **Workout mode (hybrid):** Requires high noise tolerance. Push-to-talk capability must be available. EOU model handles hands-free, but requires higher confidence.
- **Conversation mode:** Relies primarily on the end-of-utterance (EOU) model for natural turn timing and pauses.

**Recommended strategy:** End-of-utterance (EOU) detection is the preferred automatic mechanism where validated. A configurable hard safety timeout serves as a fallback. Push-to-talk submission is always available.

## 14. Transcript normalization

Before the conversation system processes the command, the text must be normalized.

- Spoken numbers → digits ("two twenty five" → 225).
- Homophones ("wait" → "weight").
- Abbreviations ("lbs" → lb).
- Punctuation removal for command routing.

_Example:_

- Raw: "I did two twenty five for five reps."
- Display: "I did two twenty five for five reps."
- Normalized (for routing): "i did 225 for 5 reps"

## 15. Noisy-gym design

Strategies for the gym:

- Push-to-talk UI available at all times.
- Echo cancellation handles background music to some extent.
- Confidence thresholds: if STT confidence is low, UI prompts "Did you mean X?".
- Ambiguous numeric commands ("one fifteen" = 115 or 1:15?) require UI confirmation.
- Testing is strictly required in a real gym environment to tune parameters.

## 16. Bluetooth behavior

- `AVAudioSession` options `allowBluetooth` and `allowBluetoothA2DP` must be set.
- When a headset connects (route change notification), audio seamlessly shifts.
- Bluetooth microphone profiles (HFP) drop audio quality significantly compared to A2DP. The app must manage this tradeoff gracefully during two-way audio.
- AirPods are expected to support seamless switching (requires validation).

## 17. App lifecycle behavior

- **Launch:** Models load lazily on first Jarvis access.
- **Permission:** Explicit OS microphone permission requested on first use.
- **Backgrounding:** Voice processing stops unless explicitly holding a background audio task (not an initial requirement).
- **Interruptions (Phone calls, Siri):** `AVAudioSession` handles interruptions; Jarvis pauses TTS and cancels active STT listening.
- **Continuous listening:** Always-listening behavior while FitCore is closed is NOT an initial requirement.

## 18. Resource-management strategy

- **Model Load:** Lazy load on first activation to save startup time.
- **Memory and Unload Policy:** STT and TTS models stay resident during an active session. The unload policy is controlled by the active session state, current workload, memory warnings, thermal state, application backgrounding, and expected reactivation latency. Exact idle-unload durations remain provisional pending physical-device measurements.
- **Thermal degradation:** Under severe thermal pressure, implement a progressive degradation ladder (each transition must preserve active-workout data):
  1. Shorten outputs.
  2. Reduce optional model work.
  3. Disable enhanced TTS in favor of system TTS.
  4. Require push-to-talk.
  5. Switch to text input when audio inference is unsafe or unavailable.

## 19. Fallback hierarchy

**Speech recognition**

1. Parakeet EOU via FluidAudio (streaming).
2. Text input.
   _(No mandatory cloud fallback)_

**Speech output**

1. PocketTTS via FluidAudio.
2. Apple `AVSpeechSynthesizer`.
3. Text-only response.

**Turn detection**

1. Parakeet EOU detector.
2. Silence timeout (5s).
3. Push-to-talk completion.

## 20. Privacy behavior

- Raw audio is discarded immediately in memory after processing.
- No hidden recording; OS-level microphone indicator is always visible.
- No external audio upload in the baseline.
- Raw audio is never logged.
- Full transcripts are never written to ordinary diagnostic logs.
- Prompts and responses are not logged in full.
- Operational diagnostics may record redacted error codes, component versions, confidence categories, latency measurements, audio-route type, and failure categories.
- Visible conversation history is separate from diagnostics.
- User-created support exports must exclude transcripts by default.
- Any narrowly scoped transcript sharing requires explicit user review and action.

## 21. Licensing and distribution

An exact pre-distribution legal and license review is required. Do not infer that a model is redistributable solely because its wrapper framework is MIT or Apache licensed.

For each selected candidate, the following must be distinguished and reviewed:

- Framework license
- Model license
- Model-card terms
- Redistribution rights
- Attribution requirements
- Commercial-use restrictions
- Exact source revision

**Provisional framework notes:**

- **FluidAudio (Framework):** MIT / Apache 2.0.
- **Parakeet EOU (Model/Weights):** Requires verifying NVIDIA NeMo terms and CoreML conversion rights.
- **PocketTTS (Model/Weights):** Requires verifying Kyutai terms.
- **Redistribution:** If legally permitted, downloading on first launch is recommended to keep app size small.

## 22. Provisional performance targets

- Time to partial transcript: < 300ms
- End-of-turn delay: < 800ms
- Time from finalized transcript to first spoken response: < 1000ms
- Interruption stop latency: < 200ms
- Memory footprint: < 1GB (for STT + TTS, excluding LLM)

_Note: These are recommendations and require independent verification on device._

## 23. Required feasibility experiments

- **Device matrix:** iPhone 15, iPhone 16.
- **Audio routes:** Built-in, AirPods, Bluetooth disconnects.
- **Environments:** Quiet room, simulated gym noise, real gym.
- **Workloads:** Short commands, 30-minute continuous conversation, thermal pressure test.
- **Measurements:** Transcription accuracy, latency, battery drain, crash rate.

## 24. Acceptance gates

Go/no-go conditions before implementation:

- The iPhone 15 can run the STT, LLM, and TTS models simultaneously without OOM crashes.
- Barge-in works and echo cancellation prevents infinite feedback loops.
- Bluetooth route changes recover safely.
- Text-only fallback works reliably if models fail to load.

## 25. Failure and fallback matrix

| Failure                  | Detection            | User-visible behavior        | Automatic fallback         | Data-safety rule       |
| ------------------------ | -------------------- | ---------------------------- | -------------------------- | ---------------------- |
| Mic permission denied    | OS callback          | "Mic access needed"          | Text input only            | N/A                    |
| Speech model unavailable | Load error           | "Downloading models..."      | Text input only            | Do not record          |
| TTS model unavailable    | Load error           | Robotic voice                | System AVSpeechSynthesizer | N/A                    |
| Memory pressure          | OS warning           | UI warning, slower responses | Unload inactive models     | N/A                    |
| Stale callback           | Revision ID mismatch | None                         | Ignore callback            | Prevent duplicate logs |

## 26. Feasibility configuration summary

- **Candidate audio approach:** Singleton `AVAudioSession` with a shared `AVAudioEngine` utilizing Voice-Processing I/O (expected to provide hardware AEC).
- **Candidate STT approach:** Parakeet Realtime EOU via FluidAudio.
- **Candidate EOU approach:** Parakeet built-in EOU.
- **Candidate TTS approach:** PocketTTS via FluidAudio with sentence chunking.
- **Volocal reuse strategy:** Reference only. Extract patterns for the shared audio engine and barge-in revision IDs, but do not fork.
- **Required fallback:** Apple `AVSpeechSynthesizer` for TTS, text-input for STT.
- **Unresolved risk:** Reliable operation in noisy gym environments with heavy background music.
- **Feasibility gate:** Physical iPhone 15 testing confirming memory stability, thermal behavior, and license compatibility before final component selection.

## 27. References

1. Apple Developer Documentation: AVAudioSession (https://developer.apple.com/documentation/avfaudio/avaudiosession), Accessed 2026-07-15. Supports audio session categorization.
2. Apple Developer Documentation: AVAudioEngine Voice Processing (https://developer.apple.com/documentation/avfaudio/avaudiosession/mode/1616455-voicechat), Accessed 2026-07-15. Supports hardware AEC claims.
3. FluidAudio Repository (https://github.com/FluidInference/FluidAudio), Accessed 2026-07-15. Supports CoreML implementations of Parakeet and PocketTTS.
4. Volocal Repository (https://github.com/fikrikarim/volocal), Accessed 2026-07-15. Supports SharedAudioEngine and barge-in architectural patterns.
