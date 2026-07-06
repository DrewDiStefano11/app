# FitCore Screen-to-Data Flow Map

## 1. Purpose

FitCore is a unified fitness command center. Every logged item—be it a single set, a meal description, or a subjective soreness report—must be treated as **reusable app intelligence**, not just isolated screen data. This document maps how data propagates across the ecosystem to ensure future development maintains a cohesive, "no wasted data" experience where logging once updates everywhere.

---

## 2. Core Data Principle

Every log entry in FitCore should strive to answer these seven questions to ensure maximum utility for both the user and the AI coach:

1.  **What was logged?** (The core metric: reps, weight, calories, hours, etc.)
2.  **Who/What created it?** (Manual input, AI estimation, Camera, or Health Import)
3.  **When it happened?** (Accurate timestamping for trend analysis)
4.  **Confidence level?** (How certain are we about the data? e.g., AI macro estimates)
5.  **Whether the user confirmed it?** (Distinguishing between "suggested" and "verified" data)
6.  **Which app areas it affects?** (Downstream impacts on muscle fatigue, recovery scores, etc.)
7.  **Whether it should affect AI recommendations?** (Should this event change the next workout or meal suggestion?)

---

## 3. Major App Screens

| Screen             | Data it Reads                                           | Data it Writes                       | Summaries Displayed                           | Downstream Affected                | Failure Risks                                            |
| :----------------- | :------------------------------------------------------ | :----------------------------------- | :-------------------------------------------- | :--------------------------------- | :------------------------------------------------------- |
| **Home**           | All scores, Readiness, Macros, Heatmap, Recent Activity | Quick logs (Meal, Weight, Check-in)  | FitCore Score, Streak, Macro Rings, Readiness | All specific sections              | Stale derived values; Dashboard clutter                  |
| **Training**       | Workout History, Templates, PRs, Muscle Balance         | Start Workout, Cardio Log            | 14d Volume, Muscle Progress, PR Cards         | Active Workout, Progress, Recovery | Deleted history not updating volume trends               |
| **Active Workout** | Selected Template, Exercise History (for comparison)    | Sets, Reps, Weight, Modifiers, Notes | Total Volume, Set-by-set comparison           | Training, Progress, Recovery       | Data loss on crash; Unfinished sessions bloating history |
| **Nutrition**      | Meal Entries, Nutrition Targets, Bodyweight             | Meal Entries, Adjusted Targets       | Macro Rings, Daily Progress, 7d History       | Home, Progress, Hub                | Duplicate AI entries; Stale calorie targets              |
| **Recovery**       | Check-ins, Sleep, Fatigue, Heatmap, Notes               | Check-ins, Sleep, Fatigue Updates    | Readiness Score, Sleep Trend, Heatmap         | Home, Training (warnings)          | Note-based signals missed; Stale fatigue map             |
| **Progress**       | Bodyweight, Photos, Goals, All History                  | Bodyweight, Photos, Goal Status      | Weight Sparkline, Photo Timeline, Goal Rings  | Home, Nutrition (goals)            | Scaling issues in charts; Correlation errors             |
| **Jarvis / AI**    | Full App State (Context), Settings                      | Audit Entries, State Patches         | Chat History, Action Confirmation Cards       | All Sections                       | AI overwriting manual logs; Context "hallucinations"     |
| **Settings / Hub** | Profile, Jarvis Settings, All Data                      | Profile, Settings, Data Imports      | Jarvis Activity, Goals Profile                | All Sections                       | Import overwriting good local data; Migration failures   |

---

## 4. Log Type Flow Map

| Log Type              | Source Screen             | Saved Location (`AppState`) | Screens Updated             | Charts/Scores Affected           | AI Context              | Duplicate Risks            | Undo Path                  |
| :-------------------- | :------------------------ | :-------------------------- | :-------------------------- | :------------------------------- | :---------------------- | :------------------------- | :------------------------- |
| **Workout**           | Active Workout / Jarvis   | `workouts`                  | Training, Home, Progress    | Frequency, Volume, FitCore Score | Performance patterns    | Double-tap "Finish"        | Delete from history        |
| **Workout Set**       | Active Workout            | `workouts.exercises.sets`   | Training, Progress          | 1RM Trends, Muscle Fatigue       | Exercise selection      | Ghost sets                 | Edit/Delete in workout     |
| **Meal Entry**        | Nutrition / Jarvis / Home | `mealEntries`               | Nutrition, Home, Progress   | Daily Macros, Nutrition Score    | Macro adherence         | AI + Manual double-log     | Delete from log            |
| **AI Macro Est.**     | Jarvis / Camera           | `mealEntries`               | Nutrition, Home             | Macro Trends                     | Food preferences        | Treating estimate as fact  | Audit "Undo"               |
| **Bodyweight**        | Progress / Home / Jarvis  | `bodyweightEntries`         | Progress, Home, Nutrition   | Weight Trend, Calories/Goal      | TDEE calculations       | Multiple weigh-ins/day     | Delete entry               |
| **Recovery Check-in** | Recovery / Home           | `recoveryCheckIns`          | Recovery, Home              | Readiness Score, Wellness Radar  | Training intensity adj. | Stale daily data           | Delete entry               |
| **Soreness / Pain**   | Recovery / Notes          | `recoverySignals`           | Recovery, Home, Training    | Body Heatmap, Training Warnings  | Injury prevention       | Vague text matching        | Edit notes / Delete signal |
| **Sleep Entry**       | Recovery / Health Sync    | `sleepEntries`              | Recovery, Home              | Sleep Duration/Quality           | Recovery capacity       | Health sync overlaps       | Delete entry               |
| **Cardio Entry**      | Training                  | `cardioEntries`             | Training, Home, Progress    | Cardio volume, Calories          | Fitness level           | Double counting steps      | Delete entry               |
| **Supplement Log**    | Hub / Jarvis              | `supplementLogs`            | Hub                         | Adherence timeline               | Routine consistency     | Missed logs vs double logs | Delete entry               |
| **User Note**         | Various                   | `notes` field               | Recovery (if signals found) | Muscle-specific fatigue          | Subjective context      | Overlapping signals        | Edit text                  |
| **Jarvis Action**     | Jarvis                    | `jarvisAudit`               | Affected entity screens     | All relevant scores              | AI reliability          | Repeated AI commands       | Audit "Undo"               |

---

## 5. Cross-Screen Expectations

- **Logging a Workout**: Should immediately update the **Training** history, **Home** recent activity, **Progress** volume charts, **Recovery** muscle fatigue/readiness, and **Jarvis** context for the next session recommendation.
- **Logging a Meal**: Should update **Nutrition** macro rings, **Home** dashboard bars, **Progress** nutrition trends, and **Jarvis** context for remaining calorie suggestions.
- **Logging Soreness/Pain**: Should update the **Recovery** heatmap, trigger **Training** warnings for affected body parts, update **Home** readiness insights, and inform **Jarvis** to suggest easier exercises.
- **Logging Bodyweight**: Should update **Progress** charts, potentially adjust **Nutrition** calorie goals (if set to auto-adjust), update **Home** metrics, and inform **Jarvis** of progress towards weight goals.

---

## 6. “No Wasted Data” Checklist

Every PR adding or modifying a logging feature should satisfy:

- [ ] **Persistence**: Does the log persist after a hard reload?
- [ ] **Visibility**: Does it appear in "Recent Activity" (if appropriate)?
- [ ] **Downstream**: Does it update all relevant graphs and scores (FitCore Score, Readiness, etc.)?
- [ ] **Intelligence**: Does Jarvis know about this event in its context?
- [ ] **Control**: Can the user edit or delete this specific log?
- [ ] **Integrity**: Are accidental duplicates prevented (e.g., same meal logged twice)?
- [ ] **Provenance**: Is the source (Manual vs AI) and confidence level clear?
- [ ] **Protection**: Is manual data protected from being overwritten by AI suggestions?
- [ ] **Portability**: Does the JSON Export/Import preserve this data accurately?

---

## 7. Risk Areas

- **AI Estimates as Ground Truth**: Treating a "medium confidence" AI meal estimate as a 100% accurate measurement in progress charts.
- **Duplicate Events**: The same workout session appearing twice because it was logged via a template and then "suggested" by AI.
- **Zombie Data**: Deleted or undone items remaining in aggregate summaries or derived scores.
- **Hidden Signals**: Notes mentioning "shoulder pain" not being extracted into the `recoverySignals` map.
- **Disconnected Metrics**: Workout volume increasing but not affecting the "Training Load" or "Readiness" scores.
- **Stale State**: Charts using cached/derived values that don't refresh when the underlying data is edited.

---

## 8. Future Implementation Checklist

### Foundation (Current Focus)

- [ ] Standardized source/confidence metadata for all log types.
- [ ] Cross-screen update validation (ensuring a meal log updates Home without a refresh).
- [ ] Centralized duplicate prevention logic in `src/lib/fitcore-data.ts`.
- [ ] Consistent Undo/Delete behavior across all categories.

### V1 (Visibility)

- [ ] Visible confidence badges on AI-generated logs.
- [ ] "Score Explanation" panels showing which logs influenced the FitCore Score.
- [ ] "What Changed?" insights (e.g., "Your Readiness dropped because of late-night caffeine logs").
- [ ] Jarvis explaining _which_ specific data it used to make a recommendation.

### V2 (Ecosystem)

- [ ] Wearable/Health API imports (Apple Health / Health Connect).
- [ ] Advanced correlation analytics (e.g., Sleep Quality vs. Squat Volume).
- [ ] Adaptive nutrition budgets based on real-time training expenditure.

---

## 9. PR Review Checklist (Data Flow Focus)

Before merging any feature that touches user data, ask:

1.  **Which data types changed?** (Check `src/lib/types.ts` for schema impact).
2.  **Which screens should update?** (Verify Home, Progress, and the specific section).
3.  **Were tests added?** (Specifically for data migration and duplicate prevention).
4.  **Was migration safe?** (Can a user with "V2" data safely upgrade to this PR's "V3"?).
5.  **Manual vs AI Paths**: Does the feature work equally well if logged by hand or via Jarvis?
6.  **Duplicates**: If a user taps "Save" twice quickly, does it create two entries?
7.  **Scope**: Did this PR avoid unrelated UI or styling changes? (Keep data PRs focused).
