# Dashboard Cards, Graphs, and Data Visualization

## Dashboard Card Purpose

Cards should summarize important health, training, nutrition, recovery, and progress information without overwhelming the user.

A dashboard card should answer one of three questions quickly:

- What is my current state?
- What changed?
- What should I do next?

## Card Hierarchy

| Card Type | Purpose |
| :-------- | :------ |
| Primary status cards | Show high-priority current state such as FitCore Score, readiness, training state, nutrition progress, or recovery status. |
| Quick action cards | Let the user log or start common workflows quickly. |
| Trend cards | Show meaningful changes over time without overreacting to a single day. |
| Alerts / needs attention cards | Surface missing, stale, low-confidence, risky, or user-actionable information. |
| AI insight cards | Summarize AI guidance with source/confidence and a path to explanation. |

## Common Card Requirements

Dashboard cards should generally include:

- Title.
- Current value or status.
- Trend or change when relevant.
- Confidence/source indicator when relevant.
- Short explanation or `why` entry point.
- Tap target for details.
- Clear empty state.

Cards should not pretend to know more than the available data supports. Missing, stale, estimated, corrected, or low-confidence data should be visible when it affects interpretation.

## FitCore Score Behavior

The FitCore Score should:

- Display the score.
- Include a short reason summary.
- Open a popup when tapped.
- Show factors contributing to the score.
- Avoid implying medical certainty.
- Show when data is missing, estimated, stale, or low-confidence.
- Distinguish normal variation from meaningful change where possible.
- Provide a route to ask the AI assistant for a clearer explanation.

The score explanation should connect to Book 2's source/confidence and privacy principles, Book 3's training safety logic, and Book 4's nutrition feedback-loop principles.

## Graph Behavior

Graphs should be useful, inspectable, and readable on mobile.

| Requirement | Standard |
| :---------- | :------- |
| Tappable detail | Graphs should be tappable/clickable when detail exists. |
| Larger view | Tapping a graph should open a popup or sheet with a larger view. |
| Mode toggles | Graph detail should include mode toggles when useful. |
| State persistence | Selected graph mode should persist back to the dashboard/card when appropriate. |
| Mobile readability | Axes, labels, legends, and tap targets should be readable on mobile. |
| Empty states | Empty states should explain what data is needed. |
| Data distinctions | Graphs should distinguish actual, estimated, corrected, and missing data where relevant. |
| Context | Graph detail should explain what the trend means and what not to overinterpret. |

## Visualization Principles

- Prioritize trend interpretation over raw data dumping.
- Do not overreact to single-day changes.
- Show confidence/uncertainty for AI-estimated data.
- Show enough context for the user to understand why a recommendation changed.
- Avoid charts that are decorative but not actionable.
- Keep color, labels, legends, and interaction states accessible.
- Use source/confidence labels when data provenance affects trust.

## Example Graph and Card Areas

| Area | UX Expectation |
| :--- | :------------- |
| Body weight trend | Show trend context, weigh-in source, corrections, and nutrition/recovery connection. |
| Calories/macros | Show target progress, estimate confidence, remaining range, and meal detail path. |
| Protein adherence | Show consistency and practical next action without shaming language. |
| Training volume | Show trend, recent load, muscle group context, and workout history link. |
| Muscle balance | Show imbalance signals cautiously and connect to training recommendations. |
| Recovery/readiness | Show contributing factors such as sleep, soreness, pain, and recent load. |
| Sleep trend | Show pattern and confidence/source when wearable or manual data is involved. |
| Soreness/pain | Show check-in trend and safety caution when appropriate. |
| Hydration | Show current state, trend, and logging path if hydration is supported. |
| FitCore score | Show score, reason summary, factor popup, and ask-AI entry point. |

## Anti-Patterns

- Tiny mobile graphs that cannot be inspected.
- Scores without factor explanations.
- Empty charts with no guidance.
- Unlabeled AI estimates.
- Recommendation changes with no visible reason.
- Dense dashboards that bury important alerts under cosmetic cards.
