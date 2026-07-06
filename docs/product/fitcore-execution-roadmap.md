# FitCore Product Execution Roadmap

## 1. App Goal

FitCore should be a unified fitness, nutrition, recovery, and AI coach that turns logged data into clear daily decisions.

## 2. Product Rule

Every feature must do at least one of these:

- Reduce logging friction
- Improve trust in the data
- Explain what changed
- Help the user decide what to do next
- Connect training, nutrition, recovery, and progress together

If a feature does not do one of those, it should be delayed.

## 3. Current App State

| Feature                   | Already Implemented | Needs Polish | Not Built Yet |
| :------------------------ | :-----------------: | :----------: | :-----------: |
| AI Assistant / Jarvis     |          X          |              |               |
| Workout Logging           |          X          |              |               |
| Nutrition Tracking        |          X          |              |               |
| Recovery Metrics          |          X          |              |               |
| Progress Dashboard        |          X          |              |               |
| FitCore Score / Readiness |                     |      X       |               |
| Body Heatmap              |          X          |              |               |
| PWA Foundation            |          X          |              |               |
| Data Integrity / Safety   |                     |      X       |               |
| Popup / Sheet Behavior    |          X          |              |               |
| Accessibility / Usability |                     |      X       |               |

## 4. Market Gap

- **Strong/Hevy:** Fast gym logging
- **MacroFactor/Cronometer/MyFitnessPal:** Nutrition logging
- **WHOOP/Oura/Garmin/Athlytic:** Recovery and readiness
- **Strava/Apple Fitness:** Social, motivation, and ecosystem
- **Trainerize/Everfit:** Coach-client accountability

**FitCore’s Opportunity:**
The gap is not more tracking. The gap is a trusted daily decision engine that connects training, nutrition, recovery, progress, and AI.

## 5. Foundation Priorities

- **Logging Reliability:** Ensure every entry is saved correctly and atomic updates are handled to prevent data loss.
- **Cross-screen Data Syncing:** Real-time updates across different parts of the UI when data changes (e.g., logging a meal immediately updates the Home screen macros).
- **Data Provenance / Source Tracking:** Knowing exactly where each data point came from (Manual, AI, Camera, or Sensor).
- **Confidence Labels:** Visually indicating how certain the AI is about estimated data (e.g., photo-based calorie estimates).
- **Duplicate Detection:** Logic to prevent double-logging from multiple sources or overlapping AI suggestions.
- **AI Confirmation Flow:** Requiring user review for AI-generated logs before they affect core scores and trends.
- **Import/Export & Migration Safety:** Robust handling of data versioning to ensure users never lose history during app updates.
- **No Wasted Logged Data:** Every piece of data collected must eventually contribute to an insight, score, or decision.

## 6. V1 Priorities

- **Explainable FitCore/Jarvis Recommendations:** Moving from "Do this" to "Do this because your recovery is low and your volume is down."
- **Adaptive Workout Builder:** Adjusting the day's training session in real-time based on current readiness and reported soreness.
- **Food Logging Confidence Labels:** Showing the "Margin of Error" for calorie and macro estimates derived from AI vision.
- **Pain/Soreness-Aware Substitutions:** Automatically suggesting exercise swaps that avoid aggravating currently sore or injured areas.
- **“What Changed?” Insights:** Proactively highlighting significant deviations from recent trends in performance or recovery.
- **Daily Command Center Improvements:** Making the Home screen more actionable with prioritized "Next Steps" for the day.

## 7. V2 Priorities

- **Sleep Debt Planner:** Helping users manage recovery over a multi-day window rather than just looking at last night.
- **Adaptive Nutrition Budget:** Dynamically adjusting daily calorie/macro targets based on actual activity levels and progress.
- **Weekly Summaries:** Comprehensive reviews of adherence, performance trends, and "Big Picture" progress.
- **Experiment Coach:** Guided A/B testing of habits (e.g., "Does caffeine after 2 PM affect my specific sleep quality?").
- **Trend/Correlation Insights:** Visualizing relationships (e.g., training volume vs. sleep quality) without claiming direct causation.
- **Wearable Integration Planning:** Deep technical mapping for Apple Health, Health Connect, and direct wearable syncing.

## 8. Delay / Do Not Build Yet

- **Full Social Feed:** High maintenance cost and distracts from the core "Personal AI Coach" utility.
- **Public Challenges:** Can lead to unsafe ego-driven training; focus on individualized progress first.
- **Coach-Client Marketplace:** Avoid pivoting to a B2B model until the consumer "Decision Engine" is perfected.
- **Auto-Rep Detection:** Technology is currently too brittle and often increases friction rather than reducing it.
- **Deep Apple Watch App:** High development overhead; prioritize the mobile-first "Command Center" experience.
- **Giant Recipe Library:** Content-heavy maintenance; prioritize logging existing foods and user-created meals.
- **Complex Causal Analysis:** Extremely difficult to prove scientifically; stick to correlations to maintain trust.

## 9. Trust Layer Requirements

| Data                 | Source       | Confidence | Confirmed? | Used In          | Where It Appears |
| :------------------- | :----------- | :--------- | :--------: | :--------------- | :--------------- |
| Knee Soreness        | Manual       | High       |    Yes     | Readiness Score  | Recovery View    |
| Calories from Camera | Jarvis       | Medium     |     No     | Nutrition Budget | Daily Summary    |
| Workout Volume       | Manual       | High       |    Yes     | Progress Trend   | Training View    |
| Bodyweight           | Manual/Scale | High       |    Yes     | Macro Targets    | Progress View    |
| Sleep Duration       | Jarvis/Whoop | Medium     |     No     | Recovery Score   | Recovery View    |

## 10. AI Guardrails

**AI should NEVER:**

- Diagnose injuries or medical conditions.
- Claim exact calorie accuracy from photo estimates.
- Overwrite manual user data without explicit confirmation.
- Make confident recommendations from missing or low-quality data.
- Treat one bad sleep night as a definitive long-term trend.
- Change a user’s program without explaining the data behind the change.

**AI should ALWAYS:**

- State exactly what data points were used to make a recommendation.
- Clearly indicate when confidence in a calculation is low.
- Create visible, editable log entries whenever it records data.
- Instantly update connected scores and graphs after a log is confirmed.
- Explain "What changed and why" when suggesting a pivot.

## 11. How This Should Feel to the User

The user opens the app and immediately sees:

1.  **What they should train today** (The optimal session).
2.  **How hard they should train** (Intensity based on readiness).
3.  **What changed** since yesterday or last week (The "Why").
4.  **What they should eat today** (Remaining budget adjusted for activity).
5.  **What is limiting recovery** (The specific bottleneck).
6.  **One clear action** to improve tomorrow (The "Next Step").

## 12. Success Metrics

- **Logging Completion Rate:** Percentage of started logs that are finished.
- **AI Correction Rate:** Number of times a user has to manually correct an AI log.
- **User Trust Rating:** Periodic in-app surveys on confidence in AI recommendations.
- **Adherence (Workout/Nutrition):** Consistency in meeting planned targets.
- **Recovery Engagement:** Frequency of users checking their readiness before training.
- **Retention (7-day / 30-day):** Core measures of app utility and habit formation.
- **Explainability Score:** Percentage of AI recommendations that include linked data sources.

## 13. Suggested Next Build Batches

### Batch 1: Trust & Integrity (Foundation)

- **Codex:** Implement atomic state updates and validation middleware in `src/lib/store.tsx`.
- **Jules:** Add `source` and `confidence` metadata to all `MealEntry` and `Workout` types in `src/lib/types.ts`.
- **Jules:** Implement the AI confirmation UI component for suggested logs.
- **Jules:** Audit and fix PWA manifest and meta tags in `src/routes/__root.tsx`.

### Batch 2: Explainable AI (V1)

- **Codex:** Create the Jarvis recommendation engine logic that references specific data points.
- **Jules:** Update the `PageHeader` to show "Why?" tooltips for AI-generated scores.
- **Jules:** Build the "What Changed?" insight tile for the Home screen.
- **Jules:** Add confidence labels to the nutrition summary view.

### Batch 3: Adaptive Training (V1)

- **Codex:** Build the pain/soreness exercise substitution algorithm.
- **Jules:** Update `active-workout.tsx` to handle dynamic exercise swaps.
- **Jules:** Implement the soreness input slider in the recovery check-in.
- **Jules:** Add volume-by-muscle-group trend lines to the progress view.

### Batch 4: Advanced Recovery (V2)

- **Codex:** Logic for multi-day sleep debt calculation.
- **Jules:** Design and build the sleep debt planner UI.
- **Jules:** Add "Trend vs Correlation" disclaimers to all analytics charts.
- **Jules:** Implement weekly summary email/notification trigger logic.
