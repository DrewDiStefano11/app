# Settings/Hub Runtime UI Recreation Guardrails

This document outlines the guardrails for a future task to safely recreate the Settings/Hub runtime UI.

## 1. What the Future Settings/Hub Runtime Task May Safely Touch
- The future task may be runtime UI only.
- It should be file-scoped to the specific components responsible for the Settings/Hub UI (e.g., `src/components/app/settings/*`, `src/routes/settings.tsx`, or equivalent UI files depending on the existing architecture).
- It may update visual styling, layout, and purely cosmetic aspects of the Settings/Hub UI.
- It may read from existing global state where necessary for the UI display.

## 2. What It Must Not Touch
- It must not change global state or the data schema.
- It must not change local storage, database logic, or any persistence mechanisms.
- It must not change global navigation logic or routing structures outside the file-scoped Settings/Hub UI.
- It must not touch the Nutrition features or related files.
- It must avoid overlap with active Recovery and Progress work.

## 3. What Would Make the Task Too Broad
- Introducing new data models or modifying `src/lib/store.tsx`, `src/lib/types.ts`, etc.
- Refactoring global layouts, standard bottom navigation, or top-level app shell components.
- Modifying UI or logic for domains outside of Settings/Hub (e.g., Training, Recovery, Progress, Nutrition).

## 4. What Should Wait Until Recovery #129 and Progress #148 Are Merged or Closed
- Any cross-linking or UI integrations within the Settings/Hub that directly reference or control Recovery and Progress specific preferences/toggles.
- Any shared UI component updates that might conflict with structural changes introduced by Recovery #129 or Progress #148.

## 5. What Should Wait Until Daily View / Deep Dive Toggle Work Is Ready
- It must not implement the Daily View / Deep Dive toggle behavior in the Settings/Hub. This logic should be deferred until the dedicated work for the toggle is ready and merged.

## 6. Manual UI Review Checklist for a Settings/Hub UI PR
- [ ] Verify that the Settings/Hub UI renders correctly on both mobile and desktop viewports.
- [ ] Confirm no global navigation has been broken (e.g., users can enter and exit the Settings/Hub without issues).
- [ ] Verify that the update strictly modifies the Settings/Hub UI without affecting the Nutrition section.
- [ ] Confirm that global state and persistence (local storage) are unharmed by manually refreshing the page and ensuring data remains intact.
- [ ] Check that no structural changes were made to Recovery or Progress screens.
- [ ] Ensure that the Daily View / Deep Dive toggle behavior is absent, as specified.
- [ ] Review any new UI for basic accessibility (e.g., keyboard navigability).

## 7. Suggested Future Jules Prompt for the Settings/Hub Recreation Task
```
Recreate the Settings/Hub runtime UI based on the updated designs.

Important Constraints:
- This is a runtime UI-only task.
- Keep changes file-scoped to the Settings/Hub components.
- Do NOT implement the Daily View / Deep Dive toggle behavior.
- Do NOT change global state, schema, or persistence mechanisms.
- Do NOT change global navigation.
- Do NOT touch Nutrition files or functionality.
- Avoid any overlap with Recovery #129 and Progress #148.

Please ensure the UI matches the new visual requirements while strictly adhering to these guardrails. Run the relevant Playwright E2E tests before submitting.
```
