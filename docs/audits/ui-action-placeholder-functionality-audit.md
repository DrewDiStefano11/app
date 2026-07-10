# UI Action, Placeholder, and Functionality Audit

## Scope

This audit covers main runtime views (`home.tsx`, `training.tsx`, `nutrition.tsx`, `recovery.tsx`, `progress.tsx`, `settings.tsx`), shared UI components, and common popup/sheet components (`sheet.tsx`, `quick-popups.tsx`). The focus is on identifying inactive buttons, fake data injection (Demo Mode), UI placeholders, and layout risks ahead of the planned Daily View / Deep Dive layout transition.

## Executive Summary

The application contains a mix of fully functional UI actions, "demo mode" simulated data, and a large number of explicit placeholders (especially in the Settings view). Most dashboard buttons correctly trigger local state updates (popups/sheets). However, several AI-related buttons rely on raw custom events that may fail silently, and the Settings view relies heavily on placeholder cards that look interactive but are not. The most significant risk involves the fake data generation tied to Demo Mode, which injects seeded data directly into active workout components and could mislead users.

## Real Working Actions

*   **Home Screen Quick Actions:** (Log Meal, Check In, Weigh In) correctly open their respective sheets.
*   **Home Screen Summary Cards:** Orbital scores and section tiles correctly open detail sheets (volume, readiness, recovery, momentum, macros, heatmap).
*   **Training View:** Program/template/cardio chip tabs and panel toggles work correctly.
*   **Recovery View:** Check-in and Sleep logging sheets open and save state.
*   **Settings View:** Export button correctly triggers a JSON download.
*   **Settings View:** "Reset all data" successfully triggers a confirmation dialog.
*   **Settings View:** Demo mode toggle correctly switches the app's global presentation state.

## Suspicious or Broken Actions

*   **Settings Import button:** Has `pointer-events-none` and no `onClick` handler. It looks like an active action button but is completely inert.
*   **AI Action Buttons:** Buttons in Nutrition and Home fire `window.dispatchEvent(new CustomEvent("fitcore:open-ai"))`. If the listener is not registered or active, this action fails silently without user feedback.

## Placeholder Features

*   **Settings > Health Context:** Body metrics, Injuries, Medications/allergies, Recovery preferences.
*   **Settings > Privacy & Data:** AI memory controls, Source visibility.
*   **Settings > Connected Apps:** Apple Health / Google Fit, Smart scale, Food, camera, and macros.
*   **Settings > Safety Profile:** Allergies, Medications, Emergency contacts.
*   **Settings > Account / Pro:** Coach view, Gym or PT clinic, Premium / Pro.

## Placeholder Copy That Needs Clearer Labeling

Currently, placeholders in Settings use pill tags like "Planned", "Coming later", or "Not connected yet". While helpful, they sit immediately alongside active settings cards, have similar hover states, and can confuse users about what is currently usable.

| Placeholder Area | Current Copy | Problem | Safer Copy Recommendation |
|---|---|---|---|
| Settings Placeholder Tags | "Planned" / "Coming later" | Blends in with active settings. | "Future Feature: [Feature Name]" |
| Settings Account / Pro | "Not connected yet" | Implies a missing user action (like auth). | "Coming soon" or remove entirely. |
| Empty States (Volume/Muscle) | "log a workout or enable Demo Data" | Encourages fake data usage to hide empty states. | "Log your first workout to see data here." |

## Fake or Hardcoded Data Risks

*   **Demo Mode (Settings):** When active, this injects simulated data across Home charts and active workout previous sets (`makeDemoPrevSets`). If a user accidentally leaves this on (or if state persists unexpectedly), they will see fabricated metrics instead of their real historical data during active training.
*   **Active Workout Prev Sets:** The fake previous sets in `active-workout.tsx` are deterministically seeded but could deeply confuse a user if they forget Demo mode is on.

| Area | UI Element | Appears Functional? | Actually Functional? | Evidence | Risk | Recommendation |
|---|---|---:|---:|---|---|---|
| Settings | Import Backup Button | Yes | No | `pointer-events-none`, no onClick | P1 | Hide the button entirely or add a "Coming soon" tooltip. |
| Nutrition / Home | AI Open Buttons | Yes | Partially | Dispatches custom event | P1 | Fails silently. Wrap in a robust context or error boundary. |
| Settings | Placeholder feature cards | Yes (looks clickable) | No | Missing onClick, static text | P2 | Visually distinct styling (e.g., greyscale, dashed border). |
| Active Workout | Previous Set Data | Yes | No (if Demo on) | `makeDemoPrevSets` injects arrays | P0 | Ensure clear "DEMO" labels on inline data to prevent confusion. |

## Popup / Sheet Risks

*   Numerous layered popups (`BottomSheet` variants for macros, volume, readiness, etc.). Overlapping portal-based bottom sheets might conflict with the new Tab/Subtab foundation and cause back-stack confusion or strict-mode testing issues.
*   `active-workout.tsx` relies heavily on full-screen overlays that might fight for z-index precedence with new layout wrappers.

## Tab / Subtab UI Risks

*   The Training, Progress, and Nutrition views already use inline horizontal `Chip` tabs (e.g., Templates/Cardio/History, Weight/Photos).
*   If the overall app layout moves to a standard top/bottom tab foundation, these inner chip tabs might visually conflict or create confusing nested navigation hierarchies.

## Mobile Layout Risks

*   Complex overlapping sheets opening over deeply scrolled dashboard pages can cause layout thrashing or lost scroll positions on mobile, particularly with virtual keyboards active (e.g., logging a meal or adding workout notes).

## Accessibility Risks

*   The Settings Import button is visually present but completely un-focusable due to `pointer-events-none`.
*   Settings placeholder cards lack proper ARIA roles indicating they are non-interactive or disabled.
*   The Demo mode indicator (`home-status-chip--demo`) might not be sufficiently announced by screen readers as a global state warning.

## Toggle/Subtab PR Collision Risks

*   Any active PR introducing Daily View / Deep Dive toggles will heavily impact `home.tsx` and the current popup dispatch logic.
*   Modifying how `home.tsx` renders its summary cards or routes to detail views will collide directly with the current `setPopup(...)` and `setPopup(null)` state machine.

## Recommended Fix PRs After Toggle Lands

1.  **Clean up Settings Placeholders:** Move all non-functional planned features into a single clearly marked "Roadmap" section or visually disable them entirely.
2.  **Standardize AI Dispatch:** Replace raw `window.dispatchEvent` calls with a typed global context or hook to handle AI opening reliably.
3.  **Fix Import Flow:** Implement the JSON import logic or hide the button if unsupported.
4.  **Clarify Demo Mode:** Ensure demo mode displays a persistent, unmistakable banner rather than just a home screen chip, and verify it doesn't leak into exported data.

## Validation Performed

*   Static grep analysis of `src/components/app/views/*`, `src/components/app/shared/*`, and sheet components.
*   Traced `onClick`, `href`, `dispatch`, and disabled states for all actionable elements.
*   Mapped Demo Mode dependencies across the codebase.

## Confidence and Open Questions

*   **Confidence:** High regarding the locations of placeholders (mostly isolated to Settings) and the mechanism of action for primary dashboard buttons.
*   **Open Question:** How exactly will the new Daily View / Deep Dive foundation handle the current `BottomSheet` overlays? Will sheets become dedicated sub-routes, or remain portal-based modals?
*   **Open Question:** Is `fitcore:open-ai` reliably caught at the root level in all runtime environments, or are there edge cases where it fails?