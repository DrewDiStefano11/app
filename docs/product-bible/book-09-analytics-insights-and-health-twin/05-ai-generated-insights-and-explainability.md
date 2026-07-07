# 05. AI-Generated Insights and Explainability

## Source-Backed Insights

AI-generated insights in FitCore must be fundamentally grounded in user data. The AI must use source-backed data, not hidden assumptions or generic training philosophy.

### "Why do you know this?" and "Why did you recommend this?"

FitCore must provide absolute transparency. When the AI presents an insight or a recommendation, it must be able to answer two critical questions upon user request (e.g., via a popup or detailed view):
1.  **"Why do you know this?"** - The system must cite the specific source category or data points behind important statements (e.g., "Based on your workout logs from Tuesday and Thursday").
2.  **"Why did you recommend this?"** - The system must explain the logic connecting the data to the action (e.g., "Because your sleep has been under 6 hours for three days, reducing training volume today lowers injury risk").

The AI should explicitly avoid making unsupported claims.

## Data Distinctions in AI Context

To maintain accuracy and trust, the AI must distinguish between different types of data when formulating insights:
*   **Confirmed data:** User-entered logs (e.g., manually entered weight).
*   **Estimated data:** System calculations (e.g., estimated 1RM).
*   **AI-inferred data:** Patterns recognized by the system (e.g., "You seem to prefer evening workouts").
*   **User-corrected data:** Values the user has explicitly changed (e.g., adjusting macro estimates). These carry the highest weight.
*   **Missing data:** The absence of expected logs.
*   **Stale data:** Data that is too old to be reliable.
*   **Conflicting data:** Data points that contradict each other.

The AI should explicitly state when a recommendation is limited by missing or unreliable data (e.g., "I recommend an active recovery day, but this is based on limited recent sleep data").

## Insight Confidence and Data Quality

Insights must include an assessment of confidence or reliability where useful.
*   FitCore must treat missing, stale, estimated, and conflicting data differently than complete, recent, confirmed data.
*   User-corrected values should generally outrank AI-estimated or imported values.
*   FitCore must explain when an insight is weak because the data is incomplete.
*   FitCore must **not present low-confidence insights as certain**.

## Source-to-Insight Matrix (Planning Guide)

No important insight should be generated without knowing what source data supports it. The following planning-level matrix illustrates this mapping:

*   **Workout logs** may support strength, volume, consistency, and progression insights.
*   **Workout notes** may support fatigue, pain, soreness, and exercise-tolerance insights.
*   **Meal logs** may support calorie, macro, protein, and consistency insights.
*   **Weigh-ins** may support bodyweight trend insights.
*   **Check-ins** may support recovery, readiness, sleep, stress, soreness, and fatigue insights.
*   **Health profile data** may provide context but should require stronger privacy controls before use in insights.
*   **Imported data** may support insights only when source, freshness, and permissions are clear.
*   **AI-inferred data** should be labeled and lower confidence unless confirmed by the user.

## Coach vs. Analytics Voice

FitCore utilizes two distinct voices depending on the context:

*   **Analytics Voice:** Used in dashboards, graphs, and raw summaries. It should be factual, source-backed, objective, and concise.
*   **Coaching Voice:** Used by the Jarvis assistant when providing recommendations. It can be more supportive and action-oriented.

The app must avoid mixing uncertain analytics with overly confident coaching. The AI should clearly separate "what the data shows" (analytics) from "what I recommend" (coaching).

**Example of safe separation:**
*   **Data (Analytics Voice):** "Your last three leg sessions had higher soreness notes than usual."
*   **Recommendation (Coaching Voice):** "Consider reducing leg volume slightly or adding an extra recovery day to allow for better adaptation."

## Insight Feedback Loop

Users must have the ability to refine the AI's understanding through an explicit feedback loop:
*   Users should be able to mark insights as:
    *   Helpful
    *   Not helpful
    *   Wrong
    *   Not relevant
*   User feedback must improve future insights.
*   If the user says an insight is wrong, FitCore should help identify the source data causing the error.
*   **Critical Boundary:** Insight feedback should *never* silently overwrite original logs without explicit user approval.

## Empty, New User, and Low-Data States

Analytics must behave responsibly when there is little or no data.
*   **No Fake Insights:** New users should not see fake or generic insights masquerading as personalized analytics.
*   **Clear Guidance:** Empty dashboards should clearly explain what the user needs to log next to generate insights.
*   **Label Limitations:** Low-data insights must be explicitly labeled as limited or preliminary.
*   **Avoid Premature Patterns:** FitCore should avoid pretending to know trends before enough data exists (e.g., claiming a "strength plateau" after only two workouts).
*   **AI Transparency:** The AI should say when it needs more logs before giving a confident pattern (e.g., "I need a few more days of meal logs to understand your typical protein intake").
*   **Onboarding Focus:** Onboarding and empty states should guide users toward their first useful logs:
    *   Workout
    *   Meal
    *   Weigh-in
    *   Check-in
    *   Goals
