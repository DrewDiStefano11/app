# Mobile QA Checklist

## 1. Purpose
The purpose of this checklist is to ensure the FitCore UI functions optimally and looks correct on mobile devices. It emphasizes touch interactions, varying screen sizes, safe-area management, and specific mobile behavioral quirks to ensure a seamless "app-like" experience.

## 2. Scope
This checklist focuses entirely on the frontend mobile experience, covering:
* iPhone-first layout
* Small viewport behavior
* Bottom nav spacing
* Safe-area spacing
* Popup/sheet height
* Popup/sheet readability
* No transparent text problems
* Buttons reachable by thumb
* Keyboard behavior
* Scroll trapping
* Graph popup usability
* Active workout usability
* Accessibility basics

## 3. When to use this checklist
* After significant styling updates or layout refactors.
* When adding new interactive components (sheets, modals, complex forms).
* Before cutting any major release to ensure the core mobile UX is pristine.

## 4. Required preconditions
* Testing must be performed on actual mobile devices or highly accurate simulators (iOS/Safari and Android/Chrome).
* Do not rely solely on desktop browser resizing (e.g., Chrome DevTools device mode), as it does not simulate native keyboard behaviors or dynamic safe areas perfectly.

## 5. Step-by-step checklist
1. **iPhone-first layout**: Verify the primary layout, navigation, and spacing look native and balanced on an iPhone screen.
2. **Small viewport behavior**: Test on a small device (e.g., iPhone SE size) to ensure text does not overflow, overlap, or get cut off.
3. **Bottom nav spacing**: Check that the bottom navigation bar does not overlap with the primary content and remains accessible.
4. **Safe-area spacing**: Ensure UI elements do not encroach on the top notch/Dynamic Island or the bottom home indicator.
5. **Popup/sheet height**: Open sheets (using `dvh`) and verify they size correctly and do not overflow off-screen or become unscrollable.
6. **Popup/sheet readability**: Check that popup backdrops use the correct blur/opacity and text is legible.
7. **No transparent text problems**: Verify text inputs and labels don't exhibit weird transparency layers or unreadable contrast.
8. **Buttons reachable by thumb**: Ensure primary calls-to-action are in the lower half of the screen and comfortably reachable with one thumb.
9. **Keyboard behavior**: Tap an input. Verify the virtual keyboard does not obscure the input field or break the overall layout.
10. **Scroll trapping**: Open a modal or sheet with scrollable content. Confirm that scrolling inside it does not inadvertently scroll the main page behind it.
11. **Graph popup usability**: Tap dashboard graphs and ensure the popups are fully readable and interactive on a small screen.
12. **Active workout usability**: Start a workout and confirm controls (timers, sets, inputs) are easily tappable while moving.
13. **Accessibility basics**: Verify adequate touch target sizes (at least 44x44px), decent color contrast, and logical focus flow.

## 6. Expected pass behavior
* The application feels like a native mobile app.
* Modals and sheets are fully contained, properly sized, and their internal scrolling works.
* The keyboard smoothly pushes content up when necessary and retracts cleanly.
* UI elements respect device safe areas.

## 7. Fail examples
* Opening a sheet causes the underlying page to jump or scroll to top.
* The bottom navigation covers the final item in a scrollable list.
* Text inputs are hidden beneath the virtual keyboard when focused.
* Buttons are too small to reliably tap with a thumb.

## 8. Required notes/screenshots/logs to capture
* Capture screenshots or screen recordings (e.g., .webm/.mp4) of any layout breaks, keyboard overlap issues, or scroll trapping failures.
* Note the exact device model, OS version, and browser used during testing.

## 9. Blocking vs non-blocking issues
* **Blocking**: Content is completely inaccessible or hidden (e.g., keyboard covers input and won't scroll, buttons are unclickable).
* **Non-blocking**: Minor padding inconsistencies or slight aesthetic flaws that do not prevent the user from completing an action.

## 10. Future automation opportunities
* Playwright tests can be configured with specific mobile viewports to catch layout overflows and basic accessibility violations.
* Visual regression testing tools can be utilized to compare snapshots of core screens against known good baselines across different device sizes.

## 11. Final QA matrix

| Area | Test/check | Expected result | Blocking severity | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **iPhone-first layout** | Review general styling | App looks native, well-proportioned | High | |
| **Small viewport** | View on small screen | No text cutoff or overlap | Medium | |
| **Bottom nav spacing** | Scroll to bottom of list | Nav does not overlap last item | High | |
| **Safe-area spacing** | Check top/bottom edges | Content respects notch/home bar | High | |
| **Popup/sheet height** | Open various sheets | Sized correctly (dvh), scrollable | High | |
| **Popup readability** | Read sheet content | Backdrop blurs, text is clear | Medium | |
| **Text rendering** | Inspect inputs/labels | No transparency/contrast issues | Low | |
| **Thumb reachability** | Use app one-handed | Core actions are reachable | Medium | |
| **Keyboard behavior** | Focus input fields | Keyboard doesn't hide input | High | |
| **Scroll trapping** | Scroll inside sheet | Background page stays locked | High | |
| **Graph popups** | Interact with graph sheet | Fits screen, data is readable | Medium | |
| **Active workout** | Use controls during workout| Large touch targets, easy to hit | High | |
| **Accessibility basics**| Tap various elements | Touch targets >= 44px | Medium | |
