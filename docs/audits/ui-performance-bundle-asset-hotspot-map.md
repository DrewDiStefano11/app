# 1. Executive summary

- **Current rendering architecture:** [Confirmed architecture] React 19 single-page application using `@tanstack/react-router` (`src/router.tsx`).
- **Current state propagation model:** [Confirmed architecture] Global React Context provider (`src/lib/store.tsx`) using `useState` for a single `AppState` object, passing down full state to `useStore` consumers.
- **Current bundle structure:** [Confirmed architecture] Vite-bundled ESM application. Eager loading is the primary strategy for domain views and popups, confirmed by static import statements.
- **Current asset strategy:** [Confirmed architecture] Pre-optimized `public/` assets, global CSS (`src/styles.css`), and PWA manifests (`public/sw.js`). Icons imported from `lucide-react`.
- **Current chart and visualization cost centers:** [Potential rendering hotspot] `recharts` usage in `src/components/app/views/progress.tsx` and custom SVG paths in `src/components/app/body-heatmap.tsx`. Requires browser measurement to confirm impact.
- **Strongest implemented performance patterns:** [Confirmed architecture] Consistent use of `useMemo` in views (e.g., `src/components/app/views/home.tsx`) for derived calculations (scores, volumes) during render-time.
- **Highest-risk rendering hotspots:** [Potential rendering hotspot] Active workout inputs in `src/components/app/active-workout.tsx` triggering broad context updates. Requires profiling.
- **Highest-risk bundle hotspots:** [Potential bundle hotspot] Eager imports of multiple popups (e.g., `StartWorkoutSheet`, `MacroDetailSheet`) inside `src/components/app/views/home.tsx`. Requires bundle analysis.
- **Highest-risk asset hotspots:** [Potential serialization hotspot] Progress photos stored as `dataUrl` (Base64) strings inside local state (`src/lib/types.ts`).
- **Highest-risk mobile performance concerns:** [Requires browser measurement] Backdrop-filters on popups, SVG heatmap layouts, and synchronous JSON serialization blocking interactions.
- **Highest-risk active-workout concerns:** [Potential serialization hotspot] Writing entire application state to synchronous `localStorage` upon input updates (`src/lib/store.tsx`). Requires profiling.
- **Highest-risk future premium redesign concerns:** [Structural risk] Expanding charts and 3D capabilities without isolating component state or asynchronous persistence.
- **Most important requirements for future implementation approval:** [Safe optimization direction] Implement localized state for high-frequency user input and decouple storage operations from main-thread renders.

# 2. Method and evidence boundaries

- **Required base SHA:** `3e4326782d761313c4f2644ecfe55503770b360a`
- **Static inspection methodology:** Codebase analysis using utilities (`grep`, `find`, `cat`) targeting React hooks (`useEffect`, `useMemo`), context providers, layout structure, and `localStorage` pathways.
- **Configuration and asset inspection methodology:** Inspected `vite.config.ts`, `package.json`, and `public/` directory structures for build-time directives.
- **Tests inspected:** `tests/e2e/` (Playwright) and `tests/unit/`.
- **Why no runtime performance numbers are being claimed:** Task constraints explicitly forbid running browser automation, Lighthouse, or runtime profiling. No measured lag, blocking, slow rendering, or main-thread impact is claimed.
- **Why no bundle-size numbers are being claimed unless repository artifacts explicitly provide them:** Task constraints explicitly forbid running bundle analysis tools. No bundle weight is claimed.
- **Why no browser rendering behavior is being claimed as verified:** Frame rates, layout shifts, or drop-frame conclusions require runtime profiling.
- **How potential hotspots are classified:** By static code evidence of structural risks (e.g., eager imports, synchronous APIs, O(n) rendering pathways without virtualization).

**Definitions:**

- **Confirmed architecture:** Verified via static code structure (e.g., Router, Context).
- **Confirmed eager import:** Verified statically via missing `import()` or `lazy()`.
- **Confirmed synchronous operation:** Verified static usage of synchronous browser APIs (e.g., `localStorage.setItem`).
- **Confirmed repeated calculation:** Verified static unmemoized mapping inside renders.
- **Potential rendering hotspot:** Structural risk of broad React updates based on component mapping and context consumption. Requires profiling.
- **Potential serialization hotspot:** Structural risk of full-state `JSON.stringify` on user input. Requires profiling.
- **Potential bundle hotspot:** Structural risk of importing unused components in entry chunks. Requires bundle analysis.
- **Requires profiling:** Performance impact is theoretical without React DevTools or Chrome Performance tab.
- **Requires bundle analysis:** Needs build-time analysis to confirm bytes.
- **Requires browser measurement:** Needs real device to confirm layout, paint, or scroll performance.

# 3. Startup and import graph

**Startup Sequence Graph:**

```text
[HTML load] -> [JS entry (src/start.ts)] -> [CSS entry (src/styles.css)] -> [Provider init (src/lib/store.tsx)] -> [Storage hydration (src/lib/fitcore-data.ts)] -> [Route init (src/router.tsx)] -> [Initial render]
```

- **HTML entry:** Vite injected scripts (`index.html` implied).
  - _Synchronous work:_ Script parse.
  - _Storage access:_ None.
  - _Probable risk:_ Requires browser measurement.
- **JavaScript entry:** `src/start.ts`, `src/server.ts`.
  - _Imported dependencies:_ `@tanstack/react-router`.
  - _Synchronous work:_ Router configuration.
  - _Probable risk:_ Low.
- **CSS entry:** `src/styles.css`.
  - _Possible render blocking:_ Yes (global CSS).
  - _Probable risk:_ Requires browser measurement.
- **Provider initialization:** `src/lib/store.tsx`.
  - _Synchronous work:_ Context creation.
  - _Probable risk:_ Low.
- **Persistence hydration:** `src/lib/fitcore-data.ts`.
  - _Storage access:_ `localStorage.getItem` (Synchronous).
  - _Parsing:_ `JSON.parse` of full store.
  - _Probable risk:_ Potential rendering hotspot blocking startup. Requires profiling.
- **Route initialization:** `src/router.tsx`.
  - _Imported dependencies:_ `src/routeTree.gen.ts`.
  - _Probable risk:_ Low.
- **Initial render:** Routes (e.g., `src/components/app/views/home.tsx`).
  - _Imported dependencies:_ Popups, layouts, charts.
  - _Probable risk:_ Potential rendering hotspot due to component quantity. Requires profiling.

# 4. Route and view loading

- **Home (`src/components/app/views/home.tsx`):**
  - _Import strategy:_ Confirmed eager import.
  - _Shared dependencies:_ 8+ popups (`HeatmapDetailSheet`, `StartWorkoutSheet`, etc.).
  - _Likely first-entry cost:_ Potential bundle hotspot. Requires bundle analysis.
- **Training (`src/components/app/views/training.tsx`):**
  - _Import strategy:_ Confirmed eager import.
- **active workout (`src/components/app/active-workout.tsx`):**
  - _Import strategy:_ Confirmed eager import.
- **Fuel/Nutrition (`src/components/app/views/nutrition.tsx`):**
  - _Import strategy:_ Confirmed eager import.
- **Recovery (`src/components/app/views/recovery.tsx`):**
  - _Import strategy:_ Confirmed eager import.
  - _Chart dependencies:_ `recharts`.
- **Stats/Progress (`src/components/app/views/progress.tsx`):**
  - _Import strategy:_ Confirmed eager import.
  - _Chart dependencies:_ `recharts`.
- **Jarvis (`src/components/app/jarvis/jarvis-panel.tsx`):**
  - _Import strategy:_ Confirmed eager import.
- **Settings (`src/components/app/views/settings.tsx`):**
  - _Import strategy:_ Confirmed eager import.

_Heavy domain code is imported eagerly before the user opens the domain, lacking dynamic `import()` boundaries._

# 5. Dependency inventory

- **`react` / `react-dom`:** UI framework. Imported globally.
- **`@tanstack/react-router`:** Routing. Imported globally (`src/router.tsx`).
- **`recharts`:** Charting. Imported locally in `progress.tsx`, `recovery.tsx`. Potential bundle hotspot.
- **`lucide-react`:** Icons. Imported globally across views.
- **`date-fns`:** Date utilities. Imported globally.
- **`react-hook-form` & `zod`:** Validation. Imported in `settings.tsx` and popups.
- **`tw-animate-css`:** Animation.
- **`@radix-ui/*`:** UI primitives.

# 6. Bundle-structure risks

- **Primary entry bundle:** `vite.config.ts` configuration suggests standard Vite splitting.
- **Route imports:** `src/routeTree.gen.ts` uses static imports, preventing code splitting per route natively unless `.lazy.tsx` is introduced.
- **Chart-library duplication:** Needs bundle analysis to confirm `recharts` is not duplicated.
- **Popups:** Eagerly imported in `src/components/app/views/home.tsx` rather than lazy loaded on click.
- **Requires bundle analysis:** Exact byte sizes, duplicate package dependencies, and compressed network transfer weights.

# 7. Asset inventory

- **Icons:** `public/icon-192.png`, `public/icon-512.png`. (Standard PWA manifest assets).
- **JSON files:** `public/manifest.json`.
- **Service-worker assets:** `public/sw.js`.
- **Duplication risk:** Unknown. Requires analysis.
- **Unused-risk evidence:** None.

# 8. Fonts and icons

- **Font sources:** System fonts via Tailwind (`sans`).
- **Layout-shift risk:** Low, as external web fonts are not explicitly preloaded or forced.
- **Icon-system:** `lucide-react` uses named imports.
- **Likely bundle effect:** Vite ESM tree-shaking usually handles named imports safely. Requires bundle analysis to confirm.

# 9. Provider and store architecture

- **Source:** `src/lib/store.tsx`
- **Architecture:** React Context (`StoreContext.Provider`) wrapping the application.
- **State scope:** Houses the complete `AppState` object containing all histories, settings, and profile data.
- **State mutation:** Exposes a unified `set()` function wrapping `useState`.
- **Safe mitigation direction:** Isolate high-frequency state (like timers) from the global context provider to avoid cascading render cycles.

# 10. State-consumer map

- **Consumers:** Almost every view component uses `const { view, set } = useStore()`.
- **Broad state consumers:** `src/components/app/views/home.tsx`, `active-workout.tsx`, `progress.tsx`, `settings.tsx`.
- **Selector granularity:** None. `useStore` extracts the entire object. React Context specification mandates all consumers re-render when the provided object reference changes.
- **Potential rendering hotspot:** Updates to isolated tabs (like modifying a setting) theoretically trigger re-renders in unmounted or background components consuming the context. Requires profiling.

# 11. Potential rerender hotspots

- **`src/components/app/active-workout.tsx`:** Consumes global store and contains numerous inputs (sets, reps, timers). Input events dispatch to the global store, risking full-tree updates on keystrokes.
- **`src/components/app/views/home.tsx`:** Consumes store, renders heavy charts/heatmaps based on `view` derived state.
- **`src/components/app/popups/quick-popups.tsx`:** Context consumers modifying shared state via form submissions.
- **Required measurement:** React Profiler commit phase analysis to verify if these structural patterns drop frames.

# 12. Memoization and caching

- **`useMemo`:** Confirmed architecture pattern heavily utilized in views to memoize derived state (e.g., `fitcoreScore(view)` in `src/components/app/views/home.tsx`). Protects render-time computation.
- **`useCallback`:** Confirmed architecture pattern on context methods (`set`, `reset`) in `src/lib/store.tsx`.
- **Missing memoization:** `map` functions rendering components over large arrays (e.g., histories in `progress.tsx`) are not explicitly memoized per item.

# 13. Effects and subscriptions

- **`useEffect` in `src/lib/store.tsx`:** Subscribes to `state` changes to trigger `saveFitCoreData(state)`.
- **Storage listeners in `src/lib/persist.ts`:** `window.addEventListener("storage")` used to sync basic state.
- **Resize observers:** Implied in `recharts` ResponsiveContainers.
- **Effect-time computation:** `saveFitCoreData` is called after render commits, moving serialization work to the effect phase.

# 14. Timers and intervals

- **Active-workout timers:** Present in `src/components/app/active-workout.tsx`. Used for elapsed time and rest periods.
- **Count-up animations:** `src/components/app/count-up.tsx` uses requestAnimationFrame.
- **Potential impact:** High-frequency timer updates dispatching to React state can cause layout thrashing. Requires profiling.

# 15. Derived calculations

- **Render-time computations:**
  - **FitCore Score:** Calculated via `analytics.ts` in `home.tsx`. (Memoized).
  - **Workout volume:** `totalVolumeInRange` called in views. (Memoized).
  - **History sorting:** Array sorting in `progress.tsx`.
  - **Heatmap paths:** `muscleMap` generation in `home.tsx` and `recovery.tsx`.
- **Scaling risk:** O(N) operations over unbounded histories (e.g., weigh-ins) execute on the main thread during render. Requires profiling at scale.

# 16. Persistence and serialization

- **Serialization paths:** `src/lib/fitcore-data.ts` uses `JSON.stringify` for persistence.
- **Frequency evident from code:** Triggered by `useEffect` in `src/lib/store.tsx` whenever `state` changes.
- **Persistence-time computation:** Confirmed synchronous operation (`localStorage.setItem`).
- **Potential impact:** Serializing the entire state blob (MBs of data) on the main thread after every input can cause event-loop blocking.
- **Safe mitigation direction:** Debounce writes or migrate to asynchronous storage (IndexedDB).

# 17. Charts and heatmaps

- **Recharts:** `src/components/app/views/progress.tsx` renders `<LineChart>` and `<BarChart>`.
- **SVG Heatmaps:** `src/components/app/body-heatmap.tsx` maps raw SVG paths.
- **Potential impact:** `ResponsiveContainer` uses `ResizeObserver` which can trigger layout measurements on window resize. SVG paths scale with DOM nodes. Requires browser measurement.

# 18. Long lists and tables

- **Workout history:** `src/components/app/views/training.tsx`.
- **Weigh-in tables:** `src/components/app/views/progress.tsx`.
- **Set rows:** `src/components/app/active-workout.tsx`.
- **Virtualization:** No evidence of `react-window` or `react-virtuoso` in dependencies.
- **Potential rendering hotspot:** Rendering O(N) DOM elements for unbounded histories. Requires browser measurement.

# 19. Images and progress photos

- **Progress photos:** Stored as Base64 `dataUrl` strings within the global `AppState` (`src/lib/types.ts`).
- **Rendering boundaries:** Decoded natively by the browser `<img>` tag in `src/components/app/views/progress.tsx`.
- **Potential serialization hotspot:** Extremely large JSON sizes affect parse/stringify times.
- **Potential memory hotspot:** Retaining Base64 strings in React memory structure. Requires profiling.

# 20. CSS and animation

- **Animation CSS:** `tw-animate-css` controls transitions on sheets and dialogs.
- **Layout-affecting styles:** Tailwind grids and flexboxes.
- **Backdrop filters:** Popups use `backdrop-blur`.
- **Potential impact:** Blurs and multiple CSS transforms can strain compositor threads on low-end mobile devices. Requires browser measurement.

# 21. Service-worker performance considerations

- **Service-worker work:** `public/sw.js`. Caching static assets.
- **Impact:** Generally positive for subsequent loads, but precaching large assets blocks initial network bandwidth. Requires network throttling tests to evaluate.

# 22. Existing performance tests

- **E2E tests (`tests/e2e/`):** Focus heavily on functional correctness (e.g., verifying rendering, filling forms) rather than asserting performance metrics.
- **Test-only work:** `seedMinimalOnboardedState(page)` skips UI logic for faster test execution.

# 23. Measurement plan for future profiling

- **Required profiling:**
  - **React DevTools Profiler:** Record an active workout session (10+ sets, multiple keystrokes) to measure commit phase duration and context propagation.
  - **Chrome Performance Tab:** Measure startup sequence with a 5MB+ hydrated `localStorage` blob to test parsing delay.
  - **Lighthouse/Trace:** Audit layout shift on tab switching in the Home view.
  - **Bundle Analyzer:** Verify `recharts` and popup sheets are appropriately chunked.

# 24. Prioritized static-risk register

- **Priority 1 (Structural):** Global Context Provider (`store.tsx`) triggering broad state consumers on high-frequency inputs.
- **Priority 2 (Structural):** Synchronous full-state JSON serialization via `localStorage` in effect-time computation.
- **Priority 3 (Structural):** Unbounded history arrays mapped without virtualization in render-time computation.
- **Priority 4 (Structural):** Base64 progress photos stored directly in the `AppState` JSON blob.
- **Priority 5 (Structural):** Eager imports of multiple complex overlays (Sheets) inside primary domain views.

# 25. Safe optimization boundaries

- **Do not optimize without profiling:** Do not rewrite `recharts` implementations or CSS animations without confirming frame drops.
- **Do not optimize without bundle analysis:** Do not refactor `lucide-react` imports without confirming bundle weight.
- **Safe structural optimizations:** Introducing component-level local state for inputs (delaying global sync), implementing route-level lazy loading (`React.lazy`), and debouncing `localStorage` writes.

# 26. Open questions

- Are charts causing actual layout thrashing on mobile resize? (Requires browser measurement).
- Does the `lucide-react` import style bypass Vite tree-shaking? (Requires bundle analysis).
- What is the threshold limit for `JSON.parse` blocking the UI thread on standard mobile devices? (Requires profiling).

# 27. File index

- `src/router.tsx`
- `src/start.ts`
- `src/styles.css`
- `src/lib/store.tsx`
- `src/lib/fitcore-data.ts`
- `src/lib/persist.ts`
- `src/lib/analytics.ts`
- `src/lib/types.ts`
- `src/components/app/views/home.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/views/settings.tsx`
- `src/components/app/active-workout.tsx`
- `src/components/app/body-heatmap.tsx`
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/popups/quick-popups.tsx`
- `public/sw.js`
- `public/manifest.json`
- `package.json`
- `vite.config.ts`
