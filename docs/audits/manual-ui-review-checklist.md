# FitCore Manual UI Review Checklist

This checklist is intended for manual UI reviews of runtime UI Pull Requests before merging. FitCore requires manual validation of UI changes to ensure that elements look correct and function as expected across different screens and contexts, something automated tests cannot always fully capture.

## 1. Desktop Layout
- [ ] Elements are appropriately spaced and aligned on a wide desktop screen.
- [ ] Components don't stretch unusually or break their bounds.
- [ ] Navigation components (like sidebars or top navs) are fully visible and functional.
- [ ] Text maintains readability and avoids excessively long lines.

## 2. Mobile/Responsive Layout
- [ ] The UI adapts gracefully to narrow screens (e.g., iPhone 12/13/14 sizes).
- [ ] Bottom navigation and other mobile-specific controls are present and functional.
- [ ] Touch targets are large enough (minimum 44x44px recommended).
- [ ] No horizontal scrolling on the `body` or main app shell containers.

## 3. Overflow and Clipping
- [ ] Long text strings wrap correctly or truncate gracefully with ellipses (`...`).
- [ ] Scrolling areas (like lists or daily views) do not clip bottom content.
- [ ] Elements inside constrained containers do not leak outside their bounds unless intended (like tooltips).
- [ ] Dynamic content expansions do not break adjacent elements.

## 4. Popup/Modal Readability
- [ ] Content inside `BottomSheet` components, modals, or dialogs is fully readable.
- [ ] Background dimming or blur (if applicable) effectively separates the modal from the main UI.
- [ ] The close/discard buttons are accessible and clearly visible.
- [ ] Any forms or inputs inside modals handle the on-screen keyboard correctly on mobile.

## 5. Button Behavior
- [ ] Buttons clearly indicate their active, hover, and disabled states.
- [ ] "Destructive" actions clearly warn the user or require confirmation.
- [ ] Tappable areas correspond correctly to the visual button bounds.
- [ ] Loading states (e.g., spinners on buttons) appear when expected.

## 6. Empty/Loading/Error States
- [ ] Empty states show helpful guidance rather than a blank screen or broken UI.
- [ ] Loading skeletons or spinners are present during data fetching.
- [ ] Error states present a clear, user-friendly message rather than raw technical stacks.
- [ ] Fallback UI components render safely when expected data is missing or incomplete.

## 7. Visual Consistency with Existing FitCore Style
- [ ] Spacing, margins, and padding align with the established design system (`tailwind.config.ts`).
- [ ] Colors match the FitCore theme palette (primary, secondary, background, text).
- [ ] Typography (font sizes, weights) matches standard FitCore patterns.
- [ ] Card and surface stylings use consistent shadow or border treatments.

## 8. Accessibility Basics
- [ ] Keyboard navigation (Tab) can reach all interactive elements in a logical order.
- [ ] Focus states are clearly visible for keyboard users.
- [ ] Color contrast meets standard readability ratios (WCAG AA).
- [ ] Screen readers can interpret key actions (using ARIA labels if native roles are insufficient).

## 9. Data Display Sanity Checks
- [ ] Charts and graphs render without crashing even with zero data.
- [ ] Date and time formatting aligns with localized expectations.
- [ ] Units (e.g., lbs, kg, cal, g) are displayed correctly next to values.
- [ ] "Today" or specific date bounds correctly bucket data (e.g., no yesterday data bleeding into today).

## 10. Screenshots or Screen Recordings the Reviewer Should Capture
- [ ] Capture a screenshot of the main affected view on Desktop.
- [ ] Capture a screenshot of the main affected view on Mobile.
- [ ] Capture a screen recording of any interactive flow, animation, or modal transition.
- [ ] Capture a screenshot demonstrating the UI handles an edge case (e.g., empty state or long text).
