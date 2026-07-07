# Test Data, Demo Mode, Seed Data and Fixtures

Consistent, realistic data is required for verifying FitCore’s complex dashboards, AI reasoning, and graph plotting. This document defines the future expectations for managing test data, demo environments, and fixtures safely.

## Demo Mode Safety

Demo mode is a crucial feature for showcasing FitCore without requiring a user to log extensive history, but it carries immense risk if it leaks into real data.

- Demo data must absolutely not pollute real user data.
- Demo actions should be visually identifiable (e.g., a "Demo Mode" banner).
- Demo mode should have strict write boundaries; it must not sync to production backends.
- Deleting demo data should not affect real data.
- Real user data should never appear in public demos or screenshots meant for marketing.

## Test Account States

To thoroughly validate UX, agents and testers must simulate various account states:

- **Empty account:** A brand new user with no logs or configuration.
- **New account:** Goals set, but no logs yet.
- **Low-data account:** Only 1-2 days of logs, potentially breaking trend line calculations.
- **Normal active user:** Consistent logs across a few weeks.
- **Heavy historical user:** Years of data testing performance and large-scale aggregations.
- **Injury/recovery-focused user:** Lots of pain/soreness notes, skewed toward recovery analysis.
- **Nutrition-focused user:** Heavy meal logging, testing macro aggregations.
- **Privacy-restricted user:** All AI features disabled, testing graceful degradation.
- **Demo user:** Fully seeded for showcase purposes.

## Fixture Categories

Automated tests and local development will rely on deterministic fixtures:

- Workouts
- Meals
- Weigh-ins
- Check-ins
- Soreness notes
- Pain notes
- Sleep logs
- Goals
- AI memory and source examples
- Deleted/hidden data examples
- Corrected data examples

## Fixture Quality and Edge Cases

Fixtures must be high quality and purposefully handle edge cases:

**Quality Expectations:**
- Realistic enough to test graphs accurately.
- Clearly fake (e.g., using "Demo Burger" instead of real user logs).
- Privacy-safe (no real names, real locations, or sensitive user data).
- Deterministic when used in automated tests (no random math unless seeded).
- Representative of edge cases.

**Critical Edge Cases to Include:**
- Missing data (null values, unlogged days).
- Duplicated data.
- Stale data.
- Conflicting data.
- Manually corrected data overriding AI estimates.
- Deleted data.
- Disabled AI category data.
- Empty graph data.
- Exceptionally long workout history.
- Very small phone viewport rendering of the data.
