# FitCore Jarvis Test and Release-Readiness Plan

## 2. Document status

- this is a proposed verification and release-qualification specification.
- no test implementation is included.
- exact commands may change as implementation infrastructure is added.
- the regular iPhone 15 is the binding core acceptance device.
- physical-device testing is mandatory.
- simulator-only or mock-only evidence is insufficient for release.
- safety and data-integrity failures cannot be waived informally.

## 3. Quality objectives

The quality objectives for Jarvis are:

- correct behavior.
- deterministic safety.
- data integrity.
- reliable interruption.
- dependable cancellation.
- offline operation.
- privacy.
- security.
- accessibility.
- performance.
- long-session stability.
- recoverability.
- clear failures.
- reproducibility.
- traceability.
- release confidence.

## 4. Quality principles

The core quality principles are:

1. Canonical FitCore services are tested independently of the model.
2. Model behavior never replaces deterministic validation.
3. Every write path must have negative tests.
4. Duplicate and stale writes are release blockers.
5. Physical-device validation is mandatory.
6. The iPhone 15 is tested before optional enhancements.
7. Automated tests cover repeatable contracts.
8. Manual tests cover audio, perceived fluidity, and real-world conditions.
9. Every regression receives a permanent test where feasible.
10. Test data is synthetic or anonymized.
11. Privacy-sensitive artifacts are not committed casually.
12. Failed tests are reported honestly.
13. Flaky safety tests are treated as defects.
14. Release criteria are defined before final release testing.
15. A successful demo is not equivalent to release readiness.
16. Degraded modes must be verified.
17. App lifecycle transitions must be tested around writes.
18. Provider changes require full contract regression.

## 5. Test-pyramid model

Define layers:

```text
       [ Field tests ]
      [ Physical-device ]
     [ End-to-end tests ]
    [  Integration tests  ]
   [    Contract tests     ]
  [       Unit tests        ]
 [    Static verification    ]
```

### Static verification

- linting.
- formatting.
- type checking.
- schema validation.
- dependency checks.
- license checks.
- forbidden API checks.

### Unit tests

- deterministic parser.
- normalization.
- context selection.
- state reducers.
- confirmation logic.
- idempotency.
- memory lifecycle.
- error mapping.
- model-manifest validation.

### Contract tests

- web/native bridge.
- model-provider interface.
- tool request and result envelopes.
- capability negotiation.
- context envelope.
- memory service.
- model registry.

### Integration tests

- tool gateway with canonical services.
- context builder with real FitCore state.
- native bridge with mocks.
- local model with constrained tools.
- memory store with retrieval.
- model lifecycle.

### End-to-end tests

- user request through UI.
- voice or text.
- tool execution.
- confirmation.
- Undo.
- visible result.

### Physical-device tests

- real microphone.
- Bluetooth.
- local models.
- memory pressure.
- thermal behavior.
- lifecycle.
- battery.
- long sessions.

### Field tests

- noisy gym.
- real workout workflow.
- real interruption patterns.
- usability and accessibility.

## 6. Verification ownership by component

| Component                    | Primary test type  | Required environment | Model required | Physical device required |
| ---------------------------- | ------------------ | -------------------- | -------------- | ------------------------ |
| Jarvis UI                    | E2E                | browser              | No             | No                       |
| deterministic command parser | Unit               | Node/unit            | No             | No                       |
| conversation orchestrator    | Unit / Integration | Node/unit            | No             | No                       |
| context builder              | Unit               | Node/unit            | No             | No                       |
| tool gateway                 | Integration        | Node/unit            | No             | No                       |
| FitCore services             | Unit / Integration | Node/unit            | No             | No                       |
| confirmation manager         | Unit / E2E         | Node/unit, browser   | No             | No                       |
| Undo manager                 | Unit / E2E         | Node/unit, browser   | No             | No                       |
| mock model provider          | Contract           | Node/unit, browser   | No             | No                       |
| real local model provider    | Integration        | physical iPhone      | Yes            | Yes                      |
| native bridge                | Contract           | native simulator     | No             | No                       |
| speech recognition           | E2E                | physical iPhone      | Yes            | Yes                      |
| endpoint detection           | E2E                | physical iPhone      | Yes            | Yes                      |
| TTS (enhanced)               | E2E                | physical iPhone      | Yes            | Yes                      |
| model download manager       | Integration        | macOS native build   | Yes            | No                       |
| model registry               | Contract           | native simulator     | No             | No                       |
| memory store                 | Integration        | Node/unit            | No             | No                       |
| privacy controls (UI/Logic)  | Unit / E2E         | Node/unit, browser   | No             | No                       |
| privacy controls (Native)    | Integration / E2E  | physical iPhone      | No             | Yes                      |
| diagnostics                  | Unit               | Node/unit            | No             | No                       |

## 7. Requirements traceability

```text
JARVIS-COMPAT-###
JARVIS-COST-###
JARVIS-OFFLINE-###
JARVIS-VOICE-###
(and other category-specific IDs)

JARVIS-TEST-###
JARVIS-RISK-###
JARVIS-GATE-###
```

```text
Requirement (e.g., JARVIS-VOICE-###)
    ↓
Test Case (JARVIS-TEST-###)
    ↓
Implementation Status / Evidence
    ↓
Release Gate (JARVIS-GATE-###)
```

Future requirements and tests must record:

- requirement ID.
- component.
- test level.
- scenario.
- expected result.
- implementation status.
- evidence.
- release gate.
- owner role.
- last execution.

## 8. Test-case documentation format

```text
Test ID:
Requirement:
Risk ID:
Component:
Priority:
Environment:
Preconditions:
Input:
Steps:
Expected result:
Safety assertions:
Privacy assertions:
Artifacts:
Automation status:
```

Explicit safety assertions are required for write-related tests.

## 9. Test priority classes

Define:

### P0 — Release-blocking safety

Examples:

- duplicate write.
- stale write.
- unconfirmed destructive action.
- data corruption.
- secret exposure.
- raw-audio retention.

### P1 — Core functionality

Examples:

- set logging.
- interruption.
- offline local conversation.
- tool reading.
- model loading.

### P2 — Important experience

Examples:

- Bluetooth recovery.
- conversation continuity.
- model download resume.
- accessibility.

### P3 — Enhancement

Examples:

- optional voice.
- optional iPhone 16 provider.
- cosmetic diagnostics.

Execution requirements must align with these defined priorities.

## 10. Static verification

Future static verification must check for:

- type correctness.
- linting.
- formatting.
- forbidden direct-storage access from model code.
- forbidden arbitrary network tools.
- forbidden embedded API keys.
- tool allowlist consistency.
- bridge protocol version.
- model-manifest checks.
- license notice presence.
- privacy-sensitive logging patterns.
- generated-file drift.

Do not implement checks.

## 11. Deterministic parser unit tests

Coverage is required for:

- spoken numbers.
- pounds.
- kilograms.
- repetitions.
- durations.
- bodyweight.
- ambiguous two-number phrases.
- current exercise.
- previous set.
- correction.
- Undo.
- timer.
- navigation.
- Stop.
- confirmation.
- rejection.
- unsupported command.
- model fallback.

Negative tests must include:

- missing active workout.
- missing previous set.
- unclear unit.
- impossible value.
- stale context.
- duplicate transcript.
- interrupted transcript.
- unsupported destructive request.

## 12. Context-builder unit tests

Tests are required for:

- active workout context.
- selected chart.
- selected date.
- filters.
- recent turns.
- relevant memory.
- omitted unrelated domains.
- sensitivity filtering.
- stale-state version.
- missing data.
- context-size limits.
- overflow reduction.
- current instruction precedence.

## 13. Conversation-orchestrator unit tests

State transitions must be tested across:

```text
Idle
Listening
Transcribing
Routing
Generating
Awaiting Tool
Executing Tool
Awaiting Confirmation
Speaking
Interrupted
Completed
Canceled
Failed
```

Tests are required for:

- valid transitions.
- invalid transitions.
- cancellation.
- revision increments.
- stale callback.
- tool timeout.
- app suspension.
- model failure.
- TTS failure.
- user interruption.
- retry.

## 14. Confirmation tests

The defect waiver policy mandates that:

- exact preview.
- exact argument binding.
- one active confirmation.
- expiration.
- rejection.
- argument mutation invalidation.
- context change invalidation.
- reused token rejection.
- stale-turn rejection.
- successful execution once.
- no generic reusable “yes.”

## 15. Idempotency tests

The defect waiver policy mandates that:

- duplicate bridge delivery.
- duplicate transcript callback.
- retry after timeout.
- app restoration.
- model retry.
- same key and same payload.
- same key and different payload.
- response lost after successful write.
- concurrent duplicate request.

Expected outcomes include:

- exactly one canonical mutation.
- original result returned for valid duplicate.
- conflict returned for payload mismatch.

## 16. Undo tests

The defect waiver policy mandates that:

- successful Undo.
- one-time use.
- expired Undo.
- conflicting later edit.
- ambiguous “undo that”.
- restoration.
- app suspension.
- service failure.
- unauthorized token.
- Undo of wrong entity blocked.

## 17. Tool-contract tests

For each implemented tool, testing must verify:

- valid request.
- invalid schema.
- unknown field.
- missing required field.
- unknown tool.
- permission denied.
- stale turn.
- stale context.
- confirmation required.
- expired confirmation.
- service success.
- service failure.
- incomplete data.
- timeout.
- cancellation.
- idempotency.
- Undo.

## 18. FitCore canonical-service regression

Jarvis integration must not alter existing canonical behavior.

Testing must cover:

- workout calculations.
- set persistence.
- timers.
- exercise ordering.
- workout completion.
- nutrition totals.
- recovery values.
- sleep summaries.
- goals.
- analytics.
- chart comparisons.

Existing non-Jarvis tests must remain passing.

## 19. Native bridge contract tests

Testing must cover:

- protocol version.
- capability negotiation.
- valid request.
- valid response.
- streamed event.
- sequence numbers.
- duplicate event.
- out-of-order event.
- oversized payload.
- unknown event.
- stale turn.
- canceled session.
- web reload.
- native restart.
- message serialization.
- error mapping.

## 20. Native bridge security tests

Security testing must attempt:

- arbitrary Swift method invocation.
- arbitrary JavaScript execution.
- arbitrary file path.
- arbitrary URL.
- malformed payload.
- path traversal.
- secret request.
- permission expansion.
- unsupported tool injection.

Expected outcomes include:

- safe rejection.
- no execution.
- structured error.
- no sensitive logging.

## 21. Model-provider contract tests

All providers are required to pass the same test suite:

- initialize.
- capability report.
- model load.
- readiness.
- streaming.
- structured tool output.
- cancellation.
- reset.
- unload.
- health check.
- context overflow.
- malformed model output.
- timeout.
- unavailable provider.

Optional providers must not alter tool permissions or safety behavior.

## 22. Structured-output tests

Measurements must capture:

- valid JSON or constrained output.
- correct tool.
- correct arguments.
- unknown-tool rejection.
- repair attempt.
- repair failure.
- excessive retries.
- plain-text contamination.
- truncated output.
- tool/result round trip.

Bounded repair behavior is required.

## 23. Model behavioral evaluation

A labeled evaluation set must cover:

- workout logging.
- workout history.
- nutrition.
- recovery.
- sleep.
- stats.
- goals.
- missing data.
- ambiguity.
- user correction.
- unsafe request.
- prompt injection.
- confirmation.
- memory proposal.
- multi-turn follow-up.

Scoring criteria include:

- tool selection.
- argument extraction.
- grounded response.
- concise mode.
- uncertainty.
- refusal.
- conversation continuity.

## 24. Speech-recognition tests

Testing must cover:

- quiet speech.
- gym noise.
- music.
- different pacing.
- number-heavy phrases.
- exercise names.
- units.
- durations.
- corrections.
- Bluetooth.
- long pauses.
- short commands.

The following metrics must be recorded:

- word error rate.
- numeric accuracy.
- command exact match.
- false finalization.
- missed finalization.
- latency.

## 25. End-of-turn tests

The defect waiver policy mandates that:

- short command.
- long question.
- mid-sentence pause.
- hesitation.
- background speech.
- interruption.
- overlapping speech.
- no speech.
- microphone noise.

Testing is required in both modes:

- Workout Mode.
- Coach Mode.

## 26. TTS tests

Testing must cover:

- first-audio latency.
- sentence streaming.
- cancellation.
- barge-in.
- long response.
- number pronunciation.
- exercise names.
- Bluetooth.
- system fallback.
- unavailable local voice.
- app interruption.

## 27. Echo-cancellation and self-transcription tests

The defect waiver policy mandates that:

- built-in speaker.
- Bluetooth.
- quiet room.
- gym noise.
- low and high playback volume.
- short and long speech.

Release-blocking failures include:

- Jarvis repeatedly treats its own speech as user input.
- old speech resumes after Stop.
- barge-in speech is lost consistently.

## 28. Voice end-to-end tests

End-to-end testing must cover complete flows:

### Set logging

```text
“225 for five.”
```

### Timer

```text
“Start ninety seconds.”
```

### Read request

```text
“What did I bench last week?”
```

### Follow-up

```text
“What about last month?”
```

### Correction

```text
“No, I said 235.”
```

### Interruption

User stops spoken response and revises the request.

### Degraded mode

Local model unavailable but deterministic command still functions.

## 29. Text end-to-end tests

Every core capability must work without voice:

- text request.
- streaming response.
- tool call.
- confirmation.
- Undo.
- memory proposal.
- error.
- offline.
- deletion.

Voice must not be required for core Jarvis use.

## 30. UI interaction tests

Testing must cover:

- open Jarvis.
- close Jarvis.
- compact workout mode.
- expanded mode.
- microphone control.
- text input.
- Stop.
- transcript.
- confirmation.
- Undo.
- errors.
- model download status.
- settings.
- memory management.
- offline state.

Exact selectors will be defined during implementation.

## 31. Active-workout UI tests

The defect waiver policy mandates that:

- Jarvis does not block critical workout controls.
- set logging updates UI once.
- timer remains synchronized.
- navigation updates context.
- sheet open and close.
- keyboard.
- screen rotation.
- interruption.
- VoiceOver.
- larger text.
- low-power or degraded indicator.

## 32. Analytics and chart tests

Testing must cover:

- selected chart context.
- date range.
- filter.
- raw versus normalized modes if present.
- comparison.
- supporting values.
- missing records.
- navigation to source chart.
- stale chart selection.

Jarvis must never invent chart values.

## 33. Memory tests

The defect waiver policy mandates that:

- explicit remember.
- proposal.
- approve.
- edit.
- reject.
- retrieve.
- irrelevant memory omitted.
- expired memory omitted.
- superseded memory omitted.
- high-sensitivity confirmation.
- delete one.
- clear all.
- canonical data unaffected.
- app restart.
- storage failure.

## 34. Conversation-summary tests

The defect waiver policy mandates that:

- long conversation.
- summary creation.
- correction preserved.
- verified facts preserved.
- speculation labeled.
- canceled answer omitted.
- unresolved question preserved.
- context reduction.
- summary corruption fallback.

## 35. Model asset lifecycle tests

Testing must cover:

- first download.
- progress.
- pause.
- resume.
- cancel.
- app termination.
- checksum mismatch.
- insufficient storage.
- atomic installation.
- health check.
- update.
- rollback.
- revocation.
- delete.
- repair.
- offline use.

## 36. Offline tests

After required assets are installed, network must be disabled to verify:

- app launch.
- Jarvis opening.
- text conversation.
- voice recognition.
- deterministic commands.
- read-only tools.
- write tools.
- confirmation.
- Undo.
- TTS.
- memory.
- model status.

## 37. Degraded-mode tests

Degraded mode tests must evaluate combinations:

- STT unavailable.
- LLM unavailable.
- TTS unavailable.
- enhanced provider unavailable.
- low storage.
- low memory.
- thermal pressure.
- model corrupted.
- optional provider offline.
- Bluetooth lost.

Verification must confirm:

- available capability is clear.
- data remains safe.
- deterministic and text fallbacks work where expected.
- no retry loop.

## 38. App lifecycle tests

Lifecycle tests must wrap operations around:

- active listening.
- partial transcript.
- model generation.
- pending read.
- pending write.
- awaiting confirmation.
- speaking.
- model download.

Target lifecycle events include:

- background.
- foreground.
- screen lock.
- phone call.
- Siri.
- app termination.
- device restart.
- web view reload.
- native bridge restart.

## 39. Privacy tests

Verification must prove that:

- raw audio is discarded by default.
- production logs omit sensitive transcripts.
- full prompts are not logged.
- optional provider is disabled by default.
- provider opt-in is explicit.
- memory is inspectable.
- conversations are deletable.
- clear-all scope is correct.
- model downloads contain no personal data.
- permissions are just in time.
- revoked permissions are respected.

## 40. Security tests

Testing must cover:

- prompt injection from exercise name.
- prompt injection from note.
- malicious memory.
- arbitrary tool.
- arbitrary URL.
- arbitrary code.
- model-file checksum mismatch.
- altered manifest.
- reused confirmation.
- stale turn.
- bridge injection.
- oversized input.
- unlimited tool loop.
- secret redaction.

## 41. Accessibility tests

The defect waiver policy mandates that:

- VoiceOver.
- Dynamic Type.
- reduced motion.
- contrast.
- touch targets.
- hardware keyboard.
- text-only interaction.
- transcript order.
- Stop accessibility.
- confirmation accessibility.
- Undo accessibility.
- error announcement.
- model-progress announcement.

Physical-device accessibility review is required.

## 42. Localization and locale tests

Even if the first release is English-only, testing must cover:

- locale-specific unit preference.
- pound and kilogram display.
- decimal separator behavior.
- date formatting.
- time formatting.
- unsupported language handling.
- speech locale mismatch.

Unsupported locales must not be silently reinterpreted.

## 43. Performance tests

Automated or semi-automated measurements must track:

- launch.
- bridge readiness.
- model cold load.
- model warm load.
- first token.
- tool call.
- first audible response.
- cancellation.
- memory use.
- download verification.
- context assembly.

Final performance acceptance must run on optimized physical-device builds.

## 44. Long-session reliability tests

The defect waiver policy mandates that:

- 30-minute mixed conversation.
- 60-minute workout.
- repeated sessions.
- multiple interruptions.
- Bluetooth.
- timers.
- tool writes.
- analytics.
- memory.
- app lifecycle event.

Verification must confirm:

- no crash.
- no duplicate write.
- no progressive latency failure.
- no unbounded memory growth.
- no corrupted active workout.
- graceful thermal fallback.

## 45. Soak and stress tests

Future soak and stress tests must evaluate:

- repeated model load/unload.
- repeated voice turns.
- repeated canceled turns.
- repeated confirmation expiration.
- repeated download retry.
- large conversation.
- context overflow.
- many tool calls.
- storage near capacity.
- memory warnings.

Safety limits must prevent uncontrolled resource exhaustion.

## 46. Failure-injection testing

Failures must be injected at boundaries:

- STT failure.
- LLM failure.
- malformed output.
- bridge timeout.
- tool service error.
- persistence error.
- memory write error.
- TTS failure.
- model checksum failure.
- download interruption.
- app suspension.

For each injected failure, verification must ensure:

- no false success.
- no data corruption.
- understandable error.
- safe retry.
- proper fallback.

## 47. Data-integrity assertions

```text
Action Request
    ↓
Generate Entity State
    ↓
Verify Expected Mutations (No Unknowns)
    ↓
Verify Idempotency/Undo
    ↓
Assert Final Store State
```

Every write-related test must assert:

- exact expected entity.
- exact expected mutation count.
- no unrelated mutations.
- correct unit.
- correct value.
- correct timestamp.
- expected Undo entry.
- expected idempotency record.
- no duplicate.

## 48. Test-data strategy

Test-data strategy utilizes the following layers:

### Minimal deterministic fixtures

For unit and contract tests.

### Representative synthetic FitCore profile

For integration and E2E.

### Edge-case profiles

Examples:

- no workouts.
- incomplete nutrition.
- no sleep.
- long training history.
- mixed units.
- active timer.
- stale active workout.

### Privacy-safe physical-device data

Synthetic or anonymized.

Do not use real sensitive records in committed fixtures.

## 49. Golden scenario suite

A small immutable suite of core scenarios is defined as the golden suite. At minimum, this includes:

1. `225 for five`.
2. Same weight for six.
3. Start ninety-second timer.
4. Undo last set.
5. Compare bench with previous session.
6. Follow up with last month.
7. Missing sleep data.
8. Replace exercise with confirmation.
9. Stop spoken response.
10. Prompt-injection attempt.
11. Duplicate write callback.
12. App background before write.
13. Model unavailable.
14. Clear one memory.
15. Clear Jarvis memory without deleting workouts.

These scenarios must run successfully against every release candidate.

## 50. Regression policy

The defect waiver policy mandates that:

- every critical defect gets a regression test.
- every data-corruption defect gets a permanent test.
- every duplicate-write defect gets a permanent test.
- provider changes rerun full tool suite.
- bridge changes rerun native/web contract suite.
- model changes rerun behavioral evaluation.
- voice changes rerun audio matrix.
- storage changes rerun migration and deletion tests.

## 51. Flaky-test policy

Define:

- safety tests may not be silently retried until green.
- flakiness must be investigated.
- quarantine only with documented risk.
- release-blocking tests cannot remain quarantined.
- repeated pass after retries is not equivalent to a stable pass.
- environmental instability must be recorded.

## 52. Test-environment matrix

Create a table for:

| Environment        | Supported verification capabilities          |
| ------------------ | -------------------------------------------- |
| static analysis    | Linting, type checking, formatting           |
| Node/unit          | Deterministic parsers, reducers, pure logic  |
| browser            | UI, E2E logic, Text interaction              |
| macOS native build | Unit, Contract, integration without hardware |
| native simulator   | Layout, Flow, Basic bridge                   |
| physical iPhone    | Mandatory performance, Memory, Voice, Models |
| field test         | Real-world reliability, Connectivity, Noise  |

Define what each environment can and cannot prove.

## 53. CI strategy requirements

```text
Deterministic Tests (CI)
    ↓
Mock Models
    ↓
Assert Behavior Matches Contract
```

Without modifying workflows, define future CI stages:

1. Static checks.
2. Unit tests.
3. Contract tests.
4. Browser integration.
5. Playwright E2E.
6. macOS native tests.
7. build verification.
8. model-independent fixtures.
9. security checks.
10. release-candidate manual gates.

Do not require large model downloads on every standard CI run unless justified.

Use model mocks for most deterministic CI and schedule real-model evaluation separately.

## 54. Real-model evaluation strategy

```text
Real Model Evaluator
    ↓
LLM / TTS Core
    ↓
Assert Probabilistic Output Quality
```

Define:

- pinned model.
- pinned runtime.
- fixed prompt set.
- deterministic settings where possible.
- repeated runs.
- structured-output score.
- response rubric.
- comparison with prior approved baseline.
- drift detection.

Do not make normal unit tests depend on probabilistic model output.

## 55. Model-change qualification

Any model, quantization, runtime, chat template, prompt, or grammar change must rerun:

- tool selection.
- argument accuracy.
- malformed-output rate.
- hallucination cases.
- missing-data cases.
- prompt injection.
- latency.
- memory.
- thermal.
- cancellation.
- long-session subset.

## 56. Voice-change qualification

Any STT, endpointing, audio-session, or TTS change must rerun:

- quiet-room commands.
- gym noise.
- numbers.
- Bluetooth.
- echo cancellation.
- barge-in.
- phone call.
- route change.
- 30-minute voice session.
- accessibility transcript checks.

## 57. Tool-change qualification

Any new or changed tool must include:

- schema.
- risk class.
- validation.
- negative tests.
- confirmation.
- idempotency.
- Undo.
- service mapping.
- permission test.
- stale-turn test.
- error mapping.
- E2E scenario.

## 58. Memory-change qualification

Any memory change must rerun:

- approval.
- correction.
- sensitivity.
- retrieval.
- expiration.
- deletion.
- clear-all scope.
- canonical-data isolation.
- prompt injection from memory.
- app restoration.

## 59. Release-candidate test sequence

Define the order:

```text
Static and unit checks
    ↓
Contract and integration tests
    ↓
Browser E2E
    ↓
Native build and simulator tests
    ↓
Physical iPhone 15 core suite
    ↓
Physical iPhone 16 core suite
    ↓
Voice and Bluetooth matrix
    ↓
Long-session tests
    ↓
Privacy, security, and accessibility review
    ↓
Upgrade and rollback tests
    ↓
Release decision
```

The iPhone 15 core suite must pass before optional iPhone 16 enhancements are considered.

## 60. Release channels

Conceptual release channels are defined as:

### Internal development

- incomplete.
- debug instrumentation.
- synthetic data.

### Feasibility build

- narrow spike.
- not user-ready.
- measured physical-device behavior.

### Alpha

- core architecture integrated.
- write access tightly limited.

### Beta or TestFlight

- release-like.
- privacy disclosures.
- upgrade path.
- feedback process.

### Release candidate

- all core gates.
- pinned assets.
- rollback ready.

### Production

- approved.
- monitored.
- supported.

## 61. Entry criteria for release-candidate testing

The defect waiver policy mandates that:

- feature scope frozen.
- no known critical defects.
- no unresolved data-corruption defects.
- model revisions pinned.
- runtime revisions pinned.
- licenses reviewed.
- tool catalog frozen for candidate.
- migrations complete.
- privacy settings present.
- deletion works.
- fallback works.
- release notes drafted.
- rollback path exists.

## 62. Exit criteria for release-candidate testing

The defect waiver policy mandates that:

- all P0 tests pass.
- all required P1 tests pass.
- no unresolved critical or high defect.
- iPhone 15 passes core suite.
- iPhone 16 passes core suite.
- long-session tests pass.
- offline tests pass.
- privacy and security review passes.
- accessibility review passes.
- model integrity verified.
- upgrade and rollback pass.
- evidence package complete.

## 63. Hard release blockers

Include:

1. Duplicate FitCore write.
2. Stale or canceled write.
3. Data corruption.
4. Destructive action without exact confirmation.
5. False success after failed tool.
6. Direct model access to persistence.
7. Arbitrary tool execution.
8. Raw-audio retention without approval.
9. Embedded provider secret.
10. Model checksum bypass.
11. iPhone 15 memory termination during normal use.
12. Stop or cancellation failure.
13. Offline core failure after models are installed.
14. User cannot delete Jarvis memory.
15. Active workout damaged after crash or lifecycle event.
16. Unresolved model or dependency license.
17. Accessibility blocks core text-only use.
18. Production logs contain sensitive transcripts or secrets.

## 64. Defect severity

Define:

### Critical

- data corruption.
- unauthorized action.
- security bypass.
- secret exposure.
- privacy breach.

### High

- crash.
- duplicate write prevented inconsistently.
- cancellation failure.
- unusable core voice.
- severe accessibility failure.

### Medium

- recoverable feature failure.
- degraded performance.
- occasional safe clarification issue.
- model download recovery issue.

### Low

- cosmetic issue.
- wording issue.
- non-blocking diagnostics issue.

Critical defects block release. High defects require scope removal or an immediate fix. Medium defects require documented mitigation. Low defects may be deferred to future iterations.

## 65. Defect waiver policy

```text
Defect Triage
    ↓
Assign Severity
    ↓
Is it Critical or High? → YES → Block Release or Remove Scope
    ↓ NO
Is it Medium? → YES → Document Mitigation
    ↓ NO
Defer
```

The defect waiver policy mandates that:

- critical defects cannot be waived.
- high defects require scope removal or fix.
- medium defects require documented mitigation and owner role.
- low defects may be deferred.
- no informal verbal waiver.
- release decision records rationale.
- optional enhancement may be removed to preserve core release.

## 66. Evidence package

Every release candidate must produce an evidence package containing:

- commit SHA.
- build identifier.
- model manifest.
- dependency versions.
- device matrix.
- test summary.
- failed and skipped tests.
- physical-device results.
- long-session results.
- privacy review.
- security review.
- accessibility review.
- known limitations.
- rollback instructions.
- release decision.

## 67. Implementation PR evidence requirements

Future implementation PRs must document:

- exact scope.
- requirements addressed.
- tests added.
- tests run.
- test environment.
- model or mock used.
- changed files.
- failures.
- screenshots only where useful and privacy-safe.
- physical-device evidence where applicable.
- rollback or disable strategy.

## 68. Manual-test evidence requirements

Manual test reports must identify:

- tester role.
- device.
- OS.
- build.
- model configuration.
- audio route.
- environment.
- steps.
- expected result.
- actual result.
- artifacts.
- privacy handling.

## 69. Upgrade testing

Testing must cover:

- prior app version to candidate.
- existing FitCore data.
- existing Jarvis models.
- existing memory.
- interrupted update.
- migration failure.
- old model compatibility.
- service worker or web asset compatibility.
- rollback.

No loss of canonical FitCore data is permitted during upgrades.

## 70. Rollback testing

```text
Detect Issue
    ↓
Trigger Rollback (Flag / App Update)
    ↓
Verify Canonical FitCore Unaffected
    ↓
Verify Jarvis Safely Degrades
```

Verification must confirm:

- application rollback where supported.
- model rollback.
- manifest rollback.
- provider disablement.
- feature flag or capability disablement.
- preservation of FitCore records.
- memory compatibility.
- no stale tool replay.

## 71. Production-readiness review

The production-readiness review evaluates:

- product scope.
- architecture.
- data integrity.
- performance.
- privacy.
- security.
- accessibility.
- operations.
- support.
- licensing.
- distribution.
- rollback.

The review must yield an explicit decision:

- ready.
- conditionally ready with scope reduction.
- not ready.
- redesign required.

## 72. Post-release verification

Post-release verification checks include:

- crash trends.
- model load failures.
- duplicate-write alerts.
- stale-turn errors.
- model download failures.
- storage failures.
- privacy reports.
- accessibility reports.
- provider failures.
- regression reports.

Invasive telemetry is not required.

## 73. Emergency disablement

```text
Alert Trigger
    ↓
Evaluate Impact
    ↓
Disable Affected Component
    ↓
Verify Core FitCore Operation
```

Emergency disablement capabilities must cover:

- optional provider.
- compromised model revision.
- write tools.
- memory proposals.
- enhanced TTS.
- hands-free mode.

Core FitCore functions and deterministic safe operation should remain available where possible.

## 74. Repository-grounded test map

The following maps testing requirements to current repository capabilities:

| Test area       | Existing repository capability | Reusable files or commands                                                     | Missing capability            | Future integration           |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------ | ----------------------------- | ---------------------------- |
| unit tests      | vitest / bun test              | `tests/unit/`, `bun run test`                                                  | -                             | deterministic parser tests   |
| Playwright      | Playwright E2E                 | `playwright.config.ts`, `.github/workflows/playwright.yml`, `npm run test:e2e` | -                             | Browser Jarvis E2E           |
| smoke tests     | CI workflow                    | `.github/workflows/ci.yml`, `bun run build`                                    | native builds                 | Native build checks          |
| data integrity  | vitest                         | `tests/unit/` analytics tests                                                  | -                             | write-assertion tests        |
| active workout  | vitest                         | `tests/unit/`                                                                  | -                             | active context assertions    |
| analytics       | vitest                         | `tests/unit/`                                                                  | -                             | chart selection tests        |
| offline         | -                              | -                                                                              | offline specific test harness | offline simulator            |
| accessibility   | Playwright                     | -                                                                              | native voiceover testing      | VoiceOver CI runner          |
| CI              | GitHub Actions                 | `.github/workflows/`                                                           | iOS simulator runner          | iOS workflow integration     |
| native          | -                              | -                                                                              | XCTest / XCUITest             | Swift native bridge tests    |
| model           | -                              | -                                                                              | Model harness                 | Evaluator pipeline           |
| audio           | -                              | -                                                                              | Audio recording fixtures      | STT mock fixtures            |
| physical device | -                              | -                                                                              | Automated device lab          | TestFlight beta distribution |

## 75. Initial QA implementation subset

The recommended initial QA implementation subset is:

1. Deterministic parser unit suite.
2. Tool contract and idempotency suite.
3. Conversation state-machine suite.
4. Mock bridge contract suite.
5. Context-builder suite.
6. Canonical service integration tests.
7. Browser Jarvis surface E2E.
8. Physical-device voice smoke suite.
9. Duplicate/stale-write safety suite.
10. Model evaluation fixture suite.
11. Privacy and deletion suite.
12. Release-candidate checklist.

## 76. Deferred QA capabilities

The following capabilities may be deferred until a baseline implementation exists:

- continuous model benchmarking.
- large device lab.
- automated acoustic chamber testing.
- broad multilingual evaluation.
- Android.
- cloud-provider matrix.
- visual-diff system for native surfaces.
- automated energy lab.

## 77. Rejected QA approaches

Reject and explain:

- relying only on manual testing.
- relying only on mocks.
- relying only on simulator.
- using live personal data in CI.
- accepting probabilistic tests without stable scoring.
- retrying flaky safety tests until they pass.
- skipping iPhone 15 because iPhone 16 passes.
- testing writes without before-and-after assertions.
- treating a demo video as full evidence.
- changing release thresholds after failures without review.
- merging implementation without tests.
- enabling real model access in every fast unit-test run.

## 78. Open questions

Unresolved questions to track include:

- final JavaScript test framework after UI merges.
- final native test framework.
- physical-device availability.
- TestFlight availability.
- macOS runner availability.
- audio-fixture strategy.
- acceptable model-evaluation variance.
- exact coverage targets.
- exact release threshold values.
- production telemetry policy.
- long-session execution frequency.
- accessibility reviewer availability.

## 79. Final recommendation summary

The verification strategy for FitCore Jarvis relies on a strict test-pyramid structure, enforcing deterministic unit and contract testing before probabilistic model evaluation. Traceability is maintained from requirement to release gate. Physical-device testing on the iPhone 15 is mandatory and serves as the binding acceptance baseline. Write-safety tests, privacy validation, and security reviews must pass independently. Accessibility and end-to-end release candidate testing are prerequisite for production. The initial QA subset prioritizes deterministic safety, parser checks, and offline verification. Hard blockers include any duplicate writes, stale writes, or data corruption. An evidence package with strict upgrade and rollback testing paths must accompany the release decision. The largest unresolved quality risk remains automated large-scale acoustic evaluation for gym environments.

## 80. References

- XCTest Documentation - Apple Developer - access date: 2026-07-15 - iOS test framework.
- Playwright Documentation - Playwright - access date: 2026-07-15 - Web E2E testing framework.
- OWASP Mobile Application Security Verification Standard - OWASP - access date: 2026-07-15 - security best practices.

Prefer official Apple, Playwright, test-framework, OWASP, and standards sources.
