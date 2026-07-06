# FitCore Nutrition & Recovery Roadmap

## 1. Nutrition Correction & Learning Loop

### Goal

Turn AI-estimated meal logs into high-accuracy personalized "Saved Foods" through user feedback.

### Flow: AI Estimate → User Correction

1. **AI Generation:** User logs via text/camera; Jarvis creates an estimate with `source: 'camera'` and `confidence: 0.6`.
2. **Review State:** The log appears with a "Review Needed" badge.
3. **User Edit:** User taps the log, adjusts the macros (e.g., Protein 20g → 30g), and hits "Confirm".
4. **Data Upgrade:**
   - `source` becomes `verified`.
   - `confidence` becomes `1.0`.
   - Original metadata is preserved in an `audit` patch.
5. **Saved Food Suggestion:** A prompt appears: "Save this corrected meal to your library for faster logging?".

### Saved Food vs. Saved Meal

- **Saved Food:** A single ingredient or item (e.g., "Protein Shake - 30g").
- **Saved Meal:** A collection of foods logged together (e.g., "Daily Post-Workout Breakfast").
- **Implementation:** Both stored in `AppState.savedItems` but categorized by type.

---

## 2. Recovery Limiter & Readiness Logic

### Defining "The Bottleneck"

The app identifies the specific factor most negatively impacting the Readiness score.

| Limiter       | Signal                           | Explanation Rule                                                       |
| :------------ | :------------------------------- | :--------------------------------------------------------------------- |
| **Fatigue**   | High Training Volume + High RPE  | "Physical recovery is lagging behind your training intensity."         |
| **Sleep**     | Duration < 6h or Quality < 60%   | "Sleep debt is reducing your neurological readiness."                  |
| **Soreness**  | Manual check-in score > 3/5      | "Local muscle soreness suggests prioritizing different muscle groups." |
| **Nutrition** | Calorie or Protein deficit > 20% | "Insufficient fuel is slowing down your recovery rate."                |

### Safety Guardrails (No Diagnosis)

- **Forbidden:** "You have tendonitis", "You are overtrained", "Take Ibuprofen".
- **Allowed:** "Signals suggest high fatigue", "Consider reducing intensity", "Prioritize rest".
- **Trigger:** Any "Pain" note (not just "Soreness") must display a standard disclaimer: _"FitCore insights are not medical advice. Consult a professional for persistent pain."_

---

## 3. Training Readiness Integration

### Readiness-Based Recommendations

1. **Train Normally:** Readiness 80-100%. Follow program as written.
2. **Reduce Intensity:** Readiness 50-79%. Decrease weight by 10% or reduce RPE target.
3. **Recover/Active Rest:** Readiness < 50%. Suggest walking, mobility work, or full rest.

### Acceptance Criteria

- [ ] User can correct any macro/calorie field in any meal log.
- [ ] Corrected entries immediately update the Daily Summary.
- [ ] Recovery view highlights the top 1 contributing factor (Limiter).
- [ ] Readiness score changes color based on the 3-tier recommendation levels.
- [ ] Pain notes are visually flagged and trigger a safety disclaimer.
