# Cross-View Navigation & Context Preservation Map

## 1. Executive summary

- **Current Navigation Architecture:** The application uses a single-route architecture (`/` via TanStack Router). Navigation is simulated by conditionally rendering components based on state (e.g., `section` in `src/routes/index.tsx`), mutating in-memory state rather than actual URLs.
- **Current Route Architecture:** Single root route (`/`). Top-level views act as "routes".
- **Current Daily View/Deep Dive Model:** Implemented as a boolean-like state (`layoutMode`: `"daily" | "deepDive"`) toggled globally in `FitCoreApp` and passed down to domain views which conditionally render sub-components.
- **How Overlays are Opened and Closed:** Managed via local React state (e.g., `const [open, setOpen] = useState(false)`) and rendered via `createPortal` directly to `document.body`. No URL integration.
- **How Cross-Domain Navigation Works:** Invoking state setters passed from the root (e.g., `onNavigate={(s) => setSection(s)}`).
- **What Context is Currently Preserved:** Almost nothing upon switching domains. Only global `AppState` (FitCore data) is persisted.
- **What Context is Currently Lost:** Scroll position, selected tab within a domain, selected metric/chart/date range, open sheet states.
- **Major Back-Navigation Risks:** The browser's "Back" button does not navigate between in-app views; it exits the application or goes to the previous actual URL. In-app navigation is entirely trapped in-memory.
- **Major Mobile-Navigation Risks:** Bottom navigation may obscure content. Safe-area handling requires manual `pb-[max(24px,env(safe-area-inset-bottom))]` padding. Overlay stacking can become unpredictable.
- **Major Accessibility Risks:** Missing strict WAI-ARIA semantics on custom overlays (`BottomSheet` lacks `role="dialog"` and `aria-modal="true"` in the primitive). Missing focus management/traps for overlays.
- **Most Important Findings for Future Redesign Work:** The reliance on React state for navigation means any redesign that introduces addressable routes (for Deep Link, History API, Back Button support) will require a complete paradigm shift from transient state to URL-driven state.

## 2. Canonical route and navigation architecture

- **Application root route:** `/` (`src/routes/__root.tsx`)
- **Primary route files:** `src/routes/index.tsx`
- **Route registration:** Handled by `@tanstack/react-router` in `src/router.tsx` and `src/routeTree.gen.ts`.
- **Primary tabs:** `home`, `training`, `nutrition`, `recovery`, `progress` (from `SectionId` in `src/lib/types.ts`).
- **Tab identifiers:** Exact strings as listed above.
- **Subtab identifiers:** Transient local state (e.g., `sub` in `src/components/app/views/training.tsx`).
- **Daily View identifiers:** `"daily"`
- **Deep Dive identifiers:** `"deepDive"`
- **Detail routes:** None (managed by transient state/BottomSheet, e.g., `detail === id`).
- **History routes:** None (managed by transient state/BottomSheet, e.g., `panel === "history"`).
- **Settings route:** Overlay state (`settingsOpen === true`).
- **Jarvis route or overlay state:** Overlay state (`JarvisPanel` component).
- **Active-workout route or state:** Global state (`state.activeWorkout`).
- **Fallback or not-found behavior:** `NotFoundComponent` in `src/routes/__root.tsx`.

| User-Facing Name | Internal Name         | Repository-Relative File                 | Component Rendered | Opening Trigger      | Closing or Return Behavior | Browser-History Behavior   | Related Tests |
| :--------------- | :-------------------- | :--------------------------------------- | :----------------- | :------------------- | :------------------------- | :------------------------- | :------------ |
| Root             | `/`                   | `src/routes/index.tsx`                   | `FitCoreApp`       | URL entry            | N/A                        | Normal page load           | None          |
| Home             | `home`                | `src/components/app/views/home.tsx`      | `HomeView`         | Tab click / Default  | N/A                        | None (in-memory)           | None          |
| Train            | `training`            | `src/components/app/views/training.tsx`  | `TrainingView`     | Tab click            | N/A                        | None                       | None          |
| Fuel             | `nutrition`           | `src/components/app/views/nutrition.tsx` | `NutritionView`    | Tab click            | N/A                        | None                       | None          |
| Recover          | `recovery`            | `src/components/app/views/recovery.tsx`  | `RecoveryView`     | Tab click            | N/A                        | None                       | None          |
| Stats            | `progress`            | `src/components/app/views/progress.tsx`  | `ProgressView`     | Tab click            | N/A                        | None                       | None          |
| Settings         | `settingsOpen`        | `src/components/app/views/settings.tsx`  | `SettingsView`     | Header button        | `setSettingsOpen(false)`   | None                       | None          |
| Active Workout   | `state.activeWorkout` | `src/components/app/active-workout.tsx`  | `ActiveWorkout`    | Start Workout action | Discard/Finish action      | Blocked via `beforeunload` | None          |

## 3. Primary-tab navigation map

| Tab            | Visible Label | Icon         | Internal ID | Navigation Component | Active-State Behavior | Selected-State Behavior | Entry View | Retained View State | Reset Behavior                         | Double/Repeat-Tap Behavior | Scroll Behavior | Mobile Safe-Area Behavior              | Desktop Behavior | Test Coverage |
| :------------- | :------------ | :----------- | :---------- | :------------------- | :-------------------- | :---------------------- | :--------- | :------------------ | :------------------------------------- | :------------------------- | :-------------- | :------------------------------------- | :--------------- | :------------ |
| Home           | Home          | `Home`       | `home`      | `BottomNav`          | Icon highlights       | Renders `HomeView`      | Daily View | None                | View completely unmounts on tab switch | None implemented           | Reset to top    | Uses `safe-area-inset-bottom` in shell | Stretched mobile | None          |
| Training       | Train         | `Dumbbell`   | `training`  | `BottomNav`          | Icon highlights       | Renders `TrainingView`  | Daily View | None                | Unmounts                               | None implemented           | Reset to top    | Uses `safe-area-inset-bottom`          | Stretched mobile | None          |
| Fuel/Nutrition | Fuel          | `Apple`      | `nutrition` | `BottomNav`          | Icon highlights       | Renders `NutritionView` | Daily View | None                | Unmounts                               | None implemented           | Reset to top    | Uses `safe-area-inset-bottom`          | Stretched mobile | None          |
| Recovery       | Recover       | `Heart`      | `recovery`  | `BottomNav`          | Icon highlights       | Renders `RecoveryView`  | Daily View | None                | Unmounts                               | None implemented           | Reset to top    | Uses `safe-area-inset-bottom`          | Stretched mobile | None          |
| Stats/Progress | Stats         | `TrendingUp` | `progress`  | `BottomNav`          | Icon highlights       | Renders `ProgressView`  | Daily View | None                | Unmounts                               | None implemented           | Reset to top    | Uses `safe-area-inset-bottom`          | Stretched mobile | None          |

- **Inconsistent tab naming:** Tab label "Fuel" maps to "nutrition". "Stats" maps to "progress".
- **Tabs that reset state unexpectedly:** All tabs reset state entirely because they unmount completely on switch.
- **Tabs that preserve stale state unexpectedly:** None.
- **Tabs that open different default views depending on entry path:** None.

## 4. Daily View and Deep Dive transition map

### Home

| Field                         | Value                       |
| :---------------------------- | :-------------------------- |
| Daily View entry              | Default on tab open         |
| Deep Dive entry               | Toggle via `ViewModeToggle` |
| Visible Deep Dive trigger     | Top toggle button           |
| Chart-based Deep Dive trigger | N/A                         |
| Metric-based trigger          | N/A                         |
| History-based trigger         | N/A                         |
| Selected-context transfer     | N/A                         |
| Return behavior               | Toggle back                 |
| Browser back behavior         | Exits app                   |
| Direct-route behavior         | N/A (State only)            |
| Reload behavior               | Resets to Daily View        |
| Related tests                 | None                        |

### Training

| Field                         | Value                       |
| :---------------------------- | :-------------------------- |
| Daily View entry              | Default on tab open         |
| Deep Dive entry               | Toggle via `ViewModeToggle` |
| Visible Deep Dive trigger     | Top toggle button           |
| Chart-based Deep Dive trigger | N/A                         |
| Metric-based trigger          | N/A                         |
| History-based trigger         | N/A                         |
| Selected-context transfer     | N/A                         |
| Return behavior               | Toggle back                 |
| Browser back behavior         | Exits app                   |
| Direct-route behavior         | N/A                         |
| Reload behavior               | Resets to Daily View        |
| Related tests                 | None                        |

### Fuel/Nutrition

| Field                         | Value                       |
| :---------------------------- | :-------------------------- |
| Daily View entry              | Default on tab open         |
| Deep Dive entry               | Toggle via `ViewModeToggle` |
| Visible Deep Dive trigger     | Top toggle button           |
| Chart-based Deep Dive trigger | N/A                         |
| Metric-based trigger          | N/A                         |
| History-based trigger         | N/A                         |
| Selected-context transfer     | N/A                         |
| Return behavior               | Toggle back                 |
| Browser back behavior         | Exits app                   |
| Direct-route behavior         | N/A                         |
| Reload behavior               | Resets to Daily View        |
| Related tests                 | None                        |

### Recovery

| Field                         | Value                       |
| :---------------------------- | :-------------------------- |
| Daily View entry              | Default on tab open         |
| Deep Dive entry               | Toggle via `ViewModeToggle` |
| Visible Deep Dive trigger     | Top toggle button           |
| Chart-based Deep Dive trigger | N/A                         |
| Metric-based trigger          | N/A                         |
| History-based trigger         | N/A                         |
| Selected-context transfer     | N/A                         |
| Return behavior               | Toggle back                 |
| Browser back behavior         | Exits app                   |
| Direct-route behavior         | N/A                         |
| Reload behavior               | Resets to Daily View        |
| Related tests                 | None                        |

### Stats/Progress

| Field                         | Value                       |
| :---------------------------- | :-------------------------- |
| Daily View entry              | Default on tab open         |
| Deep Dive entry               | Toggle via `ViewModeToggle` |
| Visible Deep Dive trigger     | Top toggle button           |
| Chart-based Deep Dive trigger | N/A                         |
| Metric-based trigger          | N/A                         |
| History-based trigger         | N/A                         |
| Selected-context transfer     | N/A                         |
| Return behavior               | Toggle back                 |
| Browser back behavior         | Exits app                   |
| Direct-route behavior         | N/A                         |
| Reload behavior               | Resets to Daily View        |
| Related tests                 | None                        |

**Context Preservation Matrix (All Domains):**
| Context | Status |
| :--- | :--- |
| Selected metric | Unsupported |
| Selected chart | Unsupported |
| Selected date | Unsupported |
| Selected range | Unsupported |
| Selected comparison | Unsupported |
| Chart mode | Unsupported |
| Selected muscle | Unsupported |
| Heatmap side | Unsupported |
| Heatmap mode | Unsupported |
| Selected workout | Unsupported |
| Selected exercise | Unsupported |
| Selected meal | Unsupported |
| Selected Recovery entry | Unsupported |
| Selected weigh-in | Unsupported |
| Selected goal | Unsupported |
| Scroll position | Reset unintentionally |

## 5. Cross-domain navigation map

| Origin               | Trigger      | Destination         | Context Passed | Context Lost            | State Mutation            | Browser-History Effect | Back Behavior          | Active-Workout Effect | Overlay Effect   | Related Tests |
| :------------------- | :----------- | :------------------ | :------------- | :---------------------- | :------------------------ | :--------------------- | :--------------------- | :-------------------- | :--------------- | :------------ |
| Home                 | Action Card  | Training            | None           | All transient state     | `setSection("training")`  | None                   | Browser Back exits app | Hidden                | None             | None          |
| Home                 | Action Card  | Fuel/Nutrition      | None           | All transient state     | `setSection("nutrition")` | None                   | Browser Back exits app | Hidden                | None             | None          |
| Home                 | Action Card  | Recovery            | None           | All transient state     | `setSection("recovery")`  | None                   | Browser Back exits app | Hidden                | None             | None          |
| Home                 | Action Card  | Stats/Progress      | None           | All transient state     | `setSection("progress")`  | None                   | Browser Back exits app | Hidden                | None             | None          |
| Training             | Tab click    | Recovery            | None           | All transient state     | `setSection("recovery")`  | None                   | Exits app              | Hidden                | None             | None          |
| Training             | Tab click    | Stats/Progress      | None           | All transient state     | `setSection("progress")`  | None                   | Exits app              | Hidden                | None             | None          |
| Fuel/Nutrition       | Tab click    | Stats/Progress      | None           | All transient state     | `setSection("progress")`  | None                   | Exits app              | Hidden                | None             | None          |
| Recovery             | Tab click    | Training            | None           | All transient state     | `setSection("training")`  | None                   | Exits app              | Hidden                | None             | None          |
| Recovery             | Tab click    | Home                | None           | All transient state     | `setSection("home")`      | None                   | Exits app              | Hidden                | None             | None          |
| Stats/Progress       | Tab click    | Home                | None           | All transient state     | `setSection("home")`      | None                   | Exits app              | Hidden                | None             | None          |
| Jarvis               | AI Event     | Any Domain          | Target section | Conversation retained   | `setSection(target)`      | None                   | Closes overlay         | Hidden                | Modifies section | None          |
| Settings             | Back Button  | Previous            | None           | None                    | `setSettingsOpen(false)`  | None                   | Returns to origin      | N/A                   | Closes settings  | None          |
| Active Workout       | Discard/Save | Training Daily View | None           | Current workout context | Clears `activeWorkout`    | None                   | N/A                    | Cleared               | None             | None          |
| Universal Comparison | N/A          | N/A                 | N/A            | N/A                     | N/A                       | N/A                    | N/A                    | N/A                   | N/A              | N/A           |

- Navigation paths depend on generic tab switching rather than precise contextual routing.

## 6. Quick-action inventory

| Visible Label         | Source View         | Triggering Control | Destination               | Overlay or Route | Required Context       | State Mutation      | Cancellation Behavior | Return Behavior | Related Tests | Preservation Risk          |
| :-------------------- | :------------------ | :----------------- | :------------------------ | :--------------- | :--------------------- | :------------------ | :-------------------- | :-------------- | :------------ | :------------------------- |
| Start Workout         | Quick Popups / Home | Button             | `BottomSheet` (Training)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Resume Workout        | Quick Popups / Home | Button             | `ActiveWorkout`           | Route (State)    | Global `activeWorkout` | None                | N/A                   | N/A             | None          | High                       |
| Log Meal              | Quick Popups / Home | Button             | `BottomSheet` (Nutrition) | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High (tab switch loses it) |
| Log Supplement        | Quick Popups / Home | Button             | `BottomSheet` (Nutrition) | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Check In              | Quick Popups / Home | Button             | `BottomSheet` (Recovery)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Weigh In              | Quick Popups / Home | Button             | `BottomSheet` (Progress)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Add Progress Photo    | Progress            | Button             | `BottomSheet` (Progress)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Create Goal           | Goals Panel         | Button             | `BottomSheet` (Progress)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Open History          | Training            | Card               | `BottomSheet` (Training)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Open Template         | Training            | Card               | `BottomSheet` (Training)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Open Cardio           | Training            | Card               | `BottomSheet` (Training)  | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Open Plate Calculator | Active Workout      | Button             | `BottomSheet` (Workout)   | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Open Custom Exercise  | Active Workout      | Button             | `BottomSheet` (Workout)   | Overlay          | None                   | Opens sheet         | Closes sheet          | Back to origin  | None          | High                       |
| Open Jarvis           | Bottom Nav / All    | Button             | `JarvisPanel`             | Overlay          | Domain Context         | Opens panel         | Closes panel          | Back to origin  | None          | Low                        |
| Open Settings         | Home / Nav          | Header Button      | `SettingsView`            | Route (State)    | None                   | Sets `settingsOpen` | Closes view           | Back to origin  | None          | High                       |

- Actions with same label but different behavior: None visually evident from static review.

## 7. History and detail-navigation map

| Path               | Entry Points     | Destination Component | Selected Record Identifier | Navigation Mechanism         | Back Behavior | Missing-Record Behavior | Deleted-Record Behavior | Reload Behavior | Test Coverage |
| :----------------- | :--------------- | :-------------------- | :------------------------- | :--------------------------- | :------------ | :---------------------- | :---------------------- | :-------------- | :------------ |
| Workout History    | Training Tab     | `BottomSheet`         | N/A                        | State: `panel === "history"` | Closes sheet  | Empty state             | N/A                     | Fails (resets)  | None          |
| Workout Detail     | Training History | `BottomSheet`         | `detail === wk.id`         | State                        | Closes sheet  | N/A                     | Closes sheet on delete  | Fails (resets)  | None          |
| Exercise History   | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Set Detail         | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Meal History       | Nutrition Tab    | `BottomSheet`         | N/A                        | State                        | Closes sheet  | Empty state             | N/A                     | Fails (resets)  | None          |
| Meal Detail        | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Food Detail        | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Supplement History | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Recovery History   | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Check-in Detail    | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Sleep Detail       | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Muscle Detail      | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Weigh-in History   | Progress Tab     | `BottomSheet`         | N/A                        | State                        | Closes sheet  | Empty state             | N/A                     | Fails (resets)  | None          |
| Weigh-in Detail    | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Goal Detail        | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |
| Photo Detail       | Progress Tab     | `BottomSheet`         | `view === photo.id`        | State                        | Closes sheet  | N/A                     | Closes sheet on delete  | Fails (resets)  | None          |
| Activity Detail    | N/A              | N/A                   | N/A                        | N/A                          | N/A           | N/A                     | N/A                     | N/A             | N/A           |

- All detail surfaces rely on transient in-memory selection and will fail on direct reload.

## 8. Active-workout navigation audit

| Behavior                      | State Retained                  | Route Retained    | Warning Shown        | Confirmation Shown | Return Path      | Test Coverage | Preservation Risk                |
| :---------------------------- | :------------------------------ | :---------------- | :------------------- | :----------------- | :--------------- | :------------ | :------------------------------- |
| Starting a workout            | Global `state.activeWorkout`    | `training`        | No                   | No                 | N/A              | None          | Low                              |
| Resuming a workout            | Global `state.activeWorkout`    | `training`        | No                   | No                 | N/A              | None          | Low                              |
| Leaving the active workout    | N/A                             | N/A               | N/A                  | N/A                | N/A              | None          | High                             |
| Switching tabs                | Global state (UI hides nav)     | Stays on Training | No                   | No                 | N/A              | None          | High (Nav hidden)                |
| Opening Jarvis                | Global state                    | Stays on Training | No                   | No                 | N/A              | None          | Low                              |
| Opening Settings              | Hidden during workout           | N/A               | No                   | No                 | N/A              | None          | N/A                              |
| Opening a sheet               | Global state (Sheet opens over) | Stays on Training | No                   | No                 | Close sheet      | None          | Low                              |
| Browser back                  | Exits App                       | No                | Yes (`beforeunload`) | Yes (Browser UI)   | None             | None          | High (leaves inconsistent state) |
| Browser reload                | Global state                    | Training          | No                   | No                 | Restores workout | None          | Low                              |
| Reopening Training            | N/A                             | N/A               | N/A                  | N/A                | N/A              | None          | N/A                              |
| Completing the workout        | Merges to history               | Training          | No                   | No                 | Training Daily   | None          | Low                              |
| Discarding the workout        | Clears state                    | Training          | Yes                  | Yes (Dialog)       | Training Daily   | None          | Low                              |
| Navigating to workout history | N/A                             | N/A               | N/A                  | N/A                | N/A              | None          | N/A                              |

- Risks: Browser back leaves inconsistent state. Active workout hides navigation.

## 9. Jarvis navigation audit

| Path                       | Origin State | User Action       | Destination   | Context Passed    | Conversation Retained | Conversation Lost | Overlay Retained | Back Behavior    | Test Coverage |
| :------------------------- | :----------- | :---------------- | :------------ | :---------------- | :-------------------- | :---------------- | :--------------- | :--------------- | :------------ |
| Domain opening             | Any          | Voice/Text prompt | Target Domain | Domain identifier | Yes                   | No                | Closes           | Returns to app   | None          |
| Active-workout opening     | N/A          | N/A               | N/A           | N/A               | N/A                   | N/A               | N/A              | N/A              | N/A           |
| Specific chart opening     | N/A          | N/A               | N/A           | N/A               | N/A                   | N/A               | N/A              | N/A              | N/A           |
| Specific history opening   | N/A          | N/A               | N/A           | N/A               | N/A                   | N/A               | N/A              | N/A              | N/A           |
| Settings opening           | Any          | Voice/Text prompt | Settings      | None              | Yes                   | No                | Closes           | Back to previous | None          |
| Sheet opening              | N/A          | N/A               | N/A           | N/A               | N/A                   | N/A               | N/A              | N/A              | N/A           |
| Post-action navigation     | N/A          | N/A               | N/A           | N/A               | N/A                   | N/A               | N/A              | N/A              | N/A           |
| Daily-review quick actions | N/A          | N/A               | N/A           | N/A               | N/A                   | N/A               | N/A              | N/A              | N/A           |

- Jarvis generally closes after executing a navigation action, retaining conversation in global state.

## 10. Settings navigation audit

| Trigger                       | Destination          | State Retained              | Unsaved State Handling       | Confirmation Behavior | Test Coverage | Risk |
| :---------------------------- | :------------------- | :-------------------------- | :--------------------------- | :-------------------- | :------------ | :--- |
| Header Icon                   | SettingsView         | None (App unmounts)         | Saved immediately (onChange) | N/A                   | None          | Low  |
| Section navigation            | Nested Settings View | None                        | Saved immediately            | N/A                   | None          | Low  |
| Nested Settings views         | Nested Settings View | None                        | Saved immediately            | N/A                   | None          | Low  |
| Close behavior                | Previous section     | Yes (Section state remains) | N/A                          | N/A                   | None          | Low  |
| Browser back behavior         | Exits app            | None                        | N/A                          | N/A                   | None          | High |
| Return-to-origin behavior     | Previous section     | Yes (Section state remains) | N/A                          | N/A                   | None          | Low  |
| Preservation of unsaved edits | N/A                  | N/A                         | N/A                          | N/A                   | N/A           | Low  |
| Destructive-action navigation | Delete Data          | None                        | N/A                          | Yes (ConfirmDialog)   | None          | Low  |
| Onboarding reset navigation   | Onboarding           | None                        | N/A                          | Yes                   | None          | Low  |
| Jarvis-permission navigation  | N/A                  | N/A                         | N/A                          | N/A                   | N/A           | Low  |

## 11. Sheet inventory

| Name          | Domain | Source File                    | Opening Trigger    | Content             | Primary Actions | Secondary Actions | Close Control | Backdrop Dismissal | Escape Dismissal | Scroll Behavior   | Body-Scroll Locking       | Focus Containment | Focus Restoration | Stacking Behavior | Safe-Area Behavior | Mobile Height  | Desktop Behavior | Related Tests |
| :------------ | :----- | :----------------------------- | :----------------- | :------------------ | :-------------- | :---------------- | :------------ | :----------------- | :--------------- | :---------------- | :------------------------ | :---------------- | :---------------- | :---------------- | :----------------- | :------------- | :--------------- | :------------ |
| `BottomSheet` | Shared | `src/components/app/sheet.tsx` | Prop `open={true}` | Passed via children | N/A             | N/A               | X button      | Yes                | Unknown          | `overflow-y-auto` | Yes (`overflow="hidden"`) | None              | None              | Uses `z-50`       | Uses env inset     | Auto/Tall/Full | Max 480px        | None          |

- Group sheets by shared primitive: All sheets use `BottomSheet`.
- All sheets across the application use the `BottomSheet` shared primitive. It does not have explicit WAI-ARIA dialog semantics or internal focus trapping based on static inspection.

## 12. Dialog inventory

| Name            | Domain | Source File                    | Trigger            | Role/Semantics | Title        | Description    | Actions        | Destructive Action | Cancel Behavior | Backdrop Behavior | Escape Behavior | Focus Trap   | Initial Focus | Focus Restoration | Nested-Dialog Behavior | Test Coverage |
| :-------------- | :----- | :----------------------------- | :----------------- | :------------- | :----------- | :------------- | :------------- | :----------------- | :-------------- | :---------------- | :-------------- | :----------- | :------------ | :---------------- | :--------------------- | :------------ |
| `ConfirmDialog` | Shared | `src/components/app/sheet.tsx` | Prop `open={true}` | None visible   | Prop `title` | Prop `message` | Confirm/Cancel | Prop `destructive` | Closes dialog   | Yes               | Unknown         | None visible | None          | None              | Unknown                | None          |

- Implemented visually without proper dialog semantics.

## 13. Popup and inline-overlay inventory

| Item                       | Trigger | Positioning             | Portal Behavior       | Dismissal         | Keyboard Behavior | Mobile Behavior | Overlap Risk | Z-index | Related Tests |
| :------------------------- | :------ | :---------------------- | :-------------------- | :---------------- | :---------------- | :-------------- | :----------- | :------ | :------------ |
| Score popups               | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Readiness popups           | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Recovery popups            | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Metric popups              | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Tooltips                   | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Menus                      | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Dropdowns                  | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Chart focus overlays       | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Contextual action menus    | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Temporary confirmations    | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Toast or snackbar messages | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Inline expandable panels   | N/A     | N/A                     | N/A                   | N/A               | N/A               | N/A             | N/A          | N/A     | None          |
| Custom popups              | Click   | Fixed (via BottomSheet) | Yes (`document.body`) | Button / Backdrop | None specific     | Standard        | High         | `z-50`  | None          |

## 14. Overlay-stacking and z-index audit

| Element                                | Relevant Components | CSS Classes | Z-index Values | Portals | Body-scroll Behavior | Focus Behavior | Known Tests | Probable Collision Risks              |
| :------------------------------------- | :------------------ | :---------- | :------------- | :------ | :------------------- | :------------- | :---------- | :------------------------------------ |
| Sheet over page                        | `BottomSheet`       | `z-50`      | 50             | Yes     | Hidden               | None           | None        | Dialogs/Sheets opening simultaneously |
| Dialog over sheet                      | `ConfirmDialog`     | `z-50`      | 50             | Yes     | N/A                  | None           | None        | Sheets/Dialogs stacking incorrectly   |
| Popup over chart                       | N/A                 | N/A         | N/A            | N/A     | N/A                  | N/A            | None        | N/A                                   |
| Jarvis over another overlay            | N/A                 | N/A         | N/A            | N/A     | N/A                  | N/A            | None        | N/A                                   |
| Navigation while an overlay is open    | N/A                 | N/A         | N/A            | N/A     | N/A                  | N/A            | None        | N/A                                   |
| Bottom navigation under overlays       | `BottomNav`         | `z-30`      | 30             | No      | N/A                  | N/A            | None        | Covered by sheets/dialogs             |
| Active-workout controls under overlays | N/A                 | N/A         | N/A            | N/A     | N/A                  | N/A            | None        | N/A                                   |
| Focus mode over Deep Dive              | N/A                 | N/A         | N/A            | N/A     | N/A                  | N/A            | None        | N/A                                   |
| Nested sheets                          | N/A                 | N/A         | N/A            | N/A     | N/A                  | N/A            | None        | N/A                                   |
| Multiple open states                   | N/A                 | N/A         | N/A            | N/A     | N/A                  | N/A            | None        | N/A                                   |

- Inconsistent stacking layers: Sheets and ConfirmDialogs share `z-50`, risking z-fighting or incorrect stacking if opened simultaneously.

## 15. Back-navigation matrix

| Context               | Expected Destination Based on Code | Actual Destination Visible From Code | State Preserved | Overlay State | Scroll State | Test Coverage | Ambiguity or Risk |
| :-------------------- | :--------------------------------- | :----------------------------------- | :-------------- | :------------ | :----------- | :------------ | :---------------- |
| Browser Back          | Previous Domain/State              | Previous URL / Exits App             | None            | Lost          | Lost         | None          | High Risk         |
| In-app Back           | Previous View (Settings)           | Previous Domain                      | Yes             | Closed        | Reset        | None          | N/A               |
| Close icon            | Close Sheet                        | Close Sheet                          | Domain          | Closed        | Retained     | None          | N/A               |
| Sheet close           | Close Sheet                        | Close Sheet                          | Domain          | Closed        | Retained     | None          | N/A               |
| Dialog Cancel         | Close Dialog                       | Close Dialog                         | Domain          | Closed        | Retained     | None          | N/A               |
| Bottom-tab change     | Target Domain                      | Target Domain                        | None            | Lost          | Lost         | None          | N/A               |
| Deep Dive return      | Daily View                         | Daily View                           | None            | Lost          | Lost         | None          | N/A               |
| History-detail return | Return to History                  | Return to History                    | None            | Lost          | Lost         | None          | N/A               |
| Jarvis close          | Previous Domain                    | Previous Domain                      | Yes             | Closed        | Reset        | None          | N/A               |
| Settings close        | Previous Domain                    | Previous Domain                      | Yes             | Closed        | Reset        | None          | N/A               |
| Active-workout exit   | Previous Domain                    | Previous Domain                      | Yes             | Closed        | Reset        | None          | N/A               |

- Browser Back and in-app Back produce entirely different outcomes.

## 16. Reload and direct-entry audit

| State                | Directly Addressable | Transient Selection Required | Fallback Behavior | Lost Context  | Retained Context | Active-Workout Behavior | Error Behavior | Test Coverage |
| :------------------- | :------------------- | :--------------------------- | :---------------- | :------------ | :--------------- | :---------------------- | :------------- | :------------ |
| Home Daily View      | No (only `/`)        | No                           | N/A               | All transient | Global Store     | Global                  | Normal         | None          |
| Home Deep Dive       | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Training Daily View  | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Training Deep Dive   | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Active workout       | No                   | No                           | N/A               | All transient | Global Store     | Global                  | Normal         | None          |
| Fuel Daily View      | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Fuel Deep Dive       | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Recovery Daily View  | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Recovery Deep Dive   | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Stats Daily View     | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Stats Deep Dive      | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Settings             | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| Jarvis               | No                   | No                           | Returns to Daily  | All transient | Global Store     | Global                  | Normal         | None          |
| history/detail views | No                   | Yes                          | Returns to Domain | All transient | Global Store     | Global                  | Normal         | None          |

- Detail screens cannot survive reload because they rely only on transient component state.

## 17. Context object and state-transfer inventory

| Symbol         | Source File | Origin      | Destination | Fields                    | Lifetime | Default   | Reset Point | Reload Behavior   | Test Coverage |
| :------------- | :---------- | :---------- | :---------- | :------------------------ | :------- | :-------- | :---------- | :---------------- | :------------ |
| `section`      | `index.tsx` | Tab         | Main Shell  | `"home"\|"training"\|...` | Mount    | `"home"`  | Reload      | Resets to default | None          |
| `layoutMode`   | `index.tsx` | View Toggle | Main Shell  | `"daily"\|"deepDive"`     | Mount    | `"daily"` | Reload      | Resets to default | None          |
| `settingsOpen` | `index.tsx` | Header      | Main Shell  | `boolean`                 | Mount    | `false`   | Reload      | Resets to default | None          |

- No global navigation store. Duplicated transient contexts across views.

## 18. Scroll-position and viewport-state audit

| State                  | Component     | Storage Mechanism | Lifetime | Navigation Behavior | Reload Behavior | Test Coverage | Likely User Impact           |
| :--------------------- | :------------ | :---------------- | :------- | :------------------ | :-------------- | :------------ | :--------------------------- |
| Page scroll            | Window        | None              | Unmount  | Reset               | Reset           | None          | Frustrating loss of position |
| Chart-stack position   | N/A           | N/A               | N/A      | N/A                 | N/A             | None          | N/A                          |
| Selected carousel item | N/A           | N/A               | N/A      | N/A                 | N/A             | None          | N/A                          |
| Expanded card state    | N/A           | N/A               | N/A      | N/A                 | N/A             | None          | N/A                          |
| Selected tab           | Domain Views  | Local State       | Unmount  | Reset               | Reset           | None          | Annoying context loss        |
| Selected subtab        | Domain Views  | Local State       | Unmount  | Reset               | Reset           | None          | Annoying context loss        |
| List scroll            | N/A           | N/A               | N/A      | N/A                 | N/A             | None          | N/A                          |
| Sheet scroll           | `BottomSheet` | Local DOM         | Unmount  | Reset               | Reset           | None          | Low                          |
| Focused control        | N/A           | N/A               | N/A      | N/A                 | N/A             | None          | N/A                          |
| Selected table row     | N/A           | N/A               | N/A      | N/A                 | N/A             | None          | N/A                          |

## 19. Mobile-navigation audit

| Finding                                   | Classification           | Risk                        |
| :---------------------------------------- | :----------------------- | :-------------------------- |
| Bottom-navigation height obscures content | Confirmed gap            | Browser verification needed |
| Safe-area insets applied manually         | Confirmed implementation | Low                         |
| Overlay clearance                         | Probable risk            | Browser verification needed |
| Sticky-header clearance                   | Probable risk            | Browser verification needed |
| Active-workout action clearance           | Probable risk            | Browser verification needed |
| Keyboard overlap                          | Probable risk            | Browser verification needed |
| Sheet height                              | Probable risk            | Browser verification needed |
| Nested scrolling                          | Probable risk            | Browser verification needed |
| Horizontal overflow                       | Probable risk            | Browser verification needed |
| Mobile menus                              | Probable risk            | Browser verification needed |
| Touch targets                             | Probable risk            | Browser verification needed |
| Swipe gestures                            | Probable risk            | Browser verification needed |
| Back gestures                             | Probable risk            | Browser verification needed |
| Browser toolbar effects                   | Probable risk            | Browser verification needed |
| Portrait layouts                          | Probable risk            | Browser verification needed |

## 20. Desktop and wide-screen navigation audit

- Desktop behavior is merely stretched mobile behavior constrained by `max-w-[480px]`.

## 21. Accessibility audit for navigation and overlays

| Observation                                           | Classification | Risk                        |
| :---------------------------------------------------- | :------------- | :-------------------------- |
| Missing semantic navigation landmarks                 | Confirmed gap  | Browser verification needed |
| Active-tab announcements                              | Confirmed gap  | Browser verification needed |
| `aria-current`                                        | Confirmed gap  | Browser verification needed |
| Accessible names                                      | Confirmed gap  | Browser verification needed |
| Tab semantics                                         | Confirmed gap  | Browser verification needed |
| Button semantics                                      | Confirmed gap  | Browser verification needed |
| Missing dialog roles (`BottomSheet`, `ConfirmDialog`) | Confirmed gap  | Browser verification needed |
| Sheet roles                                           | Confirmed gap  | Browser verification needed |
| Headings                                              | Confirmed gap  | Browser verification needed |
| Focus order                                           | Confirmed gap  | Browser verification needed |
| Missing focus trap in overlays                        | Confirmed gap  | Browser verification needed |
| Focus restoration                                     | Confirmed gap  | Browser verification needed |
| Escape dismissal                                      | Confirmed gap  | Browser verification needed |
| Backdrop behavior                                     | Confirmed gap  | Browser verification needed |
| Keyboard-only navigation                              | Confirmed gap  | Browser verification needed |
| Screen-reader status announcements                    | Confirmed gap  | Browser verification needed |
| Route-change announcements                            | Confirmed gap  | Browser verification needed |
| Error announcements                                   | Confirmed gap  | Browser verification needed |
| Live regions                                          | Confirmed gap  | Browser verification needed |
| Reduced motion                                        | Confirmed gap  | Browser verification needed |
| Non-color active states                               | Confirmed gap  | Browser verification needed |

## 22. Navigation-state coverage matrix

| State                   | Current Behavior | Source  | Context Preserved | Context Lost | Test Coverage | Risk |
| :---------------------- | :--------------- | :------ | :---------------- | :----------- | :------------ | :--- |
| Normal Entry            | Loads `/`        | URL     | AppState          | Transient    | None          | Low  |
| Direct URL entry        | Loads `/`        | URL     | AppState          | Transient    | None          | Low  |
| Browser Reload          | Reloads `/`      | Browser | AppState          | Transient    | None          | High |
| Browser Back            | Exits App        | Browser | None              | All          | None          | High |
| In-app Back             | Previous Domain  | App UI  | AppState          | Transient    | None          | High |
| Tab Switch              | Switches Tab     | App UI  | AppState          | Transient    | None          | High |
| Overlay open            | Opens Overlay    | App UI  | AppState          | Transient    | None          | High |
| Overlay close           | Closes Overlay   | App UI  | AppState          | Transient    | None          | High |
| Nested overlay          | N/A              | App UI  | AppState          | Transient    | None          | High |
| Active workout          | N/A              | App UI  | AppState          | Transient    | None          | High |
| Missing selected record | N/A              | App UI  | AppState          | Transient    | None          | High |
| Deleted selected record | N/A              | App UI  | AppState          | Transient    | None          | High |
| Stale selected record   | N/A              | App UI  | AppState          | Transient    | None          | High |
| Unsupported route       | N/A              | App UI  | AppState          | Transient    | None          | High |
| Empty state             | N/A              | App UI  | AppState          | Transient    | None          | High |
| Partial state           | N/A              | App UI  | AppState          | Transient    | None          | High |
| Error state             | N/A              | App UI  | AppState          | Transient    | None          | High |
| Mobile viewport         | N/A              | App UI  | AppState          | Transient    | None          | High |
| Desktop viewport        | N/A              | App UI  | AppState          | Transient    | None          | High |

## 23. Current test-coverage map

- **Test files found for specific navigation transitions/preservation:** 0
- Specific unit tests for transient state retention are absent. End-to-end tests exist but likely focus on happy paths.

## 24. Navigation preservation checklist

- [ ] canonical tabs remain available;
- [ ] tab labels remain correct;
- [ ] Daily View remains the default domain entry;
- [ ] Deep Dive remains reachable;
- [ ] Daily-to-Deep-Dive context remains intact (currently unsupported, future goal);
- [ ] Deep-Dive return behavior remains predictable;
- [ ] selected metric remains preserved where supported;
- [ ] selected range remains preserved where supported;
- [ ] selected muscle and heatmap state remain preserved;
- [ ] active-workout state remains intact;
- [ ] quick actions still reach valid flows;
- [ ] history and details remain accessible;
- [ ] browser Back does not corrupt state (requires implementation of History API);
- [ ] direct reload has an honest fallback;
- [ ] sheets use consistent semantics;
- [ ] dialogs trap and restore focus (currently missing);
- [ ] Escape behavior remains consistent;
- [ ] overlays do not cover critical controls;
- [ ] mobile safe areas remain respected;
- [ ] bottom navigation remains usable;
- [ ] no page-level horizontal overflow is introduced;
- [ ] accessibility is verified;
- [ ] regression tests protect critical transitions.

## 25. Future context-preservation requirements

| Context Type         | Current Support | Current Gap     | Relevant Files | Relevant Tests | Implementation Risk         |
| :------------------- | :-------------- | :-------------- | :------------- | :------------- | :-------------------------- |
| Selected metric      | None            | Fully transient | Domain views   | None           | High (needs store lifting)  |
| Selected chart       | None            | Fully transient | Domain views   | None           | High                        |
| Selected range       | None            | Fully transient | Domain views   | None           | High                        |
| Selected comparison  | None            | Fully transient | Domain views   | None           | High                        |
| Selected date        | None            | Fully transient | Domain views   | None           | High                        |
| Selected muscle      | None            | Fully transient | Domain views   | None           | High                        |
| Heatmap mode         | None            | Fully transient | Domain views   | None           | High                        |
| Heatmap side         | None            | Fully transient | Domain views   | None           | High                        |
| Selected workout     | None            | Fully transient | Domain views   | None           | High                        |
| Selected exercise    | None            | Fully transient | Domain views   | None           | High                        |
| Selected meal        | None            | Fully transient | Domain views   | None           | High                        |
| Selected check-in    | None            | Fully transient | Domain views   | None           | High                        |
| Selected weigh-in    | None            | Fully transient | Domain views   | None           | High                        |
| Selected goal        | None            | Fully transient | Domain views   | None           | High                        |
| Selected photo       | None            | Fully transient | Domain views   | None           | High                        |
| Chart-stack position | None            | Fully transient | Domain views   | None           | High                        |
| Expanded-card state  | None            | Fully transient | Domain views   | None           | High                        |
| Originating view     | None            | Fully transient | Domain views   | None           | High                        |
| Return destination   | None            | Fully transient | Domain views   | None           | High                        |
| Scroll position      | None            | Fully transient | Window         | None           | High (needs router support) |

## 26. Safe future task boundaries

- Navigation files shared across UI task: `src/routes/index.tsx`, `src/components/app/bottom-nav.tsx`.
- Overlay primitives requiring coordination: `src/components/app/sheet.tsx`.
- Persistence files that must remain untouched during Phase A: `src/lib/store.tsx`, `src/lib/persist.ts`.

## 27. Open questions and uncertainties

- **Browser Back Support:** Will redesign mandate History API usage? Files inspected: `src/routes/index.tsx`. Needed: Product clarification.
- **Accessibility Overhaul:** Should overlays adopt standard headless UI libraries to guarantee focus traps? Files inspected: `src/components/app/sheet.tsx`. Needed: Browser verification.

## 28. File index

- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/router.tsx`
- `src/components/app/bottom-nav.tsx`
- `src/components/app/sheet.tsx`
- `src/components/app/views/home.tsx`
- `src/components/app/views/training.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/views/settings.tsx`
- `src/lib/store.tsx`
