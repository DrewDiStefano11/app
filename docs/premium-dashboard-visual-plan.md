# Premium Dashboard Visual Plan

## Product Commitment

Full dashboard customization is a committed FitCore product direction. It is intentionally **not fully implemented in this PR** to keep the premium UI work visual-only and conflict-safe.

The next major implementation PR after AI PR #2 merges should add the runtime customization system. This PR provides the visual system, widget vocabulary, typed presentation contract, and recommended presets.

## FitCore Today

Recommended standard preset:

1. Date, greeting, and daily context.
2. FitCore Score with status, trend, ring, and “Why this score?” detail.
3. Daily Plan with one recommended next action.
4. Compact Training, Nutrition, Recovery, Body, and Longevity pillar summaries.
5. Two-up visual row for readiness and nutrition.
6. Training volume preview and muscle-readiness map.
7. Daily timeline and recent activity.
8. Native AI insight card.
9. Quick Log actions.

Home stays scannable. Detailed axes, filters, history, explanations, and comparisons open in analytic sheets.

## Screen Presets

- Training: active workout, weekly volume, muscle distribution, previous performance, PR trend, and history.
- Nutrition: calories, macro ring, protein, hydration, meal quality, and supplements.
- Recovery: readiness, sleep, fatigue, soreness/pain, recovery actions, and muscle readiness.
- Progress: FitCore trend, bodyweight, strength/PRs, goals, and consistency calendar.
- Body: front/back heatmap, balance, weight, measurements, and goals.
- Settings/Personalization: preset choice, density, screen-by-screen editing, reset, and accessibility preferences.

Each preset must feel complete without customization.

## Widget Registry

The isolated contract in `src/components/app/dashboard-layout.ts` defines:

- stable widget IDs
- category and user-facing metadata
- supported sizes
- empty-state copy
- default size
- screen presets and placements

It is deliberately not imported by runtime screens in this PR.

Future widgets register once, provide supported sizes and a polished empty state, then become eligible for the appropriate picker categories:

- Training
- Nutrition
- Recovery
- Body
- AI
- General

Widget renderers should receive existing view data through explicit props or selectors. They must not recalculate scores, mutate logged data, or own persistence.

## Future Edit Layout UX

The follow-up implementation should provide:

- Edit Layout entry point on every supported screen
- clear edit-mode chrome
- drag handle and accessible move up/down controls
- hide/remove action
- small, medium, large, and full-width sizing where supported
- grouped Add Widget sheet with preview, description, and availability
- compact, standard, and detailed presets
- Save, Cancel, and Reset to Default
- ability to add removed widgets back
- polished empty states for widgets without data

Drag-and-drop must have keyboard and screen-reader alternatives. Layout changes should animate gently and honor reduced motion.

## Persistence Boundary

Layout preferences must remain separate from fitness data.

Recommended future storage:

- a dedicated versioned presentation key, such as `fitcore.dashboard-layout.v1`
- per-screen preset, density, placement, visibility, size, and order only
- no logged workouts, meals, recovery entries, analytics output, AI messages, or score values
- validation against the registry before use
- unknown widgets ignored safely
- reset path when a stored layout is invalid
- migrations contained in a layout-specific adapter

The main app store and existing localStorage schema should not change merely to support layout preferences.

## Deferred Recommendations

The following improvements require rendering, state, persistence, or data-flow work and therefore wait for the post-AI PR:

- runtime widget registration and dynamic screen composition
- drag-and-drop and resizing
- saved user layouts and preset switching
- a functional widget picker
- new pillar scores or Longevity calculations
- new chart data, aggregations, timelines, or hydration tracking
- route-level Body or Personalization screens
- changing Jarvis/AI behavior or voice UI
- rearranging current screen state flow

These are documented rather than forced into this visual-only PR.

