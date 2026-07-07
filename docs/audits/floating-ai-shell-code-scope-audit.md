# Floating AI Shell Code Scope Audit

## Purpose
This document outlines the scope, visual design constraints, and safe implementation phases for the always-visible Floating AI shell. It defines the structural differences and integration paths for toggling between the 'Coach' (analysis) and 'Jarvis' (action) modes, ensuring that ongoing work does not conflict with parked PRs.

## Existing AI/Jarvis Entry Points Inspected
Based on `src/routes/index.tsx` and `src/components/app/bottom-nav.tsx`:
- The AI composer is currently integrated tightly with the bottom navigation (`composerOpen` state, `command-bar__composer`).
- There is a global `<JarvisPanel />` rendered at the shell level in `src/routes/index.tsx`.
- Various entry points exist across the app triggering `"fitcore:open-ai"` or `"fitcore:jarvis-compose"` events.

## Current Typed Jarvis Files Likely Involved
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/bottom-nav.tsx` (Needs refactoring to remove or adapt the AI button to the new floating paradigm)
- `src/lib/jarvis/*` (Underlying tool and action logic)

## Files to Avoid
**Crucially, do not touch or rely on the following parked PRs:**
- PR #2 (Jarvis voice conversation mode)
- PR #34 (Standardize Popup Positioning & Visibility)
- PR #14 (CI validation)

Also, avoid modifying the core active layout files during this foundation phase:
- `src/components/app/views/home.tsx`
- `src/routes/index.tsx`
- `src/components/app/views/hub/hub.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/active-workout.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/layout-primitives.tsx`

## Safe Implementation Phases
1.  **Floating visual shell only**: Create the distinct, always-visible UI container for the Floating AI, disconnected from the bottom nav.
2.  **Coach/Jarvis visual mode toggle**: Implement the UI switch within the floating shell to alternate between Coach and Jarvis appearances.
3.  **Last-used mode local UI state**: Ensure the shell remembers and opens to the mode (Coach or Jarvis) the user last interacted with.
4.  **Tab-accent glow**: Implement dynamic styling so the floating shell subtly inherits the color accent of the currently active bottom tab (e.g., Purple for Today, Cyan for Training).
5.  **Placeholder actions**: Wire up basic, safe mock interactions to verify the UI transitions without triggering complex real actions.
6.  **Typed Jarvis integration later**: Connect the specific Jarvis action tools (logging, navigation) once the visual shell is stable.
7.  **Voice mode integration much later**: Defer all voice recognition and audio features until PR #2 is properly handled and integrated.

## Distinction between Coach and Jarvis
The floating shell must visually and functionally distinguish between the two personas:
*   **Coach**: Focused on *explain, recommend, analyze*. The visual language should imply review, insight, and learning.
*   **Jarvis**: Focused on *action*. Jarvis is used to log anything, navigate, start workouts, weigh in, add notes, record pain/soreness, add supplements, or summarize today. The visual language should imply command, execution, and immediacy.

## Risk Areas
*   **Accidentally modifying voice mode**: Voice logic exists in `bottom-nav.tsx`; moving the AI shell must be done carefully to preserve or cleanly disable voice until PR #2 is resolved.
*   **Adding a separate global plus button**: The requirements explicitly forbid a separate global FAB. All global actions must flow through the Floating AI.
*   **Duplicating existing AI panels**: Ensuring the new floating shell replaces, rather than duplicates, the existing `JarvisPanel` or `composerOpen` states.
*   **Changing logging behavior too early**: Attempting to wire up complex data mutations before the UI shell is bulletproof.
*   **Touching popups/sheets**: Interacting with or modifying `src/components/app/sheet.tsx` or related popup logic, conflicting with parked PR #34.
*   **Creating nav clutter**: Ensuring the floating shell doesn't visually overwhelm or block the primary bottom navigation.

## Acceptance Criteria
- [ ] Floating AI shell is always visible on screen.
- [ ] No separate global "plus" button exists.
- [ ] A clear toggle exists within the shell to switch between Coach and Jarvis modes.
- [ ] The shell opens to the last-used mode automatically.
- [ ] Coach and Jarvis modes are visually distinct from one another.
- [ ] Floating AI subtly inherits the current active tab's accent glow color.
- [ ] Jarvis mode handles actionable intent (log, navigate, start workout).
- [ ] Coach mode handles analytical intent (explain, recommend).
- [ ] Voice mode logic is completely untouched.