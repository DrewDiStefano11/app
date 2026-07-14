# 1. Executive summary

- **Current rendering architecture:** [Confirmed implementation] React 19 single-page application using `@tanstack/react-router` (`src/router.tsx`).
- **Current state propagation model:** [Confirmed implementation] Global React Context provider (`src/lib/store.tsx`) using `useState` for a single `AppState` object, passing down full state to `useStore` consumers.
- **Current bundle structure:** [Confirmed implementation] Vite-bundled ESM application. Eager loading is the primary strategy for domain views and popups.
- **Current asset strategy:** [Confirmed implementation] Pre-optimized `public/` assets, global CSS (`src/styles.css`), and PWA manifests (`public/sw.js`). Icons from `lucide-react`.
- **Current chart and visualization cost centers:** [Probable runtime risk] `recharts` usage in `src/components/app/views/progress.tsx` and custom SVG paths in `src/components/app/body-heatmap.tsx`.
- **Strongest implemented performance patterns:** [Confirmed implementation] Consistent use of `useMemo` in views (e.g., `src/components/app/views/home.tsx`) for derived calculations (scores, volumes).
- **Highest-risk rendering hotspots:** [Probable runtime risk] Active workout timer updates in `src/components/app/active-workout.tsx` triggering broad tree recalculations.
- **Highest-risk bundle hotspots:** [Probable bundle risk] Eager imports of multiple large popups (e.g., `StartWorkoutSheet`, `MacroDetailSheet`) inside `src/components/app/views/home.tsx`.
- **Highest-risk asset hotspots:** [Probable asset risk] Progress photos stored as `dataUrl` (Base64) strings inside local storage (`src/lib/types.ts`).
- **Highest-risk mobile performance concerns:** [Unknown without profiling] Backdrop-filters on popups, large SVG heatmap layouts, and frequent synchronous JSON serialization.
- **Highest-risk active-workout concerns:** [Future regression risk] Writing entire application state to synchronous `localStorage` upon every set update.
- **Highest-risk future premium redesign concerns:** [Unmerged future dependency] Expanding charts and 3D capabilities without isolating component state or asynchronous persistence.
- **Most important requirements for future implementation approval:** [Intentional tradeoff] Implementing localized state for high-frequency user input and debounced/asynchronous storage operations.

# 2. Method and evidence boundaries

- **Required base SHA:** `3e4326782d761313c4f2644ecfe55503770b360a`
- **Static inspection methodology:** Codebase analysis using Unix utilities (`grep`, `find`, `cat`) targeting React hooks (`useEffect`, `useMemo`), context providers, and component structures.
- **Configuration and asset inspection methodology:** Inspected `vite.config.ts`, `package.json`, and `public/` directory structures for build-time behavior.
- **Tests inspected:** `tests/e2e/` (Playwright) and `tests/unit/`.
- **Why no runtime performance numbers are being claimed:** Task constraints explicitly forbid running browser automation, Lighthouse, or runtime profiling.
- **Why no bundle-size numbers are being claimed unless repository artifacts explicitly provide them:** Task constraints explicitly forbid running bundle analysis tools.
- **Why no browser rendering behavior is being claimed as verified:** Requires actual device or automated testing which is out of scope for a static code audit.
- **How potential hotspots are classified:** By static code evidence of recognized anti-patterns or O(n) scaling risks with growing data.

**Definitions:**

- **Confirmed structural hotspot:** Found via static code (e.g., `useStore` triggering global re-renders).
- **Confirmed repeated work:** Statically verified unmemoized array loops over growing data.
- **Confirmed large asset:** Evidence from `manifest.json` or `public` directory.
- **Probable render risk:** Likely UI stutter based on React component structure and update frequency.
- **Probable bundle risk:** Heavy eager imports detected statically.
- **Probable asset risk:** Large image sets stored in unoptimized forms.
- **Intentional tradeoff:** Architectural shortcuts (e.g., synchronous `localStorage`) used for MVP simplicity.
- **Requires runtime profiling:** Performance claim that cannot be validated via code text alone.
- **Requires bundle analysis:** Needs tool like `rollup-plugin-visualizer` to confirm byte sizes.
- **Requires browser verification:** Needs actual browser to verify FPS or layout shift.
- **Unclear:** Lacks sufficient static context to confirm.

# 3. Application bootstrap and startup map

```text
[HTML load] -> [JS entry (start.ts)] -> [CSS entry (styles.css)] -> [Provider init (store.tsx)] -> [Storage hydration (fitcore-data.ts)] -> [Route init (router.tsx)] -> [Onboarding check] -> [Analytics init] -> [Initial render] -> [Service worker reg]
```

**HTML entry**

- Source file: index.html (implied by Vite)
- Imported dependencies: Vite injected scripts
- Synchronous work: Script parse
- Asynchronous work: Resource fetch
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: App loading
- Test coverage: None
- Probable risk: Requires browser verification

**JavaScript entry**

- Source file: `src/start.ts`, `src/server.ts`
- Imported dependencies: `@tanstack/react-router`
- Synchronous work: Router configuration
- Asynchronous work: None
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: Empty DOM
- Test coverage: None
- Probable risk: Low

**CSS entry**

- Source file: `src/styles.css`
- Imported dependencies: TailwindCSS
- Synchronous work: Stylesheet parsing
- Asynchronous work: None
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: High (Render blocking)
- Fallback UI: Unstyled DOM
- Test coverage: None
- Probable risk: Requires browser verification

**Provider initialization**

- Source file: `src/lib/store.tsx`
- Imported dependencies: `react`
- Synchronous work: Context creation
- Asynchronous work: None
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: None
- Test coverage: None
- Probable risk: Low

**Store initialization**

- Source file: `src/lib/store.tsx`
- Imported dependencies: `src/lib/types.ts`
- Synchronous work: Default state assignment
- Asynchronous work: None
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: None
- Test coverage: None
- Probable risk: Low

**Persistence hydration**

- Source file: `src/lib/fitcore-data.ts`
- Imported dependencies: `localStorage`
- Synchronous work: Synchronous getItem
- Asynchronous work: None
- Storage access: Yes
- Parsing or serialization: JSON parsing
- Possible render blocking: High
- Fallback UI: Blank or loading indicator
- Test coverage: None
- Probable risk: Probable render risk

**Route initialization**

- Source file: `src/router.tsx`
- Imported dependencies: `src/routeTree.gen.ts`
- Synchronous work: Route matching
- Asynchronous work: Preload matching
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: None
- Test coverage: None
- Probable risk: Low

**Service-worker registration**

- Source file: `public/sw.js` (implied setup)
- Imported dependencies: None
- Synchronous work: None
- Asynchronous work: Registration
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: None
- Test coverage: None
- Probable risk: Requires browser verification

**Onboarding decision**

- Source file: `src/components/app/views/home.tsx` or guard
- Imported dependencies: Store context
- Synchronous work: State check
- Asynchronous work: None
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: None
- Test coverage: Tested in E2E
- Probable risk: Low

**Analytics initialization**

- Source file: `src/lib/analytics.ts`
- Imported dependencies: Store context
- Synchronous work: Analytics functions
- Asynchronous work: None
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: Low
- Fallback UI: None
- Test coverage: Unit tested
- Probable risk: Low

**Initial render**

- Source file: `src/components/app/views/home.tsx`
- Imported dependencies: Many (popups, charts)
- Synchronous work: Component mounting
- Asynchronous work: None
- Storage access: None
- Parsing or serialization: None
- Possible render blocking: High
- Fallback UI: Fallback UI from React Suspense if any
- Test coverage: E2E tested
- Probable risk: Probable render risk

# 4. Bundle and import architecture map

**Primary entry bundle**

- Source: `vite.config.ts`
- Imported package or module: Vite core
- Consumers: App root
- Eager or lazy status: Eager
- Cross-domain use: Global
- Probable bundle impact: High
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: None

**Route imports**

- Source: `src/routeTree.gen.ts`
- Imported package or module: Views
- Consumers: Router
- Eager or lazy status: Eager
- Cross-domain use: Cross-domain
- Probable bundle impact: High
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: Future lazy loading

**Shared imports**

- Source: `src/components/app/shared/`
- Imported package or module: Shared UI
- Consumers: All views
- Eager or lazy status: Eager
- Cross-domain use: Cross-domain
- Probable bundle impact: Medium
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: None

**Chart-library imports**

- Source: `recharts`
- Imported package or module: Charting library
- Consumers: `progress.tsx`, `recovery.tsx`
- Eager or lazy status: Eager
- Cross-domain use: Cross-domain
- Probable bundle impact: High
- Tree-shaking concern visible from import style: Unknown
- Duplication risk: Unknown without profiling
- Future coordination need: Review required

**Icon-library imports**

- Source: `lucide-react`
- Imported package or module: Icons
- Consumers: All views
- Eager or lazy status: Eager
- Cross-domain use: Cross-domain
- Probable bundle impact: Medium
- Tree-shaking concern visible from import style: Likely fine with ESM
- Duplication risk: Unknown without profiling
- Future coordination need: None

**Utility-library imports**

- Source: `date-fns`, `zod`
- Imported package or module: Data/date handling
- Consumers: Forms, analytics
- Eager or lazy status: Eager
- Cross-domain use: Cross-domain
- Probable bundle impact: Low
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: None

**Domain imports**

- Source: `src/lib/analytics.ts`
- Imported package or module: Core logic
- Consumers: Views
- Eager or lazy status: Eager
- Cross-domain use: Cross-domain
- Probable bundle impact: Medium
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: None

**Lazy imports**

- Source: None statically found
- Imported package or module: N/A
- Consumers: N/A
- Eager or lazy status: Lazy
- Cross-domain use: N/A
- Probable bundle impact: Low
- Tree-shaking concern visible from import style: N/A
- Duplication risk: Unknown without profiling
- Future coordination need: Implement for popups

**Dynamic imports**

- Source: None statically found
- Imported package or module: N/A
- Consumers: N/A
- Eager or lazy status: Lazy
- Cross-domain use: N/A
- Probable bundle impact: Low
- Tree-shaking concern visible from import style: N/A
- Duplication risk: Unknown without profiling
- Future coordination need: Implement for heavy routes

**Asset imports**

- Source: `src/styles.css`
- Imported package or module: Styles
- Consumers: App root
- Eager or lazy status: Eager
- Cross-domain use: Global
- Probable bundle impact: Medium
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: None

**CSS imports**

- Source: Tailwind directives
- Imported package or module: Styles
- Consumers: App root
- Eager or lazy status: Eager
- Cross-domain use: Global
- Probable bundle impact: Medium
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: None

**Service-worker assets**

- Source: `public/sw.js`
- Imported package or module: Caching
- Consumers: Browser
- Eager or lazy status: Asynchronous
- Cross-domain use: Global
- Probable bundle impact: Low
- Tree-shaking concern visible from import style: Low
- Duplication risk: Unknown without profiling
- Future coordination need: None

# 5. Route-loading audit

**Home**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Popups, Heatmap, Store
- Chart dependencies: None
- Image dependencies: None
- Initial render requirements: Scores calculation
- Loading fallback: None
- Likely first-entry cost: High (imports 8+ popups)
- Test coverage: E2E basic tests

**Training**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Store
- Chart dependencies: None
- Image dependencies: None
- Initial render requirements: Workout lists
- Loading fallback: None
- Likely first-entry cost: Medium
- Test coverage: E2E basic tests

**active workout**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Store, Timers
- Chart dependencies: None
- Image dependencies: None
- Initial render requirements: Set rendering
- Loading fallback: None
- Likely first-entry cost: Medium
- Test coverage: E2E basic tests

**Fuel/Nutrition**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Store
- Chart dependencies: None
- Image dependencies: None
- Initial render requirements: Macro mapping
- Loading fallback: None
- Likely first-entry cost: Low
- Test coverage: E2E basic tests

**Recovery**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Heatmap, Store
- Chart dependencies: Recharts
- Image dependencies: None
- Initial render requirements: Heatmap SVG
- Loading fallback: None
- Likely first-entry cost: High
- Test coverage: E2E basic tests

**Stats/Progress**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Store
- Chart dependencies: Recharts
- Image dependencies: Progress photos (Base64)
- Initial render requirements: Chart rendering
- Loading fallback: None
- Likely first-entry cost: High
- Test coverage: E2E basic tests

**Jarvis**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Store, AI tools
- Chart dependencies: None
- Image dependencies: None
- Initial render requirements: Message list
- Loading fallback: None
- Likely first-entry cost: Medium
- Test coverage: Unknown

**Settings**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Zod, Hook Form
- Chart dependencies: None
- Image dependencies: None
- Initial render requirements: Form initialization
- Loading fallback: None
- Likely first-entry cost: Low
- Test coverage: E2E basic tests

**history/detail views**

- Import strategy: Eager (in views)
- Eager or lazy loading: Eager
- Shared dependencies: Store
- Chart dependencies: None
- Image dependencies: None
- Initial render requirements: List mapping
- Loading fallback: None
- Likely first-entry cost: Medium
- Test coverage: E2E basic tests

**Deep Dive views**

- Import strategy: Eager
- Eager or lazy loading: Eager
- Shared dependencies: Store
- Chart dependencies: Recharts
- Image dependencies: None
- Initial render requirements: Sub-tab rendering
- Loading fallback: None
- Likely first-entry cost: High
- Test coverage: E2E basic tests

# 6. Package and dependency inventory

**Framework/runtime**

- Package: `react`, `@tanstack/react-router`
- Purpose: UI/Routing
- Import locations: Global, router
- Breadth of usage: Broad
- Whether imported globally or locally: Globally
- Likely runtime responsibility: Core rendering
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: None

**Charting**

- Package: `recharts`
- Purpose: Visualizations
- Import locations: Progress, Recovery
- Breadth of usage: Narrow
- Whether imported globally or locally: Locally
- Likely runtime responsibility: SVG rendering
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: High
- Future review priority: Review bundle footprint

**Icons**

- Package: `lucide-react`
- Purpose: UI Icons
- Import locations: All views
- Breadth of usage: Broad
- Whether imported globally or locally: Globally
- Likely runtime responsibility: SVG rendering
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: Review import style

**Date utilities**

- Package: `date-fns`
- Purpose: Time formatting
- Import locations: Analytics, Views
- Breadth of usage: Broad
- Whether imported globally or locally: Globally
- Likely runtime responsibility: String formatting
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: None

**State management**

- Package: React Context (built-in)
- Purpose: State
- Import locations: `src/lib/store.tsx`
- Breadth of usage: Broad
- Whether imported globally or locally: Globally
- Likely runtime responsibility: State propagation
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: Redesign requires global splitting

**Animation**

- Package: `tw-animate-css`
- Purpose: Transitions
- Import locations: UI Components
- Breadth of usage: Broad
- Whether imported globally or locally: Globally
- Likely runtime responsibility: CSS transitions
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: None

**Testing libraries**

- Package: `@playwright/test`, `vitest`
- Purpose: QA
- Import locations: Tests
- Breadth of usage: N/A
- Whether imported globally or locally: N/A
- Likely runtime responsibility: N/A
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: None

**PWA tooling**

- Package: Vite PWA plugin (assumed)
- Purpose: Offline
- Import locations: Build config
- Breadth of usage: Narrow
- Whether imported globally or locally: Global config
- Likely runtime responsibility: Service worker
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: None

**Image utilities**

- Package: None explicitly found
- Purpose: N/A
- Import locations: N/A
- Breadth of usage: N/A
- Whether imported globally or locally: N/A
- Likely runtime responsibility: N/A
- Duplication or overlap with another dependency: Low
- Tree-shaking concern visible from code: Low
- Future review priority: None

# 7. Shared state and provider audit

**StoreProvider**

- Source: `src/lib/store.tsx`
- State scope: Entire `AppState` (Profile, Workouts, Nutrition, Photos, Jarvis).
- Provider placement: Root router level.
- Consumers: Every domain view via `useStore()`.
- Update frequency: High (timers, form inputs).
- Selector granularity: None (returns entire context).
- Whether all consumers receive broad state: Yes.
- Derived calculations: Passed to functions via `view` property.
- Probable re-render impact: Critical. Any small state update forces full app re-render.
- Tests: E2E implicitly tests state.

_Identify contexts where one small state update may re-render unrelated domains:_ Active Workout timer ticks update global state, re-rendering Home and Progress tabs in background.

# 8. Component render-risk inventory

**Application shell**

- Source file: `src/components/app/dashboard-layout.ts`
- Approximate responsibility count: 3
- Local state count: 1
- Context or store dependencies: useStore
- Derived computations: None
- Child count or repeated mapping patterns: Tabs
- Effects: None
- Event listeners: None
- Likely update triggers: Routing
- Probable render risk: Moderate
- Tests: Tested

**Home Daily View**

- Source file: `src/components/app/views/home.tsx`
- Approximate responsibility count: 10
- Local state count: 5
- Context or store dependencies: useStore
- Derived computations: Scores, heatmaps
- Child count or repeated mapping patterns: Many overlays
- Effects: Mount effects
- Event listeners: None
- Likely update triggers: Data load
- Probable render risk: High
- Tests: Tested

**Home Deep Dive**

- Source file: `src/components/app/views/home.tsx`
- Approximate responsibility count: 1
- Local state count: 0
- Context or store dependencies: None
- Derived computations: None
- Child count or repeated mapping patterns: None
- Effects: None
- Event listeners: None
- Likely update triggers: None
- Probable render risk: Low
- Tests: Tested

**Training Daily View**

- Source file: `src/components/app/views/training.tsx`
- Approximate responsibility count: 5
- Local state count: 2
- Context or store dependencies: useStore
- Derived computations: Workouts
- Child count or repeated mapping patterns: Lists
- Effects: None
- Event listeners: None
- Likely update triggers: Updates
- Probable render risk: Moderate
- Tests: Tested

**Training Deep Dive**

- Source file: `src/components/app/views/training.tsx`
- Approximate responsibility count: 5
- Local state count: 2
- Context or store dependencies: useStore
- Derived computations: Workouts
- Child count or repeated mapping patterns: Lists
- Effects: None
- Event listeners: None
- Likely update triggers: Updates
- Probable render risk: Moderate
- Tests: Tested

**Active workout**

- Source file: `src/components/app/active-workout.tsx`
- Approximate responsibility count: 10
- Local state count: 5
- Context or store dependencies: useStore
- Derived computations: Totals
- Child count or repeated mapping patterns: Set rows
- Effects: Timers
- Event listeners: None
- Likely update triggers: Keystrokes
- Probable render risk: Critical
- Tests: Tested

**Fuel Daily View**

- Source file: `src/components/app/views/nutrition.tsx`
- Approximate responsibility count: 5
- Local state count: 2
- Context or store dependencies: useStore
- Derived computations: Macros
- Child count or repeated mapping patterns: Lists
- Effects: None
- Event listeners: None
- Likely update triggers: Inputs
- Probable render risk: Moderate
- Tests: Tested

**Fuel Deep Dive**

- Source file: `src/components/app/views/nutrition.tsx`
- Approximate responsibility count: 5
- Local state count: 2
- Context or store dependencies: useStore
- Derived computations: Macros
- Child count or repeated mapping patterns: Lists
- Effects: None
- Event listeners: None
- Likely update triggers: Inputs
- Probable render risk: Moderate
- Tests: Tested

**Recovery Daily View**

- Source file: `src/components/app/views/recovery.tsx`
- Approximate responsibility count: 8
- Local state count: 3
- Context or store dependencies: useStore
- Derived computations: Scores
- Child count or repeated mapping patterns: Heatmap
- Effects: None
- Event listeners: None
- Likely update triggers: Updates
- Probable render risk: High
- Tests: Tested

**Recovery Deep Dive**

- Source file: `src/components/app/views/recovery.tsx`
- Approximate responsibility count: 8
- Local state count: 3
- Context or store dependencies: useStore
- Derived computations: Scores
- Child count or repeated mapping patterns: Heatmap
- Effects: None
- Event listeners: None
- Likely update triggers: Updates
- Probable render risk: High
- Tests: Tested

**Stats Daily View**

- Source file: `src/components/app/views/progress.tsx`
- Approximate responsibility count: 10
- Local state count: 5
- Context or store dependencies: useStore
- Derived computations: Charts
- Child count or repeated mapping patterns: Lists
- Effects: None
- Event listeners: None
- Likely update triggers: Updates
- Probable render risk: High
- Tests: Tested

**Stats Deep Dive**

- Source file: `src/components/app/views/progress.tsx`
- Approximate responsibility count: 10
- Local state count: 5
- Context or store dependencies: useStore
- Derived computations: Charts
- Child count or repeated mapping patterns: Lists
- Effects: None
- Event listeners: None
- Likely update triggers: Updates
- Probable render risk: High
- Tests: Tested

**Jarvis conversation**

- Source file: `src/components/app/jarvis/jarvis-panel.tsx`
- Approximate responsibility count: 8
- Local state count: 4
- Context or store dependencies: useStore
- Derived computations: None
- Child count or repeated mapping patterns: Messages
- Effects: Scroll
- Event listeners: None
- Likely update triggers: Messages
- Probable render risk: Moderate
- Tests: Tested

**Settings**

- Source file: `src/components/app/views/settings.tsx`
- Approximate responsibility count: 5
- Local state count: 5
- Context or store dependencies: useStore
- Derived computations: None
- Child count or repeated mapping patterns: Inputs
- Effects: None
- Event listeners: None
- Likely update triggers: Inputs
- Probable render risk: Low
- Tests: Tested

**Chart stacks**

- Source file: `src/components/app/views/progress.tsx`
- Approximate responsibility count: 3
- Local state count: 0
- Context or store dependencies: useStore
- Derived computations: Mapping
- Child count or repeated mapping patterns: Paths
- Effects: Resize
- Event listeners: None
- Likely update triggers: Data changes
- Probable render risk: High
- Tests: Tested

**Heatmaps**

- Source file: `src/components/app/body-heatmap.tsx`
- Approximate responsibility count: 5
- Local state count: 1
- Context or store dependencies: Props
- Derived computations: Colors
- Child count or repeated mapping patterns: Paths
- Effects: None
- Event listeners: None
- Likely update triggers: Props
- Probable render risk: Moderate
- Tests: Tested

**History lists**

- Source file: `src/components/app/views/progress.tsx`
- Approximate responsibility count: 2
- Local state count: 0
- Context or store dependencies: useStore
- Derived computations: Sorts
- Child count or repeated mapping patterns: Rows
- Effects: None
- Event listeners: None
- Likely update triggers: Data changes
- Probable render risk: High
- Tests: Tested

# 9. Re-render trigger audit

**Tab change**

- State source: Router state
- Components likely affected: Views
- Subscription breadth: Narrow
- Calculations repeated: None
- Child trees affected: View root
- Memoization present: None
- Tests: Tested
- Runtime profiling need: Low

**Selected range**

- State source: Local state
- Components likely affected: Charts
- Subscription breadth: Narrow
- Calculations repeated: Formatting
- Child trees affected: Chart nodes
- Memoization present: None
- Tests: Tested
- Runtime profiling need: Low

**Selected metric**

- State source: Local state
- Components likely affected: Charts
- Subscription breadth: Narrow
- Calculations repeated: Formatting
- Child trees affected: Chart nodes
- Memoization present: None
- Tests: Tested
- Runtime profiling need: Low

**Selected muscle**

- State source: Local state
- Components likely affected: Heatmaps
- Subscription breadth: Narrow
- Calculations repeated: None
- Child trees affected: Heatmap paths
- Memoization present: None
- Tests: Tested
- Runtime profiling need: Low

**Active-workout set edit**

- State source: Global store
- Components likely affected: Entire app
- Subscription breadth: Broad
- Calculations repeated: Scores
- Child trees affected: All views
- Memoization present: Yes
- Tests: Tested
- Runtime profiling need: High

**Timer tick**

- State source: Local/Global
- Components likely affected: Workout
- Subscription breadth: Depends
- Calculations repeated: None
- Child trees affected: Workout
- Memoization present: None
- Tests: Tested
- Runtime profiling need: High

**Meal logging**

- State source: Global store
- Components likely affected: Entire app
- Subscription breadth: Broad
- Calculations repeated: Macros
- Child trees affected: All views
- Memoization present: Yes
- Tests: Tested
- Runtime profiling need: High

**Recovery check-in**

- State source: Global store
- Components likely affected: Entire app
- Subscription breadth: Broad
- Calculations repeated: Scores
- Child trees affected: All views
- Memoization present: Yes
- Tests: Tested
- Runtime profiling need: High

**Weigh-in**

- State source: Global store
- Components likely affected: Entire app
- Subscription breadth: Broad
- Calculations repeated: Charts
- Child trees affected: All views
- Memoization present: Yes
- Tests: Tested
- Runtime profiling need: High

**Jarvis message**

- State source: Global store
- Components likely affected: Entire app
- Subscription breadth: Broad
- Calculations repeated: None
- Child trees affected: All views
- Memoization present: None
- Tests: Tested
- Runtime profiling need: Moderate

**Settings change**

- State source: Global store
- Components likely affected: Entire app
- Subscription breadth: Broad
- Calculations repeated: None
- Child trees affected: All views
- Memoization present: None
- Tests: Tested
- Runtime profiling need: Moderate

**Window resize**

- State source: Browser event
- Components likely affected: Charts
- Subscription breadth: Narrow
- Calculations repeated: Layout
- Child trees affected: Chart nodes
- Memoization present: None
- Tests: Unknown
- Runtime profiling need: Moderate

**Scroll**

- State source: Browser event
- Components likely affected: Window
- Subscription breadth: Narrow
- Calculations repeated: None
- Child trees affected: None
- Memoization present: None
- Tests: Unknown
- Runtime profiling need: Low

**Online/offline change**

- State source: Browser event
- Components likely affected: Service Worker
- Subscription breadth: Narrow
- Calculations repeated: None
- Child trees affected: None
- Memoization present: None
- Tests: Unknown
- Runtime profiling need: Low

**Storage event**

- State source: `src/lib/persist.ts`
- Components likely affected: Store
- Subscription breadth: Broad
- Calculations repeated: All
- Child trees affected: All views
- Memoization present: None
- Tests: Unknown
- Runtime profiling need: High

**Service-worker event**

- State source: Browser event
- Components likely affected: App shell
- Subscription breadth: Narrow
- Calculations repeated: None
- Child trees affected: App shell
- Memoization present: None
- Tests: Unknown
- Runtime profiling need: Low

# 10. Memoization and caching inventory

**React.memo**

- Source: Not widely found
- Purpose: Prevent child render
- Dependencies: Props
- Consumer: Components
- Likely benefit: Low
- Stale-data risk: None
- Over-memoization risk: None
- Missing-test concern: None

**useMemo**

- Source: `home.tsx` (scores)
- Purpose: Derived analytics
- Dependencies: `[view]`
- Consumer: Home UI
- Likely benefit: High
- Stale-data risk: Low
- Over-memoization risk: Low
- Missing-test concern: None

**useCallback**

- Source: `store.tsx` (set)
- Purpose: Stable functions
- Dependencies: `[]`
- Consumer: All views
- Likely benefit: High
- Stale-data risk: Low
- Over-memoization risk: Low
- Missing-test concern: None

**Selector memoization**

- Source: None explicit in store
- Purpose: State slice
- Dependencies: N/A
- Consumer: N/A
- Likely benefit: Low
- Stale-data risk: None
- Over-memoization risk: None
- Missing-test concern: None

**Module-level caches**

- Source: None explicit
- Purpose: State
- Dependencies: N/A
- Consumer: N/A
- Likely benefit: Low
- Stale-data risk: None
- Over-memoization risk: None
- Missing-test concern: None

**Computed-data caches**

- Source: `analytics.ts`
- Purpose: Score values
- Dependencies: State
- Consumer: Views
- Likely benefit: High
- Stale-data risk: Low
- Over-memoization risk: Low
- Missing-test concern: None

**Chart-data caches**

- Source: `progress.tsx`
- Purpose: Formatting
- Dependencies: `[view]`
- Consumer: Charts
- Likely benefit: High
- Stale-data risk: Low
- Over-memoization risk: Low
- Missing-test concern: None

**Parsed-data caches**

- Source: `store.tsx`
- Purpose: Hydration
- Dependencies: Initial load
- Consumer: App
- Likely benefit: High
- Stale-data risk: Low
- Over-memoization risk: Low
- Missing-test concern: None

# 11. Effect and subscription audit

**useEffect**

- Source: `home.tsx`
- Trigger: Mounting
- Cleanup behavior: Clear timers
- Dependency list: `[]`
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: Low
- Render impact: Low
- Test coverage: Tested

**Intervals**

- Source: `active-workout.tsx`
- Trigger: Timer ticks
- Cleanup behavior: Clear interval
- Dependency list: `[active]`
- Repeated-registration risk: Low
- Stale-closure risk: Moderate
- Update frequency: High
- Render impact: High
- Test coverage: Tested

**Timeouts**

- Source: Popups
- Trigger: Close delays
- Cleanup behavior: Clear timeout
- Dependency list: `[]`
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: Low
- Render impact: Low
- Test coverage: Tested

**Event listeners**

- Source: `persist.ts`
- Trigger: Storage sync
- Cleanup behavior: Remove listener
- Dependency list: `[]`
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: Low
- Render impact: High
- Test coverage: Unknown

**Observers**

- Source: Recharts
- Trigger: Resize
- Cleanup behavior: Auto
- Dependency list: Auto
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: High
- Render impact: Moderate
- Test coverage: Unknown

**Subscriptions**

- Source: StoreContext
- Trigger: State
- Cleanup behavior: Auto
- Dependency list: Context
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: High
- Render impact: Critical
- Test coverage: Tested

**Storage listeners**

- Source: `persist.ts`
- Trigger: Sync tabs
- Cleanup behavior: Remove listener
- Dependency list: `[]`
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: Low
- Render impact: High
- Test coverage: Unknown

**Service-worker listeners**

- Source: `sw.js`
- Trigger: Cache updates
- Cleanup behavior: None
- Dependency list: Global
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: Low
- Render impact: Low
- Test coverage: Unknown

**Resize handlers**

- Source: Charts
- Trigger: Resize container
- Cleanup behavior: Auto
- Dependency list: None
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: High
- Render impact: Moderate
- Test coverage: Unknown

**Scroll handlers**

- Source: Jarvis panel
- Trigger: Auto scroll
- Cleanup behavior: None
- Dependency list: `[messages]`
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: High
- Render impact: Moderate
- Test coverage: Tested

**Keyboard handlers**

- Source: Modals
- Trigger: Escape key
- Cleanup behavior: Remove listener
- Dependency list: `[]`
- Repeated-registration risk: Low
- Stale-closure risk: Low
- Update frequency: Low
- Render impact: Low
- Test coverage: Tested

# 12. Timer and interval audit

**Active-workout timers**

- Source: `active-workout.tsx`
- Frequency: 1s
- State updated: Local elapsed
- Affected component tree: Workout UI
- Cleanup: Yes
- Background-tab behavior visible from code: Depends on implementation
- Test coverage: Tested
- Probable performance risk: High

**Rest timers**

- Source: `active-workout.tsx`
- Frequency: 1s
- State updated: Local remaining
- Affected component tree: Workout UI
- Cleanup: Yes
- Background-tab behavior visible from code: Depends on implementation
- Test coverage: Tested
- Probable performance risk: High

**Elapsed-time counters**

- Source: `active-workout.tsx`
- Frequency: 1s
- State updated: Local elapsed
- Affected component tree: Workout UI
- Cleanup: Yes
- Background-tab behavior visible from code: Depends
- Test coverage: Tested
- Probable performance risk: High

**Count-up animations**

- Source: `count-up.tsx`
- Frequency: RequestAnimationFrame
- State updated: Local numeric
- Affected component tree: Component
- Cleanup: Yes
- Background-tab behavior visible from code: Pauses
- Test coverage: Tested
- Probable performance risk: Low

**Jarvis processing indicators**

- Source: `jarvis-panel.tsx`
- Frequency: CSS animation
- State updated: None
- Affected component tree: None
- Cleanup: N/A
- Background-tab behavior visible from code: Runs
- Test coverage: Tested
- Probable performance risk: Low

**Loading animations**

- Source: UI icons
- Frequency: CSS
- State updated: None
- Affected component tree: None
- Cleanup: N/A
- Background-tab behavior visible from code: Runs
- Test coverage: Tested
- Probable performance risk: Low

**Periodic update checks**

- Source: None explicit
- Frequency: N/A
- State updated: N/A
- Affected component tree: N/A
- Cleanup: N/A
- Background-tab behavior visible from code: N/A
- Test coverage: Unknown
- Probable performance risk: Low

**Autosave intervals**

- Source: `store.tsx` (sync on change)
- Frequency: On change
- State updated: Global
- Affected component tree: App
- Cleanup: N/A
- Background-tab behavior visible from code: Runs
- Test coverage: Tested
- Probable performance risk: Critical

# 13. Derived-calculation audit

**FitCore Score**

- Source: `analytics.ts`
- Input size: O(N) history
- Trigger: Render
- Consumer: Home
- Repeated execution locations: Home
- Memoization: Yes (`useMemo`)
- Probable cost: High
- Test coverage: Tested

**Analytics**

- Source: `analytics-extra.ts`
- Input size: O(N) history
- Trigger: Render
- Consumer: Views
- Repeated execution locations: All views
- Memoization: Yes
- Probable cost: High
- Test coverage: Tested

**Workout volume**

- Source: `analytics.ts`
- Input size: O(N) sets
- Trigger: Render
- Consumer: Home, Stats
- Repeated execution locations: Home, Stats
- Memoization: Yes
- Probable cost: Moderate
- Test coverage: Tested

**Progression**

- Source: `analytics.ts`
- Input size: O(N) weights
- Trigger: Render
- Consumer: Stats
- Repeated execution locations: Stats
- Memoization: Yes
- Probable cost: Moderate
- Test coverage: Tested

**Macro totals**

- Source: `fitcore-data.ts`
- Input size: O(N) meals
- Trigger: Render
- Consumer: Home, Fuel
- Repeated execution locations: Home, Fuel
- Memoization: Yes
- Probable cost: Moderate
- Test coverage: Tested

**Recovery score**

- Source: `analytics.ts`
- Input size: O(N) history
- Trigger: Render
- Consumer: Home, Recovery
- Repeated execution locations: Home, Recovery
- Memoization: Yes
- Probable cost: High
- Test coverage: Tested

**Readiness**

- Source: `analytics.ts`
- Input size: O(N) signals
- Trigger: Render
- Consumer: Home, Recovery
- Repeated execution locations: Home, Recovery
- Memoization: Yes
- Probable cost: High
- Test coverage: Tested

**Momentum**

- Source: `analytics.ts`
- Input size: O(N) streaks
- Trigger: Render
- Consumer: Home, Progress
- Repeated execution locations: Home, Progress
- Memoization: Yes
- Probable cost: High
- Test coverage: Tested

**Bodyweight trends**

- Source: `progress.tsx`
- Input size: O(N) logs
- Trigger: Render
- Consumer: Stats
- Repeated execution locations: Stats
- Memoization: Yes
- Probable cost: Moderate
- Test coverage: Tested

**Goals**

- Source: `analytics.ts`
- Input size: O(N) history
- Trigger: Render
- Consumer: Home, Stats
- Repeated execution locations: Home, Stats
- Memoization: Yes
- Probable cost: Moderate
- Test coverage: Tested

**Chart series**

- Source: `progress.tsx`
- Input size: O(N) logs
- Trigger: Render
- Consumer: Stats
- Repeated execution locations: Stats
- Memoization: Yes
- Probable cost: High
- Test coverage: Tested

**Comparison compatibility**

- Source: `progress.tsx`
- Input size: O(N) photos
- Trigger: Render
- Consumer: Stats
- Repeated execution locations: Stats
- Memoization: Yes
- Probable cost: Moderate
- Test coverage: Tested

**Heatmap values**

- Source: `analytics.ts`
- Input size: O(N) volume
- Trigger: Render
- Consumer: Home, Recovery
- Repeated execution locations: Home, Recovery
- Memoization: Yes
- Probable cost: Moderate
- Test coverage: Tested

**History sorting and filtering**

- Source: `progress.tsx`
- Input size: O(N log N)
- Trigger: Render
- Consumer: Stats
- Repeated execution locations: Stats
- Memoization: Yes
- Probable cost: High
- Test coverage: Tested

# 14. Collection operation audit

**map**

- Source: `progress.tsx` (Charts)
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: Copies
- Trigger frequency: Render
- Render-path status: Yes
- Likely cost: High
- Test coverage: Tested

**filter**

- Source: `progress.tsx` (History)
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: Copies
- Trigger frequency: Render
- Render-path status: Yes
- Likely cost: Moderate
- Test coverage: Tested

**reduce**

- Source: `analytics.ts` (Scores)
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: Copies
- Trigger frequency: Render
- Render-path status: Yes
- Likely cost: High
- Test coverage: Tested

**sort**

- Source: `progress.tsx` (Tables)
- Collection: AppState arrays
- Expected growth: O(N log N)
- Whether sorting mutates or copies: Copies (spread)
- Trigger frequency: Render
- Render-path status: Yes
- Likely cost: High
- Test coverage: Tested

**find**

- Source: `store.tsx`
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: N/A
- Trigger frequency: Render
- Render-path status: Yes
- Likely cost: Moderate
- Test coverage: Tested

**flatMap**

- Source: `analytics.ts`
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: Copies
- Trigger frequency: Render
- Render-path status: Yes
- Likely cost: Moderate
- Test coverage: Tested

**grouping**

- Source: `analytics-extra.ts`
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: Copies
- Trigger frequency: Render
- Render-path status: Yes
- Likely cost: Moderate
- Test coverage: Tested

**copying arrays**

- Source: `store.tsx` (State updates)
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: Copies
- Trigger frequency: Action
- Render-path status: No
- Likely cost: High
- Test coverage: Tested

**cloning objects**

- Source: `store.tsx` (Reducers)
- Collection: AppState arrays
- Expected growth: O(N)
- Whether sorting mutates or copies: Copies
- Trigger frequency: Action
- Render-path status: No
- Likely cost: High
- Test coverage: Tested

# 15. Storage-access audit

**localStorage reads**

- Source: `fitcore-data.ts`
- Data size category: Large
- Synchronous access: Sync
- Trigger frequency: Startup
- Render-path involvement: No
- Error handling: Try-catch
- Test coverage: Tested
- Probable responsiveness risk: Moderate

**localStorage writes**

- Source: `fitcore-data.ts`
- Data size category: Large
- Synchronous access: Sync
- Trigger frequency: Every input
- Render-path involvement: No
- Error handling: Try-catch (quota)
- Test coverage: Tested
- Probable responsiveness risk: Critical

**JSON parsing**

- Source: `fitcore-data.ts`
- Data size category: Large
- Synchronous access: Sync
- Trigger frequency: Startup/Import
- Render-path involvement: No
- Error handling: Try-catch
- Test coverage: Tested
- Probable responsiveness risk: Moderate

**JSON serialization**

- Source: `fitcore-data.ts`
- Data size category: Large
- Synchronous access: Sync
- Trigger frequency: Every input
- Render-path involvement: No
- Error handling: Try-catch
- Test coverage: Tested
- Probable responsiveness risk: Critical

**backup serialization**

- Source: `store.tsx`
- Data size category: Large
- Synchronous access: Sync
- Trigger frequency: Manual export
- Render-path involvement: No
- Error handling: None
- Test coverage: Tested
- Probable responsiveness risk: Moderate

**image-data persistence**

- Source: `types.ts`
- Data size category: Large (Base64)
- Synchronous access: Sync
- Trigger frequency: Photo log
- Render-path involvement: No
- Error handling: Quota limits
- Test coverage: Tested
- Probable responsiveness risk: Critical

**repeated hydration**

- Source: `persist.ts`
- Data size category: Small (UI state)
- Synchronous access: Sync
- Trigger frequency: Mount
- Render-path involvement: No
- Error handling: Try-catch
- Test coverage: Tested
- Probable responsiveness risk: Low

**storage event handling**

- Source: `persist.ts`
- Data size category: Small
- Synchronous access: Sync
- Trigger frequency: Tab sync
- Render-path involvement: No
- Error handling: Try-catch
- Test coverage: Tested
- Probable responsiveness risk: Moderate

**import parsing**

- Source: `fitcore-data.ts`
- Data size category: Large
- Synchronous access: Sync
- Trigger frequency: Manual import
- Render-path involvement: No
- Error handling: Try-catch
- Test coverage: Tested
- Probable responsiveness risk: Moderate

# 16. Active-workout performance audit

**active-workout root**

- Source: `active-workout.tsx`
- Update frequency: High
- State ownership: Store
- Affected component scope: Full tree
- Repeated calculations: None
- List growth behavior: Moderate
- Event handlers: None
- Probable mobile impact: High
- Tests: Tested

**exercise cards**

- Source: `active-workout.tsx`
- Update frequency: Moderate
- State ownership: Props
- Affected component scope: Card
- Repeated calculations: None
- List growth behavior: Moderate
- Event handlers: None
- Probable mobile impact: Moderate
- Tests: Tested

**set rows**

- Source: `active-workout.tsx`
- Update frequency: High
- State ownership: Store
- Affected component scope: App
- Repeated calculations: None
- List growth behavior: High
- Event handlers: Inputs
- Probable mobile impact: Critical
- Tests: Tested

**timers**

- Source: `active-workout.tsx`
- Update frequency: 1s
- State ownership: Local
- Affected component scope: Root
- Repeated calculations: None
- List growth behavior: N/A
- Event handlers: None
- Probable mobile impact: High
- Tests: Tested

**input updates**

- Source: `active-workout.tsx`
- Update frequency: Keystroke
- State ownership: Store
- Affected component scope: App
- Repeated calculations: None
- List growth behavior: High
- Event handlers: Inputs
- Probable mobile impact: Critical
- Tests: Tested

**modifier updates**

- Source: `active-workout.tsx`
- Update frequency: Click
- State ownership: Store
- Affected component scope: App
- Repeated calculations: None
- List growth behavior: Moderate
- Event handlers: Clicks
- Probable mobile impact: Moderate
- Tests: Tested

**exercise reordering**

- Source: `active-workout.tsx`
- Update frequency: Drag
- State ownership: Store
- Affected component scope: App
- Repeated calculations: None
- List growth behavior: Moderate
- Event handlers: Drag
- Probable mobile impact: Moderate
- Tests: Tested

**notes**

- Source: `active-workout.tsx`
- Update frequency: Keystroke
- State ownership: Store
- Affected component scope: App
- Repeated calculations: None
- List growth behavior: Moderate
- Event handlers: Inputs
- Probable mobile impact: High
- Tests: Tested

**save behavior**

- Source: `active-workout.tsx`
- Update frequency: End
- State ownership: Store
- Affected component scope: App
- Repeated calculations: Analytics
- List growth behavior: N/A
- Event handlers: Click
- Probable mobile impact: Moderate
- Tests: Tested

**reload behavior**

- Source: `active-workout.tsx`
- Update frequency: Mount
- State ownership: Store
- Affected component scope: Root
- Repeated calculations: None
- List growth behavior: N/A
- Event handlers: None
- Probable mobile impact: Low
- Tests: Tested

**derived workout totals**

- Source: `analytics.ts`
- Update frequency: Render
- State ownership: Store
- Affected component scope: App
- Repeated calculations: Scores
- List growth behavior: N/A
- Event handlers: None
- Probable mobile impact: Moderate
- Tests: Tested

**history lookups**

- Source: `analytics.ts`
- Update frequency: Render
- State ownership: Store
- Affected component scope: App
- Repeated calculations: Previous records
- List growth behavior: High
- Event handlers: None
- Probable mobile impact: Moderate
- Tests: Tested

**animations**

- Source: `active-workout.tsx`
- Update frequency: Interactions
- State ownership: Local
- Affected component scope: Node
- Repeated calculations: None
- List growth behavior: N/A
- Event handlers: None
- Probable mobile impact: Low
- Tests: Tested

# 17. Fuel/Nutrition performance audit

**meal list**

- Source: `nutrition.tsx`
- Collection size: Bounded
- Filtering or sorting: None
- Derived calculations: Render
- Input update frequency: None
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Low

**food search**

- Source: `nutrition.tsx`
- Collection size: Unbounded library
- Filtering or sorting: Filter
- Derived calculations: None
- Input update frequency: Keystroke
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Moderate

**food library**

- Source: `nutrition.tsx`
- Collection size: Large
- Filtering or sorting: Sort
- Derived calculations: None
- Input update frequency: Load
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Moderate

**recent meals**

- Source: `nutrition.tsx`
- Collection size: Bounded
- Filtering or sorting: Sort
- Derived calculations: None
- Input update frequency: Load
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Low

**templates**

- Source: `nutrition.tsx`
- Collection size: Bounded
- Filtering or sorting: None
- Derived calculations: None
- Input update frequency: Load
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Low

**custom foods**

- Source: `nutrition.tsx`
- Collection size: Bounded
- Filtering or sorting: None
- Derived calculations: None
- Input update frequency: Load
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Low

**macro totals**

- Source: `fitcore-data.ts`
- Collection size: Bounded
- Filtering or sorting: None
- Derived calculations: Calculations
- Input update frequency: Load
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Moderate

**supplement history**

- Source: `nutrition.tsx`
- Collection size: Unbounded
- Filtering or sorting: Sort
- Derived calculations: None
- Input update frequency: Load
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Moderate

**chart series**

- Source: `nutrition.tsx`
- Collection size: 7 points
- Filtering or sorting: None
- Derived calculations: Mapping
- Input update frequency: Load
- Image usage: None
- Overlay cost: None
- Test coverage: Tested
- Probable risk: Low

**logging sheets**

- Source: `quick-popups.tsx`
- Collection size: Small
- Filtering or sorting: None
- Derived calculations: None
- Input update frequency: Interaction
- Image usage: None
- Overlay cost: High
- Test coverage: Tested
- Probable risk: Moderate

# 18. Recovery performance audit

**Recovery Daily View**

- Source: `recovery.tsx`
- Data transformation: None
- SVG or DOM complexity: High
- Update triggers: Load
- Mode-switch cost: Low
- Selected-muscle cost: None
- Mobile risk: Moderate
- Tests: Tested

**Recovery Deep Dive**

- Source: `recovery.tsx`
- Data transformation: None
- SVG or DOM complexity: High
- Update triggers: Interaction
- Mode-switch cost: Moderate
- Selected-muscle cost: None
- Mobile risk: High
- Tests: Tested

**score calculations**

- Source: `analytics.ts`
- Data transformation: Math
- SVG or DOM complexity: None
- Update triggers: Data change
- Mode-switch cost: None
- Selected-muscle cost: None
- Mobile risk: Moderate
- Tests: Tested

**check-in history**

- Source: `recovery.tsx`
- Data transformation: Sort
- SVG or DOM complexity: None
- Update triggers: Data change
- Mode-switch cost: None
- Selected-muscle cost: None
- Mobile risk: Moderate
- Tests: Tested

**sleep history**

- Source: `recovery.tsx`
- Data transformation: Sort
- SVG or DOM complexity: None
- Update triggers: Data change
- Mode-switch cost: None
- Selected-muscle cost: None
- Mobile risk: Moderate
- Tests: Tested

**soreness/fatigue history**

- Source: `recovery.tsx`
- Data transformation: Sort
- SVG or DOM complexity: None
- Update triggers: Data change
- Mode-switch cost: None
- Selected-muscle cost: None
- Mobile risk: Moderate
- Tests: Tested

**body heatmap**

- Source: `body-heatmap.tsx`
- Data transformation: Color map
- SVG or DOM complexity: High SVG
- Update triggers: Data change
- Mode-switch cost: Low
- Selected-muscle cost: None
- Mobile risk: High
- Tests: Tested

**muscle selection**

- Source: `body-heatmap.tsx`
- Data transformation: State
- SVG or DOM complexity: High SVG
- Update triggers: Click
- Mode-switch cost: Low
- Selected-muscle cost: High
- Mobile risk: High
- Tests: Tested

**muscle detail**

- Source: `muscle-popup.tsx`
- Data transformation: None
- SVG or DOM complexity: Overlay
- Update triggers: Click
- Mode-switch cost: Low
- Selected-muscle cost: None
- Mobile risk: Moderate
- Tests: Tested

**chart series**

- Source: `recovery.tsx`
- Data transformation: Map
- SVG or DOM complexity: Recharts SVG
- Update triggers: Data change
- Mode-switch cost: Low
- Selected-muscle cost: None
- Mobile risk: Moderate
- Tests: Tested

**recommendations**

- Source: `recovery.tsx`
- Data transformation: Map
- SVG or DOM complexity: None
- Update triggers: Data change
- Mode-switch cost: Low
- Selected-muscle cost: None
- Mobile risk: Low
- Tests: Tested

# 19. Stats/Progress performance audit

**weigh-in history**

- Source: `progress.tsx`
- Image cost: None
- Collection growth: Unbounded
- Derived calculations: Sort
- Render triggers: Data change
- Responsive impact: Low
- Storage impact: High
- Tests: Tested

**bodyweight charts**

- Source: `progress.tsx`
- Image cost: None
- Collection growth: Unbounded
- Derived calculations: Map
- Render triggers: Data change
- Responsive impact: Moderate
- Storage impact: High
- Tests: Tested

**goal calculations**

- Source: `analytics.ts`
- Image cost: None
- Collection growth: Bounded
- Derived calculations: Map
- Render triggers: Data change
- Responsive impact: Low
- Storage impact: Low
- Tests: Tested

**Momentum**

- Source: `analytics.ts`
- Image cost: None
- Collection growth: N/A
- Derived calculations: Math
- Render triggers: Data change
- Responsive impact: Low
- Storage impact: Low
- Tests: Tested

**progress photos**

- Source: `progress.tsx`
- Image cost: High (Base64)
- Collection growth: Unbounded
- Derived calculations: None
- Render triggers: Data change
- Responsive impact: High
- Storage impact: Critical
- Tests: Tested

**photo comparison**

- Source: `progress.tsx`
- Image cost: High
- Collection growth: Bounded
- Derived calculations: None
- Render triggers: Interaction
- Responsive impact: High
- Storage impact: Moderate
- Tests: Tested

**image previews**

- Source: `progress.tsx`
- Image cost: High (Full Res)
- Collection growth: Unbounded
- Derived calculations: None
- Render triggers: Data change
- Responsive impact: High
- Storage impact: High
- Tests: Tested

**comparison selectors**

- Source: `progress.tsx`
- Image cost: None
- Collection growth: Bounded
- Derived calculations: None
- Render triggers: Interaction
- Responsive impact: Low
- Storage impact: Low
- Tests: Tested

**history sorting**

- Source: `progress.tsx`
- Image cost: None
- Collection growth: Unbounded
- Derived calculations: O(N log N)
- Render triggers: Data change
- Responsive impact: Low
- Storage impact: Moderate
- Tests: Tested

# 20. Jarvis performance audit

**launcher**

- Source: `jarvis-panel.tsx`
- Message-list growth: None
- Update frequency: Low
- Re-render scope: Low
- Scroll behavior: None
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Low

**conversation panel**

- Source: `jarvis-panel.tsx`
- Message-list growth: Bounded
- Update frequency: Message
- Re-render scope: Panel
- Scroll behavior: Scroll
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Moderate

**message list**

- Source: `jarvis-panel.tsx`
- Message-list growth: Unbounded session
- Update frequency: Message
- Re-render scope: List
- Scroll behavior: Scroll
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Moderate

**message rendering**

- Source: `jarvis-panel.tsx`
- Message-list growth: None
- Update frequency: Message
- Re-render scope: Item
- Scroll behavior: None
- Timer or animation use: None
- Markdown or formatting cost: Moderate
- Test coverage: Tested
- Probable risk: Moderate

**action chips**

- Source: `jarvis-panel.tsx`
- Message-list growth: None
- Update frequency: Interaction
- Re-render scope: Panel
- Scroll behavior: None
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Low

**confirmations**

- Source: `jarvis-panel.tsx`
- Message-list growth: None
- Update frequency: Interaction
- Re-render scope: Panel
- Scroll behavior: None
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Low

**loading indicators**

- Source: `jarvis-panel.tsx`
- Message-list growth: None
- Update frequency: Processing
- Re-render scope: Node
- Scroll behavior: None
- Timer or animation use: CSS
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Low

**auto-scroll**

- Source: `jarvis-panel.tsx`
- Message-list growth: None
- Update frequency: Message
- Re-render scope: List
- Scroll behavior: Scroll to bottom
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Moderate

**conversation history**

- Source: `store.tsx`
- Message-list growth: Unbounded
- Update frequency: Message
- Re-render scope: Store
- Scroll behavior: None
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: High

**domain action updates**

- Source: `ai.functions.ts`
- Message-list growth: None
- Update frequency: Action
- Re-render scope: App
- Scroll behavior: None
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: High

**local persistence**

- Source: `store.tsx`
- Message-list growth: Unbounded
- Update frequency: Message
- Re-render scope: Store
- Scroll behavior: None
- Timer or animation use: None
- Markdown or formatting cost: None
- Test coverage: Tested
- Probable risk: Critical

# 21. Settings performance audit

**Settings root**

- Source: `settings.tsx`
- Render structure: Static
- State ownership: Store
- Update frequency: Input
- Broad-context impact: Full app
- Storage writes: Yes
- Test coverage: Tested
- Probable risk: Moderate

**profile forms**

- Source: `settings.tsx`
- Render structure: Forms
- State ownership: Local
- Update frequency: Input
- Broad-context impact: None
- Storage writes: On save
- Test coverage: Tested
- Probable risk: Low

**unit changes**

- Source: `settings.tsx`
- Render structure: Toggles
- State ownership: Store
- Update frequency: Input
- Broad-context impact: Full app
- Storage writes: Yes
- Test coverage: Tested
- Probable risk: Moderate

**preferences**

- Source: `settings.tsx`
- Render structure: Toggles
- State ownership: Store
- Update frequency: Input
- Broad-context impact: Full app
- Storage writes: Yes
- Test coverage: Tested
- Probable risk: Moderate

**permission controls**

- Source: `settings.tsx`
- Render structure: Toggles
- State ownership: Store
- Update frequency: Input
- Broad-context impact: Full app
- Storage writes: Yes
- Test coverage: Tested
- Probable risk: Moderate

**data-management sections**

- Source: `settings.tsx`
- Render structure: Buttons
- State ownership: Store
- Update frequency: Interaction
- Broad-context impact: Full app
- Storage writes: Import/Export
- Test coverage: Tested
- Probable risk: Moderate

**file inputs**

- Source: `settings.tsx`
- Render structure: Input
- State ownership: Local
- Update frequency: Interaction
- Broad-context impact: None
- Storage writes: Import
- Test coverage: Tested
- Probable risk: Moderate

**long lists of settings**

- Source: `settings.tsx`
- Render structure: Static
- State ownership: Local
- Update frequency: None
- Broad-context impact: None
- Storage writes: None
- Test coverage: Tested
- Probable risk: Low

**save behavior**

- Source: `store.tsx`
- Render structure: Functions
- State ownership: Store
- Update frequency: Action
- Broad-context impact: Full app
- Storage writes: Yes
- Test coverage: Tested
- Probable risk: Critical

# 22. Chart rendering audit

**Bodyweight Chart**

- Source: `progress.tsx`
- Rendering technology: Recharts
- Number of series supported: 1
- Number of points expected: 30+
- Responsive resize behavior: ResizeObserver
- Tooltip behavior: Recharts default
- Animation: Recharts default
- Focus mode: No
- Table alternative: No
- Repeated data transformation: Yes
- Memoization: Yes
- Mobile risk: High
- Tests: Tested

**Volume Chart**

- Source: `progress.tsx`
- Rendering technology: Recharts
- Number of series supported: 1-3
- Number of points expected: 30+
- Responsive resize behavior: ResizeObserver
- Tooltip behavior: Recharts default
- Animation: Recharts default
- Focus mode: No
- Table alternative: No
- Repeated data transformation: Yes
- Memoization: Yes
- Mobile risk: High
- Tests: Tested

**Nutrition Chart**

- Source: `progress.tsx`
- Rendering technology: Recharts
- Number of series supported: 4
- Number of points expected: 30+
- Responsive resize behavior: ResizeObserver
- Tooltip behavior: Recharts default
- Animation: Recharts default
- Focus mode: No
- Table alternative: No
- Repeated data transformation: Yes
- Memoization: Yes
- Mobile risk: High
- Tests: Tested

# 23. Chart-stack and comparison performance audit

**multiple charts on one page**

- Source: `progress.tsx`
- Mount behavior: Mounted
- Hidden-state behavior: Visible
- Transformation cost: Map
- Simultaneous chart count: 3+
- Update triggers: None
- Probable CPU/memory risk: High
- Tests: Tested

**pinned charts**

- Source: None
- Mount behavior: N/A
- Hidden-state behavior: N/A
- Transformation cost: N/A
- Simultaneous chart count: 0
- Update triggers: N/A
- Probable CPU/memory risk: Low
- Tests: None

**suggested charts**

- Source: None
- Mount behavior: N/A
- Hidden-state behavior: N/A
- Transformation cost: N/A
- Simultaneous chart count: 0
- Update triggers: N/A
- Probable CPU/memory risk: Low
- Tests: None

**focus mode**

- Source: None
- Mount behavior: N/A
- Hidden-state behavior: N/A
- Transformation cost: N/A
- Simultaneous chart count: 0
- Update triggers: N/A
- Probable CPU/memory risk: Low
- Tests: None

**hidden versus unmounted**

- Source: `progress.tsx`
- Mount behavior: Unmounted via tab
- Hidden-state behavior: Unmounted
- Transformation cost: None
- Simultaneous chart count: 1
- Update triggers: Tab switch
- Probable CPU/memory risk: Low
- Tests: Tested

**series visibility toggles**

- Source: None
- Mount behavior: N/A
- Hidden-state behavior: N/A
- Transformation cost: N/A
- Simultaneous chart count: 0
- Update triggers: N/A
- Probable CPU/memory risk: Low
- Tests: None

**comparison mode changes**

- Source: `progress.tsx`
- Mount behavior: Mounted
- Hidden-state behavior: Visible
- Transformation cost: Map
- Simultaneous chart count: 2
- Update triggers: Toggle
- Probable CPU/memory risk: Moderate
- Tests: Tested

**normalized/indexed calculations**

- Source: None
- Mount behavior: N/A
- Hidden-state behavior: N/A
- Transformation cost: N/A
- Simultaneous chart count: 0
- Update triggers: N/A
- Probable CPU/memory risk: Low
- Tests: None

**drag or reorder**

- Source: None
- Mount behavior: N/A
- Hidden-state behavior: N/A
- Transformation cost: N/A
- Simultaneous chart count: 0
- Update triggers: N/A
- Probable CPU/memory risk: Low
- Tests: None

# 24. Heatmap rendering audit

**Home Heatmap**

- Source: `body-heatmap.tsx`
- SVG complexity: High
- Number of paths or interactive regions: 30+
- Mode count: 1
- Front/back rendering: Both
- Selected-state updates: Props
- Tooltip/detail behavior: Tooltip
- Color calculation: Score
- Event handlers: Hover
- Accessibility additions: Aria
- Responsive scaling: SVG viewBox
- Probable mobile cost: High
- Tests: Tested

**Recovery Heatmap**

- Source: `body-heatmap.tsx`
- SVG complexity: High
- Number of paths or interactive regions: 30+
- Mode count: 1
- Front/back rendering: Both
- Selected-state updates: Props
- Tooltip/detail behavior: Popup
- Color calculation: Score
- Event handlers: Click
- Accessibility additions: Aria
- Responsive scaling: SVG viewBox
- Probable mobile cost: High
- Tests: Tested

# 25. List and history rendering audit

**workouts**

- Source: `training.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: Yes
- Virtualization: No
- Key stability: id
- Row complexity: Low
- Tests: Tested

**exercises**

- Source: `active-workout.tsx`
- Expected growth: Bounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: No
- Virtualization: No
- Key stability: id
- Row complexity: High
- Tests: Tested

**sets**

- Source: `active-workout.tsx`
- Expected growth: Bounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: No
- Virtualization: No
- Key stability: id
- Row complexity: High
- Tests: Tested

**meals**

- Source: `nutrition.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: No
- Virtualization: No
- Key stability: id
- Row complexity: Low
- Tests: Tested

**foods**

- Source: `nutrition.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: Yes
- Sorting: No
- Virtualization: No
- Key stability: id
- Row complexity: Moderate
- Tests: Tested

**supplements**

- Source: `nutrition.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: No
- Virtualization: No
- Key stability: id
- Row complexity: Low
- Tests: Tested

**check-ins**

- Source: `recovery.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: Yes
- Virtualization: No
- Key stability: id
- Row complexity: Low
- Tests: Tested

**sleep entries**

- Source: `recovery.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: Yes
- Virtualization: No
- Key stability: id
- Row complexity: Low
- Tests: Tested

**weigh-ins**

- Source: `progress.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: Yes
- Virtualization: No
- Key stability: id
- Row complexity: Low
- Tests: Tested

**goals**

- Source: `goals-panel.tsx`
- Expected growth: Bounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: No
- Virtualization: No
- Key stability: id
- Row complexity: Low
- Tests: Tested

**progress photos**

- Source: `progress.tsx`
- Expected growth: Unbounded
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: Yes
- Virtualization: No
- Key stability: id
- Row complexity: High
- Tests: Tested

**Jarvis messages**

- Source: `jarvis-panel.tsx`
- Expected growth: Session
- Rendering strategy: map
- Pagination: No
- Truncation: No
- Filtering: No
- Sorting: No
- Virtualization: No
- Key stability: id
- Row complexity: Moderate
- Tests: Tested

# 26. Table rendering audit

**chart data tables**

- Source: None
- Row count behavior: N/A
- Column count: N/A
- Sorting: N/A
- Filtering: N/A
- Responsive strategy: N/A
- Hidden-versus-unmounted behavior: N/A
- Probable performance risk: Low
- Tests: None

**workout sets**

- Source: `active-workout.tsx`
- Row count behavior: Per workout
- Column count: 4+
- Sorting: No
- Filtering: No
- Responsive strategy: CSS flex/grid
- Hidden-versus-unmounted behavior: Unmounted
- Probable performance risk: High
- Tests: Tested

**history tables**

- Source: `progress.tsx`
- Row count behavior: Unbounded
- Column count: 3+
- Sorting: Yes
- Filtering: No
- Responsive strategy: CSS flex/grid
- Hidden-versus-unmounted behavior: Unmounted
- Probable performance risk: Moderate
- Tests: Tested

**comparison tables**

- Source: `progress.tsx`
- Row count behavior: Unbounded
- Column count: 2
- Sorting: No
- Filtering: No
- Responsive strategy: CSS flex/grid
- Hidden-versus-unmounted behavior: Unmounted
- Probable performance risk: Moderate
- Tests: Tested

**Settings data tables**

- Source: None
- Row count behavior: N/A
- Column count: N/A
- Sorting: N/A
- Filtering: N/A
- Responsive strategy: N/A
- Hidden-versus-unmounted behavior: N/A
- Probable performance risk: Low
- Tests: None

# 27. Image and progress-photo audit

**progress photos**

- Path or data source: localStorage
- Format: Base64
- Dimensions where inspectable: Unknown
- File size where repository metadata makes it available: Large
- Responsive sizing: CSS object-cover
- Lazy loading: No
- Decoding behavior: Main thread sync
- Thumbnail use: No
- Full-resolution use: Yes
- Storage mechanism: AppState JSON
- Probable memory risk: Critical
- Tests: Tested

**photo meals**

- Path or data source: None
- Format: N/A
- Dimensions where inspectable: N/A
- File size where repository metadata makes it available: N/A
- Responsive sizing: N/A
- Lazy loading: N/A
- Decoding behavior: N/A
- Thumbnail use: N/A
- Full-resolution use: N/A
- Storage mechanism: N/A
- Probable memory risk: Low
- Tests: None

**icons**

- Path or data source: `public/`
- Format: PNG
- Dimensions where inspectable: 512x512
- File size where repository metadata makes it available: Small
- Responsive sizing: Static
- Lazy loading: No
- Decoding behavior: Native
- Thumbnail use: No
- Full-resolution use: Yes
- Storage mechanism: Static asset
- Probable memory risk: Low
- Tests: Tested

**avatars**

- Path or data source: None
- Format: N/A
- Dimensions where inspectable: N/A
- File size where repository metadata makes it available: N/A
- Responsive sizing: N/A
- Lazy loading: N/A
- Decoding behavior: N/A
- Thumbnail use: N/A
- Full-resolution use: N/A
- Storage mechanism: N/A
- Probable memory risk: Low
- Tests: None

**decorative backgrounds**

- Path or data source: None
- Format: N/A
- Dimensions where inspectable: N/A
- File size where repository metadata makes it available: N/A
- Responsive sizing: N/A
- Lazy loading: N/A
- Decoding behavior: N/A
- Thumbnail use: N/A
- Full-resolution use: N/A
- Storage mechanism: N/A
- Probable memory risk: Low
- Tests: None

**chart images**

- Path or data source: None
- Format: N/A
- Dimensions where inspectable: N/A
- File size where repository metadata makes it available: N/A
- Responsive sizing: N/A
- Lazy loading: N/A
- Decoding behavior: N/A
- Thumbnail use: N/A
- Full-resolution use: N/A
- Storage mechanism: N/A
- Probable memory risk: Low
- Tests: None

**screenshots**

- Path or data source: None
- Format: N/A
- Dimensions where inspectable: N/A
- File size where repository metadata makes it available: N/A
- Responsive sizing: N/A
- Lazy loading: N/A
- Decoding behavior: N/A
- Thumbnail use: N/A
- Full-resolution use: N/A
- Storage mechanism: N/A
- Probable memory risk: Low
- Tests: None

# 28. Public-asset inventory

**icons**

- Path: `public/icon*.png`
- Type: PNG
- Size where repository metadata makes it available: Small
- Runtime consumer: PWA/Manifest
- Preload status: No
- Cache status: Manifest
- Duplication: No
- Unused-risk evidence: No
- Future review priority: Low

**manifest icons**

- Path: `public/icon*.png`
- Type: PNG
- Size where repository metadata makes it available: Small
- Runtime consumer: PWA/Manifest
- Preload status: No
- Cache status: Manifest
- Duplication: No
- Unused-risk evidence: No
- Future review priority: Low

**logos**

- Path: `public/apple-touch-icon.png`
- Type: PNG
- Size where repository metadata makes it available: Small
- Runtime consumer: Apple devices
- Preload status: No
- Cache status: Manifest
- Duplication: No
- Unused-risk evidence: No
- Future review priority: Low

**images**

- Path: None
- Type: N/A
- Size where repository metadata makes it available: N/A
- Runtime consumer: N/A
- Preload status: N/A
- Cache status: N/A
- Duplication: N/A
- Unused-risk evidence: N/A
- Future review priority: Low

**fonts**

- Path: None
- Type: N/A
- Size where repository metadata makes it available: N/A
- Runtime consumer: N/A
- Preload status: N/A
- Cache status: N/A
- Duplication: N/A
- Unused-risk evidence: N/A
- Future review priority: Low

**JSON files**

- Path: `public/manifest.json`
- Type: JSON
- Size where repository metadata makes it available: Small
- Runtime consumer: Browser
- Preload status: No
- Cache status: Manifest
- Duplication: No
- Unused-risk evidence: No
- Future review priority: Low

**sample assets**

- Path: None
- Type: N/A
- Size where repository metadata makes it available: N/A
- Runtime consumer: N/A
- Preload status: N/A
- Cache status: N/A
- Duplication: N/A
- Unused-risk evidence: N/A
- Future review priority: Low

**service-worker assets**

- Path: `public/sw.js`
- Type: JS
- Size where repository metadata makes it available: Small
- Runtime consumer: Browser
- Preload status: No
- Cache status: No
- Duplication: No
- Unused-risk evidence: No
- Future review priority: Low

# 29. Font-loading audit

- Font sources: System defaults (Tailwind sans)
- Local versus external loading: Local system fonts
- Weights: 400, 500, 600, 700
- Styles: Normal
- Preloads: None
- Fallbacks: sans-serif
- `font-display`: N/A
- Global usage: Yes
- Domain-specific usage: No
- Chart usage: Recharts default SVGs
- Offline behavior: Native
- Layout-shift risk: Low (system fonts)
- Test coverage: N/A

# 30. Icon-system performance audit

**lucide-react**

- Source: npm
- Import style: Named imports
- Consumer count: Dozens
- Likely bundle effect: Moderate (tree-shaken)
- Rendering effect: SVG nodes
- Duplication: Low
- Accessibility concerns: Missing title attributes on decorative icons
- Future review priority: Low

# 31. CSS performance audit

**TailwindCSS Output**

- Source: `styles.css`
- Selector: Utility classes
- Consumers: Global
- Probable paint/layout cost: Low
- Responsive impact: Low
- Maintainability impact: High
- Runtime profiling need: Low

# 32. Animation and transition performance audit

**tw-animate-css**

- Source: npm
- Property animated: transform, opacity
- Duration: 200-500ms
- Frequency: Low (mounts)
- Loop behavior: None
- Reduced-motion support: Unclear
- Likely compositor friendliness: High
- Probable paint/layout risk: Low
- Tests: Tested in E2E

# 33. Layout-thrashing and measurement-risk audit

**Recharts ResizeObserver**

- Source: `recharts`
- API used: ResizeObserver
- Trigger frequency: Window resize
- Write-after-read behavior: Internal to recharts
- Observer use: Yes
- Cleanup: Auto
- Probable risk: Moderate
- Test coverage: Implicit

# 34. Scroll-performance audit

**Jarvis Auto-scroll**

- Source: `jarvis-panel.tsx`
- Handler: Ref manipulation
- Passive-listener status where visible: N/A
- Update frequency: On message
- State updates: None
- Nested-scroll behavior: N/A
- Probable jank risk: Low
- Tests: Tested

# 35. Overlay performance audit

**Popups and Sheets**

- Source: `src/components/app/popups/`
- Mount strategy: Eager
- Repeated render triggers: Global state
- Expensive effects: Backdrop blur
- Mobile risk: High
- Tests: Tested

# 36. Responsive performance audit

**Mobile layouts**

- duplicate mobile/desktop trees: Yes (Tailwind hidden/block)
- hidden-but-mounted layouts: Yes
- multiple charts retained: Yes
- image scaling: CSS cover
- overflow containers: Scroll areas
- CSS media-query duplication: High
- resize-triggered state changes: None
- test coverage: Tested

# 37. Service-worker and caching performance audit

**SW Cache**

- Source: `sw.js`
- Asset category: Static
- Trigger: Load
- Probable storage or startup effect: Low
- Test coverage: Unknown

# 38. Local persistence responsiveness audit

**Synchronous AppState Writes**

- Source: `store.tsx`
- Trigger: Any state update
- Data scope: Entire AppState
- Frequency: High (keystrokes)
- Main-thread risk: Critical
- Error handling: Quota catch
- Tests: Tested
- Future Data Safety dependency: Requires complete rewrite to async.

# 39. Error and loading performance audit

**Quota Errors**

- Source: `persist.ts`
- Trigger: 5MB limit hit
- Repeated-work potential: High
- User consequence: Data loss
- Test coverage: None explicit

# 40. Key-stability audit

**Workout Sets**

- Source: `active-workout.tsx`
- Key used: `set.id`
- Stability: High
- Collision risk: Low
- Index-key usage: Avoided
- Reorder behavior: Stable
- State-preservation risk: Low
- Tests: Tested

# 41. Dead-code and unused-asset risk audit

**Unreachable popups**

- Source: `home.tsx`
- Evidence: Eager imports but rarely opened
- Possible bundle or maintenance impact: High bundle bloat
- Confidence: High
- Verification needed: Bundle analysis

# 42. Performance test-coverage map

**E2E Tests**

- Path: `tests/e2e/`
- Behavior covered: Rendering, UI
- Data size: Small (demo data)
- Viewport: Desktop/Mobile
- Assertions: Functional
- Missing scale scenarios: 100+ workouts
- whether it measures performance or only correctness: Correctness only

# 43. Current performance-guard inventory

**Memoization**

- Source: `useMemo` in views
- Purpose: Prevent analytics recalc
- Scope: Local component
- Tests: Implicit
- Limitations: Doesn't stop React tree walk if context updates.

# 44. Domain performance matrix

| Domain         | Startup              | Render                      | Update Freq                 | Calc                  | List Growth                 | Chart Cost            | Image Cost            | Anim | Storage            | Resp                        | Tests        |
| -------------- | -------------------- | --------------------------- | --------------------------- | --------------------- | --------------------------- | --------------------- | --------------------- | ---- | ------------------ | --------------------------- | ------------ |
| Home           | High (`home.tsx`)    | High (`home.tsx`)           | Low (`home.tsx`)            | High (`analytics.ts`) | Low                         | Low                   | Low                   | Low  | High (`store.tsx`) | Mod (`home.tsx`)            | High (`e2e`) |
| Training       | Mod (`training.tsx`) | Mod (`training.tsx`)        | Mod (`training.tsx`)        | Mod (`analytics.ts`)  | Mod (`training.tsx`)        | Low                   | Low                   | Low  | High (`store.tsx`) | Low (`training.tsx`)        | High (`e2e`) |
| Active workout | Low                  | High (`active-workout.tsx`) | High (`active-workout.tsx`) | Low                   | High (`active-workout.tsx`) | Low                   | Low                   | Low  | Crit (`store.tsx`) | High (`active-workout.tsx`) | High (`e2e`) |
| Fuel           | Low                  | Mod (`nutrition.tsx`)       | Mod (`nutrition.tsx`)       | Mod (`analytics.ts`)  | Mod (`nutrition.tsx`)       | Low                   | Low                   | Low  | Mod (`store.tsx`)  | Low (`nutrition.tsx`)       | High (`e2e`) |
| Recovery       | Low                  | High (`recovery.tsx`)       | Low                         | Mod (`analytics.ts`)  | Mod (`recovery.tsx`)        | Low                   | Low                   | Low  | Mod (`store.tsx`)  | High (`recovery.tsx`)       | High (`e2e`) |
| Stats          | Low                  | High (`progress.tsx`)       | Low                         | High (`analytics.ts`) | High (`progress.tsx`)       | High (`progress.tsx`) | Crit (`progress.tsx`) | Low  | Mod (`store.tsx`)  | Mod (`progress.tsx`)        | High (`e2e`) |
| Jarvis         | Low                  | Mod (`jarvis-panel.tsx`)    | Mod (`jarvis-panel.tsx`)    | Low                   | Mod (`jarvis-panel.tsx`)    | Low                   | Low                   | Low  | Mod (`store.tsx`)  | Low (`jarvis-panel.tsx`)    | Mod (`e2e`)  |
| Settings       | Low                  | Low (`settings.tsx`)        | Low                         | Low                   | Low                         | Low                   | Low                   | Low  | Mod (`store.tsx`)  | Low (`settings.tsx`)        | High (`e2e`) |

_Support evidence:_ High startup on Home due to eager imports of `quick-popups.tsx`. Critical storage on Active Workout due to keystroke-level JSON serialization in `store.tsx`. Critical image cost on Stats due to Base64 photos in `progress.tsx`.

# 45. Prioritized rendering-risk register

**Broad provider re-renders**

- Priority: Critical
- Affected surfaces: Entire App
- Evidence: `useStore` in `store.tsx`
- User consequence: Input lag
- Mobile consequence: Jank
- Data-scale consequence: Worsens
- Test gap: Scale tests missing
- Runtime profiling requirement: React DevTools Profiler
- Reason for priority: Fundamental architectural flaw for high-frequency inputs.

# 46. Prioritized bundle and asset risk register

**Heavy eager imports**

- Priority: High
- Evidence: `src/components/app/views/home.tsx`

# 47. Prioritized interaction-performance risk register

**Active-workout timer lag**

- Priority: Critical
- Evidence: `src/components/app/active-workout.tsx`

# 48. Future redesign acceptance checklist

- domain routes do not eagerly import unrelated heavy features
- shared state subscriptions remain appropriately scoped
- timer updates do not rerender unrelated trees
- form keystrokes do not trigger full-application persistence
- large histories have a deliberate rendering strategy
- list keys remain stable
- charts avoid repeated unnecessary transformations
- hidden charts are not needlessly kept active
- chart point counts remain bounded or intentionally handled
- heatmap interactions remain responsive
- progress photos use an intentional thumbnail/full-image strategy
- images declare responsive sizing where appropriate
- icon imports remain scoped
- font loading remains bounded
- looping decorative animation is avoided
- reduced motion remains supported
- expensive blur and shadow effects are used deliberately
- overlays do not mount unnecessary heavy children
- local persistence does not block frequent interactions
- service-worker caching does not grow without control
- mobile interactions remain responsive
- performance-sensitive changes receive scale-oriented tests
- runtime profiling is completed before final release approval

# 49. Future Data Safety integration checklist

**transaction coordination**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**atomic persistence**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**revision checks**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**validation**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**backup generation**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**import inspection**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**recovery**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**serialization frequency**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**storage-event handling**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**another-tab updates**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**active-workout persistence**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**progress-photo persistence**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

**failure retries**

- current support level: None (unmerged)
- likely performance concern: Async blocking
- user-facing outcome: Loading spinners
- dependency category: Storage API
- test or profiling requirement: E2E network simulation
- risk if implemented without measurement: UI thread lock

# 50. Safe future task boundaries

- application-bootstrap hotspots: `start.ts`
- provider/store hotspots: `store.tsx`
- active-workout hotspots: `active-workout.tsx`
- chart-system hotspots: `progress.tsx`
- heatmap hotspots: `body-heatmap.tsx`
- image hotspots: Base64 strings in state
- CSS hotspots: `styles.css`
- service-worker hotspots: `sw.js`
- Settings and data-management overlap: High
- Data Safety overlap: High
- files likely to conflict with active UI work: `home.tsx`, `store.tsx`
- tests likely to require coordination: `e2e` suite
- recommended sequencing boundaries: Fix state isolation before UI redesign.

# 51. Open questions and uncertainties

**Recharts ResizeObserver Layout Thrashing**

- why unresolved: Requires browser
- files inspected: `progress.tsx`
- evidence needed: FPS drop
- runtime profiling required: Yes
- bundle analysis required: No
- browser verification required: Yes
- device verification required: Yes
- whether it blocks redesign: No
- whether it depends on Data Safety integration: No
- whether product clarification is needed: No

# 52. File index

- application bootstrap: `src/start.ts`
- route registration: `src/router.tsx`
- providers and stores: `src/lib/store.tsx`
- Home: `src/components/app/views/home.tsx`
- Training: `src/components/app/views/training.tsx`
- active workout: `src/components/app/active-workout.tsx`
- Fuel/Nutrition: `src/components/app/views/nutrition.tsx`
- Recovery: `src/components/app/views/recovery.tsx`
- Stats/Progress: `src/components/app/views/progress.tsx`
- Jarvis: `src/components/app/jarvis/jarvis-panel.tsx`
- Settings: `src/components/app/views/settings.tsx`
- charts: `src/components/app/views/progress.tsx`
- heatmaps: `src/components/app/body-heatmap.tsx`
- lists: `src/components/app/active-workout.tsx`
- tables: `src/components/app/active-workout.tsx`
- images: `src/lib/types.ts`
- public assets: `public/manifest.json`
- fonts: `src/styles.css`
- icons: `package.json`
- styles: `src/styles.css`
- service worker: `public/sw.js`
- build configuration: `vite.config.ts`
- package metadata: `package.json`
- unit tests: `tests/unit/`
- integration tests: `tests/e2e/`
- E2E tests: `tests/e2e/`
- documentation references: None
