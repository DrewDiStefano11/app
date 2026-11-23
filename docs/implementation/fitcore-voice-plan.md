# FitCore voice implementation plan

Goal: opt-in short push-to-talk recordings become editable Jarvis text, then use the same local interpretation, confirmation, correction, undo and authoritative persistence as typed input.

Architecture: MediaRecorder with runtime codec detection (Safari MP4/AAC and Chromium WebM/Opus), no SpeechRecognition dependency or background microphone. A bounded Groq Whisper Large V3 Turbo server call uses only the caller's key; no environment credentials, retries, or provider fallback. No audio is persisted. Only bounded request timestamps and non-content diagnostics are stored, separately from fitness snapshots. No provider request includes WHOOP or existing fitness history. A transcript is never a save command until the user sends it.

## Sequence
- [x] Test then implement `transcribeJarvisAudio` server helper: explicit consent, supported audio, <=2 MiB, <=60 seconds, key required, 15-second abortable deadline including response body, 429 Retry-After, bounded text and usage metadata only.
- [x] Test then implement browser capture controller and small voice input UI: explicit enablement; start/stop/cancel; <=60 seconds and <=2 MiB; close/background/offline/permission denial/unmount invalidates late results and stops tracks. Preserve typed drafts and workout state/timers.
- [x] Test then integrate mixed daily events through the same typed/voice interpretation and atomic action path. Recognized clauses become individually selected review items, one validated transaction, no partial saves on an invalid clause or stale review. Clarify unknown clauses rather than logging a subset.
- [ ] Validate unit/TypeScript/scoped lint and production-artifact mobile scenarios. Publish one focused stacked PR dependent on #302; no merge/deploy. Keep physical iPhone and live audio-provider validation explicitly pending.

Files: new `src/lib/jarvis/transcription.server.ts`, `voice-capture.ts`, small voice controls component, mixed-command helper/component as needed; existing ai.functions.ts, jarvis-panel.tsx and settings-card.tsx. Tests target actual bounds, request payloads, cancellation races, atomic mixed records, duplicate saves and workout continuity. Reuse existing dependencies, keys, diagnostics and persistence.

Provider research 2026-11-23: https://console.groq.com/docs/speech-to-text documents Whisper Large V3 Turbo, audio/mp4 and WebM file formats and the transcription endpoint. Published developer price is $0.04/hour with a ten-second minimum billed duration; free-tier availability/actual account charges are not certified. https://console.groq.com/docs/rate-limits lists Whisper free limits of 20 requests/minute, 2,000/day, 7,200 audio seconds/hour and 28,800/day; app limits are lower. Groq retention controls remain in https://console.groq.com/docs/your-data . No account or billing changes are authorized. WebKit's MediaRecorder guidance: https://webkit.org/blog/11353/mediarecorder-api/ . Feature detection and a physical-device check remain necessary.

Decisions: use recorded upload rather than browser speech recognition because capture/stop/format/failure can be handled consistently and explicitly consented. Use 60-second clips and a 2 MiB bound to fit the existing server-function transport. Preserve text-only/manual tracking when recording or Groq is unavailable. Source attribution is voice on newly confirmed events without keeping raw audio.


Implementation notes: reuse #273's corrected spoken-number normalization and its original tests (source blob 2557cebf78421ecbb747ae2978173940dc3501cf), without unrelated PR changes. Only two unused-mutation declarations were made const for lint. Normalized parsing preserves original user wording in supported audit fields. Voice channel is stored as existing audit.patch.inputMethod and a visible Voice summary prefix; no new provenance enum or persisted schema.
A bounded independent review found voice-origin loss across clarification. Browser regressions reproduced this plus close/reopen busy-state and clear-conversation capture cancellation; fixes retain the originating method only for actual continuations and invalidate capture at reset boundaries.
CI branch filters explicitly include the stacked base codex/fitcore-core-integration so the voice PR receives the same CI, release gate, dependency review and CodeQL checks; main push triggers remain unchanged.
