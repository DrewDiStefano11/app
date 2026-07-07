# Popup and Sheet Behavior Inventory

Date: July 7, 2024
Branch: docs-popup-inventory-audit

**Note:** This is a docs-only audit. This file documents the current state of UI overlays and does not change any runtime behavior.

## Executive Summary

- The application heavily relies on a custom `BottomSheet` component for various interactions like logging meals, checking in, and showing detail views.
- There is no usage of `React.createPortal` in `src/components/app/sheet.tsx`, meaning popups are rendered inline in the DOM. This can lead to stacking context, `z-index`, and positioning issues, especially on mobile.
- Background blur and opacity are applied via `backdrop-blur-md` and `bg-black/80`, which works but might have accessibility and contrast concerns depending on underlying content.
- Scroll locking is handled manually by manipulating `document.body.style.overflow`, which can be fragile across different mobile browsers and might conflict with other overlays.
- Navigation vs Popup: Many detail views are currently implemented as popups rather than discrete routes, leading to complex local state management in top-level view components.
- The Jarvis assistant is implemented as a `BottomSheet`, which might overlap with other popups or bottom navigation.

## Files Inspected

- `src/components/app/sheet.tsx`: The core implementation of `BottomSheet` and `ConfirmDialog`. Critical to understanding base functionality.
- `src/components/app/views/home.tsx`: Mounts numerous detail sheets (`VolumeDetailSheet`, `MacroDetailSheet`, `ReadinessDetailSheet`, etc.), showing heavy reliance on local state for popups.
- `src/components/app/views/nutrition.tsx`: Uses `LogMealSheet` and dynamic `BottomSheet` for meal details.
- `src/components/app/views/progress.tsx`: Uses `PhotoSheet` and generic `BottomSheet` for photo details.
- `src/components/app/views/recovery.tsx`: Uses `CheckInSheet`, `SleepSheet`, and `FatigueSheet`.
- `src/components/app/views/training.tsx`: Uses `CardioSheet` and general details `BottomSheet`.
- `src/components/app/active-workout.tsx`: Uses `CustomExerciseSheet`, `PlateCalculatorSheet`, and `FinishWorkoutSheet`.
- `src/components/app/jarvis/jarvis-panel.tsx`: Implements the Jarvis assistant panel via `BottomSheet`.
- `src/styles.css`: Inspected for `z-index`, animations, and global layout constraints.
- `src/components/app/popups/*.tsx`: Various specialized popup components used in the home view.

## Popup / Sheet Inventory Table

| Trigger / Button / Surface             | Screen           | Current Behavior                      | Expected/Future Behavior                | Component/File                               | State Owner                | Mobile Risk | Accessibility Risk | Severity | Notes                                            |
| :------------------------------------- | :--------------- | :------------------------------------ | :-------------------------------------- | :------------------------------------------- | :------------------------- | :---------- | :----------------- | :------- | :----------------------------------------------- |
| Any Metric Card (Volume, Macros, etc.) | Home             | Opens specialized BottomSheet inline  | Should open robust, portal-backed sheet | `src/components/app/views/home.tsx`          | `home.tsx` local state     | High        | Medium             | Medium   | Heavy state lifting in `home.tsx`                |
| FitCore Score                          | Home             | Opens `FitcoreScoreSheet`             | Standardized explanation sheet          | `src/components/app/popups/score-popup.tsx`  | `home.tsx` local state     | Medium      | Medium             | Medium   | Needs careful scroll handling                    |
| Log Meal Button                        | Home / Nutrition | Opens `LogMealSheet`                  | Reliable, robust full-height sheet      | `src/components/app/popups/quick-popups.tsx` | Local state                | High        | High               | High     | Core user flow                                   |
| Check In / Weigh In                    | Home / Recovery  | Opens `CheckInSheet` / `WeighInSheet` | Uninterrupted data entry                | `src/components/app/popups/quick-popups.tsx` | Local state                | High        | Medium             | High     | Core user flow                                   |
| Active Workout Modals                  | Active Workout   | Custom, Plate Calc, Finish popups     | Reliable overlay mid-workout            | `src/components/app/active-workout.tsx`      | `active-workout.tsx` state | High        | High               | High     | Can lose data if sheet crashes or is un-closable |
| Photo Detail                           | Progress         | Opens `PhotoSheet`                    | Smooth transition to full screen        | `src/components/app/views/progress.tsx`      | Local state                | Medium      | Low                | Low      | Needs good image scaling                         |
| Cardio / Detail                        | Training         | Opens `CardioSheet`                   | Reliable logging sheet                  | `src/components/app/views/training.tsx`      | Local state                | Medium      | Medium             | Medium   |                                                  |
| Jarvis Button                          | Global / Nav     | Opens `BottomSheet` for Jarvis        | Floating assistant with proper z-index  | `src/components/app/jarvis/jarvis-panel.tsx` | Local/Global state         | High        | High               | High     | Overlaps other UI                                |

## Current Interaction Patterns

- **Opening/Closing:** Popups are conditionally rendered using boolean or string enum flags in the local state of the parent view components (e.g., `const [popup, setPopup] = useState(null)` in `home.tsx`).
- **Logic Sharing:** Most popups rely on the centralized `BottomSheet` component in `src/components/app/sheet.tsx`.
- **State Management:** State is overwhelmingly local to the parent view. This leads to large view files managing many modal states. There is minimal use of route-based popups or global state for standard overlays (except maybe Jarvis).
- **Graph/Detail Persistence:** Detail popup state is entirely ephemeral. Refreshing the page or navigating away loses the popup state.

## Visual / Layout Risks

- **Backdrop Opacity/Transparency:** `bg-black/80` is used, which is generally fine, but `backdrop-blur-md` can cause performance issues on low-end devices and might clash with complex underlying UI.
- **Z-Index Stacking:** Sheets are rendered inline, meaning they are subject to their parent's stacking context. Without `React.createPortal`, deeply nested components might render under other sibling elements with higher z-index.
- **Mobile Viewport/Safe Area:** Uses `env(safe-area-inset-bottom)`, but dynamic toolbars (Safari/Chrome on mobile) can cause `100vh` to overflow or underflow. The code uses `dvh` mostly, which is good, but nested scrolling might break.
- **Scroll Locking:** Manual `document.body.style.overflow = "hidden"` is brittle. If a sheet crashes before unmounting, the app is permanently scroll-locked.
- **Bottom Nav Overlap:** If popups do not use portals, they might render _under_ the bottom navigation if the bottom nav has a higher z-index.
- **Floating Jarvis Overlap:** Jarvis might overlay onto active sheets or vice-versa, creating confusing multi-layer interactions.

## Accessibility Risks

- **Keyboard Close:** Basic `BottomSheet` does not seem to implement native escape key listeners.
- **Focus Trap:** There is no apparent focus trapping within `BottomSheet`. Screen reader users and keyboard navigators can tab out of the modal into the background content.
- **Aria Labels/Roles:** Basic ARIA roles (`role="dialog"`, `aria-modal="true"`) appear to be missing from `BottomSheet`.
- **Screen Reader Descriptions:** Titles are passed in, but standard `aria-labelledby` linkages might be missing.
- **Click Outside Close:** Implemented via onClick on the backdrop, which is good, but needs to ensure it doesn't trigger accidentally.
- **Restoring Focus:** No logic to restore focus to the triggering button upon modal close.

## Known Hold / Park Items

- **PR #34 Active:** Popup positioning/runtime UI work is currently on hold as PR #34.
- **No Authorization:** This audit must not be treated as approval to merge or revive #34.
- **Wait for Stability:** Future popup runtime fixes should wait until Product Bible/audit work is stable unless explicitly prioritized.

## Risk Table

| Risk                             | Evidence                                      | Affected Surfaces | User Impact                                        | Severity | Recommended Future Action                                          | Safe to Fix Now?      |
| :------------------------------- | :-------------------------------------------- | :---------------- | :------------------------------------------------- | :------- | :----------------------------------------------------------------- | :-------------------- |
| Lack of Portals (`createPortal`) | Code review of `src/components/app/sheet.tsx` | All Sheets/Modals | Popups can be trapped by parent transforms/z-index | High     | Refactor `BottomSheet` to use `React.createPortal` to body.        | No, future runtime PR |
| Focus Trapping Missing           | Code review of `src/components/app/sheet.tsx` | All Sheets/Modals | Keyboard users can navigate hidden background      | Medium   | Implement focus trap library or custom logic.                      | No, future runtime PR |
| Manual Scroll Locking            | Code review of `src/components/app/sheet.tsx` | All Sheets/Modals | Page can become permanently unscrollable           | High     | Use robust scroll lock utility (e.g., Radix UI, body-scroll-lock). | No, future runtime PR |
| Heavy Local State                | `home.tsx` has 10+ modal states               | Home View         | Unmanageable component size, re-renders            | Medium   | Move sheet states to URL hash/query or global store.               | No, future runtime PR |
| Missing ARIA Roles               | Code review of `src/components/app/sheet.tsx` | All Sheets/Modals | Screen readers do not announce dialogs properly    | Medium   | Add standard `role="dialog"` and `aria-modal="true"`.              | No, future runtime PR |

## Future Popup Cleanup Task Queue

1. **Design System Task:** Standardize modal animation, backdrop colors, and z-index across the app to resolve any inconsistencies. (Risk: Low, Wait until Product Bible completion).
2. **Runtime Implementation Task:** Refactor `BottomSheet` and `ConfirmDialog` to use `React.createPortal` ensuring robust DOM placement. Affects all `sheet.tsx` usages. (Risk: High, Wait until Product Bible completion).
3. **Runtime Implementation Task:** Implement solid focus trapping and escape-to-close behavior in all popups. (Risk: Medium, Wait until Product Bible completion).
4. **Docs/Planning Task:** Evaluate moving major detail views (e.g., Active Workout Modals, Log Meal) to separate routes rather than nested popups to improve state management. (Risk: Medium).
5. **Mobile Smoke Tests:** Create Playwright/manual test suites specifically targeting modal behavior on iOS/Android viewports with dynamic toolbars. (Risk: Low).

## Future Smoke Test Checklist

- [ ] Open/close each popup on mobile width (e.g., iPhone 12 Pro dimensions).
- [ ] Verify content readability within the modal against dark/light backgrounds.
- [ ] Verify no background content shows through the backdrop in a confusing way (especially text-on-text).
- [ ] Verify bottom nav and Jarvis button do not cover or bleed through popup content.
- [ ] Verify graph popup mode persistence (if route-based is adopted in the future).
- [ ] Verify Log Meal, Check In, and Weigh In behavior operates smoothly without keyboard overlap issues.
- [ ] Verify keyboard/focus/escape/click-outside behavior handles correct modal closure.
- [ ] Verify active workout expandable cards display without being cut off by the viewport edge.
