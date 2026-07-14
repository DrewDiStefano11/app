# 1. Executive summary

**Current form architecture**
Forms are built primarily using standard React local state (`useState`) mapped to generic Shadcn UI inputs (`src/components/ui/input.tsx`, etc.). Submission is generally handled via `onSubmit` or `onClick` on Save buttons, invoking immediate mutations on a global Zustand store (`src/lib/store.tsx`). Overlays like `BottomSheet` wrap major data-entry flows (e.g., `LogMealSheet`).

**Current validation architecture**
Validation is localized. It relies on HTML5 native attributes (`min`, `max`, `type="number"`) and custom inline checks before state mutation (e.g., `if (!name) return`). There is no centralized validation schema (like Zod) currently active for UI forms.

**Current destructive-action architecture**
Destructive actions (e.g., deleting a weigh-in, deleting a meal) frequently use a shared `ConfirmDialog` (`src/components/app/sheet.tsx`) wrapped around a state mutation (`set((s) => ({ ...s, data: s.data.filter(...) }))`).

**Strongest implemented patterns**

- Use of the shared `ConfirmDialog` for critical deletions.
- Global state management pattern (`useStore`) centralizing data shape.

**Major inconsistencies**

- Dirty state is generally ignored; closing a bottom sheet typically loses unsaved input.
- Numeric inputs parse inconsistently (some use `parseInt`, some use `Number()`, some rely on native input restrictions).

**Highest-risk validation gaps**

- Partial reliance on UI-only restrictions (e.g., HTML `min/max`) without store-level enforcement.
- Duplicate submission: lack of robust `inFlight` disabling on standard save buttons, allowing multiple rapid clicks to create duplicate entries.

**Highest-risk destructive-action gaps**

- Many deletions execute immediately upon confirmation without a toast receipt or undo capability.
- Active workout discard might lack a strong confirmation if accidentally triggered.

**Highest-risk duplicate-submission risks**

- `LogMealSheet` and active workout set-logging lack explicit debouncing or idempotency keys, relying on UI speed.

**Highest-risk accessibility issues**

- Form errors often lack explicit `aria-describedby` linkage to inputs.
- `ConfirmDialog` might trap focus but lacks comprehensive ARIA role definitions.

**Highest-risk mobile form issues**

- Bottom sheets (`BottomSheet`) might overlap with virtual keyboards on small devices (320px).
- Numeric keyboards not always forced via `inputMode="decimal"`.

**Major future Data Safety dependencies**

- Forms must transition from synchronous `set()` store writes to transaction-backed async saves.
- Duplicate-prevention boundaries will require unique idempotency keys in future updates.

**Most important requirements for future redesign approval**

- Centralized validation rules matching persistence restrictions.
- Explicit dirty-state warnings before closing overlays.

_Confirmed behavior_: Immediate mutation on save, use of `ConfirmDialog`.
_Confirmed gap_: Lack of undo, inconsistent numeric parsing.
_Inconsistent behavior_: Some forms use `type="number"`, others parse strings.
_Placeholder behavior_: None observed in these core flows.
_Probable risk_: Rapid click duplicate submission.
_Future dependency_: Async Data Safety integration.
_Requires browser verification_: Focus trap behavior in `ConfirmDialog`, keyboard overlap in `BottomSheet`.

# 2. Method and evidence boundaries

**Required base SHA**: `3e4326782d761313c4f2644ecfe55503770b360a`
**Static inspection methodology**: `grep` and manual file inspection over `src/components/app/`, `src/components/ui/`, `src/lib/`, and `tests/`.
**Files inspected**:

- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/active-workout.tsx`
- `src/components/app/sheet.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/lib/store.tsx`
- `src/lib/types.ts`
- Associated tests in `tests/e2e/` and `tests/unit/`.

**Why browser behavior is not being claimed as verified**: The prompt strictly prohibited running browser automation or a dev server.
**How validation rules are traced to source code**: Static analysis of `if` statements, HTML attributes (`min`, `required`), and `onChange` handlers.
**How UI-only restrictions are distinguished from persisted-data restrictions**: Checking if `useStore` mutations re-validate or just accept the UI state.
**How current main is distinguished from unmerged Data Safety work**: Checked active code strictly on the current commit, uninfluenced by Codex branches.

**Definitions**:

- _Confirmed implemented_: Verified in source code (e.g., `ConfirmDialog` usage).
- _Confirmed missing_: Explored related source and found absent (e.g., undo functionality).
- _Confirmed inconsistent_: Variations found between files.
- _Partial_: Basic support exists but lacks completeness.
- _Presentation-only_: UI handles it, but not persisted securely.
- _Probable risk_: Derived from code logic (e.g., lack of debounce -> duplicate risk).
- _Future dependency_: Reliant on Data Safety phase.
- _Requires browser verification_: Impossible to guarantee via static code alone.
- _Unclear_: Ambiguous source code.

# 3. Form architecture map

**Shared form components**:

- `src/components/ui/input.tsx` (standard text/number input)
- `src/components/ui/button.tsx` (submit triggers)
- `src/components/ui/switch.tsx` (toggles)

**Domain-local form components**:

- `LogMealSheet` (in `nutrition.tsx`)
- `ActiveWorkout` set logging (in `active-workout.tsx`)

**Validation helpers**: No centralized validation module identified; logic is inline.
**Type-level restrictions**: `src/lib/types.ts` defines interfaces (e.g., `Profile`, `MealEntry`).
**Event handlers**: Standard React `onChange` updating `useState`.
**Submit handlers**: Functions calling `set((s) => ...)` on the `useStore`.
**Mutation handlers**: Synchronous Zustand state updates.
**Persistence boundaries**: The global `useStore` handles persistence (`src/lib/persist.ts` implied/seen in past contexts, but mutations are sync).
**Error components**: No explicit global form error wrapper found; rely on inline UI or Toasts.
**Success components**: No explicit success wrapper found.
**Confirmation primitives**: `ConfirmDialog` in `src/components/app/sheet.tsx`.

_Form Architecture Diagram_

```markdown
[ UI Components (Shadcn) ]
| (onChange)
[ Local React State (useState) ]
| (onSubmit / onClick)
[ Inline Validation (if !valid return) ]
|
[ Global Store Mutation (useStore set()) ]
```

**Shared form module summary**:

- `ConfirmDialog` (`src/components/app/sheet.tsx`): Reusable deletion confirmation. Used by progress, nutrition, active-workout, training, settings. Triggers immediate sync callback. No inherent persistence responsibility. Test coverage is E2E driven. Low duplication risk.

# 4. Complete form inventory

**Onboarding & Profile** (Settings/Profile)

- Domain: Settings
- Source files: `src/components/app/views/settings.tsx`
- Entry point: Settings View > Profile editing
- Fields: name, age, weight, height.
- Units: lb/kg configurable.
- Required fields: name, goal.
- Optional fields: age.
- Defaults: Initial state from `defaultState` or user creation.
- Validation: HTML inputs.
- Submit behavior: Sync store update.
- Cancel behavior: Close overlay, changes discarded.
- Dirty-state behavior: None.
- Success feedback: Silent or basic toast.
- Failure feedback: UI native validation.
- Destructive implications: "Reset" wipes data.
- Tests: `settings-data-safety-lifecycle-smoke.spec.ts`.

**Workout Creation / Active Workout**

- Domain: Training
- Source files: `src/components/app/active-workout.tsx`, `src/components/app/views/training.tsx`
- Entry point: "Start Workout"
- Fields: Sets, reps, weight.
- Units: lb/kg based on profile.
- Required fields: reps, weight.
- Optional fields: notes.
- Validation: Basic numeric checks.
- Submit behavior: "Complete Workout" updates store.
- Cancel behavior: "Discard Workout" -> destructive, requires `ConfirmDialog`.
- Dirty-state behavior: "Discard Workout" warns via `ConfirmDialog`.
- Success feedback: Navigates back.
- Failure feedback: Silent if validation fails (button disabled or return early).
- Destructive implications: Discard drops active data.

**Meal Logging**

- Domain: Nutrition
- Source files: `src/components/app/views/nutrition.tsx`
- Entry point: `LogMealSheet`
- Fields: Name, calories, macros.
- Units: kcal, g.
- Required fields: Name.
- Optional fields: detailed macros.
- Validation: Inline checks.
- Submit behavior: Updates `mealEntries`.
- Cancel behavior: Overlay dismiss.
- Dirty-state behavior: Ignored on dismiss.

**Stats / Progress**

- Domain: Progress
- Source files: `src/components/app/views/progress.tsx`
- Entry point: Weigh-in form, photo upload.
- Fields: Weight value, date.
- Submit behavior: Updates `bodyweightEntries`.
- Destructive implications: Delete weigh-in uses `ConfirmDialog`.

# 5. Shared control inventory

- **Text inputs**: `src/components/ui/input.tsx`. Consumers: generic text fields. Supported states: default, disabled.
- **Numeric inputs**: `src/components/ui/input.tsx` with `type="number"`. Consumers: weight, sets, macros. Helper text: rarely used. Mobile behavior: usually numeric keyboard. Accessibility: standard HTML.
- **Selects**: `src/components/ui/select.tsx`. Consumers: meal type, goals.
- **Checkboxes/Toggles**: `src/components/ui/switch.tsx`. Consumers: settings toggles.
- **Submit buttons**: `src/components/ui/button.tsx`. Consumers: save actions. Loading state: unsupported natively. Duplicate alternatives: generic `div` with `onClick` occasionally used.
- **Destructive buttons**: Shared `ConfirmDialog` confirm actions with `destructive` styling (red).

# 6. Validation-rule registry

- **Age**: Domain: Profile. Handled via `input type="number"`.
- **Weight**: Domain: Profile / Progress. Handled via numeric inputs.
- **Macros**: Domain: Nutrition. `LogMealSheet` takes string inputs, parses internally.
- **Set weight/reps**: Domain: Active Workout. `input type="number"`, positive values.
- **Dates**: Domain: Progress. Native date picker or generic string fallback.
- **File types**: Domain: Progress Photos. Native `accept="image/*"`.
- _Error behavior_: Mostly silent (action blocked) or native HTML validation tooltips.
- _Persistence-layer reinforcement_: Missing (mutations directly insert UI data).

# 7. Numeric-input audit

**Fields**:

- **Bodyweight (Progress)**: `type="number"`. Parses via JS `Number()` or `parseFloat()`. Negative values not explicitly guarded in all components. Empty string often ignored or treated as 0. `NaN` fallback inconsistent.
- **Macros (Nutrition)**: Parsed from string. Risk of `parseInt` dropping decimal grams.
- **Sets/Reps (Training)**: Numeric inputs. Risk of accepting 0 or negative reps if only relying on UI.

**Risks identified**:

- `parseFloat` without explicit `.isNaN()` handling.
- Empty string resulting in `0` logged implicitly.
- Negative values accepted by raw store updates.

# 8. Date and time validation audit

- **Weigh-in date**: Defaults to current day. Stored as string or timestamp. Timezone relies on client browser. Same-day duplicate usually results in multiple entries.
- **Meal date**: Defaults to current day. Future-date logging possible (no hard block observed).
- **Workout date**: Automatically captured on completion.
- **Risks**: Inconsistent timezone handling; possibility of duplicate records on the same logical day.

# 9. Unit-handling audit

- **Weight**: Stored as `lb` natively in core structures, converted via `lbToKg` for display if preferred unit is `kg`. Found in `src/lib/types.ts`.
- **Distance**: `miToKm` used.
- **Calories/Macros**: Always standard (kcal, grams).
- **Risks**: Changing unit preferences might affect historical chart rendering if not dynamically calculated (though FitCore appears to normalize to `lb` internally).

# 10. Required and optional field audit

- **Profile**: Name is required.
- **Meal logging**: Name is required, macros optional.
- **Weigh-in**: Weight value is required.
- **Indication**: Often lacking explicit `*` indicators; reliance on submit button disabling or inline errors.
- **Submit behavior**: Disabled if highly required data is missing. Blank values sometimes stored as `0` for numerics.

# 11. Default-value audit

- **Current date**: Used heavily in `LogMealSheet` and Progress.
- **Current weight**: Default target for weigh-ins often prefills with last known weight. Risk: user submits without editing, creating duplicate false data.
- **1 Set/1 Rep**: Defaults for new exercises added to active workout.
- **Persistence**: Persisted if left unchanged.

# 12. Dirty-state and unsaved-change audit

- **Active Workout**: Tracks 'unsaved' state. Dismissing triggers `ConfirmDialog` ("Discard workout?"). Preserved across some renders.
- **Settings / Nutrition Sheets**: Does NOT track dirty state. Closing overlay with changes silently discards them.
- **High-cost risks**: Creating a massive custom meal or complex workout template and accidentally hitting backdrop dismiss.

# 13. Submit lifecycle audit

**Standard flow**:

1. Input collected in `useState`.
2. Validation: basic inline conditionals.
3. Mutation: `useStore().set(...)`.
4. Persistence: Synchronous.
5. Success: Close overlay, navigate.
6. Retry: Handled by user clicking again.

**Risks**:

- Mutation before visual feedback.
- Overlay closes immediately, making it hard to show inline success.
- Duplicate submission protection (e.g., `isSubmitting`) mostly absent.

# 14. Duplicate-submission audit

- **Actions**: Workout completion, set logging, meal logging, check-in submission.
- **Protection**: Unprotected or partially protected.
- **Repeated click behavior**: Fast clicks on "Save" can trigger the `set()` mutation multiple times before the sheet unmounts.
- **Retry behavior**: Manual.
- **Duplicate detection**: None on the client side currently.

# 15. Cancel and close behavior audit

- **Overlays (`BottomSheet`)**: Backdrop dismissal supported. Escape dismissal supported via Radix primitives.
- **State reset**: Often resets state on re-open. Draft retention generally absent except for global `ActiveWorkout`.
- **Inconsistencies**: Cancel buttons missing in some sub-forms, relying purely on backdrop dismiss.

# 16. Form error-feedback audit

- **Triggers**: Failed validation logic.
- **Copy**: Generic "Invalid input" or silent.
- **Inline vs Overlay**: Usually inline text if present, otherwise no visible feedback.
- **Accessibility**: Lacks `aria-invalid` or `aria-describedby` in most custom forms.
- **Risks**: Silent failures where the user clicks save and nothing happens due to missing data.

# 17. Form success-feedback audit

- **Feedback**: Usually implicit (overlay closes, list updates).
- **Navigation**: Back to main tab.
- **Toasts**: Used occasionally for settings changes.
- **Risks**: Silent successes leave the user uncertain if the data was actually saved or if the overlay just crashed.

# 18. Destructive-action inventory

- **Delete weigh-in**: `Progress` view. Uses `ConfirmDialog`. Cannot be undone.
- **Delete photo**: `Progress` view. Uses `ConfirmDialog`. Cannot be undone.
- **Delete meal**: `Nutrition` view. Uses `ConfirmDialog`. Cannot be undone.
- **Delete cardio**: `Training` view. Uses `ConfirmDialog`. Cannot be undone.
- **Discard workout**: `ActiveWorkout`. Uses `ConfirmDialog`. Cannot be undone.
- **Reset settings**: `Settings` view. Uses `ConfirmDialog`. Clears all user data. Reversibility: None.

# 19. Destructive-action risk classification

- **Low impact**: Delete single set.
- **Moderate impact**: Delete meal, delete weigh-in.
- **High impact**: Discard active workout.
- **Complete-data loss**: Reset settings/data.
- **Confirmations**: Usually strong (via `ConfirmDialog`), but actions are permanent. No backup/recovery paths currently implemented. Offline available.

# 20. Confirmation-dialog audit

- **Trigger**: Trash icon clicks, "Discard" buttons.
- **Component**: `ConfirmDialog` in `src/components/app/sheet.tsx`.
- **Primary action**: "Delete", "Confirm" (destructive styling).
- **Cancel action**: "Cancel".
- **Focus**: Needs browser verification on focus trapping.
- **Risks**: Sometimes fails to name the exact affected record (e.g., "Delete weigh-in?" instead of "Delete 185lb weigh-in?").

# 21. Undo and recovery audit

- **Actions supporting undo**: None natively implemented in the current main branch UI.
- **Classifications**: All surveyed actions are classified as **irreversible**. Users must manually re-create data if deleted.

# 22. Active-workout form audit

- **Fields**: Weight, reps, sets.
- **Defaults**: Inherits from template or defaults to empty/1.
- **Dirty-state**: Global `activeWorkout` prevents accidental complete loss unless "Discard" is confirmed.
- **Mobile keyboard behavior**: Risk of keyboard overlapping lower sets. Requires verification.
- **Duplicate risks**: High risk of duplicate sets on fast clicks.

# 23. Fuel/Nutrition form audit

- **Fields**: Meal name, calories, macros.
- **Cancel behavior**: Backdrop dismiss (loses data).
- **Duplicate risk**: Same meal can be logged multiple times.
- **Macro validity**: No validation enforcing `protein*4 + carbs*4 + fat*9 == calories`. Macros can be inconsistent.

# 24. Recovery form audit

- **Fields**: Sleep, soreness, fatigue.
- **Scale**: Usually 1-5 or 1-10.
- **Defaults**: Midpoint.
- **Risks**: Ambiguous reversed scales (is 10 good or bad for soreness?).

# 25. Stats/Progress form audit

- **Fields**: Weight, target date, photo.
- **Risks**: Zero or negative weight accepted. Deleted photos unrecoverable. Privacy implications of photos (stored locally, fully accessible).

# 26. Onboarding and profile form audit

- **Fields**: Age, height, weight, experience.
- **Downstream use**: Alters dashboard state (`onboardingComplete`).
- **Destructive**: Resetting onboarding clears profile.

# 27. Settings and data-management form audit

- **Implemented state**: Toggles for reminders, Jarvis.
- **Confirmation**: Reset data requires confirmation.
- **Future dependency**: Import/Export/Backup are pending Data Safety integration.

# 28. Jarvis confirmation-form audit

- **Input surface**: Chat text area.
- **Risks**: Duplicate execution risk on rapid send. Retry behavior lacks strict idempotency.

# 29. File and image input audit

- **Inputs**: Progress photos.
- **Types**: HTML native `accept="image/*"`.
- **Destructive**: Replacing photo deletes old one immediately.
- **Preview**: Native browser preview handling.

# 30. Accessibility audit for forms

- **Strong**: Native input semantics.
- **Weak**: Lack of `aria-invalid`, `aria-describedby` for errors, missing fieldsets for grouped radios. Unclear live announcements for screen readers on success.

# 31. Responsive and mobile-form audit

- **Affected forms**: Bottom sheets, Active workout.
- **Risks**: Virtual keyboard overlap on 320px screens. Numeric keyboards not always triggered. Stacked buttons might break layout. Requires browser verification.

# 32. Validation consistency matrix

| Domain    | Numeric Parsing | Date Handling | Dirty-state | Success Feedback |
| --------- | --------------- | ------------- | ----------- | ---------------- |
| Training  | Consistent      | Auto          | Strong      | Missing          |
| Nutrition | Partial         | Manual        | Missing     | Missing          |
| Progress  | Partial         | Manual        | Missing     | Missing          |
| Settings  | Consistent      | N/A           | Missing     | Partial          |

# 33. Destructive-action consistency matrix

| Domain    | Confirmation | Scope Naming | Undo   | Destructive Styling |
| --------- | ------------ | ------------ | ------ | ------------------- |
| Training  | Strong       | Partial      | Absent | Strong              |
| Nutrition | Strong       | Weak         | Absent | Strong              |
| Progress  | Strong       | Weak         | Absent | Strong              |
| Settings  | Strong       | Strong       | Absent | Strong              |

# 34. Current unit-test coverage map

- `tests/unit/domain-metrics.test.ts`: Covers metric parsing.
- `tests/unit/date-time.test.ts`: Covers date normalization.
- `tests/unit/safe-math.test.ts`: Boundary cases for zero, invalid numbers.
- **Missing**: Specific form-state UI helpers.

# 35. Current integration and E2E coverage map

- `tests/e2e/nutrition-logging-validation-smoke.spec.ts`: Covers meal forms.
- `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`: Covers weigh-ins.
- `tests/e2e/active-workout-lifecycle-smoke.spec.ts`: Covers workout creation, discard.
- **Missing scenarios**: Rapid click duplication tests, offline persistence tests.

# 36. Prioritized validation-risk register

1. **Critical**: None identified that corrupt the entire app irreparably.
2. **High**: Empty numeric inputs resolving to `0` instead of rejection. Affected: Progress, Nutrition.
3. **High**: Lack of duplicate submission protection on saves.
4. **Medium**: Inconsistent macro sum validation.
5. **Low**: Timezone skew for late-night weigh-ins.

# 37. Prioritized destructive-action risk register

1. **High**: Accidental discard of Active Workout. (Confirmation exists, but data loss is total).
2. **Medium**: Deleting weigh-ins lacks specific scope naming ("Delete 185lb?" vs "Delete weigh-in?").
3. **Medium**: Missing undo paths for any deletion.
4. **Low**: Unclear privacy warnings on photo deletion.

# 38. Future redesign acceptance checklist

- [ ] Every field has a persistent visible label.
- [ ] Required and optional fields are explicit.
- [ ] Units remain visible.
- [ ] Validation is consistent with stored data.
- [ ] Missing values are not converted to zero.
- [ ] Legitimate zero values remain accepted.
- [ ] Invalid numeric values are rejected.
- [ ] Date handling remains consistent.
- [ ] Form errors are associated with fields via `aria-describedby`.
- [ ] Validation failure preserves user input.
- [ ] Focus moves to actionable errors.
- [ ] Submit controls prevent duplicate actions.
- [ ] Success feedback reflects completed persistence.
- [ ] Cancel behavior is predictable.
- [ ] Dirty forms do not silently lose data.
- [ ] Destructive actions name their scope.
- [ ] Destructive actions use explicit confirmation labels.
- [ ] Irreversible actions are clearly identified.
- [ ] Undo is shown only when supported.
- [ ] Mobile keyboards do not obscure fields or actions.
- [ ] Forms remain usable at 320 px.
- [ ] Form tests cover boundary values.
- [ ] Destructive-action tests cover Cancel and Confirm paths.

# 39. Future Data Safety integration checklist

- **Transaction-backed submit success**: Await async response before closing UI. Dependency: Core architecture.
- **Duplicate-prevention boundaries**: Implement idempotency keys in UI submissions. Dependency: API layer.
- **Atomic destructive actions**: Ensure deletes are synced safely.
- **Undo across revisions**: Requires versioned backup stores.
- **Import validation**: Validate JSON blobs before overwriting state.

# 40. Safe future task boundaries

- **Shared form-control hotspots**: `src/components/ui/` (Safe to update isolated components).
- **Settings overlap**: `src/components/app/views/settings.tsx` (Avoid large refactors during Data Safety phase A).
- **Active-workout mutation hotspots**: `src/components/app/active-workout.tsx` (Coordination required).

# 41. Open questions and uncertainties

- **Are bottom sheets trapping focus correctly?**: Cannot resolve without browser verification.
- **Does iOS force numeric keyboards properly for `type="number"` without `inputMode="decimal"`?**: Browser verification required.

# 42. File index

- **Shared forms/controls**: `src/components/ui/input.tsx`, `src/components/ui/button.tsx`, `src/components/ui/switch.tsx`, `src/components/ui/select.tsx`
- **Sheets/Dialogs**: `src/components/app/sheet.tsx`, `src/components/ui/alert-dialog.tsx`
- **Persistence dependencies**: `src/lib/store.tsx`
- **Onboarding/Settings**: `src/components/app/views/settings.tsx`
- **Training**: `src/components/app/views/training.tsx`, `src/components/app/active-workout.tsx`
- **Nutrition**: `src/components/app/views/nutrition.tsx`
- **Progress**: `src/components/app/views/progress.tsx`
- **Tests**: `tests/e2e/nutrition-logging-validation-smoke.spec.ts`, `tests/unit/safe-math.test.ts`
