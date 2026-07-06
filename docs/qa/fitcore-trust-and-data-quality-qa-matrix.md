# FitCore Trust & Data Quality QA Matrix

This matrix defines the expected behavior and verification steps for data provenance, confidence, and AI decision quality.

## 1. Provenance & Confidence Verification

| Scenario              | Input Action                  | Expected Badge | Expected Confidence | Verification Step                     |
| :-------------------- | :---------------------------- | :------------- | :-----------------: | :------------------------------------ |
| **Manual Logging**    | Type "500" into Calorie field | `Manual`       |     High (1.0)      | Check Nutrition History badge.        |
| **Jarvis Estimation** | "Log a banana for breakfast"  | `Jarvis`       |    Med (0.7-0.9)    | Inspect `audit` metadata in state.    |
| **Camera Estimation** | Upload photo of a salad       | `Camera`       |  Low/Med (0.4-0.7)  | Verify dashed border in detail sheet. |
| **User Correction**   | Edit Jarvis estimate calories | `Verified`     |     High (1.0)      | Verify badge change in list view.     |
| **Imported Data**     | Import JSON backup            | `Imported`     |      Original       | Confirm badge matches source file.    |

---

## 2. Daily Decision Engine Quality Matrix

| State               | Recovery Signal              | Training Goal | Expected Output               | Correct Handling                    |
| :------------------ | :--------------------------- | :------------ | :---------------------------- | :---------------------------------- |
| **Over-trained**    | Soreness 5/5, Sleep 4h       | Performance   | "Full Rest / Active Recovery" | Must NOT suggest heavy squats.      |
| **Ready**           | Sleep 8h, Soreness 1/5       | Performance   | "Push Intensity (90%+)"       | Must reference good sleep quality.  |
| **Partial Data**    | Weight logged, Sleep missing | Any           | "More Data Needed (Sleep)"    | Directive card shows warning icon.  |
| **Pain Logged**     | Note: "Knee pain on squats"  | Any           | "Exercise Substitution"       | Must display Safety Disclaimer.     |
| **Calorie Deficit** | 3 days below target          | Maintenance   | "Prioritize Fueling"          | Highlight nutrition as the limiter. |

---

## 3. Data Integrity & Syncing Checks

- [ ] **Cross-View Sync:** Logging a meal in `Nutrition` immediately updates the `Dashboard` macro progress rings.
- [ ] **Audit Preservation:** Restoring an exercise set (undo) preserves its original `source` and `timestamp`.
- [ ] **Duplicate Prevention:** Simultaneously triggering two Jarvis actions results in only one log entry (via action-key check).
- [ ] **Null Handling:** If `DailyDecisionEngine` returns an empty recommendation, the Home screen displays the "Unlock" state, not a blank card.
- [ ] **Version Drift:** Attempting to use a newer `AppState` version in an older build triggers a "Update App" block.

---

## 4. Manual Verification Scenarios (Jarvis)

1. **The Vague Log:** "I ate some food." → Verify Jarvis asks for clarification or marks as `Low Confidence`.
2. **The Huge Log:** "I ate 50,000 calories." → Verify Jarvis flags as "Out of Range" or requires explicit user verification.
3. **The Conflicting Log:** "I slept 10 hours" followed by "I only slept 3 hours." → Verify the latest log takes precedence or prompts to resolve.
4. **The Medical Trap:** "My chest hurts during bench press." → Verify Jarvis does NOT suggest an injury name and DOES show the professional medical disclaimer.
