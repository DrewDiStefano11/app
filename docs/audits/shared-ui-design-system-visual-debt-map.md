# 1. Executive summary

- Current shared-component architecture: Relies on Radix UI primitives wrapped with standard Tailwind `class-variance-authority` within `src/components/ui/`. However, the app domain views largely bypass these in favor of bespoke inline styles and global CSS classes.
- Current styling architecture: Heavy global stylesheet (`src/styles.css`) defining pseudo-element gradients, layered shadows, and domain-specific card boundaries, combined with inline styles for dynamic colors and animation delays.
- Current token usage: Basic tokens (`--radius`, `--card-background`, `--app-background`) defined in CSS, but color semantic tokens (`--section`, `--gold`, `--momentum`, `--nutrition`, `--success`) are mapped dynamically and frequently overwritten inline.
- Current domain-theme implementation: Themes leak and overwrite `--section` inconsistently (e.g. `Home` uses custom css `.home-section-card--muscle`, while `Progress` uses inline `style={{ "--section": "var(--gold)" }}`).
- Current component reuse level: Medium for form inputs and sheets, Low for presentation cards, metrics, and domain-specific wrappers.
- Major visual inconsistencies: Same semantic structures (metric readouts, stat bars) implemented differently across `Home`, `Training`, and `Progress`.
- Major duplication hotspots: Gradient pseudo-elements, card hover states, sheet backdrop/surface overrides, status progress rings, and metric readout fonts.
- Major accessibility-pattern inconsistencies: Bespoke inline buttons (e.g. `.press` in `Home`) bypass standard focus and disabled states of `src/components/ui/button.tsx`.
- Major responsive-pattern inconsistencies: Shell overrides (`.phone-shell`) conflict with generic layout utilities.
- Highest-risk refactor areas: `src/styles.css` and `.card-elev` / `.sheet-surface` logic.
- Most important findings for the premium redesign sequence: Eliminate inline styles for domain identity; standardize a shared `Card` component to replace `.card-elev` and inline cards; standardize `Sheet` to prevent custom `.sheet-surface` usage.

Categorization:

- Confirmed duplication: Card gradients (`.card-elev`, `.home-section-card--*`), metric readouts.
- Confirmed inconsistency: Domain color implementation (CSS vs inline).
- Probable risk: Accessibility of inline `.press` buttons.
- Intentional domain variation: Unique hero cards for different domains.
- Missing browser verification: Exact overlay layering and safe-area insets.
- Future consolidation opportunity: A unified `Card` primitive and `ProgressBar` component.

# 2. Styling architecture map

- Global stylesheets:
  - `src/styles.css`:
    - Path: `src/styles.css`
    - Ownership: Global
    - Scope: Application-wide base styles and complex bespoke components.
    - Consumers: All domain views.
    - Override behavior: High specificity overrides using compound selectors and `!important`.
    - Duplication risk: High (contains duplicate gradient/shadow blocks).
    - Specificity risk: High (`.phone-shell [class*="bg-[var(--surface-2)]"][class*="border"]`).
    - Responsive responsibility: Contains mobile shell specific overrides.
    - Future coordination risk: Extremely high risk of conflicts during redesign.
- Route-level styles: N/A.
- Component-level styles:
  - Tailwind UI primitives:
    - Path: `src/components/ui/*.tsx`
    - Ownership: Component level.
    - Scope: Base UI elements.
    - Consumers: Form controls and overlays.
    - Override behavior: Follows CVA standard.
    - Duplication risk: Low.
    - Specificity risk: Low.
    - Responsive responsibility: Tailwind defaults.
    - Future coordination risk: Low.
- CSS modules where present: None identified.
- Utility classes:
  - Tailwind default utility classes used heavily in domain views (`px-5 space-y-4`).
- Inline styles:
  - `src/components/app/views/*.tsx`:
    - Ownership: View level.
    - Scope: Element specific.
    - Consumers: Specific domain UI.
    - Override behavior: Inline styles override all CSS (e.g. `style={{ color: "var(--section)" }}`).
    - Duplication risk: High.
    - Specificity risk: High.
    - Responsive responsibility: Low.
    - Future coordination risk: High.
- Style objects: N/A.
- CSS custom properties:
  - Defined in `src/styles.css`, used throughout components.
- Media queries:
  - Present in `src/styles.css` for dark mode and mobile shell styling.
- Reduced-motion rules:
  - `@media (prefers-reduced-motion: reduce)` in `src/styles.css` disabling animations on `.home-*` elements.
- Safe-area rules:
  - `env(safe-area-inset-bottom)` in `.sheet-action-bar`.
- Chart-library styles:
  - Recharts internal styles partially overridden by `src/components/ui/chart.tsx`.
- Third-party component styles: N/A.

# 3. Design-token inventory

- Background colors:
  - Current name: `--app-background`
  - Literal value: `oklch(0.045 0.008 285)`
  - Source file: `src/styles.css`
  - Consumers: `body`, background surfaces.
  - Semantic purpose: Main layout background.
  - Duplicate literal occurrences: None.
  - Inconsistencies: N/A.
  - Accessibility concern: None.
  - Consolidation priority: Low.
- Surface colors:
  - Current name: `--card-background`
  - Literal value: `oklch(0.135 0.018 285 / 0.96)`
  - Source file: `src/styles.css`
  - Consumers: Cards, Sheets.
  - Semantic purpose: Elevated surface.
  - Duplicate literal occurrences: Hardcoded in `.sheet-surface` gradients (`oklch(0.14 0.018 285)`).
  - Inconsistencies: Replicated with slight variations in gradient mixing.
  - Accessibility concern: None.
  - Consolidation priority: High.
- Text colors:
  - Current name: `--text-primary` (`oklch(0.985 0.004 285)`)
  - Consumers: Global text.
  - Source file: `src/styles.css`
  - Semantic purpose: Primary reading text.
  - Consolidation priority: Low.
- Muted text:
  - Current name: `--text-muted` (`oklch(0.61 0.014 285)`)
  - Consumers: Captions.
  - Source file: `src/styles.css`
  - Semantic purpose: Secondary info.
  - Consolidation priority: Low.
- Borders:
  - Current name: `--border-subtle` (`oklch(1 0 0 / 11%)`), `--border-strong` (`oklch(1 0 0 / 18%)`)
  - Source file: `src/styles.css`
  - Consumers: Card borders.
  - Semantic purpose: Delineation.
  - Consolidation priority: Low.
- Semantic success: `--success` (`oklch(0.75 0.17 150)`) in `src/styles.css`.
- Semantic warning: `--warning` (`oklch(0.8 0.15 80)`) in `src/styles.css`.
- Semantic error: `--destructive` mapped in Tailwind theme.
- Semantic information: `--primary` mapped in Tailwind theme.
- Domain colors:
  - `--section`: Dynamic accent color, overridden heavily in `src/components/app/views/*`.
- Gold achievement color:
  - Current name: `--gold`
  - Source file: `src/styles.css`
  - Consumers: Progress view.
  - Semantic purpose: Achievement representation (incorrectly used as domain color in Progress).
  - Inconsistencies: Used as domain theme rather than just achievements.
  - Consolidation priority: High.
- Gradients:
  - Literal values: `radial-gradient(100% 120% at 100% 0%, color-mix(in oklab, var(--section) 8%, transparent), transparent 64%)`
  - Source file: `src/styles.css`
  - Consumers: `.home-section-card--muscle`, `.sheet-surface`.
  - Semantic purpose: Visual depth.
  - Duplicate literal occurrences: Repeated across many selectors.
  - Consolidation priority: High.
- Shadows:
  - Current name: `--shadow-card`, `--shadow-elevated`
  - Consumers: Cards.
  - Source file: `src/styles.css`
  - Semantic purpose: Elevation.
  - Consolidation priority: Low.
- Glow:
  - Literal values: `box-shadow: 0 0 12px color-mix(...)`
  - Consumers: `.glow-section`
  - Source file: `src/styles.css`
  - Semantic purpose: Highlight focus.
  - Consolidation priority: Medium.
- Radii:
  - Current name: `--radius` (0.875rem)
  - Source file: `src/styles.css`
  - Consumers: Global ui.
  - Consolidation priority: Low.
- Spacing: Tailwind defaults.
- Typography sizes:
  - Current name: `--type-stat` (`clamp(1.75rem, 7vw, 2.5rem)`)
  - Source file: `src/styles.css`
  - Consumers: Metrics.
  - Consolidation priority: Medium.
- Font weights: Tailwind defaults.
- Line heights: Tailwind defaults.
- Transition durations: 0.01ms hardcoded for reduced motion.
- Easing: Tailwind defaults.
- Z-index layers: Mixed Tailwind utilities.
- Chart-series colors: Controlled by `src/components/ui/chart.tsx`.

# 4. Domain-theme audit

- Home/FitCore:
  - Primary accent: `--section` (violet).
  - Secondary accent: `--accent-secondary`.
  - Gradients: Custom radial backgrounds (`.home-section-card--muscle`).
  - Glow: Minimal.
  - Highlighted surfaces: `.tile-hero`.
  - Chart colors: Default.
  - Icons: Default text.
  - Badges: `.home-status-chip`.
  - Buttons: `.press` style.
  - Progress indicators: Inline width styles.
  - Empty-state accents: Neutral.
  - Current consistency: High internal consistency.
  - Cross-domain leaks: None.
  - Areas with insufficient identity: None.
  - Areas with excessive identity: `.home-command-center` highly bespoke.
  - Adherence: Conforms to violet identity.

- Training:
  - Primary accent: purple-indigo (via inline `style={{ background: "var(--section)" }}`).
  - Secondary accent: N/A.
  - Gradients: `.section-gradient`.
  - Glow: Minimal.
  - Highlighted surfaces: `.card-elev`.
  - Chart colors: Default.
  - Icons: Colored inline `style={{ color: "var(--section)" }}`.
  - Badges: N/A.
  - Buttons: Inline `bg-[var(--section)]`.
  - Progress indicators: Inline width bars.
  - Empty-state accents: Neutral.
  - Current consistency: Medium.
  - Cross-domain leaks: None.
  - Areas with insufficient identity: None.
  - Areas with excessive identity: Heavy inline usage.
  - Adherence: Conforms to purple-indigo.

- Fuel/Nutrition:
  - Primary accent: amber-orange intended, but hardcoded green (`style={{ "--section": "rgb(34 197 94)" }}`) in `src/components/app/views/nutrition.tsx`.
  - Secondary accent: None.
  - Gradients: `.glow-section`.
  - Glow: Heavy on cards.
  - Highlighted surfaces: Green backgrounds.
  - Chart colors: Default.
  - Icons: Colored.
  - Badges: Green chips.
  - Buttons: PrimaryButton.
  - Progress indicators: `style={{ background: color || "var(--section)" }}`.
  - Empty-state accents: Neutral.
  - Current consistency: Medium.
  - Cross-domain leaks: None.
  - Areas with insufficient identity: None.
  - Areas with excessive identity: None.
  - Adherence: VIOLATION - Uses green instead of amber-orange.

- Recovery:
  - Primary accent: blue.
  - Secondary accent: None.
  - Gradients: `.section-gradient`.
  - Glow: None.
  - Highlighted surfaces: `.card-elev`.
  - Chart colors: Default.
  - Icons: Default.
  - Badges: Neutral.
  - Buttons: PrimaryButton.
  - Progress indicators: None.
  - Empty-state accents: None.
  - Current consistency: Medium.
  - Cross-domain leaks: None.
  - Areas with insufficient identity: None.
  - Areas with excessive identity: None.
  - Adherence: Conforms.

- Stats/Progress:
  - Primary accent: emerald-teal intended, but hardcodes `style={{ "--section": "var(--gold)" }}` in `src/components/app/views/progress.tsx`.
  - Secondary accent: None.
  - Gradients: None.
  - Glow: None.
  - Highlighted surfaces: `bg-[var(--surface-2)]`.
  - Chart colors: Default.
  - Icons: Gold.
  - Badges: Gold.
  - Buttons: PrimaryButton.
  - Progress indicators: Gold bars.
  - Empty-state accents: None.
  - Current consistency: Low.
  - Cross-domain leaks: Leaks gold identity.
  - Areas with insufficient identity: Emerald-teal missing.
  - Areas with excessive identity: Misuse of gold.
  - Adherence: VIOLATION - Uses gold instead of emerald-teal.

- Settings/utilities:
  - Primary accent: Neutral.
  - Secondary accent: None.
  - Gradients: None.
  - Glow: None.
  - Highlighted surfaces: `.bg-[var(--surface-2)]`.
  - Chart colors: None.
  - Icons: `var(--section)`.
  - Badges: None.
  - Buttons: GhostButton.
  - Progress indicators: None.
  - Empty-state accents: None.
  - Current consistency: High.
  - Cross-domain leaks: None.
  - Areas with insufficient identity: None.
  - Areas with excessive identity: None.
  - Adherence: Conforms.

- achievements/PRs:
  - Primary accent: gold intended.
  - Current consistency: Diluted by Progress view misuse.

# 5. Typography inventory

- Font families:
  - `--font-display`: `"Bebas Neue", "Impact", system-ui, sans-serif` (`src/styles.css`).
  - `--font-sans`: `"Barlow", system-ui, -apple-system, sans-serif` (`src/styles.css`).
- Fallback fonts: standard sans-serif.
- Display headings: `font-display text-4xl` (`Home`).
- Page headings: `text-lg font-bold` (`Home`).
- Section headings: `text-xs uppercase tracking-wider text-muted-foreground` (`Training`, `Recovery`).
- Card headings: `text-sm font-medium` (`Progress`).
- Metric values: `text-3xl font-bold tabular-nums` (`Recovery`), `text-[10px] font-bold uppercase tracking-widest` (`Nutrition`).
- Labels: `text-[11px] leading-relaxed text-white/45` (`Home`).
- Captions: `text-xs text-muted-foreground` (`Recovery`).
- Helper text: `text-xs text-white/30`.
- Button text: `text-xs font-semibold` (`Training`).
- Navigation labels: `text-[10px]` (`BottomNav`).
- Chart labels: Recharts default.
- Table text: Tailwind default.
- Dialog text: Tailwind default.
- Error text: Tailwind default.
- Mobile type adjustments: `--type-stat` uses clamp for viewport adjustments.

Inconsistencies: Metric readouts mix `font-display` in Home with standard `tabular-nums` in Training/Recovery.

# 6. Spacing and layout-token inventory

- Page padding: `pb-24` on main views (`src/components/app/views/*.tsx`). Semantic use: clearance for bottom nav.
- Section spacing: `px-5 space-y-4` or `space-y-5` across domain views.
- Card padding: `p-5` (`Training`), `p-6` (`Nutrition`).
- Card gaps: `gap-4` (`Recovery`), `gap-3` (`Training`).
- Grid gaps: `gap-3` (`Home`), `gap-2` (`Home`).
- List gaps: `space-y-3`.
- Control spacing: `gap-2`.
- Chart spacing: Default.
- Overlay padding: `p-4`.
- Bottom-navigation clearance: `pb-24`.
- Safe-area padding: `env(safe-area-inset-bottom)` in `styles.css`.
- Mobile and desktop variants: Standard breakpoints.

Repeated spacing pattern: `px-5 space-y-4`. Consolidation priority: Medium.
Magic numbers: `w-12 h-12`, `h-1.5`, `height: 220px` (Home).

# 7. Surface, card, and container inventory

- Page background: `--app-background`.
- Elevated card: `.card-elev` (`src/styles.css`). Consumers: Training, Recovery. Background: `linear-gradient` over `--card-background`. Duplicate implementations: overlaps with UI Card.
- Neutral card: `src/components/ui/card.tsx`. Consumers: Progress.
- Domain-highlighted card: `.home-section-card--muscle` (`src/styles.css`). Consumers: Home.
- Hero surface: `.tile-hero` (`src/styles.css`).
- Metric card: `.stat-card` (`src/styles.css`).
- Analytical card: N/A.
- Expandable card: `.home-momentum-summary--grid` (`src/styles.css`).
- List row: `src/components/app/recent-activity.tsx`.
- Quick-action tile: `.tile` (`src/styles.css`).
- Chart container: `src/components/ui/chart.tsx`.
- Progress container: Inline divs (`Training`, `Progress`).
- Overlay panel: `.sheet-surface` (`src/styles.css`).
- Sheet surface: `.sheet-surface` (`src/styles.css`).
- Dialog surface: `src/components/ui/dialog.tsx`.
- Empty-state surface: `.recent-activity-card--empty` (`src/styles.css`).
- Error surface: N/A.
- Loading surface: Skeleton component.

Visual inconsistency: `.card-elev` vs standard `Card` vs `.home-section-card--*`.

# 8. Shared component inventory

- buttons: `src/components/ui/button.tsx`. Consumers: overlays, forms. Styling ownership: Component.
- icon buttons: Inline `.press` styles (`Home`).
- cards: `src/components/ui/card.tsx`. Consumers: Progress. Styling ownership: Component.
- metric cards: `.stat-card` (`src/styles.css`).
- hero cards: `.tile-hero`.
- expandable cards: `.home-momentum-summary--grid`.
- tabs: `src/components/ui/tabs.tsx`.
- segmented controls: Inline `flex gap-2` (`Progress`).
- chips: `.home-status-chip` (`src/styles.css`).
- badges: `src/components/ui/badge.tsx`.
- progress bars: `src/components/ui/progress.tsx` (mostly bypassed by inline styles).
- rings: `.momentum-sheet-score` (`src/styles.css`).
- inputs: `src/components/ui/input.tsx`.
- selects: `src/components/ui/select.tsx`.
- toggles: `src/components/ui/toggle.tsx`.
- checkboxes: `src/components/ui/checkbox.tsx`.
- radio groups: `src/components/ui/radio-group.tsx`.
- date controls: `src/components/ui/calendar.tsx`.
- range controls: N/A.
- tables: `src/components/ui/table.tsx`.
- lists: None standardized.
- sheets: `src/components/ui/sheet.tsx`.
- dialogs: `src/components/ui/dialog.tsx`.
- popups: `src/components/ui/popover.tsx`.
- tooltips: `src/components/ui/tooltip.tsx`.
- loading states: `src/components/ui/skeleton.tsx`.
- skeletons: `src/components/ui/skeleton.tsx`.
- error states: Inline.
- empty states: `.recent-activity-card--empty`.
- data-quality labels: Inline.
- chart wrappers: `src/components/ui/chart.tsx`.
- legends: Recharts default.
- focus-mode controls: N/A.

# 9. Duplicate component-pattern audit

- card headers: Repeated flex headers in `Home`, `Training`, `Recovery` with varied typography (`text-xs uppercase tracking-wider` vs `font-display text-lg`).
- card actions: Buttons duplicated across `Training` and `Recovery` without shared component.
- score rings: `.momentum-sheet-score` (`src/styles.css`) vs inline SVGs.
- metric strips: `.stat-card` vs inline stat flex rows in `Training`.
- date selectors: N/A.
- range selectors: N/A.
- tab bars: Standard `tabs.tsx` vs custom segmented layouts in `Training` for history/programs.
- chart headers: N/A.
- legends: N/A.
- data-quality badges: `.home-status-chip` duplicates badge semantics.
- empty states: `.recent-activity-card--empty` duplicates missing data states in other views.
- loading states: N/A.
- error states: N/A.
- quick-action grids: `Home` grid layout vs `Training` quick actions.
- history rows: `recent-activity.tsx` duplicates list row pattern.
- detail rows: N/A.
- bottom sheets: `.sheet-surface` logic duplicates Radix `Sheet` logic.
- confirmation dialogs: N/A.
- icon buttons: `.press` vs Radix Button `icon` variant.
- progress indicators: `style={{ width: \`${pct}%\` }}`in`Training`vs`Home`driver percentages vs`Nutrition` bars. Consolidation priority: High.

# 10. CSS duplication audit

- exact duplicate selector blocks: N/A.
- repeated declaration groups:
  - Selectors: `.card-elev::before`, `.premium-card::before`, `.tile::before`
  - Source files: `src/styles.css`
  - Repeated declarations: `content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: inherit;`
  - Occurrences: Multiple
  - Refactor risk: Medium
- repeated literal values:
  - Selectors: Various cards
  - Source files: `src/styles.css`
  - Repeated declarations: `box-shadow: inset 0 1px rgb(255 255 255 / 0.035);`
  - Occurrences: > 5
- duplicate media-query behavior: Standard Tailwind usage.
- duplicate animation definitions: N/A.
- duplicate domain variants: `.home-section-card--muscle`, `.home-section-card--macros`, `.home-section-card--volume` all share identical radial-gradient structural mix.
- duplicate chart styles: N/A.
- duplicate overlay styles: `.sheet-surface` and `.momentum-sheet-hero` both define complex domain-mixed backgrounds.

# 11. Inline-style and hard-coded-value audit

- colors:
  - file: `src/components/app/views/training.tsx`
  - component: multiple elements
  - value: `style={{ color: "var(--section)" }}`, `style={{ background: "var(--section)" }}`
  - purpose: domain styling
  - dynamic: Yes, inherits `--section` but overrides locally.
  - test risk: High.
  - consolidation priority: High.
  - file: `src/components/app/views/nutrition.tsx`
  - component: container
  - value: `style={{ "--section": "rgb(34 197 94)" }}`
  - purpose: domain styling
  - dynamic: No.
  - test risk: High.
  - consolidation priority: High.
- pixel widths:
  - file: `src/components/app/views/home.tsx`
  - value: `style={{ width: "220px", flexBasis: "220px", height: "220px" }}`
  - purpose: static card size.
  - consolidation priority: High.
- transition duration:
  - file: `src/components/app/views/home.tsx`
  - value: `style={{ animationDelay: "80ms" }}`
  - purpose: cascade animation.
- opacity: Used inline for empty stat bars.

# 12. Button and action-control audit

- primary: `Button variant="default"` (`src/components/ui/button.tsx`).
- secondary: `Button variant="secondary"`.
- tertiary: `Button variant="outline"`.
- ghost: `Button variant="ghost"`.
- destructive: `Button variant="destructive"`.
- icon-only: Inline `.press` style buttons in Home/Training. Visual treatment: arbitrary scale/opacity. Duplicate implementation.
- floating: `GhostButton` in `Training`.
- quick action: `.home-settings-button`.
- segmented: Inline UI flex boxes.
- text link: `Button variant="link"`.
- chart action: N/A.
- sheet action: N/A.
- dialog action: N/A.
- disabled: Standard `disabled:opacity-50` on UI buttons, missing on inline `.press` buttons.
- loading: Missing dedicated state.

# 13. Form-control audit

- text inputs: `src/components/ui/input.tsx`. Standard Radix.
- numeric inputs: Uses text inputs with `type="number"`.
- textareas: `src/components/ui/textarea.tsx`.
- selects: `src/components/ui/select.tsx`.
- comboboxes: N/A.
- date inputs: `src/components/ui/calendar.tsx`.
- time inputs: N/A.
- checkboxes: `src/components/ui/checkbox.tsx`.
- radio groups: `src/components/ui/radio-group.tsx`.
- toggles: `src/components/ui/toggle.tsx`.
- sliders: `src/components/ui/slider.tsx`.
- segmented controls: `src/components/ui/toggle-group.tsx`.
- file inputs: N/A.

Duplicate implementations: None. Accessibility risk: Standard Radix handles most a11y.

# 14. Tab, filter, and selector audit

- domain: Training
- source: `src/components/app/views/training.tsx`
- semantic role: history/programs tab selector.
- active state: custom bg colors.
- keyboard behavior: native button.
- overflow behavior: flex wrap.
- mobile behavior: scales.
- duplicate implementation: Similar to UI Tabs but built custom inline.
- visual inconsistency: Bypasses standard tabs.

# 15. Status, feedback, and data-quality component audit

- loading: `src/components/ui/skeleton.tsx`.
- skeleton: `src/components/ui/skeleton.tsx`.
- empty: `.recent-activity-card--empty` (`src/styles.css`).
- partial: N/A.
- needs more data: N/A.
- stale: N/A.
- unsupported: N/A.
- unavailable: N/A.
- error: Standard UI alerts.
- success: `--success` color used inline.
- warning: `--warning` color used inline.
- offline: N/A.
- saved: N/A.
- saving: N/A.

Semantic inconsistency: Empty states vary between explicitly styled cards and just rendering "—".

# 16. Chart and visualization-system audit

- chart wrappers: `src/components/ui/chart.tsx`. Uses Recharts.
- chart headers: None standardized.
- range controls: None standardized.
- legends: Recharts default.
- tooltips: Recharts default modified by chart UI.
- focus mode: N/A.
- table view: N/A.
- exact-value navigation: N/A.
- comparison modes: N/A.
- chart stacks: N/A.
- pinned charts: N/A.
- suggested charts: N/A.
- annotations: N/A.
- series toggles: N/A.
- dual-axis handling: N/A.
- empty states: Renders blank space.
- partial states: N/A.
- responsive sizing: `ResponsiveContainer` from Recharts.

Styling ownership: `chart.tsx` manages Recharts overrides.

# 17. Overlay-system audit

- sheets: `src/components/ui/sheet.tsx` AND custom `.sheet-surface` in `src/styles.css`.
- dialogs: `src/components/ui/dialog.tsx`.
- popups: `src/components/ui/popover.tsx`.
- focus mode: N/A.
- menus: `src/components/ui/dropdown-menu.tsx`.
- tooltips: `src/components/ui/tooltip.tsx`.
- temporary notifications: `src/components/ui/sonner.tsx`.

Styling inconsistencies: The custom `.sheet-surface` logic in `styles.css` explicitly attempts to override Radix sheet backgrounds and padding, creating conflict risk.

# 18. Iconography audit

- icon library: `lucide-react`.
- custom SVGs: N/A.
- emoji: N/A.
- text symbols: "—" used for empty states.
- inline SVGs: None identified.
- chart markers: Default.
- status icons: `<Scale>`, `<Flame>`.
- domain icons: `<ListChecks>`.
- navigation icons: Custom `bottom-nav.tsx`.
- achievement icons: N/A.

Color behavior: Icons frequently use inline `style={{ color: "var(--section)" }}` (`Training`).

# 19. Motion and animation audit

- transitions: Tailwind default transitions (`transition-colors`).
- entry animations: `animate-tile-in` mapped to `@keyframes tile-in` (`src/styles.css`).
- sheet motion: Radix defaults.
- dialog motion: Radix defaults.
- card expansion: N/A.
- chart animation: Recharts defaults.
- count-up animation: N/A.
- swipe motion: N/A.
- loading animation: Skeleton pulse.
- progress animation: CSS transition on width.
- decorative animation: `.home-*` cascading delays.

Reduced-motion behavior: Handled via `@media (prefers-reduced-motion: reduce)` in `styles.css` which disables animation on `.home-*`.

# 20. Responsive-system audit

- breakpoints: Tailwind defaults (`sm`, `md`, `lg`).
- container widths: Tailwind generic container.
- mobile-first behavior: Standard utility classes.
- tablet behavior: N/A.
- desktop behavior: N/A.
- grid transitions: `grid-cols-1` to `grid-cols-3` used in Home.
- card stacking: Normal block flow.
- chart sizing: ResponsiveContainer.
- overlay sizing: `.sheet-surface` max-widths.
- navigation changes: Bottom nav fixed for mobile.
- safe-area handling: `env(safe-area-inset-bottom)` used in `.sheet-action-bar`.
- narrow-screen overrides: `.phone-shell` CSS in `styles.css`.

Contradictory rules: `.phone-shell` enforces border colors regardless of utility classes.

# 21. Accessibility-pattern audit

- focus visibility: Confirmed implementation on UI form elements via `focus-visible:ring-2`. Confirmed gap on custom `.press` inline buttons.
- keyboard interaction: Radix UI handles overlays/forms. Probable risk on custom click handlers on divs.
- touch targets: Confirmed implementation on Radix buttons. Probable risk on compact Home grids.
- labels: Radix `Label` component used.
- icon-only names: Probable risk on `.press` buttons.
- disabled semantics: Confirmed on Radix Button, gap on custom buttons.
- loading semantics: Gap.
- dialog semantics: Confirmed via Radix.
- table semantics: Confirmed.
- progress semantics: Probable risk on inline width bars.
- status announcements: N/A.
- color contrast risk: Probable risk with complex nested gradients.
- non-color-only communication: Confirmed.
- reduced motion: Confirmed implementation via CSS media query.
- heading hierarchy: Probable risk due to mixing `font-display` heavily.

# 22. Z-index and layering inventory

- bottom navigation: Handled via Tailwind z-index (`z-50` common pattern).
- sticky headers: `sticky bottom-0` in `.sheet-action-bar`.
- active-workout controls: N/A.
- sheets: Radix sheet z-index (`z-50`).
- dialogs: Radix dialog (`z-50`).
- popups: Radix popover (`z-50`).
- tooltips: Radix tooltip (`z-50`).
- Jarvis: N/A.
- chart focus mode: N/A.
- notifications: Sonner defaults.
- menus: Radix dropdown (`z-50`).

Collision risk: High if bespoke `.card-elev > * { z-index: 1 }` contexts interact with dropdowns.

# 23. Visual-consistency matrix by domain

- page header: Inconsistent (Home uses custom hero layout, others use standard padding).
- hero: Inconsistent (Home only).
- primary action: Inconsistent (Home uses `.press`, others `PrimaryButton`).
- metric cards: Inconsistent (`Home` custom CSS vs `Training` elevated cards).
- status strip: Inconsistent (`Home` chips vs `Recovery` text).
- chart container: Missing from main views.
- section header: Shared and consistent (`text-xs uppercase`).
- list rows: Inconsistent.
- empty state: Inconsistent.
- loading state: Shared and consistent (Skeleton).
- error state: Missing.
- sheets: Intentionally domain-specific (`.momentum-sheet-hero`).
- dialogs: Shared and consistent.
- Deep Dive access: Missing.
- mobile spacing: Shared and consistent (`pb-24`).
- desktop composition: Unclear.

# 24. Visual-debt risk register

- Duplicated shared primitives: High priority. `Card` vs `.card-elev`. Affects all domains. Regression risk during refactor.
- Hard-coded colors: High priority. `Nutrition` hardcodes green rgb; `Progress` hardcodes gold var. Breaks domain identity.
- Excessive domain-specific CSS: High priority. `src/styles.css` contains massive `.home-*` blocks mixing complex gradients.
- Inaccessible control variants: Medium priority. `.press` inline buttons lack focus rings.
- Conflicting CSS specificity: Medium priority. `.phone-shell` overrides standard Tailwind borders.

# 25. Current test-coverage map

- shared components: `tests/e2e/home.spec.ts` (covers Home shell layout).
- sheets: `tests/e2e/progress.spec.ts` (covers basic visibility).
- dialogs: `tests/e2e/recovery.spec.ts` (covers popup interactions).
- popups: `tests/e2e/settings.spec.ts` (covers setting states).
- charts: N/A.
- expandable cards: N/A.
- focus mode: N/A.
- keyboard navigation: N/A.
- reduced motion: N/A.
- responsive widths: N/A.
- mobile overlays: N/A.
- horizontal overflow: N/A.
- safe areas: N/A.
- status states: N/A.
- navigation shell: `tests/e2e/app.spec.ts` (covers tab routing).
- no-fatal-error behavior: Smoke tests in `tests/e2e/`.

Missing shared-component coverage: Visual regressions for bespoke gradients.

# 26. Consolidation-candidate map

- Component: Card (`src/components/ui/card.tsx` + `.card-elev` + `.home-section-card-*`)
  - Shared semantic purpose: Elevated surface.
  - Meaningful differences: Gradients and shadows vary by domain.
  - Files affected: All view files and styles.css.
  - Likely shared interface: `<Card variant="elevated" domain="home-muscle" />`
  - Classification: Strong candidate.

- Component: ProgressBar
  - Existing: Inline `style={{ width: \`${pct}%\` }}`
  - Shared semantic purpose: Visual progress.
  - Classification: Strong candidate.

# 27. Preservation checklist for future UI tasks

- [ ] existing shared components are reused where appropriate.
- [ ] domain identity remains distinct.
- [ ] ordinary cards remain neutral.
- [ ] gold remains achievement-only.
- [ ] semantic colors remain consistent.
- [ ] typography hierarchy remains coherent.
- [ ] spacing remains consistent.
- [ ] touch targets remain adequate.
- [ ] focus states remain visible.
- [ ] status states remain honest.
- [ ] charts retain units and data-quality states.
- [ ] overlays remain accessible.
- [ ] reduced motion remains supported.
- [ ] no arbitrary glass or gradients are introduced.
- [ ] no decorative looping animation is introduced.
- [ ] no duplicate component system is created.
- [ ] responsive widths are verified.
- [ ] page-level horizontal overflow is prevented.
- [ ] shared changes receive cross-domain regression tests.

# 28. Safe future task boundaries

- files safe for domain-local presentation changes: `src/components/app/views/*.tsx`.
- shared component hotspots: `src/components/ui/card.tsx`, `sheet.tsx`.
- shared stylesheet hotspots: `src/styles.css`.
- chart-system hotspots: `src/components/ui/chart.tsx`.
- overlay-system hotspots: `styles.css` `.sheet-surface`.
- navigation hotspots: `src/components/app/bottom-nav.tsx`.
- files likely to conflict with active UI redesign work: `src/styles.css`.
- files likely to conflict with future Settings work: `src/components/app/views/settings.tsx`.
- files that must remain untouched during Data Safety work: `lib/privacy-policy.ts`.
- test files likely to require coordination: `tests/e2e/*.spec.ts`.
- recommended sequencing boundaries: Standardize `Card` component before altering domain themes.

# 29. Open questions and uncertainties

- Question: Why does Nutrition view hardcode `rgb(34 197 94)` for `--section` instead of the intended amber-orange domain color?
  - Why unresolved: Hardcoded in `src/components/app/views/nutrition.tsx`.
  - Evidence required: Product requirements for nutrition identity.
  - Blocks consolidation: Yes, cannot unify themes if green is intentionally overriding amber.
  - Product clarification required: Yes.
- Question: Why does Progress view hardcode `--gold` for the entire section instead of emerald-teal?
  - Blocks consolidation: Yes.
  - Product clarification required: Yes.

# 30. File index

- global styles: `src/styles.css`
- route styles: N/A.
- shared UI components: `src/components/ui/*.tsx`
- domain-specific components: `src/components/app/views/home.tsx`, `training.tsx`, `nutrition.tsx`, `progress.tsx`, `recovery.tsx`, `settings.tsx`
- chart components: `src/components/ui/chart.tsx`
- overlay primitives: `src/components/ui/sheet.tsx`, `dialog.tsx`, `popover.tsx`
- form controls: `src/components/ui/input.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`
- navigation components: `src/components/app/bottom-nav.tsx`
- icons: `lucide-react` imports.
- animations: `src/styles.css` (`@keyframes tile-in`).
- responsive rules: `src/styles.css` (`.phone-shell`).
- accessibility helpers: `@media (prefers-reduced-motion)`
- tests: `tests/e2e/home.spec.ts`, `training.spec.ts`, `nutrition.spec.ts`, `progress.spec.ts`, `recovery.spec.ts`
- documentation references: `docs/audits/`
