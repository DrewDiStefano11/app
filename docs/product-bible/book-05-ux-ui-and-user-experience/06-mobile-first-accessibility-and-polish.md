# Mobile-First Accessibility and Polish

## Mobile-First Baseline

FitCore should be designed primarily for phone use, especially during workouts, meal logging, weigh-ins, check-ins, and quick AI interactions.

Desktop and larger screens should improve scanning and comparison, but mobile should be the baseline for workflow quality.

## Mobile Layout Requirements

| Requirement | Standard |
| :---------- | :------- |
| Readable text | Text should remain legible on common phone sizes without crowding. |
| Tap targets | Buttons, cards, toggles, and graph controls should be large enough to tap reliably. |
| Bottom nav spacing | Content and actions should have safe spacing around bottom navigation. |
| Sheet fit | Sheets should fit common phone sizes and support scrolling for long content. |
| Key actions | Key buttons should not be hidden below navigation or unsafe areas. |
| Density | Avoid dense screens, especially during active workouts and quick logging. |
| One-handed use | Common quick actions should be reachable where practical. |
| Quick action reach | Log Meal, Check In, Weigh In, Start Workout, and Ask FitCore should be easy to reach from relevant contexts. |

## Accessibility Requirements

FitCore should support accessible interaction patterns as a product requirement, not a final-pass cleanup.

- Use meaningful labels.
- Maintain sufficient contrast.
- Provide visible focus states where applicable.
- Avoid relying only on color.
- Use readable font sizing.
- Provide clear error messages.
- Consider keyboard behavior where applicable.
- Consider screen reader labels, roles, and reading order where applicable.
- Ensure disabled, loading, selected, and error states are visually clear.
- Keep graph legends, labels, and uncertainty indicators understandable without color alone.

## Polish Standards

Polish means the screen behaves coherently under real use.

- Consistent card spacing.
- Consistent button hierarchy.
- Consistent icon behavior.
- Consistent empty states.
- Consistent loading states.
- Consistent error states.
- No broken buttons.
- No placeholder UI presented as working.
- No transparent popups that reduce readability.
- Graph popups should not feel cramped.
- Sheet actions should remain reachable.
- Important status should not be hidden below decorative content.
- Text should not overlap controls or other content.

## Device Smoke Expectations

UX work should include basic smoke checks where relevant:

| Check | Expectation |
| :---- | :---------- |
| Mobile viewport around 360x800 | Core dashboard, quick actions, sheets, and graph detail remain readable and usable. |
| Mobile viewport around 390x844 | Common phone layout remains stable with safe-area spacing. |
| Desktop/basic responsive check | Layout uses available space without becoming scattered or oversized. |
| Popups with bottom nav visible | Popups/sheets do not conflict with navigation or hide key actions. |
| Long sheet content scroll check | Long content scrolls without losing close, cancel, or primary action affordances. |

## Quality Bar

A screen is not finished if it is technically present but confusing, crowded, unreadable, disconnected from data, or has non-working controls.

For Product Bible purposes, a UX requirement should not be marked `Implemented` unless the repository clearly proves both the surface and the expected behavior exist.
