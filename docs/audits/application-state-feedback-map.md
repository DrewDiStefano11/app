# 1. Executive summary

- current application-state architecture: The application relies entirely on synchronous, full-blob `localStorage` persistence managed through a Zustand store in `src/lib/store.tsx`.
- current state-feedback patterns: Most state feedback is instantaneous due to sync writes. Asynchronous loading states and retries are largely absent.
- strongest implemented state handling: Domain-specific empty states are consistently implemented across most views (Home, Training, Nutrition) using a shared `EmptyState` component.
- most serious state inconsistencies: Lack of global error boundaries or asynchronous mutation UI states (spinners, disabling inputs during save).
- most serious data-honesty risks: Missing data (e.g., calories, macro targets) is coerced to 0 instead of displaying an honest missing state.
- most serious retry and recovery gaps: There are no explicit UI retry mechanisms for failed storage writes.
- most serious offline gaps: The app operates entirely locally. Storage blockages (e.g. Safari Private Mode) can cause silent uncaught exceptions.
- major shared-component opportunities: Centralizing an error boundary and expanding `EmptyState` to handle loading/error contexts.
- major future Data Safety integration dependencies: Asynchronous migrations will require a complete overhaul of mutation UI (spinners, toasts, retries, conflicts).
- most important requirements for future redesign approval: Ensure missing vs. zero distinction and implement safe retry boundaries.

# 2. Method and evidence boundaries

- required base SHA: `3e4326782d761313c4f2644ecfe55503770b360a`
- static code-and-test inspection methodology: Manual inspection of `src/` and `tests/` directories via AST and regex search.
- files inspected: `src/lib/store.tsx`, `src/lib/fitcore-data.ts`, `src/components/app/views/*`, `src/components/app/dashboard-layout.ts`, `src/components/app/ui.tsx`.
- tests inspected: `tests/e2e/home.spec.ts`, `tests/e2e/training.spec.ts`, `tests/e2e/onboarding.spec.ts`.
- why runtime behavior is not being claimed as browser-verified: Instructions prohibit dev servers, browser automation, or runtime injection.
- how test fixtures are distinguished from production behavior: Located in `tests/e2e/helpers/` and not imported by `src/`.
- how current main is distinguished from unmerged Data Safety work: Evaluated strictly at the required SHA worktree.
- how findings are classified:
  - Confirmed implemented: Feature is wired in code.
  - Confirmed missing: Feature is verifiably absent from code.
  - Confirmed partial: Exists but missing sub-states.
  - Probable risk: Identified vulnerability, unverified at runtime.
  - Future dependency: Requirement for async work.

# 3. State architecture

The application state is held entirely in a React/Zustand global store (`src/lib/store.tsx`).
Persistence is handled by `saveFitCoreData` writing synchronously to `localStorage` key `fitcore.v1`.
Because all writes are synchronous, there are no "pending" or "loading" UI states for user actions like saving a workout or logging a meal. The UI immediately updates with the new state.

# 4. Shared feedback components

- `EmptyState`: (Local) Used for empty collections (e.g., "No workouts").
- `PlannedFeatureCard`: (Local) Used for unsupported deep-dive analytics.
- spinner: (Absent) No global loading spinner component exists.
- error boundary: (Absent) No global React ErrorBoundary is implemented in the router.
- toast/snackbar: (Absent) Success and error feedback rely solely on immediate layout updates.
- inline validation: (Local) Native HTML5 input validation (`required`, `min`) is used in forms.
- confirmation: (Local) Used for destructive actions (e.g., resetting settings) via standard modals.

# 5. Startup and hydration

- startup: App mounts instantly via `src/router.tsx`.
- hydration: `src/lib/store.tsx` calls `loadFitCoreData` synchronously.
- missing saved data: Detected if `store.profile` is missing; redirects to onboarding.
- malformed saved JSON: `loadFitCoreData` is wrapped in a `try/catch`. If parsing fails, it falls back to `defaultState`, effectively resetting the app.
- schema/migration failure: `migrateAppState` handles schema migrations on load.

# 6. Onboarding

- first use: Users without a profile see `OnboardingView`.
- missing data vs empty profile: Indistinguishable. A user with corrupted JSON that fails hydration will be sent to onboarding exactly like a new user.
- incomplete state: Form disable state handles partial progress.
- success state: Clicking save writes to `localStorage` and routes to Home instantly.

# 7. Home

- empty: "Complete your first check-in to build a score." (Implemented)
- partial data: Partial macro rings shown.
- missing data vs zero: `undefined` scores use empty states, but missing macros default to 0.

# 8. Training

- empty: "No workouts" empty state is implemented.
- insufficient history: "Complete a workout to start your volume trend."
- partial data: Partial volume history renders whatever points exist.

# 9. Active workout

- empty: "No active workout" empty state is implemented.
- conflict: Multiple workouts are not prevented by explicit conflict states.
- fatal render failure: Interrupted workouts are safely preserved in the store across reloads.

# 10. Fuel

- empty: "Log a meal to begin today's calorie progress." (Implemented).
- missing versus zero: `undefined` calories coerce to `0`, creating a significant data honesty risk in charts.
- partial data: Supported natively.

# 11. Recovery

- empty: "Complete a check-in to calculate readiness." (Implemented).
- missing data: Missing contributors explicitly render missing labels rather than 0.

# 12. Stats

- empty: "Add a goal to begin tracking progress." (Implemented).
- insufficient history: "Add two weigh-ins to reveal your trend." (Implemented).

# 13. Settings

- warning: Destructive modal for clearing data is implemented.
- error: Save failures (e.g. `localStorage` quotas) fail silently without UI feedback.
- success: Immediate UI reflection of updated settings.

# 14. Jarvis

- loading/thinking: (Absent) Jarvis runs synchronously or relies entirely on implicit waiting.
- error: Fails silently if microphone permissions are denied.

# 15. Loading and saving

- Both loading and saving are instantaneous UI state updates due to synchronous `localStorage` writes. Explicit "saving..." text or spinners are confirmed missing.

# 16. Success feedback

- Confirmed missing. There are no toasts, snackbars, or explicit success banners. Success is communicated implicitly by the form closing and the underlying list updating.

# 17. Warnings

- Implemented specifically for destructive actions (Reset App Data in Settings) using a modal confirmation.

# 18. Errors

- Confirmed missing. There is no user-facing error UI for storage failures, quota exceptions, or network failures.

# 19. Retry and recovery

- Confirmed missing. There are no explicit retry buttons.
- Recovery from corrupted data defaults to wiping the app back to `defaultState` during hydration.

# 20. Empty and insufficient-data states

- Widely and consistently implemented across all domains using the `EmptyState` component or specific text labels (e.g., "Add two weigh-ins...").

# 21. Missing versus zero

- Inconsistent. Recovery treats missing data honestly, but Nutrition coercing missing calories to zero creates a significant data honesty risk.

# 22. Offline and PWA states

- The application operates locally first. Offline banners are confirmed missing.
- Service worker caching acts seamlessly but lacks UI for update notifications (stale cache risk).

# 23. Corruption and fatal failures

- Corrupted JSON in `localStorage` is caught by a `try/catch` block in `src/lib/store.tsx`, but the fallback is silently replacing the user's data with `defaultState`, causing complete data loss without warning.

# 24. Accessibility of dynamic feedback

- Confirmed missing. Dynamic updates lack `aria-live` regions or status role announcements.

# 25. Test coverage

- E2E tests cover happy paths and basic empty states (`tests/e2e/home.spec.ts`).
- There are no UI component tests simulating storage quota failures or testing error boundaries.

# 26. Priority risk register

1.  **Silent Data Loss:** Malformed JSON hydration silently wipes all data via `defaultState` fallback.
2.  **Silent Save Failure:** Storage quota exceptions during synchronous writes throw uncaught exceptions, breaking UI state without warning.
3.  **Data Honesty:** Nutrition coercing missing calories to zero.

# 27. Future Data Safety integration questions

- How will synchronous UI forms handle pending states when migrations to async API calls occur?
- How will the app safely notify users of storage quotas before destructive overwrites?

# 28. Redesign acceptance checklist

- All domains must have actionable empty states.
- Missing values must not visually default to zero.
- Save operations must introduce error boundaries and UI feedback.
- Async mutations must block duplicate submissions.

# 29. Open questions

- How exactly does Safari Private Mode block the initial `localStorage` read during the `store.tsx` module initialization?

# 30. File index

- `src/lib/store.tsx`
- `src/lib/fitcore-data.ts`
- `src/components/app/views/*`
- `src/components/app/dashboard-layout.ts`
- `src/components/app/ui.tsx`
- `tests/e2e/home.spec.ts`
