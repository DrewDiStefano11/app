# Active Workout Implementation Readiness Checklist

## Purpose
This document provides a readiness checklist for the implementation of the active workout feature. It outlines the specific UI, behavior, and logic requirements before coding begins. **Note: This is a docs-only planning file. No runtime app code is being modified. Features described here are planned, not necessarily implemented.**

## Scope
The scope encompasses the active workout experience including exercise cards, set-level flags, notes propagation, AI integration, safety checks, and template saving. It does not cover long-term historical analytics, which belongs to the analytics domain.

## Product Bible Sources Checked
* Book 3 (Training)
* Book 5 (UX/UI)
* Book 9 (Analytics, Insights, and the Health Twin)
* Book 10 (Testing/QA/Platform Engineering) if merged/existing.
* (Book 6 is reserved/future-domain and is not included).

## Required Current Behavior Audits Before Implementation
* Active Workout State Machine Audit (must review state ownership, transition rules, and persistence).
* Current UI Behavior Audit (must review app loading, popups, and feature UIs during active workout).
* AI Provenance and Confidence Audit (must review AI logging and explainability).

## Required Data Model Questions
* How does the active workout state interact with `useStore().state` vs `useStore().view`?
* What fields are required in the workout session schema to capture set-level flags (e.g., partials, warmup)?
* Are there pending migrations needed for workout notes and safety checks?

## Required UI Behavior
* Detail panels and sheets must use the centralized `BottomSheet` component and dynamic viewport height (`dvh`) units.
* Detail sheets use `bg-black/85` for backdrop opacity and `backdrop-blur-md` to improve readability.
* Modals must trap focus and prevent background scrolling.

## Expandable Exercise Card Requirements
* Exercise cards must be expandable to reveal set data, history, and active inputs.
* Tapping the header or a designated expand icon toggles the visibility.

## Current Exercise Stays Open Requirement
* The currently active exercise card must automatically remain open to minimize user friction during a workout.

## Completed Exercise Closes and Shows Stats Requirement
* When all sets in an exercise are completed, the card should auto-close.
* A summary of the stats (e.g., total volume, max weight, PRs hit) should be visible on the closed card.

## Previous Performance Grayed Into Current Exercise Requirement
* To guide the user, previous performance data (sets, reps, weight) should be displayed in a muted/grayed-out style within the input fields or alongside them in the current exercise view.

## Set-level and Exercise-level Flag Behavior
* **drop**: Indicates a drop set; weight is lowered immediately after failure on a previous set.
* **warmup**: Indicates a warmup set; excluded from primary volume/1RM calculations.
* **unilateral**: Indicates the exercise is performed one side at a time; volume calculations must account for this.
* **failure**: Indicates the set was taken to muscular failure.
* **partials**: Indicates partial reps were performed after failure or at the end of the set.

## Optional Notes in Finish Workout Summary
* Users can add optional unstructured notes upon finishing the workout.
* The finish workout summary should prompt for perceived exertion, fatigue, or other subjective signals.

## Notes Propagation to AI and Tracked Metrics
* If notes include keywords or natural language indicating pain, tiredness, soreness, or other tracked signals, this data must be parsed and propagated to the AI context and Recovery Insights.
* It must trigger safety rules if pain or injury is mentioned.

## Small Plate Calculator Requirement
* The UI should provide a quick "plate calculator" utility for barbell exercises.
* This feature must calculate the exact plates needed per side based on the target weight and bar weight.

## Smart Exercise Behavior
* "Smart" exercises dynamically adjust recommended weight/reps based on previous performance and user feedback.
* Clear visual distinction is needed when an exercise recommendation is AI-generated vs. user-scheduled.

## Workout Safety Checks
* If excessive volume or unexpected 1RM jumps are detected, prompt a warning.
* Pain or injury mentions must halt aggressive progression recommendations.

## Save Workout Template Option
* Upon completion, the user should have the option to save the completed session as a reusable workout template.

## Dashboard/Graph Propagation
* Completed workouts must propagate data to dashboard summaries, weekly volume graphs, and muscle heatmap calculations.
* Invalidation of derived calculations (e.g., FitCore Score) must be triggered upon save.

## AI/Jarvis Logging Expectations
* Jarvis must clearly separate user-confirmed logs from AI suggestions.
* Any AI-generated recommendations during the workout must be accompanied by source explanations and confidence scores.
* High confidence (user verified/manual) vs. Low confidence (AI guessed from vague input).

## Acceptance Checklist
- [ ] Expandable exercise cards toggle correctly.
- [ ] Active exercise auto-expands.
- [ ] Completed exercises auto-close and display a summary.
- [ ] Previous performance is visible as a muted placeholder/guide.
- [ ] All set-level flags (drop, warmup, unilateral, failure, partials) can be selected and unselected.
- [ ] Finish workout notes are correctly parsed for tracked signals (pain, fatigue).
- [ ] Small plate calculator calculates exact plates accurately.
- [ ] Smart exercises visually indicate AI origin and update based on history.
- [ ] Safety warnings trigger on anomalous weight/volume or injury mentions.
- [ ] Workout can be saved as a template upon completion.
- [ ] Data propagates correctly to the dashboard and graphs without page reload.
- [ ] AI logging strictly follows confidence and source explainability rules.

## Unsafe Implementation Shortcuts
* Bypassing the active workout state machine and mutating the global store directly.
* Storing set-level flags as unstructured text instead of structured enum/boolean fields.
* Omitting UI components from `BottomSheet` and hardcoding fixed heights.
* Implementing the plate calculator with hardcoded logic instead of configurable plate inventories.

## Suggested Future PR Breakdown
1. **Docs/Schema:** State machine updates and data model changes.
2. **UI Component:** Implement expandable exercise cards, plate calculator, and flag selectors.
3. **Logic:** Implement "Smart" exercise behavior, safety checks, and AI notes parsing.
4. **Integration:** Dashboard and graph propagation on workout completion.

## Final Readiness Matrix
| Component | Status | Notes |
| :--- | :--- | :--- |
| UI/UX Guidelines | Ready | Detail sheets must use dynamic viewport height |
| Data Model | Pending | Verification of set-level flag schema |
| State Machine | Needs Review | Ensure no parallel mutations with Jarvis |
| AI Integration | Ready | Strict provenance tracking required |
