# FitCore QA Master Checklist: Phase 2 Readiness

## Overview

This checklist ensures the application is stable and ready for the next phase of feature development (Phase 2: DDE Integration & Advanced Logging).

## 1. Data Integrity & Persistence

- [ ] App hydrates correctly from `fitcore.v1` localStorage key.
- [ ] `FITCORE_DATA_VERSION` matches current schema.
- [ ] Migration logic correctly handles all previous versions (1-3).
- [ ] No data loss after multiple page reloads or hard refreshes.
- [ ] Corrupt localStorage data results in a safe fallback (onboarding or empty state), not a crash.

## 2. Onboarding & State Seeding

- [ ] Onboarding flow can be completed from start to finish.
- [ ] Seeding `onboardingComplete: true` correctly bypasses the flow.
- [ ] Seeded states (Minimal, Full, Data-Heavy) render accurately across all sections.

## 3. Mobile Usability & Responsiveness

- [ ] No horizontal overflow on standard mobile viewports (360px, 375px, 390px).
- [ ] Bottom navigation bar is always visible and usable.
- [ ] Tap targets are accessible (minimum 44x44px where possible).
- [ ] Detail sheets open correctly and use `dvh` units for positioning.
- [ ] `backdrop-blur-md` and `bg-black/85` are applied to all modal backdrops.

## 4. AI & Logging Safety

- [ ] Jarvis tool calls require user review for high-impact changes.
- [ ] Provenance metadata is correctly captured for manual and AI entries.
- [ ] "Undo" functionality works for all major logging actions.
- [ ] Jarvis does not provide medical diagnoses (Injury vs. Pain/Soreness boundary).

## 5. Performance & Build

- [ ] `npm run build` completes without errors.
- [ ] `npx tsc --noEmit` passes with no new errors.
- [ ] First Contentful Paint (FCP) is under 1.5s on mobile.
- [ ] Bundle size is monitored (individual chunks < 500kB).

## 6. Regression Testing

- [ ] All `tests/e2e/*.spec.ts` tests pass in headless mode.
- [ ] New regression pack for data persistence and mobile overflow is verified.
- [ ] Existing smoke tests pass.
