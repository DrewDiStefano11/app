# FitCore regression harness reconciliation

November 23, 2026 — PR #312, reconciled with main f784d55 after #308.

The original WHOOP failure reproduced: expected 90%, received 80%. The original explanation attributing this to React and Playwright fake clocks was not supported. The fixture grants a 600-second lease. sync-coordinator.ts schedules successful live-snapshot renewal 15 seconds before expiry (585 seconds); the 120-second cooldown is only a minimum interval. Advancing 121 seconds and dispatching focus while already foreground does not make that renewal due. The original failed-refresh assertion never proved a failed sync happened.

Both continuity tests now set the failure before advancing to the actual renewal, await the HTTP 502 response, and verify the authorized 80% remains visible before its original expiry. They then await a successful retry after cooldown and verify the replacement in the real UI. The timestamp case compares all manual sleep entries, including timestamps, against the original records. The fake clock remains enabled. Both corrected desktop tests pass. No production change or weakened final assertion was needed.

Settings coverage now changes days/week and checks its stored and rendered value after reload. The backup case reads the exported JSON, verifies export did not mutate state, changes a value, imports the export, and verifies restoration after reload. The provider-error test waits for visible error feedback before checking the retained draft. Its missing Page type import is corrected.

This resolves the synthetic regression harness failure only. The user's installed-iPhone WHOOP cold-start report remains open until investigated and physically confirmed. Existing notes in the #308 checkpoint claiming physical confirmation are superseded by the current goal objective. Automated browser coverage does not establish actual camera, provider accuracy, or installed-PWA behavior.

A repeat iPhone WebKit run also exposed a response-header race: a response can arrive before the coordinator records its retry deadline. The harness now waits for the existing Recovery WHOOP updated status before advancing the clock. Both final tests passed across desktop Chromium, mobile Chromium and iPhone WebKit (6/6, 22.3s).
