# Post-Merge Regression Checklist

Use this reusable checklist for validating merged runtime work.

## Global shell checklist

- [ ] bottom tabs exactly Home, Training, Fuel/Nutrition, Recovery, Progress
- [ ] Settings absent from bottom navigation
- [ ] Settings opens from Home
- [ ] Settings title exactly Settings
- [ ] Daily and Deep Dive mode switch works
- [ ] exact mode values remain `daily` and `deepDive`
- [ ] selected tab is preserved appropriately
- [ ] no duplicate screen rendering
- [ ] no invisible overlay blocks bottom navigation

## Home checklist

- [ ] no subtabs in Daily View
- [ ] no subtabs in Deep Dive
- [ ] Settings control works
- [ ] Daily and Deep Dive presentations are distinct
- [ ] mobile and desktop layouts remain usable

## Training checklist

- [ ] Daily View has no subtabs
- [ ] Deep Dive tabs exactly Performance, Strength, Library, Insights
- [ ] Programs & templates opens correct sheet
- [ ] Cardio & sports opens correct sheet
- [ ] sheets close cleanly
- [ ] active workout remains intact
- [ ] navigation works after closing sheets

## Fuel checklist

- [ ] Daily View has no subtabs
- [ ] Deep Dive tabs exactly Macros, Quality, Timing, Insights
- [ ] Photo Meal absent from main surface
- [ ] custom meal uses latest controlled values
- [ ] valid save creates one real meal
- [ ] meals count updates
- [ ] macro totals update
- [ ] sheet closes after success
- [ ] validation failure leaves sheet open
- [ ] navigation works immediately afterward

## Recovery checklist

- [ ] Daily View has no subtabs
- [ ] Deep Dive tabs exactly Health, Sleep, Body, Insights
- [ ] valid check-in persists
- [ ] valid sleep entry persists
- [ ] body status persists
- [ ] invalid input does not save
- [ ] sheets close cleanly
- [ ] saved state appears across modes

## Progress checklist

- [ ] Daily View has no subtabs
- [ ] Deep Dive tabs exactly Analytics, Body, Goals, Insights
- [ ] invalid weigh-ins do not save
- [ ] valid weigh-in saves exactly once
- [ ] profile bodyweight updates
- [ ] bodyweight goals update
- [ ] unrelated goals remain unchanged
- [ ] one entry does not claim a trend
- [ ] data remains across modes

## Settings checklist

- [ ] title exactly Settings
- [ ] sections exactly Profile, Preferences, Data, Integrations
- [ ] Settings not in bottom navigation
- [ ] profile edits persist
- [ ] invalid import does not alter state
- [ ] valid import uses canonical path
- [ ] export produces valid JSON
- [ ] reset requires confirmation
- [ ] cancel preserves state
- [ ] confirm resets exactly once
- [ ] no dialog overlay remains

## Analytics checklist

- [ ] no fake data
- [ ] no fake correlation
- [ ] no fake insight
- [ ] stable metric IDs
- [ ] correct units
- [ ] status present
- [ ] confidence present when required
- [ ] sample size present
- [ ] date range present
- [ ] reason present
- [ ] source metadata present
- [ ] neutral correlation language
- [ ] causation warning present
- [ ] missing data remains null/unavailable rather than fabricated zero
- [ ] compatibility exports preserved

## Responsive checklist

- [ ] desktop
- [ ] 390x844
- [ ] 360x800
- [ ] bottom navigation
- [ ] long sheet content
- [ ] keyboard/input layout
- [ ] no horizontal overflow
- [ ] close/save controls reachable
- [ ] content not hidden under bottom navigation

## Data-propagation checklist

- [ ] action saves to canonical state
- [ ] visible originating screen updates
- [ ] related summary cards update
- [ ] mode switching preserves data
- [ ] tab switching preserves data
- [ ] navigating away and returning preserves data
- [ ] no duplicate record
- [ ] no local-only shadow state
- [ ] no stale controlled value is saved
