# FitCore Jarvis Implementation Sequence and Readiness Gates

## Document status

This is the proposed controlling implementation sequence for FitCore's Jarvis assistant. No implementation is included in this document. Implementation must not begin until documentation reconciliation and entry gates pass. The sequence may be revised only through explicit reviewed decisions. The regular iPhone 15 is the binding baseline target. Optional iPhone 16 capabilities must remain isolated behind shared contracts. The final merged premium UI baseline must be respected.

## Purpose

This plan exists to prevent:

- premature coding
- overlapping branches
- duplicate business logic
- unsafe model access
- direct persistence writes
- model selection before device testing
- voice work before native packaging is proven
- write tools before idempotency and stale-turn protection
- memory before deletion and privacy controls
- large unreviewable PRs
- implementation on top of unstable UI branches

## Implementation principles

1. Documentation decisions precede implementation.
2. Feasibility precedes full integration.
3. The iPhone 15 is tested first.
4. Canonical FitCore services remain authoritative.
5. Deterministic capabilities precede probabilistic write access.
6. Read-only model access precedes model-requested writes.
7. Every phase has explicit entry and exit gates.
8. Safety failures stop downstream work.
9. File ownership controls concurrency.
10. One responsibility per implementation PR.
11. Mocked contracts precede real model integration.
12. Real-model evaluation remains separate from deterministic unit testing.
13. Native and web boundaries remain typed and versioned.
14. Optional providers cannot become core dependencies.
15. Reversible scope reduction is preferable to unsafe implementation.
16. Existing FitCore behavior must remain passing.
17. Long-session physical-device evidence is mandatory.
18. Documentation and implementation must remain synchronized.
19. Implementation reports must provide reproducible evidence.
20. No phase is complete merely because code compiles.

## Program phases overview

| Phase    | Name                                           | Primary outcome        | Write access | Physical device required |
| -------- | ---------------------------------------------- | ---------------------- | ------------ | ------------------------ |
| Phase 0  | Documentation reconciliation                   | Approved baseline      | No           | No                       |
| Phase 1  | Repository and service readiness               | Stable codebase        | No           | No                       |
| Phase 2  | Native packaging feasibility                   | iOS app wrapper        | No           | Yes                      |
| Phase 3  | Local voice and model feasibility              | Proven baseline limits | No           | Yes                      |
| Phase 4  | Shared contracts and mock architecture         | Testable types         | No           | No                       |
| Phase 5  | Deterministic workout assistant                | Read/Write             | Yes          | Yes                      |
| Phase 6  | Read-only conversational Jarvis                | Read-only              | No           | Yes                      |
| Phase 7  | Safe write-tool integration                    | Controlled writes      | Yes          | Yes                      |
| Phase 8  | Full voice conversation                        | Integrated pipeline    | Yes          | Yes                      |
| Phase 9  | Context, memory, and persistence               | Memory state           | Yes          | Yes                      |
| Phase 10 | Model lifecycle and offline hardening          | Reliable model ops     | Yes          | Yes                      |
| Phase 11 | Privacy, security, and accessibility hardening | Safe access            | Yes          | Yes                      |
| Phase 12 | Long-session and field validation              | Real-world reliability | Yes          | Yes                      |
| Phase 13 | Alpha stabilization                            | Internal usability     | Yes          | Yes                      |
| Phase 14 | Beta and release-candidate qualification       | Feature completeness   | Yes          | Yes                      |
| Phase 15 | Production readiness and maintenance           | Live operations        | Yes          | Yes                      |

## Dependency graph

```text
Documentation reconciliation
        ↓
Canonical service audit
        ↓
Native packaging spike
        ↓
Bridge contracts and mocks
        ↓
Voice/model feasibility spike
        ↓
Deterministic command engine
        ↓
Read-only tools and conversation
        ↓
Safe write tools
        ↓
Voice integration
        ↓
Memory
        ↓
Hardening
        ↓
Long-session validation
        ↓
Release candidate
```

## Phase 0 — Documentation reconciliation

After all 15 Jarvis documentation PRs are available, a mandatory reconciliation pass must occur. The reconciliation must compare terminology, architecture recommendations, identify contradictions, duplicate concepts, missing decisions, unsupported assumptions, inconsistent identifiers, incompatible model/runtime/voice/storage/packaging recommendations, conflicting privacy or retention rules, conflicting phase order, and unresolved legal or license questions.

## Documentation-reconciliation outputs

The later reconciliation process must produce:

- approved terminology list
- approved architecture baseline
- approved component-selection decisions
- approved iPhone 15 baseline configuration
- approved tool risk classes
- approved storage boundaries
- approved privacy baseline
- approved implementation phase order
- unresolved-decision register
- explicit rejected alternatives
- list of docs requiring corrective follow-up

## Documentation conflict-resolution hierarchy

1. User’s locked product requirements.
2. Safety, privacy, and data-integrity constraints.
3. Verified physical-device feasibility.
4. Canonical FitCore service architecture.
5. Simplicity and maintainability.
6. Performance.
7. Optional feature quality.
8. Convenience.

## Phase 0 exit gate

Require:

- all 15 docs reviewed
- major contradictions resolved
- component candidates reduced to approved feasibility options
- no unresolved licensing blocker for the spike
- iPhone 15 target reaffirmed
- canonical service boundaries identified
- initial native packaging approach approved
- no active premium UI branch conflicts with planned implementation files
- implementation task list approved

## Phase 1 — Repository and service readiness

A repository-readiness phase verifies:

- final premium UI branches are merged or safely isolated
- application baseline is stable
- active-workout flows pass
- analytics flows pass
- canonical services are identifiable
- write operations are not trapped only inside UI components
- storage behavior is understood (e.g. `src/lib/store.tsx` and `src/lib/runtime-persistence.ts`)
- routing and current-context state are discoverable
- existing tests (`tests/e2e`, `tests/unit`) are green
- native-wrapper integration point is known

## Canonical-service audit

The bounded audit before tool implementation must identify:

- service-ready reads
- service-ready writes
- UI-only business logic needing extraction
- duplicated calculations
- transaction and idempotency gaps
- Undo gaps
- timer ownership
- active-workout state ownership
- analytics source of truth
- navigation contracts

## Phase 1 exit gate

Require:

- stable merged application baseline
- canonical service map approved
- known write operations categorized
- hotspot files identified
- existing test suite passing
- planned Jarvis file ownership mapped
- no unresolved storage-source-of-truth conflict

## Phase 2 — Native packaging feasibility

A narrow feasibility spike must prove:

1. Current FitCore frontend loads in the selected iOS container.
2. Current navigation works.
3. Existing storage works or migration needs are understood.
4. Offline launch behavior is understood.
5. A typed mock bridge works.
6. Native can stream events to the web layer.
7. Web can return a mock tool result.
8. Cancellation works.
9. App background and foreground behavior is safe.
10. Builds install on both a regular iPhone 15 and an iPhone 16.

## Native-packaging spike file scope

Likely ownership boundaries:

- native wrapper and generated iOS project
- custom native plugin shell
- bridge type contracts
- browser mock bridge
- packaging documentation
- native build instructions

Files like `src/lib/store.tsx` and core application routing components must not be concurrently modified during this spike.

## Phase 2 no-go conditions

Stop or redesign if:

- existing FitCore UI cannot load reliably
- storage becomes unreliable
- service worker causes unsafe version mismatches
- bridge cannot support streaming and cancellation
- app lifecycle replays stale work
- physical-device installation cannot be maintained
- packaging requires a full frontend rewrite without explicit approval

## Phase 3 — Local voice and model feasibility

### Voice stack

- microphone
- speech recognition
- endpointing
- TTS
- barge-in
- echo cancellation
- Bluetooth

### Local agent model

- load
- stream
- cancel
- structured output
- tool selection
- context limits
- memory
- thermal behavior

### Integrated voice loop

- STT → local model → TTS
- interruption
- 30-minute operation
- iPhone 15 and iPhone 16

## Phase 3 configuration discipline

Every spike must pin model revision, quantization, runtime revision, speech model, TTS model, iOS version, build type, device, context, and test workload.

## Phase 3 exit gate

Require:

- baseline voice stack selected
- baseline local model selected
- baseline runtime selected
- iPhone 15 can run the required components
- cancellation works
- barge-in works sufficiently for continued development
- structured-output behavior is viable
- resource use is within provisional limits
- licensing allows continued development
- fallback plan is approved

## Phase 3 fallback decisions

1. Use Apple system TTS.
2. Use push-to-talk instead of hands-free mode.
3. Reduce context.
4. Reduce model size.
5. Disable optional reasoning.
6. Release deterministic voice commands before full conversation.
7. Release text conversational Jarvis before voice conversation.
8. Stop implementation if safety or usefulness remains unacceptable.

## Phase 4 — Shared contracts and mock architecture

Model-independent foundations:

- bridge protocol
- model-provider interface
- speech-provider interfaces
- context envelope
- tool request and result envelopes
- error taxonomy
- session and turn IDs
- revision and cancellation
- capability negotiation
- mock model
- mock speech
- mock native bridge
- diagnostics events

## Phase 4 concurrency wave

### Workstream A — Bridge contracts and mocks

- Responsibilities: Cross-boundary typing
- Boundaries: Isolated `src/lib/jarvis/api`
- Prohibited overlap: Runtime modifications

### Workstream B — Conversation state machine

- Responsibilities: Turn transitions, session management
- Boundaries: Isolated `src/lib/jarvis/state`

### Workstream C — Context-envelope builder

- Responsibilities: Current screen, relevant stats
- Boundaries: Isolated context builders

### Workstream D — Tool registry and validation framework

- Responsibilities: Schema mapping, tool catalog
- Boundaries: Isolated registry files

### Workstream E — Diagnostics and error taxonomy

- Responsibilities: Error formatting, event logging
- Boundaries: Isolated telemetry wrappers

### Workstream F — Jarvis UI shell using mock events

- Responsibilities: Visual chat layout
- Boundaries: Isolated `src/components/app/jarvis` components

## Phase 4 merge order

1. Shared type and protocol foundation.
2. Mock bridge.
3. State machine.
4. Context builder.
5. Tool registry.
6. UI shell.
7. Integrated mock conversation.

## Phase 4 exit gate

Require:

- deterministic contract tests
- typed bridge
- stale-event rejection
- cancellation
- mock streamed transcript
- mock streamed response
- mock tool round trip
- no direct persistence access
- browser development possible on Windows
- native and web contract fixtures agree

## Phase 5 — Deterministic workout assistant

Initial capabilities:

- set logging
- repeating the previous set
- editing the immediate previous set
- timers
- next and previous exercise
- Stop
- cancel
- Undo
- concise confirmations
- text and transcript inputs

## Deterministic assistant prerequisites

Require:

- canonical service for each action
- structured parser output
- validation
- idempotency
- active-turn revision
- context version
- Undo
- deterministic tests
- no LLM requirement

## Phase 5 concurrency wave

Isolated workstreams:

- number and unit normalization
- command grammar
- active-workout context adapter
- timer adapter
- write idempotency
- Undo manager
- command-result UI
- deterministic command tests

## Phase 5 hard gate

No model-requested write tools enabled until:

- duplicate callbacks produce one write
- stale turns produce zero writes
- interrupted commands produce zero writes
- exact entity and units are validated
- Undo works
- app suspension is safe
- active-workout regression tests pass
- iPhone 15 deterministic voice operation is usable

## Phase 6 — Read-only conversational Jarvis

Initial read-only domains:

- active workout
- exercise history
- recent workouts
- training comparisons
- nutrition summary
- remaining targets
- recovery summary
- sleep summary
- selected chart
- goals and progress

## Read-only model boundaries

Require:

- fixed allowlisted tools
- structured output
- no write tools in provider context
- canonical calculations
- missing-data honesty
- bounded tool loops
- cancellation
- context minimization
- text mode before full voice requirement

## Phase 6 concurrency wave

Isolated workstreams:

- read-only training tools
- nutrition reads
- recovery and sleep reads
- stats and chart reads
- prompt and provider adapter
- response composer
- read-only conversation UI
- model evaluation fixtures

## Phase 6 exit gate

Require:

- correct tool selection
- valid structured output
- grounded explanations
- no invented metrics
- missing data acknowledged
- multi-turn follow-ups work
- cancellation works
- iPhone 15 latency remains acceptable
- text-only fallback remains complete
- provider cannot access write tools

## Phase 7 — Safe write-tool integration

Recommended order:

1. Low-risk reversible actions already supported deterministically.
2. Navigation.
3. Simple preference updates.
4. Material changes with exact preview and confirmation.
5. Sensitive or destructive operations only after separate approval.

## Write-tool enablement checklist

Every write tool requires canonical service, stable contract, risk class, argument validation, active-turn check, context-version check, idempotency, confirmation rule, Undo rule, structured errors, unit tests, integration tests, E2E test, and emergency-disable capability.

## Write-tool rollout strategy

```text
Training low-risk writes
    ↓
Navigation and settings
    ↓
Goal or target changes with confirmation
    ↓
Memory management
    ↓
Any destructive operation only after explicit later approval
```

## Phase 7 hard gate

Stop rollout if:

- duplicate write
- stale write
- wrong entity
- wrong unit
- false success
- confirmation bypass
- Undo failure
- model requests unknown tool
- active workout corruption
- direct storage access

## Phase 8 — Full voice conversation

Required capabilities:

- push-to-talk
- partial transcript
- final transcript
- deterministic routing
- agent routing
- streamed speech
- Stop
- barge-in
- Bluetooth recovery
- text fallback
- system TTS fallback

## Voice integration order

1. Voice input to text-only response.
2. Local TTS response.
3. Stop control.
4. Barge-in.
5. Bluetooth.
6. Hands-free session only after validation.
7. Optional enhanced voice later.

## Phase 8 exit gate

Require:

- no self-transcription failure pattern
- Stop works immediately
- stale audio does not resume
- user speech is not consistently clipped
- duplicate transcript callbacks do not duplicate actions
- Bluetooth fallback is safe
- microphone permission behavior is correct
- iPhone 15 supports a normal voice workout session

## Phase 9 — Context, conversation persistence, and memory

### Stage A

- active turn state
- session state
- recent bounded turns
- rolling summary

### Stage B

- explicit low-sensitivity preferences
- memory list
- edit
- delete

### Stage C

- memory proposals
- approved limitations
- saved insights
- richer retrieval

### Deferred initially

- vector database
- automatic personality profiling
- silent permanent memory
- cloud memory synchronization

## Memory entry gate

Require: storage ownership decided, encryption decided, deletion UI exists, canonical FitCore data remains separate, high-sensitivity approval exists, prompt-injection handling exists, migration strategy exists, app restoration is safe.

## Memory exit gate

Require: explicit remember works, correction works, expiration works, superseded memory excluded, deletion works, clear-all scope is correct, canonical FitCore data unaffected, interrupted responses do not become memory, sensitive memory is not sent externally by default.

## Phase 10 — Model lifecycle and offline hardening

Implement trusted manifest, model download, progress, pause, resume, storage checks, checksum, atomic install, registry, health check, update, rollback, revocation, delete, and repair.

## Phase 10 gate

Require: no silent large download, interrupted download does not register, corrupted model fails closed, previous valid version survives failed update, rollback works, deletion preserves FitCore data, offline use works after installation, partial availability enters correct degraded mode.

## Phase 11 — Privacy, security, and accessibility hardening

Implement least-privilege tool access, prompt-injection protections, secret handling, privacy-safe logs, memory controls, support diagnostics, accessibility, permission behavior, model provenance, WebView and bridge security, optional-provider disabled state.

## Phase 11 security gate

Require: no embedded secrets, no arbitrary code tool, no arbitrary network tool, no direct storage tool, model checksum cannot be bypassed, bridge rejects malformed messages, support bundles exclude sensitive content, raw audio is not retained by default, production logs exclude prompts and transcripts.

## Phase 11 accessibility gate

Require: complete text-only use, VoiceOver, Dynamic Type, Stop accessibility, confirmation accessibility, Undo accessibility, transcript order, non-color-only status, reduced-motion compatibility, physical-device review.

## Phase 12 — Long-session and field validation

Run:

- 30-minute voice conversation
- 60-minute active workout
- quiet room
- simulated gym noise
- actual gym where practical
- built-in audio
- Bluetooth
- app lifecycle interruptions
- low battery
- thermal pressure
- low storage
- repeated sessions

## Phase 12 hard gate

Require: no data corruption, no duplicate writes, no stale writes, no memory termination during normal use, acceptable thermal fallback, acceptable battery behavior, no progressive latency collapse, no unusable Bluetooth failure, text and deterministic fallbacks remain available.

## Phase 13 — Alpha stabilization

Alpha scope: internal or limited use, synthetic or controlled data, narrow tool set, diagnostics enabled safely, known limitations documented, emergency-disable mechanisms ready, no optional provider required.

## Alpha exit gate

Require: no critical defects, no unresolved repeatable data-corruption defect, stable core contracts, physical-device baseline passes, recovery flows work, model and runtime revisions pinned, known issues documented.

## Phase 14 — Beta and release-candidate qualification

Beta additions: upgrade testing, model update and rollback, privacy review, security review, accessibility review, broader realistic usage, support process, release notes, incident procedures.

## Release-candidate entry gate

Require: feature scope frozen, no unresolved critical defect, no unresolved high data-integrity defect, tool set frozen, model pack frozen, runtime frozen, migrations complete, licenses reviewed, support and rollback ready.

## Release-candidate exit gate

Require: all P0 tests pass, required P1 tests pass, regular iPhone 15 passes all core gates, iPhone 16 passes all core gates, offline passes, long-session passes, privacy passes, security passes, accessibility passes, upgrade and rollback pass, evidence package complete.

## Phase 15 — Production readiness

Require: release support, diagnostics, repair, model revocation, emergency write-tool disablement, dependency inventory, model inventory, known-issue process, support-request process, cost controls, maintenance ownership, incident response, end-of-life planning.

## Minimum useful release

Recommended minimum:

- native iPhone app packaging
- text Jarvis
- push-to-talk
- deterministic set logging
- timers
- navigation
- Undo
- read-only training analytics
- read-only nutrition, recovery, and sleep summaries
- local conversational model
- system TTS fallback
- model management
- local conversation context
- explicit memory preferences
- privacy and deletion controls
- offline operation
- iPhone 15 support

## Features safe to defer

- hands-free continuous conversation
- enhanced local TTS
- optional Apple Foundation Models
- cloud LLM
- cloud speech
- multimodal input
- meal-photo analysis
- web research
- proactive coaching
- vector memory
- cross-device sync
- multiple model packs
- Android
- wake word

## Prohibited initial scope

Do not include initially: system-wide Siri replacement, always-listening background wake word, arbitrary code execution, arbitrary filesystem access, arbitrary network tools, direct model persistence access, autonomous destructive actions, silent external provider routing, automatic sensitive memory, mandatory computer-hosted inference, mandatory paid API.

## Concurrency model

### Safe to parallelize

- documentation
- mock providers
- read-only tools in separate domains
- parser tests
- diagnostics
- accessibility review
- model evaluation fixtures

### Parallel only after contracts freeze

- native bridge and web bridge
- provider adapters
- Jarvis UI and mock orchestrator
- context builder and read-only tools

### Must remain sequential

- tool contracts before tool implementation
- deterministic writes before model-requested writes
- native packaging before production native audio
- feasibility before final model lock
- deletion controls before persistent memory
- security hardening before external provider
- physical-device validation before release

## File-ownership rules

Require every implementation task to declare: exact branch, starting SHA, authorized files, prohibited files, expected shared interfaces, validation, commit count, merge dependencies. No two concurrent tasks should modify the same hotspot file unless coordinated explicitly.

## Hotspot-file strategy

Likely hotspot categories:

- application entry
- router (`src/router.tsx`)
- global state (`src/lib/store.tsx`)
- active-workout state
- shared service registry
- package files (`package.json`)
- lockfiles (`bun.lock`, `package-lock.json`)
- native project configuration
- bridge protocol
- central Jarvis orchestrator
- global CSS
- service worker (`sw.js`)
- test configuration (`playwright.config.ts`)

Recommend: one owner at a time, small commits, early foundational merge, adapters around hotspots, avoid broad refactors during feature work.

## PR sizing rules

Recommend implementation PRs generally contain one component, one contract implementation, one domain tool group, one test layer, one native capability, or one migration. Avoid combining them unless explicitly approved.

## Commit rules

Require: intentional commits, no unrelated formatting, no generated noise, no lockfile change without dependency change, no amend after review begins, no hidden code copied from abandoned branches, no merge commits where project workflow prohibits them, one task report per scoped task.

## Branch and merge strategy

Define:

- latest approved `origin/main` as the baseline
- dedicated branch per task
- no implementation on documentation branches
- dependency PRs merge before dependent branches rebase or restart
- no cherry-picking unreviewed code
- no combining failing branches
- merge order follows dependency graph
- each merge revalidates downstream assumptions

## Implementation completion report requirements

Every implementation task must return:

1. Branch.
2. Starting SHA.
3. Ending SHA.
4. Commit subject.
5. Exact files changed.
6. Purpose.
7. Interfaces implemented.
8. Tests added.
9. Tests run.
10. Results.
11. Physical-device evidence where applicable.
12. Known limitations.
13. No-overlap confirmation.
14. Final worktree state.
15. PR URL.
16. Confirmation PR was not merged unless explicitly authorized.

## Entry-gate template

```text
Gate:
Required prior phases:
Required documents:
Required implementation:
Required tests:
Required device evidence:
Required security/privacy review:
Blocking defects:
Decision:
```

## Exit-gate template

```text
Phase:
Expected deliverables:
Acceptance criteria:
Tests:
Performance evidence:
Safety evidence:
Privacy evidence:
Known limitations:
Rollback or disable path:
Approved decision:
```

## Implementation decision records

Define decisions requiring explicit recording: native packaging framework, STT provider, endpointing provider, local model, inference runtime, TTS provider, model quantization, context budget, storage engine, model hosting, minimum iOS, transcript retention, optional provider policy, telemetry policy.

## Assumption management

Every assumption should have: assumption, evidence, owner role, validation method, deadline or phase, failure consequence, fallback.

## Risk register

| Risk                  | Phase discovered | Impact | Likelihood | Mitigation   | Trigger for redesign |
| --------------------- | ---------------- | ------ | ---------- | ------------ | -------------------- |
| iPhone 15 performance | Feasibility      | High   | Medium     | Pin limits   | Thermal failure      |
| Thermal throttling    | Validation       | High   | High       | Reduce model | Shutdown             |
| Native packaging      | Feasibility      | High   | Low        | UI refactor  | Cannot stream bridge |
| Memory privacy        | Hardening        | High   | Medium     | Review       | Storage leak         |

## Stop-work conditions

Conditions that stop dependent implementation: architecture contradiction unresolved, iPhone 15 feasibility failure, license unresolved, canonical service unavailable, data corruption, duplicate or stale write, direct persistence access, security bypass, privacy failure, native packaging failure, model cannot be canceled, no safe fallback.

## Scope-reduction process

If a gate fails:

1. Identify the failing capability.
2. Preserve safe completed work.
3. Remove optional dependency.
4. Select documented fallback.
5. Re-run the relevant gate.
6. Update implementation scope.
7. Do not quietly weaken safety thresholds.
8. Record user-visible limitation.

## Reconciliation after each major phase

Require review of implementation versus documentation, changed assumptions, new constraints, rejected options, updated risks, required document corrections, downstream phase effects.

## Readiness scorecard

```text
Not started
In progress
Blocked
Passed
Passed with scope reduction
Failed
Superseded
```

Scorecard categories: documentation, native packaging, voice, local model, deterministic commands, tools, context, memory, model lifecycle, privacy, security, accessibility, performance, operations, release.

## Alpha readiness checklist

- native app runs on both phones
- deterministic commands work
- read-only model works
- no direct persistence access
- Stop and cancellation work
- model download and repair work
- local diagnostics exist
- synthetic data used where appropriate
- no critical defects
- known limitations documented

## Beta readiness checklist

- safe write tools
- confirmation
- Undo
- persistent memory controls
- privacy settings
- Bluetooth
- long-session validation
- upgrade testing
- support process
- emergency disablement
- licenses approved

## Production readiness checklist

- all hard gates
- iPhone 15 core pass
- iPhone 16 core pass
- release-candidate evidence
- rollback
- model revocation
- dependency inventory
- App Store requirements
- privacy disclosures
- accessibility
- incident response
- cost governance
- maintenance ownership

## Optional-provider sequencing

An optional cloud provider must not be introduced until: local baseline works, local fallback works, privacy controls exist, secret storage exists, cost limits exist, user consent exists, external-routing indicator exists, provider disablement exists, provider outage tests pass.

## iPhone 16 enhancement sequencing

Optional iPhone 16 enhancements may begin only after: common baseline passes on iPhone 15, shared provider contracts are stable, enhancement does not alter tool rules, fallback to common provider works, experience remains consistent, separate testing is available.

## Windows and macOS work split

Windows work: frontend, TypeScript services, deterministic parser, tools, context, mocks, browser tests, documentation.
macOS work: native wrapper, Swift, local iOS model runtimes, native audio, simulator, code signing, physical-device builds, TestFlight or App Store distribution.

## Validation cadence

Require validation per PR, after every foundation merge, after provider changes, after native bridge changes, after model changes, after tool changes, after storage changes, before and after release-candidate freeze.

## Documentation completion definition

The Jarvis documentation phase is complete only when product requirements are clear, architecture is consistent, component choices have a validation path, tool and command contracts are defined, context and memory behavior is defined, native packaging is defined, security and privacy are defined, model lifecycle is defined, feasibility and QA are defined, operations are defined, implementation sequencing is defined, unresolved questions are explicitly tracked for feasibility rather than hidden.

## Final implementation recommendation

1. Finish and merge premium UI baseline.
2. Reconcile all Jarvis documentation.
3. Audit canonical services.
4. Prove native packaging.
5. Prove local voice and local model on both phones.
6. Freeze shared contracts.
7. Build deterministic workout assistant.
8. Add read-only conversational tools.
9. Add safe write tools gradually.
10. Integrate complete voice.
11. Add bounded memory.
12. Harden model lifecycle, privacy, security, and accessibility.
13. Run long-session field validation.
14. Stabilize alpha and beta.
15. Qualify release candidate.
16. Add optional enhancements only afterward.

## Open implementation questions

Unresolved questions: final premium UI merge state, exact native packaging framework, final iOS deployment target, sustainable Mac access, final STT model, final local LLM, final runtime, final TTS, final model hosting, storage engine, transcript retention, first write-tool subset, optional provider timing, App Store distribution timing, final release thresholds, development capacity and ownership.

## Final summary

This document enforces a feasibility-first approach driven by the iPhone 15 binding baseline. It prioritizes deterministic actions over probabilistic writes, establishes strict file ownership and safe concurrency paths, and maps out concrete phase gates from documentation reconciliation to production readiness. The minimum useful release is clearly isolated from deferred features, ensuring hard stop conditions and a realistic release path are maintained. The largest unresolved implementation risk remains securing sustainable testing on physical native iOS devices to validate constraints safely.

## Required diagrams

### Parallel workstream diagram

```text
Phase 4 Parallelization
[Bridge contracts] ----> [Mock Integrations]
[State machine]    ----> [UI Orchestrator]
[Tool registry]    ----> [Context builder]
```

### Deterministic-to-conversational rollout

```text
Deterministic Assistant
      ↓
Read-only LLM
      ↓
Deterministic Writes triggered by LLM
```

### Read-only-to-write-tool rollout

```text
Training Read
      ↓
Navigation Write
      ↓
Target Change (With Confirmation)
      ↓
Sensitive Actions
```

### Voice integration sequence

```text
Text Input -> Text Output
      ↓
Voice Input -> Text Output
      ↓
Voice Input -> TTS Output
      ↓
Hands-free Barge-in Session
```

### Phase-gate decision flow

```text
Entry Gate Check -> Feature Implementation -> Test Suite -> Physical Device Check -> Exit Gate Approval
```

### Failure and scope-reduction flow

```text
Gate Fails -> Revert to Prior Safe Checkpoint -> Enable Fallback -> Re-run Gate
```

### Alpha-to-production readiness flow

```text
Alpha (Internal) -> Beta (Broad/Safe tools) -> Release Candidate (Feature Freeze) -> Production
```
