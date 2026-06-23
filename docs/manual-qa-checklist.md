# Manual QA Checklist

This checklist should be used to verify app stability and behavior before merging PRs, especially those affecting UI or core logic.

## 1. Core Onboarding & Navigation
- [ ] **Onboarding**: New user flow completes without errors.
- [ ] **Bottom Navigation**: All tabs load correctly and maintain state.
- [ ] **Popups/Sheets**: Modals and slide-over sheets open/close cleanly.

## 2. Dashboard & Home
- [ ] **Home (FitCore Today)**: All widgets load data correctly.
- [ ] **Demo Data Mode**: Toggle works; sample data populates without overwriting real data.
- [ ] **AI Launcher**: Jarvis panel opens (verify UI only, do not require AI responses for smoke test).

## 3. Training & Workouts
- [ ] **Training Section**: Workout library displays correctly.
- [ ] **Active Workout**:
    - [ ] Timer starts/pauses.
    - [ ] Set controls (add/remove/complete) function as expected.
    - [ ] Rest timer triggers.
- [ ] **Finish Workout**: Summary screen displays correct stats and saves to history.

## 4. Health & Metrics
- [ ] **Nutrition Logging**: Quick logs and manual entries work.
- [ ] **Recovery Check-in**: Daily readiness/sleep logs save correctly.
- [ ] **Weigh-in**: Weight entries update graphs.
- [ ] **Progress Graphs**:
    - [ ] Charts render without crashing.
    - [ ] **Graph Toggles**: Date range and metric toggles update the view.

## 5. Data & Settings
- [ ] **Settings**: Personalization changes (units, reminders) persist.
- [ ] **Export Backup**: Generates a valid JSON file.
- [ ] **Import Backup**: Correctly restores data from a JSON file.
- [ ] **Reset Data**: Clears all local storage (after confirmation) and returns to onboarding.

## 6. Layout & Mobile
- [ ] **Mobile Smoke Test**: Critical flows (Active Workout, Nutrition) tested on mobile viewport.
- [ ] **Charts/Cards**: No layout breakage on small screens.
- [ ] **Forms**: Inputs are accessible and keyboard doesn't block critical fields.
