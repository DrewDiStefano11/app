# Daily Decision Engine UI Integration Spec

## Purpose

Define the UI patterns for displaying AI-driven recommendations and insights from the Daily Decision Engine (DDE).

## Product-Rule Alignment

- **Connect fitness domains:** Show how nutrition and recovery affect training recommendations.
- **Improve data trust:** Explain _why_ a recommendation is being made (e.g., "Based on 4 hours of sleep...").
- **Explain changes:** Use "What Changed" cards to highlight DDE-driven adjustments.

## User Problem Solved

Users often don't know how to adjust their plan based on recovery signals or missed meals. The DDE UI provides clear, actionable next steps.

## UI Patterns

### 1. Readiness Insight Tile (Home)

- **Visuals:** A primary tile on the Home dashboard showing the Readiness Score.
- **Interactivity:** Tapping opens a detail sheet explaining the factors (Sleep, Stress, Soreness, Fatigue).

### 2. Training Adjustment Callouts (Training)

- **Visuals:** Inline alerts or modified target weights/reps in the active workout view.
- **Rule:** Recommendations to adjust weight/reps must cite the source (e.g., "Increased weight based on last session's high performance").

### 3. "What Changed" Dashboard Cards

- **Rule:** Every card must answer:
  1. What changed?
  2. Why it matters?
  3. What data was used (with confidence level)?
  4. One clear next action.

## Implementation Zones

- **Allowed:** `src/components/app/views/`, `src/components/app/dashboard/`, `src/components/ui/tile.tsx`.
- **Forbidden:** `src/lib/daily-decision.ts` (Logic only).

## Acceptance Criteria

- Insight tiles are interactive and open detailed explanations.
- "What Changed" cards follow the 4-point rule.
- Recommendations are clearly distinguished from user-entered data.
- Low-confidence data results in "soft" recommendations (suggestions, not prescriptions).

## Future Checklist

- [ ] Implement interactive Readiness Progress ring on Home.
- [ ] Add "Explain" button to training suggestions.
- [ ] Connect nutrition surplus/deficit to training intensity recommendations.
