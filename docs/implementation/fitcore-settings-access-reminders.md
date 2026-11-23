# Settings reachability and reminder truthfulness

November 23, 2026 — targeted Freebuff BUG-09 and BUG-06 follow-up against main f784d55; no repeated audit.

BottomNav declared onOpenSettings but did not consume it. Expanded navigation now exposes Settings from Train, Fuel, Recover and Stats and opens the existing Settings view. Done returns to the prior section. Home retains its existing unique Settings control; active-workout navigation safeguards remain unchanged. The new gear reuses the existing navigation styles.

Preferences previously claimed active local browser notifications despite having no scheduler. The section now says Notifications planned and explicitly explains that FitCore does not schedule or send notifications yet. The toggles still save preferences. Times display existing saved personalization values on a24-hour clock, with legacy defaults; the hardcoded Weigh-in9PM claim is removed. No permission prompt, fake scheduler, persisted-schema or store change is introduced.

Both new regression scenarios failed before the fix: missing Settings in Train, and missing planned-notification disclosure. Afterward6/6 passed across iPhone WebKit and360/390px mobile Chromium (45.6s). Production artifact passed6/6 across iPhone WebKit and mobile Chromium (1.1m), including both new flows plus existing Settings validation/import/export/reset safety. TypeScript and scoped semantic lint pass after accounting for optional legacy personalization reminders; production build passes. Focused independent review found no important issue.

Separate lucide Settings2 import keeps this independent change mergeable with the camera branch's icon addition; no camera workflow implementation is duplicated. Verify the combined controls after integration and production deployment. Physical installed-iPhone keyboard/touch behavior remains a device check.
