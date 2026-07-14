# 1. Executive summary

- Store architecture uses a custom React Context provider with `useState` (`src/lib/store.tsx`), avoiding external dependencies like Zustand.
- Persistence fails silently. Synchronous `localStorage.setItem` catches quota and write exceptions, bypassing white screens but causing invisible data loss on reload.
- Corrupted JSON defaults back to `defaultState`, triggering forced onboarding on the next load.
- Jarvis operates with distinct asynchronous UI states including sending, duplicate-guards, error warnings, and an undo snackbar pattern.
- Empty states are widely and consistently implemented across domain collections.

# 2. Method and evidence boundaries

- Baseline SHA: `3e4326782d761313c4f2644ecfe55503770b360a`
- Code-and-test static inspection only. No dev server, Playwright, network simulation, or browser automation run.
- Did not document unmerged Data Safety behavior.
- Distinguished parse failures from write exceptions.

# 3. Store architecture

The application state is managed by a custom React Context provider (`src/lib/store.tsx`). It uses standard React `useState` for in-memory tracking. No external state management libraries (like Zustand or Redux) are used.

# 4. Feedback-component registry

- `EmptyState`: Shared, implemented. Renders empty collections.
- `PlannedFeatureCard`: Shared, presentation-only. Renders placeholders for future analytics.
- `Loader2`: Shared, implemented. Used for Jarvis thinking states.
- spinner: Local, partial. Included via `Loader2` for Jarvis.
- skeleton: Absent.
- inline validation: Local, implemented. HTML5 constraints within forms.
- error message: Local, implemented. Jarvis catches server exceptions and renders warnings inline.
- warning: Local, implemented. Rendered in Jarvis and destruct-confirmations.
- success message: Local, implemented. Used for import text results (`"Imported successfully"`).
- toast/snackbar: Shared, implemented (via `sonner` / `toast`). Used for Jarvis undo actions (`src/components/app/jarvis/jarvis-panel.tsx`).
- status strip: Absent.
- confirmation dialog: Shared, implemented. `ConfirmDialog` wraps data resets and destructive flows.
- retry action: Absent explicitly for mutations.
- offline banner: Absent.
- fallback screen: Absent. App defaults to onboarding if hydration fails.
- error boundary: Absent. No top-level React ErrorBoundary surrounds the router.

# 5. Startup

- Status: Implemented.
- Behavior: React tree mounts instantly, checking context provider.

# 6. Hydration

- Status: Implemented.
- Behavior: `loadFitCoreData` runs synchronously on context mount.

# 7. Corruption and fallback

- Status: Implemented / Probable risk.
- Behavior: `loadFitCoreData` wraps `localStorage.getItem` and `JSON.parse` in a `try/catch`.
- Parse failure: Malformed JSON triggers the catch block, falling back silently to `defaultState`.
- Invalid-shape filtering: `migrateAppState` validates schemas and fills missing defaults.
- Onboarding consequence: Returning `defaultState` wipes the `profile` object, causing `router.tsx` to force the user through onboarding again, producing an apparent total data loss.

# 8. Onboarding

- first use: Users without a profile trigger `OnboardingView`.
- missing data vs empty profile: Users with corrupted JSON fallback to an empty profile, entering the exact same onboarding flow.
- success: Saving the profile pushes it to context, firing a silent sync to `localStorage` and routing to Home.

# 9. Home

- empty: Implemented. "Complete your first check-in to build a score."
- missing data: Missing metrics are handled gracefully as empty states rather than zero values in most panels.

# 10. Training

- empty: Implemented. "No workouts".
- insufficient history: Implemented. "Complete a workout to start your volume trend."

# 11. Active workout

- empty: Implemented. "No active workout".
- fatal render failure: Interrupted workouts are preserved safely in the store, avoiding data loss if the browser tab reloads mid-workout.

# 12. Nutrition

- empty: Implemented. "Log a meal to begin today's calorie progress."
- missing vs zero risk: High. Undefined calories coerce to 0 during sum operations.

# 13. Recovery

- empty: Implemented. "Complete a check-in to calculate readiness."
- partial data: Explicitly labels missing contributors without coercing them to zero.

# 14. Stats

- empty: Implemented. "Add a goal to begin tracking progress."
- insufficient history: Implemented. Requires multiple points.

# 15. Settings

- warning: Implemented. `ConfirmDialog` guards "Reset App Data".
- import feedback: Local, implemented. Form updates text to "Imported successfully" or "Invalid backup file".

# 16. Jarvis

- loading / thinking: Local, implemented. Uses `sending` state and a `Loader2` spinner.
- sending guard: Local, implemented. `sendingRef.current` guards duplicate submits.
- warning/error: Local, implemented. Catches server failures and outputs "Warning: [message]".
- undo: Shared, implemented. Fires a `toast` snackbar with an Undo action after successful tool executions.
- disabled: Local, implemented. Refuses input when settings disable Jarvis.

# 17. Loading and sending

- Global mutation loading: Absent. Saves are synchronous.
- Jarvis asynchronous sending: Implemented. Displays `Loader2` and disables input.

# 18. Saving and persistence

- Status: Silent failure risk.
- Behavior: `saveFitCoreData` attempts a synchronous `localStorage.setItem`.
- Write exception / Quota failure: The `try/catch` catches exceptions and returns `false`.
- User feedback: Absent. The app updates React in-memory but drops the persistence, leading to silent data loss upon reload.

# 19. Success

- Implemented: Jarvis tool execution, Import data ("Imported successfully").
- Absent: Global mutation saving. Forms just close upon submission.

# 20. Warnings

- Implemented: Jarvis connection/server errors, destructive action confirms.

# 21. Errors

- Parse failure: Falls back to defaults without error UI.
- Render errors: Absent. Uncaught render exceptions trigger white screens.

# 22. Retry

- Absent. Synchronous saves and missing fallback UIs mean no explicit retry paths exist.

# 23. Confirmation

- Implemented: `ConfirmDialog` protects the settings reset.

# 24. Undo

- Implemented: Jarvis utilizes a `toast` from `sonner` to expose an undo action for completed tools.

# 25. Empty and insufficient data

- Heavily implemented across all domain collections using `EmptyState`. Insufficient history warns users exactly what is needed (e.g. "Add two weigh-ins...").

# 26. Missing versus zero

- Inconsistent. Recovery handles missing variables honestly, but Nutrition coercing missing calories to `0` causes analytical risks.

# 27. Offline and PWA

- The application operates totally locally. There are no offline warning banners or PWA update notifications.

# 28. Accessibility of dynamic feedback

- Partial / Absent. `EmptyState` lacks `aria-live` properties.

# 29. Test coverage

- Smoke tests hit basic empty states (`tests/e2e/home.spec.ts`).
- There are no tests verifying hydration fallbacks or storage quota handling.

# 30. Priority risk register

1. **Silent Save Failures:** Storage quota errors are caught but not surfaced to the UI, silently breaking persistence.
2. **Apparent Data Loss:** Malformed JSON drops the user into `defaultState` and routes them to onboarding without explanation.
3. **Missing vs Zero:** Nutrition coercing missing macro targets to 0.

# 31. Future Data Safety integration questions

- How will async API transactions block user input without a global `isMutating` spinner logic?
- How can storage quota failures alert users properly?

# 32. Redesign acceptance checklist

- Save operations must introduce error boundaries and UI feedback.
- Missing values must not visually default to zero.

# 33. Open questions

- Can we extract the Jarvis undo `toast` into a shared pattern for all mutations?

# 34. File index

- `src/lib/store.tsx`
- `src/lib/fitcore-data.ts`
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/views/*`
- `src/components/app/dashboard-layout.ts`
- `src/components/app/ui.tsx`
- `tests/e2e/home.spec.ts`
