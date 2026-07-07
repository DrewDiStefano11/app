# Data Propagation Runtime Pass Plan

## 1. Purpose
This document maps how logged data should move through FitCore screens, cards, graphs, summaries, AI context, and insights during the upcoming data propagation runtime pass. It ensures adherence to the 'no-wasted-data' principle, preventing duplicate states or trapped inputs.

## 2. Data entities to preserve
- Workouts
- Active workouts
- Workout exercises
- Workout sets
- Workout notes
- Saved templates
- Meals
- Photo/AI meal estimates
- Nutrition targets
- Hydration
- Supplements
- Sleep entries
- Morning Check-In
- Night Review
- Generic recovery check-ins
- Soreness
- Pain
- Fatigue
- Stress
- Mood
- Bodyweight
- Progress photos
- Goals/phases
- AI messages
- Jarvis logged items
- Jarvis audit/undo entries

## 3. Current known data sources
- User manual input (forms, active workout logger, log meal flow).
- AI/Jarvis (voice logs, photo estimates, contextual suggestions).
- Routine Forms (Morning Check-In, Night Review).
- Imported sync data (simulated/future wearables).

## 4. Screens/cards/graphs that should consume each entity

### Workouts
- **Created:** Training tab.
- **Immediate:** Training daily view, Today summary.
- **Historical:** Training deep dive, Insights graph.
- **Influence:** Training Readiness, Fatigue score.
- **Missing:** Prompt basic template selection.
- **Never Dropped:** Completed summary.
- **Labels:** User-logged vs Jarvis-estimated.

### Active workouts
- **Created:** Active Workout flow.
- **Immediate:** Floating workout summary, active state machine.
- **Historical:** Becomes a Workout upon completion.
- **Influence:** Pauses other major interactions until completed.
- **Missing:** Recover from localStorage if closed.
- **Never Dropped:** Current duration and completed sets.
- **Labels:** System state.

### Workout exercises
- **Created:** Active Workout flow, Training tab templates.
- **Immediate:** Exercise list in active workout.
- **Historical:** Exercise history/PR graphs.
- **Influence:** Volume calculations.
- **Missing:** Fallback to basic exercise.
- **Never Dropped:** Chosen name and order.
- **Labels:** Source library vs custom.

### Workout sets
- **Created:** Active Workout flow.
- **Immediate:** Checked off list in active workout.
- **Historical:** Set progression trends.
- **Influence:** Tonnage calculations.
- **Missing:** Ignore empty sets on save.
- **Never Dropped:** RPE and reps.
- **Labels:** Warmup vs working.

### Workout notes
- **Created:** Active Workout flow, Workout summary.
- **Immediate:** Appended to Workout summary.
- **Historical:** Viewable in workout detail history.
- **Influence:** AI context for next session.
- **Missing:** N/A.
- **Never Dropped:** User text input.
- **Labels:** User-written vs AI-generated summary.

### Saved templates
- **Created:** Training tab.
- **Immediate:** Available in "Start Workout" list.
- **Historical:** Usage frequency tracked.
- **Influence:** Default values for new workouts.
- **Missing:** Provide default system templates.
- **Never Dropped:** Custom templates.
- **Labels:** User vs System.

### Meals
- **Created:** Nutrition tab, Quick log.
- **Immediate:** Nutrition daily view, Today summary.
- **Historical:** Nutrition deep dive, Insights graph.
- **Influence:** Daily Nutrition score.
- **Missing:** Fallback to 0 macros.
- **Never Dropped:** Total calories and macros.
- **Labels:** Source (Manual vs AI).

### Photo/AI meal estimates
- **Created:** AI photo upload flow.
- **Immediate:** Unconfirmed meal proposal card.
- **Historical:** Becomes a regular Meal if confirmed.
- **Influence:** Pending macros (visual only until confirmed).
- **Missing:** Require user confirmation to persist.
- **Never Dropped:** The original photo.
- **Labels:** AI Estimate (requires confidence).

### Nutrition targets
- **Created:** Goal settings.
- **Immediate:** Progress bar max values on Today/Nutrition.
- **Historical:** Target vs Actual graphs.
- **Influence:** Score calculations based on adherence.
- **Missing:** Default to TDEE estimate.
- **Never Dropped:** User manual overrides.
- **Labels:** Calculated vs manual override.

### Hydration
- **Created:** Nutrition tab, Quick log.
- **Immediate:** Water progress bar.
- **Historical:** Hydration consistency trends.
- **Influence:** Minor recovery score modifier.
- **Missing:** Assume 0.
- **Never Dropped:** Logged ounces/ml.
- **Labels:** N/A.

### Supplements
- **Created:** Nutrition tab, Routine forms.
- **Immediate:** Checked off daily list.
- **Historical:** Adherence tracking.
- **Influence:** Context for AI, but minimal score impact.
- **Missing:** N/A.
- **Never Dropped:** Custom stack entries.
- **Labels:** N/A.

### Sleep entries
- **Created:** Morning Check-In.
- **Immediate:** Recovery daily view, Today readiness summary.
- **Historical:** Sleep duration trends.
- **Influence:** Major factor in Readiness score.
- **Missing:** Prompt for input.
- **Never Dropped:** Duration and quality.
- **Labels:** User-reported vs Device-synced.

### Morning Check-In
- **Created:** Today tab (morning).
- **Immediate:** Completes Morning task, updates Today summary.
- **Historical:** Aggregates into Recovery and Insights.
- **Influence:** Sets baseline readiness for the day.
- **Missing:** Show as pending task.
- **Never Dropped:** Selected tags.
- **Labels:** N/A.

### Night Review
- **Created:** Today tab (evening).
- **Immediate:** Completes Night task.
- **Historical:** Aggregates into Insights.
- **Influence:** Closes out daily score calculation.
- **Missing:** Show as pending task.
- **Never Dropped:** Day rating.
- **Labels:** N/A.

### Generic recovery check-ins
- **Created:** Recovery tab.
- **Immediate:** Updates Recovery daily view.
- **Historical:** Recovery trends.
- **Influence:** Ongoing readiness adjustments.
- **Missing:** N/A.
- **Never Dropped:** Metric values.
- **Labels:** N/A.

### Soreness
- **Created:** Routine forms, Recovery tab.
- **Immediate:** Highlighted on Body map.
- **Historical:** Soreness heat map.
- **Influence:** Reduces intensity of targeted exercises.
- **Missing:** Assume baseline.
- **Never Dropped:** Extreme soreness flags.
- **Labels:** User-reported.

### Pain
- **Created:** Routine forms, Recovery tab.
- **Immediate:** Red flags on Body map.
- **Historical:** Injury tracking.
- **Influence:** Explicitly avoids certain exercises/movements.
- **Missing:** Assume none.
- **Never Dropped:** Pain locations and severity.
- **Labels:** User-reported.

### Fatigue
- **Created:** Routine forms.
- **Immediate:** Recovery summary.
- **Historical:** Fatigue vs load graph.
- **Influence:** Modulates total recommended volume.
- **Missing:** Assume baseline.
- **Never Dropped:** Value.
- **Labels:** N/A.

### Stress
- **Created:** Routine forms.
- **Immediate:** Recovery summary.
- **Historical:** Contextual trendline.
- **Influence:** Minor modifier to readiness.
- **Missing:** Assume baseline.
- **Never Dropped:** Value.
- **Labels:** N/A.

### Mood
- **Created:** Routine forms.
- **Immediate:** Today summary context.
- **Historical:** Contextual trendline.
- **Influence:** AI communication tone.
- **Missing:** Assume neutral.
- **Never Dropped:** Value.
- **Labels:** N/A.

### Bodyweight
- **Created:** Hub settings, Weigh-in form.
- **Immediate:** Profile header.
- **Historical:** Weight trend graph.
- **Influence:** TDEE and relative strength metrics.
- **Missing:** Prompt for initial value.
- **Never Dropped:** Logged values.
- **Labels:** Source (manual vs scale).

### Progress photos
- **Created:** Hub settings.
- **Immediate:** Visual timeline.
- **Historical:** Gallery view.
- **Influence:** Motivation metrics.
- **Missing:** Show placeholder silhouette.
- **Never Dropped:** Image blobs/paths.
- **Labels:** Date.

### Goals/phases
- **Created:** Hub settings.
- **Immediate:** Hub headers, Today motivation card.
- **Historical:** Phase transitions marked on graphs.
- **Influence:** Nutrition target calculations (TDEE modifier).
- **Missing:** Default to 'Maintenance'.
- **Never Dropped:** Chosen goal.
- **Labels:** User-defined.

### AI messages
- **Created:** Floating AI Shell.
- **Immediate:** AI Shell chat history.
- **Historical:** Conversation logs.
- **Influence:** Context window for current thread.
- **Missing:** Fallback to welcome message.
- **Never Dropped:** User prompts.
- **Labels:** System vs User vs Assistant.

### Jarvis logged items
- **Created:** AI Shell actions.
- **Immediate:** Target domain (e.g. Nutrition if meal logged).
- **Historical:** standard entity history.
- **Influence:** Varies by entity.
- **Missing:** Wait for confirmation.
- **Never Dropped:** The structured intent.
- **Labels:** Requires review vs Confirmed.

### Jarvis audit/undo entries
- **Created:** AI Shell actions.
- **Immediate:** Undo toast/sheet.
- **Historical:** Hub Data Management (Audit log).
- **Influence:** Allows reversibility of state changes.
- **Missing:** N/A.
- **Never Dropped:** The previous state payload.
- **Labels:** Action type.

## 5. AI/Jarvis context requirements
- Jarvis must have read access to the latest aggregated daily state.
- It must clearly distinguish between confirmed user entries and its own unconfirmed suggestions.
- Required to surface the source of its reasoning ("Based on your reported fatigue...").

## 6. Data integrity risks
- Conflicting local state hooks (`useStore().state` vs `useStore().view`).
- Silent overwrites during demo mode reset.
- AI logging skipping validation constraints (e.g. logging negative weights).

## 7. Runtime implementation phases
1. Inventory current store/data paths.
2. Add missing display links without changing schemas.
3. Add source/confidence display where available.
4. Connect summaries/cards.
5. Connect graphs/trends.
6. Connect AI context.
7. Add regression tests.
8. Only later consider schema or persistence changes if unavoidable.

## 8. Files likely involved later
- `src/lib/store.tsx`
- `src/lib/fitcore-data.ts`
- `src/lib/jarvis/tools.ts`
- Various view components in `src/components/app/views/`
- Dashboard graph components.

## 9. Files to avoid until active PRs settle
- `src/components/app/views/home.tsx`
- `src/routes/index.tsx`
- `src/components/app/bottom-nav.tsx`
- `src/styles.css`
- `src/components/app/views/training.tsx`
- `src/components/app/active-workout.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/progress.tsx`
- `src/components/app/layout-primitives.tsx`
- `src/components/app/popups/quick-popups.tsx`

## 10. Acceptance criteria
- All logged data appears immediately on relevant Daily Views without a hard refresh.
- Routine form completions instantly update FitCore Scores.
- Jarvis actions correctly generate audit entries visible to the user.

## 11. Manual QA checklist for the data propagation pass
- [ ] Log a workout -> Verify Training tab updates.
- [ ] Log a workout -> Verify Today summary updates.
- [ ] Log a meal -> Verify Nutrition macros update.
- [ ] Complete Morning Check-In -> Verify Recovery/Readiness updates.
- [ ] Ask Jarvis to log water -> Verify Hydration updates and audit log entry created.
