# FitCore Accessibility & Usability Audit

**Date:** October 2023
**Status:** Audit Only (No UI changes implemented in this PR)
**Author:** Jules (Software Engineer)

## Overview

This document provides a comprehensive audit of the FitCore application's accessibility (A11y) and usability. As a premium, mobile-first fitness command center, FitCore must balance its sophisticated "glass" aesthetic with high standards for reachability, readability, and assistive technology support.

---

## 1. Mobile Tap Targets

### Findings

- **Bottom Navigation:** Good. Items have a `min-height: 52px`, exceeding the 44px minimum recommendation.
- **Quick Actions:** Good. Home screen quick actions are large cards.
- **Exercise Set Controls:** **Sub-optimal.** The set number/tag button in `ActiveWorkout` is `h-9` (36px). While standard for dense layouts, it may be difficult to tap during intense workouts.
- **Popup Close Buttons:** Good. `BottomSheet` close button is `h-10 w-10`.
- **Form Inputs:** Good. Standard `Input` and `Select` components use `min-h-[46px]`.

### Recommendations

- Increase `SetRow` tag button height to at least 42px.
- Ensure the `X` button in the `BottomSheet` has an active hit area of at least 44x44px even if the visual icon is smaller.

---

## 2. Text Readability

### Findings

- **Small Text:** Frequent use of `0.625rem` (10px) and `0.52rem` (8.3px) for secondary labels and navigation text. This is below the generally accepted 12px minimum for legibility.
- **Contrast:** Muted text (`oklch(0.61 0.014 285)`) on the dark background (`oklch(0.045 0.008 285)`) may fall below WCAG AA standards (4.5:1).
- **Glass Surfaces:** High-blur glass is used extensively. While visually premium, it can reduce contrast if content behind it is high-frequency.
- **Dark Mode:** The app is dark-mode only, which is generally better for fitness environments but requires careful contrast management for text.

### Recommendations

- Increase minimum font size for navigation and essential labels to `0.75rem` (12px).
- Audit all `text-muted-foreground` usages for WCAG AA compliance; consider lightening the muted text variable.

---

## 3. Popup and Sheet Accessibility

### Findings

- **Header Visibility:** Headers are clear and sticky.
- **Reachability:** Bottom-aligned sheets are excellent for thumb-reachability on large mobile devices.
- **Scrolling:** `BottomSheet` handles internal scrolling with `max-h-[88dvh]`, which is good for keeping the header visible.
- **Focus Behavior:** Currently lacks explicit focus trapping and "Return to Trigger" behavior on close.
- **Safe Area:** `BottomSheet` respects `env(safe-area-inset-bottom)`.

### Recommendations

- Implement focus trapping (e.g., using `react-focus-lock` or similar) to prevent focus from leaking to the background.
- Ensure the `Escape` key closes the `BottomSheet`.

---

## 4. Form Usability

### Findings

- **Numeric Inputs:** Use `inputMode="decimal"` or `inputMode="numeric"`, which correctly triggers the numeric keypad on mobile.
- **Labels/Placeholders:** Most fields use labels (`Label` component), but some inline edits in `ActiveWorkout` rely on placeholders as labels.
- **Workout Logging:** The UI is optimized for speed, but the proximity of "Delete" and "Add Set" could lead to accidental destructive actions.

### Recommendations

- Ensure every `input` has a corresponding `label` or `aria-label`, even if visually hidden.
- Add a subtle confirmation or "Undo" for deleting an exercise set within an active workout.

---

## 5. Navigation Clarity

### Findings

- **Labels:** All navigation items have labels, but they are very small.
- **Active States:** Excellent. Uses color, glow, and stroke weight changes to indicate the active section.
- **Back Behavior:** Deeply nested views (like specific settings) lack a consistent "Back" button, relying on the `X` or standard browser/OS back behavior.

### Recommendations

- Standardize a `SubPageHeader` with a dedicated "Back" button for nested routes.

---

## 6. AI/Jarvis Accessibility

### Findings

- **Reachability:** The AI composer is docked in the bottom nav, making it very reachable.
- **Voice/Text:** Voice mode is currently a placeholder/coming soon.
- **Understanding:** Actions require confirmation in Level 2 mode, which is excellent for accessibility and safety.
- **Reviewability:** Jarvis's actions are summarized in "Confirm Cards."

### Recommendations

- Ensure "Confirm Cards" are announced correctly by screen readers when they appear.
- Provide a clear "Undo" action for all Jarvis-initiated mutations.

---

## 7. Reduced Motion

### Findings

- **Implementation:** `styles.css` includes a `@media (prefers-reduced-motion: reduce)` block that disables animations and transitions.
- **Follow-up:** Some complex SVG animations (like the body heatmap or orbit rings) should be verified for compliance.

---

## 8. Color-only Communication

### Findings

- **Progress/Rings:** Macros (Protein/Red, Carbs/Amber, Fat/Green) and scores rely heavily on color.
- **Trend Chips:** Use arrows (`↗`, `↘`, `—`) in addition to color, which is excellent A11y practice.
- **Muscle Heatmap:** Relies entirely on color intensity to show fatigue/readiness.

### Recommendations

- Add text labels or tooltips to the Muscle Heatmap (e.g., "Quads: High Fatigue").
- Ensure macro rings include percentage or gram values within or near the visual element.

---

## 9. Screen-Reader Readiness (ARIA)

### Findings

- **Icon Buttons:** Many buttons (e.g., in `ActiveWorkout`) are icon-only without `aria-label`.
- **Charts:** Recharts are used for stats; these are typically difficult for screen readers to interpret without a text summary or table fallback.
- **Dynamic Content:** AI responses and score updates need `aria-live` regions.

### Recommendations

- Add `aria-label` to all icon-only buttons (X, Plus, Trash, Grip, etc.).
- Provide hidden table summaries for all statistical charts.

---

## 10. Priority List

### High Priority (Immediate Actions)

1.  **ARIA Labels:** Add `aria-label` to all icon-only buttons in `ActiveWorkout` and `BottomNav`.
2.  **Focus Management:** Implement focus trapping in `BottomSheet` and `ConfirmDialog`.
3.  **Contrast:** Audit and adjust `text-muted-foreground` contrast ratios.

### Medium Priority

1.  **Font Sizes:** Increase navigation and secondary label sizes to 12px minimum.
2.  **Heatmap Labels:** Add text indicators for muscle fatigue levels.
3.  **Tap Targets:** Increase height of `SetRow` controls to 42px.

### Low Priority (Quick Wins)

1.  **Chart Summaries:** Add hidden data tables for charts.
2.  **Undo Safety:** Implement "Undo" for accidental set deletions.

---

## 11. Future Implementation Plan

### Phase 1: ARIA & Semantics (Safe Documentation/Attribute PR)

- **Scope:** Update `src/components/app/` components to include missing `aria-label`, `role`, and `aria-live` attributes.
- **Risk:** Zero. No layout or logic changes.

### Phase 2: Focus & Keyboard (Logic PR)

- **Scope:** Integrate a focus-trap hook into `BottomSheet`. Add `Escape` key listeners.
- **Risk:** Low. Can be tested thoroughly in isolation.

### Phase 3: Visual Refinement (Style PR)

- **Scope:** Adjust `styles.css` variables for contrast and font sizes.
- **Risk:** Medium. Requires visual regression testing across all screens.

### Phase 4: Interaction Improvements (UI PR)

- **Scope:** Increase tap targets in `ActiveWorkout`. Add fatigue labels to heatmap.
- **Risk:** Medium. Modifies layout slightly.
