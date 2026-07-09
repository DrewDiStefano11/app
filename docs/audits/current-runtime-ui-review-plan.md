# Current Runtime UI Review Plan

## General runtime UI merge gates
- [ ] file scope check
- [ ] automated checks
- [ ] review thread check
- [ ] manual visual review
- [ ] mobile review
- [ ] desktop review
- [ ] regression check

## Mobile viewport review
- [ ] 360px width
- [ ] 390px width
- [ ] bottom navigation overlap
- [ ] scroll-to-bottom behavior
- [ ] card spacing
- [ ] text wrapping
- [ ] touch target size
- [ ] popup/sheet readability

## Desktop/tablet review
- [ ] content width
- [ ] empty space
- [ ] card alignment
- [ ] overflow
- [ ] heading hierarchy
- [ ] visual consistency

## Recovery #129 review checklist
- [ ] readiness detail reachable with no check-in
- [ ] readiness detail reachable with sleep/supplement-only data
- [ ] sleep logging still reachable
- [ ] check-in logging still reachable
- [ ] soreness/body tracking still reachable
- [ ] BodyHeatmap still reachable
- [ ] trends/history still reachable
- [ ] supplements-today still reachable
- [ ] safety guidance still visible
- [ ] no fake HRV/wearable/strain data added

## Progress #148 review checklist
- [ ] bodyweight log still reachable
- [ ] progress photos still reachable
- [ ] analytics still reachable
- [ ] bodyweight analytics chart/range behavior preserved
- [ ] goals still reachable
- [ ] empty states still work
- [ ] no regressions from removing subtabs
- [ ] bottom sheets work cleanly on mobile

## Future Settings/Hub review checklist
- [ ] all existing settings/actions remain reachable
- [ ] destructive/data actions are visually separated
- [ ] AI/Jarvis section does not imply unsupported behavior
- [ ] profile/app preferences remain clear
- [ ] bottom content is not hidden by navigation
- [ ] no new state/schema/storage behavior added

## Reasons to block merge
- [ ] unexpected files
- [ ] generated files
- [ ] failing checks
- [ ] unresolved current Codex P1/P2
- [ ] missing manual UI screenshots
- [ ] lost behavior
- [ ] hidden content
- [ ] unreadable popup/sheet
- [ ] broken mobile layout

## Suggested screenshot evidence
- [ ] top of screen
- [ ] middle sections
- [ ] bottom sections
- [ ] opened sheets/popups
- [ ] empty state
- [ ] populated/rich state if available
- [ ] 360px mobile
- [ ] 390px mobile
- [ ] desktop
