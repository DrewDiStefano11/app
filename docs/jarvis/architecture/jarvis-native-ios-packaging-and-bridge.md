# FitCore Jarvis Native iOS Packaging and Bridge Architecture

## 2. Document status

- This is a research-backed architecture recommendation.
- No native implementation is included in this document.
- The recommendation must be validated against the final merged UI baseline.
- The regular iPhone 15 is the minimum device target.
- The existing FitCore web application should be preserved where practical.
- Native implementation requires an Apple build environment.

## 3. Executive recommendation

After evaluating the current web-centric FitCore architecture against Apple's ecosystem constraints, the primary recommendation is:

```text
Existing FitCore web application
        +
Capacitor iOS container
        +
Custom Swift Jarvis plugin or native module
```

- **Recommended packaging framework:** Capacitor (via official iOS integrations).
- **Recommended bridge strategy:** Typed Capacitor plugin messages for discrete requests, combined with Capacitor event listeners for streaming.
- **What remains in the web layer:** The complete UI (Home, Training, Fuel, Recovery, Stats), navigation, local FitCore state management, canonical frontend service logic, and visualization.
- **What moves to native Swift:** Microphone capture, local LLM/speech inference (via Metal/Core ML), audio session configuration, and model asset file management.
- **Why the recommendation minimizes risk:** It requires minimal initial changes to the underlying Vite/React architecture, prevents duplicating FitCore's business logic, and clearly isolates the new native ML capabilities into a maintainable Swift plugin.
- **Main compromise:** Debugging bridge issues between React and Swift is more complex than pure web development, and large streaming event payloads must be optimized to not block the WKWebView UI thread.
- **Fallback if the primary approach proves infeasible:** A fully custom `WKWebView` container with manual `WKScriptMessageHandler` bridging, should Capacitor's event throughput prove insufficient for high-frequency token streams.

## 4. Goals and constraints

**Goals:**

- Preserve existing UI: Avoid rewriting the current React/Tailwind frontend.
- Preserve canonical FitCore services: Do not duplicate domain logic in Swift.
- Avoid a full rewrite: Limit native code to Jarvis-specific ML and hardware tasks.
- Access native iOS audio and local inference: The approved inference provider may use Metal, Core ML, MLX, or another validated native runtime.
- Maintain offline behavior: Core capabilities must work without the internet.
- Support both target phones: Regular iPhone 15 baseline and iPhone 16. Actual usable memory is controlled by iOS, application state, native models, WKWebView, audio components, and Jetsam behavior.
- Allow streaming bridge events: Token generation and partial speech transcripts must render smoothly.
- Permit cancellation: The user must be able to interrupt generation or speech immediately.
- Keep provider implementations replaceable: The native ML backend should be abstracted.
- Allow automated testing: The bridge must be testable via mocks.
- Support App Store distribution: Must adhere to Apple Review Guidelines.
- Minimize long-term maintenance duplication: Keep the codebase DRY across web and native.

**Constraints:**

- Windows is the primary current development machine.
- Native iOS builds require macOS and Xcode.
- UI work is still being finalized concurrently.
- Browser and native lifecycles differ (WKWebView pauses background execution more aggressively).
- Large local models require native file management outside of browser storage limits.
- Audio requires native ownership (Apple's `AVAudioSession`).
- Background execution is restricted without specific entitlements.
- WKWebView storage behavior differs from normal Safari in some respects (e.g., origin scoping).
- Service-worker behavior may require validation inside a native container.
- Bridge calls may arrive late or out of order due to asynchronous dispatch.

## 5. Current FitCore application assessment

Based on the latest repository state, FitCore is a Single Page Application (SPA).

| Area                 | Current implementation                                | Native packaging implication                                                      | Confidence |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| **Framework**        | React 19, Vite, TanStack Start, Tailwind              | Expected: Capacitor wraps Vite outputs transparently.                             | High       |
| **Routing**          | TanStack Router (`src/router.tsx`)                    | Expected: Client-side routing maps cleanly to WKWebView.                          | High       |
| **Build Output**     | Vite build to `dist`/`build` (Nitro/Cloudflare)       | Expected: Output directory must be synced into Capacitor's web folder.            | High       |
| **State Management** | Zustand/React Context (`src/lib/store.tsx`)           | Remains authoritative; native bridge must dispatch updates safely.                | High       |
| **Storage**          | LocalStorage/Atomic (`src/lib/atomic-persistence.ts`) | Expected: WKWebView LocalStorage is preserved but not guaranteed permanent.       | Medium     |
| **Service Worker**   | Basic PWA (`public/sw.js`)                            | Expected: Caching might conflict with local native bundles; may need disablement. | Medium     |
| **PWA Behavior**     | `public/manifest.json`                                | Expected: Replaced by native App Store packaging.                                 | High       |
| **Browser APIs**     | Standard web APIs                                     | Expected: Direct `navigator.mediaDevices` will be replaced by native iOS audio.   | High       |

## 6. Packaging candidate comparison

| Approach             | Preserves current UI | Swift integration   | Native performance  | Migration effort | Maintenance duplication | App Store fit | Main risk                             |
| -------------------- | -------------------- | ------------------- | ------------------- | ---------------- | ----------------------- | ------------- | ------------------------------------- |
| **Capacitor**        | Yes                  | Excellent (Plugins) | High (Native logic) | Low              | Low                     | Yes           | Bridge bottlenecking for ML tokens    |
| **Custom WKWebView** | Yes                  | Full control        | High                | Medium           | Medium                  | Yes           | Manual lifecycle & bridge maintenance |
| **React Native**     | No                   | Excellent           | High                | High (Rewrite)   | High                    | Yes           | Total UI rewrite required             |
| **Expo**             | No                   | Excellent           | High                | High (Rewrite)   | High                    | Yes           | Total UI rewrite required             |
| **Full SwiftUI**     | No                   | Native              | Highest             | Highest          | Highest                 | Yes           | Abandoning web codebase               |

**Decision:** Capacitor is the preferred first feasibility candidate because it preserves most of the existing React interface. A physical-device spike must prove app loading, offline behavior, storage behavior, lifecycle handling, event streaming, cancellation, and bridge stability. Final approval occurs only after the spike. A custom WKWebView remains a fallback if Capacitor proves insufficient. No full frontend rewrite should occur without explicit approval.

## 7. Preferred packaging feasibility candidate

- **Why it wins:** Capacitor is purpose-built to package existing Vite web apps while exposing a structured API for custom Swift plugins.
- **What existing code remains:** The entire frontend inside `src/`.
- **Proposed feasibility structure:** A standard Capacitor iOS project wrapping the dist output, plus a local Swift plugin module.
- **Expected build outputs:** `dist` folder generated by Vite, copied into an Xcode `.xcworkspace`.
- **How web assets enter the native app:** `npx cap sync ios` copies the web bundle into the native project.
- **How updates are delivered:** Standard App Store updates (or potential over-the-air via solutions like Live Updates, though not recommended initially for simplicity).
- **Are over-the-air web updates allowed?** Yes, by Apple, if they don't materially change app purpose. Not recommended initially to keep debugging simple.
- **Compatibility:** Native bridge versions must be checked against web context upon initialization.
- **Major risks:** Token streaming via Capacitor events overwhelming the main thread.
- **Reconsideration triggers:** If Capacitor bridging latency exceeds 50ms per token, a custom WKWebView fallback will be explored.

## 8. Architectural layers

### Existing FitCore web layer

**Owns:**

- Home, Training, Fuel or Nutrition, Recovery, Stats.
- Current UI, navigation, and visualizations.
- Canonical frontend service calls and confirmations.
- Undo affordances.
- Transcript display and Jarvis controls.
- Context-envelope creation where appropriate.

**Must not own:**

- Raw native microphone processing.
- Metal inference.
- Native speech synthesis.
- iOS audio-session configuration.
- Direct native model file handling.

### Native iOS host layer

**Owns:**

- Application container and Swift runtime.
- iOS lifecycle (foreground/background) and permissions.
- Audio session, microphone, and Bluetooth routing.
- Speech recognition, local model inference, and speech synthesis.
- Model downloads and native storage (where approved for models).
- Thermal and memory events.

**Must not:**

```text
+-----------------------------------------------------------+
| iOS Application Container (Capacitor)                     |
|                                                           |
|  +-----------------------+   +-------------------------+  |
|  | Native Host Layer     |   | WKWebView               |  |
|  | - Audio Session       |<->| - FitCore React SPA     |  |
|  | - ML Inference Engine |   | - Navigation & State    |  |
|  | - Model Files         |   | - UI & Visualizations   |  |
|  +-----------------------+   +-------------------------+  |
|             ^                             ^               |
+-------------|-----------------------------|---------------+
              v                             v
     Hardware (Mic/Speaker)          Current FitCore Persistence Layer
```

- Bypass canonical FitCore services.
- Directly mutate FitCore domain data.
- Invent UI state.
- Execute arbitrary JavaScript.

### Shared contract layer

**Owns:**

- Bridge message formats and version negotiation.
- Capability negotiation.
- Context snapshots.
- Tool requests and tool results.
- Streamed events, errors, cancellation, and health status.

## 9. Proposed native project structure

```text
ios/
└── App/
    ├── App/
    │   ├── AppDelegate.swift
    │   └── Info.plist
    ├── JarvisPlugin/ (Custom Swift Code)
    │   ├── Audio/
    │   ├── SpeechRecognition/
    │   ├── Inference/
    │   ├── SpeechOutput/
    │   ├── Models/
    │   ├── Memory/
    │   ├── Bridge/
    │   └── Diagnostics/
    └── public/ (Generated from Vite 'dist')
```

- **Generated files:** Capacitor structural files, `public/` web assets, `Podfile.lock`.
- **Maintained source:** `JarvisPlugin/` Swift files, `AppDelegate.swift` extensions, `Info.plist`.
- **Never edited manually:** Web bundle inside iOS folder, Xcode auto-generated build definitions where Capacitor owns them.
- **Custom Swift isolation:** All Jarvis logic belongs in isolated Swift files or a distinct Swift Package, not smeared across the AppDelegate.

## 10. Bridge design principles

1. Typed messages (strict JSON schemas).
2. Explicit versioning (protocol numbers).
3. No arbitrary code execution.
4. No unrestricted JavaScript evaluation.
5. No raw storage exposure.
6. No secret transfer into web prompts.
7. Streaming supported.
8. Cancellation supported.
9. Every message tied to session and turn.
10. Stale events rejected (via sequence/turn IDs).
11. Errors structured (code, message, context).
12. Capabilities negotiated at launch.
13. Large binary data does not cross as base64 unless unavoidable (use file URIs instead).
14. Backpressure is supported (where possible).
15. Native crashes cannot corrupt FitCore state.
16. Web reload cannot replay stale writes.

## 11. Bridge responsibility table

| Capability                 | Web initiates | Native initiates | Request/response | Streaming |
| -------------------------- | ------------- | ---------------- | ---------------- | --------- |
| initialize Jarvis          | Yes           | No               | Yes              | No        |
| query capabilities         | Yes           | No               | Yes              | No        |
| request model status       | Yes           | No               | Yes              | No        |
| begin voice session        | Yes           | No               | Yes              | No        |
| stop voice session         | Yes           | No               | Yes              | No        |
| submit text                | Yes           | No               | Yes              | No        |
| receive partial transcript | No            | Yes              | No               | Yes       |
| receive final transcript   | No            | Yes              | No               | No        |
| send context envelope      | Yes           | No               | Yes              | No        |
| receive model tokens       | No            | Yes              | No               | Yes       |
| receive tool request       | No            | Yes              | No               | Yes       |
| return tool result         | Yes           | No               | Yes              | No        |
| cancel turn                | Yes           | No               | Yes              | No        |
| stop speaking              | Yes           | No               | Yes              | No        |
| update speech settings     | Yes           | No               | Yes              | No        |
| model download             | Yes           | Yes              | No               | Yes       |
| storage status             | No            | Yes              | No               | No        |
| thermal warning            | No            | Yes              | No               | No        |
| memory warning             | No            | Yes              | No               | No        |
| audio-route change         | No            | Yes              | No               | No        |
| permission change          | No            | Yes              | No               | No        |

## 12. Conceptual bridge API

```text
+---------------+                                   +---------------+
| Web Layer     |                                   | Native Layer  |
+---------------+                                   +---------------+
       |                                                   |
       | 1. JavaScript calls conceptual plugin interface            |
       |-------------------------------------------------->|
       |                                                   | 2. Swift parses JSON
       |                                                   | 3. Execution (e.g. Prepare Models)
       | 4. Swift returns structured response        |
       |<--------------------------------------------------|
       |                                                   |
```

**Web-to-Native Operations:**

- `initializeJarvis()`: Boots ML engine. Returns protocol match.
- `getJarvisCapabilities()`: Retrieves supported local models/voices.
- `getJarvisStatus()`: Gets readiness.
- `prepareModels()`: Loads models into RAM.
- `startVoiceSession()`: Activates mic, starts listening.
- `stopVoiceSession()`: Closes mic.
- `submitTextTurn()`: Sends text input to LLM.
- `updateContext()`: Sends FitCore state snapshot.
- `cancelTurn()`: Aborts current inference/speech.
- `stopSpeaking()`: Halts TTS.
- `setSpeechPreferences()`: Updates voice options.
- `getModelDownloadStatus()`: Queries file system.
- `deleteDownloadedModels()`: Frees space.

**Native-to-Web Events:**

- `jarvisReady`, `jarvisStatusChanged`
- `partialTranscript`, `finalTranscript`
- `turnStarted`, `tokenReceived`, `toolRequested`
- `confirmationRequired`, `turnCompleted`, `turnFailed`
- `speechStarted`, `speechStopped`
- `modelDownloadProgress`
- `audioRouteChanged`, `thermalStateChanged`, `memoryPressure`, `permissionChanged`

**Rules:**

- Cancellation halts execution and ignores subsequent native events for that turn.
- Prohibited: Web directly reading/writing native files; native directly calling web DOM elements.

**Note:**

- Method names are conceptual.
- Production methods will be generated or defined through a typed plugin contract.
- Event names are provisional.
- Bridge payloads are versioned.
- Streamed events may be batched.
- Cancellation and turn IDs are mandatory.

## 13. Bridge message envelope

```json
{
  "protocolVersion": "1",
  "messageId": "unique-message-id",
  "type": "toolRequested",
  "sessionId": "session-id",
  "turnId": "turn-id",
  "turnRevision": 3,
  "timestamp": "2024-05-01T12:00:00Z",
  "payload": {}
}
```

- **protocol version:** Prevents outdated web from talking to new native app.
- **message ID:** Unique UUID for tracing.
- **session ID & turn ID:** Ties streaming chunks to a specific LLM invocation.
- **turn revision:** Handles re-triggered or modified turns.
- **timestamp:** Useful for latency debugging.
- **payload:** Strictly typed object.
- Strict validation is required (e.g., Zod in TypeScript, Codable in Swift).

## 14. Protocol versioning

```text
+---------------+                                   +---------------+
| Web Layer     |                                   | Native Layer  |
+---------------+                                   +---------------+
       |                                                   |
       | 1. Web queries capabilities (Web Version V)       |
       |-------------------------------------------------->|
       |                                                   | 2. Native compares V with Native Version N
       | 3. Native returns negotiated capability set       |
       |<--------------------------------------------------|
       |                                                   |
```

- **Major version:** Breaking changes.
- **Minor version:** New optional fields or capabilities.
- **Backward compatibility:** Native bridge must support N-1 minor web versions.
- **Unsupported messages:** Ignored, warning logged, error returned if request/response.
- **Mismatch:** App displays "Update Required" block.
- **Capability mismatch:** If LLM doesn't support a tool, degraded read-only operation applies.
- **Rule:** No silent field interpretation. Independent versioning of tool contracts remains intact.

## 15. Streaming event design

```text
+---------------+                                   +---------------+
| Web Layer     |                                   | Native Layer  |
+---------------+                                   +---------------+
       |                                                   |
       | <----------------- (Event: chunk 1) --------------|
       | <----------------- (Event: chunk 2) --------------|
       |                                                   |
       | 1. User clicks Stop                               |
       | 2. Web calls cancelTurn()                         |
       |-------------------------------------------------->|
       |                                                   | 3. Native interrupts ML/Speech
       | <----------------- (Turn Canceled) ---------------|
       |                                                   |
```

- Partial transcripts and model tokens are emitted via Capacitor's plugin event listener bus.
- **Ordering:** Events include sequence numbers (e.g., `chunkIndex`).
- **Backpressure:** True backpressure is hard across WKWebView. Mitigation: Native batches tokens (e.g., 50ms buffers or sentence chunks) before emitting.
- **Dropped events:** Detected via sequence gaps; triggers turn cancellation and re-sync.
- **Stale rejection:** If `turnId` changes in web, older native events are silently dropped.
- **Recommendation:** Send sentence chunks + buffered raw tokens (every 50ms) to prevent bridging overhead.

## 16. Tool-request round trip

```text
+---------------------+                          +-------------------------+
| Native Swift ML     |                          | Web Layer (FitCore)     |
+---------------------+                          +-------------------------+
           |                                                  |
           | 1. Native emits toolRequested event              |
           |------------------------------------------------->|
           |                                                  | 2. Web validates context/turn
           |                                                  | 3. Web tool gateway calls service
           |                                                  |
           | 4. Web calls returnToolResult(payload)           |
           |<-------------------------------------------------|
           |                                                  |
           | 5. Native resumes inference                      |
           v                                                  v
```

- Native never executes business writes.
- Web does not blindly trust native ML; arguments are validated.
- Turn timeouts (e.g., 10s) apply.
- Requires idempotency keys for mutations.

## 17. Context synchronization

- **Snapshot-based:** A complete JSON snapshot of necessary context is generated at the start of a turn.
- **Incremental:** Only if snapshot generation becomes a bottleneck (not expected).
- **Changes:** If the user changes routes or active workouts during generation, a `stale-context` conflict can trigger a cancellation or soft retry.
- **Recommendation:** Per-turn authoritative snapshot. Do not continuously push full React state over the bridge.

## 18. Native-to-web request safety

**Permitted:**

- Approved tool requests.
- Status, permission, model, and audio events.

**Prohibited:**

- Arbitrary JavaScript evaluation (`webview.evaluateJavaScript("store.set(...)")`).
- Arbitrary route opening.
- Arbitrary DOM manipulation.
- Arbitrary storage queries.
- Network calls via web.

## 19. Web-to-native request safety

**Permitted:**

- Approved Jarvis control operations.
- Context snapshots, tool results, speech settings, model commands.

**Prohibited:**

- Arbitrary Swift invocation (must use defined endpoints).
- Arbitrary file paths (native manages paths based on abstract IDs).
- Arbitrary shell commands.
- Secrets in uncontrolled payloads.
- Hidden prompt injection bypasses.

## 20. Permission architecture

- **Microphone:** Required for voice. Requested only when user taps mic icon.
- **Speech Recognition:** Required if using Apple's `SFSpeechRecognizer`. Requested with mic.
- **Bluetooth:** Handled automatically by `AVAudioSession` routing.
- **Local Network:** Not required currently (only if remote fallback added).
- **Denied behavior:** Jarvis falls back to text-only mode smoothly.
- **Revoked behavior:** Handled gracefully on next launch.

## 21. Info.plist and entitlement planning

**Future Requirements:**

- `NSMicrophoneUsageDescription`: "FitCore needs microphone access so you can speak to Jarvis."
- `NSSpeechRecognitionUsageDescription`: "FitCore uses Apple Speech Recognition to convert your voice to text."
- Entitlements must be minimal. No background audio entitlement unless explicitly justified by active workout integration.
- Every entitlement must be validated against App Store review rules.

## 22. App lifecycle architecture

```text
  Cold Launch  ------>  Active  ------> Temporary Background ------> Suspended / Terminated
      |                   |                     |                           |
  (Web Loads,       (Mic active,           (Mic pauses,               (State saved,
   Bridge Init)      Events sync)          No write replays)           Resources freed)
```

- **Cold launch:** Web loads, bridge initializes, models checked. No mic activation.
- **Activation:** Permissions checked, snapshot sent, voice session starts.
- **Temporary backgrounding:** Mic stops (unless active workout audio allows it). Generation may be canceled. No writes are replayed.
- **Foreground return:** Bridge health checked. Context rebuilt. UI accurate to mic state.
- **Termination:** Resources released, conversation cache saved safely.
- **Interruption (Phone call):** `AVAudioSession` interruption halts audio; speech is canceled, user informed.

## 23. Background execution decision

**Recommendation:** Jarvis **must not** run indefinitely in the background unless FitCore is already running an Active Workout with background location/audio permissions.

- **Foreground:** Full capabilities.
- **Locked/Background:** Models should pause. Mic must pause to comply with Apple privacy rules and preserve battery.
- Do not promise permanent wake-word listening. It is restricted by Apple and drains batteries.

## 24. Model-file handling boundary

- **Native Swift owns:** Download URLs, download progress, checksum verification, storage location in native iOS file system, registration, deletion.
- **Web UI receives:** Progress percentages, completion events, low-storage errors.
- **Boundary:** Gigabyte-scale files never pass through the web bridge. Web only passes abstract commands (`downloadModel('llama-3-8b')`).

## 25. Storage boundaries

- **Existing FitCore storage (`src/lib/store.tsx`):** Owns workouts, nutrition, recovery, goals, user preferences. Current FitCore persistence uses repository-defined canonical persistence services. Current browser storage behavior must be validated in WKWebView. No automatic migration to IndexedDB or SQLite is approved. Jarvis must not directly own canonical workout or nutrition persistence.
- **Native Jarvis storage:** Owns large downloaded model assets (in application-support storage), audio config, ML diagnostics, potential encrypted secrets (in Keychain).
- **Rule:** No duplicate canonical records. Web remains the source of truth for fitness data.

## 26. Secrets and credentials

- Baseline local mode requires no API keys.
- Future remote providers must store keys in iOS Keychain (native), accessible only via secure native plugin calls.
- Secrets must not be stored in `localStorage`, JavaScript bundles, or logged.
- Bridge methods must never return raw credentials to the web layer.

## 27. Network-security requirements

- Core behavior requires zero network after model download.
- App Transport Security (ATS) strictly enforced; HTTPS for model downloads.
- Allowed list of model-download origins.
- No public Ollama ports exposed.

## 28. WebView security

- Web content must be bundled natively (no remote URL loading).
- External links open in Safari externally, not inside the app container.
- Bridge strictly bounded to predefined Capacitor plugin APIs.
- Capacitor production builds automatically restrict debugging/inspection.

## 29. Service-worker and offline behavior

- **Assessment:** FitCore has a basic PWA service worker (`public/sw.js`).
- **Recommendation:** Inside the native Capacitor iOS wrapper, the service worker caching should ideally be **disabled** or scoped carefully to avoid conflicting with the native asset bundle loaded via `capacitor://` or `app://` schemes. The native app inherently provides offline asset loading. Do not modify `sw.js` for web users.

## 30. Native and web release coordination

- Versions: Native Host Version, Web Asset Version, Bridge Protocol Version.
- **Matrix:** Web assets bundle with specific native builds. If updated over-the-air, web must verify native Protocol Version.
- **Rule:** Native updates are required when bridge contracts change incompatibly.

## 31. Windows development workflow

**Windows capabilities:**

- Full frontend UI/UX development.
- Tool contract building and testing.
- Mock bridge usage (testing web logic).

**macOS/Xcode capabilities (Required):**

- Native iOS compilation.
- Core ML / Metal integration testing.
- Physical device signing and testing.

**Workflow:**

```text
Windows development (Web UI, Mocks)
        |
        v
Shared Git branch & unit tests
        |
        v
macOS build environment (pull branch)
        |
        v
Xcode compile & Swift testing
        |
        v
Physical iPhone validation
```

## 32. macOS build-environment options

- **Options:** Hosted macOS CI (GitHub Actions), Cloud Mac (MacinCloud), Personal/Temporary Mac access.
- **Initial Feasibility Recommendation:** Rent a Cloud Mac or use a temporary local Mac to validate the iOS packaging spike and Metal inference.
- **Sustainable Recommendation:** A dedicated Mac mini for regular testing, or GitHub Actions macOS runners for automated building, paired with TestFlight.

## 33. Apple account and signing requirements

- **Free tier:** Allows 7-day personal device installation with Xcode. Good for feasibility.
- **Paid Developer Program:** Required for TestFlight and App Store distribution.
- **Distinction:** Operating the local AI is free, but Apple ecosystem distribution carries the standard developer fee.

## 34. Build and signing security

- Certificates and `.mobileprovision` files must not be committed to Git.
- Use Fastlane Match or Xcode automatic signing securely.
- No personal credentials in CI logs.

## 35. Native dependency management

- **Recommendation:** Use Swift Package Manager (SPM) for any native dependencies (e.g., Llama.cpp Swift wrappers).
- Avoid CocoaPods unless strictly necessary due to legacy Capacitor plugins.

## 36. Bridge testing strategy

- **Contract tests:** Validate message schemas.
- **Ordering tests:** Ensure out-of-order sequence IDs are rejected.
- **Cancellation tests:** Verify UI stop button halts Swift inference instantly.
- **Lifecycle tests:** Test web reload, app backgrounding, and phone call interruptions.
- **Tool tests:** Verify duplicate idempotency keys.

## 37. Mock bridge requirements

- A mock TypeScript class implementing the native bridge interface.
- Simulates capabilities, readiness, partial transcripts, tokens, tool requests, and downloads.
- Allows Windows developers to test full Jarvis UI flows without needing macOS.

## 38. Physical-device validation

- **Devices:** iPhone 15, iPhone 16.
- **Scenarios:** Installation, cold launch, multi-GB model download, microphone permissions, memory pressure limits, thermal throttling, background transition during workout.
- Must validate bridge stability under heavy ML load.

## 39. Failure and fallback matrix

| Failure            | Detection      | User-visible behavior         | Fallback          | Data-safety rule      |
| ------------------ | -------------- | ----------------------------- | ----------------- | --------------------- |
| Protocol mismatch  | Init check     | "Update Required"             | Text-only limited | Fail closed           |
| Native crash       | Bridge timeout | "Jarvis encountered an error" | Reload web        | No state corruption   |
| Mic denied         | OS event       | Mic icon disabled             | Text input        | Respect privacy       |
| Thermal pressure   | OS event       | "Jarvis is cooling down"      | Stop generation   | Prevent device damage |
| Out-of-order event | Sequence check | Silent drop/retry             | N/A               | Prevent UI tearing    |

## 40. Acceptance gates

Before full integration:

- Packaging approach loads existing FitCore UI correctly.
- Current routing and local storage remain intact.
- Offline launch works.
- Native bridge supports bidirectional messaging and streaming.
- Cancellation works immediately.
- Tool round-trips use canonical frontend services.
- No direct native FitCore persistence writes exist.
- Physical device tests pass on iPhone 15.

## 41. Feasibility spike definition

**Goal:** A focused, throwaway integration test.

1. Capacitor initialized in a new branch.
2. Existing FitCore frontend loads on iOS Simulator/Device.
3. Storage persists across app restarts.
4. A dummy Swift Capacitor plugin streams mock string chunks to the web UI.
5. Web UI sends a "stop" command that Swift honors.
6. Web returns a mock tool result to Swift.
7. Background/foreground behavior tested.
8. Built-in mic permission requested successfully.

**Rule:** No UI redesign or real LLM integration during the spike.

## 42. Rejected approaches

- **Full SwiftUI rewrite:** Rejected due to massive duplication of effort and abandoning the stable React web base.
- **EvaluateJavaScript bridge:** Rejected. String-based JS evaluation is fragile and insecure compared to Capacitor's structured message passing.
- **Native direct writes to storage:** Rejected. Causes race conditions with the web-layer `FitCoreRuntimePersistenceController`.
- **Base64 Model Transfer:** Rejected. Multi-GB files would crash the bridge. Native must handle files.
- **Simulator-only testing:** Rejected. Metal inference and real memory limits require physical iPhones.

## 43. Repository integration map

| Existing area                   | Likely native impact        | Expected bridge need                                                                            | Risk   | Confidence |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ---------- |
| `src/server.ts`                 | None (SSR unused in native) | None                                                                                            | Low    | High       |
| `src/router.tsx`                | Minimal                     | Expected: Capacitor uses hash or memory routing if needed.                                      | Medium | High       |
| `src/lib/store.tsx`             | High (Source of truth)      | Expected: Must sync state changes safely via bridge.                                            | Medium | High       |
| `src/lib/atomic-persistence.ts` | Medium                      | iOS LocalStorage limits/clearing behavior.                                                      | Medium | Medium     |
| `public/sw.js`                  | Medium                      | Expected conflict with native asset loading (requires spike verification).                      | Medium | Medium     |
| Vite build output               | High                        | Expected: Output must route to native `public/` folder, dependent on final build configuration. | Low    | High       |

## 44. Open questions

- Will Capacitor's standard message bus handle 30+ tokens per second without dropping frames on the main UI thread?
- How will existing Service Worker caching interact with Capacitor's native asset server?
- What is the sustainable macOS hardware plan for continuous integration?
- Does FitCore's current `localStorage` usage exceed iOS WebKit strict quotas, necessitating a native SQLite plugin backup?

## 45. Preferred packaging summary

- **Packaging:** Expected: Capacitor wraps the existing Vite application.
- **Bridge Architecture:** Custom Swift Capacitor plugins with strict JSON typing and event listeners for streaming.
- **Web Responsibilities:** UI, state management, canonical domain logic.
- **Native Responsibilities:** iOS lifecycle, permissions, audio, LLM inference, heavy file storage.
- **Storage Boundary:** Web owns fitness data; Native owns ML models.
- **Lifecycle:** Active voice pauses on background unless active workout allows it.
- **Workflow:** UI built on Windows, Swift compiled on macOS.
- **Next Step:** A minimal feasibility spike proving the bridge can stream tokens and handle cancellation before any full LLM integration begins.

## 46. References

- Capacitor Documentation: https://capacitorjs.com/docs (Accessed 2024)
- Apple WKWebView: https://developer.apple.com/documentation/webkit/wkwebview (Accessed 2024)
- Apple Core ML: https://developer.apple.com/documentation/coreml (Accessed 2024)
- Apple iOS Background Execution: https://developer.apple.com/documentation/backgroundtasks (Accessed 2024)
