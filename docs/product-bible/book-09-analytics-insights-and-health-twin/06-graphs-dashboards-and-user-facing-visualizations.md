# 06. Graphs, Dashboards, and User-Facing Visualizations

## Dashboard Expectations

FitCore dashboards serve as the primary interface for users to digest their analytics. They must be intuitive, organized, and focused on actionable information. Dashboards are divided into focused areas:
*   **Homepage:** A high-level summary of readiness, daily targets, and top priority insights.
*   **Training:** Deep dives into volume, intensity, consistency, and strength progression.
*   **Nutrition:** Views for macro adherence, calorie trends, and meal consistency.
*   **Recovery:** Aggregation of sleep, soreness, fatigue, and stress check-ins.
*   **Progress:** Long-term views of goal-oriented metrics (e.g., bodyweight trends, overarching strength metrics).
*   **Health Context:** Summaries of symptom tracking, pain logs, and relevant broader health markers.

## Graph Behavior and Persistence

Graphs must provide both high-level overviews and granular details upon request.
*   **Graph Popups:** When a user clicks or taps a graph, a popup or sheet opens containing more detail.
*   **Mode Toggles:** Within the popup, the user can toggle between different graph modes (see below).
*   **Persistence:** The selected graph mode must persist outside the popup. If a user sets a nutrition graph to "weekly" view, it should remain in "weekly" view when they return to the main dashboard.

### Graph Modes

Users should be able to view their data through various lenses:
*   Daily
*   Weekly
*   Monthly
*   Trend (smoothed averages over time)
*   Comparison (e.g., this week vs. last week)
*   By muscle group (for training volume/soreness)
*   By exercise
*   By nutrition target (e.g., protein vs. goal)
*   By recovery marker

## Insight Cards

Insight cards are the primary UI element for delivering specific, actionable observations. Every insight card should include:
1.  **Short title:** A clear, concise summary (e.g., "Protein Target Consistency").
2.  **Plain-language explanation:** What the insight means.
3.  **Source data summary:** A brief nod to the underlying data.
4.  **Confidence/quality note:** Included where useful (e.g., if data is sparse).
5.  **Suggested action:** Included where appropriate.
6.  **Expansion option:** A way to open the card for more detailed analysis or graphs.
7.  **Dismiss option:** A way to clear the card from the dashboard.
8.  **Feedback option:** A way to mark the insight as wrong or not relevant.
9.  **Ask AI option:** A way to seamlessly transition into a chat with Jarvis for more detail on the specific insight.

**Crucial Rule:** Insight cards must avoid fear-based wording. They should frame observations constructively, not punitively.

## Insight Modes (Time Horizons)

Insights should be categorized by the time horizon they address to avoid confusing short-term noise with long-term trends.
*   **Daily Insights:** Focus on immediate actionability: readiness, recovery, workout planning, meals, and check-ins.
*   **Weekly Insights:** Focus on consistency and short-term trends: weekly volume, soreness accumulation, weight trends, and nutrition adherence.
*   **Monthly Insights:** Focus on long-term trajectory: longer-term progress, plateaus, habit formation, bodyweight trends, and overarching goal progress.

FitCore must not interpret short-term noise (e.g., a one-day weight fluctuation) as a long-term trend requiring a major monthly insight adjustment.

## Anti-Gamification and Mental Load Boundaries

Analytics should help users without making them obsess over every number. FitCore must manage the mental load imposed by tracking:
*   **Avoid Fear-Based Language:** Do not use language that implies failure for normal day-to-day variations.
*   **Normalize Fluctuation:** Avoid making normal variations feel like regression.
*   **Prevent Dashboard Overload:** Avoid overloading the homepage with too many alerts or minor insights simultaneously.
*   **Prioritize Safety:** Avoid encouraging unsafe restriction, overtraining, or ignoring pain in pursuit of a "better score."
*   **Supportive Tone:** Always use supportive, practical language.
*   **User Control:** Let users hide or reduce insight detail if they want a simpler, less data-heavy experience.

## Visualization Accessibility and Readability

Graphs and charts are useless if they cannot be easily read and understood by all users.
*   **Plain Language:** Insight summaries must use plain language.
*   **No Unexplained Acronyms:** Define all metrics clearly.
*   **Readable Labels:** Graph axes and data points must have readable labels, even on small screens.
*   **Mobile-First Layouts:** Graphs must be designed for mobile viewports primarily.
*   **Accessible Contrast:** Ensure accessible color contrast ratios for all visualizations.
*   **Non-Color Indicators:** Do not rely on color alone to indicate positive/negative trends (e.g., use arrows or distinct shapes alongside red/green coloring).
*   **Summarize First:** Provide short text summaries before presenting complex detailed charts.
*   **Clear Empty States:** When data is missing, the graph should clearly indicate the lack of data, rather than hiding the graph entirely or presenting misleading "zero" values.
*   **Data Quality Warnings:** Graphs should visibly show source/quality warnings where relevant (e.g., a faded line for estimated data).
*   **Avoid False Precision:** Visualizations should not imply more precision than the data supports (e.g., don't graph estimated calories to the decimal point).
