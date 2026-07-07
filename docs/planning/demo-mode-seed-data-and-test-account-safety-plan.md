# FitCore Demo Mode, Seed Data, and Test Account Safety Plan

## 1. Demo Mode Purpose

The FitCore demo mode is designed to fulfill several key objectives without exposing or modifying actual user data. The purpose of this mode includes:
- Allow safe product demos
- Allow UI testing
- Allow empty/new/low-data testing
- Allow agents to validate flows without touching real data

## 2. Demo Mode Safety Boundaries

To prevent data corruption or privacy breaches, the following strict safety boundaries will be implemented:
- Demo data must never mix with real user data
- Demo writes must be clearly isolated
- Demo records should be labeled
- Demo mode should be visually identifiable
- Deleting demo data should not affect real data
- Real user data should never appear in demos
- AI/Jarvis actions in demo mode must not write to real data

## 3. Seed Data Types

We will include fake sample data representing a wide variety of domain areas.

| Category | Description |
| :--- | :--- |
| Workouts | Full resistance and cardio sessions |
| Exercises | Movements tracked within workouts |
| Sets | Individual tracking data per exercise |
| Meals | Nutrition logs across breakfast, lunch, dinner, snacks |
| Weigh-ins | Bodyweight history |
| Check-ins | Readiness and subjective check-ins |
| Soreness notes | Sample recovery inputs |
| Pain notes | Mock injury or joint issue notes |
| Fatigue notes | Physical exhaustion logs |
| Sleep logs | Sleep duration and quality metrics |
| Goals | Target metrics and profile objectives |
| Graph data | Time-series data points to populate dashboards |
| FitCore Score examples | Aggregated metrics for health scoring |
| AI/Jarvis examples | Sample chat history and recommendations |
| Deleted/hidden data examples | Records flagged as removed |
| Corrected data examples | Records upgraded via user feedback |

## 4. Test Account Profiles

Future test profiles will be structured to simulate various user states and edge cases:

- Empty new user
- New user with goals but no logs
- Low-data user
- Normal active user
- Heavy historical user
- Nutrition-focused user
- Strength-focused user
- Injury/recovery-focused user
- Privacy-restricted user
- Demo user
- AI-disabled user
- Deleted-data edge case user

## 5. Fixture Quality Requirements

To ensure testing value and safety, fixture data must adhere to the following requirements:
- Fake but realistic
- Deterministic
- Privacy-safe
- Clear labels
- Broad enough to test graphs
- Includes edge cases
- Does not contain real personal data

## 6. Demo Mode AI/Jarvis Behavior

Jarvis integration in demo mode must strictly respect sandboxing boundaries:
- AI should know when it is in demo mode
- AI should not treat demo data as real user memory
- AI should not save demo logs to real account data
- AI should explain when responses are based on demo data
- Demo mode should not train or persist sensitive user preferences

## 7. Edge Cases to Test

During and after implementation, test coverage must verify the following scenarios:
- Duplicate demo records
- Deleted demo data
- Hidden demo data
- Corrected demo data
- Stale demo data
- Empty graphs
- Graph mode persistence
- Fake injury/pain notes without diagnosis
- AI logging in demo mode
- Switching from demo mode back to real mode

## 8. Future Implementation Sequence

| Phase | Task |
| :--- | :--- |
| 1 | Inventory current demo behavior |
| 2 | Define demo data labels |
| 3 | Isolate demo storage |
| 4 | Add reset demo data behavior |
| 5 | Add visual demo banner/label |
| 6 | Add AI demo mode restrictions |
| 7 | Add tests |

## 9. Acceptance Criteria for Future Implementation

Future implementation PRs will be considered complete when the following criteria are met:
- Demo data cannot pollute real data
- Real data cannot leak into demo mode
- AI respects demo boundaries
- Reset demo data only resets demo data
- Demo mode is visually obvious
- Fake fixtures are privacy-safe
- Demo graphs and dashboards work
