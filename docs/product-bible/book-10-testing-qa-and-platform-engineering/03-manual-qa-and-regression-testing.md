# Manual QA and Regression Testing

Manual QA is an essential component of FitCore’s testing strategy. While automation ensures core logic and data pathways work correctly, manual QA catches edge cases, layout quirks, and nuanced UX issues that code-driven tests often miss—especially on mobile viewports.

Manual QA is required even if all automated tests pass, particularly for complex UI features, AI chat interactions, and deep layout changes.

## Manual Regression Checklist Areas

Manual regression testing should be performed across the following critical areas:

- Onboarding flows
- Settings and configuration
- Privacy controls
- Homepage layout and loading
- Bottom navigation usability
- Section tabs (Training, Nutrition, Recovery, etc.)
- Floating assistant/Jarvis behavior
- Log Meal popup
- Check In popup
- Weigh In popup
- Active workout flow (start, log sets, finish)
- Workout finish summary screen
- Workout templates interaction
- Training graphs and history
- Nutrition graphs and history
- Recovery graphs and history
- Body heatmap visualization
- FitCore Score popup
- Insight cards
- AI chat and logging interactions
- Export/delete controls (when implemented)
- Demo mode activation and boundaries
- Empty account state behavior
- Low-data state behavior

### When to Perform Regression Testing

Extensive manual regression testing must follow changes involving:
- Data model or schema changes.
- Active workout flow modifications.
- Graph or dashboard visual/data changes.
- AI logging or behavior adjustments.
- Privacy, export, or delete functionality changes.
- Popup, sheet, or overlay layout changes.
- Mobile navigation or spacing updates.

## Bug Report Quality Expectations

High-quality bug reports accelerate triage and resolution. All bug reports must include:

- Clear, step-by-step reproduction instructions.
- The expected result.
- The actual result.
- The device, OS, and browser used.
- Screenshots or screen recordings where useful (especially for UI bugs).
- The specific data category affected (e.g., Training, Nutrition).
- The severity level (based on the QA Severity Levels defined in the Overview).

## Core Flow Quality Matrix

For future implementation and validation, FitCore relies on a planning-level Core Flow Quality Matrix. Future implementations must validate that the following core flows:

1. Onboarding
2. Homepage
3. Log Meal
4. Check In
5. Weigh In
6. Active workout
7. Workout finish summary
8. Workout templates
9. Training dashboard
10. Nutrition dashboard
11. Recovery dashboard
12. Progress dashboard
13. FitCore Score popup
14. Graph popup and graph mode persistence
15. AI/Jarvis chat
16. AI logging
17. Settings/privacy controls
18. Export/delete controls (when implemented)
19. Demo mode

For each flow listed above, implementation must ensure the feature:
- Loads without crashing.
- Works natively on mobile layouts.
- Saves expected data accurately.
- Correctly updates related screens and downstream analytics.
- Handles empty/low-data states gracefully.
- Handles errors clearly.
- Avoids creating duplicate records.
- Respects privacy and AI data controls where applicable.
