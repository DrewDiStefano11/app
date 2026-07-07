# Navigation and Screen Hierarchy

## Primary Navigation Model

FitCore should support section-based navigation across the major user domains:

| Section | Purpose |
| :------ | :------ |
| Home / Dashboard | Summarizes current state, quick actions, key trends, alerts, and AI insights. |
| Training | Supports workout planning, active workout logging, exercise history, progression, and training safety. |
| Nutrition | Supports meal logging, macro targets, saved foods/meals, body-weight context, and nutrition trends. |
| Recovery | Supports sleep, readiness, soreness, pain, check-ins, and recovery context. |
| Progress / Analytics | Supports graphs, trends, score explanations, long-term analytics, and comparisons. |
| AI Assistant | Supports quick questions, coaching explanations, logging help, and recommendation review. |
| Hub / Settings | Supports profile, settings, integrations, privacy, AI memory, notifications, export, and deletion controls. |

The user should always know where they are, what section they are in, and how to return to the prior context.

## Bottom Navigation

Bottom navigation is the expected mobile baseline for primary sections.

| Requirement | Standard |
| :---------- | :------- |
| Persistence | Bottom navigation should be persistent on mobile where it supports orientation and common movement. |
| Safe areas | Navigation should respect device safe areas. |
| Content spacing | Navigation should not cover content, key actions, graph controls, or sheet actions. |
| Popup coordination | Navigation should not conflict with popups or sheets. Sheets should either sit above it intentionally or temporarily take over the interaction layer. |
| Priority | Bottom navigation should prioritize the most common actions and sections. |

If the number of primary destinations exceeds comfortable mobile capacity, FitCore should use a Hub / Settings area or contextual tabs rather than crowding the bottom bar.

## Section-Specific Tabs

Sections may use local tabs when the section has multiple repeated subareas.

| Section | Local Tab Expectations |
| :------ | :--------------------- |
| Training | Should expose workout-related subareas such as active workout, plan, history, exercises, progression, and recovery-aware guidance. |
| Nutrition | Should expose meal logging, targets, saved foods/meals, macro trends, body-weight context, and food AI review where relevant. |
| Recovery | Should expose sleep, readiness, soreness, pain, check-ins, and recovery trends. |
| Progress | Should expose graphs, trends, score explanations, long-term analytics, and comparison views. |

Tabs should not become a dumping ground. If a workflow is complex, a dedicated detail page may be clearer.

## Quick Actions

Quick actions belong on the dashboard, relevant section overviews, and assistant-supported contexts.

Expected quick actions include:

- Log Meal.
- Check In.
- Weigh In.
- Start Workout.
- Ask FitCore.

Quick actions should generally open popups or sheets rather than forcing page navigation. A quick log should not take the user away from their current workflow unless the task requires a dedicated page.

## Screen Hierarchy

FitCore should use a predictable hierarchy:

| Level | Role |
| :---- | :--- |
| Dashboard summary | Shows current state, most important trends, alerts, and quick actions. |
| Section overview | Shows domain-specific state and common tasks. |
| Card detail | Expands one concept, metric, graph, score, or recommendation. |
| Popup/sheet interaction | Lets the user log, inspect, edit, confirm, correct, or ask AI without losing context. |
| Deep settings/detail page | Used only when the workflow needs more space, long history, privacy controls, export/deletion, or complex settings. |

## Navigation Confusion Rules

- The user should always know where they are.
- Back behavior should be predictable.
- Closing a popup should return the user to the same screen state.
- Switching graph modes inside a popup should preserve the selected mode when returning to the dashboard card, when appropriate.
- A quick log should not take the user away from their current workflow unless required.
- A sheet opened from a card should close back to that card's source context.
- A correction flow should show what changed and where the corrected value now appears.

## Cross-Book Boundaries

Book 5 owns navigation and screen hierarchy. Book 3 owns training logic behind training screens. Book 4 owns nutrition logic behind nutrition screens. Book 2 owns data, privacy, and AI memory rules that navigation must expose when relevant.
