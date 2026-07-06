# "What Changed?" Dashboard Cards Spec

## Purpose

The dashboard should not just show static stats. It should proactively highlight meaningful changes in the user's data, explain why they matter, and provide a clear next action.

## Product Rule Alignment

- **Explain What Changed:** The primary goal of these cards.
- **Help User Decide What to Do Next:** Every card includes a "Next Step."
- **Improve Trust:** Cites specific data points and confidence levels.

## Card Types

1. **Training Change:** "Your average RPE has climbed from 7 to 9 this week. You might be pushing too close to failure too often."
2. **Nutrition Change:** "Protein intake is down 20g/day vs. last week. This might slow your recovery."
3. **Recovery Change:** "Resting heart rate (if available) or Soreness scores are trending up. Readiness is dropping."
4. **Bodyweight Trend Change:** "Your 7-day weight average has plateaued. Time to adjust calories?"
5. **Soreness/Fatigue Change:** "Lower body soreness has been 'High' for 3 days straight."
6. **Performance Change:** "Your 5-rep max on Bench Press increased by 5kg. You're getting stronger!"
7. **Consistency/Streak Change:** "You've logged 5 days in a row—your longest streak this month."
8. **AI Action Recommendation:** "Jarvis suggests shifting your workout to tomorrow based on poor sleep logs."

## Required Data per Card

- **Observation:** What specifically changed?
- **Comparison:** Compared to what (last week, 30-day average, goal)?
- **Impact:** Why does this matter for the user's goal?
- **Data Sources:** Which logs were used?
- **Confidence Level:** How certain is this insight?
- **Action:** One clear button or instruction.

## Confidence/Provenance Behavior

- **Confirmed Data Focus:** Insights should prioritize confirmed logs.
- **Unconfirmed Warnings:** If an insight uses unconfirmed AI data, the card must show a "Draft Insight" state: "Based on estimated meals, your calories are high. Confirm your logs to verify."
- **Source Transparency:** Small badges indicating (Manual), (AI), or (Sensor) data sources.

## UI Behavior

- **Prioritization:** Show the most impactful change first (e.g., Performance gain > Consistency streak).
- **Dismissibility:** Users can swipe cards away if they aren't relevant.
- **Drill-down:** Tapping a card opens the relevant detail view (e.g., Training History or Weight Graph).
- **Conciseness:** 2-3 sentences max per card.

## Jarvis Behavior

- **Voice of the Dashboard:** Jarvis summarizes these cards: "Hey! You're getting stronger on your 'Push' movements, but your sleep is starting to slip. Let's prioritize rest tonight."
- **Learning from Interaction:** If a user dismisses all "Nutrition Change" cards, Jarvis asks if they want to deprioritize nutrition insights.

## Edge Cases

- **No Data:** If no meaningful changes occur, show a "Consistency is Key" card or a "Data Needed" prompt.
- **Conflicting Signals:** e.g., Weight is down but Calories are up. Jarvis should flag this as "Interesting Correlation" and ask for confirmation.

## Future Implementation Checklist

- [ ] Create a `DashboardInsight` data model.
- [ ] Build the "What Changed?" horizontally scrolling card container.
- [ ] Implement change-detection algorithms for Training, Nutrition, and Weight.
- [ ] Design the UI for Confidence/Source badges on cards.
- [ ] Add "Action" button handlers for each card type.
- [ ] Integrate insight summaries into the Jarvis home screen greeting.
