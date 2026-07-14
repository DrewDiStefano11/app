# 1. Executive summary

**Current form architecture**
FitCore's forms rely heavily on React local state (`useState`) managing input fields (`<input>`, `<textarea>`, Shadcn components). Submissions directly update a global application store (managed via `useStore` referencing Zustand, persisting via `persist.ts` caching to `localStorage`). Major flows are housed in `BottomSheet` portaled overlays.

**Current validation architecture**
Validation across the app is UI-bound and decentralized. Handlers in components check conditions (e.g. `!name`) before updating `useStore`. There is no global validation layer guarding the store mutations.

**Current destructive-action architecture**
Destructive paths (e.g., discarding an active workout, deleting custom meals, deleting historical weigh-ins, clearing user data) use a shared `<ConfirmDialog>` component (`src/components/app/sheet.tsx`) to intercept the UI intent, mutating the global state synchronously upon confirmation.

**Methodology Corrections vs Previous Audit**
Removed speculative fields (e.g., custom form logic not actually mounted) and removed claims of a formal Data Safety structure not yet present in the branch. Checked the exact `useStore` boundaries to clarify "Zustand" is the backing architecture. Duplicate submission protections were analyzed actively by checking for `inFlight` refs or disabled states (most are unprotected).

# 2. Method and evidence boundaries

**Required base SHA**: `3e4326782d761313c4f2644ecfe55503770b360a`
**Static inspection methodology**: Comprehensive `grep` of `src/` to identify `<form>`, `<input>`, `<Select>`, `<BottomSheet>`, `<ConfirmDialog>`, and their associated `useState` + `useStore` hooks.
**Files inspected**: `src/components/app/views/*.tsx`, `src/components/app/active-workout.tsx`, `src/components/app/sheet.tsx`, `src/lib/store.tsx`.
**How validation rules are traced**: Evaluated the event handlers (e.g., `onClick` on submit buttons) and HTML attributes (e.g., `min`, `type="number"`).

**Definitions**:

- _Confirmed implemented_: Feature is visible and connected in `main` code.
- _Confirmed missing_: Explored related source and found absent.
- _Structural duplicate-submission risk_: Form lacks disable guards on submit logic.
- _Presentation-only_: UI visually tracks it, but store does not persist or enforce it.

# 3. State and form architecture

**Import paths & hooks**:

- `import { useStore } from "@/lib/store"`
- `import { BottomSheet, ConfirmDialog } from "@/components/app/sheet"`
- State mutations use `set((s) => ({ ...s, ... }))`

**Mutation functions**: Direct synchronous updates via Zustand's setter.
**Persistence functions**: Store updates are captured via an implied subscriber (likely `localStorage`) in `persist.ts`.

# 4. Shared form controls

**Controls**:

- `input` (text, number, date)
- `textarea`
- Shadcn UI: `<Switch>`, `<Slider>`, `<Select>`, `<Button>`.
- Core Overlays: `<BottomSheet>`, `<ConfirmDialog>`.

# 5. Complete form inventory

**Onboarding** (`src/components/app/views/onboarding.tsx`):

- Fields: name, age, weight, height, goal, unit preferences.
- Controls: text input, select, switches.

**Settings/Profile** (`src/components/app/views/settings.tsx`):

- Fields: Editable variations of onboarding data, notification preferences.

**Workout Creation & Active Workout** (`src/components/app/active-workout.tsx`):

- Fields: exercise selection, set logging (weight, reps, RPE).
- Form flow: Inherits from custom templates or scratch.

**Meal Logging** (`src/components/app/views/nutrition.tsx`):

- Fields: name (text), calories (number), macros (number).

**Recovery Check-in** (`src/components/app/views/recovery.tsx`):

- Fields: sleep (hours, quality), soreness, fatigue.
- Controls: `<Slider>`, inputs.

**Stats/Progress** (`src/components/app/views/progress.tsx`):

- Fields: weigh-in (numeric), progress photo (file input).

# 6. Validation-rule registry

- **Age/Weight/Height (Onboarding/Settings)**:
  - Type: `<input type="number">`
  - Required: Mostly yes (UI blocks progression).
  - Validation: UI-only HTML constraints. No persistence-layer validation.
- **Set Weight/Reps (Active Workout)**:
  - Type: `<input type="number">`
  - Initial: 0 or previous.
  - Validation: basic parsing via inline functions; missing hard guards in store.
- **Meal Macros (Nutrition)**:
  - Type: `<input>` for string parsing.
  - Validation: parser fallback handling (e.g. parsing empty string to 0).

# 7. Numeric-input audit

- **Parsers**: Reliance on implicit JavaScript conversions (`parseFloat`, `Number()`) directly inside `set()` callbacks.
- **Empty strings**: Usually default to `0` instead of rejecting.
- **Negatives**: Some forms lack `min="0"`, allowing negative state into the store.
- **UI-only validation**: Many numeric limits exist purely as HTML properties, not enforced by `store.tsx`.

# 8. Date/time audit

- **Weigh-ins/Meals/Workouts**: Date values typically default to "today".
- **Validation**: Handled via browser-native `<input type="date">`. Timezones are browser-dependent.
- **Absent validation**: No strict server-side chronologically bounded validation (e.g., logging workouts 10 years in the future is possible).

# 9. Unit-handling audit

- **Weight**: Profile settings define `lb` vs `kg`. Store defaults largely treat standard values uniformly but display layers convert using `kgToLb` / `lbToKg` utilities.
- **Distance**: `mi` vs `km`.
- **Validation**: Display unit switching does not natively validate or re-calculate historical persistence integrity—it relies on view-layer maths.

# 10. Required and optional fields

- **Required**: Onboarding name, meal log name, weigh-in value.
- **Optional**: Photo descriptions, specific macros.
- **Issue**: Form submission handlers often fail silently (e.g., `if (!value) return`) leaving the user without an error toast.

# 11. Defaults and prefills

- Defaults aggressively populate with current date/time or historical baselines (e.g., previous weigh-in).
- Risk: Quick tapping "Save" can log duplicated identical data entries accidentally.

# 12. Dirty state

- **Confirmed missing**: Overlays like `<BottomSheet>` generally lack explicit dirty-state checks. Dismissing the backdrop discards unsubmitted form state.
- **Draft retained**: The global `activeWorkout` object inherently acts as a persistent draft for training.

# 13. Submit lifecycle

1. UI interaction (`onChange`).
2. Submit trigger (`onClick` on `<Button>`).
3. Inline validation check.
4. Synchronous store mutation `set()`.
5. Overlay close (`onClose()`).
6. Re-render.

# 14. Duplicate-submission protections and risks

- **No explicit in-flight guard**: Form submit handlers usually lack `isSubmitting` disable states because mutations are synchronous.
- **Structural duplicate-submission risk**: If a user clicks rapidly before the React render cycle unmounts the component, multiple identical state arrays can be pushed (e.g. logging a meal twice).
- Requires runtime verification to confirm severity.

# 15. Cancel and close behavior

- Close icons and backdrop clicks generally dismiss overlays.
- `<ConfirmDialog>` cancels return safely to the previous layer.
- Dirty data loss is highly likely upon dismiss.

# 16. Error feedback

- Missing centralized error styling for form fields (`aria-invalid` not comprehensively used).
- Validation blocks execution without explaining why (silent failure).

# 17. Success feedback

- Overlays mostly close silently upon success.
- Toasts (`src/components/ui/sonner.tsx`) are used inconsistently.

# 18. Complete destructive-action inventory

- **Discard Active Workout** (`src/components/app/active-workout.tsx`):
  - Trigger: "Discard workout" button.
  - Confirmation: `<ConfirmDialog>` with destructive styling.
  - Mutation: Clears `activeWorkout` state.
- **Delete Weigh-in** (`src/components/app/views/progress.tsx`):
  - Trigger: Delete button in weigh-in detail.
  - Confirmation: `<ConfirmDialog title="Delete weigh-in?">`.
  - Scope: The specific target `id`.
  - Mutation: Filters `bodyweightEntries`.
- **Delete Photo** (`src/components/app/views/progress.tsx`):
  - Trigger: Delete button on photo.
  - Confirmation: `<ConfirmDialog>`.
  - Mutation: Filters `progressPhotos`.
- **Delete Meal** (`src/components/app/views/nutrition.tsx`):
  - Confirmation: `<ConfirmDialog>`.
  - Mutation: Filters `mealEntries`.
- **Delete Cardio** (`src/components/app/views/training.tsx`):
  - Confirmation: `<ConfirmDialog>`.
  - Mutation: Filters `cardioEntries`.
- **Reset All Data** (`src/components/app/views/settings.tsx`):
  - Trigger: Settings reset toggle/button.
  - Confirmation: `<ConfirmDialog>`.
  - Mutation: Restores `defaultState`.

# 19. Confirmation matrix

| Domain    | Action          | Explicit Label | Focus Trapping                |
| --------- | --------------- | -------------- | ----------------------------- |
| Progress  | Delete weigh-in | Yes            | Requires browser verification |
| Progress  | Delete photo    | Yes            | Requires browser verification |
| Nutrition | Delete meal     | Yes            | Requires browser verification |
| Training  | Delete cardio   | Yes            | Requires browser verification |
| Training  | Discard workout | Yes            | Requires browser verification |
| Settings  | Reset data      | Yes            | Requires browser verification |

# 20. Undo and recovery matrix

- **Undo functionality is completely absent** from current persistence methods.
- **Recoverability**: Requires manual re-entry by the user for all deleted objects.

# 21. Accessibility static evidence

- `<form>` tags are rarely utilized.
- Inputs often lack formal `id` bindings to `<label>`.
- Errors lack `aria-describedby`.
- Shared `BottomSheet` lacks explicit `role="dialog"` applied via root standard (uses portaled DOM injection).

# 22. Mobile static evidence

- `<BottomSheet>` height variants (`height="tall"`) present.
- Overlapping virtual keyboards are a structural risk (requires browser verification).
- Inputs rely on standard `<input type="number">` instead of `inputMode="decimal"` for native number pads.

# 23. Test coverage

- `tests/e2e/nutrition-logging-validation-smoke.spec.ts` covers meal form UI interactions.
- `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts` covers weigh-in flows.
- Tests do not heavily verify missing undo paths or rapid-duplicate submission edges.

# 24. Future Data Safety integration questions

- How will synchronous `set()` calls adapt to asynchronous atomic transactions?
- Will destructive mutations require historical versioning?
- How will the system implement idempotency keys for form duplications?

# 25. Preservation checklist

- Maintain `ConfirmDialog` usage on all new destructive pathways.
- Enforce explicit `aria-label` / `aria-describedby` when re-writing forms.
- Do not add fake default units to numeric parsers.
- Retain global `activeWorkout` draft protection.

# 26. Open questions

- Does `<ConfirmDialog>` natively trap focus on all mobile browsers?
- Will Data Safety introduce native "Undo" functionality?

# 27. File index

- `src/components/app/views/onboarding.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/active-workout.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/sheet.tsx`
- `src/lib/store.tsx`
