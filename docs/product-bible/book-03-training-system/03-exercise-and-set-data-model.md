# Exercise And Set Data Model

## Purpose

FitCore must preserve enough structured training data to support workout history, progress charts, progression logic, AI recommendations, muscle volume tracking, pain/injury awareness, substitutions, user corrections, and future analytics.

This file defines product-level data requirements. It does not define final database schemas, migrations, production APIs, or storage tables.

## Exercise Entity Concept

An exercise should generally know:

- Name.
- Aliases.
- Category.
- Primary muscles.
- Secondary muscles.
- Movement pattern.
- Equipment.
- Unilateral/bilateral possibility.
- Bodyweight/loaded/machine/free weight type.
- Progression style.
- Safety considerations.
- Common substitutions.
- User-specific notes.
- User-specific preferences.
- Injury limitations if applicable.

Status: Planned.

## Exercise Library Principles

- Exercise names should be consistent.
- Aliases should avoid duplicate history.
- User-created exercises should be supported eventually.
- Exercise substitutions should be connected intelligently.
- Exercise history should not split just because of naming differences.
- Similar exercises can be related without pretending they are identical.

Examples:

- "DB Bench Press" and "Dumbbell Bench Press" should likely connect.
- "Barbell Back Squat" and "Leg Press" are related lower-body movements but not identical.
- "Single-arm cable row" may need side-specific tracking.

Status: Planned.

## Set-Level Data

Set-level data should preserve:

- Exercise.
- Set number.
- Planned vs actual status.
- Weight.
- Reps.
- RPE.
- RIR.
- Set type.
- Warmup/drop/failure/partials/unilateral flags.
- Side-specific values if needed.
- Completed status.
- Skipped status.
- Rest time if available.
- Pain flag.
- Note.
- AI-suggested or user-entered source.
- Edited/corrected status.
- Timestamp/order within workout.

Status: Partial. Future implementation must verify current runtime data structures before marking any specific field as `Implemented`.

## Set Types And Modifiers

FitCore should clearly represent these set types or modifiers:

- Warmup.
- Working.
- Drop.
- Backoff.
- Failure.
- Partials.
- Unilateral.
- AMRAP.
- Tempo.
- Paused.
- Assisted.
- Machine-assisted.
- Bodyweight.
- Rehab/prehab.

Some of these are true set types and some may be modifiers. Book 3 does not force a final implementation shape. It requires that future systems represent them clearly enough for logging, analytics, progression, and AI interpretation.

Status: Planned.

## Planned Set Vs Logged Set

A planned set is what the workout expected. A logged set is what the user actually did.

Both matter:

- A user changing weight/reps should not erase the original plan.
- A skipped planned set should remain visible as skipped, not vanish.
- An added logged set should be preserved as extra work.
- The AI should use planned vs actual differences to understand fatigue, progress, or plan quality.

Status: Planned.

## Side-Specific And Unilateral Data

Some exercises require left/right tracking. Users should not be forced into side-specific logging for every exercise.

Unilateral exercises should support:

- Same weight/reps both sides.
- Different reps per side.
- Different weight per side if needed.
- Side-specific pain notes.
- Side-specific weakness notes.

Side-specific data should be useful for imbalance tracking later.

Status: Planned.

## Pain And Discomfort Data

Pain should be structured when possible while preserving free text.

Useful fields may include:

- Location.
- Side.
- Severity.
- Type.
- Exercise/set where it occurred.
- Whether it stopped the workout.
- Whether it changed exercise selection.
- Whether it was soreness vs sharp pain vs discomfort.

Pain data should affect safety and recommendations.

Status: Planned.

## Workout Session Data

A workout session should preserve:

- Start time.
- End time.
- Duration.
- Workout name.
- Plan/template source.
- Exercises planned.
- Exercises completed.
- Skipped exercises.
- Substitutions.
- Set data.
- Notes.
- Pain/fatigue/soreness flags.
- User final reflection.
- AI summary.
- Readiness/recovery impact.
- Template save decision.

Status: Planned.

## Data Transfer Rule

No training data should be trapped in one screen.

Training data should flow into:

- Workout history.
- Exercise history.
- Progress charts.
- Muscle volume.
- Readiness.
- Recovery.
- AI recommendations.
- Future workout planning.
- Injury/safety logic.
- Daily summary.
- Weekly review.

Status: Planned.

## Data Quality And Corrections

FitCore should let the user edit training data. Edits should preserve a correction trail when important.

Rules:

- AI-assisted entries should be labeled.
- Suspected mistakes should be reviewable, not silently fixed.
- Unrealistic entries may be flagged gently.
- Corrections should improve future suggestions.
- User corrections should follow Book 2 provenance and memory principles.

Examples:

- User accidentally logs 500 lb curls.
- User changes reps after finishing.
- User marks a set as warmup after workout.
- User corrects an AI-assisted voice log.

Status: Planned.

## Exercise/Set Data Acceptance Criteria

- Docs define exercise identity requirements.
- Docs define set-level logging requirements.
- Docs distinguish planned and actual data.
- Docs preserve set modifiers.
- Docs explain unilateral support.
- Docs route pain data to safety/recovery.
- Docs require training data to flow across analytics and AI.
