# FitCore Manual Test Pack

This document outlines the comprehensive manual QA test cases for the FitCore application. Use this pack to verify full app functionality before major releases or when automated tests are insufficient.

## 1. Home / Command Center
- [ ] App loads without console errors
- [ ] FitCore Score card renders
- [ ] FitCore Score opens explanation popup
- [ ] Readiness card opens popup
- [ ] Heatmap card opens popup
- [ ] Volume card opens popup
- [ ] Macro card opens popup
- [ ] Start Workout opens popup
- [ ] Log Meal opens popup
- [ ] Check In opens popup
- [ ] Weigh In opens popup
- [ ] Recent activity appears after logs exist
- [ ] Bottom nav does not block content
- [ ] Floating AI assistant does not block quick actions

## 2. Training
- [ ] Training tab opens
- [ ] Today / Workouts / Performance subtabs work
- [ ] Start workout from template works
- [ ] Start blank workout works
- [ ] Cardio log works
- [ ] Workout history appears after finishing workout
- [ ] Workout detail opens
- [ ] Deleting workout requires confirmation

## 3. Active Workout
- [ ] Exercise cards are collapsed except current exercise
- [ ] Current exercise opens by default
- [ ] Completed exercise collapses and shows stats
- [ ] Add exercise works
- [ ] Add custom exercise works
- [ ] Add set works
- [ ] Delete set works
- [ ] Weight/reps inputs work on mobile
- [ ] Warmup/drop/failure/partials/unilateral controls work
- [ ] Modifier can be applied to one set
- [ ] Modifier can be applied to whole exercise
- [ ] Previous performance appears if history exists
- [ ] Plate calculator opens for barbell exercises
- [ ] Exercise notes save
- [ ] Finish workout summary opens
- [ ] Finish workout notes save
- [ ] Notes mentioning pain/soreness/fatigue are reflected in recovery signals if supported
- [ ] Save as template/update template flow works if present
- [ ] Discard workout requires confirmation

## 4. Nutrition
- [ ] Nutrition tab opens
- [ ] Today / History / Goals subtabs work
- [ ] Log meal opens
- [ ] Template meal logging works
- [ ] Food library logging works
- [ ] Custom meal logging works
- [ ] Calories/protein/carbs/fat update daily totals
- [ ] Meal delete requires confirmation
- [ ] History groups meals by day
- [ ] Macro goals can be edited
- [ ] Empty states look clean

## 5. Recovery
- [ ] Recovery tab opens
- [ ] Readiness / Muscle Status / Trends subtabs work
- [ ] Check-in popup works
- [ ] Sleep popup works
- [ ] Readiness score updates after logs
- [ ] Muscle fatigue quick tap works
- [ ] Fatigue update sheet works
- [ ] Heatmap front/back display works
- [ ] Trends show empty state when insufficient data exists

## 6. Progress
- [ ] Progress tab opens
- [ ] Overview / Body / Analytics subtabs work
- [ ] Weigh-in logging works
- [ ] Bodyweight trend updates after 2+ weigh-ins
- [ ] Progress photo upload flow works
- [ ] Photo detail opens
- [ ] Photo delete requires confirmation
- [ ] Analytics graphs show data when workouts exist
- [ ] Empty states are clear when data is missing

## 7. FitCore AI / Jarvis
- [ ] Floating AI assistant opens
- [ ] Assistant closes
- [ ] Quick/detailed modes work if present
- [ ] AI can answer using current section context
- [ ] AI can log bodyweight if supported
- [ ] AI can log meal if supported
- [ ] AI can log workout set if active workout exists
- [ ] AI asks for clarification on ambiguous logs
- [ ] AI-created logs appear in recent activity if supported
- [ ] Undo action works if supported
- [ ] AI does not silently overwrite manual logs

## 8. Data Persistence
- [ ] Log meal, refresh, confirm meal remains
- [ ] Log weigh-in, refresh, confirm weigh-in remains
- [ ] Log check-in, refresh, confirm check-in remains
- [ ] Start workout, refresh, confirm active workout remains
- [ ] Finish workout, refresh, confirm history remains
- [ ] Export data works
- [ ] Import data works
- [ ] Reset data requires confirmation
- [ ] Demo mode does not overwrite real data

## 9. Mobile / iPhone Layout
Test at mobile widths (e.g., via Chrome DevTools):
- 390x844 (iPhone 12/13/14/15)
- 375x812 (iPhone X/11 Pro)
- 360x800 (Android Standard)

Check:
- [ ] No horizontal scrolling
- [ ] Bottom nav does not cover buttons
- [ ] Floating AI button does not cover key actions
- [ ] Popups are readable
- [ ] Popup buttons are reachable
- [ ] Sheets scroll correctly
- [ ] Inputs are easy to tap
- [ ] Active workout finish bar is reachable
- [ ] Safe-area spacing works

## 10. Accessibility / Usability
- [ ] Icon-only buttons have labels where possible
- [ ] Important buttons have visible text
- [ ] Inputs have labels/placeholders
- [ ] Destructive actions require confirmation
- [ ] Empty states explain what to do next
- [ ] No fake demo data appears as real user data
- [ ] Text contrast is readable in dark mode
