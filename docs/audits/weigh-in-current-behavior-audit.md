# Weigh-in Current Behavior Audit

## 1. Purpose
To audit the current weigh-in flow, detailing how bodyweight is logged, stored, and displayed, and identifying missing features.

## 2. Scope
This audit covers the weigh-in input mechanism, recent trend display, data storage, and the lack of editing/deletion options.

## 3. Source files inspected
- `src/components/app/popups/quick-popups.tsx`
- `src/components/app/views/home.tsx`
- `src/lib/daily-decision.ts`

## 4. Current confirmed behavior
- Weigh-ins are logged via a bottom sheet (`WeighInSheet`).
- Users input their weight using a numeric field and can optionally add notes.
- The sheet displays a small inline line graph ("Recent trend") of the last 14 weigh-ins.
- It displays the delta (+/-) compared to the most recent previous weigh-in.
- Saving a weigh-in appends it to `bodyweightEntries`, updates `profile.bodyweightLb`, and updates bodyweight goals.

## 5. Current missing or unclear behavior
- No way to edit or delete a past weigh-in if a mistake is made.
- The trend graph only shows raw data points; it does not calculate a smoothed moving average.

## 6. Data created or updated by this flow
- `bodyweightEntries`: Array of `{ id, weightLb, notes, createdAt }`.
- `profile.bodyweightLb`: Updated to the latest value.
- `goals`: Existing bodyweight goals are updated with the new current value.

## 7. Downstream displays/graphs/summaries affected
- Settings / Hub view (Profile bodyweight reflects the latest value).
- Progress View (graphs).
- Dashboard status checks (`home.tsx`).

## 8. AI/Jarvis interaction points
- Daily Decision engine checks for recent weigh-ins (at least 3) before suggesting calorie target adjustments.
- Jarvis auto-logging settings ("Auto-log exact bodyweight") can bypass manual confirmation for clear text/voice inputs.

## 9. Privacy/safety concerns
- Bodyweight data is sensitive but safely stored locally. No cloud sync implemented currently.

## 10. Demo/test account concerns
- Demo mode generates synthetic bodyweight entries to populate graphs.

## 11. Known risks
- A single erroneous input (e.g., typing 1500 instead of 150) immediately updates the profile bodyweight and bodyweight goals, causing extreme graph spikes and goal progress distortions.

## 12. Recommended future implementation work
- Implement a list view for bodyweight history where entries can be edited or deleted.
- Add a smoothed trendline (e.g., 7-day moving average) to the graph.
- Add validation to prevent absurdly high/low entries.

## 13. Acceptance criteria for future fixes
- Users can delete a weigh-in, and the profile bodyweight correctly reverts to the previous value.
- The trend graph shows both raw points and a smoothed line.

## 14. Do-not-touch boundaries for future PRs
- Do not modify how `goals` are synchronized with the new bodyweight in the `WeighInSheet` save function.

## 15. Final audit table

| Area | Current behavior | Source checked | Gap/risk | Future action |
|---|---|---|---|---|
| Input Flow | Bottom sheet, numeric input, notes | `src/components/app/popups/quick-popups.tsx` | No input validation limits | Add sane max/min validation |
| Graphs | Inline 14-day line chart in sheet | `src/components/app/popups/quick-popups.tsx` | No smoothed moving average | Add trendline logic |
| Edit/Delete | Not possible | `src/components/app/popups/quick-popups.tsx` | Mistakes corrupt profile/goals permanently | Build list view for editing logs |
