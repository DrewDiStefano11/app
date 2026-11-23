# Settings access and truthful reminders

Follow-up to Freebuff BUG-09 and BUG-06, verified narrowly against main f784d55. BottomNav declares onOpenSettings but never consumes it. Preferences claims active local notifications although no scheduler exists; Weigh-in 9 PM contradicts the saved09:00 default and custom times.

- [ ] Reproduce with a browser regression: Settings from Train/Fuel/Recover/Stats, return to the same section; planned-notification disclosure, stored07:30 time and reminder preference persistence.
- [ ] Consume the existing onOpenSettings prop and render a gear in expanded navigation outside Home. Home keeps its existing unique Settings control, preventing ambiguity for users and regression selectors. Use existing navigation components and minimum touch size.
- [ ] Label reminder controls as saved preferences for planned notifications; remove false active/local-notification claims and display existing saved times. Preserve schema, stored booleans and existing units/demo controls.
- [ ] Validate mobile Chromium/iPhone WebKit and existing Settings lifecycle test, TypeScript/lint/production build; focused review, commit/push a separate PR. Reconcile the camera branch's import when merging, preserving its Photo control.

This does not implement notifications or add a new permission prompt. Existing preferences remain usable and persisted. Camera and WHOOP fixes are independently preserved in their own branches while hosted checks finish.
