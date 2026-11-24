# In-app reminder delivery

This independent main-based change adds opt-in reminders on the existing Home
screen. It uses the saved workout, weigh-in and lunch choices and local times.
Due items open the existing logging forms. Confirmed same-day records suppress
completed tasks, an active workout suppresses the workout prompt, and the shared
workout schedule suppresses rest-day prompts. Daily dismissals use the existing
verified AppState transaction and survive reopen/export; a failed save retains
the reminder and reports the failure. Old reminder-only dismissal IDs are pruned
after 30 days without removing other suggestion metadata.

Settings offers an explicit delivery opt-in, category toggles and editable 24-hour
times. The optional opt-in field is backward compatible and validated as boolean.
Missing legacy opt-in means disabled. Home checks the current device clock on
mount, foreground/focus, record changes and once per minute while visible. It does
not schedule background work, request OS notification permission, introduce a paid
service or modify production infrastructure. Offline Home reminders remain usable.

Web Push is a different delivery mechanism. Apple's current documentation requires
iOS/iPadOS 16.4 or later, Home Screen installation and permission requested from a
direct user gesture; no Apple Developer Program membership is needed. The existing
Vercel Hobby cron has daily minimum frequency and hour-level timing, so it cannot
honestly promise these three precise local reminder times. A separately approved
push rollout needs subscriptions, VAPID configuration, authenticated sending,
service-worker handling, timezone/schedule storage and an appropriate free sender.
This feature does not claim that saved preferences enable push delivery.

Sources checked November 24, 2026:

- [WebKit: Web Push for iOS/iPadOS](https://webkit.org/blog/13878/).
- [Apple Web Push documentation](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).
- [Vercel cron usage and scheduling precision](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

Validation: all 1,014 unit tests pass, including four targeted reminder cases and
backup validation. TypeScript and standalone lint pass; changed legacy files retain
baseline formatting findings with no introduced errors on changed lines. The
existing weigh-in sheet now uses the supported dialog/focus-management behavior,
after artifact tests confirmed it previously lacked dialog semantics. Final
production-artifact reminder/weigh-in checks all pass (8/8) in WebKit/Chromium,
including failed dismissal persistence, a single successful weigh-in retry, saved
times after reload, next-day delivery and navigation from every main section.
