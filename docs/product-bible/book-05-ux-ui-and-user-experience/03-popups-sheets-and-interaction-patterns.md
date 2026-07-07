# Popups, Sheets, and Interaction Patterns

## Purpose

Popups and sheets should let the user complete quick actions, inspect details, edit data, or ask for explanations without losing context.

FitCore should use overlays to preserve continuity when the user's task is short, focused, or tied to a dashboard card, graph, score, workout, meal, check-in, or AI explanation.

## When To Use a Popup or Sheet

| Use Case | Expected Pattern |
| :------- | :--------------- |
| Quick logging | Open a focused sheet with the minimum required fields and clear save/cancel behavior. |
| Graph detail | Open a larger graph popup or sheet with readable labels, mode toggles, and interpretation. |
| Card explanation | Open a concise explanation popup tied to the source card. |
| FitCore Score explanation | Open a factor breakdown with source/confidence and missing-data context. |
| Meal logging | Open a meal logging sheet for quick add, search, saved meals, or AI-assisted entry. |
| Check-in | Open a check-in sheet with soreness, readiness, mood, sleep, or notes as appropriate. |
| Weigh-in | Open a weigh-in sheet with date, value, source, and optional note. |
| Exercise/set editing | Use inline expansion for simple changes and a sheet for deeper editing. |
| Note entry | Open a small sheet or popup with save feedback. |
| Confirmation/correction flows | Use a clear confirmation or correction sheet that shows the current value and proposed change. |
| AI explanation | Open a readable explanation surface that can show why, source categories, uncertainty, and next action. |

## When a Full Page May Be Better

Use a full page when the workflow needs sustained attention, complex navigation, or privacy-sensitive deliberation:

- Complex settings.
- Long-form history review.
- Detailed analytics.
- Onboarding sequences.
- Privacy, data export, or deletion workflows.

Full pages should still preserve orientation and provide predictable back behavior.

## Visual Requirements

| Requirement | Standard |
| :---------- | :------- |
| Readability | Popups and sheets should be readable in normal app contexts. |
| Opaque enough | Overlays should not be semi-transparent in a way that makes content behind them interfere. |
| Safe areas | Sheets should respect mobile safe areas. |
| Bottom nav | Sheets should not be hidden behind bottom navigation. |
| Scrolling | Long content should scroll inside the sheet without losing primary actions. |
| Close affordance | Every popup or sheet should have a clear close or cancel affordance. |
| Escape routes | Overlays should not trap users. |
| Hierarchy | Primary, secondary, and destructive actions should be visually distinct. |

## Interaction Rules

- Buttons should provide visible feedback.
- Destructive actions need confirmation.
- Edits should show what changed.
- AI-estimated or uncertain values should be visibly marked.
- Corrections should be easy to make.
- Popup state should preserve user selections when useful.
- Loading, empty, error, and saved states should be explicit.
- A closed popup should return the user to the same underlying screen state.
- A failed save should preserve user input and explain the error.
- A successful quick action should show confirmation without unnecessary navigation.

## Examples

| Example | Expected Behavior |
| :------ | :---------------- |
| Log Meal | Opens a meal logging sheet. |
| Check In | Opens a check-in sheet. |
| Weigh In | Opens a weigh-in sheet. |
| FitCore Score | Opens an explanation popup with factors, source/confidence, and missing-data notes. |
| Graph card | Opens a larger graph popup with toggles and readable detail. |
| Active workout exercise cards | May expand inline for quick set review while deeper editing happens in a sheet. |

## Status Notes

This file defines planned UX standards. Do not treat an interaction pattern as `Implemented` unless runtime source and behavior clearly prove it.
