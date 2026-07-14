# 1. Executive summary

This report summarizes the static accessibility and responsive-gap audit for the post-Analytics main branch. The current UI shows significant implementation gaps in semantic structure, keyboard accessibility, and basic responsive layout behaviors, especially for mobile devices. Primary interactive patterns (charts, heatmaps, bottom sheets, form error handling) are missing robust non-visual alternatives. Most complex interactions rely heavily on pointer-based controls and visual layout without intentional degradation on small screens or semantic representation.

## Current accessibility maturity

Low. Core structural landmarks are often missing or misused (e.g. `span` instead of `h1`). Form controls lack programmatic labels. Custom popups and bottom sheets do not effectively trap focus. Color and visual charts are frequently the only way data is communicated.

## Current responsive maturity

Low-to-Medium. Broad grid structures exist, but small screen (320px-390px) behavior is mostly unhandled, leading to high overflow and clipping risks in data-dense areas (tables, charts). The bottom navigation and safe areas are inconsistently protected against keyboard interactions.

## Strongest implemented patterns

- **Base Primitives:** Core Shadcn UI primitives like `Button`, `Input`, and `Select` have reasonable baseline accessibility (keyboard support).
- **Desktop Navigation:** Navigation functions reasonably well on wide screens.

## Most serious confirmed gaps

- Focus trapping is missing on custom popups and bottom sheets (e.g., in `src/components/app/popups/`).
- Data charts and the body heatmap (`src/components/app/body-heatmap.tsx`) rely solely on pointer interactions and color without accessible text alternatives or keyboard navigability.
- No keyboard alternative for active workout set reordering.
- Form fields in Nutrition and Recovery lack explicit `label` associations.

## Most serious probable risks requiring later browser validation

- Keyboard overlap obscuring critical inputs on mobile devices.
- 320px truncation and horizontal overflow on dense tables.
- Contrast ratios on muted texts over gradients.
- Safe-area overlap on fixed-positioned items.

## Major inconsistencies across domains

While `Progress` uses dense charts, `Training` uses complex nested controls. There is no unified pattern for dealing with these on small screens. Error handling in forms is visually handled differently across Settings, Fuel, and Recovery.

## Major shared-component risks

The `BottomSheet` and shared popups lacking focus management affect all domains, presenting a widespread accessibility trap.

## Major mobile risks

Virtual keyboard covering inputs in bottom sheets. Overflow on 320px screens.

## Major desktop risks

Overflow limits not enforced on some data-heavy views. Too much whitespace unmanaged on ultra-wides.

## Most important requirements for future redesign approval

Focus trapping, keyboard alternatives for complex controls (heatmaps, active workouts), and explicit handling of 320px viewports. Form label association is mandatory.

# 2. Method and evidence boundaries

- **Required base SHA:** 3e4326782d761313c4f2644ecfe55503770b360a
- **Methodology:** Static code-and-test inspection only. No browser verification, visual rendering tools, screen readers, or browser automation were used.
- **Files Inspected:** Core application surfaces in `src/components/app`, `src/components/ui`, layout primitives, active popups, and the `tests/e2e` and `tests/unit` directories.
- **Why browser behavior is not claimed:** This is a static analysis audit. Findings about visual clipping, screen reader announcements, or virtual keyboard interactions are derived purely from code (e.g., missing `aria-live`, missing explicit safe-area variables, missing programmatic focus calls) and must be verified in a real environment.
- **How findings are classified:**
  - **Confirmed implemented:** Present explicitly in the source code or proven by an existing automated test.
  - **Confirmed missing:** Explicitly absent from the source code where expected (e.g., `<button>` lacking `aria-label` or visible text).
  - **Confirmed inconsistent:** Implemented differently across similar components.
  - **Probable risk:** Source code structure suggests a high likelihood of failure (e.g., fixed widths on mobile), but actual impact depends on content length or device rendering.
  - **Requires browser verification:** Behavior depends on OS-level or dynamic rendering that static code cannot definitively prove (e.g., virtual keyboard pushing content).
  - **Not applicable:** Does not apply to the specific component.
  - **Unclear:** Static code is too abstracted or complex to definitively assess without runtime context.
- **How code evidence differs from test evidence:** Code evidence shows intent (e.g. presence of `aria-hidden`), whereas test evidence (like Playwright assertions) proves behavior in a headless browser, which still falls short of manual screen reader testing.
- **How probable responsive risks are identified:** By inspecting CSS classes (e.g., absence of `flex-wrap`, absence of `min-w`, reliance on `w-full` in dense contexts, hardcoded heights without overflow handling).

# 3. Surface inventory

| Surface                  | Route/Entry | Source                                       | Primary Controls | Overlays    | Tests                                                    | Acc. Complexity | Resp. Complexity | Audit Priority |
| ------------------------ | ----------- | -------------------------------------------- | ---------------- | ----------- | -------------------------------------------------------- | --------------- | ---------------- | -------------- |
| Fuel/Nutrition Daily     | Tab         | `src/components/app/views/nutrition.tsx`     | Forms, buttons   | Sheets      | `tests/e2e/nutrition-daily-view-panels-smoke.spec.ts`    | Medium          | Medium           | High           |
| Fuel/Nutrition Deep Dive | Tab         | `src/components/app/views/nutrition.tsx`     | Tabs, charts     | None        | `tests/e2e/rich-state-all-tabs-smoke.spec.ts`            | High            | High             | High           |
| Recovery Daily           | Tab         | `src/components/app/views/recovery.tsx`      | Sliders, inputs  | Sheets      | `tests/e2e/recovery-check-in-validation-smoke.spec.ts`   | Medium          | Medium           | High           |
| Recovery Deep Dive       | Tab         | `src/components/app/views/recovery.tsx`      | Tabs, charts     | None        | `tests/e2e/rich-state-all-tabs-smoke.spec.ts`            | High            | High             | High           |
| Stats/Progress Daily     | Tab         | `src/components/app/views/progress.tsx`      | Cards, rings     | Goal sheets | `tests/e2e/progress-rich-data-smoke.spec.ts`             | Medium          | Medium           | High           |
| Stats/Progress Deep Dive | Tab         | `src/components/app/views/progress.tsx`      | Charts, tables   | None        | `tests/e2e/analytics-invariants.spec.ts`                 | High            | High             | High           |
| Settings root            | Header      | `src/components/app/views/settings.tsx`      | Nav list         | None        | `tests/e2e/settings-hub-render-smoke.spec.ts`            | Low             | Low              | Medium         |
| Settings nested          | Settings    | `src/components/app/views/settings.tsx`      | Toggles, inputs  | Dialogs     | `tests/e2e/settings-data-safety-lifecycle-smoke.spec.ts` | Medium          | Medium           | Medium         |
| Jarvis launcher          | Nav         | `src/components/app/bottom-nav.tsx`          | Fab button       | None        | None explicit                                            | Low             | Low              | High           |
| Jarvis conversation      | Nav         | `src/components/app/jarvis/jarvis-panel.tsx` | Input, scroll    | None        | None explicit                                            | High            | High             | High           |
| Active-workout screen    | Nav         | `src/components/app/active-workout.tsx`      | Set inputs       | Sheets      | `tests/e2e/active-workout-lifecycle-smoke.spec.ts`       | High            | High             | Critical       |
| Active-workout overlays  | Workout     | `src/components/app/active-workout.tsx`      | Buttons          | Sheet       | None explicit                                            | Medium          | Medium           | Critical       |
| Bottom navigation        | Root        | `src/components/app/bottom-nav.tsx`          | Nav links        | None        | `tests/e2e/navigation-smoke.spec.ts`                     | Low             | Low              | Critical       |
| Shared sheets            | Root        | `src/components/app/sheet.tsx`               | Dialog wrappers  | Sheet       | `tests/e2e/popup-stack-and-scroll-lock-smoke.spec.ts`    | High            | High             | Critical       |
| Shared dialogs           | Various     | `src/components/ui/alert-dialog.tsx`         | Modals           | Dialog      | `tests/e2e/popup-stack-and-scroll-lock-smoke.spec.ts`    | Medium          | Medium           | Critical       |
| Shared popups            | Various     | `src/components/app/popups/*`                | Modals           | Popups      | `tests/e2e/quick-popup-open-close-regression.spec.ts`    | High            | High             | High           |
| Shared forms             | Various     | `src/components/ui/input.tsx`                | Inputs           | None        | Various e2e                                              | Medium          | Low              | High           |
| Chart focus surfaces     | Views       | `src/components/ui/chart.tsx`                | SVG nodes        | Tooltips    | `tests/e2e/chart-empty-data-smoke.spec.ts`               | High            | High             | High           |
| History/detail surfaces  | Views       | `src/components/app/recent-activity.tsx`     | Lists            | None        | None explicit                                            | Medium          | High             | Medium         |

# 4. Semantic structure and landmarks audit

For each audited surface:

**Fuel/Nutrition Daily & Deep Dive:**

- Heading hierarchy: Weak. Subtabs use `div`/`button`, not headers.
- Landmark structure: Uses a central layout, but main content lacks `main` or specific `region` tags with accessible names.
- Accessible name: Primary content lacks clear names.
- Grouped cards: Generic containers.
- Navigation: Subtabs identifiable visually, lacking `tablist` semantics.
- Lists: Uses generic divs instead of semantic lists.
- Tables: History is flexbox divs.
- Dialogs: Sheets use standard Radix `Dialog` roles.

**Recovery Daily & Deep Dive:**

- Heading hierarchy: Weak. Often uses text sizing instead of `h1`-`h6`.
- Landmark structure: Missing explicit regions.
- Accessible name: Missing.
- Grouped cards: Generic containers.
- Navigation: Subtabs lack `tablist` semantics.
- Lists/Tables: Missing.
- Forms: Semantic grouping (fieldset/legend) is absent.
- Dialogs: Sheets use standard roles.

**Stats/Progress Daily & Deep Dive:**

- Heading hierarchy: Better usage on page headers, but cards use generic text.
- Landmark structure: Missing regions.
- Accessible name: Missing.
- Grouped cards: Generic containers.
- Navigation: Subtabs lack `tablist`.
- Lists/Tables: Relies on divs.
- Dialogs: Goal sheets use standard roles.

**Settings:**

- Heading hierarchy: Confirmed by code inspection in `src/components/app/views/settings.tsx`, often uses `span` instead of headings.
- Landmark structure: Missing regions.
- Accessible name: Missing.
- Grouped cards: Grouped visually, not semantically.
- Navigation: Uses lists of buttons, lacking `nav` role.
- Forms: No `fieldset`.
- Dialogs: ConfirmDialogs use standard roles.

**Jarvis:**

- Heading hierarchy: N/A.
- Landmark structure: Misses `region` for chat stream.
- Accessible name: Launcher lacks clear name.
- Lists: Chat stream uses divs.
- Forms: Composer uses `div` input structure.

**Active-workout:**

- Heading hierarchy: Weak.
- Landmark structure: Missing regions.
- Accessible name: Missing.
- Grouped cards: Exercises are divs, not lists.
- Navigation: N/A.
- Forms: Nested inputs, no `fieldset`.
- Dialogs: Overlays use standard roles.

**Identified Issues:**

- Skipped heading levels (often jumping from large text to small).
- Clickable non-buttons (divs with `onClick`).
- Headings used only for visual style.
- Missing section names.
- Generic container-only structures.
- Nested interactive controls with unclear semantics.

# 5. Keyboard-interaction audit

| Pattern            | Expected     | Implemented | Native/Custom | Focus Order | Enter | Space | Arrow Keys | Escape | Home/End | Trap Risk | Tests              |
| ------------------ | ------------ | ----------- | ------------- | ----------- | ----- | ----- | ---------- | ------ | -------- | --------- | ------------------ |
| Primary navigation | Tab access   | Tab         | Native        | Logical     | Yes   | Yes   | No         | N/A    | No       | None      | `navigation-smoke` |
| Tabs               | Arrow access | Tab         | Custom        | Logical     | Yes   | Yes   | No         | N/A    | No       | None      | None               |
| Segmented controls | Arrow access | Tab         | Custom        | Logical     | Yes   | Yes   | No         | N/A    | No       | None      | None               |
| Range controls     | Arrow        | Tab/Drag    | Native/Custom | Logical     | No    | No    | Yes        | N/A    | No       | None      | None               |
| Filters            | Tab access   | Tab         | Custom        | Logical     | Yes   | Yes   | No         | N/A    | No       | None      | None               |
| Selectors          | Arrow access | Tab         | Custom        | Logical     | Yes   | Yes   | No         | Esc    | No       | None      | None               |
| Buttons            | Focus/Enter  | Tab         | Native        | Logical     | Yes   | Yes   | No         | N/A    | No       | None      | None               |
| Icon buttons       | Focus/Enter  | Tab         | Native        | Logical     | Yes   | Yes   | No         | N/A    | No       | None      | None               |
| Cards as controls  | Focus/Enter  | Missing     | Custom        | Skips       | No    | No    | No         | N/A    | No       | None      | None               |
| Charts             | Focus access | Missing     | Custom        | Skips       | No    | No    | No         | N/A    | No       | None      | None               |
| Carousels          | Focus/Arrow  | Tab         | Custom        | Logical     | Yes   | Yes   | Yes        | N/A    | No       | None      | None               |
| Swipeable stacks   | Focus/Arrow  | Missing     | Custom        | Skips       | No    | No    | No         | N/A    | No       | None      | None               |
| Menus              | Arrow access | Arrow       | Custom        | Logical     | Yes   | Yes   | Yes        | Esc    | No       | None      | None               |
| Popups             | Trap/Esc     | Esc only    | Custom        | Leaks       | Yes   | No    | No         | Esc    | No       | High      | `popup-stack`      |
| Sheets             | Trap/Esc     | Esc         | Custom        | Leaks       | Yes   | No    | No         | Esc    | No       | High      | `popup-stack`      |
| Dialogs            | Trap/Esc     | Trap/Esc    | Native        | Traps       | Yes   | Yes   | No         | Esc    | No       | None      | None               |
| Tables             | Tab/Arrow    | Missing     | Custom        | Skips       | No    | No    | No         | N/A    | No       | None      | None               |
| Active-workout     | Tab/Arrow    | Partial     | Custom        | Complex     | Yes   | No    | No         | N/A    | No       | High      | None               |
| Jarvis message     | Tab/Enter    | Tab         | Custom        | Logical     | Yes   | No    | No         | N/A    | No       | None      | None               |
| Form submission    | Enter        | Enter       | Custom        | Logical     | Yes   | No    | No         | N/A    | No       | None      | None               |

**Controls responding only to pointer/touch:**

- Reordering sets in `active-workout.tsx` (drag and drop).
- Muscle selection in `body-heatmap.tsx` (pointer only).
- Chart tooltips in `fitcore-analytics-visualizations.test.ts` related components.

# 6. Focus-visibility audit

- **Global focus rules:** Radix primitives provide baseline `:focus-visible` styling (`ring-2 ring-ring offset-2`). Outline removal is rare but occurs on some custom input fields.
- **`:focus` vs `:focus-visible`:** Typically relies on `:focus-visible` via Shadcn UI.
- **Custom rings:** `body-heatmap.tsx` lacks focus rings on SVG paths entirely.
- **Domain-specific colors:** Accent colors (green for Fuel, red for Training) are used for active states, but focus rings remain a generic muted ring.
- **Focus on dark surfaces:** Often invisible due to low contrast of the ring color against dark backgrounds (e.g., in Settings cards).
- **Focus on highlighted surfaces:** Ring often blends into the highlight.
- **Focus inside charts:** Missing entirely.
- **Focus inside sheets/dialogs:** Present on inputs, but the sheet container itself often lacks a clear initial focus indicator.
- **Focus on destructive actions:** Buttons show standard focus, no specific destructive focus styling.
- **Disabled-state behavior:** Focus is prevented via `disabled` attribute.

**Identified Cases:**

- Source: `src/components/ui/button.tsx` uses standard rings.
- Contrast Risk: High on dark cards.
- Inconsistencies: Custom icon buttons often lack padding, making the focus ring clip.
- Explicit outline removal without replacement: Noted on some custom textarea implementations where border changes instead.

# 7. Focus-containment and restoration audit

For shared and domain-specific overlays:

**Shared Sheets (`src/components/app/sheet.tsx` / `BottomSheet`)**

- Opening trigger: Button click.
- Initial focus: Unmanaged, often defaults to first input or body.
- Containment behavior: **Partial focus management.** Leaks focus to background elements.
- Focus cycling: Unmanaged.
- Escape handling: Yes.
- Backdrop handling: Yes (click to close).
- Close-button behavior: Yes.
- Restoration target: Inconsistent.
- Nested-overlay behavior: Can cause z-index/focus conflicts.
- Body-scroll behavior: Locks.
- Tests: `tests/e2e/popup-stack-and-scroll-lock-smoke.spec.ts`.

**Shared Dialogs (`src/components/ui/alert-dialog.tsx`)**

- Initial focus: Usually the cancel/close button.
- Containment behavior: **Full focus management.**
- Restoration target: Trigger element.
- Classification: Confirmed implemented.

**Shared Popups (`src/components/app/popups/*`)**

- Opening trigger: Button.
- Initial focus: Unmanaged.
- Containment behavior: **No visible focus management.**
- Escape handling: Inconsistent.
- Backdrop handling: Yes.
- Classification: Requires browser verification, probable risk.

**Settings Destructive Confirmations**

- Uses `ConfirmDialog`. Full focus management.

**Fuel Logging Sheets / Recovery Check-in Sheets / Stats Weigh-in**

- Uses `BottomSheet`. Partial/No focus management.

**Active-workout Sheets**

- Uses custom overlays. No visible focus management.

# 8. Accessible-name and labeling audit

- **Icon-only buttons:** Pervasive missing `aria-label`s. `X`, `ChevronLeft`, `Plus`, `Trash2` buttons routinely lack contextual names.
- **Form fields/Inputs/Selects/Toggles/File inputs:** Often rely on visual placeholders or adjacent text rather than explicit `label` elements tied via `id` and `htmlFor`.
- **Chart/Heatmap controls:** Legends and modes lack programmatic descriptions.
- **Table actions:** "Edit" or "Delete" icons lack row-specific context (e.g., "Delete workout from Monday").
- **Close buttons:** Many "Close" buttons lack contextual naming (e.g., "Close nutrition sheet").
- **Previous/next controls:** Missing context.
- **Back buttons:** Often just "Back" without specifying where.
- **Quick actions / Floating buttons / Navigation items:** Labels exist but are visually hidden without screen reader text.

**Identified generic-label risks:**

- "Open", "Close", "More", "Info", unlabeled icons. All widespread.

# 9. Form accessibility audit

| Form               | Labels      | Required | Optional | Units  | Helper Text | Validation Timing | Error Copy | Error Assoc. | Invalid State Semantics | Focus After Fail | Submit Semantics | Loading/Disabled | Success Announce | Keyboard Type Risk | Mobile Input Risk | Test Coverage         |
| ------------------ | ----------- | -------- | -------- | ------ | ----------- | ----------------- | ---------- | ------------ | ----------------------- | ---------------- | ---------------- | ---------------- | ---------------- | ------------------ | ----------------- | --------------------- |
| Fuel meal logging  | Visual      | N/A      | N/A      | Visual | Visual      | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | Decimal missing    | Obscured by kb    | `nutrition-logging`   |
| Custom foods       | Visual      | Visual   | N/A      | Visual | Visual      | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | Decimal missing    | Obscured by kb    | None                  |
| Supplements        | Visual      | N/A      | N/A      | Visual | N/A         | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | N/A                | N/A               | None                  |
| Recovery check-ins | Visual      | Visual   | N/A      | N/A    | N/A         | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | Range slider       | Obscured by kb    | `recovery-check-in`   |
| Sleep input        | Visual      | Visual   | N/A      | Visual | N/A         | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | Numeric missing    | Obscured by kb    | None                  |
| Soreness/Fatigue   | Visual      | Visual   | N/A      | N/A    | N/A         | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | Range slider       | N/A               | None                  |
| Weigh-ins          | Visual      | Visual   | N/A      | Visual | N/A         | On Blur/Submit    | Visual     | None         | None                    | None             | Standard         | Visual           | None             | Decimal missing    | Obscured by kb    | `bodyweight-weigh-in` |
| Goals              | Visual      | N/A      | N/A      | N/A    | N/A         | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | N/A                | N/A               | None                  |
| Profile fields     | Visual      | N/A      | N/A      | N/A    | N/A         | On Submit         | Visual     | None         | None                    | None             | Standard         | Visual           | None             | N/A                | N/A               | None                  |
| Settings prefs     | Visual      | N/A      | N/A      | N/A    | N/A         | On Toggle         | N/A        | None         | None                    | None             | Immediate        | Visual           | None             | N/A                | N/A               | None                  |
| Jarvis entry       | Vis hidden  | N/A      | N/A      | N/A    | N/A         | On Submit         | N/A        | None         | None                    | None             | Standard         | Visual           | None             | N/A                | Obscured by kb    | None                  |
| Workout sets       | Visual      | N/A      | N/A      | Visual | N/A         | N/A               | N/A        | None         | None                    | None             | Standard         | Visual           | None             | Decimal missing    | Obscured by kb    | None                  |
| Workout notes      | Placeholder | N/A      | N/A      | N/A    | N/A         | N/A               | N/A        | None         | None                    | None             | Standard         | Visual           | None             | N/A                | Obscured by kb    | None                  |

**Identified cases:** Placeholders substitute for proper labels in workout notes, Jarvis entry, and custom food forms.

# 10. Error, warning, and status-announcement audit

| State             | Source    | Visible Copy | Semantic Role | Live-Region | Focus Behavior | Action Offered | Color Dep. | Icon Dep. | Test Coverage       |
| ----------------- | --------- | ------------ | ------------- | ----------- | -------------- | -------------- | ---------- | --------- | ------------------- |
| Loading           | Global    | Spinners     | None          | None        | Unmanaged      | None           | Low        | High      | None                |
| Saving            | Forms     | Spinners     | None          | None        | Unmanaged      | None           | Low        | High      | None                |
| Saved             | Forms     | Toast/Check  | None          | None        | Unmanaged      | None           | Low        | High      | None                |
| Error             | Forms     | Red text     | None          | None        | Unmanaged      | None           | High       | Low       | None                |
| Warning           | Settings  | Yellow text  | None          | None        | Unmanaged      | Confirm        | High       | Low       | None                |
| Empty             | Views     | Text/Image   | None          | None        | Unmanaged      | CTA button     | Low        | High      | `empty-state-crash` |
| Partial           | Views     | Text         | None          | None        | Unmanaged      | None           | Low        | Low       | None                |
| Stale             | Analytics | Text         | None          | None        | Unmanaged      | Refresh        | Low        | Low       | None                |
| Unsupported       | Analytics | Text         | None          | None        | Unmanaged      | None           | Low        | Low       | None                |
| Unavailable       | Settings  | Text         | None          | None        | Unmanaged      | None           | Low        | Low       | None                |
| Needs data        | Analytics | Text         | None          | None        | Unmanaged      | Input          | Low        | Low       | None                |
| Offline           | Shell     | Banner       | None          | None        | Unmanaged      | Retry          | High       | Low       | None                |
| Permission        | Settings  | Text         | None          | None        | Unmanaged      | Grant          | Low        | Low       | None                |
| Validation        | Forms     | Red text     | None          | None        | Unmanaged      | None           | High       | Low       | Unit tests          |
| Destructive conf. | Settings  | Modal text   | Dialog        | N/A         | Trapped        | Confirm        | Low        | Low       | Smoke               |
| Action undone     | Jarvis    | Toast        | None          | None        | Unmanaged      | None           | Low        | Low       | None                |

**Identified gap:** Status changes (loading, saved, error) are visually visible but completely missing `aria-live` announcements to assistive technology.

# 11. Screen-reader data-access audit

| Visualization      | Acc. Name | Summary Text | Exact Value Alt | Table Alt | List Alt | Focusability | Series ID | Unit Exp. | Range Exp. | Quality Exp. | Tests |
| ------------------ | --------- | ------------ | --------------- | --------- | -------- | ------------ | --------- | --------- | ---------- | ------------ | ----- |
| Charts             | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | Visual       | None  |
| Progress rings     | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | N/A          | None  |
| Progress bars      | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | N/A          | None  |
| Score contributors | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | Visual       | None  |
| Macro progress     | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | N/A          | None  |
| Recovery metrics   | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | Visual       | None  |
| Bodyweight trends  | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | N/A          | None  |
| Goals              | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | N/A          | None  |
| Momentum           | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | N/A       | Visual     | N/A          | None  |
| Heatmaps           | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | N/A       | Visual     | N/A          | None  |
| Workout progress   | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | N/A          | None  |
| History tables     | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | N/A       | Visual    | N/A        | N/A          | None  |
| Comparison charts  | Missing   | Missing      | Missing         | Missing   | Missing  | Unfocusable  | Missing   | Visual    | Visual     | Visual       | None  |

**Identified visualizations:** All charts, heatmaps, and rings communicate meaning only through graphics or color, with no programmatic alternative.

# 12. Color-independent communication audit

| Pattern            | Source             | Meaning        | Visual Encoding  | Redundant Indicator | Gap                           | Tests |
| ------------------ | ------------------ | -------------- | ---------------- | ------------------- | ----------------------------- | ----- |
| Heatmaps           | `body-heatmap.tsx` | Muscle fatigue | Shades of red    | None                | Color only                    | None  |
| Macro progress     | Nutrition View     | Macro types    | Color segments   | Minimal text        | Missing labels on small rings | None  |
| Goal progress      | Progress View      | On track       | Green/Red        | Text values         | Color indicates status        | None  |
| Score contributors | Analytics          | Impact         | Green/Red arrows | Arrows              | Color heavily relied upon     | None  |
| Active-workout     | Workout View       | Set complete   | Green fill       | Check icon          | Sufficient redundancy         | None  |
| Success/Error      | Forms              | Status         | Green/Red text   | Alert icon          | Sufficient redundancy         | None  |
| Selected tabs      | SubTabs            | Active state   | Color/Underline  | Underline           | High risk for low contrast    | None  |
| Disabled actions   | Buttons            | Unavailable    | Opacity drop     | None                | Opacity only                  | None  |

# 13. Contrast-risk audit

| Risk                | Selector/Component      | Colors/Tokens   | Surface   | Likely Risk | Browser Verification |
| ------------------- | ----------------------- | --------------- | --------- | ----------- | -------------------- |
| Muted text          | `text-muted-foreground` | `bg-background` | Global    | Potential   | Required             |
| Disabled text       | `opacity-50`            | `bg-background` | Buttons   | High-risk   | Required             |
| Domain text         | `text-primary` (green)  | Light mode bg   | Nutrition | High-risk   | Required             |
| Text over gradients | Heatmap labels          | Red gradients   | Heatmap   | High-risk   | Required             |
| Text over imagery   | Progress photos         | Image bg        | Overlays  | High-risk   | Required             |
| Text over glass     | Jarvis panels           | Translucent bg  | Overlays  | Potential   | Required             |
| Chart labels        | SVG text                | `bg-background` | Charts    | Potential   | Required             |
| Legends             | `text-muted-foreground` | `bg-background` | Charts    | Potential   | Required             |
| Tooltip text        | `text-foreground`       | `bg-popover`    | Charts    | Potential   | Required             |
| Form placeholders   | `text-muted-foreground` | Input bg        | Forms     | High-risk   | Required             |
| Error text          | `text-destructive`      | Light bg        | Forms     | Potential   | Required             |
| Focus rings         | `ring-ring`             | Domain bg       | Inputs    | High-risk   | Required             |

# 14. Touch-target audit

| Pattern           | Component            | Declared Size  | Padding | Spacing    | Mobile Risk | Tap Risk | Tests |
| ----------------- | -------------------- | -------------- | ------- | ---------- | ----------- | -------- | ----- |
| Bottom-nav items  | `bottom-nav.tsx`     | ~48px          | Flex    | Safe       | Low         | Low      | None  |
| Icon buttons      | `Button size="icon"` | 40px           | P-2     | Tight      | High        | Medium   | None  |
| Chart controls    | Legends              | Visual only    | None    | Tight      | High        | High     | None  |
| Carousel controls | `carousel.tsx`       | 32px           | None    | Tight      | High        | Medium   | None  |
| Close buttons     | `sheet.tsx`          | 24-32px        | P-1     | Tight      | High        | Medium   | None  |
| Back buttons      | Headers              | 40px           | P-2     | Safe       | Low         | Low      | None  |
| Tabs              | `SubTabs`            | ~32px          | P-2     | Tight      | Medium      | Low      | None  |
| Filters           | Selectors            | 36px           | P-2     | Safe       | Low         | Low      | None  |
| Chips             | `Chip`               | 24px           | P-1     | Tight      | High        | Medium   | None  |
| Heatmap muscles   | `body-heatmap.tsx`   | SVG paths      | None    | None       | Critical    | High     | None  |
| Workout sets      | `active-workout.tsx` | Inputs         | None    | Very Tight | Critical    | High     | None  |
| Quantity controls | Buttons              | 32px           | P-1     | Tight      | High        | Medium   | None  |
| Delete actions    | Trash icon           | 24px           | P-1     | Tight      | High        | High     | None  |
| Settings toggles  | `Switch`             | 44px (wrapper) | P-2     | Safe       | Low         | Low      | None  |
| Jarvis chips      | Prompts              | 32px           | P-2     | Tight      | High        | Medium   | None  |

**Identified:** Tightly packed destructive (Trash) and non-destructive actions in active workout rows.

# 15. Motion and reduced-motion audit

| Motion Pattern    | Source         | Trigger | Duration | Easing   | Looping | Reduced-Motion | State Comm. | Interaction Delayed | Tests |
| ----------------- | -------------- | ------- | -------- | -------- | ------- | -------------- | ----------- | ------------------- | ----- |
| Page transitions  | Next.js        | Route   | ~200ms   | Standard | No      | Ignored        | No          | Yes                 | None  |
| Card expansion    | Accordion      | Click   | ~200ms   | Standard | No      | Ignored        | Yes         | Yes                 | None  |
| Chart animation   | Recharts       | Mount   | ~500ms   | Standard | No      | Ignored        | No          | No                  | None  |
| Loading animation | Spinner        | Mount   | Indef.   | Linear   | Yes     | Ignored        | Yes         | N/A                 | None  |
| Count-up          | `count-up.tsx` | Mount   | Variable | Out      | No      | Ignored        | No          | No                  | None  |
| Sheet motion      | `BottomSheet`  | Mount   | ~300ms   | Out      | No      | Ignored        | No          | Yes                 | None  |
| Dialog motion     | `AlertDialog`  | Mount   | ~150ms   | Out      | No      | Ignored        | No          | Yes                 | None  |
| Carousel motion   | `carousel.tsx` | Swipe   | ~300ms   | Out      | No      | Ignored        | No          | Yes                 | None  |
| Swipe motion      | iOS native     | Swipe   | Native   | Native   | No      | Native         | No          | N/A                 | None  |
| Progress anim     | SVG circles    | Mount   | ~500ms   | Standard | No      | Ignored        | No          | No                  | None  |
| Pulsing effects   | Skeleton       | Mount   | Indef.   | Standard | Yes     | Ignored        | Yes         | N/A                 | None  |
| Hover trans.      | Buttons        | Hover   | ~150ms   | Standard | No      | Ignored        | No          | No                  | None  |

**Identified gap:** Missing `prefers-reduced-motion` handling across all custom animations.

# 16. Mobile breakpoint inventory

| Breakpoint    | Source File | Affected Components | Behavior Change        | Grid/List | Typography | Overlay | Navigation  | Chart | Probable Risk |
| ------------- | ----------- | ------------------- | ---------------------- | --------- | ---------- | ------- | ----------- | ----- | ------------- |
| `sm` (640px)  | Tailwind    | Global grid         | Stacks to side-by-side | Grid      | Scales     | Wider   | Nav shifts  | Wider | None          |
| `md` (768px)  | Tailwind    | Global grid         | Tablet layout          | Grid      | Scales     | Wider   | Desktop nav | Wider | None          |
| `lg` (1024px) | Tailwind    | Global grid         | Desktop layout         | Grid      | Scales     | Modals  | Sidebar     | Wider | None          |

**Identified:** Missing narrow-screen rules (e.g., 320px) completely. Duplicated breakpoint logic relying purely on default Tailwind classes.

# 17. Narrow-width audit

For audited surfaces at 320, 360, 390, 430, 480 px:

| Surface        | Page Padding | Horiz. Layout | Control Wrapping | Button Wrap | Chart Width | Table Strategy | Text Truncation | Long Labels | Metric Fit | Icon Fit | Sheet Width | Dialog Width | Safe-Area | Nav Clearance | Classification |
| -------------- | ------------ | ------------- | ---------------- | ----------- | ----------- | -------------- | --------------- | ----------- | ---------- | -------- | ----------- | ------------ | --------- | ------------- | -------------- |
| Fuel Views     | P-4          | Flex          | None             | None        | Responsive  | None           | Missing         | Overflows   | Tight      | Tight    | w-full      | w-full       | Ignored   | Ignored       | Probable risk  |
| Recovery Views | P-4          | Flex          | None             | None        | Responsive  | None           | Missing         | Overflows   | Tight      | Tight    | w-full      | w-full       | Ignored   | Ignored       | Probable risk  |
| Progress Views | P-4          | Flex/Grid     | None             | None        | Fixed min   | None           | Missing         | Overflows   | Tight      | Tight    | w-full      | w-full       | Ignored   | Ignored       | Probable risk  |
| Settings       | P-4          | Flex          | None             | None        | N/A         | None           | Missing         | Overflows   | Tight      | Tight    | w-full      | w-full       | Ignored   | Ignored       | Probable risk  |
| Jarvis         | P-4          | Flex          | None             | None        | N/A         | None           | Missing         | Overflows   | N/A        | Tight    | w-full      | N/A          | Ignored   | Ignored       | Probable risk  |
| Active-workout | P-4          | Flex          | None             | None        | N/A         | None           | Missing         | Overflows   | Overflows  | Tight    | w-full      | w-full       | Ignored   | Ignored       | Probable risk  |

**Classification:** Probable overflow and truncation risk across all surfaces at <= 360px. Requires browser verification.

# 18. Horizontal-overflow risk audit

| Risk            | File    | Selector/Component | Cause                 | Affected Viewport | Existing Mitigation | Test Coverage | Verif. Priority |
| --------------- | ------- | ------------------ | --------------------- | ----------------- | ------------------- | ------------- | --------------- |
| Fixed widths    | Popups  | `.popup-content`   | Hardcoded `w-[400px]` | < 400px           | None                | None          | High            |
| Min widths      | Charts  | Recharts wrappers  | Hardcoded `min-w`     | < 360px           | None                | None          | High            |
| Nowrap          | Tables  | History lists      | Missing `flex-wrap`   | < 360px           | None                | None          | High            |
| Oversized gaps  | Layouts | `gap-4` in flex    | Too wide              | < 320px           | None                | None          | Medium          |
| Unbounded flex  | Lists   | `.flex` items      | Missing `min-w-0`     | < 360px           | None                | None          | High            |
| Wide tables     | History | Flex grids         | 4+ columns            | < 360px           | None                | None          | High            |
| Wide legends    | Charts  | Legend wrapper     | Long text             | < 360px           | None                | None          | High            |
| Inline controls | Workout | Set row inputs     | Dense inputs          | < 360px           | None                | None          | Critical        |
| Long strings    | Forms   | Custom food names  | Missing `truncate`    | < 360px           | None                | None          | High            |
| Wide SVGs       | Heatmap | `svg` element      | Hardcoded aspect      | < 360px           | None                | None          | High            |

# 19. Vertical-layout and viewport-height audit

| Issue           | Component        | Pos. Model     | Viewport Units | Scroll Container | Safe-Area | Keyboard Risk   | Obscure Risk | Tests |
| --------------- | ---------------- | -------------- | -------------- | ---------------- | --------- | --------------- | ------------ | ----- |
| Bottom nav      | `bottom-nav.tsx` | Fixed bottom   | None           | N/A              | Ignored   | Obscured        | High         | None  |
| Long forms      | Settings/Fuel    | Static         | None           | Window           | Ignored   | Obscures inputs | High         | None  |
| Nested scroll   | Sheets           | Fixed          | `100vh`        | Inner div        | Ignored   | Obscures inputs | High         | None  |
| Active workout  | View             | Sticky headers | `100vh`        | Window           | Ignored   | Obscures inputs | High         | None  |
| Jarvis composer | `jarvis-panel`   | Fixed bottom   | None           | Inner div        | Ignored   | Obscures input  | High         | None  |
| Full-chart      | Modals           | Fixed          | `100vh`        | None             | Ignored   | N/A             | Medium       | None  |

**Identified:** `100vh` usage on mobile often causes content to be hidden under the mobile browser chrome.

# 20. Safe-area audit

| Component       | CSS Property | Fallback | Mobile Platform | Missing Apps   | Tests |
| --------------- | ------------ | -------- | --------------- | -------------- | ----- |
| Bottom nav      | Missing      | None     | iOS/Android     | Bottom padding | None  |
| Fixed actions   | Missing      | None     | iOS/Android     | Bottom padding | None  |
| Sheets          | Missing      | None     | iOS/Android     | Bottom padding | None  |
| Dialogs         | Missing      | None     | iOS/Android     | Bottom padding | None  |
| Active workout  | Missing      | None     | iOS/Android     | Bottom padding | None  |
| Jarvis composer | Missing      | None     | iOS/Android     | Bottom padding | None  |
| Top headers     | Missing      | None     | iOS/Android     | Top padding    | None  |

**Identified:** Fixed controls will overlap device insets on modern phones with notches/home indicators.

# 21. Virtual-keyboard and input-layout audit

| Flow          | Fixed Elements | Scroll Container | Autofocus | Input Type | Submit Loc. | Obscured Fields Risk | Obscured Errors Risk | Hidden Submit Risk | Tests |
| ------------- | -------------- | ---------------- | --------- | ---------- | ----------- | -------------------- | -------------------- | ------------------ | ----- |
| Jarvis input  | Composer       | Body             | Yes       | Text       | Bottom      | High                 | Low                  | High               | None  |
| Meal logging  | Nav            | Body/Sheet       | No        | Text/Num   | Bottom      | High                 | High                 | High               | None  |
| Custom foods  | Nav            | Body             | No        | Text/Num   | Bottom      | High                 | High                 | High               | None  |
| Recovery      | Nav            | Body             | No        | Sliders    | Bottom      | High                 | High                 | High               | None  |
| Weigh-ins     | Nav            | Sheet            | No        | Num        | Bottom      | High                 | High                 | High               | None  |
| Goals         | Nav            | Sheet            | No        | Text/Num   | Bottom      | High                 | High                 | High               | None  |
| Profile edit  | Nav            | Body             | No        | Text       | Bottom      | High                 | High                 | High               | None  |
| Workout notes | Sticky head    | Body             | No        | Text       | Bottom      | High                 | Low                  | Medium             | None  |
| Set inputs    | Sticky head    | Body             | No        | Num        | Inline      | High                 | N/A                  | N/A                | None  |

**Classification:** Static risk requiring device verification.

# 22. Sheet and dialog responsive audit

For every shared and domain-specific overlay:

| Overlay       | Mobile W  | Desktop W   | Max Height | Scroll | Header | Footer/Action | Safe Areas | Nested Scroll | Long Content | Keyboard Risk | Focus | Tests |
| ------------- | --------- | ----------- | ---------- | ------ | ------ | ------------- | ---------- | ------------- | ------------ | ------------- | ----- | ----- |
| BottomSheet   | `w-full`  | `w-[400px]` | `90vh`     | Auto   | Sticky | Static        | Ignored    | Yes           | Clips        | High          | Leaks | None  |
| AlertDialog   | `w-[90%]` | `w-[400px]` | Auto       | None   | Static | Static        | Ignored    | No            | Overflows    | Low           | Traps | None  |
| Popups        | `w-full`  | `w-[500px]` | Auto       | Auto   | Static | Static        | Ignored    | No            | Overflows    | High          | Leaks | None  |
| Goal Sheets   | `w-full`  | `w-[400px]` | `90vh`     | Auto   | Sticky | Static        | Ignored    | Yes           | Clips        | High          | Leaks | None  |
| Workout Sheet | `w-full`  | `w-[400px]` | `90vh`     | Auto   | Sticky | Static        | Ignored    | Yes           | Clips        | High          | Leaks | None  |

**Identified Risks:** Exceeding viewport height, hiding actions below the fold, failing at 320px, and virtual keyboard overlap.

# 23. Responsive tables and history audit

| Table         | Implementation | Cols | Min W | Horiz Scroll | Stacked Mobile | Row Action Acc. | Header Semantics | Screen Reader | Tests |
| ------------- | -------------- | ---- | ----- | ------------ | -------------- | --------------- | ---------------- | ------------- | ----- |
| Meals         | Flex grid      | 3    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Supplements   | Flex grid      | 3    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Recovery      | Flex grid      | 4    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Check-ins     | Flex grid      | 4    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Weigh-ins     | Flex grid      | 3    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Goals         | Flex grid      | 3    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Workout hist  | Flex grid      | 4    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Workout sets  | Flex grid      | 5    | None  | None         | None           | Missing         | Missing          | Bad           | None  |
| Settings data | Flex grid      | 3    | None  | None         | None           | Missing         | Missing          | Bad           | None  |

**Identified:** Dense tables without an intentional mobile strategy (stacked cards). Missing `role="table"`.

# 24. Responsive chart audit

For all charts (Recharts):

| Chart     | W Strategy | H Strategy | Resp Cont. | Min Dim | Legend | Axis Label | Tooltip | Focus Ctrl | Table Alt | Mobile Ctrl | Overflow Mit. | Reduced Motion | Tests |
| --------- | ---------- | ---------- | ---------- | ------- | ------ | ---------- | ------- | ---------- | --------- | ----------- | ------------- | -------------- | ----- |
| Progress  | 100%       | Fixed      | Yes        | None    | Row    | Truncated  | Hover   | None       | None      | None        | None          | Ignored        | None  |
| Macros    | 100%       | Fixed      | Yes        | None    | Row    | N/A        | Hover   | None       | None      | None        | None          | Ignored        | None  |
| Recovery  | 100%       | Fixed      | Yes        | None    | Row    | Truncated  | Hover   | None       | None      | None        | None          | Ignored        | None  |
| Analytics | 100%       | Fixed      | Yes        | None    | Row    | Truncated  | Hover   | None       | None      | None        | None          | Ignored        | None  |

**Identified narrow width risks:** Clipped axis labels, overlapping legends, hidden exact values, no focus controls.

# 25. Heatmap responsive and accessibility audit

| Heatmap      | Size       | Controls | Muscle Targets | Selected | Legend | Labels | SR Alt | Key Acc | Color Indep | Narrow | Detail | Tests |
| ------------ | ---------- | -------- | -------------- | -------- | ------ | ------ | ------ | ------- | ----------- | ------ | ------ | ----- |
| Home/Workout | SVG aspect | None     | SVG Paths      | Fill     | None   | None   | None   | None    | None        | Scales | Popup  | None  |

**Identified:** Muscles selectable only by pointer. Tiny hit areas. Missing accessible names. Color-only meaning.

# 26. Navigation-shell responsive and accessibility audit

| Nav Element | Desktop | Active Semantics | Label Vis | Icon Labels | Touch Target | Safe Areas | Active State | Focus Order | Route Announce | Overlay Interact | Sticky/Fixed |
| ----------- | ------- | ---------------- | --------- | ----------- | ------------ | ---------- | ------------ | ----------- | -------------- | ---------------- | ------------ |
| Bottom nav  | Sidebar | Visual           | Truncates | Hidden      | 48px         | Ignored    | Color        | Logical     | None           | Obscured         | Fixed bottom |
| Top headers | Static  | N/A              | Visible   | Visible     | 40px         | Ignored    | N/A          | Logical     | None           | Obscured         | Sticky top   |

**Narrow width risk:** Labels clip at 320px. Obscured by keyboard.

# 27. Jarvis-specific accessibility and responsive audit

| Jarvis Element | Keyboard Acc | Focus   | Semantics | Announce | Safe Area | Width  | Keyboard Risk | Reduced Motion | Tests |
| -------------- | ------------ | ------- | --------- | -------- | --------- | ------ | ------------- | -------------- | ----- |
| Launcher       | Yes          | Logical | Button    | None     | Ignored   | N/A    | Low           | Ignored        | None  |
| Panel          | Yes          | Logical | Dialog    | None     | Ignored   | w-full | High          | Ignored        | None  |
| Messages       | Tab          | Logical | Div       | None     | N/A       | w-full | Low           | Ignored        | None  |
| Composer       | Tab          | Logical | Div       | None     | Ignored   | w-full | Critical      | N/A            | None  |

**Identified:** Conversational state not announced to screen readers. Virtual keyboard overlap risk.

# 28. Active-workout accessibility and responsive audit

| Element    | Keyboard Acc | Labels | Touch Targets | Focus   | Drag Alt | Status Announce | Narrow W | Overflow Risk | Safe Area | Tests |
| ---------- | ------------ | ------ | ------------- | ------- | -------- | --------------- | -------- | ------------- | --------- | ----- |
| Header     | Yes          | Visual | 40px          | Logical | N/A      | None            | Tight    | Low           | Ignored   | None  |
| Sets       | Partial      | Visual | Small         | Complex | None     | None            | Cramped  | High          | N/A       | None  |
| Reorder    | No           | N/A    | Small         | None    | None     | None            | N/A      | N/A           | N/A       | None  |
| Modifiers  | Yes          | Visual | 32px          | Logical | N/A      | None            | Tight    | Low           | N/A       | None  |
| Completion | Yes          | Visual | 48px          | Logical | N/A      | None            | Safe     | Low           | Ignored   | None  |

**Identified:** Accessible alternatives for drag-and-drop or pointer-based reordering are completely absent. Dense inputs overflow on 320px.

# 29. Settings-specific accessibility and responsive audit

| Element   | Keyboard Acc | Focus   | Labels | Errors | Nested Dialogs | Mobile Scroll | Safe Area | Long Copy |
| --------- | ------------ | ------- | ------ | ------ | -------------- | ------------- | --------- | --------- |
| Nav       | Yes          | Logical | Visual | N/A    | None           | Works         | Ignored   | Truncates |
| Profile   | Yes          | Logical | Visual | None   | None           | Works         | Ignored   | Wraps     |
| Toggles   | Yes          | Logical | Visual | N/A    | None           | Works         | N/A       | Wraps     |
| Destruct. | Yes          | Trapped | Visual | N/A    | Yes            | Works         | Ignored   | Wraps     |
| Data      | Yes          | Logical | Visual | N/A    | Yes            | Works         | Ignored   | Truncates |

**Identified risks:** Unlabeled switches, long explanatory copy exceeding narrow cards, actions hidden below fixed footers when keyboard is open.

# 30. State-coverage matrix

| State         | Semantic Announcement | Focus Behavior | Color Dependence | Narrow Screen | Touch Target | Test Coverage | Gap/Risk         |
| ------------- | --------------------- | -------------- | ---------------- | ------------- | ------------ | ------------- | ---------------- |
| Ready         | N/A                   | Logical        | Low              | Safe          | Good         | Smoke         | None             |
| Loading       | Missing `aria-live`   | Unmanaged      | Low              | Safe          | N/A          | None          | No SR announce   |
| Empty         | Visual only           | Unmanaged      | Low              | Safe          | N/A          | Smoke         | No SR context    |
| Partial       | Visual only           | Unmanaged      | High             | Risk          | Good         | None          | Color reliance   |
| Stale         | Missing               | Unmanaged      | High             | Risk          | N/A          | None          | Missing feedback |
| Unsupported   | Visual only           | Unmanaged      | Low              | Safe          | N/A          | None          | Missing feedback |
| Unavailable   | Visual only           | Unmanaged      | Low              | Safe          | N/A          | None          | Missing feedback |
| Error         | Missing `aria-live`   | Unmanaged      | High             | Risk          | Good         | None          | No SR announce   |
| Saving        | Missing               | Unmanaged      | Low              | Safe          | N/A          | None          | No feedback      |
| Saved         | Missing `aria-live`   | Unmanaged      | Low              | Safe          | N/A          | None          | No SR announce   |
| Valid. Fail   | Missing               | Unmanaged      | High             | Risk          | N/A          | Unit          | No focus move    |
| Permission    | Visual only           | Unmanaged      | Low              | Safe          | N/A          | None          | No SR context    |
| Offline       | Visual only           | Unmanaged      | Low              | Safe          | N/A          | None          | No SR context    |
| Destruct. C   | Modal open            | Trapped        | Low              | Safe          | Good         | Smoke         | None             |
| Destruct. D   | Missing               | Unmanaged      | Low              | Safe          | N/A          | None          | No feedback      |
| Active Work   | Missing               | Complex        | High             | High risk     | Small        | Smoke         | Complete gap     |
| Overlay open  | Dialog open           | Leaks          | Low              | High risk     | Good         | Smoke         | Focus trap leak  |
| Keyboard open | N/A                   | N/A            | Low              | Critical      | N/A          | None          | Obscured inputs  |
| Reduced Mot   | Ignored               | N/A            | Low              | Safe          | N/A          | None          | Animations run   |

# 31. Domain-by-domain gap matrix

| Feature            | Fuel/Nutrition | Recovery | Stats/Progress | Settings | Jarvis  | Active Workout |
| ------------------ | -------------- | -------- | -------------- | -------- | ------- | -------------- |
| Semantic structure | Weak           | Weak     | Weak           | Weak     | Weak    | Weak           |
| Keyboard support   | Partial        | Partial  | Absent         | Partial  | Partial | Absent         |
| Focus visibility   | Weak           | Weak     | Weak           | Weak     | Weak    | Absent         |
| Focus trapping     | Partial        | Partial  | Absent         | Partial  | Absent  | Absent         |
| Accessible naming  | Weak           | Weak     | Weak           | Partial  | Partial | Absent         |
| Form errors        | Partial        | Partial  | N/A            | Partial  | Absent  | N/A            |
| Chart alternative  | Absent         | Absent   | Absent         | N/A      | N/A     | N/A            |
| Color independent  | Weak           | Weak     | Absent         | Strong   | Strong  | Weak           |
| Reduced motion     | Absent         | Absent   | Absent         | N/A      | N/A     | Absent         |
| 320 px behavior    | Weak           | Weak     | Weak           | Weak     | Weak    | Weak           |
| Safe areas         | Weak           | Weak     | Weak           | Weak     | Weak    | Weak           |
| Keyboard overlap   | Weak           | Weak     | Weak           | Weak     | Weak    | Weak           |
| Sheet behavior     | Weak           | Weak     | Weak           | Weak     | Weak    | Weak           |
| Table behavior     | Absent         | Absent   | Absent         | Absent   | N/A     | Absent         |
| Test coverage      | Partial        | Partial  | Partial        | Partial  | Absent  | Partial        |

_Supporting Classifications:_

- All "Weak" structure classifications supported by generic div usage seen across `src/components/app/views/*.tsx`.
- All "Absent" alternatives supported by missing implementations in `src/components/ui/chart.tsx` and `body-heatmap.tsx`.

# 32. Current accessibility test-coverage map

| File Path                                              | Behavior Covered | Domains         | Viewport | Assertions    | Missing Scenarios                | Brittleness | Regression Req |
| ------------------------------------------------------ | ---------------- | --------------- | -------- | ------------- | -------------------------------- | ----------- | -------------- |
| `tests/e2e/keyboard-focus-accessibility-smoke.spec.ts` | Basic Tab/Esc    | Shell, Settings | Desktop  | Visible focus | Focus traps, Screen reader, ARIA | Low         | High           |

_(No other specific tests found covering form validation a11y, chart alternatives, active-workout, Jarvis, or reduced motion)_

# 33. Current responsive test-coverage map

| File Path                                       | Widths/Projects | Surfaces | Assertions | Screenshots | Missing Widths | Missing Surfaces | Regression Req |
| ----------------------------------------------- | --------------- | -------- | ---------- | ----------- | -------------- | ---------------- | -------------- |
| `tests/e2e/mobile.spec.ts`                      | Mobile          | General  | Rendering  | No          | 320px, 360px   | Detailed         | High           |
| `tests/e2e/mobile-layout-overlay-smoke.spec.ts` | Mobile          | Overlays | Visibility | No          | 320px          | N/A              | High           |

_(No strict tests found for horizontal overflow, keyboard overlap, safe areas, charts, tables, or heatmaps at 320px)_

# 34. Prioritized accessibility risk register

| Risk                          | Affected Surfaces | Evidence                  | User Impact | AT Impact | Frequency | Shared Comp | Test Gap | Future Dep | Priority Reason      |
| ----------------------------- | ----------------- | ------------------------- | ----------- | --------- | --------- | ----------- | -------- | ---------- | -------------------- |
| Modal focus escaping          | All sheets/popups | Missing Trap logic        | Confusion   | Severe    | High      | Yes         | Total    | Redesign   | Breaks modal context |
| Inaccessible active workout   | Workout           | Drag reorder              | Blocker     | Blocker   | Med       | No          | Total    | Redesign   | Core loop blocker    |
| Charts without alternatives   | Progress/Fuel     | Missing in `chart.tsx`    | Data loss   | Severe    | High      | Yes         | Total    | Redesign   | Blocks data access   |
| Heatmaps without alternatives | Home/Workout      | Missing in `body-heatmap` | Data loss   | Severe    | High      | Yes         | Total    | Redesign   | Blocks data access   |
| Forms without labels          | Fuel/Recovery     | Missing `htmlFor`         | Confusion   | Severe    | High      | No          | Total    | Redesign   | Breaks form usage    |
| Status changes not announced  | Global            | Missing `aria-live`       | Confusion   | Severe    | High      | Yes         | Total    | Redesign   | Missing feedback     |

# 35. Prioritized responsive risk register

| Risk                         | Viewport  | Surfaces         | Evidence           | User Consequence | Overflow/Obscure | Safe Area | Keyboard | Test Gap | Priority Reason  |
| ---------------------------- | --------- | ---------------- | ------------------ | ---------------- | ---------------- | --------- | -------- | -------- | ---------------- |
| Keyboard-obscured forms      | < 800px h | Jarvis, Settings | No resize handling | Can't submit     | Obscures         | N/A       | Severe   | Total    | Blocks core flow |
| Tables without mobile        | < 400px w | History views    | Hardcoded cols     | Clipping         | Overflow         | N/A       | N/A      | Total    | Breaks layout    |
| Fixed controls cover content | Mobile    | Bottom nav       | Fixed positioning  | Hidden content   | Obscures         | Severe    | N/A      | Total    | Hides data       |
| Heatmap targets too small    | Mobile    | Home/Workout     | Fixed aspect       | Missed taps      | N/A              | N/A       | N/A      | Total    | Frustrating      |
| Fixed-width layouts          | < 400px w | Popups           | Hardcoded `w-[]`   | Clipping         | Overflow         | N/A       | N/A      | Total    | Breaks layout    |

# 36. Future redesign acceptance checklist

- Every interactive control is keyboard accessible.
- All icon-only controls have contextual accessible names.
- Focus is visible with sufficient contrast.
- Overlays strictly trap and restore focus.
- Escape dismissal is consistent across all popups and sheets.
- Status changes are announced via `aria-live`.
- Form errors are programmatically associated (`aria-describedby`, `aria-invalid`).
- Required fields are identified programmatically.
- Charts have textual or tabular non-visual alternatives.
- Chart units and ranges are exposed.
- Heatmaps have list-based non-visual alternatives.
- Meaning does not rely only on color.
- Reduced motion is respected.
- Touch targets are adequate (minimum 44x44px).
- 320 px is supported without horizontal scrolling.
- 360, 390, 430, and 480 px are supported.
- Desktop composition is intentional (no unbounded stretching).
- No page-level horizontal overflow exists.
- Safe areas are respected (`env(safe-area-inset-*)`).
- Virtual keyboards do not hide active inputs or actions.
- Tables have a deliberate mobile strategy (stacked cards).
- Bottom navigation remains usable under all conditions.
- Active-workout controls remain accessible.
- Jarvis remains accessible.
- Accessibility tests cover critical behaviors (traps, ARIA).
- Responsive tests cover critical widths (320px).

# 37. Safe future task boundaries

- **Shared primitives requiring coordination:** Focus trapping logic in `Sheet` and `Popup`.
- **Overlay primitives requiring coordination:** `BottomSheet` vs `Dialog`.
- **Shared form-control hotspots:** Input label associations in `Input` and `Select`.
- **Chart/Heatmap accessibility hotspots:** `src/components/ui/chart.tsx` and `body-heatmap.tsx`.
- **CSS responsive hotspots:** Global grid definitions and table container layouts.
- **Files likely to conflict with active UI work:** Anything touching the main dashboard layout.
- **Files that must remain untouched during Data Safety work:** `src/components/app/views/settings.tsx` and related privacy modules.
- **Tests requiring coordination:** Any new Playwright tests covering mobile layout.
- **Recommended sequencing boundaries:** Fix shared primitives (`BottomSheet`, `Dialog`, `Input`) before refactoring domain-specific views (Fuel, Recovery).

# 38. Open questions and uncertainties

- **Virtual keyboard behavior:** Cannot be fully verified statically. Requires device verification to confirm if Safari/Chrome viewport resizing adequately prevents obscuring bottom-sheet inputs. Does not block redesign, but dictates CSS strategy (e.g. `dvh`).
- **Computed contrast ratios:** Static Tailwind classes (`text-muted-foreground` on `bg-background`) require browser computed styles to definitively pass/fail WCAG. Needed for final token selection.
- **Screen reader exact behavior:** The effectiveness of fallback labels requires verification with VoiceOver/NVDA.

# 39. File index

- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/active-workout.tsx`
- `src/components/app/body-heatmap.tsx`
- `src/components/app/bottom-nav.tsx`
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/sheet.tsx`
- `src/components/app/recent-activity.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/chart.tsx`
- `tests/e2e/keyboard-focus-accessibility-smoke.spec.ts`
- `tests/e2e/mobile.spec.ts`
