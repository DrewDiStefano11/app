# Camera access implementation plan

Goal: expose meal photo capture from the main Jarvis composer beside text and microphone, retaining Fuel Photo Log and the existing review pipeline.

Architecture: dispatch the existing fitcore:meal-photo event from BottomNav, close the compact composer, and reuse JarvisPanel/usePhotoMeal. Keep the two native image file inputs; style their labels as visible 44px actions with camera/image icons. No new camera API or provider path is required.

Spec: current goal objective, Priority 2. This is the requested focused fix, using the existing React/TypeScript and native file picker architecture.

- [ ] Add a failing browser regression: open the main composer, find a visible 44px camera control, open review, activate native take/choose file pickers, check capture/accept, preview and consent gate. Revisit from Fuel Photo Log and verify viewport bounds.
- [ ] Run the regression against current main and confirm the missing-camera failure.
- [ ] Implement the event control and clearer picker labels, preserving existing input accessible names and all review behavior.
- [ ] Run the new regression and existing photo workflow on iPhone WebKit/mobile Chromium, plus TypeScript, scoped lint and production build.
- [ ] Request focused independent review, commit/push a focused PR, check hosted safety gates at milestones, merge when safe, and verify production contains the change.
- [ ] Record the physical installed-iPhone picker check as pending user confirmation; browser emulation cannot operate the user's iPhone camera.
