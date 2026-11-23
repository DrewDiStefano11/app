# WHOOP cold-start retry correction

November 23, 2026. Based on main f784d55. Current user objective: return automatically with as little delay as possible. Physical installed-iPhone success remains unconfirmed.

## Verified cause and bounded change

Read-only Production inspection found the seven initial WHOOP variables, with snapshot-cache/background/cleanup flags absent. No secret values were revealed and no settings changed. The current configuration therefore uses live-only browser data; there is generally no authorized durable server snapshot for /records after terminating the JavaScript process. Existing startup already reads authenticated records concurrently with status and displays any valid authorized snapshot before fresh synchronization. App switching retains RAM evidence; full termination does not.

A separate avoidable delay was reproduced: the server's claimSync correctly refuses a sync during an existing server cooldown/lease, but returned409 without its remaining deadline. A cold client then imposed another120seconds. A test with only10seconds remaining failed before the fix, as did a real Postgres/server-response test.

The store now reads remaining sync_after plus active90second sync/45second refresh leases using the same owner/session/connection/purpose fences as claimSync. It returns only a delay to authorized actors. syncWhoop carries that delay through the existing Retry-After response mechanism. The browser uses an explicit future409 deadline while retaining any existing local floor. Missing/invalid/zero hints and429 keep the existing120second minimum. Provider access is still guarded by the unchanged atomic claim. If a concurrent sync completes during the extra read, any next attempt remains gated by that claim.

No health measurements are cached persistently, no schema or environment flags change, no retention or display deadline is extended, and no revocation protection is removed. This corrects the reproduced scheduling defect; provider latency and lack of an authorized reusable snapshot still bound cold-start restoration.

## Validation

- New exact ten-second coordinator and actual Postgres/server tests failed against main, then passed.
- Full unit suite976/976 passed (83files,30.87s). Final focused tests64/64 passed (10.58s), including remaining sync/refresh lease gates, wrong-owner and expired-session isolation, production runtime role access, invalid hints,429 protection, and no provider/cache writes while blocked.
- TypeScript, scoped semantic lint and Vercel production build passed.
- Production-artifact WHOOP dashboard/lifecycle suite28/28 passed across iPhone WebKit and mobile Chromium (2.8m): new cold restart with null records/short server conflict automatically restores91%, existing authorized-cache-first restoration, foreground renewals, hide/resume, offline, original expiry, revocation/locking/disconnect and no browser health persistence.
- Independent focused review found no important actionable issue.

The browser test uses synthetic records and fake time; it does not establish actual iPhone results. After a verified production rollout, fully terminate/reopen the installed PWA and observe automatic return without manual sync. Record any remaining delay and whether the app is online. Do not mark the physical issue resolved without the user's confirmation. Earlier release notes claiming physical cold-start success are superseded by the current goal.
