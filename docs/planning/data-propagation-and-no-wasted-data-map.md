# FitCore Data Propagation and No-Wasted-Data Map

## 1. No-Wasted-Data Principle

The "no-wasted-data" principle dictates that logged data should never be trapped on a single screen. Every meaningful user log, whether entered manually, inferred by AI, or imported, must be available to relevant dashboards, graphs, AI contexts, summaries, and future insights. The application must avoid presenting duplicate, disconnected, or contradictory metrics. A value logged in one place should inform the entire ecosystem of the app, ensuring a cohesive and intelligent user experience.

## 2. Core Data Categories

The following data categories must be mapped and propagated throughout the application:

*   **Workouts**
*   **Exercises**
*   **Sets**
*   **Workout notes**
*   **Pain notes**
*   **Soreness notes**
*   **Fatigue notes**
*   **Meal logs**
*   **Macro estimates**
*   **Corrected nutrition data**
*   **Weigh-ins**
*   **Check-ins**
*   **Sleep data**
*   **Stress data**
*   **Recovery data**
*   **Injury history**
*   **Health profile data**
*   **AI-inferred data**
*   **User-corrected data**
*   **Deleted/hidden data**
*   **Future imported data**

## 3. Source to Destination Mapping

This table outlines where each data category should appear or influence other parts of the application.

| Data Category | Influences / Appears In |
| :--- | :--- |
| **Workouts** | Training dashboard, Progress dashboard, FitCore Score, AI/Jarvis context, Daily summary, Weekly/monthly insights, Future Health Twin. |
| **Exercises & Sets** | Training dashboard, Progress dashboard, Graph popups, AI/Jarvis context (for progression), Weekly/monthly insights, Future Health Twin. |
| **Workout notes** | AI/Jarvis context, Daily summary, Future provider/export reports. |
| **Pain, Soreness, Fatigue notes** | Body heatmap, Recovery dashboard, AI/Jarvis context (modifying recommendations), Daily summary, FitCore Score (recovery sub-score). |
| **Meal logs & Macro estimates** | Nutrition dashboard, Progress dashboard, FitCore Score, AI/Jarvis context, Daily summary, Weekly/monthly insights, Future Health Twin. |
| **Corrected nutrition data** | Overrides previous meal/macro data across all dashboards, FitCore Score, AI/Jarvis context, and summaries. |
| **Weigh-ins & Check-ins** | Progress dashboard, Graph popups, AI/Jarvis context, FitCore Score, Weekly/monthly insights, Future Health Twin. |
| **Sleep, Stress, Recovery data** | Recovery dashboard, FitCore Score, AI/Jarvis context (adjusting daily load), Daily summary, Weekly/monthly insights, Future Health Twin. |
| **Injury history** | Body heatmap, AI/Jarvis context (strict constraint on recommendations), Future provider/export reports, Future Health Twin. |
| **Health profile data** | Homepage, FitCore Score baseline, AI/Jarvis context, Future Health Twin, Future provider/export reports. |
| **AI-inferred data** | Relevant dashboards (marked with confidence), AI/Jarvis context, Daily summary. |
| **User-corrected data** | Propagates immediately to replace AI or previous data in all relevant dashboards and AI contexts. |
| **Deleted/hidden data** | Removed from all dashboards, graphs, summaries, and excluded from AI/Jarvis context. |
| **Future imported data** | Integrated into relevant dashboards, graphs, AI contexts, and the Future Health Twin. |

## 4. Data Source Labels

To maintain data provenance and trust, all data points should carry one of the following source labels:

*   **user-entered:** Data manually inputted by the user.
*   **AI-estimated:** Data inferred or calculated by the AI (must include a confidence score).
*   **user-corrected:** Data originally estimated by AI but subsequently adjusted by the user.
*   **FitCore-calculated:** Derived metrics computed by the application's deterministic engines.
*   **imported in the future:** Data brought in from external sources or backups.
*   **deleted/hidden:** Data marked for removal or exclusion.
*   **sensitive/permission-restricted:** Data requiring explicit user consent to use (e.g., medical, genetics).

## 5. Correction and Deletion Propagation

*   **Correction Propagation:** User-corrected values should immediately update all dependent graphs, summaries, AI context, and recommendations. The original raw values may be preserved in the database for provenance and learning purposes, but they must not override the corrected user values in the UI or AI context.
*   **Deletion Propagation:** Deleted values should immediately stop influencing dashboards, AI recommendations, and insights.
*   **Hidden Data:** Hidden values must be explicitly excluded from AI context if the user disables that category for privacy reasons.

## 6. Risk Areas

During implementation, the following risk areas must be carefully managed:

*   **Duplicate records:** Risk of duplicate workout records, duplicate meals, or duplicate weigh-ins being created during syncing, importing, or retry logic.
*   **AI miscategorization:** AI logging data into the wrong category (e.g., confusing a stretch with a workout).
*   **Context loss:** Workout notes not reaching recovery/health context, or pain/soreness data not reaching the body heatmap.
*   **Zombie data:** Deleted data still affecting AI recommendations or historical graphs.
*   **View inconsistencies:** Graph values not matching the underlying stored source data.
*   **Stale data:** Stale data being treated as current, especially in the AI/Jarvis context.

## 7. Future Implementation Guidance

The implementation of this map should follow a phased sequence:

1.  **Audit current data flows:** Verify existing state management and identifying gaps.
2.  **Define source labels:** Implement the schema for provenance tracking.
3.  **Stabilize log models:** Ensure core data structures are robust and extensible.
4.  **Implement correction propagation:** Build the logic to prioritize user corrections across the app.
5.  **Implement deletion/hidden-data propagation:** Ensure removed or restricted data is completely purged from views and AI context.
6.  **Connect dashboards and graphs:** Wire UI components to the unified, provenanced data source.
7.  **Connect AI/Jarvis context:** Update the AI prompt generation to accurately reflect the latest, corrected data state.
8.  **Add tests:** Create unit and integration tests to verify data propagation rules.

## 8. Acceptance Criteria for Future Implementation

*   Each major logged item has a clearly defined source label.
*   Each major log updates all relevant screens and dashboards accurately.
*   User corrections immediately update all derived values, graphs, and AI contexts.
*   Deletions completely remove the item's influence from the application.
*   The AI can explain what data it used and point to the source label.
*   Graphs and visualisations perfectly match the underlying source data.
*   No duplicate records are created under any logging or syncing scenario.
