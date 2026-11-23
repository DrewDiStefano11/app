# FitCore iPhone Coverage Checklist

Generated: Mon Nov 23 2026
Branch: `kilo/async-queue-f7d` (rebased onto origin/main `dfe29ab`)

## Environment limitation

iPhone WebKit (`iphone-webkit` Playwright project) is **not available** in this test environment. iPhone coverage is provided via `mobile-390x844` (Chrome) only, which matches iPhone 13/14/15 viewport dimensions but uses Chromium rendering, not WebKit.

## Coverage via mobile-390x844 (Chrome)

The following e2e tests run against the iPhone-sized viewport:

| Test file | Tests | Viewport | Notes |
|-----------|-------|----------|-------|
| `tests/e2e/nutrition-macro-integrity.spec.ts` | 3 | mobile-390x844 | Macro integrity on iPhone-sized viewport |
| `tests/e2e/cross-screen-workflows.spec.ts` | 3 | mobile-390x844 | Cross-screen workflows incl. active workout interruption |
| `tests/e2e/data-integrity-interruption.spec.ts` | 2 | mobile-390x844 | Data integrity under interruption |
| `tests/e2e/settings-reload-behavior.spec.ts` | 2 | mobile-390x844 | Settings persistence across reload |
| `tests/e2e/jarvis-provider-failure.spec.ts` | 3 | mobile-390x844 | Jarvis provider failure incl. long multiline |
| `tests/e2e/whoop-sync-continuity.spec.ts` | 2 | mobile-390x844 | WHOOP sync continuity (1 blocked — see FITCORE_BUG_REPORT.md) |

## iPhone-specific checks (manual / future WebKit)

When WebKit becomes available (`FITCORE_TEST_IPHONE_WEBKIT=1`), verify the following on iPhone Safari:

### Layout & viewport
- [ ] Bottom nav fits within 390px width without horizontal scroll
- [ ] Home command center orbs render correctly on narrow viewport
- [ ] Training active workout view fits within viewport (timer, exercise cards)
- [ ] Jarvis composer sheet opens and is dismissable on iPhone
- [ ] Meal logging sheet is fully usable on narrow viewport

### Touch interactions
- [ ] "Blank workout" GhostButton is tappable (44px+ touch target)
- [ ] Bottom nav section buttons are tappable without overlap
- [ ] Sheet close/dismiss gestures work
- [ ] Text input in Jarvis composer triggers keyboard correctly

### Safari/WebKit specifics
- [ ] `window.scrollTo({ behavior: "instant" })` works in `useLayoutEffect` (route section changes)
- [ ] Fake clock + React re-render behavior matches Chromium (WHOOP sync continuity)
- [ ] `serviceWorkers: "block"` doesn't break API mocking
- [ ] LocalStorage persistence works across Safari page reloads

### Performance
- [ ] Time to interactive on iPhone-sized viewport
- [ ] WHOOP sync cooldown timer (120s) behaves correctly on mobile
- [ ] Active workout timer doesn't drift when backgrounded

## Excluded (no iPhone WebKit)

- WebKit rendering engine behavior
- Safari-specific CSS bugs
- iOS Safari touch gesture quirks
- `iphone-webkit` Playwright project execution

## Reference

- `playwright.config.ts` — project definitions (`mobile-390x844`, `iphone-webkit` behind feature flag)
- `tests/e2e/helpers/fitcore-test-state.ts` — `FITCORE_MOBILE_VIEWPORTS`, `setMobileViewport`
- `FITCORE_TEST_RESULTS.md` — mobile test results
- `FITCORE_BUG_REPORT.md` — WHOOP blocker details
