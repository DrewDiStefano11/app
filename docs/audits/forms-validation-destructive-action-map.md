# 1. Executive summary

**State and form architecture**
FitCore’s form inputs rely on local React state (`useState`) to stage user input. Mutations are submitted synchronously to the global React Context store provided by `src/lib/store.tsx` via `createContext` and the `useStore()` consumer. It is not using Zustand.

**Persistence architecture**
The `store.tsx` module persists updates to localStorage by directly invoking `saveFitCoreData(next)` located in `src/lib/fitcore-data.ts`. This occurs during standard mutations, store resets, imports, and component mount hydration.

**Destructive actions and validation**
Validation is largely decentralized, utilizing inline parser coercions (`Number(e.target.value) || 0`) and standard HTML `<input>` constraints without a universal schema. Destructive actions rely on a shared `<ConfirmDialog>`, triggering direct filter mutations on the central context without explicit undo capabilities (except for distinct Jarvis conversational undo flows). Duplicate submissions lack formal `inFlight` guards in standard buttons.

# 2. Method and evidence boundaries

**Required base SHA**: `3e4326782d761313c4f2644ecfe55503770b360a`
**Methodology**: Comprehensive grep and manual inspection of the current source tree looking specifically for `<input>`, `<Select>`, `<Switch>`, `BottomSheet`, `ConfirmDialog`, `onSubmit`, `useStore()`, and `saveFitCoreData`. No speculative or unrendered components were mapped.
**Form discovery method**: Evaluated all domain views in `src/components/app/views/` and shared overlays in `src/components/app/` to inventory strictly the fields actively rendered to the DOM.

# 3. Store architecture

The application uses a custom React Context defined in `src/lib/store.tsx`.

- **Components**: `StoreProvider` wrapping the component tree.
- **Hooks**: `useStore` acts as the consumer to return `{ state, set, reset, replace }`.
- **Core logic**: Uses React's `useState`, `useCallback`, and `useMemo` to maintain and update the `AppState`.

# 4. Persistence architecture

Persistence is handled synchronously through `src/lib/fitcore-data.ts`.

- **Path**: `src/lib/store.tsx` imports `saveFitCoreData` from `src/lib/fitcore-data.ts`.
- **Triggers**: Invoked in the effect (`if (hydrated) saveFitCoreData(state)`), inside the core `set()` mutation (`saveFitCoreData(next)`), inside `reset()`, and inside `replace()`.

# 5. Shared form controls

- `src/components/ui/input.tsx` (wrapped `<input>`)
- `src/components/ui/textarea.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/select.tsx` (generic HTML `<select>` wrappers)
- `<BottomSheet>` (portaled sheet for focused data entry in `src/components/app/sheet.tsx`)
- `<ConfirmDialog>` (shared confirmation primitive)

# 6. Complete form inventory

**Onboarding** (`src/components/app/views/onboarding.tsx`):

- Fields actually rendered:
  - Main goal (`<Select>`)
  - Training experience (`<Select>`)
  - Days per week (`<Input type="number">`)
  - Preferred split (`<Select>`)
  - Current bodyweight (`<Input inputMode="decimal">`)
  - Target bodyweight (`<Input inputMode="decimal">`)
  - Calorie target (`<Input inputMode="numeric">`)
  - Protein target (`<Input inputMode="numeric">`)
  - Carbohydrate target (`<Input inputMode="numeric">`)
  - Fat target (`<Input inputMode="numeric">`)

**Settings** (`src/components/app/views/settings.tsx`):

- Rendered profile settings, units toggles, Jarvis preferences.

**Training creation & Active workout** (`src/components/app/active-workout.tsx`):

- Set logging (Weight, Reps, RPE via `<Input>`).
- Note logging (`<Textarea>`).

**Cardio** (`src/components/app/views/training.tsx`):

- Log cardio form (Distance, Duration, Intensity).

**Nutrition** (`src/components/app/views/nutrition.tsx`):

- Log meal sheet.
- Fields: Name (`<Input>`), Calories, Protein, Carbs, Fat.
- Type selector (`<Select>`).

**Recovery** (`src/components/app/views/recovery.tsx`):

- Daily check-in (Soreness, Fatigue via `<Slider>`).
- Sleep logging (Hours, Quality).

**Stats and Goals** (`src/components/app/views/progress.tsx`):

- Log weigh-in (Weight `Input`, Date `Input type="date"`).
- Photo upload (File `Input type="file"`).
- Add goal (`<Input>`, `<Select>`).

**Import and reset** (`src/components/app/views/settings.tsx`):

- Reset app data (Button triggering `<ConfirmDialog>`).
- Import data (File `<input type="file" accept=".json">`).

**Jarvis confirmations** (`src/components/app/jarvis/jarvis-panel.tsx`):

- Standard conversational chat input (`<Textarea>` or `<Input>`).

# 7. Validation-rule registry

_Example rules mapped from source:_

- **Onboarding Bodyweight**:
  - Exact label: "Current (lb)"
  - Source: `onboarding.tsx`
  - Input type: `<Input inputMode="decimal">`
  - Required status: implicitly yes (blocks progression visually).
  - Parser: `Number(e.target.value) || 0`
  - Min/Max: Native constraints absent on standard text/decimal inputs.
  - Custom validation: UI coercion only.
  - Persistence result: Saves immediately on "Continue".

- **Meal Logging Calories**:
  - Exact label: "Calories"
  - Source: `nutrition.tsx`
  - Parser: `parseInt` or `Number` coercion.
  - Failure behavior: Empty strings fall back to `0`.

# 8. Numeric fields

- Most inputs use standard `<Input>` wrappers.
- Keyboard hints are applied (e.g. `inputMode="decimal"`, `inputMode="numeric"`).
- Decimal parsing is mostly delegated to the browser.
- Fallback logic heavily leans on `|| 0`, leading to silent conversion of invalid inputs.

# 9. Date/time fields

- Weigh-in log: `<Input type="date">`. Default is usually inferred or left to the browser's current date string.
- No global cross-timezone normalizer identified strictly on the input mutation boundary.

# 10. Units

- Weight toggles (`lb` / `kg`) alter rendering layers. Mutations largely rely on user-facing numeric inputs which are persisted "as-is", relying on the view layer to honor the preference context when displaying.

# 11. Defaults and prefills

- Numeric defaults rely on `0`.
- Profile fields prefill with `defaultState.profile`.

# 12. Dirty state

- **Confirmed form state discarded on unmount**: For sheets like `LogMealSheet`, dismissing the backdrop loses the active `useState`.
- **Confirmed draft preservation**: The `activeWorkout` object in Context acts as a persistent global draft.
- **No explicit dirty-state warning**: Closing most data entry sheets fails to warn the user of lost text.

# 13. Submit lifecycle

1. UI component invokes Context `set( (s) => {...} )`.
2. Context hook executes `saveFitCoreData(next)`.
3. UI closes bottom sheet automatically via `onClose()`.

# 14. Duplicate-submission protections and risks

- **No explicit in-flight guard**: Standard Submit buttons lack an `isSubmitting` or `inFlight` ref guard to disable the button.
- **Structural duplicate risk**: A rapid succession of pointer events before the React component unmounts could push identical payload objects into the Context array (e.g., duplicated meals or sets).

# 15. Cancel and close behavior

- Overlays close on backdrop click (discarding UI state).
- `<ConfirmDialog>` cancels safely without modifying context.

# 16. Error feedback

- Missing centralized error styling. Validation usually results in silent termination of the submit handler.

# 17. Success feedback

- Overlays mostly unmount implicitly on success. Toasts (`sonner`) used sparingly.

# 18. Destructive-action inventory

- **Discard active workout** (`src/components/app/active-workout.tsx`):
  - Trigger: "Discard workout" button.
  - Location: Active workout view.
  - Confirmation: `<ConfirmDialog>`
  - Mutation: `set((s) => ({ ...s, activeWorkout: null }))`
  - Persistence: Yes, synchronous.
- **Delete cardio** (`src/components/app/views/training.tsx`):
  - Trigger: Delete button in detail sheet.
  - Confirmation: `<ConfirmDialog title="Delete cardio entry?">`
  - Mutation: `cardioEntries.filter(...)`
- **Delete meal** (`src/components/app/views/nutrition.tsx`):
  - Trigger: Delete button.
  - Confirmation: `<ConfirmDialog>`
  - Mutation: `mealEntries.filter(...)`
- **Delete weigh-in** (`src/components/app/views/progress.tsx`):
  - Trigger: Trash icon in history.
  - Confirmation: `<ConfirmDialog title="Delete weigh-in?">`
  - Mutation: `bodyweightEntries.filter(...)`
  - _Conclusion: Historical weigh-in deletion currently exists in source code._
- **Delete progress photo** (`src/components/app/views/progress.tsx`):
  - Trigger: Delete button on photo detail.
  - Confirmation: `<ConfirmDialog title="Delete photo?">`
  - Mutation: `progressPhotos.filter(...)`
- **Reset all data** (`src/components/app/views/settings.tsx`):
  - Trigger: "Reset app data" button.
  - Confirmation: `<ConfirmDialog>`
  - Mutation: `reset()` context method.
- **Import overwrite behavior** (`src/components/app/views/settings.tsx`):
  - Trigger: File upload `<input type="file">`.
  - Mutation: `replace(data)`.

# 19. Confirmation matrix

| Action          | Explicit Label | Scope explicit | Guard type        |
| --------------- | -------------- | -------------- | ----------------- |
| Discard workout | Discard        | No             | `<ConfirmDialog>` |
| Delete weigh-in | Delete         | No             | `<ConfirmDialog>` |
| Delete photo    | Delete         | No             | `<ConfirmDialog>` |
| Delete cardio   | Delete         | No             | `<ConfirmDialog>` |
| Reset data      | Reset          | App-wide       | `<ConfirmDialog>` |

# 20. Undo and recovery matrix

- **Ordinary manual domain deletion**: Irreversible (no undo).
- **Jarvis action undo**: Jarvis provides distinct `undone: true` patching workflows via `JarvisAuditStatus`.
- **Active workout draft preservation**: Stays active in Context until completed or discarded.
- **Import rollback**: Absent.
- **Reset recovery**: Absent.

# 21. Accessibility static evidence

- Forms lack explicit `aria-describedby` error bindings.
- Confirmation dialogues are standard React portals but lack complex ARIA tagging for deeply nested children.

# 22. Mobile static evidence

- Touch targets and bottom-sheet sizing (`height="tall"`) indicate mobile-first CSS architecture.
- Structural risk of keyboard overlapping inputs in tall sheets requires browser verification.

# 23. Test coverage

- `tests/e2e/nutrition-logging-validation-smoke.spec.ts`
- `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`
- `tests/e2e/settings-data-safety-lifecycle-smoke.spec.ts`
- Test suites cover structural validation but do not broadly cover duplicate submission resilience.

# 24. Future integration questions

- How will the synchronous Context mutations adapt to Data Safety async models?
- What idempotency mechanisms will prevent the structural duplicate submission risks?

# 25. Preservation checklist

- Maintain `<ConfirmDialog>` abstraction for critical deletions.
- Persist the global `activeWorkout` context object as a draft model.
- Maintain existing `inputMode` mobile keyboard optimizations.

# 26. Open questions

- Will Data Safety introduce a global undo buffer for standard domain deletions outside Jarvis?

# 27. File index

- `src/lib/store.tsx`
- `src/lib/fitcore-data.ts`
- `src/components/app/views/onboarding.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/active-workout.tsx`
- `src/components/app/sheet.tsx`
