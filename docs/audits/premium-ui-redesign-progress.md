# FitCore Premium UI Redesign Progress

## Master redesign objective

Deliver a premium, dark-first FitCore experience across Home, Training, Nutrition, Recovery, and Progress while preserving every existing action, metric, sheet, logging flow, route, honest data state, and accessibility behavior. Phase A is presentation and controlled view state only; Phase B persistence and data-safety integration remains blocked until its dependency is merged.

## Current branch state

- Phase: A — Early UI redesign
- Branch: `codex/fitcore-premium-ui-foundation`
- Current task: Task 2 complete; Task 3 is next
- Task 2 starting SHA: `ea4214b82acc8cec6afa42e96b3aab44b35ae85a`
- Task 2 ending SHA: the Task 2 commit at current `HEAD` (resolve through Git history)
- Task 2 commit message: `feat(ui): redesign home daily view`
- Working tree at task start: contained in-scope, uncommitted Task 2 draft files; no unrelated changes were present
- Restricted Phase A files changed: none

## Task status

| Task                                                  | Status      | Starting SHA                               | Ending SHA                                 | Commit                                           | Validation                                                                                    | Notes                                                                                                   |
| ----------------------------------------------------- | ----------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1 — Premium UI and visualization foundation           | Complete    | `d8d635683c2588a09ab3167a6d129d5899fdf977` | `ea4214b82acc8cec6afa42e96b3aab44b35ae85a` | `feat(ui): add premium visualization foundation` | TypeScript, build, 32 Chromium tests, responsive, keyboard, reduced motion                    | Shared tokens, surfaces, chart stack, comparison modes, focus mode, state components, visualization lab |
| 2 — Home Daily View redesign                          | Complete    | `ea4214b82acc8cec6afa42e96b3aab44b35ae85a` | Task 2 commit at current `HEAD`            | `feat(ui): redesign home daily view`             | TypeScript, changed-file ESLint/Prettier, build, 117-test Chromium matrix, screenshot refresh | Premium action-first Home command center; no Home Deep Dive redesign                                    |
| 3 — Home Deep Dive and universal comparison           | Not Started | —                                          | —                                          | —                                                | —                                                                                             | Next recommended task                                                                                   |
| 4–14 — Remaining Phase A view and consistency tasks   | Not Started | —                                          | —                                          | —                                                | —                                                                                             | Execute sequentially                                                                                    |
| 15 — Data Safety dependency check                     | Not Started | —                                          | —                                          | —                                                | —                                                                                             | Required before Phase B                                                                                 |
| 16–21 — Data Safety integration through release audit | Blocked     | —                                          | —                                          | —                                                | —                                                                                             | Blocked until Data Safety & Persistence is merged and present on the redesign branch                    |

## Completed shared foundations

- Premium domain and semantic tokens
- Premium hero, metric, state, sheet, and expandable surfaces
- Controlled swipeable/pinnable analytics stack with suggestion handling
- Comparison chart modes, dual axes, series controls, exact-date navigation, focus mode, data tables, and save callbacks
- Responsive, keyboard, screen-reader, and reduced-motion foundation

## Completed Daily Views

### Home

- Dominant FitCore Score hero with contributor ranking and detail access
- Visible Readiness, Recovery, and Momentum strip with honest recent-input labels
- State-aware Today's Priority including active-workout resume, assigned/start workout, meal/protein, check-in, weigh-in, and score review paths
- Real-data compact comparison preview and full-screen focus sheet
- Controlled four-card Home analytics stack with pin and suggestion safety
- Preserved interactive anatomy, modes, front/back selection, keyboard muscle selection, heatmap sheet, and muscle detail sheet
- Nutrition target summary, remaining calories, macro focus, and Log Meal flow
- Goals, Momentum, Progress navigation, AI insight, quick actions, Recent Activity, Settings, Jarvis, and Daily/Deep Dive switching
- Honest empty and partial states; readiness history omits unlogged dates rather than synthesizing baseline history

## Completed Deep Dives

- None beyond the shared Task 1 visualization foundation. Home Deep Dive remains Task 3.

## Pending Data Safety integration

Phase B must not begin until the Data Safety & Persistence dependency is merged and the redesign branch contains its transaction, revision, validation, import/export, backup, and recovery contracts.

## Restricted Phase A files

The following were verified untouched in Task 2:

- `src/lib/data-*`
- `src/lib/store.tsx`
- `src/lib/persist.ts`
- `src/lib/types.ts`
- `src/lib/fitcore-data.ts`
- `src/lib/daily-decision.ts`

No substitute persistence, duplicate store, schema change, fake revision behavior, or new hidden localStorage system was added.

## Task 2 files

### Created

- `src/components/app/views/home-daily-premium.tsx`
- `tests/e2e/home-daily-premium-redesign.spec.ts`
- `docs/audits/premium-ui-redesign-progress.md`

### Modified

- `src/components/app/views/home.tsx`
- `src/components/app/premium-visualization.tsx`
- `src/components/app/recent-activity.tsx`
- `src/components/app/popups/score-popup.tsx`
- `src/components/app/popups/readiness-popup.tsx`
- `src/styles.css`

## Feature-preservation map

| Existing item                                     | Previous location                   | Redesigned location                                                             | Preserved behavior                                                                                                  | Test coverage / notes                                   |
| ------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| FitCore Score, label, contributors                | Orbit hero                          | Dominant premium hero                                                           | Same calculation and score sheet; strongest and lowest contributor are explicit                                     | New Home test opens score sheet                         |
| Training, Nutrition, Recovery contributions       | Score driver rows                   | Hero contributor bars                                                           | Same analytics values                                                                                               | Visible in populated and empty captures                 |
| Readiness                                         | Orbit score                         | Three-card support strip                                                        | Same score and sheet; baseline/partial labels reflect recent sleep/check-in availability                            | New sparse/partial tests and existing popup regressions |
| Recovery                                          | Orbit score                         | Three-card support strip                                                        | Same score and recovery-focused sheet                                                                               | Support strip and sheet path preserved                  |
| Momentum                                          | Orbit score and summary             | Support strip, analytics stack, Goals & Momentum                                | Same calculation, explanation, and detail sheet                                                                     | New Home test plus sheet regressions                    |
| Training streak and weekly volume                 | Header chips                        | Header context chips                                                            | Same values; volume chip still opens volume details                                                                 | Existing navigation and Home tests                      |
| Daily completion and celebration                  | Today section                       | Today's Priority status                                                         | Same five completion signals and short celebration state                                                            | Populated and sparse Home states                        |
| Today's action                                    | Start Workout card                  | Today's Priority                                                                | Adds state-aware resume/start/log/check-in/weigh-in choices using existing state only                               | New Home tests; active-workout lifecycle regression     |
| Universal comparison preview                      | Not previously compact on Home      | Real-data Home comparison                                                       | Two series, exact-date inspection, modes, focus sheet, Deep Dive customization path, honest insufficient-data state | New Home tests and focus screenshot                     |
| Volume preview                                    | Home tile                           | Analytics stack                                                                 | Same completed-set volume and volume sheet                                                                          | Stack navigation and sheet path tested                  |
| Nutrition progress and macros                     | Macro tile                          | Nutrition summary and analytics stack                                           | Calories, target, remaining, protein, carbs, fat, details, and Log Meal preserved                                   | New Home test and popup/data propagation regressions    |
| Goals and pinned goal selection                   | Goals tile                          | Goals & Momentum section                                                        | Existing GoalsPanel and customization persistence reused; Progress navigation added                                 | Populated/empty captures                                |
| Body heatmap, modes, front/back, muscle selection | Today heatmap card and detail sheet | Body status section plus existing detail experience                             | Existing anatomy graphics, all four detail modes, keyboard selection, selected state, and muscle sheet preserved    | New Home test and Home heatmap regression               |
| AI insight / Jarvis entry                         | AI strip and shell launcher         | AI strip and unchanged shell launcher                                           | Existing AI event and Jarvis launcher retained                                                                      | Smoke regressions                                       |
| Start/Resume Workout                              | Start card / active training route  | Today's Priority and Quick Actions; active state restores to resumable training | Existing start sheet and training lifecycle preserved                                                               | New Home and active-workout lifecycle tests             |
| Log Meal, Check In, Weigh In                      | Quick actions                       | Two-column Quick Actions plus priority actions                                  | Existing sheets and save flows preserved                                                                            | Popup, scroll-lock, data-propagation, and Home tests    |
| Recent Activity                                   | Route-level Home footer             | Premium grouped timeline                                                        | Existing real activity source retained; empty copy added; no fabricated entries                                     | New Home and data-propagation tests                     |
| Settings and Daily/Deep Dive switching            | Home header and toggle              | Same header and toggle with refreshed context                                   | Existing routes and callbacks preserved                                                                             | Navigation, settings, keyboard, and Home tests          |
| Home sheets                                       | Route-level sheet instances         | Same instances with premium framing                                             | Score, readiness, recovery, momentum, volume, macros, heatmap, muscle, start, and quick-log sheets preserved        | Sheet/popup/heatmap test matrix                         |
| Empty, partial, and fallback states               | Mixed local states                  | Shared Task 1 quality states throughout Home                                    | No fake graph lines; missing readiness history is omitted and actionable                                            | New sparse/partial tests and screenshots                |

## Validation

- TypeScript: pass (`tsc --noEmit`)
- Changed-file Prettier: pass
- Changed-file ESLint: pass with one pre-existing non-blocking `react-refresh/only-export-components` warning in `premium-visualization.tsx`
- Production build: pass
- New Home suite: 12/12 across desktop Chromium, mobile 360×800, and mobile 390×844
- Existing regression suite: 105/105 across all three Chromium projects
- Screenshot refresh: 4/4 desktop Home scenarios
- Combined unique validation matrix: 117 passing Chromium tests
- Repository-wide lint: not used as a task gate because the documented baseline contains pre-existing formatting/CRLF debt in untouched files
- Build baseline warnings: existing TanStack `inputValidator()` deprecations and bundle-size warnings remain

## Visual evidence

Root: `test-results/home-daily-premium-redesig-*/`

- `home-daily-320.png`
- `home-daily-360.png`
- `home-daily-390.png`
- `home-daily-430.png`
- `home-daily-480.png`
- `home-daily-desktop.png`
- `home-empty-state.png`
- `home-partial-reduced-motion.png`
- `home-analytics-non-first-chart.png`
- `home-comparison-focus.png`
- `home-score-sheet.png`
- `home-muscle-detail-sheet.png`
- `home-daily-390-body-nutrition.png`
- `home-daily-390-actions.png`

Visual review confirmed clear hierarchy, readable controls, stable horizontal chart snapping, visible bottom navigation, no page-level horizontal overflow, safe sheet framing, and usable 320–480 px layouts.

## Accessibility and motion

- Semantic Home headings and labeled regions
- Non-color quality/status labels
- Support scores remain tappable and understandable at 320 px
- Previous/next chart controls and keyboard Left/Right navigation
- Keyboard-operable anatomy regions and accessible front/back pressed states
- Accessible sheet close labels and focus-safe popup regression coverage
- Reduced-motion chart and Home interaction checks pass; readiness ring transition is disabled under reduced motion

## Known repository baseline issues

- Repository-wide lint has pre-existing CRLF/Prettier failures in unchanged files.
- `premium-visualization.tsx` retains the Task 1 Fast Refresh warning because it exports shared non-component helpers alongside components.
- Production build emits existing TanStack server-function deprecation and large-chunk warnings.

## Deferred future work

- Full Home Deep Dive and universal comparison builder
- Saved chart persistence, chart library, and persistent stack position
- Remaining Daily Views and Deep Dives
- Cross-view responsive/accessibility consistency pass
- Data Safety, revision, backup, import/export, validation, recovery, conflict, and Settings integration after the Phase B dependency merges

## Known limitations

- Home chart pin, suggestion dismissal, focus range, and stack selection are controlled view state only during Phase A.
- The compact comparison intentionally supports one valid two-series preset; the full metric builder is Task 3.
- Existing readiness formulas retain their baseline fallback, but the UI labels it honestly and no longer renders missing dates as measured trend history.
- Screenshot evidence is generated under ignored Playwright `test-results` paths and can be refreshed by the Home E2E spec.

## Next recommended task

Task 3 — redesign Home Deep Dive and implement the full universal comparison experience using the Task 1 visualization foundation and Task 2 navigation context.
