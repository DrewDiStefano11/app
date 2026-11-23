# FitCore iPhone coverage checklist

November 23, 2026 — PR #312 reconciled with main f784d55.

All 15 scenarios in the six new regression files passed in both iphone-webkit (iPhone 13 emulation) and mobile-390x844 Chromium: 30/30 in 2.8 minutes. The final reviewer-requested WHOOP retry strengthening is validated separately in the PR discussion/handoff. Desktop evidence is in FITCORE_TEST_RESULTS.md.

This supersedes the original environment limitation: WebKit is available in this Windows validation workspace with FITCORE_TEST_IPHONE_WEBKIT=1. The original Kilo environment's Chromium-only results remain historical evidence, not WebKit evidence.

Automated scope: cross-screen workflows, meal macro integrity, interrupted writes, actual Settings preference persistence and backup import/export, mocked Jarvis provider failures, and observed failed/successful WHOOP renewals using synthetic records. The tests block service workers where specified and do not use real credentials or provider requests.

Physical checks still required on the installed iPhone PWA:

- Native keyboard, touch gestures and camera/photo picker.
- WHOOP data after a full termination/reopen; the current goal reports this remains unresolved.
- Revocation, original expiration deadline, and offline relaunch behavior under the authorized server retention policy.

Browser emulation and synthetic clocks do not certify these physical checks. Do not mark cold-start resolved without the user's confirmation.
