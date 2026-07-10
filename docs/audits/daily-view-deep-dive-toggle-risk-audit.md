# Daily View / Deep Dive Toggle Implementation Risk Audit

This audit outlines the implementation risks and safely recommended sequence for adding the "Daily View / Deep Dive" toggle functionality after the individual tab Daily View PRs are merged.

## 1. Current main tab/view files likely involved

- `src/components/app/views/home.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/layout-primitives.tsx`
- `src/routes/index.tsx`
- `src/lib/store.tsx` / `src/lib/types.ts` (for state definition)

## 2. Files that should not be touched until open runtime PRs are merged

- Do not modify any of the main view files (`src/components/app/views/*.tsx`) or global layout shells (`layout-primitives.tsx`, `index.tsx`) until the active individual tab Daily View PRs are fully merged.
- Avoid modifying the global state store schema until ready to implement the toggle.

## 3. Suggested safest implementation sequence

1. Add the state primitive (`layoutMode: 'daily' | 'deepDive'`) to the global store without connecting it to the UI.
2. Implement the UI toggle component (segmented button) in `settings.tsx` and at the top of the `home.tsx` (Today) view.
3. Integrate the state into `layout-primitives.tsx` to allow conditional rendering context.
4. Pass the toggle state down to individual views, gradually replacing static layouts with conditionals.
5. Update End-to-End (E2E) tests to handle the new toggle.

## 4. Recommended state/persistence approach

- Persist the selected layout mode in the main `localStorage` object (`fitcore.v1`).
- The mode should be loaded on initial app bootstrap to prevent layout shifting.

## 5. Toggle scope: Per-tab or global

- **Global**. The layout mode should dictate the density of the entire application. As established in the layout patterns, the segmented toggle applies globally while keeping the same 5-tab bottom navigation active across both modes.

## 6. Risks around localStorage/state migrations

- Introducing a new property (`layoutMode`) to the `fitcore.v1` state requires careful merging with existing user data.
- If not handled properly, an undefined `layoutMode` could crash the UI or cause fallback loops. A default fallback (e.g., `'daily'`) must be strictly enforced during state initialization/migration.

## 7. Risks around bottom navigation and popup/sheet behavior

- **Bottom Navigation:** The bottom navigation must remain persistent and unchanged between modes. There is a risk of z-index or layout calculation issues if the Deep Dive mode introduces scrollable areas that overlap the fixed navigation.
- **Popups/Sheets:** Popups, modals, and routine forms should remain independent of the view mode, rendering on top of the active layout. Care must be taken so that triggering a sheet does not accidentally reset the layout mode state.

## 8. Risks around Playwright selector stability

- Conditionally rendering sections of the app means elements visible in 'Deep Dive' may not be present in 'Daily View'.
- E2E tests relying on broad text selectors may fail if the text is hidden. Tests will need to explicitly switch modes or assert based on the default mode's DOM footprint.

## 9. Specific tests that should exist before implementation

- E2E tests verifying the bottom navigation persistence across all tabs.
- Smoke tests ensuring data structures load correctly without `layoutMode` defined (legacy state compatibility).
- Visual or layout tests for the shared layout primitives to prevent structural regressions when conditionally wrapping content.

## 10. Clear recommendation for when the toggle work should start

- The implementation of the global toggle and its state persistence should strictly begin **only after** all individual tab "Daily View" component PRs are completed, reviewed, and merged into `main`. Starting earlier risks significant merge conflicts and breaking the baseline functional layout.
