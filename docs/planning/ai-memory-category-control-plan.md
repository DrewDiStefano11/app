# AI Memory Category Control Plan

## Purpose
This document defines the controls, categories, and boundaries for AI (Jarvis) memory within the FitCore ecosystem. It outlines what the AI can remember, what it must forget, and how users control their data. Note: This is a planning document only; these systems are not yet implemented.

## AI Memory Categories
The following data categories are subject to AI memory tracking:
- Training
- Nutrition
- Recovery
- Sleep
- Bodyweight
- Measurements
- Injuries
- Pain/soreness
- Medical profile
- Medications
- Allergies
- Surgeries
- Genetics
- Photos
- Conversations
- Goals/preferences
- Coach/business/gym context

## User-Facing Toggles By Category
Users must have granular control over what AI remembers. Toggles should group related categories:
- **Core Tracking:** Training, Nutrition, Bodyweight, Measurements.
- **Recovery & Wellness:** Recovery, Sleep, Pain/soreness, Injuries.
- **Sensitive Health:** Medical profile, Medications, Allergies, Surgeries, Genetics.
- **Media & Context:** Photos, Conversations, Goals/preferences, Coach/business/gym context.

## Categories That Should Default Off or Require Explicit Approval
Highly sensitive categories must default to OFF and require explicit, informed consent before AI processing:
- Injuries
- Medical profile
- Medications
- Allergies
- Surgeries
- Genetics
- Photos

## What AI May Remember
- Explicitly logged activities (workouts, meals).
- Confirmed user preferences and goals.
- Historical trends required for generating the FitCore Score (if permitted by toggles).
- Contextual information derived from conversations that falls within allowed categories.

## What AI May Not Remember
- Any data category where the user-facing toggle is disabled.
- Diagnoses, medical advice, or specific health conditions not explicitly provided by the user as background.
- Transitory system errors or unconfirmed, low-confidence estimates unless upgraded by the user.

## How User Deletion Should Affect AI Memory
- Deletion of a specific log (e.g., a meal or workout) must cascade and remove that context from AI memory.
- Clearing a category toggle must purge all historical AI context related to that category.
- Full account deletion must result in a complete wipe of all AI memory state.

## How "Why Do You Know This?" Should Work
- Every AI insight or memory recall must be explainable.
- Users should be able to query the source of an AI statement (e.g., "Based on your logged meal from Tuesday").
- The system must link insights back to specific data provenance badges (Manual, Verified, Jarvis, Camera, Imported, Sensor).

## Source Display Requirements
- AI-generated insights must clearly display the source data used.
- Confidence levels must be visually indicated (especially for low-confidence estimates).

## Safety Boundaries
- AI must act as a support layer/coach, never a medical professional.
- AI must not attempt to diagnose injuries, illnesses, or sleep disorders.
- Explicit user review is required before logging or altering critical data based on AI suggestions.

## Future Implementation Checklist
- [ ] Define AI memory schema mapped to categories.
- [ ] Build user-facing toggles for AI memory control.
- [ ] Implement explicit consent flows for sensitive categories.
- [ ] Develop the "Why do you know this?" traceability engine.
- [ ] Integrate deletion cascading from user actions to AI memory.
- [ ] Apply safety boundary filters to AI outputs.

## Final Category-Control Matrix

| Category | Default State | AI Access | Deletion Behavior |
|---|---|---|---|
| Training | ON | Allowed | Cascade Delete |
| Nutrition | ON | Allowed | Cascade Delete |
| Recovery | ON | Allowed | Cascade Delete |
| Sleep | ON | Allowed | Cascade Delete |
| Bodyweight | ON | Allowed | Cascade Delete |
| Measurements | ON | Allowed | Cascade Delete |
| Injuries | OFF | Requires Consent | Cascade Delete |
| Pain/soreness | ON | Allowed | Cascade Delete |
| Medical profile | OFF | Requires Consent | Cascade Delete |
| Medications | OFF | Requires Consent | Cascade Delete |
| Allergies | OFF | Requires Consent | Cascade Delete |
| Surgeries | OFF | Requires Consent | Cascade Delete |
| Genetics | OFF | Requires Consent | Cascade Delete |
| Photos | OFF | Requires Consent | Cascade Delete |
| Conversations | ON | Allowed | Cascade Delete |
| Goals/preferences | ON | Allowed | Cascade Delete |
| Coach/gym context | ON | Allowed | Cascade Delete |
