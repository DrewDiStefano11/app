# FitCore — Screen Usability and UI Recommendations

**Constraints:** recommend only; do not redesign the information architecture. All suggestions reuse existing components (`Tile`, `Card`, `StatCard`, `PlannedFeatureCard`, `BottomSheet`, `SubTabs`, `SectionHeader`, `EmptyState`) and existing selectors/state. No implementation was performed.

**Target device:** iPhone-first, 390 × 844 CSS px (and 360 × 800 for smaller Android). The shell is `max-w-[480px]` with safe-area padding on the bottom nav and sheets; the phone-width assumptions below are therefore already supported.

---

## 0. Cross-screen principles to apply before screen-specific work

1. **Truthful affordances.** A control that opens a chat, does nothing, or always shows "Needs more data" should not look like a working feature. This affects Fuel's "Photo Log", Settings reminders, Goals "Steps", and Stats "Correlations".
2. **One number, one source.** Nutrition totals, protein progress and bodyweight appear on Home, Fuel, Stats and Goals. Make all of them read the same helper (`calculateMealTotals` + a completeness flag) so a meal edit is reflected identically everywhere.
3. **Every score needs a visible "why" within one tap.** Already excellent on Home (score, readiness, recovery, momentum all open evidence sheets). Extend the same pattern to the Fuel macro ring and Stats volume card instead of prose-only sheets.
4. **Empty states must say what to do next**, not just "—". Recovery's 7-day average, WHOOP strain, and Stats correlations are the main offenders.
5. **Do not add charts without axes/labels.** Existing mini-charts (Home volume preview, Performance volume trend, Stats sparkline) have no x-axis dates and no y-values; on iPhone this reads as decoration rather than data.

---

## 1. Home

**What works:** the strongest screen. Orbit hero with three tappable scores, driver bars, today completion, macro/volume/heatmap cards, goals, recent activity, three quick actions, and a prominent Start Workout. Each score opens a worked explanation with evidence and "what's missing".

**Problems**
- Greeting is always "Good Morning" (cosmetic, but the first thing a user sees at 8 PM).
- The volume card header echoes the persisted graph mode (`Volume · muscle`, `Volume · exercise`, …) while the large number is always 7-day volume (`totalVolumeInRange(view, 7)`); only the mini preview changes with the mode.
- Deep Dive mode (toggled on Home) contains hardcoded "Cross-App Insights" placeholders and two "Planned" cards; this is the first thing a user sees after tapping Deep Dive.
- Demo mode adds a "Demo Data" chip but does not affect other tabs, so the Home numbers can look inflated relative to Train/Fuel/Recover.
- `Momentum` appears twice on a tall phone (orbit + summary card) and the score is also in Stats; duplicated without new information.

**Priority recommendations**
1. **P1** Replace the Deep Dive placeholder grid with a single honest `PlannedFeatureCard` ("Cross-app insights — needs correlated logs") until the analytics exist; remove the fake per-row placeholders. Keep the three real deep-dive links (readiness, momentum, volume).
2. **P1** Fix demo-mode labelling: show "Demo Data (Home preview)" on the chip, or apply `view` across tabs (see BUG-08).
3. **P2** Label the volume card by what it plots (`7-day volume`) and move the `volumeMode` name next to the mini preview it actually changes; keep the mode switch inside the detail sheet if/when the big number follows it.
4. **P2** Time-aware greeting (one line).
5. **P3** Collapse the duplicate momentum summary into an inline "why" line under the orbit score on screens < 700 px tall; keep the full card only in Deep Dive.

**iPhone check:** the 220 px muscle map plus two full-body SVGs inside a two-column card is tight at 360 px width; verify no horizontal clipping and that the card remains tappable (it is one big button today).

---

## 2. Recovery

**What works:** Readiness and Recovery are separated with evidence sheets; manual check-in and sleep logging are validated and require explicit confirmation; muscle fatigue has both a quick tap cycle and a bulk sheet; supplement adherence is derived from logs.

**Problems**
- Header "Recovery" plus subtitle already says the readiness status, then the first card repeats Readiness/Recovery — a third of the first screen is duplicated metadata.
- "Strain Tracking" renders an empty section without WHOOP (BUG-11).
- "7d sleep avg" shows `—h` (BUG-12).
- The Daily view leans on WHOOP-native fields that are absent for non-WHOOP users; no explanation of what will appear once connected beyond a one-line subtitle.
- Body tab heatmap caption says "last three days" while the mode name is "recovery"; the user cannot change the window.
- Deep Dive is dominated by `Planned` cards (temperature, SpO2, body age, HRV correlations) — a user looking for insight finds nine placeholders and no real trend.

**Priority recommendations**
1. **P1** Hide the Strain header when there is no WHOOP data; render a single "Connect WHOOP to see strain" row instead.
2. **P1** Consolidate the Deep Dive Health tab: keep one real block (check-in history + WHOOP health fields), then a single "More recovery metrics" planned card listing the future metrics, instead of one card per unavailable metric.
3. **P2** Add the missing 7-day sleep chart on the Daily view (the Deep Dive already builds `sleep.history`; reuse it in a compact 7-bar row). This is the single highest-value addition to Recovery because the data already exists.
4. **P2** Make the sleep average show `—` with "Log sleep to start" and a tap target that opens `SleepSheet` (recovers an obvious next action).
5. **P3** Explain the heatmap window inline ("last 3 days of logged sets") and allow the existing 7-day mode.

---

## 3. Fuel / Nutrition

**What works:** clear daily macro tile, good meal rows with edit/delete, saved foods/meals, date-scoped history, and a real `MealEditor` with provenance display. The Deep Dive macro tab and trend chart are useful.

**Problems**
- Two visually different meal loggers (Home sheet vs Fuel sheet) with different capabilities; users cannot predict where "saved foods" or "photo" lives.
- "Photo Log" opens Jarvis (BUG-07); "Barcode" is disabled but styled like a card; "Hydration —" is unexplained.
- Macro bars are hidden entirely whenever *any* meal has unreported macros, so one incomplete meal removes all three bars for the day rather than showing partial data with a caveat.
- Deep Dive Quality/Timing/Insights are 100 % placeholders; the macro tab is the only substantive one.
- No per-meal macro breakdown in the daily list beyond a single `P/C/F` line; items exist in the model (`items`) but are not shown.

**Priority recommendations**
1. **P1** Unify on one meal logger. Recommended: keep the Fuel implementation (presets, foods, custom validation) and add Home's AI/photo block to it; Home's quick action opens the same sheet.
2. **P1** Replace the hidden-bars behaviour with per-macro bars plus a compact "2 meals missing macros" note and a tap that filters/highlights those meals. Never present "0 g protein" for unknown data (BUG-03).
3. **P2** Give Hydration either a real quick-add (there is already a `camera`/`barcode` pattern for disabled states) or remove the card until the feature exists; "—" with no explanation is worse than absence.
4. **P2** Show meal items when `meal.items` exists (expandable row) — this makes the AI/manual "items" model visible and helps correction.
5. **P3** Collapse the three placeholder Deep Dive tabs into one "Coming later" section so the tab bar does not promise features that do not exist.

---

## 4. Training

**What works:** strong daily flow (start blank/template/library), resume banner, template editor, history with edit/delete and concurrency protection, cardio logging, PR/strength analytics, and a genuinely good Active Workout surface.

**Problems**
- The screen has both a "Resume workout" button in the hero and a second "Resume active workout" ghost button below (and a third in Deep Dive) when a workout is active — three paths to the same action.
- "Programs & templates" card says "`WORKOUT_TEMPLATES.length` starter templates" (10 in `lib/data.ts`) even when the user has custom templates; the Templates sheet lists both but the count only reflects starters.
- The Deep Dive "Library" tab contains both the exercise library button and the template list, while "Performance" contains the history entry points — the tab names do not match their contents.
- "Last workout" ordering bug (BUG-13) can show the wrong session.
- Cardio is buried inside a bottom sheet and also in a "Cardio & sports" card; there is no chart of weekly cardio minutes despite `cardioGoalMin` existing in the profile.
- No rest-day/next-session guidance even though `activeRoutineSession` already computes the scheduled session for Home; Training does not show it.

**Priority recommendations**
1. **P1** Single primary action when a workout is active: one "Resume" button (remove the duplicate ghost button and the hero duplicate on Daily).
2. **P1** Fix last-workout ordering and show an explicit "Today" badge when the last session is today.
3. **P2** Show the scheduled session / routine day at the top of Daily Training (reuse `activeRoutineSession(state, date)` from Home) so the screen answers "what should I do today?" without opening templates.
4. **P2** Rename the Deep Dive tabs to match content ("History & PRs", "Templates & Library", "Insights") and move history into the first tab.
5. **P3** Add a 7-day cardio minutes bar with the `cardioGoalMin` target; data already exists in `state.cardioEntries`.

---

## 5. Stats / Progress

**What works:** weigh-in entry, weight trend, goal progress, momentum, photos, and a Deep Dive with range chips, volume chart, bodyweight chart, and honest empty states.

**Problems**
- Correlations are permanently "Needs more data" while offering two metric selectors — the most prominent element on the Analytics tab is non-functional (BUG-15).
- The correlation sheet is generic prose; it adds no value over the card.
- Weight trend chart has no dates/axis and no smoothing, yet copy promises a noise-free trend (BUG-18).
- Photos are stored as-is; a single 4 MB upload can break persistence (BUG-04). There is no visible storage usage warning.
- "Top Insight" is a planned placeholder directly under the primary data cards.
- Weigh-in validation accepts negatives (BUG-05), and the Daily weigh-in form clears the field after save while `WeightSection` does not — inconsistent feedback.

**Priority recommendations**
1. **P1** Replace the correlation card with a real paired-series summary using existing analytics utilities, or demote it to a `PlannedFeatureCard` and remove the selectors. Do not keep an interactive dead control.
2. **P1** Weight chart: plot 7-day rolling average as the primary line with raw points as dots; label first/last date. This matches what the copy already claims.
3. **P2** Add a "Storage" indicator in Settings → Data and cap/compress photos (see BUG-04); surface a photo-specific error instead of a generic "could not save".
4. **P2** Unify weigh-in components (Home quick sheet, Progress daily, Progress body tab) into one validated form with consistent clear/keep behaviour.
5. **P3** Replace "Top Insight" placeholder with a link to the existing momentum detail (real data available) or remove it.

---

## 6. Deep Dive (mode-level)

Deep Dive is a **global mode**, not a screen. That creates two usability problems:

1. Toggling it on Home changes Train/Fuel/Recover/Stats for every subsequent visit, and the mode resets on reload. Users will not discover why a tab suddenly shows sub-tabs.
2. The toggle is rendered inside Home, so the "current mode" is invisible from the other four screens (no indicator in the nav).

**Recommendations**
1. **P1** Persist `layoutMode` per device (`usePersistentState("layoutMode", "daily")`) so the choice is predictable across reloads, and respect `personalization.uiComplexity` as the default.
2. **P2** Show a small "Deep Dive" chip in the page header of every screen when the mode is active, so the state is legible and reversible from where the user notices it.
3. **P2** Audit each Deep Dive tab for placeholder density (Recovery and Fuel are the worst); a tab with only planned cards should be merged into its neighbour or marked "Coming later" in the tab label.
4. **P3** Consider per-screen default tabs (e.g. Recovery opens Health) — already implemented locally; keep it.

---

## 7. Navigation and actions

- **P1** Give Settings a persistent entry (nav long-press/menu or a gear in the page header) — currently Home-only (BUG-09).
- **P1** Bottom nav hides entirely during an active workout; the only exit is the in-workout back/discard. That is reasonable, but the "back" button only returns to Training while the timer keeps running — add a one-line explanation in the header ("Session keeps running in Training").
- **P2** The collapsed nav shows "Jarvis" but the expanded nav shows "AI"; use one label.
- **P2** The AI composer's mic is permanently disabled but shown; hide it until voice ships, or replace with a "Voice coming soon" tooltip affordance that does not look broken.

## 8. Accessibility and iPhone specifics

- **P1** `viewport` sets `maximum-scale=1` (`__root.tsx`), disabling pinch-zoom. Remove `maximum-scale` (or set to 5) for WCAG 1.4.4 compliance.
- **P2** Several icon-only buttons use tiny 14–16 px icons with default hit areas (e.g. delete in cardio/weigh-in lists). Ensure ≥ 44 × 44 px hit areas; meal rows already do this well (h-11 w-11).
- **P2** Sliders in Check-In display `/10` but the "Soreness/Fatigue" and "Stress" sliders are visually not inverted although the score treats 10 as bad; add end labels ("none" / "severe") so the direction is unambiguous.
- **P3** Offer `input type="date"` history pickers with a 44 px height on iOS (native control is small); current `Input` is used, verify visually on device.
