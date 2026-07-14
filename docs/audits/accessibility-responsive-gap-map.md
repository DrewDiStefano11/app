# 1. Executive summary

This report summarizes the static accessibility and responsive-gap audit for the post-Analytics main branch. The current UI shows implementation gaps in semantic structure, keyboard accessibility, and basic responsive layout behaviors. Primary interactive patterns (charts, heatmaps, bottom sheets, form error handling) are missing robust non-visual alternatives. Most complex interactions rely heavily on pointer-based controls and visual layout without intentional degradation on small screens or semantic representation.

## Current accessibility maturity

Low. Core structural landmarks are often missing or misused (e.g., `span` instead of `h1`). Form controls lack programmatic labels. Color and visual charts are frequently the only way data is communicated.

## Current responsive maturity

Low-to-Medium. Broad grid structures exist via standard Tailwind breakpoints (`sm`, `md`, `lg`), but explicit CSS rules for small screen behavior (e.g., `min-w-[320px]`) are absent.

## Strongest implemented patterns

- **Base Primitives:** Core Shadcn UI primitives like `Button`, `Input`, `Dialog` and `Select` have reasonable baseline accessibility (keyboard support) and responsive defaults.
- **Desktop Navigation:** Navigation layout functions well on wider screens.

## Prioritized confirmed gaps

- Data charts and the body heatmap (`src/components/app/body-heatmap.tsx`) rely solely on pointer interactions and color without accessible text alternatives or keyboard navigability.
- Form fields in Nutrition and Recovery check-ins lack explicit `label` associations.
- Reordering sets in `active-workout.tsx` uses pointer-only drag-and-drop.
- Continuous animations lack `prefers-reduced-motion` media queries.

## Prioritized probable risks requiring runtime verification

- **Virtual keyboard overlap:** Probable risk of virtual keyboards obscuring inputs in `BottomSheet` and `jarvis-panel.tsx` on mobile devices.
- **Horizontal overflow:** Probable overflow and text clipping on screens at or below 360px for complex active workout rows and history tables.
- **Contrast:** Probable contrast failures for `text-muted-foreground` on various backgrounds, requiring computed measurement.
- **Safe-area:** Probable safe-area overlap on fixed-positioned items like bottom navigation on mobile devices with notches.
- **Focus trapping failure:** Focus trap leakage is a probable risk for custom popups built on `BottomSheet` since it lacks explicit trap code, requiring runtime testing.

# 2. Method and evidence boundaries

- **Required base SHA:** 3e4326782d761313c4f2644ecfe55503770b360a
- **Methodology:** Static code-and-test inspection only. No browser verification, visual rendering tools, screen readers, or browser automation were used.
- **Files Inspected:** Core application surfaces in `src/components/app`, `src/components/ui`, layout primitives, active popups, and the `tests/e2e` and `tests/unit` directories.
- **Why browser behavior is not claimed:** This is a static analysis audit. Findings about visual clipping, screen reader announcements, or virtual keyboard interactions are derived purely from code (e.g., missing `aria-live`, missing explicit safe-area variables, missing programmatic focus calls) and must be verified in a real environment.
- **Classification system:**
  - **Confirmed responsive implementation:** Evident in source code (e.g., `sm:flex-row` in Dialog primitives).
  - **Confirmed missing rule:** Explicitly absent from the source code where expected (e.g., `<button>` lacking `aria-label`).
  - **Probable overflow risk:** Source code structure suggests a high likelihood of failure (e.g., fixed widths on mobile or dense flex layouts without wrapping).
  - **Probable keyboard-overlap risk:** Inputs fixed to screen bottom without window resize handlers.
  - **Probable safe-area risk:** Missing CSS environment variables for safe areas on fixed elements.
  - **Platform-dependent:** Requires browser verification.
  - **Requires browser verification:** Behavior depends on OS-level or dynamic rendering that static code cannot definitively prove.

## List of Findings Downgraded to "Probable" or "Requires Verification"

- _Content clipping at 320px_ -> Probable horizontal overflow risk.
- _Focus trap failure on `BottomSheet`_ -> Probable risk requiring browser verification.
- _Virtual keyboard hiding inputs_ -> Probable keyboard-overlap risk requiring browser verification.
- _Contrast failing WCAG_ -> Requires computed verification in a browser.
- _Safe-area overlap_ -> Probable safe-area risk requiring browser verification.
- _Touch targets measuring below threshold_ -> Probable risk requiring browser measurement.

# 3. Surface inventory

| Surface                  | Route/Entry | Source                                       | Primary Controls | Overlays    | Acc. Complexity | Resp. Complexity | Audit Priority |
| ------------------------ | ----------- | -------------------------------------------- | ---------------- | ----------- | --------------- | ---------------- | -------------- |
| Fuel/Nutrition Daily     | Tab         | `src/components/app/views/nutrition.tsx`     | Forms, buttons   | Sheets      | Medium          | Medium           | High           |
| Fuel/Nutrition Deep Dive | Tab         | `src/components/app/views/nutrition.tsx`     | Tabs, charts     | None        | High            | High             | High           |
| Recovery Daily           | Tab         | `src/components/app/views/recovery.tsx`      | Sliders, inputs  | Sheets      | Medium          | Medium           | High           |
| Recovery Deep Dive       | Tab         | `src/components/app/views/recovery.tsx`      | Tabs, charts     | None        | High            | High             | High           |
| Stats/Progress Daily     | Tab         | `src/components/app/views/progress.tsx`      | Cards, rings     | Goal sheets | Medium          | Medium           | High           |
| Stats/Progress Deep Dive | Tab         | `src/components/app/views/progress.tsx`      | Charts, tables   | None        | High            | High             | High           |
| Settings root            | Header      | `src/components/app/views/settings.tsx`      | Nav list         | None        | Low             | Low              | Medium         |
| Settings nested          | Settings    | `src/components/app/views/settings.tsx`      | Toggles, inputs  | Dialogs     | Medium          | Medium           | Medium         |
| Jarvis launcher          | Nav         | `src/components/app/bottom-nav.tsx`          | Fab button       | None        | Low             | Low              | High           |
| Jarvis conversation      | Nav         | `src/components/app/jarvis/jarvis-panel.tsx` | Input, scroll    | None        | High            | High             | High           |
| Active-workout screen    | Nav         | `src/components/app/active-workout.tsx`      | Set inputs       | Sheets      | High            | High             | Critical       |
| Active-workout overlays  | Workout     | `src/components/app/active-workout.tsx`      | Buttons          | Sheet       | Medium          | Medium           | Critical       |
| Bottom navigation        | Root        | `src/components/app/bottom-nav.tsx`          | Nav links        | None        | Low             | Low              | Critical       |
| Shared sheets            | Root        | `src/components/app/sheet.tsx`               | Dialog wrappers  | Sheet       | High            | High             | Critical       |
| Shared dialogs           | Various     | `src/components/ui/alert-dialog.tsx`         | Modals           | Dialog      | Medium          | Medium           | Critical       |
| Shared popups            | Various     | `src/components/app/popups/*`                | Modals           | Popups      | High            | High             | High           |

# 4. Semantic structure

- **Heading elements vs. styled text:** Widespread use of `span` elements styled as headings instead of semantic `h1`-`h6` tags (e.g., Settings section titles in `src/components/app/views/settings.tsx`).
- **Landmarks:** Minimal use of explicit `main`, `nav`, `aside`, or `region` tags across views.
- **Lists and tables:** History views and dense data (e.g., `src/components/app/views/recovery.tsx` tables) use flex/grid `div`s instead of semantic `ul`, `ol`, or `table` structures.
- **Forms:** Semantic grouping using `fieldset` and `legend` is completely absent.
- **Clickable non-button elements:** Occasional use of `div` elements with `onClick` handlers acting as cards/buttons.
- **Body-heatmap semantics:** Heatmap (`src/components/app/body-heatmap.tsx`) utilizes raw SVG elements with `onClick` handlers, missing semantic roles and keyboard alternatives.

# 5. Keyboard interaction

- **Keyboard handlers:** Tab navigation is supported for native elements like `input` and `button`. Custom controls often lack keyboard interaction.
- **Tab semantics:** Custom tab components (e.g., `SubTabs`) lack `role="tablist"` and arrow-key navigation.
- **Segmented-control semantics:** Built with generic buttons, missing `role="radiogroup"` or similar grouping.
- **Range inputs:** Custom range sliders in `src/components/app/views/recovery.tsx` often lack full keyboard accessibility if not native inputs.
- **Drag-only controls:** Reordering sets in `active-workout.tsx` relies on drag-and-drop without keyboard fallback.
- **Active-workout controls:** Densely packed inputs rely heavily on tab-order without explicit logical grouping or shortcuts.
- **Jarvis composer:** Basic input focus works, but complex chat navigation is undefined.

# 6. Focus visibility

- **Focus-visible CSS:** Radix primitives provide baseline `:focus-visible` styling (`ring-2 ring-ring offset-2`).
- **Custom controls:** Focus rings are frequently missing on custom SVG nodes, charts, and heatmaps.
- **Zoom restrictions:** No restrictive `user-scalable=no` tags were found in standard viewport metadata, allowing native browser zooming.

# 7. Overlay semantics and focus behavior

| Overlay Type  | Implementation                       | Native/Lib Semantics         | Explicit Roles/ARIA  | Focus Trapping | App-Specific Focus | Esc Behavior | Backdrop Behavior | Scroll Locking            | Unverified Runtime                      |
| ------------- | ------------------------------------ | ---------------------------- | -------------------- | -------------- | ------------------ | ------------ | ----------------- | ------------------------- | --------------------------------------- |
| BottomSheet   | `src/components/app/sheet.tsx`       | Custom Portal                | Missing              | Missing        | Unmanaged          | Yes          | Clicks to close   | Yes (`overflow="hidden"`) | Focus trap leakage, screen reader order |
| Radix Dialog  | `src/components/ui/dialog.tsx`       | Radix `DialogPrimitive`      | `role="dialog"`      | Yes (by Radix) | Default            | Yes          | Clicks to close   | Yes                       | Focus restoration                       |
| AlertDialog   | `src/components/ui/alert-dialog.tsx` | Radix `AlertDialogPrimitive` | `role="alertdialog"` | Yes (by Radix) | Default            | Yes          | Clicks to close   | Yes                       | Focus restoration                       |
| Custom Popups | `src/components/app/popups/*`        | Uses `BottomSheet`           | Missing              | Missing        | Unmanaged          | Yes          | Clicks to close   | Yes                       | Focus trap leakage                      |
| ConfirmDialog | `src/components/app/sheet.tsx`       | Custom Portal                | Missing              | Missing        | Unmanaged          | Yes          | Clicks to close   | None visible              | Focus trap leakage                      |

**Note:** While Radix `Dialog` and `AlertDialog` provide built-in focus trapping, the heavily used `BottomSheet` and `ConfirmDialog` components do not implement focus trapping explicitly in source, making focus leakage a **probable risk** requiring runtime testing.

# 8. Accessible names

- **Labels and label associations:** `label` elements are present in `src/components/ui/label.tsx` but are frequently missing `htmlFor` associations to inputs in actual forms (e.g., Fuel meal logging).
- **aria-label / aria-labelledby / aria-describedby:** Seldom used.
- **Icon-button names:** Icon-only buttons (e.g., `X` for close, `ChevronLeft` for back) frequently lack explicit `aria-label` attributes or `sr-only` span fallbacks, particularly in custom sheet headers.

# 9. Forms and validation semantics

- **Label semantics:** Labels are often just visual text placed near inputs.
- **aria-invalid:** Not utilized to indicate validation failures to screen readers.
- **Required fields:** Often lack programmatic `required` or `aria-required` attributes.
- **Error messages:** Visual red text is rendered, but it is not programmatically linked to the invalid input via `aria-describedby`.

# 10. Status announcements

- **aria-live:** Explicitly absent across loading states, toast notifications, form submission success/error states, and Jarvis chat responses.

# 11. Chart accessibility

- **Chart text alternatives:** Charts (via `src/components/ui/chart.tsx`) lack `table` fallbacks, `aria-label` descriptions, or summary text. Meaning is locked entirely in SVG graphics.

# 12. Heatmap accessibility

- **Body-heatmap semantics:** `src/components/app/body-heatmap.tsx` uses SVG paths without textual alternatives. Muscle selection relies entirely on pointer clicks and color changes.

# 13. Color dependence and contrast evidence boundaries

- **Color dependence:** Meaning is conveyed solely through color in Heatmaps (shades of red for fatigue), Macros (colors for protein/fat/carbs), and active workout completion checks.
- **Contrast claims:** No categorical claims of WCAG failure are made. However, combinations like `text-muted-foreground` on dark backgrounds or `text-primary` on light backgrounds pose a **probable risk** and require computed browser measurement.

# 14. Touch target evidence boundaries

- **Touch targets:** Statically defined sizes (e.g., `w-10 h-10` in `BottomSheet` close buttons) are ~40px. Heatmap SVG paths and dense workout set inputs appear smaller. Claims of failure require browser measurement, but dense areas represent a **probable risk**.

# 15. Motion and reduced-motion support

- **Reduced-motion CSS:** `prefers-reduced-motion` media queries are explicitly absent from continuous animations (e.g., `CountUp`, loaders) and sheet slide transitions.

# 16. Responsive architecture

- **Architecture:** The application relies on Tailwind CSS for layout.
- **Tables or charts lacking responsive wrappers:** History tables are implemented as flex containers without dedicated horizontal scrolling wrappers or stacking fallback strategies.
- **Mobile input modes:** Inconsistently applied on numeric inputs (e.g., weight, sets, reps).

# 17. Breakpoint inventory

| Breakpoint    | CSS Rule                      | Affected Scope          | Verified Status       |
| ------------- | ----------------------------- | ----------------------- | --------------------- |
| `sm` (640px)  | `sm:text-left`, `sm:flex-row` | Dialogs, global layouts | Confirmed implemented |
| `md` (768px)  | Various                       | Desktop layout          | Confirmed implemented |
| `lg` (1024px) | Various                       | Widescreen              | Confirmed implemented |

**Missing Breakpoints:** There are no explicit rules defining layouts for extremely narrow screens (e.g., `min-w-[320px]` or `max-w-[360px]`).

# 18. Overflow-risk inventory

- **Probable overflow risk:** History tables (flex grids with 4+ columns) on < 360px viewports.
- **Probable overflow risk:** Active workout rows with multiple adjacent numeric inputs.
- **Probable overflow risk:** Long custom food names in Fuel forms lacking `truncate` or `break-words`.
- **Probable overflow risk:** Fixed `w-[400px]` definitions inside some popup wrappers.

# 19. Safe-area inventory

- **Probable safe-area risk:** Bottom navigation (`src/components/app/bottom-nav.tsx`) uses `fixed bottom-0` but lacks explicit `padding-bottom: env(safe-area-inset-bottom)`.
- **Probable safe-area risk:** Bottom sheets (`src/components/app/sheet.tsx`) have hardcoded heights (`max-h-[88dvh]`) that may interact poorly with top/bottom safe areas.

# 20. Virtual-keyboard risk inventory

- **Probable keyboard-overlap risk:** Jarvis composer input (`src/components/app/jarvis/jarvis-panel.tsx`) fixed to the bottom of the screen.
- **Probable keyboard-overlap risk:** Inputs inside `BottomSheet` without scroll-into-view handlers.

# 21. Domain-by-domain findings

| Domain         | Finding                       | Static Evidence                                  |
| -------------- | ----------------------------- | ------------------------------------------------ |
| Fuel/Nutrition | Form errors lack associations | Missing `aria-describedby`                       |
| Recovery       | Sliders lack keyboard support | Missing standard input fallback                  |
| Stats/Progress | Charts lack textual fallbacks | Missing `table` wrappers                         |
| Settings       | Headings use `span`           | Found in `src/components/app/views/settings.tsx` |
| Jarvis         | Chat lacks live announcements | Missing `aria-live`                              |
| Active Workout | Pointer-only reorder          | Drag-and-drop implemented without keys           |

# 22. Shared-component findings

- **Sheets:** `BottomSheet` lacks explicit focus trapping source logic and ARIA roles.
- **Popups:** Custom popups built on `BottomSheet` inherit its vulnerabilities.
- **Inputs:** `Input` components are sound, but consuming forms fail to label them programmatically.
- **Dialogs:** Radix primitives (`Dialog`, `AlertDialog`) are semantically sound.

# 23. Test coverage

- **Accessibility Tests:** `tests/e2e/keyboard-focus-accessibility-smoke.spec.ts` verifies basic tabbing and Escape key closure. Does not test screen reader output or ARIA roles.
- **Responsive Tests:** `tests/e2e/mobile.spec.ts` and `tests/e2e/mobile-layout-overlay-smoke.spec.ts` verify basic rendering, but do not assert specific small-viewport constraints or keyboard overlap.

# 24. Prioritized confirmed gaps

1. Heatmaps (`body-heatmap.tsx`) and charts completely lack non-visual text alternatives.
2. Active workout set reordering is strictly pointer-driven.
3. Form fields consistently lack programmatic `htmlFor` label associations.
4. Continuous animations ignore `prefers-reduced-motion`.
5. `BottomSheet` and `ConfirmDialog` lack semantic roles (`role="dialog"`).

# 25. Prioritized probable risks requiring runtime verification

1. Virtual keyboard overlapping bottom-fixed inputs (Jarvis, Sheets).
2. Horizontal overflow and clipping on tables and workout rows on viewports <= 360px.
3. Contrast failures for muted text on domain backgrounds.
4. Safe-area overlap on fixed bottom navigation.
5. Touch targets for dense icon controls measuring too small.
6. Focus trap leakage and incorrect read order in `BottomSheet` popups due to missing trap logic.

# 26. Future redesign acceptance checklist

- [ ] Every interactive control is keyboard accessible.
- [ ] All icon-only controls have contextual accessible names.
- [ ] Focus is visible with sufficient contrast.
- [ ] Overlays strictly trap and restore focus (verifiable at runtime).
- [ ] Escape dismissal is consistent across all popups and sheets.
- [ ] Form errors are programmatically associated (`aria-describedby`, `aria-invalid`).
- [ ] Required fields are identified programmatically.
- [ ] Charts have textual or tabular non-visual alternatives.
- [ ] Heatmaps have list-based non-visual alternatives.
- [ ] Meaning does not rely only on color.
- [ ] Continuous animations honor `prefers-reduced-motion`.
- [ ] Minimum touch targets (44x44px or similar) are met for primary actions.
- [ ] Layouts support down to 320px without horizontal scrolling or severe clipping.
- [ ] Virtual keyboards do not hide active inputs or actions.
- [ ] Safe areas (`env(safe-area-inset-*)`) are respected.
- [ ] Tables have a deliberate mobile strategy (stacked cards).
- [ ] Bottom navigation remains usable under all conditions.
- [ ] Active-workout controls remain accessible.
- [ ] Jarvis remains accessible.
- [ ] Accessibility tests cover critical behaviors (traps, ARIA).
- [ ] Responsive tests cover critical widths (320px).

# 27. Open questions

- **Virtual keyboard behavior:** Requires physical device or emulator testing to confirm if Safari/Chrome viewport resizing adequately prevents obscuring bottom-sheet inputs.
- **Computed contrast ratios:** Static Tailwind classes require browser computed styles to definitively pass/fail WCAG contrast thresholds.
- **Screen reader exact behavior:** The effectiveness of fallback labels or missing structure requires verification with VoiceOver/NVDA.
- **Desktop whitespace:** Requires visual review to confirm excessive whitespace limits.

# 28. File index

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
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/chart.tsx`
- `tests/e2e/keyboard-focus-accessibility-smoke.spec.ts`
- `tests/e2e/mobile.spec.ts`
