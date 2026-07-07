# UI/Popup Sheet Implementation Dependency Map

## 1. Purpose
To map the implementation dependencies required before standardizing and expanding FitCore's UI, specifically concerning popups, bottom sheets, error states, and mobile layouts. This ensures a consistent, accessible, and bug-free foundation before building feature-specific modals.

## 2. Scope
This dependency map covers the following planned features:
- Popup/sheet behavior
- Bottom nav overlap prevention
- Readability and backdrop opacity
- Mobile-first layout
- Log meal popup
- Check-in popup
- Weigh-in popup
- Graph popup
- FitCore score popup
- Settings/privacy sheets
- Error states
- Empty states
- Accessibility/mobile QA

## 3. Product Bible Sources to Check
- `docs/product-bible/book-05-ux-ui-and-user-experience/README.md`
- `docs/product-bible/book-05-ux-ui-and-user-experience/03-popups-sheets-and-interaction-patterns.md`
- `docs/product-bible/book-05-ux-ui-and-user-experience/06-mobile-first-accessibility-and-polish.md`

## 4. Related Planning/Audit Inputs
- `docs/audits/popup-sheet-behavior-inventory.md`
- `docs/audits/error-empty-loading-state-audit.md`
- `docs/audits/accessibility-usability-audit.md`
- `docs/audits/pwa-mobile-readiness-audit.md`

## 5. Required Data Dependencies
- **State vs UI Isolation:** Popups must not mutate global state directly without using defined Store Provider actions, ensuring reversibility if a sheet is closed via swipe/escape.
- **Empty/Error State Context:** Centralized error codes or loading enums required to trigger specific fallback sheets.

## 6. Required UI Dependencies
- **Portal Rendering Fix:** Implementing `React.createPortal` for `BottomSheet` and `ConfirmDialog` to break them out of local DOM hierarchies, fixing z-index and stacking context issues (`popup-sheet-behavior-inventory.md`).
- **Dynamic Viewport Heights (`dvh`):** Standardizing layout using `dvh` (e.g., `92dvh` for tall variants) instead of `%` or `vh` to account for mobile browser toolbars.
- **Backdrop Styling:** Enforcing the `bg-black/85` and `backdrop-blur-md` convention for modal backgrounds.
- **Animation Containment:** Fixing entry animations (e.g., `tile-in`) to end in `transform: none` instead of `translateY(0)` to prevent creating permanent containing blocks for `position: fixed` children.

## 7. Required AI/Jarvis Dependencies
- **Jarvis Overlay Rules:** Ensuring AI chat interfaces don't conflict with or get trapped behind Bottom Sheets when both are active.

## 8. Required Privacy/Safety Dependencies
- **Settings/Privacy Sheet Accessibility:** Ensuring privacy toggles inside sheets are fully accessible (Screen reader compatible, high contrast) and clearly denote destructive actions (e.g., Delete Data).

## 9. Required QA/Testing Dependencies
- **Mobile Safari/Chrome QA:** Manual verification on physical devices or accurate simulators to ensure Bottom Nav overlap prevention and `dvh` adherence.
- **Escape/Swipe-to-Close Tests:** Playwright tests verifying that pressing Escape or clicking the backdrop correctly unmounts the component and resets local state.
- **Targeting Standards:** Adhering to the testing convention of targeting the `.sheet-surface` class when testing details inside Portals.

## 10. Implementation Sequence
1.  **Core Architecture:** Refactor `BottomSheet` and `ConfirmDialog` to use `React.createPortal`.
2.  **CSS/Styling Fixes:** Apply `dvh` sizing, correct backdrop blurs, and fix CSS `transform: none` animation rules.
3.  **Base Components:** Create standardized Empty and Error State wrapper components.
4.  **Feature Popups:** Implement standard Log Meal, Check-in, and Weigh-in popups utilizing the new foundation.
5.  **Analytics Popups:** Implement complex Graph and FitCore score sheets, ensuring proper internal scrolling without hardcoded max-heights.
6.  **Settings Popups:** Migrate Settings/Privacy sheets to the new portal structure.
7.  **QA Layer:** Run accessibility and Mobile PWA readiness smoke checks.

## 11. Unsafe Shortcuts
- Rendering global sheets inline without `React.createPortal`.
- Hardcoding `max-h` or `height` in pixels instead of relying on viewport-relative and internal scrolling logic.
- Ignoring backdrop interaction handling (e.g., clicking the background doesn't close the sheet).
- Skipping mobile simulator verification for keyboard overlap and bottom navigation bar clipping.

## 12. Suggested Future PR Breakdown
- PR 1: Core Foundation (Portal rendering, CSS transform fixes, DVH standardization).
- PR 2: Standardizing Backdrops, Accessibility traps, and Close behaviors.
- PR 3: Empty and Error State component library.
- PR 4: Refactoring existing Feature Sheets (Meal, Weigh-in, Check-in) to use the new foundation.
- PR 5: Refactoring Analytics/Graph and Settings Sheets.

## 13. Acceptance Criteria Before Runtime Work Starts
- The `React.createPortal` strategy is tested in an isolated environment.
- The `transform: none` styling rule for animations is defined and approved.
- The `.sheet-surface` Playwright targeting strategy is documented for future test engineers.

## 14. Final Dependency Table

| Dependency | Required before implementation? | Source/planning input | Risk if missing | Recommended next action |
| :--- | :--- | :--- | :--- | :--- |
| Portal Implementation (`React.createPortal`) | Yes | `docs/audits/popup-sheet-behavior-inventory.md` | Persistent z-index and overflow bugs across all screens | Refactor `BottomSheet` base component |
| Dynamic Viewport Height (`dvh`) adoption | Yes | `docs/audits/pwa-mobile-readiness-audit.md` | Popups cut off by mobile browser toolbars | Update layout classes in `sheet.tsx` |
| CSS Animation `transform` fix | Yes | Memory / Styling Convention | `position: fixed` elements failing inside sheets | Update `src/styles.css` `tile-in` animation |
| Empty/Error State Standard | Yes | `docs/audits/error-empty-loading-state-audit.md` | Inconsistent UI when data fails to load | Build reusable generic states |
