# Wave 1 Core Logging Code-Scope Audit

## 1. Purpose
This audit prepares the codebase for Wave 1 runtime implementation, which focuses strictly on core logging popups (Log meal, Check-in, Weigh-in). The purpose of this document is to identify exact source files, analyze overlapping dependencies, and recommend whether these three flows should be implemented in parallel PRs or a single combined PR.

**Note:** This is a docs-only audit. It does not implement any runtime code, and serves strictly to establish boundaries before runtime work begins.

## 2. Source docs checked
* `docs/planning/implementation-start-handoff.md` (Found and checked)
* `docs/planning/post-product-bible-cleanup-plan.md` (Found and checked)
* `docs/planning/post-bible-agent-task-queue.md` (Found and checked)
* `docs/planning/core-logging-popup-implementation-readiness-checklist.md` (Found and checked)
* `docs/planning/dashboard-graph-propagation-implementation-readiness-checklist.md` (Found and checked)
* `docs/planning/data-propagation-and-no-wasted-data-map.md` (Found and checked)
* `docs/audits/meal-logging-current-behavior-audit.md` (Found and checked)
* `docs/audits/check-in-current-behavior-audit.md` (Found and checked)
* `docs/audits/weigh-in-current-behavior-audit.md` (Found and checked)
* `docs/audits/current-data-flow-audit.md` (Found and checked)
* `docs/audits/state-view-usage-map.md` (Found and checked)
* `docs/audits/current-ui-behavior-audit.md` (Found and checked)
* `docs/audits/popup-sheet-behavior-inventory.md` (Found and checked)

## 3. Runtime/source files inspected
| File path | Relevant flow | What the file currently owns | Risk level | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/app/views/home.tsx` | Home dashboard buttons | State for popups, rendering of LogMeal/CheckIn/WeighIn buttons, dashboard metric displays | High | Highly overloaded with local states for popups. Central entry point. |
| `src/components/app/popups/quick-popups.tsx` | Popups/Sheets | Contains `LogMealSheet`, `CheckInSheet`, `WeighInSheet` definitions | High | All three target flows share this exact file. |
| `src/lib/store.tsx` | State/store updates | Central AppState Context, `useStore` hook, updater functions | High | All save actions route through here. Modifying this in parallel is dangerous. |
| `src/lib/fitcore-data.ts` | State logic | Helpers for reading and aggregating data (e.g. `getNutritionSummary`) | Medium | Modifying this can affect how dashboards render saved data. |
| `src/components/app/views/nutrition.tsx` | Dashboard/Graph display | Secondary entry point for "Log meal", displays nutrition data | Low | Needs to share same popup behavior as Home. |

## 4. Current behavior map
### Home dashboard buttons
* **Confirmed current behavior:** Buttons for Log meal, Check-in, and Weigh-in trigger local state updates (e.g. `setPopup('logmeal')`) which conditionally render sheets.
* **Missing/unclear behavior:** None, standard React state pattern.
* **Relevant file paths:** `src/components/app/views/home.tsx`
* **Future implementation risks:** Extremely heavy file, lots of inline components.

### Log meal
* **Confirmed current behavior:** Opens `LogMealSheet` via `BottomSheet`. Supports basic logging.
* **Missing/unclear behavior:** Needs AI review integration and camera flow logic to match the implementation readiness checklist.
* **Relevant file paths:** `src/components/app/popups/quick-popups.tsx`, `src/components/app/views/home.tsx`, `src/components/app/views/nutrition.tsx`
* **Future implementation risks:** Complex AI states within the sheet could bloat the file further.

### Check-in
* **Confirmed current behavior:** Opens `CheckInSheet` via `BottomSheet`. Logs subjective signals.
* **Missing/unclear behavior:** Exact schema mapping for all new subjective inputs if any changed in planning.
* **Relevant file paths:** `src/components/app/popups/quick-popups.tsx`, `src/components/app/views/home.tsx`
* **Future implementation risks:** Coupling with recovery readiness scores.

### Weigh-in
* **Confirmed current behavior:** Opens `WeighInSheet` via `BottomSheet`.
* **Missing/unclear behavior:** None.
* **Relevant file paths:** `src/components/app/popups/quick-popups.tsx`, `src/components/app/views/home.tsx`
* **Future implementation risks:** Needs strict numerical validation.

### Popup/sheet behavior
* **Confirmed current behavior:** Rendered inline without Portals, relying on standard z-index.
* **Missing/unclear behavior:** Lack of global portal wrapper.
* **Relevant file paths:** `src/components/app/sheet.tsx`, `src/components/app/popups/quick-popups.tsx`
* **Future implementation risks:** Z-index clipping on mobile.

### State/store updates
* **Confirmed current behavior:** Data is saved synchronously via `useStore().set(...)`.
* **Missing/unclear behavior:** Isolation of AI logs vs Manual logs during save.
* **Relevant file paths:** `src/lib/store.tsx`
* **Future implementation risks:** Conflict if multiple PRs edit the central context.

### Persistence
* **Confirmed current behavior:** Handled synchronously to `localStorage`.
* **Missing/unclear behavior:** None.
* **Relevant file paths:** `src/lib/persist.ts`, `src/lib/store.tsx`
* **Future implementation risks:** Hitting quota limits if large AI contexts are stored.

### Dashboard propagation
* **Confirmed current behavior:** Home dashboard uses `useStore().view` or `useStore().state` to render derived data. Updates are instant upon state change.
* **Missing/unclear behavior:** Ensuring no mismatch between state vs view during demo mode.
* **Relevant file paths:** `src/components/app/views/home.tsx`
* **Future implementation risks:** None, standard React context reactivity.

### Graph propagation
* **Confirmed current behavior:** Derived directly from state summaries.
* **Missing/unclear behavior:** None.
* **Relevant file paths:** `src/lib/fitcore-data.ts`, `src/components/app/views/progress.tsx`
* **Future implementation risks:** None if state updater is used correctly.

### AI/Jarvis touchpoints
* **Confirmed current behavior:** Jarvis estimation is hooked into meal logging.
* **Missing/unclear behavior:** Exact user confirmation step implementation.
* **Relevant file paths:** `src/components/app/popups/quick-popups.tsx`, `src/lib/jarvis/tools.ts`
* **Future implementation risks:** Adding confirmation loop within the popup state.

## 5. File overlap analysis
| Flow | Files likely touched | Shared files | Can safely run in parallel? | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| Log meal popup | `quick-popups.tsx`, `home.tsx` | Yes (`quick-popups.tsx`, `home.tsx`) | No | Combine |
| Check-in popup | `quick-popups.tsx`, `home.tsx` | Yes (`quick-popups.tsx`, `home.tsx`) | No | Combine |
| Weigh-in popup | `quick-popups.tsx`, `home.tsx` | Yes (`quick-popups.tsx`, `home.tsx`) | No | Combine |
| Shared popup/sheet components | `sheet.tsx` | Yes | No | Combine |
| Shared store/state | `store.tsx` | Yes | No | Combine |
| Shared dashboard propagation | `home.tsx` | Yes | No | Combine |
| Shared graph propagation | `fitcore-data.ts` | Yes | No | Combine |

## 6. Recommended Wave 1 implementation strategy
**Option B: implement Log meal, Check-in, and Weigh-in together in one combined PR**

**Why:** All three core logging flows are physically co-located in exactly the same files (`src/components/app/popups/quick-popups.tsx` and `src/components/app/views/home.tsx`). Implementing them in separate, parallel PRs will guarantee severe merge conflicts on these highly-trafficked files, as well as on `src/lib/store.tsx` if any helper mutations are added. A combined PR isolates the risk into a single integration step.

## 7. Proposed PR breakdown
Since a combined PR is safer, we recommend:
* **1A Core logging popup implementation:** Updates `quick-popups.tsx` and `home.tsx` to fully implement the readiness checklist requirements for Meal, Check-in, and Weigh-in.
* **1B Wave 1 smoke verification/follow-up:** Addresses any immediate bugs or layout issues found post-merge of 1A.

## 8. Out-of-scope list for Wave 1
* AI/Jarvis runtime logging
* Voice Jarvis
* Full graph redesign
* Full dashboard redesign
* Active workout rebuild
* Schema/data model migrations unless absolutely required
* Package/lockfile changes
* CI/workflow changes
* Service worker changes
* PR #34 popup runtime merge
* PR #14 CI merge
* PR #2 voice merge

## 9. Acceptance criteria for Wave 1 runtime implementation
* Home Log meal button opens a popup/sheet, not full page navigation.
* Home Check-in button opens a popup/sheet, not full page navigation.
* Home Weigh-in button opens a popup/sheet, not full page navigation.
* Manual input can be saved.
* Cancel/close works without saving.
* Basic validation exists.
* Save errors are visible and recoverable.
* Saved entries are available in app state/persistence.
* No demo/test account data pollution is introduced.
* No AI-generated entries are silently saved.
* No parked PR is modified.

## 10. Final recommendation table
| Area | Files likely affected | Recommended PR | Parallel safe? | Risk | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Logging UI | `quick-popups.tsx`, `home.tsx` | 1A | No | High | Co-located in same files. |
| State/Store updates | `store.tsx` | 1A | No | High | Centralized context updater. |
| Popup foundations | `sheet.tsx` | 1A | No | Medium | Shared component. |
