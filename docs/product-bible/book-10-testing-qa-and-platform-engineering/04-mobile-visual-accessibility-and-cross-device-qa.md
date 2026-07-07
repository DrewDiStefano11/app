# Mobile, Visual, Accessibility and Cross-Device QA

FitCore’s primary interface target is the mobile device. As a result, all QA standards must be "mobile-first." FitCore should be tested primarily on phone-sized layouts before being considered complete on wider desktop viewports.

*(Note: This document defines standards and areas for future QA focus. It does not implement UI changes or automated tests.)*

## Mobile QA Areas

The mobile-first approach requires rigorous testing of the following layout and interaction points:

- **Safe-area spacing:** Ensuring content does not render under notches or overlapping system toolbars.
- **Bottom nav overlap:** Content must scroll clearly above the bottom navigation.
- **Popup/sheet positioning:** ensuring sheets render appropriately using dynamic viewport heights (`dvh`).
- **Scroll locking:** Background content should not scroll when a modal or sheet is open.
- **Keyboard behavior:** Testing inputs ensuring the virtual keyboard doesn't obscure the focused field.
- **Graph readability:** Verifying tooltips, labels, and interaction on small screens.
- **Small-screen button spacing:** Ensuring tap targets aren't cramped or easily mis-clicked.
- **Floating assistant overlap:** Ensuring Jarvis/assistant buttons don't block crucial data.
- **One-handed usability:** Placing critical actions within easy thumb reach.

## Visual QA Areas

Visual validation ensures UI components match design expectations across the application:

- **Modal backdrop readability:** Detail sheets and modals require appropriate blurring (`backdrop-blur-md`) and opacity (`bg-black/85`).
- **Card spacing:** Uniform gaps and padding around insight and data cards.
- **Section tab polish:** Smooth transitions and clear active states.
- **Graph labels:** Un-clipped and legible on all devices.
- **Empty states:** Properly aligned illustrations and copy.
- **Loading states:** Smooth skeletons or spinners that do not cause layout jumping.
- **Error states:** Highly visible and distinct from success states.
- **Theme support:** Dark/light mode consistency (if supported).

## Accessibility Expectations

FitCore must be usable by a wide range of individuals. Accessibility expectations include:

- **Readable text sizes:** No micro-text for crucial information.
- **Contrast:** Sufficient contrast between text and background, especially on graphs.
- **Tap target size:** At least 44x44 points for interactable elements.
- **Keyboard navigation:** Where applicable, specifically on desktop/tablet web views.
- **Focus states:** Clear visual indicators for currently focused elements.
- **Screen reader labels:** Descriptive `aria-labels` or alternative text where visual context is insufficient.
- **Non-color-only indicators:** Information (like trends or warnings) must not rely on color alone.
- **No hidden critical information:** Core data should not be hidden behind hover-only UI that cannot be triggered on touch screens.

## Cross-Device and Browser Expectations

Validation should occur across standard form factors and browsers:

- **iPhone-sized viewports:** Primary mobile target.
- **Android-sized viewports:** Checking alternative mobile rendering engines and screen ratios.
- **Desktop browser:** Ensuring the app functions in larger spaces (often used for review).
- **Chrome/Edge priority:** If voice/Jarvis browser APIs are utilized.
- **Safari considerations:** Managing Safari’s specific dynamic toolbar behavior and audio context rules on mobile.
