## 1. Title

# FitCore Jarvis Product and System Requirements

## 2. Document status

This is a product and system requirements document. Jarvis implementation has not begun under this documentation sequence. This document does not select final third-party dependencies. Requirements defined here may be refined only through an explicit reviewed update. Any measured performance thresholds remain provisional until device testing is completed.

## 3. Purpose and scope

This document defines the baseline requirements for a local-first, voice-capable, FitCore-aware conversational agent named Jarvis.

Jarvis is intended to be:

- integrated into FitCore;
- aware of FitCore context;
- capable of approved FitCore actions;
- useful during workouts;
- capable of cohesive conversation;
- usable without mandatory cloud services.

Jarvis is not intended to be:

- an unrestricted replacement for ChatGPT;
- a medical professional;
- a system-wide Siri replacement;
- an autonomous controller with unrestricted data access.

## 4. Product objective

Jarvis should allow the user to speak or type naturally, maintain a fluid multi-turn conversation, understand the current FitCore context, retrieve verified FitCore information, explain trends and analytics, and perform authorized actions safely.

Expected examples (these illustrate desired outcomes and are not a finalized command grammar):

- “Log 225 for five.”
- “Start a ninety-second timer.”
- “What did I bench last week?”
- “Compare today’s workout with my previous push workout.”
- “Why is my recovery lower today?”
- “How much protein do I have left?”
- “Explain the chart I am looking at.”
- “Replace this exercise with something easier on my knee.”
- “Undo that.”

## 5. Supported-device requirements

- **JARVIS-COMPAT-001**
  - **Status:** Locked product requirement
  - **Requirement:** Regular iPhone 15 is the minimum supported performance target.
  - **Rationale:** Ensures the core local-first capabilities function effectively on recent mainstream devices.
  - **Validation:** Performance benchmarking on a standard iPhone 15 running the minimum required iOS version.

- **JARVIS-COMPAT-002**
  - **Status:** Locked product requirement
  - **Requirement:** iPhone 16 must also be supported.
  - **Rationale:** Ensures compatibility with the latest iPhone models at the time of development.
  - **Validation:** Verification of successful test runs on iPhone 16 hardware.

- **JARVIS-COMPAT-003**
  - **Status:** Locked product requirement
  - **Requirement:** Core behavior must remain functionally consistent across both iPhone 15 and iPhone 16.
  - **Rationale:** A consistent baseline ensures no fundamental features are restricted merely by hardware tier between these two models.
  - **Validation:** E2E parity testing across both targets.

- **JARVIS-COMPAT-004**
  - **Status:** Future optional enhancement
  - **Requirement:** Apple Intelligence may be used only as an optional enhancement.
  - **Rationale:** Protects the agent's autonomy and user privacy while allowing integration of OS-level AI if the user chooses.
  - **Validation:** Verify core functionality completely succeeds when Apple Intelligence is unavailable or disabled.

- **JARVIS-COMPAT-005**
  - **Status:** Locked product requirement
  - **Requirement:** Core functionality must not depend on Apple Intelligence.
  - **Rationale:** The local command engine and conversation must operate securely on the local device via its own means.

- **JARVIS-COMPAT-006**
  - **Status:** Locked product requirement
  - **Requirement:** The phone must be able to operate Jarvis without a continuously running computer.
  - **Rationale:** Real-world gym environments preclude reliance on a tethered or networked personal computer.

- **JARVIS-COMPAT-007**
  - **Status:** Locked product requirement
  - **Requirement:** The architecture must not require a desktop relay for normal use.
  - **Rationale:** Same as JARVIS-COMPAT-006; all inference and context processing must be entirely self-contained on the device.

- **JARVIS-COMPAT-008**
  - **Status:** Locked product requirement
  - **Requirement:** The first implementation may target iOS only.
  - **Rationale:** Focuses development resources on a stable, single-platform launch.

- **JARVIS-COMPAT-009**
  - **Status:** Future optional enhancement
  - **Requirement:** Android support is outside the initial scope unless separately approved.
  - **Rationale:** Platform fragmentation requires careful consideration before expansion.

- **JARVIS-COMPAT-010**
  - **Status:** Provisional requirement
  - **Requirement:** Older iPhones are not automatically required to support the full local agent.
  - **Rationale:** Hardware limitations on memory and neural engine capabilities may prevent older devices from running the model successfully.

## 6. Cost requirements

- **JARVIS-COST-001**
  - **Status:** Locked product requirement
  - **Requirement:** Core Jarvis operation must have no mandatory recurring AI API charge.
  - **Rationale:** Reduces friction for adoption and ensures baseline offline capabilities are always free to the user.

- **JARVIS-COST-002**
  - **Status:** Locked product requirement
  - **Requirement:** Core Jarvis operation must not require a paid cloud server.
  - **Rationale:** Reinforces the local-first ethos.

- **JARVIS-COST-003**
  - **Status:** Locked product requirement
  - **Requirement:** Core Jarvis operation must not require ChatGPT Plus.
  - **Rationale:** Prevents external service lock-in for critical app capabilities.

- **JARVIS-COST-004**
  - **Status:** Locked product requirement
  - **Requirement:** Core Jarvis operation must not require an OpenAI API key.
  - **Rationale:** The system must function out of the box using on-device models.

- **JARVIS-COST-005**
  - **Status:** Future optional enhancement
  - **Requirement:** Optional cloud providers may be added later.
  - **Rationale:** Users who opt-in may leverage larger cloud models for enhanced coaching.

- **JARVIS-COST-006**
  - **Status:** Locked product requirement
  - **Requirement:** Optional provider failure must not remove essential workout functionality.
  - **Rationale:** Assures reliability even when external services go offline.

- **JARVIS-COST-007**
  - **Status:** Provisional requirement
  - **Requirement:** Initial model downloads may require internet access.
  - **Rationale:** Necessary due to the size of local language models, which cannot realistically be bundled directly into the initial App Store download.

- **JARVIS-COST-008**
  - **Status:** Locked product requirement
  - **Requirement:** Apple developer distribution fees must not be confused with recurring AI operating costs.
  - **Rationale:** App store business requirements are standard and separate from AI architecture costs.

- **JARVIS-COST-009**
  - **Status:** Locked product requirement
  - **Requirement:** The system must clearly disclose any future optional feature that could incur charges.
  - **Rationale:** Ensures transparency and user trust regarding any premium API integrations.

## 7. Local-first and offline requirements

- **JARVIS-OFFLINE-001**
  - **Status:** Locked product requirement
  - **Requirement:** Essential workout commands must remain available offline.
  - **Rationale:** Gym environments often have poor network connectivity, so logging workouts must not fail.
  - **Validation:** Perform workout logging while device is in Airplane mode.

- **JARVIS-OFFLINE-002**
  - **Status:** Locked product requirement
  - **Requirement:** The local command engine must not depend entirely on a language model.
  - **Rationale:** A deterministic command layer provides fast, reliable, and energy-efficient processing for standard actions.

- **JARVIS-OFFLINE-003**
  - **Status:** Provisional requirement
  - **Requirement:** Core conversational processing should run on the phone where technically practical.
  - **Rationale:** Enhances privacy and reduces latency compared to cloud inference.

- **JARVIS-OFFLINE-004**
  - **Status:** Locked product requirement
  - **Requirement:** Conversation memory should remain local by default.
  - **Rationale:** Protects user privacy and sensitive health-related context.

- **JARVIS-OFFLINE-005**
  - **Status:** Locked product requirement
  - **Requirement:** Tool execution must use local FitCore services.
  - **Rationale:** Aligns with FitCore's local-first architecture and ensures data consistency with the standard UI.

- **JARVIS-OFFLINE-006**
  - **Status:** Locked product requirement
  - **Requirement:** Model files must be stored locally after download.
  - **Rationale:** Enables subsequent offline use without re-downloading large assets.

- **JARVIS-OFFLINE-007**
  - **Status:** Locked product requirement
  - **Requirement:** The user must be informed when a requested feature requires internet access.
  - **Rationale:** Manages expectations when an action cannot be processed locally.

- **JARVIS-OFFLINE-008**
  - **Status:** Locked product requirement
  - **Requirement:** Loss of network connectivity must not corrupt the active workout.
  - **Rationale:** Safety and data integrity guarantee for users in active sessions.

- **JARVIS-OFFLINE-009**
  - **Status:** Locked product requirement
  - **Requirement:** Optional cloud enhancement must degrade gracefully to local behavior.
  - **Rationale:** Maintains baseline agent capabilities without disruption.

- **JARVIS-OFFLINE-010**
  - **Status:** Locked product requirement
  - **Requirement:** Offline capability does not require unrestricted offline general knowledge.
  - **Rationale:** Jarvis is a fitness assistant, not a generalized local encyclopedia.

## 8. Voice interaction requirements

- **JARVIS-VOICE-001**
  - **Status:** Locked product requirement
  - **Requirement:** Support microphone input.
  - **Rationale:** Voice is a primary modality for hands-free interaction during workouts.

- **JARVIS-VOICE-002**
  - **Status:** Locked product requirement
  - **Requirement:** Support push-to-talk.
  - **Rationale:** Prevents unintended activation and ambient noise capture.

- **JARVIS-VOICE-003**
  - **Status:** Future optional enhancement
  - **Requirement:** Support optional hands-free conversation while FitCore is open.
  - **Rationale:** Desirable for uninterrupted lifting sessions.

- **JARVIS-VOICE-004**
  - **Status:** Locked product requirement
  - **Requirement:** Provide local speech-to-text.
  - **Rationale:** Enables offline transcription without sending audio to a cloud provider.

- **JARVIS-VOICE-005**
  - **Status:** Locked product requirement
  - **Requirement:** Display a partial transcript during speech.
  - **Rationale:** Gives immediate visual feedback that the system is listening.

- **JARVIS-VOICE-006**
  - **Status:** Provisional requirement
  - **Requirement:** Implement robust end-of-turn detection.
  - **Rationale:** The system needs to know when the user has finished speaking to begin processing.

- **JARVIS-VOICE-007**
  - **Status:** Provisional requirement
  - **Requirement:** Support interruption or barge-in.
  - **Rationale:** Allows users to correct themselves or stop the assistant dynamically.

- **JARVIS-VOICE-008**
  - **Status:** Locked product requirement
  - **Requirement:** Allow stopping spoken output immediately.
  - **Rationale:** Gives the user control over lengthy or unwanted responses.

- **JARVIS-VOICE-009**
  - **Status:** Locked product requirement
  - **Requirement:** Allow canceling stale model generation.
  - **Rationale:** Frees up resources and prevents irrelevant tools from firing if context changes.

- **JARVIS-VOICE-010**
  - **Status:** Locked product requirement
  - **Requirement:** Support spoken responses.
  - **Rationale:** Completes the conversational loop for hands-free interaction.

- **JARVIS-VOICE-011**
  - **Status:** Locked product requirement
  - **Requirement:** Provide captions for spoken responses.
  - **Rationale:** Accessibility and visibility in noisy environments.

- **JARVIS-VOICE-012**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure Bluetooth headphone compatibility.
  - **Rationale:** Many users train using wireless headphones.

- **JARVIS-VOICE-013**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure reliable noisy-gym operation.
  - **Rationale:** Background noise (music, clanking weights) must not severely degrade command recognition.

- **JARVIS-VOICE-014**
  - **Status:** Locked product requirement
  - **Requirement:** Include speech-rate controls.
  - **Rationale:** Allows users to adjust the speed of spoken feedback for accessibility or preference.

- **JARVIS-VOICE-015**
  - **Status:** Locked product requirement
  - **Requirement:** Allow disabling speech output.
  - **Rationale:** Essential for users who want text-only interaction (e.g., in quiet spaces).

- **JARVIS-VOICE-016**
  - **Status:** Provisional requirement
  - **Requirement:** Utilize local system-voice fallback.
  - **Rationale:** Guarantees voice output without needing a specialized offline neural TTS model immediately.

- **JARVIS-VOICE-017**
  - **Status:** Locked product requirement
  - **Requirement:** Support correction after a transcription mistake.
  - **Rationale:** Users must be able to say "no, I meant 225" and have the system recover gracefully.

- **JARVIS-VOICE-018**
  - **Status:** Locked product requirement
  - **Requirement:** No permanent always-listening requirement while the app is closed.
  - **Rationale:** Protects battery life and user privacy.

- **JARVIS-VOICE-019**
  - **Status:** Locked product requirement
  - **Requirement:** Raw audio must not be retained by default.
  - **Rationale:** Preserves privacy; audio is processed into text and immediately discarded.

## 9. Fluid conversation requirements

- **JARVIS-CONV-001**
  - **Status:** Locked product requirement
  - **Requirement:** Maintain cohesive multi-turn conversations.
  - **Rationale:** Allows natural follow-up questions without restarting the intent completely.

- **JARVIS-CONV-002**
  - **Status:** Locked product requirement
  - **Requirement:** Retain recent context.
  - **Rationale:** Enables an ongoing dialogue across a session.

- **JARVIS-CONV-003**
  - **Status:** Locked product requirement
  - **Requirement:** Resolve pronouns and references.
  - **Rationale:** Must understand phrases like "that set", "the last one", "the first chart", and "do the same for squats".

- **JARVIS-CONV-004**
  - **Status:** Locked product requirement
  - **Requirement:** Understand explicit undo commands (e.g., "undo that").
  - **Rationale:** A critical safety feature for quick recovery from incorrect voice commands.

- **JARVIS-CONV-005**
  - **Status:** Locked product requirement
  - **Requirement:** Support temporal context changes (e.g., "what about last month?").
  - **Rationale:** Empowers data exploration.

- **JARVIS-CONV-006**
  - **Status:** Locked product requirement
  - **Requirement:** Maintain a current topic.
  - **Rationale:** Keeps responses focused and relevant.

- **JARVIS-CONV-007**
  - **Status:** Locked product requirement
  - **Requirement:** Switch topics safely.
  - **Rationale:** If the user shifts from a workout command to a nutrition question, the system should adapt cleanly.

- **JARVIS-CONV-008**
  - **Status:** Locked product requirement
  - **Requirement:** Return to a prior topic.
  - **Rationale:** Supports non-linear human conversation.

- **JARVIS-CONV-009**
  - **Status:** Provisional requirement
  - **Requirement:** Handle interruptions gracefully.
  - **Rationale:** Essential for a realistic conversational feel.

- **JARVIS-CONV-010**
  - **Status:** Locked product requirement
  - **Requirement:** Prevent an interrupted response from later executing.
  - **Rationale:** A stopped generation must not trigger side effects (e.g., logging an unwanted set).

- **JARVIS-CONV-011**
  - **Status:** Locked product requirement
  - **Requirement:** Switch seamlessly between voice and text.
  - **Rationale:** Affords the user multiple interaction modes within a single session.

- **JARVIS-CONV-012**
  - **Status:** Locked product requirement
  - **Requirement:** Expose the transcript clearly in the UI.
  - **Rationale:** Allows users to verify what the system heard.

- **JARVIS-CONV-013**
  - **Status:** Locked product requirement
  - **Requirement:** Allow the user to stop generation manually.
  - **Rationale:** Provides an escape hatch if the response is too long or incorrect.

- **JARVIS-CONV-014**
  - **Status:** Provisional requirement
  - **Requirement:** Keep workout-mode answers concise.
  - **Rationale:** Users actively training require quick confirmations, not paragraphs of text.

- **JARVIS-CONV-015**
  - **Status:** Provisional requirement
  - **Requirement:** Allow longer explanations in coach-mode or analytics contexts.
  - **Rationale:** When reviewing past data, detailed analysis is more appropriate than during a lift.

- **JARVIS-CONV-016**
  - **Status:** Locked product requirement
  - **Requirement:** Admit uncertainty when an answer is unknown.
  - **Rationale:** Trust requires honesty about system limitations.

- **JARVIS-CONV-017**
  - **Status:** Locked product requirement
  - **Requirement:** Must not invent FitCore data.
  - **Rationale:** Hallucinations regarding sets, reps, macros, or records completely undermine user trust.

## 10. FitCore context-awareness requirements

- **JARVIS-CONTEXT-001**
  - **Status:** Locked product requirement
  - **Requirement:** Maintain awareness of the current route or screen.
  - **Rationale:** Responses must adapt based on whether the user is on Home, Training, Fuel, Recovery, or Stats.

- **JARVIS-CONTEXT-002**
  - **Status:** Locked product requirement
  - **Requirement:** Maintain awareness of the current selected date.
  - **Rationale:** Critical for resolving temporal questions like "how did I sleep?"

- **JARVIS-CONTEXT-003**
  - **Status:** Locked product requirement
  - **Requirement:** Understand if there is an active workout.
  - **Rationale:** Activates concise workout-mode and prioritizes workout-specific command processing.

- **JARVIS-CONTEXT-004**
  - **Status:** Locked product requirement
  - **Requirement:** Track the current exercise and set within an active workout.
  - **Rationale:** Necessary for commands like "log it" or "same weight".

- **JARVIS-CONTEXT-005**
  - **Status:** Locked product requirement
  - **Requirement:** Recall the previous set.
  - **Rationale:** Essential for accurate comparisons and "repeat that" commands.

- **JARVIS-CONTEXT-006**
  - **Status:** Locked product requirement
  - **Requirement:** Track the current active timer.
  - **Rationale:** Allows users to ask "how much time is left?" or manage rests dynamically.

- **JARVIS-CONTEXT-007**
  - **Status:** Locked product requirement
  - **Requirement:** Maintain awareness of the selected chart, metric, and displayed analysis.
  - **Rationale:** Connects visual data to spoken explanations (e.g., "explain this chart").

- **JARVIS-CONTEXT-008**
  - **Status:** Locked product requirement
  - **Requirement:** Understand active filters.
  - **Rationale:** Ensures insights match the user's current UI view.

- **JARVIS-CONTEXT-009**
  - **Status:** Locked product requirement
  - **Requirement:** Incorporate user goals, relevant preferences, and approved limitations/restrictions into context.
  - **Rationale:** Personalizes responses and avoids suggesting unsafe or undesired actions.

- **JARVIS-CONTEXT-010**
  - **Status:** Locked product requirement
  - **Requirement:** Track the most recent Jarvis action and any pending confirmations.
  - **Rationale:** Required for robust undo functionality and safe multi-step execution.

- **JARVIS-CONTEXT-011**
  - **Status:** Locked product requirement
  - **Requirement:** Limit context supplied to the model to relevant information rather than the entire database.
  - **Rationale:** Prevents context window overflow and reduces inference latency and memory footprint.

- **JARVIS-CONTEXT-012**
  - **Status:** Locked product requirement
  - **Requirement:** Refresh context automatically when the user navigates or changes the selected data.
  - **Rationale:** Ensures the agent's worldview remains synchronized with the UI.

## 11. Functional requirements

### Training

- **JARVIS-FUNC-TRAIN-001**
  - **Status:** Locked product requirement
  - **Requirement:** Log a set.
  * **Rationale:** Core functionality to support active workout logging without manual UI interaction.
- **JARVIS-FUNC-TRAIN-002**
  - **Status:** Locked product requirement
  - **Requirement:** Edit a recently logged set.
  * **Rationale:** Allows correction of mistakes quickly during an active session.
- **JARVIS-FUNC-TRAIN-003**
  - **Status:** Locked product requirement
  - **Requirement:** Repeat a prior set.
  * **Rationale:** Reduces friction for repeated sets, the most common action in strength training.
- **JARVIS-FUNC-TRAIN-004**
  - **Status:** Locked product requirement
  - **Requirement:** Start or stop a timer.
  * **Rationale:** Essential for rest period management.
- **JARVIS-FUNC-TRAIN-005**
  - **Status:** Locked product requirement
  - **Requirement:** Complete an exercise.
  * **Rationale:** Advances the workout flow seamlessly.
- **JARVIS-FUNC-TRAIN-006**
  - **Status:** Locked product requirement
  - **Requirement:** Navigate between exercises.
  * **Rationale:** Provides voice control over the entire active workout sequence.
- **JARVIS-FUNC-TRAIN-007**
  - **Status:** Locked product requirement
  - **Requirement:** Retrieve exercise history.
  * **Rationale:** Users frequently need to check previous weights and reps to plan their next set.
- **JARVIS-FUNC-TRAIN-008**
  - **Status:** Locked product requirement
  - **Requirement:** Compare sessions.
  * **Rationale:** Supports progressive overload tracking by understanding volume and intensity differences.
- **JARVIS-FUNC-TRAIN-009**
  - **Status:** Locked product requirement
  - **Requirement:** Explain volume, intensity, estimated strength, and progression.
  * **Rationale:** Translates raw data into actionable insights for the user.
- **JARVIS-FUNC-TRAIN-010**
  - **Status:** Locked product requirement
  - **Requirement:** Identify personal records calculated by FitCore.
  * **Rationale:** Celebrates progression securely using deterministic FitCore logic rather than LLM guesswork.
- **JARVIS-FUNC-TRAIN-011**
  - **Status:** Provisional requirement
  - **Requirement:** Propose exercise substitutions.
  * **Rationale:** Helps users adapt their workout when equipment is unavailable or injury occurs.
- **JARVIS-FUNC-TRAIN-012**
  - **Status:** Locked product requirement
  - **Requirement:** Respect user-entered restrictions.
  * **Rationale:** Safety critical; must not suggest movements the user has flagged as painful.
- **JARVIS-FUNC-TRAIN-013**
  - **Status:** Locked product requirement
  - **Requirement:** Require confirmation where a substitution materially changes the workout.
  * **Rationale:** Prevents unintended disruption of the user's programmed training plan.

### Nutrition or Fuel

- **JARVIS-FUNC-NUTR-001**
  - **Status:** Locked product requirement
  - **Requirement:** Retrieve current calorie totals.
  * **Rationale:** Core nutritional awareness action.
- **JARVIS-FUNC-NUTR-002**
  - **Status:** Locked product requirement
  - **Requirement:** Retrieve macro totals.
  * **Rationale:** Provides deeper nutritional context for bodybuilders and athletes.
- **JARVIS-FUNC-NUTR-003**
  - **Status:** Locked product requirement
  - **Requirement:** Explain remaining targets.
  * **Rationale:** Translates current consumption into actionable guidance for the rest of the day.
- **JARVIS-FUNC-NUTR-004**
  - **Status:** Locked product requirement
  - **Requirement:** Summarize recent adherence.
  * **Rationale:** Connects daily actions to long-term consistency goals.
- **JARVIS-FUNC-NUTR-005**
  - **Status:** Locked product requirement
  - **Requirement:** Answer questions using stored FitCore nutrition data.
  * **Rationale:** Prevents general encyclopedic answers and anchors advice in user's actual intake.
- **JARVIS-FUNC-NUTR-006**
  - **Status:** Locked product requirement
  - **Requirement:** Avoid inventing food entries.
  * **Rationale:** Protects the integrity of the user's nutritional database.
- **JARVIS-FUNC-NUTR-007**
  - **Status:** Locked product requirement
  - **Requirement:** Clearly identify missing nutrition data.
  * **Rationale:** Maintains trust by admitting gaps in knowledge rather than estimating.

### Recovery and sleep

- **JARVIS-FUNC-REC-001**
  - **Status:** Locked product requirement
  - **Requirement:** Retrieve available recovery indicators.
  * **Rationale:** Connects subjective feeling to objective metrics.
- **JARVIS-FUNC-REC-002**
  - **Status:** Locked product requirement
  - **Requirement:** Retrieve available sleep data.
  * **Rationale:** Essential input for recovery assessment.
- **JARVIS-FUNC-REC-003**
  - **Status:** Locked product requirement
  - **Requirement:** Compare recent trends.
  * **Rationale:** Identifies overtraining or under-recovering patterns over time.
- **JARVIS-FUNC-REC-004**
  - **Status:** Locked product requirement
  - **Requirement:** Explain verified changes.
  * **Rationale:** Focuses on deterministic metrics provided by FitCore rather than AI extrapolation.
- **JARVIS-FUNC-REC-005**
  - **Status:** Locked product requirement
  - **Requirement:** Distinguish correlation from certainty.
  * **Rationale:** Prevents the AI from stating spurious relationships between lifestyle and recovery as concrete facts.
- **JARVIS-FUNC-REC-006**
  - **Status:** Locked product requirement
  - **Requirement:** Avoid diagnosis or medical treatment claims.
  * **Rationale:** Strict safety and liability boundary; Jarvis is not a doctor.

### Stats and analytics

- **JARVIS-FUNC-STAT-001**
  - **Status:** Locked product requirement
  - **Requirement:** Retrieve chart data.
  * **Rationale:** Allows voice navigation and exploration of visual metrics.
- **JARVIS-FUNC-STAT-002**
  - **Status:** Locked product requirement
  - **Requirement:** Explain selected metrics.
  * **Rationale:** Makes complex analytics accessible via natural language.
- **JARVIS-FUNC-STAT-003**
  - **Status:** Locked product requirement
  - **Requirement:** Compare date ranges.
  * **Rationale:** Supports deeper periodized review of training and body composition.
- **JARVIS-FUNC-STAT-004**
  - **Status:** Locked product requirement
  - **Requirement:** Explain trends calculated by FitCore.
  * **Rationale:** Ensures explanations are rooted in validated math.
- **JARVIS-FUNC-STAT-005**
  - **Status:** Locked product requirement
  - **Requirement:** Identify data gaps.
  * **Rationale:** Prevents flawed analysis when underlying records are missing.
- **JARVIS-FUNC-STAT-006**
  - **Status:** Locked product requirement
  - **Requirement:** Navigate to supporting views.
  * **Rationale:** Bridges conversational UI with visual UI to show the user the source of the insight.
- **JARVIS-FUNC-STAT-007**
  - **Status:** Locked product requirement
  - **Requirement:** Avoid recalculating canonical metrics independently where FitCore already provides them.
  * **Rationale:** Prevents conflicting data presentation between the LLM and the app's standard UI.

### Goals and preferences

- **JARVIS-FUNC-GOAL-001**
  - **Status:** Locked product requirement
  - **Requirement:** Retrieve active goals.
  * **Rationale:** Grounds all advice in the user's current objectives.
- **JARVIS-FUNC-GOAL-002**
  - **Status:** Locked product requirement
  - **Requirement:** Explain progress.
  * **Rationale:** Connects daily behaviors to the user's overarching goal.
- **JARVIS-FUNC-GOAL-003**
  - **Status:** Locked product requirement
  - **Requirement:** Remember approved preferences.
  * **Rationale:** Reduces repetitive setup (e.g., 'I always bench with a 45lb bar').
- **JARVIS-FUNC-GOAL-004**
  - **Status:** Provisional requirement
  - **Requirement:** Propose goal adjustments.
  * **Rationale:** Helps users adapt if they are consistently over or underperforming targets.
- **JARVIS-FUNC-GOAL-005**
  - **Status:** Locked product requirement
  - **Requirement:** Require explicit confirmation before changing important goals or targets.
  * **Rationale:** Protects core user configuration from accidental spoken modification.

## 12. Deterministic command requirements

Common workout actions must use a deterministic fast path wherever possible to bypass slow LLM generation.

Illustrative commands:

- “225 for five”
- “Two twenty-five for five reps”
- “Same weight”
- “Same weight for six”
- “Add five pounds”
- “Drop ten”
- “Start ninety seconds”
- “Repeat the last set”
- “Undo that”
- “Next exercise”

- **JARVIS-CMD-001**
  - **Status:** Locked product requirement
  - **Requirement:** Process standard weight commands in pounds and kilograms accurately.
  * **Rationale:** Ensures safe and precise logging.
- **JARVIS-CMD-002**
  - **Status:** Locked product requirement
  - **Requirement:** Support both whole numbers and decimal numbers.
  * **Rationale:** Handles fractional plates and bodyweight scaling.
- **JARVIS-CMD-003**
  - **Status:** Locked product requirement
  - **Requirement:** Normalize spoken numbers robustly (e.g., "two twenty-five" to 225).
  * **Rationale:** Accommodates natural gym dialect.
- **JARVIS-CMD-004**
  - **Status:** Locked product requirement
  - **Requirement:** Support common command aliases.
  * **Rationale:** Users will say 'drop ten' instead of 'reduce weight by 10 pounds'.
- **JARVIS-CMD-005**
  - **Status:** Locked product requirement
  - **Requirement:** Infer missing parameters from current-exercise context.
  * **Rationale:** If the user says 'for five', the weight should match the previous set automatically.
- **JARVIS-CMD-006**
  - **Status:** Locked product requirement
  - **Requirement:** Prompt the user clearly for missing context.
  * **Rationale:** Prevents dangerous assumptions when tracking heavy lifts.
- **JARVIS-CMD-007**
  - **Status:** Locked product requirement
  - **Requirement:** Handle ambiguous commands safely, asking for clarification.
  * **Rationale:** Better to prompt than to corrupt workout history.
- **JARVIS-CMD-008**
  - **Status:** Locked product requirement
  - **Requirement:** Reject low-confidence transcription safely rather than logging garbage data.
  * **Rationale:** Prevents pollution of training history.
- **JARVIS-CMD-009**
  - **Status:** Locked product requirement
  - **Requirement:** Implement robust correction commands ("no, I meant X").
  * **Rationale:** Vital for rapid repair of voice transcription errors.
- **JARVIS-CMD-010**
  - **Status:** Locked product requirement
  - **Requirement:** Prevent duplicate logging actively if a command is repeated rapidly.
  * **Rationale:** Idempotency is necessary due to potentially duplicated voice requests.
- **JARVIS-CMD-011**
  - **Status:** Locked product requirement
  - **Requirement:** Support immediate Undo for all deterministic writes.
  * **Rationale:** Affords the user a reliable escape hatch for mistakes.
- **JARVIS-CMD-012**
  - **Status:** Locked product requirement
  - **Requirement:** Require explicit confirmation when safe execution is not possible.
  * **Rationale:** Enforces safety boundaries around actions that could cause confusion.

Note: The final grammar will be defined separately.

## 13. Agent and tool requirements

- **JARVIS-TOOL-001**
  - **Status:** Locked product requirement
  - **Requirement:** Jarvis must not directly edit persistence (localStorage, IndexedDB, SQLite, files, or native storage).
  - **Rationale:** Prevents data corruption and ensures state changes go through proper reducers.
- **JARVIS-TOOL-002**
  - **Status:** Locked product requirement
  - **Requirement:** Jarvis must call approved FitCore services.
  - **Rationale:** Unified business logic.
- **JARVIS-TOOL-003**
  - **Status:** Locked product requirement
  - **Requirement:** Equivalent UI and Jarvis actions must use the same canonical service where practical.
  - **Rationale:** Reduces code duplication and mismatch behaviors.
- **JARVIS-TOOL-004**
  - **Status:** Locked product requirement
  - **Requirement:** Tools must use defined arguments and results.
  - **Rationale:** Enforces strong typing and predictability.
- **JARVIS-TOOL-005**
  - **Status:** Locked product requirement
  - **Requirement:** Tool arguments must be validated.
  - **Rationale:** Rejects hallucinated or invalid inputs from the LLM.
- **JARVIS-TOOL-006**
  - **Status:** Locked product requirement
  - **Requirement:** Tool results must be structured.
  - **Rationale:** Allows the UI to render results predictably.
- **JARVIS-TOOL-007**
  - **Status:** Locked product requirement
  - **Requirement:** Tools must be categorized by risk.
  - **Rationale:** Dictates confirmation requirements.
- **JARVIS-TOOL-008**
  - **Status:** Locked product requirement
  - **Requirement:** Tool permissions must follow least privilege.
  - **Rationale:** Security standard.
- **JARVIS-TOOL-009**
  - **Status:** Locked product requirement
  - **Requirement:** Read-only actions may normally execute immediately.
  - **Rationale:** Safe to perform without prompting.
- **JARVIS-TOOL-010**
  - **Status:** Locked product requirement
  - **Requirement:** Reversible writes must create an Undo path.
  - **Rationale:** Gives users confidence to act fast.
- **JARVIS-TOOL-011**
  - **Status:** Locked product requirement
  - **Requirement:** Destructive or high-impact changes require explicit confirmation.
  - **Rationale:** Prevents catastrophic mistakes (e.g., deleting an entire workout history).
- **JARVIS-TOOL-012**
  - **Status:** Locked product requirement
  - **Requirement:** Duplicate writes must be prevented.
  - **Rationale:** Idempotency ensures safety under retries.
- **JARVIS-TOOL-013**
  - **Status:** Locked product requirement
  - **Requirement:** Interrupted or stale turns must not execute tools.
  - **Rationale:** Tool calls generated for a context that no longer exists should be dropped.
- **JARVIS-TOOL-014**
  - **Status:** Locked product requirement
  - **Requirement:** Tool failures must be surfaced clearly.
  - **Rationale:** User must know if a logged set failed to persist.
- **JARVIS-TOOL-015**
  - **Status:** Locked product requirement
  - **Requirement:** Jarvis must not claim an action succeeded until FitCore confirms it.
  - **Rationale:** Truthfulness.
- **JARVIS-TOOL-016**
  - **Status:** Locked product requirement
  - **Requirement:** FitCore must calculate authoritative metrics.
  - **Rationale:** Math must happen in deterministic code, not an LLM.
- **JARVIS-TOOL-017**
  - **Status:** Locked product requirement
  - **Requirement:** The language model may explain metrics but must not fabricate their values.
  - **Rationale:** Trust requires data accuracy.

## 14. Memory requirements

### Immediate state

- **JARVIS-MEM-001**
  - **Status:** Locked product requirement
  - **Requirement:** Track the current turn, current transcript, and current tool request.
  * **Rationale:** Core state tracking for conversational loop execution.
- **JARVIS-MEM-002**
  - **Status:** Locked product requirement
  - **Requirement:** Maintain current response and interruption state.
  * **Rationale:** Required to cancel processing or handle barge-ins safely.
- **JARVIS-MEM-003**
  - **Status:** Locked product requirement
  - **Requirement:** Maintain pending confirmation status.
  * **Rationale:** Ensures the conversation is locked to the pending decision before allowing new actions.

### Recent conversation

- **JARVIS-MEM-004**
  - **Status:** Locked product requirement
  - **Requirement:** Track recent turns and the current topic.
  * **Rationale:** Enables topic continuation without needing explicit restatement from the user.
- **JARVIS-MEM-005**
  - **Status:** Locked product requirement
  - **Requirement:** Store referenced objects to handle follow-up pronouns.
  * **Rationale:** Allows commands like 'undo that' or 'repeat it' to function.
- **JARVIS-MEM-006**
  - **Status:** Locked product requirement
  - **Requirement:** Track the last action and its Undo target.
  * **Rationale:** Enables precise reversibility of mutations.

### Rolling conversation summary

- **JARVIS-MEM-007**
  - **Status:** Provisional requirement
  - **Requirement:** Compress older conversation to save context space.
  * **Rationale:** Protects limited token context windows on local edge models.
- **JARVIS-MEM-008**
  - **Status:** Locked product requirement
  - **Requirement:** Preserve current objectives and user corrections.
  * **Rationale:** The summary must not lose what the user explicitly requested or corrected.
- **JARVIS-MEM-009**
  - **Status:** Locked product requirement
  - **Requirement:** Remove unnecessary wording during summarization.
  * **Rationale:** Maximizes prompt efficiency.
- **JARVIS-MEM-010**
  - **Status:** Locked product requirement
  - **Requirement:** Avoid treating model speculation as fact during summarization.
  * **Rationale:** Prevents AI hallucinations from embedding themselves into long-term fact records.

### Long-term structured memory

- **JARVIS-MEM-011**
  - **Status:** Future optional enhancement
  - **Requirement:** Potentially retain goals, preferences, response-length preferences, exercise preferences, limitations, approved insights, corrections, and commonly used commands.
  * **Rationale:** Powers true personalization.
- **JARVIS-MEM-012**
  - **Status:** Locked product requirement
  - **Requirement:** Long-term memory requires user review, editing, and deletion capabilities.
  * **Rationale:** User autonomy and privacy mandate.
- **JARVIS-MEM-013**
  - **Status:** Locked product requirement
  - **Requirement:** Must include source metadata, creation timestamp, approval status, and confidence where applicable.
  * **Rationale:** Traceability of why Jarvis 'knows' something.
- **JARVIS-MEM-014**
  - **Status:** Locked product requirement
  - **Requirement:** Must support an expiration or review date where appropriate.
  * **Rationale:** Goals and preferences change; stale memory must be pruned.
- **JARVIS-MEM-015**
  - **Status:** Locked product requirement
  - **Requirement:** Casual statements must not automatically become permanent memory.
  * **Rationale:** Avoids polluting the persona model with transient comments.

## 15. Safety requirements

- **JARVIS-SAFE-001**
  - **Status:** Locked product requirement
  - **Requirement:** No medical diagnosis.
  * **Rationale:** Legal and ethical safety boundary.
- **JARVIS-SAFE-002**
  - **Status:** Locked product requirement
  - **Requirement:** No emergency medical guidance beyond directing the user to appropriate professional help.
  * **Rationale:** Medical safety requirement.
- **JARVIS-SAFE-003**
  - **Status:** Locked product requirement
  - **Requirement:** No automatic deletion of important records.
  * **Rationale:** Protects user data from AI mistakes.
- **JARVIS-SAFE-004**
  - **Status:** Locked product requirement
  - **Requirement:** No autonomous major program replacement.
  * **Rationale:** Ensures human-in-the-loop for major training shifts.
- **JARVIS-SAFE-005**
  - **Status:** Locked product requirement
  - **Requirement:** No autonomous major nutrition-target changes.
  * **Rationale:** Prevents unexpected calorie changes without user oversight.
- **JARVIS-SAFE-006**
  - **Status:** Locked product requirement
  - **Requirement:** No hidden writes.
  * **Rationale:** Total transparency into AI mutations.
- **JARVIS-SAFE-007**
  - **Status:** Locked product requirement
  - **Requirement:** Confirmation for destructive actions.
  * **Rationale:** Standard UX safety practice.
- **JARVIS-SAFE-008**
  - **Status:** Locked product requirement
  - **Requirement:** Undo for reversible writes.
  * **Rationale:** Mitigates the risk of hallucinated or misunderstood tool calls.
- **JARVIS-SAFE-009**
  - **Status:** Locked product requirement
  - **Requirement:** Clear disclosure when Jarvis is uncertain.
  * **Rationale:** Preserves trust by explicitly acknowledging capability limits.
- **JARVIS-SAFE-010**
  - **Status:** Locked product requirement
  - **Requirement:** Clear disclosure when required data is unavailable.
  * **Rationale:** Distinguishes between 'you didn't train' and 'I can't load the data'.
- **JARVIS-SAFE-011**
  - **Status:** Locked product requirement
  - **Requirement:** Safe handling of injury-related requests.
  * **Rationale:** Injury mitigation is prioritized over intensity.
- **JARVIS-SAFE-012**
  - **Status:** Locked product requirement
  - **Requirement:** FitCore limitations and user-entered restrictions must be respected.
  * **Rationale:** Hard boundaries override generative flexibility.
- **JARVIS-SAFE-013**
  - **Status:** Locked product requirement
  - **Requirement:** Model output must not override canonical FitCore validation.
  * **Rationale:** The underlying data layer remains the arbiter of state safety.
- **JARVIS-SAFE-014**
  - **Status:** Locked product requirement
  - **Requirement:** Unsafe or invalid tool requests must be rejected.
  * **Rationale:** Failsafes must exist in the API regardless of what the LLM generates.

## 16. Privacy and security requirements

This is an engineering requirements document, not the final legal privacy policy.

- **JARVIS-PRIV-001**
  - **Status:** Locked product requirement
  - **Requirement:** Raw audio is not stored by default.
  * **Rationale:** Fundamental privacy baseline.
- **JARVIS-PRIV-002**
  - **Status:** Locked product requirement
  - **Requirement:** Local transcripts remain local by default.
  * **Rationale:** Safeguards conversational history.
- **JARVIS-PRIV-003**
  - **Status:** Locked product requirement
  - **Requirement:** Long-term memory remains local by default.
  * **Rationale:** Ensures personalization doesn't leak.
- **JARVIS-PRIV-004**
  - **Status:** Locked product requirement
  - **Requirement:** The user can delete transcripts and memory.
  * **Rationale:** Complies with data ownership principles.
- **JARVIS-PRIV-005**
  - **Status:** Locked product requirement
  - **Requirement:** Sensitive fitness and health data must not be sent externally without explicit configuration and disclosure.
  * **Rationale:** Adheres to app-wide privacy tenets regarding external cloud APIs.
- **JARVIS-PRIV-006**
  - **Status:** Locked product requirement
  - **Requirement:** External providers must be optional.
  * **Rationale:** Local-first architecture cannot hard-depend on cloud endpoints.
- **JARVIS-PRIV-007**
  - **Status:** Locked product requirement
  - **Requirement:** Provider credentials must not be hard-coded.
  * **Rationale:** Standard security protocol.
- **JARVIS-PRIV-008**
  - **Status:** Locked product requirement
  - **Requirement:** Provider credentials must not be exposed to the frontend where avoidable.
  * **Rationale:** Minimizes credential leak risks.
- **JARVIS-PRIV-009**
  - **Status:** Locked product requirement
  - **Requirement:** Model files must come from documented sources.
  * **Rationale:** Ensures provenance of ML assets.
- **JARVIS-PRIV-010**
  - **Status:** Locked product requirement
  - **Requirement:** Model downloads must be integrity-checked.
  * **Rationale:** Prevents supply chain or man-in-the-middle attacks.
- **JARVIS-PRIV-011**
  - **Status:** Locked product requirement
  - **Requirement:** Logging must avoid sensitive data.
  * **Rationale:** Telemetry should not expose medical or health identifiers.
- **JARVIS-PRIV-012**
  - **Status:** Locked product requirement
  - **Requirement:** Crash diagnostics must minimize personal data.
  * **Rationale:** Respects privacy during troubleshooting.
- **JARVIS-PRIV-013**
  - **Status:** Locked product requirement
  - **Requirement:** Permissions must be least privilege.
  * **Rationale:** Containment strategy for AI autonomy.
- **JARVIS-PRIV-014**
  - **Status:** Locked product requirement
  - **Requirement:** Security-sensitive actions require confirmation.
  * **Rationale:** A human must authorize high-risk external actions.
- **JARVIS-PRIV-015**
  - **Status:** Locked product requirement
  - **Requirement:** Local data must not be silently used for model training by external providers.
  * **Rationale:** User consent must govern any external training ingestion.

## 17. Performance requirements

Numerical thresholds remain provisional until tested on regular iPhone 15 and iPhone 16. Later validation must test at least: short commands, long conversations, 30- to 60-minute workout sessions, interruptions, Bluetooth, noisy environments, low battery, thermal throttling, and application suspension and return.

- **JARVIS-PERF-001**
  - **Status:** Requires feasibility validation
  - **Requirement:** Define acceptable time to begin transcription.
  * **Rationale:** Low latency is vital for conversational fluidity.
- **JARVIS-PERF-002**
  - **Status:** Requires feasibility validation
  - **Requirement:** Define acceptable end-of-turn responsiveness.
  * **Rationale:** Awkward pauses degrade trust.
- **JARVIS-PERF-003**
  - **Status:** Requires feasibility validation
  - **Requirement:** Define acceptable time to first spoken response.
  * **Rationale:** Essential metric for voice UX feel.
- **JARVIS-PERF-004**
  - **Status:** Requires feasibility validation
  - **Requirement:** Define acceptable interruption responsiveness.
  * **Rationale:** Barge-in must be nearly instantaneous to feel natural.
- **JARVIS-PERF-005**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure fluid streaming response behavior.
  * **Rationale:** Masks generation latency.
- **JARVIS-PERF-006**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure acceptable model-loading time.
  * **Rationale:** Cold starts must not ruin the active workout experience.
- **JARVIS-PERF-007**
  - **Status:** Requires feasibility validation
  - **Requirement:** Maintain acceptable memory usage.
  * **Rationale:** Prevents iOS from killing the parent app or background audio.
- **JARVIS-PERF-008**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure safe thermal behavior over a sustained workout.
  * **Rationale:** Continuous local inference can overheat modern smartphones.
- **JARVIS-PERF-009**
  - **Status:** Requires feasibility validation
  - **Requirement:** Limit battery usage to an acceptable threshold.
  * **Rationale:** Workouts can last over an hour; AI must not drain the device entirely.
- **JARVIS-PERF-010**
  - **Status:** Requires feasibility validation
  - **Requirement:** Verify sustained normal-workout operation without degradation.
  * **Rationale:** Ensures stability across the full session duration.
- **JARVIS-PERF-011**
  - **Status:** Requires feasibility validation
  - **Requirement:** Verify Bluetooth operation latency.
  * **Rationale:** Wireless headsets introduce additional delay that must be managed.
- **JARVIS-PERF-012**
  - **Status:** Requires feasibility validation
  - **Requirement:** Verify noisy-gym recognition rates.
  * **Rationale:** Acoustic challenges are highest in the target environment.
- **JARVIS-PERF-013**
  - **Status:** Requires feasibility validation
  - **Requirement:** Validate practical local model download size constraints.
  * **Rationale:** On-device storage is finite; multi-gigabyte models cause adoption friction.
- **JARVIS-PERF-014**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure safe low-storage handling.
  * **Rationale:** Prevents crashes when the device runs out of disk space during download.
- **JARVIS-PERF-015**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure safe fallback behavior under memory pressure.
  * **Rationale:** Recovers gracefully if OS jetsam intervenes.
- **JARVIS-PERF-016**
  - **Status:** Requires feasibility validation
  - **Requirement:** Ensure safe fallback behavior under thermal pressure.
  * **Rationale:** Disables local heavy inference if the phone is overheating, falling back to deterministic processing.

## 18. Reliability requirements

- **JARVIS-RELIABILITY-001**
  - **Status:** Locked product requirement
  - **Requirement:** No duplicate set logging under any circumstance.
  * **Rationale:** The most critical data integrity guarantee in active workouts.
- **JARVIS-RELIABILITY-002**
  - **Status:** Locked product requirement
  - **Requirement:** No stale tool execution.
  * **Rationale:** Context drift must invalidate pending operations.
- **JARVIS-RELIABILITY-003**
  - **Status:** Locked product requirement
  - **Requirement:** No silent failure; errors must be communicated.
  * **Rationale:** User must be aware if a command dropped.
- **JARVIS-RELIABILITY-004**
  - **Status:** Locked product requirement
  - **Requirement:** No data corruption after a Jarvis crash.
  * **Rationale:** Core state stability.
- **JARVIS-RELIABILITY-005**
  - **Status:** Locked product requirement
  - **Requirement:** Safe application suspension and resume.
  * **Rationale:** Workouts frequently span background/foreground lifecycles.
- **JARVIS-RELIABILITY-006**
  - **Status:** Locked product requirement
  - **Requirement:** Safe recovery after model failure.
  * **Rationale:** App must gracefully restart the inference engine if it crashes.
- **JARVIS-RELIABILITY-007**
  - **Status:** Locked product requirement
  - **Requirement:** Safe recovery after interrupted model download.
  * **Rationale:** Mobile networks are unstable; resumable downloads are required.
- **JARVIS-RELIABILITY-008**
  - **Status:** Locked product requirement
  - **Requirement:** Visible model status in the UI.
  * **Rationale:** User needs to know if the brain is loading, ready, or failed.
- **JARVIS-RELIABILITY-009**
  - **Status:** Locked product requirement
  - **Requirement:** Visible offline status in the UI.
  * **Rationale:** Manages expectations about cloud-dependent features.
- **JARVIS-RELIABILITY-010**
  - **Status:** Locked product requirement
  - **Requirement:** Visible microphone state.
  * **Rationale:** Essential privacy and status feedback.
- **JARVIS-RELIABILITY-011**
  - **Status:** Locked product requirement
  - **Requirement:** Visible processing state.
  * **Rationale:** Reassures the user that their request is being handled.
- **JARVIS-RELIABILITY-012**
  - **Status:** Locked product requirement
  - **Requirement:** Support cancellation of current generation.
  * **Rationale:** Frees resources actively.
- **JARVIS-RELIABILITY-013**
  - **Status:** Locked product requirement
  - **Requirement:** Utilize deterministic fallback for essential commands when inference is unavailable.
  * **Rationale:** Guarantees core workout operability.
- **JARVIS-RELIABILITY-014**
  - **Status:** Locked product requirement
  - **Requirement:** Fallback gracefully to system-voice.
  * **Rationale:** Prevents total silence if neural TTS fails.
- **JARVIS-RELIABILITY-015**
  - **Status:** Locked product requirement
  - **Requirement:** Implement model availability checks before attempting execution.
  * **Rationale:** Fail-fast architecture.
- **JARVIS-RELIABILITY-016**
  - **Status:** Locked product requirement
  - **Requirement:** Provide structured error responses.
  * **Rationale:** Allows UI to gracefully display what went wrong.
- **JARVIS-RELIABILITY-017**
  - **Status:** Locked product requirement
  - **Requirement:** Retain active workout state securely when Jarvis fails.
  * **Rationale:** The main app must not crash due to an AI component failure.

## 19. Accessibility requirements

- **JARVIS-ACCESS-001**
  - **Status:** Locked product requirement
  - **Requirement:** All core Jarvis actions must be usable by text input.
  * **Rationale:** Supports non-verbal environments and users with speech disabilities.
- **JARVIS-ACCESS-002**
  - **Status:** Locked product requirement
  - **Requirement:** The transcript must be visible and legible.
  * **Rationale:** Confirms system understanding.
- **JARVIS-ACCESS-003**
  - **Status:** Locked product requirement
  - **Requirement:** Spoken responses require accurate captions.
  * **Rationale:** Accessible for hearing-impaired users and loud gyms.
- **JARVIS-ACCESS-004**
  - **Status:** Locked product requirement
  - **Requirement:** UI controls must be VoiceOver-compatible.
  * **Rationale:** Standard iOS accessibility requirement.
- **JARVIS-ACCESS-005**
  - **Status:** Locked product requirement
  - **Requirement:** The microphone button must have accessible labels and traits.
  * **Rationale:** Proper integration with screen readers.
- **JARVIS-ACCESS-006**
  - **Status:** Locked product requirement
  - **Requirement:** The stop button must be easily discoverable and accessible.
  * **Rationale:** User must be able to end actions easily.
- **JARVIS-ACCESS-007**
  - **Status:** Locked product requirement
  - **Requirement:** Confirmation dialogs must explicitly announce their risk level.
  * **Rationale:** Crucial for users relying on audio context.
- **JARVIS-ACCESS-008**
  - **Status:** Locked product requirement
  - **Requirement:** UI states must not rely on color alone.
  * **Rationale:** Accommodates color vision deficiencies.
- **JARVIS-ACCESS-009**
  - **Status:** Locked product requirement
  - **Requirement:** Speech rate must be adjustable where supported.
  * **Rationale:** Individual cognitive and auditory preferences.
- **JARVIS-ACCESS-010**
  - **Status:** Locked product requirement
  - **Requirement:** The user must have the ability to disable speech entirely.
  * **Rationale:** Prevents unwanted audio disruption.
- **JARVIS-ACCESS-011**
  - **Status:** Provisional requirement
  - **Requirement:** Support adjustable response length.
  * **Rationale:** Cognitive load management.
- **JARVIS-ACCESS-012**
  - **Status:** Locked product requirement
  - **Requirement:** Error descriptions must be clear and actionable.
  * **Rationale:** Good UX practice.
- **JARVIS-ACCESS-013**
  - **Status:** Locked product requirement
  - **Requirement:** Touch targets must be sufficiently large (minimum 44x44pt).
  * **Rationale:** HIG compliance for usable interfaces during exercise.
- **JARVIS-ACCESS-014**
  - **Status:** Locked product requirement
  - **Requirement:** Support reduced-motion preferences where applicable.
  * **Rationale:** Prevents motion sickness from UI animations.

## 20. Initial non-goals

The following are clearly outside the first implementation scope unless separately approved:

- replacing Siri;
- permanent background wake-word listening;
- always listening while FitCore is closed;
- unrestricted web research;
- current-news answering;
- medical diagnosis;
- autonomous destructive actions;
- requiring a computer;
- requiring a cloud server;
- requiring ChatGPT Plus;
- requiring a paid API;
- Android support;
- support for all historical iPhones;
- multiple large local models;
- automatic meal-photo analysis;
- system-wide control of other applications;
- general-purpose coding assistance;
- unrestricted access to the phone’s files or messages.

## 21. Assumptions requiring validation

These items are not proven and must be verified later:

- local speech recognition accuracy in a gym;
- conversational quality of the selected local model;
- fluid interruption on both phones;
- Bluetooth routing;
- model concurrency;
- memory consumption;
- model download size;
- storage requirements;
- sustained thermal performance;
- battery impact;
- response latency;
- existing FitCore frontend compatibility with a native wrapper;
- background and foreground lifecycle behavior;
- native bridge reliability;
- local memory retrieval quality;
- long-conversation summarization quality.

## 22. Success criteria

- user can complete common workout logging by voice;
- user can hold a cohesive multi-turn FitCore conversation;
- Jarvis understands active screen and workout context;
- Jarvis retrieves verified FitCore data;
- Jarvis explains canonical metrics accurately;
- Jarvis executes approved actions safely;
- interrupted turns do not execute stale actions;
- reversible actions support Undo;
- destructive actions require confirmation;
- regular iPhone 15 completes a normal workout session without failure;
- iPhone 16 also supports the same core experience;
- essential workout commands work offline;
- no mandatory AI subscription exists;
- memory is inspectable and deletable;
- Jarvis remains subordinate to FitCore business logic.

## 23. Requirement traceability guidance

Later architecture, tool-contract, test, implementation, privacy, memory, audio, model, and validation documents should reference these identifiers. A full cross-document matrix is not provided here because the other documents do not yet exist and are being produced concurrently.

## 24. Open questions

These are intentionally delegated to later architecture and feasibility review:

- final local speech-recognition engine;
- final local language model;
- final local text-to-speech engine;
- native application packaging approach;
- exact model download strategy;
- exact storage format;
- final performance thresholds;
- optional iPhone 16 enhancement strategy;
- final long-term-memory retrieval design.
