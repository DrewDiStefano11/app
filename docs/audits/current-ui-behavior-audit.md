# Current UI Behavior Audit

## Executive Summary

This audit reviews the current state of FitCore's UI behavior. We navigated the app using Playwright in a mobile viewport setting to inspect 12 requested focus areas. The application correctly renders most data and screens. However, minor DOM hydration warnings and sheet backdrop layering issues exist.

## Test Environment Used

- Playwright Chromium headless mode
- Viewport size: 390x844 (Mobile)
- Local Vite development server (localhost:8080)

## UI Areas Tested

### 1. App loading

- **Observation:** The app loads quickly and without crashing.
- **Issues:** Console errors were found related to hydration and invalid DOM nesting (`<button>` inside `<button>`).

### 2. Homepage/dashboard

- **Observation:** Dashboard cards populate with expected content and correct visual hierarchy.
- **Issues:** None. The AI entry points open the AI launcher as expected.

### 3. Bottom navigation

- **Observation:** All bottom nav items switch states gracefully and update active highlight.
- **Issues:** Occasional inability to click items due to an unclosed sheet backdrop intercepting the pointer.

### 4. Section tabs

- **Observation:** Navigating to Training, Nutrition, Recovery, and Progress successfully switches the content with correct scroll behavior.
- **Issues:** None.

### 5. Floating FitCore AI assistant

- **Observation:** Opens via the AI Insight strip.
- **Issues:** Accessible, but could potentially overlap elements depending on device scale if opened without closing native keyboard.

### 6. Popups/modals/sheets

- **Observation:** Opening modals works correctly and applies a blur to background elements.
- **Issues:** Event propagation is occasionally blocked if a sheet's backdrop stays alive underneath while trying to use the bottom navigation, causing a click-trap.

### 7. Workout UI

- **Observation:** Navigating to the training section opens the workout screen properly.
- **Issues:** No major broken buttons, although deeply nested tags on set entry could be improved.

### 8. Nutrition UI

- **Observation:** Nutrition displays correctly and macros appear.
- **Issues:** Safe-area padding at the very bottom requires consideration when sheets open so action buttons aren't obscured by mobile OS bars.

### 9. Recovery/check-in/weigh-in UI

- **Observation:** Check-in forms are visible and recovery cards persist.
- **Issues:** No major broken flows, the charts appear seamlessly.

### 10. Progress/graphs UI

- **Observation:** The progress graphs rendered by Recharts load as expected.
- **Issues:** Mobile touch handling requires precision to see tooltip overlays.

### 11. Mobile-first behavior

- **Observation:** Viewport constraints apply perfectly across the application (`390x844` verification).
- **Issues:** Stacking contexts occasionally cause tooltips to render beneath backdrops if manually triggered over a sheet.

### 12. Console errors

- **Observation:** The most significant error is a React hydration warning.
- **Error log:** `Warning: In HTML, <button> cannot be a descendant of <button>.`
- **Location:** The `HomeView` component rendering `AiInsightStrip`.

## Bugs Found

### 1. Hydration Error / Invalid DOM Nesting

- **Issue:** The `AiInsightStrip` component renders a `<button>` tag, but it is currently wrapped inside another `<button>` tag in `src/components/app/views/home.tsx`.
- **Steps to reproduce:** Load the app and observe the console logs.
- **Severity:** Low (Non-blocking, but pollutes console and breaks hydration).
- **Screens affected:** Home
- **Suggested fix direction:** Remove the outer `<button>` in `HomeView` and pass the `onClick` to `AiInsightStrip` directly, or change the wrapper to a `<div>`.

### 2. Sheet Backdrop Trapping Clicks

- **Issue:** Navigation bottom buttons occasionally become unclickable because a `.sheet-backdrop` element intercepts pointer events.
- **Steps to reproduce:** Open an interactive panel (e.g. settings or Jarvis), try to click a bottom nav item without explicitly closing the panel first.
- **Severity:** Medium (Annoying for users, but recoverable by closing the sheet).
- **Screens affected:** Global navigation when sheets are open.
- **Suggested fix direction:** Ensure sheets close automatically on route changes.

## Items Safe to Fix Now

- **Invalid DOM Nesting (`<button>` inside `<button>`)**: This is a very clear and tiny bug that doesn't affect product/AI rules or schemas. The outer tag has been changed to a `div` in `src/components/app/views/home.tsx`. Note that `AiInsightStrip` natively accepts an `onClick` prop, so moving it there preserves the exact functionality and active `press` state styles on the inner button.

## Items That Should Wait Until After Product Bible Completion

- Broader modal/sheet stacking context redesigns to fix the click-trapping backdrop issue.
- Adding complex new logic to auto-close sheets on all navigations.
- Recharts graph tooltip sizing and padding updates.

## Validation Performed

- Loaded the app and ran automated Playwright scripts.
- Verified visual layouts of all tabs via screenshots.
- Identified the DOM bug via console logs in the script.
- Confirmed that modifying the outer tag to a `div` resolved the nesting error.
