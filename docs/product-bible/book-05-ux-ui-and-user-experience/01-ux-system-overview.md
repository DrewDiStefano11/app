# UX System Overview

## Purpose

FitCore should feel like a fast, mobile-first health operating system that makes logging easy, shows the right context at the right time, avoids clutter, explains scores and recommendations, and keeps the user in control.

Book 5 treats UX as a product system, not decoration. The interface should help users understand their training, nutrition, recovery, progress, and AI guidance without making them hunt through disconnected screens.

## Core UX Principles

| Principle | Requirement |
| :-------- | :---------- |
| Mobile-first | Primary workflows should work well on a phone during workouts, meal logging, check-ins, weigh-ins, and quick AI interactions. |
| Low friction | Common logging and review actions should take the fewest reasonable steps. |
| Popup-first where appropriate | Quick actions and detail inspection should often open popups or sheets instead of forcing full-page navigation. |
| No unnecessary full-page jumps | The user should stay in context unless the task genuinely needs a dedicated page. |
| Obvious current action | The interface should make it clear what the user is doing now and what can happen next. |
| Glanceable data | Important status, trend, and risk information should be readable quickly. |
| Detail one tap away | Cards and graphs should expose deeper detail without trapping information on one screen. |
| Explainable AI | AI should explain without overwhelming, and should expose source/confidence when useful. |
| Easy corrections | User corrections should be easy to make and should override AI estimates where appropriate. |
| Visible control | Settings, privacy, notifications, memory, and correction controls should be discoverable. |
| Protected sensitive data | Sensitive health, photo, medical, and memory surfaces should feel deliberate and safe. |
| Useful charts | Charts should support interpretation and action, not decoration. |
| Portable context | No data should feel trapped on one screen. Relevant summaries should connect to deeper history and explanations. |

## Glance, Expand, Act, Explain

FitCore should use a repeated `glance -> expand -> act -> explain` model.

| Step | UX Meaning | Examples |
| :--- | :--------- | :------- |
| Glance | The user sees summary state quickly. | FitCore Score, today's calories, training readiness, body-weight trend, active workout state. |
| Expand | The user taps a card, graph, or sheet for detail. | Score factors, graph detail, meal breakdown, soreness context, workout history. |
| Act | The user logs, edits, confirms, dismisses, or asks AI. | Log Meal, Check In, Weigh In, Start Workout, correct an estimate, reject a suggestion. |
| Explain | The app shows why something changed. | Score reason, recommendation sources, confidence, stale data warning, trend interpretation. |

This model should keep the interface calm: summaries first, detail on demand, action nearby, and explanation available when trust matters.

## Anti-Patterns

Avoid UX patterns that make FitCore feel cluttered, opaque, or fragile:

- Too many full-page transitions for quick actions.
- Popups that are transparent or hard to read.
- Graphs that cannot be inspected.
- Scores without explanation.
- Buttons that look clickable but do nothing.
- Repeated data entry.
- Hidden settings.
- AI recommendations without source or context.
- Crowded workout or dashboard screens.
- Important alerts buried below cosmetic content.

## Status Notes

Unless the repository clearly proves a behavior exists, Book 5 should describe it as `Planned`, `Partial`, `Future`, `Needs Decision`, or `Open Question` instead of `Implemented`.
