# iPhone camera access fix

November 23, 2026. Based on main f784d55 (#308).

The main bottom Jarvis composer had text, a disabled microphone control, and Send, but no camera control. Its full conversation sheet had a Meal photo button. This made the completed photo workflow difficult to discover on iPhone.

A labeled 48px Photo button with a camera icon now sits beside the main text/microphone controls. It closes the compact composer and dispatches the existing fitcore:meal-photo event, opening the same Jarvis review used by Fuel > Log Meal > Photo Log. The native file inputs now have clear Take photo and Choose image actions with icons and 48px touch areas. The rear-camera capture hint and image-only accept attributes remain intact, as do accessible input names and keyboard focus outlines.

No analysis, consent, provider, correction, saved-food, transaction, expiry, or persistence logic changed. The new regression first failed because the camera button was missing, then passed on iPhone WebKit and 360/390px mobile Chromium (3/3). It opens both native file choosers, verifies capture/accept, preview and disabled estimation before consent, absence of provider calls and saved records, Fuel access and viewport bounds. TypeScript, scoped semantic lint and Vercel production build passed. The new regression and all six existing food-photo scenarios passed against that production artifact in iPhone WebKit and mobile Chromium (14/14, 2.6m), preserving voice/text corrections, one-record confirmation/save/update/undo, saved labels/reuse, rejected-save retry and rate limits. Independent focused review found no important actionable issue.

The release gate now includes the new camera scenario without removing existing selections. Browser plugin skill was not available; repository Playwright was used for engine-specific regression tests. Existing build deprecation/bundle warnings remain; no new TypeScript or scoped lint errors were found.

Physical installed-iPhone acceptance remains pending: tap Jarvis > Photo > Take photo and allow the iOS camera; repeat Choose image and Fuel Photo Log; review the preview and consent before estimation. Desktop browser emulation cannot prove actual installed-PWA hardware/permission behavior.

Production inspection before this fix found the canonical Vercel domain still on dfe29ab (#307), with no #308 production deployment listed. Main alone is not proof of publication. Verify the resulting deployment revision and actual camera controls on gym-app-jade-eight.vercel.app before claiming the fix is published.
