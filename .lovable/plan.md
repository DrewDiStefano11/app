## Current sub-tabs

```text
Training:   Home | Start | Templates | Cardio | Goals | History
Nutrition:  Macros | Log | Weight | Goals | History | Tips
Recovery:   Home | Sleep | Readiness | Stats | Goals | History
Progress:   Strength | Photos | PRs | Goals | History | Weight
```

## Redundancy analysis

**Cross-section duplicates**
- **Goals** lives in all 4 sections, and the homepage now has a unified Goals panel + customize popup. Four duplicate Goals tabs are no longer needed.
- **History** lives in all 4 sections. Training history is the only one with real depth (workouts). The others are thin lists that overlap with what each section already shows.
- **Weight** appears in both Nutrition and Progress — same data, two entry points.

**Within sections**
- **Training → Start**: duplicates the big "Start Workout" CTA on Home and on the global home dashboard.
- **Recovery → Stats**: overlaps Readiness + Home; readiness/sleep stats already render on both.
- **Progress → PRs**: PRs are a subset of Strength progress and can render as a section inside Strength.
- **Nutrition → Tips**: static filler with no user data; low value next to data-driven tabs.

## Proposed removals

| Section   | Remove                  | Reason / where it goes                                  |
|-----------|-------------------------|---------------------------------------------------------|
| Training  | Start                   | Use existing "Start Workout" CTA on Home tab            |
| Training  | Goals                   | Use homepage Goals panel                                |
| Nutrition | Goals                   | Use homepage Goals panel                                |
| Nutrition | Tips                    | Low-value static content                                |
| Nutrition | History                 | Recent meals already shown under Log/Macros             |
| Nutrition | Weight                  | Keep single Weight tab under Progress                   |
| Recovery  | Stats                   | Merge key numbers into Home/Readiness                   |
| Recovery  | Goals                   | Use homepage Goals panel                                |
| Recovery  | History                 | Recent check-ins already on Home/Sleep tabs             |
| Progress  | Goals                   | Use homepage Goals panel                                |
| Progress  | PRs                     | Render PRs as a section inside Strength                 |

## Result

```text
Training:   Home | Templates | Cardio | History
Nutrition:  Macros | Log | (Weight stays in Progress)
Recovery:   Home | Sleep | Readiness
Progress:   Strength (incl. PRs) | Photos | Weight | History
```

Tighter set, no duplicate destinations, Goals fully consolidated to the homepage panel.

## Technical notes

- For each removed tab: drop its entry from `TABS`, delete the `{tab === "x" && <XTab />}` line in the view, and delete the tab component + any now-unused imports.
- Default tab stays the first remaining entry (already `home`/`macros`/`strength`).
- Update `Tab` union type in each view file.
- For Progress: move the `PRsTab` body into `StrengthTab` as a bottom section (keep the same data hooks, just render inline).
- For Recovery: pull the 2–3 most useful tiles from `StatsTab` into `HomeTab` before deletion so nothing important is lost.
- `GoalsTab` component in `src/components/app/goals-tab.tsx` is still referenced by all 4 sections — once those references are gone it can be deleted.
- No store/schema changes; goals data still lives in `state.goals` and is consumed by the homepage Goals panel.

## Open question

Want me to apply all of the above, or keep any of these tabs (e.g. Recovery Stats, Nutrition Tips, per-section History)?
