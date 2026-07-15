# FitCore Jarvis Operations, Maintenance, and Support

## Document status

- This is a proposed operational and maintenance specification for FitCore's Jarvis assistant.
- No diagnostics, telemetry, or support implementation is included in this task.
- The local-first product should remain functional without a remote operations platform.
- External telemetry is optional and must be separately approved before any implementation.
- Operating procedures must remain practical for a small project (e.g., relying on local logs or manual sharing over automated enterprise remote administration).
- The regular iPhone 15 remains the core support baseline for all required maintenance testing.

## Operational objectives

- **Reliable local operation**: The system must run entirely without continuous cloud monitoring or persistent remote operations connectivity.
- **Transparent component status**: The user must be able to verify whether models, speech, or network fallbacks are functioning correctly.
- **Privacy-safe diagnosis**: Diagnostics must be generated locally and exclude sensitive user data by default.
- **Safe recovery**: Any emergency recovery or restart must protect canonical FitCore data safely without blind replays.
- **Limited recurring cost**: Operational models must ensure API or cloud expenses are either strictly capped or completely avoided.
- **Controlled updates**: Models and dependencies must be version-pinned and safe to roll back.
- **Reproducible releases**: Component releases must be traceable and reproducible using manual deployment mechanisms if necessary.
- **Model and dependency provenance**: Clear source-of-truth must exist for AI models, dependencies, and their licenses.
- **Emergency disablement**: A compromised component must be quickly disabled locally or remotely without taking down the core app.
- **Clear user support**: Support request pathways must explicitly warn against data oversharing.
- **Minimal operational burden**: The operations model should be scaled to a small team.
- **No mandatory cloud monitoring**: Offline functionality does not wait for a telemetry handshake.
- **No sensitive production logs**: No application logs should leak prompts or private history to external dashboards.
- **Compatibility tracking**: Clear baselines exist for minimum supported app version, OS, and model pack.
- **Long-term maintainability**: Solutions should rely on robust baselines rather than fragile custom orchestration.

## Operational principles

1. Local operation does not depend on remote monitoring.
2. User fitness data is not required for most diagnostics.
3. Component status must be inspectable by the user locally.
4. Failures must be categorized consistently (e.g., using a stable error prefix).
5. Support information must be redacted by default.
6. Raw audio is never included in diagnostics by default.
7. Full prompts and transcripts are excluded by default.
8. Model and runtime versions are always identifiable.
9. Updates are pinned and reversible.
10. Critical components can be disabled safely.
11. Optional providers can be disabled without breaking local core features.
12. Operational metrics should measure system health, not profile the user.
13. Cost limits must fail safely to a known local state.
14. Safety incidents receive priority over conversational-quality issues.
15. The iPhone 15 baseline must continue to receive compatible releases.
16. Unsupported configurations must be communicated clearly without blocking safe fallback use.
17. Every emergency procedure must preserve canonical FitCore data.
18. Recovery must never blindly repeat an uncertain write; idempotency handles recovery.

## Operational scope

### Owned by FitCore/Jarvis Operations

- **Native application**: Releasing the containing iOS/selected feasibility candidate shell and verifying its crash rates.
- **Web application**: Deploying the Vite/React core app (`__root.tsx`, `router.tsx`) and checking `serviceWorker` registrations.
- **Bridge protocol**: Verifying message passing integrity.
- **Deterministic parser**: Maintaining local offline text-command parsers.
- **Speech recognition**: Supporting the local STT framework or native capability.
- **End-of-turn detection**: Identifying failures in audio endpointing.
- **Local language model**: Verifying correct model loading and response formatting.
- **TTS**: Supporting text-to-speech feedback mechanisms.
- **Model assets**: Managing download availability, integrity checksums, and version matching.
- **Tool gateway**: Confirming execution context between Jarvis and FitCore services.
- **FitCore canonical services**: Validating that Jarvis commands properly write to standard storage (`src/lib/store.tsx`).
- **Memory storage**: Managing approved Jarvis memory store (e.g., approved structured retrieval) schemas.
- **Model registry**: Maintaining lists of safe and revoked models.
- **Optional provider**: Rotating API keys, setting request limits, and disabling on incident.
- **Diagnostics**: Collecting privacy-safe `AiDiagnostics` (e.g. from `src/components/app/jarvis/jarvis-panel.tsx`).
- **Application releases**: End-to-end publishing to web and App Store.
- **User support**: Triage, reproduction, and resolution of user-reported issues.

### Out-of-Scope (Not Provided)

- 24/7 staffed support.
- Enterprise service-level agreements (SLAs).
- Remote device administration or forced remote restarts.
- Mandatory cloud dashboards for live AI monitoring.
- Permanent collection of user conversations.
- Automatic remote access to device logs or private user local storage.

## Component-health model

```text
Unknown          - Initial status before health check completes.
Initializing     - Component is currently loading (e.g., loading model weights).
Healthy          - Component is fully available and passed internal checks.
Degraded         - Component operates with reduced capacity or safe fallback.
Unavailable      - Component cannot be reached or used temporarily.
Failed           - Component encountered an error during execution.
Disabled         - Component turned off by emergency flag or user setting.
Update required  - Component is obsolete and must be updated to function.
Repair required  - Component is corrupted (e.g., bad model checksum) and needs reinstall.
Revoked          - Component is permanently blocked (e.g., known compromised model).
```

- **Healthy** allows all operations.
- **Degraded** requires safe fallback (e.g., local model if cloud provider fails).
- **Repair required** prompts user action.
- **Revoked/Disabled** block execution and immediately attempt fallback.

## Component inventory and health checks

| Component              | Health check                                                                                      | Healthy result                                                                         | Degraded result         | Failure fallback                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Native bridge          | Ping/Pong heartbeat                                                                               | Bridge active                                                                          | Slow response           | Use web-only UI                                                                          |
| Microphone permission  | OS permission check                                                                               | Granted                                                                                | Intermittent audio      | Text-only input                                                                          |
| Audio session          | Audio route active                                                                                | Active                                                                                 | Background interruption | Reinitialize session                                                                     |
| Speech recognizer      | Initialization check                                                                              | Ready                                                                                  | High latency            | Deterministic/Text input                                                                 |
| Endpoint detector      | Silence detection test                                                                            | Functional                                                                             | Missing endpoints       | Manual 'Stop' button                                                                     |
| Deterministic parser   | Offline parse capability                                                                          | Ready                                                                                  | Grammar limits hit      | Safe no-match, route to conversational model, concise clarification, or text UI fallback |
| Local agent model      | Load and checksum test                                                                            | Loaded                                                                                 | Slow inference          | Deterministic parser                                                                     |
| Model provider (Cloud) | Connection test                                                                                   | Reachable                                                                              | Rate limited            | Local agent model                                                                        |
| TTS                    | Audio playback test                                                                               | Ready                                                                                  | Network TTS blocked     | System default TTS                                                                       |
| Tool gateway           | Contract version match                                                                            | Matched                                                                                | Deprecated tool use     | Reject execution                                                                         |
| Canonical services     | Schema and service initialization, read-only service availability, or checking persistence status | Initialized / Reachable                                                                | Store locked            | Abort operation                                                                          |
| Memory store           | Schema validation                                                                                 | Valid                                                                                  | Partial corruption      | Ignore corrupted rows                                                                    |
| Model registry         | Integrity manifest check                                                                          | Verified                                                                               | Stale manifest          | Block new downloads                                                                      |
| Model files            | SHA256 checksum                                                                                   | Verified                                                                               | File missing            | Prompt repair                                                                            |
| Available storage      | Space check                                                                                       | Dynamically computed based on asset size, temp space, rollback copy, and safety buffer | Space warning           | Stop downloads                                                                           |
| Optional provider      | API key validation                                                                                | Valid                                                                                  | Cap reached             | Local agent model                                                                        |
| Network state          | OS reachability as a hint, bounded request, timeout                                               | Online                                                                                 | Poor connection         | Offline mode                                                                             |

_Note:_ Production startup and status checks must never create, edit, or delete workout, nutrition, recovery, sleep, goal, or body-metric records to prove functionality. The manifest and model manager should compute required storage dynamically. Core local operation must not depend on successful network health checks.

## Jarvis status summary

### Ready

All selected core capabilities are available, including voice, local models, and requested optional providers.

### Limited

Some features unavailable, but safe core behavior remains.
_Examples:_

- Text works but voice input does not.
- System TTS fallback active instead of enhanced voice.
- Deterministic workout commands available but local conversation model unavailable.
- Optional external provider rate-limited, local model active.

### Setup required

Required model assets are missing and must be downloaded.

### Repair required

Installed assets failed verification (e.g., bad checksum) or loading. User action needed to re-download.

### Temporarily unavailable

Device resources (low power, thermal throttle, memory pressure), app lifecycle, or an internal failure prevents use. No FitCore data is at risk.

## Advanced diagnostic information

Available locally to the user in a deep-settings diagnostic screen:

- application version;
- application commit or build ID where appropriate;
- bridge protocol version;
- selected model pack;
- model revision;
- inference runtime version;
- STT model revision;
- TTS model revision;
- installed model size;
- health-check result;
- last safe error code (e.g., `JARVIS-MODEL-001`);
- available storage;
- current audio route;
- permission state;
- thermal status category;
- low-power status;
- optional-provider status;
- last model verification time.

**Prohibited from display/capture:**

- raw provider credentials;
- full private file paths;
- raw prompts;
- full transcripts;
- raw audio;
- private chain-of-thought;
- sensitive FitCore data.

## Operational event taxonomy

```text
INITIALIZATION        - Model loading, bridge setup, component readiness.
MODEL_LIFECYCLE       - Download, verification, eviction, revocation.
AUDIO                 - Microphone routing, interruption, playback.
SPEECH_RECOGNITION    - STT latency, endpointing accuracy, failure.
TURN_ROUTING          - Model vs. deterministic parser choice.
MODEL_INFERENCE       - Latency, token generation rates, context size.
TOOL_EXECUTION        - Validation success, payload structure, service binding.
MEMORY                - Approved Jarvis memory store write, read, approved structured retrieval success.
BRIDGE                - Selected feasibility candidate/Native message passing state.
STORAGE               - Quota warnings, file I/O errors.
SECURITY              - Key validation, revocation enforcement.
PRIVACY               - Redaction triggers, memory access audits.
RESOURCE_PRESSURE     - Memory warnings, thermal state changes (MetricKit events).
OPTIONAL_PROVIDER     - API reachability, budget limits, rate limiting.
USER_RECOVERY         - Reset, retry, repair actions.
APPLICATION_LIFECYCLE - Backgrounding, suspending, active workouts.
```

## Error severity model

### Critical

- **Examples**: Canonical FitCore data corruption; unauthorized action execution; secret exposure; model-integrity bypass; raw-audio privacy failure.
- **Response**: Immediately disable the component, halt execution, notify user safely, trigger incident response.

### High

- **Examples**: Repeatable crash; duplicate write; stale write; cancellation failure; model causes repeated unsafe tool requests.
- **Response**: Intervene with fallback (e.g., switch to deterministic mode), require manual repair or retry.

### Medium

- **Examples**: One component unavailable with safe fallback; model download failure; Bluetooth recovery issue; memory retrieval failure.
- **Response**: Log locally, use fallback silently or with minimal notification, allow user self-repair.

### Low

- **Examples**: Minor diagnostic mismatch; optional voice unavailable; non-blocking wording issue.
- **Response**: Record metric locally for eventual review.

## Stable operational error codes

Format: `JARVIS-<DOMAIN>-<NUMBER>`

- `JARVIS-MODEL-001` - Checksum verification failed.
- `JARVIS-AUDIO-004` - Microphone permission denied.
- `JARVIS-BRIDGE-002` - Native bridge timeout.
- `JARVIS-TOOL-007` - Invalid tool argument structure.
- `JARVIS-MEMORY-003` - Approved structured retrieval index failed to load.
- `JARVIS-STORAGE-002` - Insufficient space for model download.
- `JARVIS-SECURITY-001` - Model explicitly revoked.

_Every operational error must include:_ stable code, component, severity, user-safe message, recoverability, recommended action, technical context (without payload), first/last-seen application version.

## User-facing error behavior

Every user-facing error should state:

1. What is unavailable?
2. Whether any FitCore data changed.
3. What remains available?
4. What the user can do next.

_Example:_

```text
Jarvis could not load the local conversation model (JARVIS-MODEL-001).

No FitCore data was changed.

Workout commands and text entry remain available. You can retry or repair the model in settings.
```

## Local diagnostics policy

Essential diagnostics remain on-device (e.g. leveraging `AiDiagnostics` and `fitcore.jarvis.aiDiagnostics.v1` in `jarvis-panel.tsx`).

The final diagnostics persistence mechanism is selected only after:

- native packaging validation;
- privacy review;
- storage-lifecycle review;
- corruption-recovery review;
- deletion behavior review;
- low-storage testing.

Diagnostics storage must:

- be bounded;
- be local by default;
- exclude raw audio;
- exclude full transcripts;
- exclude full prompts and responses;
- exclude provider credentials;
- exclude canonical health-adjacent values where not necessary;
- support clear and export operations;
- not become a competing source of canonical FitCore data.

Possible local metrics:

- component health statuses;
- initialization failures;
- load duration categories;
- structured-output failures;
- tool failure categories;
- duplicate prevention events;
- stale-turn rejection;
- memory-pressure events;
- thermal-state changes;
- model verification failures;
- download failures;
- fallback use;
- crash or hang summaries exposed by the platform (e.g. MetricKit local payloads).

**Retention Policy**: Must be strictly bounded (e.g., last 50 events as seen in `jarvis-panel.tsx`), automatic expiration, user-clearable, no unbounded log files. Lowest priority for storage during pressure.

## External telemetry decision

**Recommendation for initial release:**

- **No mandatory external telemetry.**
- Local operational counters only.
- Optional privacy-safe diagnostic sharing via user-generated support bundles.
- No full transcript upload.
- No raw health-data upload.
- No advertising analytics.
- No behavioral profiling.
- No dependency on a telemetry vendor.

_Future considerations:_ Limited external telemetry (e.g., anonymous crash reports via Sentry or Lovable's `lovable-error-reporting.ts`) could be justified _only_ if explicitly opt-in and stripped of all personal/health data.

## Operational metric catalog

Privacy-safe metrics:

- Jarvis initialization success rate (Local only);
- local-model load success (Local only);
- STT/TTS initialization success (Local only);
- structured tool-request validity (Local only);
- tool execution success by tool name _without payload_ (Local only);
- stale-turn/duplicate request rejection count (Local only);
- fallback activation (Local only);
- model repair success (Local only);
- model download failure category (Local only);
- app crash category (Optionally shareable via crash reporter if implemented);
- long-session completion (Local only);
- memory-pressure event count (Local only).

## Prohibited diagnostic content

Prohibit by default:

- raw audio;
- full transcripts;
- full prompts;
- full responses;
- workout details;
- nutrition details;
- body measurements;
- injury notes;
- high-sensitivity memory;
- API keys;
- signing credentials;
- file contents;
- arbitrary database rows;
- private chain-of-thought.

## Diagnostic retention

Provisional retention for local diagnostics includes:

- recent error codes;
- recent health checks;
- model verification history;
- recent crash metadata;
- support-bundle staging;
- optional user-approved detailed diagnostics.

Requirements:

- bounded size (e.g. ring buffers);
- automatic expiration;
- user clear control;
- no unbounded log files;
- no impact on active workout storage;
- low-storage cleanup priority.

## Privacy-safe support bundle

A future support bundle will contain only approved information:

```text
application version
build ID
device model
iOS version
model pack and revision
runtime versions
bridge protocol
component health
permission state
audio route category
storage status
thermal event summary
error codes
redacted event timeline
```

Excluded by default: full transcripts, raw audio, prompt content, FitCore records, memory content, provider keys, user identity.

## Support-bundle creation flow

```text
User opens diagnostics
    ↓
Selects Create Support Bundle
    ↓
Application shows exact included categories (preview)
    ↓
User reviews and approves
    ↓
Bundle is generated locally (with redaction)
    ↓
User chooses whether and where to share it (e.g., iOS Share Sheet)
    ↓
Temporary bundle is deleted after use or expiration
```

Requires: preview, redaction, explicit sharing, no automatic upload, temporary-file cleanup, ability to cancel.

## Optional detailed diagnostic capture

If deeper capture is ever required (e.g., persistent crash):

- explicit user opt-in;
- narrow duration (e.g., next 10 minutes);
- clear categories of captured data;
- no hidden capture;
- no raw audio unless separately approved;
- automatic expiration;
- local review where practical;
- separate consent from ordinary support bundle.

## User self-service recovery

Available actions (e.g. via `settings.tsx` or Jarvis panel):

- retry initialization;
- stop current session;
- switch to text;
- use system TTS;
- verify models;
- repair model pack;
- redownload missing file;
- clear temporary downloads;
- unload model;
- restart Jarvis;
- reset Jarvis settings;
- clear conversation history;
- delete Jarvis memory;
- delete downloaded models.

**Rule**: Recovery actions must not delete canonical FitCore data (like the `reset()` function in `src/lib/store.tsx`) unless explicitly stated.

## Repair hierarchy

```text
Retry component
    ↓
Reset current Jarvis session
    ↓
Reload model
    ↓
Verify installed assets
    ↓
Repair missing assets
    ↓
Reinstall model pack
    ↓
Reset Jarvis-specific state
    ↓
Application update
```

Do not use “clear all app data” as the default recovery.

## Safe application restart behavior

Require:

- completed FitCore writes remain complete (persisted safely);
- uncertain writes are reconciled through idempotency;
- unexecuted pending writes do not replay;
- pending confirmations expire;
- old speech does not resume;
- active workout remains safe;
- model status recalculates;
- temporary audio buffers are removed.

## Model maintenance

Ongoing responsibilities:

- model-source monitoring (e.g., Hugging Face availability);
- revision tracking;
- license monitoring (verifying open weights);
- security advisories (e.g., compromised tensors);
- behavioral regressions (testing prompt accuracy);
- runtime compatibility (approved inference runtime updates);
- iOS compatibility;
- model revocation (publishing blocklists);
- rollback (keeping previous known-good model hash);
- storage impact (monitoring 4-bit vs 8-bit sizes);
- download-host availability.

## Runtime maintenance

Maintain:

- inference runtime (e.g., local LLM engine);
- speech framework (approved speech-recognition provider);
- TTS framework (AVSpeechSynthesizer);
- native bridge framework;
- Selected feasibility candidate or approved native container once validated;
- Swift packages;
- JavaScript dependencies (e.g. `bun install` monitoring via Dependabot);
- iOS SDK.

Require: version pinning, update review, changelog review, security review, regression testing, physical-device requalification where required.

## Dependency update classes

- **Security update**: Highest priority. Mitigates CVEs.
- **Compatibility update**: Needed for operating-system or toolchain support (e.g. iOS 18 readiness).
- **Bug-fix update**: Adopt when relevant and tested.
- **Feature update**: Optional and should not destabilize the baseline.
- **Major-version update**: Requires dedicated migration and qualification.

## Model update classes

- **Security or revocation**: Highest priority (e.g., model generates malicious output).
- **Compatibility**: Required for new inference engine versions.
- **Quality improvement**: Better prompt adherence.
- **Size reduction**: More efficient quantization.
- **License change**: Must verify continued use.
- **Optional enhanced model**: Offered as an upgrade for iPhone 16+ users.

Require different approval and testing levels for each class.

## Maintenance cadence

For a small project:

- **Continuous or event-driven**: critical security advisories, compromised model, exposed credential, severe crash, data-integrity issue.
- **Monthly or release-based**: dependency review, model-source review, issue review, storage and diagnostic behavior review.
- **Quarterly or milestone-based**: device support, minimum iOS review, model quality, optional-provider cost, license inventory, recovery procedures.

Do not create scheduled automations; rely on manual trigger or natural release cycles.

## Compatibility support matrix

A future matrix will contain:

- FitCore app version;
- bridge protocol;
- minimum iOS version;
- supported device class;
- model-pack version;
- runtime version;
- tool-contract version;
- memory schema version.

Requires known-compatible combinations, blocked combinations, migration paths, rollback paths, and user-visible update requirements.

## iPhone support policy

- Regular iPhone 15 remains the binding baseline for the initial supported generation.
- iPhone 16 uses the same core contracts.
- Optional enhancements are capability-based (e.g., larger RAM models).
- Device-specific model packs require demonstrated benefit.
- Older-device support must not be promised without testing.
- Support removal requires explicit notice and migration planning.

## iOS support policy

Criteria for OS versions:

- minimum supported iOS (e.g. iOS 17.4+ for certain AI features);
- testing latest public release;
- supporting previous versions where technically feasible;
- beta iOS testing (identify issues but do not block release on beta bugs);
- removing old iOS support gracefully;
- native framework requirements;
- Apple Foundation Models availability (if leveraging system AI later).

Do not lock a minimum version without implementation evidence.

## Feature capability negotiation

The app determines whether a feature is available based on:

- device, OS, installed assets, runtime, permissions, storage, thermal state, optional provider, current app state.

Require:

- unsupported capabilities hidden or clearly disabled;
- no unsafe assumption (always test capability);
- no iPhone-model string parsing as the only decision criterion when capability detection (e.g., RAM size check) is available.

## Emergency disablement

Ability to disable:

- compromised model pack;
- optional provider (e.g. Groq/Gemini key compromised);
- unsafe write tool;
- hands-free mode;
- enhanced TTS;
- memory proposals;
- a problematic runtime capability.

Core FitCore use (manual logging, text input) must remain available.

## Emergency-disablement mechanisms

Recommended approach:

- **Bundled revocation list & Application update**: Provide a hardcoded blocklist of revoked model hashes/keys in the app bundle. An app update is required to update the blocklist. This ensures offline core use does not depend on a remote configuration server or risk an MITM attack altering remote flags.

Require:

- emergency controls cannot enable new privileges;
- remote data cannot bypass signature or integrity controls;
- revocation behavior is user-visible;
- previous safe fallback remains available.

## Incident categories

- data integrity;
- privacy (e.g., leaked transcript);
- security (e.g., compromised key);
- model supply chain;
- dependency supply chain;
- provider outage;
- model quality (severe hallucination);
- application stability (crash loop);
- model download failure;
- audio routing loop;
- device compatibility;
- storage exhaustion;
- performance (thermal runaway);
- accessibility block.

## Incident response lifecycle

```text
Detection
    ↓
Triage
    ↓
Containment
    ↓
User-impact assessment
    ↓
Mitigation
    ↓
Fix or rollback
    ↓
Regression testing
    ↓
Release
    ↓
Post-incident review
```

## Critical incident handling

For a critical incident:

- stop affected capability;
- preserve canonical FitCore data;
- do not collect unnecessary user information;
- identify affected versions;
- prepare safe fallback;
- fix or rollback;
- re-run required safety suites (Playwright E2E);
- document user communication needs;
- add permanent regression test where feasible.

## Model incident handling

Response to:

- compromised file/bad checksum -> disable loading, require repair.
- unsafe behavior regression -> switch to deterministic mode/rollback.
- repeated malformed tools -> revoke model, notify user.
- license issue -> remove download source, require application update.
- download-host compromise -> revoke URL, release app update.

## Optional-provider incident handling

Response to: provider outage, elevated error rate, cost spike, credential leak, policy change.

Require:

- local fallback (switch to local model immediately);
- provider disablement;
- credential revocation if leaked;
- no loss of canonical data;
- no endless retry (cap at 1-2 attempts);
- no silent provider substitution (user must know who is processing data).

## Cost-governance principles

1. Core local use has no per-request AI API cost.
2. Optional providers remain optional.
3. Provider costs are visible before enablement (Bring Your Own Key or explicit budget).
4. Usage limits are configurable.
5. Cost-limit exhaustion fails back to local behavior.
6. No unlimited retry billing.
7. No provider key is shared publicly.
8. Model-hosting bandwidth is tracked separately from inference cost.
9. App Store and developer-account costs are not misrepresented as AI API costs.
10. Free tiers are not assumed permanent.

## Recurring-cost inventory

| Cost category           | Required for core | Recurring | Controllable | Notes                                   |
| ----------------------- | ----------------- | --------- | ------------ | --------------------------------------- |
| Local inference         | Yes               | No        | N/A          | Processed on device                     |
| Model hosting bandwidth | Yes               | Yes       | Yes          | CDN/GitHub/R2 hosting for model weights |
| Apple Developer Program | Yes               | Yes       | No           | Fixed $99/yr                            |
| macOS build access      | Yes               | Yes       | No           | CI hardware or local Mac                |
| GitHub Actions          | Yes               | Yes       | Yes          | Free tier usually sufficient            |
| Optional cloud LLM      | No                | Yes       | Yes          | Only if user opts-in via API key        |
| Optional cloud speech   | No                | Yes       | Yes          | Only if implemented                     |
| Crash reporting         | No                | Yes       | Yes          | E.g. Sentry (optional)                  |
| Telemetry               | No                | Yes       | Yes          | Must explicitly approve                 |
| Object storage          | Yes               | Yes       | Yes          | For model file backups                  |
| CDN                     | Yes               | Yes       | Yes          | Caching model downloads                 |
| Domain or backend       | No                | Yes       | Yes          | Vercel/Cloudflare (low cost)            |
| Support tools           | No                | Yes       | Yes          | GitHub issues (free)                    |

Distinguishes unavoidable distribution cost from optional per-user inference cost.

## Cost tiers

### Local-only baseline

- Goal: no per-request AI cost; minimal hosting; local speech, model, and TTS; no mandatory cloud telemetry.

### Low-cost optional tier

- Potential budget: limited optional external reasoning; strict monthly cap (or BYOK); local default; explicit opt-in.

### Expanded optional tier

- Potentially supports: more external reasoning; optional web research; larger monthly cap; still preserves local fallback.

## Optional-provider budgets

Controls required if integrated via central backend (or if BYOK limits are enforced locally):

- monthly request limit;
- monthly monetary cap;
- per-request token limit;
- maximum context window strictly enforced;
- eligible request categories only;
- user confirmation for expensive requests;
- no background requests;
- no automatic retries beyond a bounded limit (e.g., 2);
- usage display;
- hard stop;
- local fallback.

## Cost-failure behavior

When an optional-provider limit is reached:

- current FitCore data remains safe;
- local provider remains available and activates immediately;
- user receives clear status ("Rate limit reached, using local model");
- no hidden overage;
- no request loop;
- user may increase limit only through explicit settings;
- core features do not become locked.

## Model-hosting cost strategy

- **Official-host downloads**: E.g., Hugging Face. Good for development, bandwidth limits may apply.
- **GitHub Releases**: Free for small files, not ideal for gigabyte models.
- **Object storage (S3/R2)**: Predictable pricing, but bandwidth costs scale with users.
- **CDN (Cloudflare)**: Low bandwidth costs, but limits on large file caching.
- **Application-bundled assets**: Too large for App Store OTA limits.

**Recommendation**: Use Hugging Face with pinned commit hashes for feasibility, migrate to Cloudflare R2 + CDN for production to cap bandwidth costs. Do not create hosting resources yet.

## Support model

### Self-service

- status, diagnostics, repair, help, known limitations, model management available in-app.

### Issue report

- concise problem description via GitHub Issue (using `bug_report.yml`);
- app and component versions;
- optional privacy-safe support bundle text;
- reproduction steps.

### Critical privacy or security report

- separate private reporting path (e.g. security@fitcore... or GitHub Private Vulnerability Reporting);
- no public disclosure of secrets or sensitive data.

### Feature request

- separated from defect reports (using `feature_request.yml`).

## Support-request template

```text
What were you trying to do?
What happened?
Did any FitCore data change?
Can you reproduce it?
Device model:
iOS version:
Application version:
Jarvis status:
Audio route:
Error code:
Optional support bundle (redacted text only):
```

**Warning**: Do not include API keys, full health history, raw audio, sensitive screenshots, or full private transcripts unless explicitly necessary and reviewed.

## Known-issues management

Future known-issue records (tracked in GitHub) will contain:
issue ID, affected versions, affected component, severity, symptoms, workaround, data-safety impact, status, fixed version.

Require: critical safety issues clearly identified; no misleading “known issue” downgrade for release-blocking defects; obsolete issues closed or archived.

## User communication principles

Operational communication should be:

- specific, calm, honest, actionable;
- clear about data impact;
- clear about available fallback;
- free from implementation jargon.

_Example:_

```text
The enhanced local voice is unavailable after the update.

Your FitCore data is safe. Jarvis will use the system voice until the voice pack is repaired.
```

## Release support

For every Jarvis release define:
supported app version, supported model packs, runtime versions, known limitations, required model updates, rollback path, support period, emergency-disablement capability, release notes.

## Release notes

Distinguish:

- user-visible changes;
- model changes;
- runtime changes;
- tool changes;
- privacy changes;
- storage impact (e.g., "Model download requires 1.5GB");
- compatibility changes;
- removed capabilities;
- resolved safety issues (without exposing exploit details before mitigation).

## Post-release checks

Manual review and local diagnostics to check:
model load, model download, bridge readiness, tool errors, duplicate or stale-write reports, crashes, memory pressure, thermal fallback, support issues, model-host availability, optional-provider cost, license or policy changes.
_The first implementation relies on manual review and local diagnostics rather than a remote dashboard._

## Maintenance records

Records (tracked via Git commits, PRs, and tags):
application release, model release, runtime update, dependency update, license review, incident, rollback, emergency disablement, device-support change, iOS-support change.
_No separate files or trackers are created in this task._

## Configuration ownership

| Configuration        | Source of truth                                                | Change process   | Rollback                                  |
| -------------------- | -------------------------------------------------------------- | ---------------- | ----------------------------------------- |
| Application version  | `package.json` / Xcode                                         | PR merge         | Git revert                                |
| Model pack           | Model Manifest                                                 | PR merge         | Revert manifest                           |
| Runtime              | Dependency lockfile                                            | `bun update`     | Revert `bun.lock`                         |
| Prompt version       | Source code                                                    | PR merge         | Git revert                                |
| Tool catalog         | Source code                                                    | PR merge         | Git revert                                |
| Bridge protocol      | TS/Swift interface                                             | Lockstep PR      | Revert both sides                         |
| Memory schema        | Current FitCore persistence services init / `src/lib/types.ts` | Schema migration | Complex (requires careful down-migration) |
| Provider settings    | Local UI / `jarvis-panel.tsx`                                  | User input       | Reset to default                          |
| Cost limits          | Local UI                                                       | User input       | Reset to default                          |
| Feature capabilities | Source code flags                                              | PR merge         | Git revert                                |

## Prompt and behavior maintenance

Maintain: system instructions, tool-use rules, response-mode instructions, safety rules, prompt-injection controls, context format, summary prompt, memory proposal rules.

Require: prompt versioning (in git), regression tests, no silent behavior change, model-specific prompt review, rollback, no prompt content containing secrets.

## Tool maintenance

Any tool addition or modification requires:
versioned contract, canonical service confirmation, risk classification, validation, confirmation behavior, Undo, idempotency, tests, user-facing explanation, support documentation, emergency disablement for high-risk tools.

## Memory maintenance

Maintain: schema migrations, expiration, superseded records, corrupted records, indexing, deletion, support diagnosis, privacy review.

Require migrations to preserve canonical FitCore data separation (Jarvis AI memory must not mix directly into domain tables without explicit tools).

## Storage maintenance

Handling for: model files, partial downloads, diagnostics, conversations, memories, caches, rollback versions, temporary support bundles.

Cleanup priorities:

1. Temporary files (Support bundles).
2. Expired diagnostics.
3. Obsolete partial downloads.
4. Old rollback model after safe retention.
5. Optional assets (Enhancement packs).
6. Saved conversations only through user-visible policy.
7. **Never silently delete canonical FitCore data.**

## Low-storage operations

When storage is low:

- stop nonessential downloads;
- remove stale temporary files;
- offer model management;
- preserve active workout and canonical data;
- avoid new large diagnostic bundles;
- explain unavailable features;
- do not automatically clear user conversations unless policy permits and the user is informed.

## Performance regression operations

Indicators: slower model load, slower first token, slower first audio, increased memory, thermal escalation, battery increase, increased structured-output failure, increased fallback use.

Require comparison against an approved baseline by device, OS, model, runtime, build.

## Model quality regression operations

Track representative evaluation outcomes for:
tool selection, argument extraction, missing-data honesty, concise workout behavior, confirmation, unsafe request rejection, prompt injection, conversation continuity.

A quality regression may require rollback even if raw token speed improves.

## Accessibility operations

Defects are: reported via standard templates, prioritized, reproduced, validated on physical devices (VoiceOver), included in release gates. Core text-only use and Stop controls must remain accessible.

## Privacy operations

Procedures for: memory deletion failure, transcript deletion failure, raw-audio retention incident, support-bundle redaction failure, optional-provider disclosure change, diagnostic overcollection. Require immediate containment for high-risk privacy failures.

## Security operations

Procedures for: dependency vulnerability (via GitHub dependabot/advisories), model compromise, provider-key exposure, bridge security defect, arbitrary tool execution, prompt-injection bypass, signing-credential exposure. Do not expose remediation secrets publicly.

## Backup and recovery operations

- model assets are re-downloadable where possible;
- model registry can be rebuilt;
- canonical FitCore data recovery is separate (uses `src/lib/data-backup.ts`);
- Jarvis memory recovery policy must be documented;
- provider credentials may require re-entry;
- support bundle is not a backup;
- rollback does not restore deleted user data unless explicitly designed.

## Migration and end-of-life planning

Retiring: old model pack, old runtime, old bridge protocol, old memory schema, old iOS version, old device class, optional provider, deprecated tool.

Require: notice, migration, fallback, data preservation, license retention, deletion of obsolete assets, no silent loss of capability.

## Model end-of-life

Retired because of: license change, security issue, runtime incompatibility, poor behavior, excessive storage, unavailable source, superior replacement.

Define: deprecation period, replacement download, rollback limit, revocation if unsafe, user notice, removal.

## Provider end-of-life

Define: disable new requests, revoke credentials, delete stored credentials, remove provider-specific settings, preserve local fallback, disclose impact, delete cached provider data where applicable.

## Operational ownership matrix

| Area                   | Primary owner role  | Review role     | Escalation      |
| ---------------------- | ------------------- | --------------- | --------------- |
| Application            | Core Maintainer     | Contributor     | Core Maintainer |
| Native iOS             | iOS Engineer        | Core Maintainer | Core Maintainer |
| Models                 | AI Engineer         | Core Maintainer | Core Maintainer |
| Tools                  | Backend/AI Engineer | Core Maintainer | Core Maintainer |
| FitCore services       | Core Maintainer     | Contributor     | Core Maintainer |
| Security               | Security Reviewer   | Core Maintainer | Core Maintainer |
| Privacy                | Privacy Reviewer    | Core Maintainer | Core Maintainer |
| Accessibility          | Frontend Engineer   | Core Maintainer | Core Maintainer |
| Releases               | Core Maintainer     | QA Reviewer     | Core Maintainer |
| Support                | Community Support   | Core Maintainer | Core Maintainer |
| Incidents              | Core Maintainer     | Security/AI     | Core Maintainer |
| Optional-provider cost | Operations/Finance  | Core Maintainer | Core Maintainer |

_(Conceptual matrix for a small team, no named personnel)._

## Operational readiness gates

Before production or broad beta use, require:

- component health checks;
- user-visible status;
- stable error codes;
- privacy-safe diagnostics;
- support-bundle design;
- repair flows;
- model rollback;
- emergency disablement;
- optional-provider hard limits;
- known-issue process;
- release notes;
- dependency and model inventory;
- license records;
- incident process;
- support-request process;
- storage cleanup;
- physical-device recovery validation;
- canonical FitCore data preserved during failures.

## Minimum operational baseline

First implementation recommendation:

- local component health checks;
- advanced diagnostics screen (exposing `AiDiagnostics`);
- stable error codes (`JARVIS-XXX`);
- privacy-safe local event history (approved bounded local diagnostics store);
- model verification and repair logic;
- model delete and reinstall controls;
- system TTS and deterministic text fallback;
- optional support bundle (redacted text);
- model and runtime version display;
- emergency model revocation via app update;
- write-tool disablement;
- no mandatory external telemetry;
- explicit optional-provider budget (or BYOK);
- manual support process via GitHub issues.

## Deferred operational capabilities

Deferred: live remote dashboards, automatic crash upload, behavioral analytics, remote feature configuration, full automated incident paging, cross-device support history, enterprise support tooling, automatic diagnostic-audio upload, extensive A/B testing, cloud cost optimization platform.

## Rejected operational approaches

- **Mandatory cloud monitoring**: Breaks offline availability.
- **Full prompt/raw-audio logging**: Unacceptable privacy violation.
- **Embedding API keys in the app**: Insecure, requires BYOK or backend passthrough.
- **Unlimited optional-provider spending**: Risk of API billing spikes.
- **Automatic retry of paid requests**: Cost runaway.
- **Silent model updates**: Users must consent to bandwidth use and model changes.
- **Unsupported remote code changes**: Risk of bypassing Apple App Store review and security.
- **Remote configuration that can expand permissions**: Must be impossible.
- **Using user fitness data as diagnostic metadata**: Health data must remain isolated from diagnostics.
- **Recommending full app-data deletion as first-line repair**: Destructive.
- **Retaining support bundles indefinitely**: Wastes storage.
- **Abandoning iPhone 15 baseline**: Excludes target hardware.
- **Relying on one developer’s memory**: Everything must be documented.

## Repository-grounded operations map

| Operational area | Existing repository behavior                                      | Reusable capability                   | Gap                             | Future action                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logging          | `console.log` / `console.error`                                   | Standard browser API                  | No persistent log file          | Use approved bounded local diagnostics store for critical events                                                                                      |
| Errors           | `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | Error boundaries and Sentry-like hook | No Jarvis-specific stable codes | Define `JARVIS-XXX` codes and capture in `AiDiagnostics`                                                                                              |
| Settings         | `settings.tsx`, `jarvis-panel.tsx`                                | UI toggles and local storage          | Missing diagnostic screen       | Add Diagnostics UI sub-panel                                                                                                                          |
| Versioning       | `package.json` version                                            | Vite injection                        | No AI model versioning          | Add model metadata registry                                                                                                                           |
| Migrations       | `fitcore-data.ts`, `data-backup.ts`                               | Data schema migration logic           | No AI memory migration          | Extend atomic persistence for AI schema                                                                                                               |
| SW Updates       | `__root.tsx` (`register("/sw.js")`)                               | PWA service worker check              | SW not caching huge models      | Exclude AI weights from standard SW cache                                                                                                             |
| Reset            | `store.tsx` (`reset()`)                                           | Clears all data                       | Destructive default             | Build granular repair (model delete only)                                                                                                             |
| Data deletion    | `atomic-persistence.ts`                                           | Wipes persistence                     | Too broad for AI fixes          | Implement `uninstallJarvisModels()`                                                                                                                   |
| CI               | `.github/workflows/ci.yml`, `manual.yml`                          | Lint, Build, Playwright E2E           | No native iOS tests             | Add approved native container once validated/iOS build checks                                                                                         |
| Dependencies     | `bun install`, `package.json`                                     | Bun lockfile                          | No ML runtime lock              | Pin the approved inference, speech-recognition, endpointing, speech-output, native-container, and model-management dependencies to reviewed versions. |
| Issue templates  | `.github/ISSUE_TEMPLATE/bug_report.yml`                           | Standard GitHub forms                 | No Jarvis fields                | Update templates for AI version info                                                                                                                  |
| Diagnostics      | `AiDiagnostics` in `jarvis-panel.tsx`                             | Local telemetry object                | Not exposed securely            | Build Support Bundle export                                                                                                                           |
| Telemetry        | Optional `lovable-error-reporting.ts`                             | Remote error hook                     | Highly restricted               | Ensure AI prompts never reach this                                                                                                                    |
| Offline state    | OS reachability as a hint, bounded request, timeout               | basic PWA                             | Needs deterministic fallback    | Implement offline NLP rules                                                                                                                           |

## Open operational questions

- Whether external telemetry (e.g. Sentry/Lovable) will ever be used beyond basic React errors.
- Crash-reporting provider for native iOS.
- Diagnostic retention exact bounds (e.g., 50 events vs 5MB).
- Support-bundle format (JSON vs plain text).
- Private security-reporting method (email vs GitHub Security Advisories).
- Model-hosting source (HF vs R2).
- Model-hosting bandwidth budget per user.
- Sustainable Mac access for CI.
- Apple Developer Program status.
- Optional-provider budget (BYOK vs central API proxy).
- Supported iOS window (e.g., iOS 17 vs 18).
- Supported device window (iPhone 15+).
- Release cadence.
- Long-term support ownership.
- Conversation-backup policy (synced vs local only).
- Memory migration strategy across schemas.

## Final recommendation summary

FitCore Jarvis will use a **local-first operational model**.
The system will rely on local **component-health systems** to verify model integrity, STT/TTS status, and network reachability. **Diagnostics** will be generated on-device, strictly privacy-safe, and compiled into an optional **support bundle** that excludes raw audio and private FitCore data by default.

**Repair** will favor granular actions (e.g., re-downloading a model) over destructive app-wide resets. **Model and dependency maintenance** will use pinned versions, with **emergency disablement** handled via app updates or local fallback mechanisms rather than mandatory cloud orchestration. **Incident response** prioritizes containing data corruption over maintaining AI chat availability.

**Cost controls** ensure zero recurring per-request API costs for core local use, while limiting optional-provider budgets strictly. **Support** relies on manual GitHub issues rather than enterprise remote tools. **Release operations** tie into the existing Vite/Playwright baseline. The **minimum operational baseline** ensures the regular iPhone 15 can safely detect and recover from AI failures locally. The largest unresolved operational risk is the long-term CDN bandwidth cost for distributing gigabyte-scale model weights.

## References

- Apple, _MetricKit_, https://developer.apple.com/documentation/metrickit, 2024-03
- Apple, _os_log_, https://developer.apple.com/documentation/os/os_log, 2024-03
- OWASP, _Top 10 for Large Language Model Applications_, https://owasp.org/www-project-top-10-for-large-language-model-applications/, 2024-03
- GitHub, _Security Advisories_, https://docs.github.com/en/code-security, 2024-03
- NIST, _Computer Security Incident Handling Guide_, https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final, 2024-03

---

## Diagrams

### Component-health and fallback flow

```text
[User Request]
      │
      ▼
[Health Check: Microphone] ──(Failed)──> [Fallback: Text Input Only]
      │
   (Healthy)
      │
      ▼
[Health Check: Speech Recognizer] ──(Failed)──> [Fallback: Deterministic Parser]
      │
   (Healthy)
      │
      ▼
[Health Check: Model Integrity] ──(Failed)──> [Fallback: Block / Repair Prompt]
      │
   (Healthy)
      │
      ▼
[Execute Task]
```

### Error diagnosis and repair flow

```text
[Error Encountered] ──> [Generate JARVIS-XXX Code]
                                │
                                ▼
                        [Severity Check]
                       /       |        \
                (Low)       (Medium)      (Critical)
                  |            |              |
             [Log Local]  [Use Fallback]  [Halt & Notify]
                               |              |
                               ▼              ▼
                        [User Views Diagnostics UI]
                               |
                               ▼
                        [Select Repair Action]
                        (e.g., Re-download Model)
```

### Privacy-safe support-bundle flow

```text
[User Requests Support] ──> [App Compiles `AiDiagnostics`]
                                   │
                                   ▼
[Filter: Exclude Prompts, Audio, Records]
                                   │
                                   ▼
[Generate Preview JSON/Text] ──> [User Reviews Data]
                                   │
                             (User Approves)
                                   │
                                   ▼
[Export via Share Sheet] ──> [Copy to GitHub Issue]
                                   │
                                   ▼
[App Deletes Temporary Bundle]
```

### Model and dependency maintenance flow

```text
[Maintainer Monitors Sources] ──> [New Security Advisory/Version]
                                       │
                                       ▼
                              [Evaluate Impact]
                             /                 \
                    (Security/CVE)        (Feature/Routine)
                          |                     |
                  [Immediate Patch]       [Scheduled Release]
                          |                     |
                          ▼                     ▼
               [Update Lockfiles/Manifests & Run E2E Tests]
                                       |
                                       ▼
                               [Deploy Release]
```

### Emergency-disablement flow

```text
[Critical Incident Detected]
(e.g., Compromised Model Host)
      │
      ▼
[App Update Deployed with Revoked Hash]
      │
      ▼
[User Installs Update]
      │
      ▼
[Model Initialization Validates Hash] ──(Matches Revoked)──> [Block Load]
                                                                │
                                                                ▼
                                                    [Fallback: Deterministic]
```

### Incident-response flow

```text
[Detection (Local Crash/Report)] ──> [Triage (Severity/Impact)]
                                           │
                                           ▼
[Containment (Provide Workaround/Fallback)] ──> [Assess Data Impact]
                                           │
                                           ▼
[Mitigation (Patch Code/Revoke Model)] ──> [Deploy Fix]
                                           │
                                           ▼
                              [Post-Incident Review]
```

### Optional-provider cost-limit flow

```text
[Tool Needs External Reasoning]
      │
      ▼
[Check Local Budget/Rate Limit] ──(Limit Exceeded)──> [Fallback to Local Model]
      │
   (Within Limit)
      │
      ▼
[Send Request to Provider] ──(Provider Error/Outage)──> [Fallback to Local Model]
      │
   (Success)
      │
      ▼
[Process Response & Update Usage Counter]
```

### Release and post-release support flow

```text
[PR Merged] ──> [CI: Lint, Build, E2E]
                      │
                      ▼
            [App Store / Web Deploy]
                      │
                      ▼
[User Updates] ──> [Post-Release Checks (Local Diagnostics)]
                      │
                      ▼
[Issues Reported via GitHub] ──> [Triage & Resolution]
```
