## 1. Title and document status

# FitCore Jarvis Local iOS Voice and Audio Pipeline Architecture

**Status:** Architecture and feasibility recommendation only.

There is currently no runtime implementation of this architecture. The regular iPhone 15 is the minimum binding device for any performance or memory claims. All component selections discussed here are provisional. Final selections are strictly gated by physical-device testing and rigorous license validation.

## 2. Current FitCore and Jarvis state

The current Jarvis interface is a web-based panel accessible within the FitCore React application. It operates primarily via text conversation behavior, though the UI has placeholders for future voice components (e.g., a visible microphone icon that is not backed by native iOS audio session handling).

The existing configuration relies on remote AI providers (Groq and Gemini) for processing, with specific provider settings adjustable in the UI. Tool execution and confirmation flows are integrated via server functions and local stores (`src/lib/jarvis/tools.ts`, `src/components/app/jarvis/jarvis-panel.tsx`), enabling Jarvis to interact with FitCore data (e.g., logging a workout). The system maintains existing Undo and audit behavior for these actions.

Future native voice integration must feed this existing or a migrated conversation orchestration layer. Native voice components must never directly mutate FitCore data themselves.

## 3. Voice experience goals

The intended voice experience requires:

- conversational turn-taking;
- fast interruption capabilities;
- barge-in support;
- a visible listening state;
- a visible transcript of the conversation;
- mechanisms for correction;
- no hidden recording;
- reliable operation in gym-noise environments;
- robust Bluetooth operation;
- a text-only fallback mode;
- full accessibility compliance;
- a local-first privacy stance;
- no requirement for a paid speech API.

## 4. Voice architecture flow

The conceptual flow for the voice architecture is:

microphone
→ native audio session
→ preprocessing
→ speech recognition
→ partial transcript
→ endpointing or push-to-talk completion
→ final transcript
→ conversation orchestrator
→ model or deterministic command path
→ response text
→ speech synthesis
→ playback
→ interruption or barge-in handling

This flow must include session, turn, stream, and revision identifiers to guarantee that stale transcripts, delayed tokens, or old audio cannot affect a subsequent turn.

## 5. Responsibility boundaries

Responsibilities must be strictly separated across architectural layers:

### Native layer

- microphone access;
- `AVAudioSession` lifecycle;
- Bluetooth route handling;
- audio interruptions;
- audio buffers;
- Speech-to-Text (STT);
- endpoint detection;
- Text-to-Speech (TTS);
- playback;
- handling memory and thermal warnings;
- model loading;
- cancellation.

### Web/FitCore layer

- conversation display;
- visible transcript rendering;
- correction UI;
- context construction;
- tool validation;
- confirmation interactions;
- canonical service execution;
- Undo operations;
- audit history management.

### Shared contract layer

- session IDs;
- turn IDs;
- revision IDs;
- partial transcript events;
- final transcript events;
- response chunks;
- speech start and stop signals;
- cancellation commands;
- route changes;
- health and failure state reporting.

Native voice components must not directly write FitCore domain data.

## 6. Audio-session ownership

Native ownership relies on `AVAudioSession`. Configurations must cover:

- record and playback categories (treat category options as provisional until explicitly tested);
- the input route;
- the output route;
- built-in microphone behavior;
- speaker behavior;
- wired headset handling;
- Bluetooth HFP (Hands-Free Profile);
- Bluetooth A2DP (Advanced Audio Distribution Profile);
- dynamic route changes;
- sample-rate changes;
- interruption handling (e.g., phone calls, Siri, alarms, or notification interruptions);
- backgrounding behavior;
- screen locking behavior.

It cannot be assumed that one fixed audio-session configuration will seamlessly work for every possible audio route.

## 7. Bluetooth behavior

Integrating Bluetooth introduces tradeoffs between:

- HFP microphone support (which typically forces lower-quality playback);
- A2DP higher-quality playback (which offers limited or no microphone input support for STT).

Testing is required for:

- AirPods or representative Bluetooth earbuds;
- route transitions occurring during an active session;
- reconnection behavior;
- input changes;
- output changes;
- dropped routes;
- rejection of stale events across route shifts;
- ensuring no repeated tool execution occurs after a reconnection.

## 8. Speech-recognition candidates

The following speech recognition candidates are retained for evaluation (where technically appropriate):

- Parakeet Realtime EOU (via FluidAudio or another verified native integration);
- Apple Speech framework (as a possible system fallback, subject to offline, privacy, availability, and operating-system limitations);
- Push-to-talk and text input (as deterministic fallback modes).

All performance characteristics below must be treated as estimates until measured on the physical device. Candidates must be compared using:

- exact identifier;
- publisher;
- model size;
- native integration path;
- streaming support;
- partial transcripts capabilities;
- endpointing integration;
- offline support;
- license;
- redistribution restrictions;
- model storage requirements;
- expected memory usage;
- expected latency;
- noise risk;
- accent risk;
- numerical accuracy;
- integration risk;
- fallback behavior.

Parakeet is not declared production-approved at this stage.

## 9. Endpoint and turn-detection strategy

Endpoint detection will use a layered strategy:

- model-supported endpoint detection where validated;
- a configurable silence timeout;
- manual push-to-talk completion;
- explicit Stop controls;
- correction paths.

A universal five-second timeout is not locked as production behavior; it may serve as an initial safety fallback to be tuned through testing.

Evaluation is required across various scenarios:

- short commands;
- long explanations;
- pauses while thinking;
- gym music background;
- equipment noise;
- another person speaking nearby;
- user changing their sentence mid-turn;
- false endpointing occurrences;
- endless listening occurrences.

## 10. Speech-output candidates

The following speech output candidates are retained for evaluation:

- PocketTTS (via a verified native or Core ML integration);
- Apple `AVSpeechSynthesizer` (as a system fallback);
- Text-only output.

Candidates must be compared using:

- identifier;
- publisher;
- integration path;
- streaming or sentence chunking capabilities;
- interruption support;
- license;
- redistribution restrictions;
- storage requirements;
- memory footprint;
- latency;
- naturalness;
- pronunciation accuracy;
- numerical speech clarity;
- fallback behavior.

It is strictly required that spoken output can be immediately stopped. The app must never wait for the full response to finish speaking before allowing cancellation. PocketTTS is not declared production-approved at this stage.

## 11. Barge-in and interruption design

The barge-in design requires managing:

- response revision IDs;
- playback revision IDs;
- microphone state;
- echo and self-transcription safeguards;
- cancellation propagation;
- old-audio suppression;
- old-token suppression;
- old-tool-request suppression.

When the user interrupts:

1. Stop playback immediately.
2. Cancel current generation where possible.
3. Invalidate the previous response revision.
4. Open the next listening turn.
5. Reject any late events from the prior turn.
6. Never replay a write operation.

## 12. Self-transcription protection

Defenses against Jarvis hearing and transcribing its own spoken output include:

- playback-aware STT suppression;
- acoustic echo cancellation where available;
- pausing or gating recognition during system output where needed;
- barge-in mode configurations;
- revision IDs;
- transcript similarity detection (used for diagnostics only);
- physical-device validation.

The system must not rely on a single heuristic to prevent self-transcription.

## 13. Noise and gym-environment strategy

Thorough testing is required in realistic environments:

- quiet room;
- conversation-level room noise;
- loud gym music;
- weights or machines in use;
- treadmill usage;
- fans running;
- user moving;
- phone held in hand;
- phone resting on bench;
- Bluetooth microphone input;
- built-in microphone input.

The following metrics must be tracked at minimum:

- word error rate;
- numeric command accuracy;
- exercise-name accuracy;
- false activation rate;
- false endpointing rate;
- missed endpointing occurrences;
- self-transcription occurrences;
- correction rate;
- user cancellations;
- time to partial transcript;
- time to final transcript.

Numerical accuracy is critical for weight, reps, RPE, duration, calories, protein, macros, bodyweight, dates, and times.

## 14. Voice and existing Jarvis migration

Voice input will migrate into the existing Jarvis conversation UI without bypassing current orchestration.

- Voice inputs will be passed as text into the same web-layer conversation orchestrator used by the text chat.
- Existing text-based provider settings will be migrated or evaluated to determine how they interact with local STT/TTS components.
- Current voice-related UI settings (if any exist conceptually) must be interpreted consistently.
- Cloud AI providers must remain isolated from the local voice STT/TTS baseline to preserve the local-first architecture.
- Turn pipelines must enforce state so that old and new turns cannot run simultaneously.
- Existing tool confirmations (`ConfirmDialog`) and Undo functionality are fully retained.
- Any remaining direct state mutations must be replaced by canonical service wrappers over time.

Voice input must never create a second uncontrolled tool gateway.

## 15. Resource-management strategy

The resource strategy must define:

- lazy loading for STT and TTS models;
- active-session residency logic;
- unload behavior when idle;
- handling of memory warnings;
- handling of thermal warnings;
- responses to battery pressure;
- backgrounding state changes;
- application suspension;
- model restart protocols;
- partial availability handling.

A progressive degradation ladder will be used:

1. shorten spoken responses;
2. reduce optional processing;
3. switch enhanced TTS to system TTS;
4. require push-to-talk instead of continuous listening;
5. switch entirely to text input;
6. disable voice entirely while preserving the rest of the FitCore application.

No degradation step may ever corrupt or lose active-workout data.

## 16. Privacy and data handling

Privacy enforcement requires:

- explicit user microphone permission;
- a visible OS-level microphone indicator when active;
- absolutely no hidden recording;
- discarding of raw audio immediately after processing;
- no raw audio logs saved locally or remotely;
- exclusion of full transcripts from generalized diagnostics;
- no automatic external upload of voice data;
- visible conversation history must be separated from background diagnostics;
- data exports must exclude transcripts by default;
- explicit user review is required before sharing any transcript content;
- no use of user voice recordings for training purposes.

## 17. Accessibility

Accessibility support must cover:

- VoiceOver announcements for state changes;
- a visible text transcript;
- nonvoice equivalent controls for all features;
- full text-only operation;
- compatibility with large text settings;
- Dynamic Type support where native UI is rendered;
- clear, distinct microphone state indicators;
- an explicit Stop button;
- robust keyboard operation in the web layer;
- no requirement for the user to hear spoken output to use the feature;
- captions or transcripts available for all spoken content;
- safe reduced-motion behavior.

## 18. Failure and fallback hierarchy

Explicit fallbacks are defined for each failure domain. No failure may repeat a write request.

### STT failure

- Retry mechanisms;
- Push-to-talk mode;
- Text input fallback.

### Endpoint failure

- Manual Stop invocation;
- Configurable timeout;
- Push-to-talk completion.

### TTS failure

- Apple system TTS (`AVSpeechSynthesizer`);
- Text-only display.

### Audio-route failure

- Stop processing safely;
- Retain the existing transcript;
- Switch route if possible;
- Continue in text mode.

### Memory or thermal failure

- Unload optional AI components;
- Switch to system TTS;
- Require push-to-talk;
- Fall back to text-only mode.

## 19. Physical-device feasibility matrix

The regular iPhone 15 is the binding baseline for all feasibility claims. The iOS simulator may aid development but cannot be used to approve production feasibility.

Testing is required for:

- STT alone;
- TTS alone;
- endpoint detector alone;
- STT plus TTS simultaneously;
- STT plus local LLM plus TTS simultaneously;
- built-in microphone and speaker;
- Bluetooth HFP;
- Bluetooth route changes;
- loud gym environments;
- system interruptions;
- backgrounding;
- screen lock states;
- long continuous sessions;
- memory warning scenarios;
- thermal throttling scenarios;
- battery drain measurement;
- cancellation responsiveness;
- barge-in responsiveness;
- self-transcription resilience.

## 20. Performance metrics and provisional targets

The following metrics will be tracked. Any associated thresholds must be explicitly labeled as provisional until a real physical baseline is measured.

- model load time;
- partial transcript latency;
- endpoint latency;
- final transcript latency;
- time to first model token;
- time to first audible response;
- playback cancellation latency;
- peak memory usage;
- steady-state memory usage;
- temperature and thermal state changes;
- battery use percentage;
- word error rate;
- numeric accuracy rate;
- self-transcription rate;
- dropped-audio rate;
- stale-event rate.

## 21. Initial feasibility subset

The recommended smallest nonproduction prototype includes:

- native audio-session ownership;
- microphone permission handling;
- one STT candidate evaluated;
- generation of partial and final transcript events;
- manual push-to-talk fallback implementation;
- mock model response for testing latency;
- one TTS candidate or system TTS integration;
- functional Stop controls;
- barge-in capabilities;
- revision-based stale-event rejection;
- completely disabled production FitCore writes;
- physical iPhone 15 measurements.

## 22. Production approval gates

Production distribution is strictly blocked if any of the following items remain unresolved:

- model license verification;
- redistribution rights confirmation;
- required attribution implementation;
- simultaneous STT/LLM/TTS memory stability;
- repeated Jetsam termination occurrences;
- unsafe stale events bleeding across turns;
- repeated tool writes due to voice retries;
- unreliable or delayed cancellation;
- hidden recording capabilities;
- raw audio retention violations;
- severe self-transcription issues;
- inaccessible voice-only operation;
- unacceptable noisy-gym accuracy;
- unsafe Bluetooth behavior.

## 23. Open questions

The following items are unresolved and must be assigned:

### Licensing review

- Confirm exact license terms for Parakeet, PocketTTS, and FluidAudio. Note that a permissive framework license (like MIT or Apache) does not automatically grant rights to redistribute model weights.
- Conversion of models to Core ML does not create redistribution rights.
- Post-install downloading mechanisms still require license compliance.
- Unresolved licensing formally blocks production distribution.
- Evaluate attribution requirements, commercial-use conditions, gated-access, or acceptance requirements via primary sources (official repos, model cards, license files).

### Physical-device spike

- Validate memory and thermal behavior on the regular iPhone 15 under combined STT/LLM/TTS loads.

### UX testing

- Evaluate user response to endpoint detection timing and text fallbacks.

### Accessibility testing

- Ensure VoiceOver compatibility and proper dynamic type scaling.

### Privacy review

- Confirm no raw audio persistence or unintended diagnostic leaks of full transcripts.

### Performance validation

- Establish non-provisional baselines for latency, error rates, and battery drain.

### Implementation phase

- Schedule the initial feasibility subset work once licensing permits testing.
