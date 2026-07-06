# Popup and Sheet Visibility Test Plan

## Purpose

To ensure that all UI overlays (sheets, modals, popups) provide a consistent, accessible, and high-quality user experience on mobile and desktop viewports, preventing visibility or interaction regressions.

## Scope

This plan covers:

- Bottom sheets (e.g., Jarvis assistant, Detail views)
- Modals and Dialogs (e.g., Settings, Import/Export)
- Graph and Metric popups (e.g., Macros, Readiness, FitCore Score)
- Quick action menus
- Active workout confirmation popups

## Popup/Sheet Behavior Rules

- **Opacity & Readability:** Popups must not be semi-transparent when they contain text. Background dimming (overlay) should be used instead.
- **Visual Isolation:** Background content should not "bleed" through or visually interfere with the popup content.
- **Safe Areas:** Bottom sheets must respect iPhone safe areas (home indicator) to prevent clipping or accidental gestures.
- **Tap Targets:** Close buttons and action buttons must meet a minimum size of 44x44px for easy mobile tapping.
- **Focus Management:** Focus should be trapped within the popup when open and restored to the trigger element when closed.
- **State Persistence:** Closing a popup should not reset its internal state (e.g., a selected time range on a graph should persist when reopened).
- **No Scroll Bleed:** The main page body should be `overflow: hidden` while an overlay is active to prevent background scrolling.
- **Clean Exit:** Overlays must be fully destroyed/unmounted upon closing so they don't block unrelated app actions.

## Mobile-First QA Checklist

- [ ] **Viewport Fit:** Does the sheet content fit within the smallest supported mobile screen?
- [ ] **Keyboard Interaction:** Does the sheet shift upward when the mobile keyboard is triggered?
- [ ] **Gesture Conflict:** Does dragging down a bottom sheet feel natural and not conflict with scrollable content inside?
- [ ] **Contrast:** Is there sufficient contrast between the popup and the dimmed background?
- [ ] **Accessibility:** Are popups announced correctly by screen readers?

## Regression Risks

- **Z-Index Wars:** Jarvis assistant appearing behind a modal or vice versa.
- **Phantom Overlays:** Invisible "dead zones" where a closed popup used to be, blocking clicks.
- **Double Scrolling:** Both the sheet and the background scrolling simultaneously.
- **Cut-off Content:** Content at the bottom of a sheet being obscured by the OS home indicator.

## PR Review Checklist

- [ ] Verified on mobile viewport (simulated or real device).
- [ ] Background scroll is disabled when overlay is open.
- [ ] Close button is present and accessible.
- [ ] No transparency issues on content-heavy sections.
- [ ] State (e.g., toggles, selections) persists across open/close cycles if applicable.
- [ ] Respects the `prefers-reduced-motion` media query for transitions.
