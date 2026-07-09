1. **Refine `ViewModeToggle` in `src/components/app/shared/view-mode-toggle.tsx`**:
    - Reduce bulkiness: make it more compact. Remove or greatly reduce helper text.
    - Ensure Left side = Daily View, Right side = Deep Dive.
    - Keep mode values: `"daily"` and `"deepDive"`.
    - Maintain accessibility.
2. **Improve `SubTabs` in `src/components/app/ui.tsx`**:
    - Ensure tabs do not get cut off (especially "Deep Dive" rows) and fit better on mobile.
    - Keep ARIA semantics (`role="tablist"`, `role="tab"`, `aria-selected`).
    - Use smaller labels, better spacing, or wrap/scroll behavior.
3. **Refine `PlannedFeatureCard` in `src/components/app/ui.tsx`**:
    - Clearly show that planned features are not functional (e.g., lower opacity, add "Placeholder" styling).
4. **Add `CompactMetricCard` and `ExpandableCard` to `src/components/app/ui.tsx`**:
    - These are the reusable patterns for compact visual metric cards and expandable cards requested by the prompt. If `ExpandableCard` doesn't exist, we'll build a simple one using standard React state (no new dependencies).
5. **Fix Popup/Bottom Sheet Positioning in `src/components/app/sheet.tsx`**:
    - As per Architecture & Design Memory: "Popups and bottom sheets (e.g., `BottomSheet` and `ConfirmDialog` in `src/components/app/sheet.tsx`) utilize React Portals (`createPortal(..., document.body)`) to ensure they anchor correctly to the viewport. This pattern breaks them out of nested dashboard scrolling containers or CSS transforms that can disrupt standard `position: fixed` behavior."
    - We will update `BottomSheet` and `ConfirmDialog` to use `createPortal` to render directly to `document.body`.
6. **Validate Changes**:
    - Run `bun run build`.
    - Run `npx playwright test tests/e2e/app-pr-gate-smoke.spec.ts`.
    - Run `npx playwright test tests/e2e/mobile-layout-overlay-smoke.spec.ts`.
7. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
8. **Submit**.
    - Push the branch and call the submit tool with the requested PR title and body.
