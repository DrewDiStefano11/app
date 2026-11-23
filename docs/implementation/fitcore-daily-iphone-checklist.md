# Physical iPhone acceptance — pending

These checks require an approved isolated HTTPS test origin, synthetic records and an installed Home Screen PWA. Preserve the production app and export its backup. Automated WebKit and simulated VisualViewport checks do not certify a physical device.

1. Open Jarvis from Home and an active workout. Type a long multiline message, reposition the cursor, edit the middle, add Return line breaks, dictate, and use Send. Check the draft survives close/reopen and that Send/Record remain visible above the keyboard in portrait and landscape. Check common bold text and lists are readable.
2. In a long workout, focus the first and middle weight/reps fields and edit exercise notes. Only the movement needed to expose the focused field is acceptable. Check focus/cursor, saved values and rest timer survive repeated edits; Finish controls must stay within the viewport.
3. Open Finish workout, edit workout notes, show/hide the keyboard and return to editing. Confirm no scroll to unrelated exercises, no lost notes and no accidental finish. Complete once and reopen history.
4. With authorized synthetic WHOOP responses on the test origin, observe several renewal cycles, delayed replies, rate limits and a transient status failure. Valid values stay visible until their original expiry; new replies replace them. Expired/withdrawn access becomes unavailable while the rest of the app works. Do not modify production cache settings or extend provider TTLs.
5. Background/foreground, go offline and relaunch during an active workout. Check manual logging, persistence and draft recovery. Record device/iOS version, Home Screen mode, deployed SHA, checks and failures before a release decision.
