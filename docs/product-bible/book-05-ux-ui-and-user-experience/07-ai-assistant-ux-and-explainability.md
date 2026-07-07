# AI Assistant UX and Explainability

## AI Assistant UX Purpose

The FitCore assistant should help the user understand, log, decide, and adjust without taking control away from them.

The assistant should feel practical, transparent, and interruptible. It should support the user's goals while making uncertainty, source context, safety cautions, and user control visible.

## Assistant Entry Points

Expected assistant entry points include:

- Floating assistant button.
- Dashboard insight card.
- Score explanation.
- Graph explanation.
- Workout recommendation.
- Nutrition recommendation.
- Recovery/readiness explanation.
- Correction/help prompt.

Assistant entry points should be contextual. A graph explanation should know which graph is being inspected. A score explanation should know the score factors. A correction prompt should know the value being corrected.

## Assistant Modes

| Mode | Behavior |
| :--- | :------- |
| Quick Answer | Short, direct, practical response for fast logging, quick checks, and immediate decisions. |
| Detailed Coach | More explanation, reasoning, context, tradeoffs, source categories, and next-step guidance. |

Users should be able to move from a quick answer to more detail without losing context.

## Explainability Rules

AI should:

- Show why it made a recommendation.
- Reference source categories when useful, such as workout history, meal logs, sleep, soreness, body-weight trend, user notes, or goals.
- Communicate uncertainty.
- Avoid overstating confidence when data is missing, estimated, stale, or user-corrected.
- Distinguish between suggestion, warning, and medical/safety caution.
- Explain recommendation changes when new data changes the answer.
- Make source/confidence visible without overcrowding the primary response.

## AI Logging UX

AI-assisted logging should preserve trust:

- AI-created entries should be reviewable.
- AI-estimated entries should show confidence/source.
- User confirmations should be preserved.
- User corrections should override estimates.
- AI should not silently change important data.
- Clarifying questions should be used when uncertainty would materially affect the entry.
- Confirmed, estimated, corrected, and rejected values should remain distinguishable where relevant.

## AI Safety UX

The assistant should support health and fitness decisions without pretending to diagnose or override professional care.

- Medical or injury concerns should route to caution and professional-care language when appropriate.
- AI should not diagnose.
- AI should not pressure the user into unsafe training, dieting, fasting, or ignoring pain.
- Safety cautions should be visible but not alarmist.
- High-risk recommendations should explain limits and encourage appropriate professional support.

## Why Do You Know This?

FitCore should support a `why do you know this?` behavior when recommendations depend on personal context.

The interface should:

- Provide source/context explanation without overcrowding.
- Let the user inspect what data influenced a recommendation.
- Respect Book 2 privacy and memory rules for sensitive data use.
- Make memory-derived context understandable.
- Avoid revealing sensitive details in places where they may surprise the user.

## Cross-Book Boundaries

Book 5 owns assistant UX, entry points, answer modes, explainability UI, and AI logging interaction patterns. Book 2 owns AI memory, privacy, provenance, and data-use rules. Book 3 owns training recommendation logic. Book 4 owns nutrition recommendation logic.
