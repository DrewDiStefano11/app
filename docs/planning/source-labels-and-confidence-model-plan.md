# Source Labels and Confidence Model Plan

## Purpose
This document establishes the architecture for data provenance and confidence tracking within FitCore. Every data point must track its source and the confidence of its accuracy, determining how it influences AI coaching, dashboard graphs, and the FitCore Score. Note: This is a planning document only; these systems are not yet implemented.

## Source Label Types
Every log must be tagged with one of the following provenance sources:
- Manual (User-entered directly)
- AI estimate (Text/voice derived)
- Camera/photo estimate (Vision derived)
- Wearable import (Sensor data)
- User corrected (AI estimate modified by user)
- Derived calculation (System computed, e.g., macros from food)
- Demo seed (Test data)
- System default (Baseline settings)
- Unknown/legacy (Unclassified historical data)

## Confidence Label Types
Every log must carry a confidence status affecting its weight in calculations:
- Confirmed (High confidence, verified)
- User corrected (High confidence, upgraded via review)
- Estimated (Medium confidence, AI generated without explicit confirmation)
- Low confidence (e.g., blurry photo, vague text description)
- Missing source (Incomplete data)
- Conflicting (Data contradicts other recent logs)
- Demo-only (Zero weight in real calculations)

## Manual Entry Behavior
- **Source:** Manual
- **Confidence:** Confirmed
- **Impact:** Full weight in all calculations and dashboards. No softening.

## AI-Estimated Entry Behavior
- **Source:** AI estimate or Camera/photo estimate
- **Confidence:** Estimated or Low confidence (based on AI certainty 0.0-1.0)
- **Impact:** If unconfirmed, should soften Daily Decision Engine recommendations to prevent false surpluses or deficits. Requires explicit user review to upgrade.

## Wearable/Imported Data Behavior
- **Source:** Wearable import
- **Confidence:** Confirmed (usually) or Conflicting (if it drastically differs from manual logs)
- **Impact:** Generally high trust, but should trigger conflict resolution if wildly out of bounds.

## User-Corrected Data Behavior
- **Source:** User corrected
- **Confidence:** User corrected (High)
- **Impact:** Preserves original estimate metadata for AI training provenance while upgrading the log's status. It feeds into the "Saved Foods" or learning loops.

## Conflicting-Source Behavior
- **Source:** Varies
- **Confidence:** Conflicting
- **Impact:** The system must prompt the user to resolve the conflict (e.g., Apple Health says 500 kcal burned, user manually logs 1000 kcal). Until resolved, uses the most conservative estimate.

## Dashboard Display Rules
- Unconfirmed or low-confidence data should be visually distinct (e.g., dashed lines, warning icons).
- The "no-wasted-data" principle applies: all logged data appears, but its confidence limits its visual assertiveness.

## Graph Display Rules
- Graphs should differentiate between confirmed trends (solid lines) and estimated trends (dotted lines or shaded error margins).

## AI/Jarvis Explanation Rules
- AI must explicitly cite the source and confidence of the data it uses to make recommendations.
- Example: "Based on your *photo estimate* from lunch (which I'm *low confidence* about), you might need more protein."

## Failure Examples
- Treating an AI-estimated, low-confidence meal exactly the same as a manually weighed meal, causing the engine to strictly cut calories.
- Overwriting user-corrected data with a new AI estimate without prompting.
- Displaying demo seed data on real user graphs.

## Future Implementation Checklist
- [ ] Add source and confidence fields to all relevant database schemas.
- [ ] Update data ingestion pipelines to correctly tag sources.
- [ ] Implement AI confidence scoring (0.0-1.0) mapping to labels.
- [ ] Build UI indicators for unconfirmed/low-confidence data.
- [ ] Implement the correction loop to upgrade data confidence.
- [ ] Adjust Daily Decision Engine logic to soften based on confidence.

## Final Source/Confidence Matrix

| Source | Default Confidence | Engine Weight | UI Treatment |
|---|---|---|---|
| Manual | Confirmed | 100% | Standard |
| User corrected | User corrected | 100% | Standard, updates learning |
| Wearable import | Confirmed | 100% | Standard (unless conflicting) |
| AI estimate | Estimated | Softened | Requires Review flag |
| Camera/photo | Low confidence | Highly Softened | Warning/Review flag |
| Derived calc | Confirmed | 100% | Standard |
| Demo seed | Demo-only | 0% | Hidden/Isolated |
