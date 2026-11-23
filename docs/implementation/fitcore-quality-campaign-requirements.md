# FITCORE — ADDITIONAL DEVELOPMENT REQUIREMENTS AND FINAL QUALITY CAMPAIGN

These requirements supplement all existing FitCore Goal Mode instructions. Preserve completed features, existing data, and working integrations.

**Priority: Resolve daily usability problems, complete unfinished functionality, improve dashboard usability, and then thoroughly stress-test the complete application.**

## 1. WHOOP — Continuous Data Without Unnecessary Blank Periods

Current problem:

WHOOP measurements sometimes disappear while waiting for the next synchronization. This creates unnecessary empty fields and can interfere with FitCore calculations or dashboard behavior.

Required behavior:

- Retain the last valid WHOOP snapshot while obtaining its replacement, as long as the provider's authorization, cache directives, and retention rules permit.
- Schedule synchronization before eligible displayed measurements expire whenever possible.
- Refresh observations proactively while the app is open and online.
- Replace existing values reactively when newer measurements arrive.
- Avoid clearing valid data simply because a refresh request has started.
- Do not use loading transitions that hide the entire dashboard.
- Use subtle refreshing indicators and last-updated timestamps.
- Preserve the existing WHOOP Recovery, sleep, HRV, resting heart rate, strain, and activity source-of-truth rules.
- Ensure transient API failures do not break Training, Nutrition, or unrelated dashboard features.
- Handle rate limits, cooling periods, reconnects, backgrounding, and foreground restoration.

Important privacy constraint:

Do not violate WHOOP's cache expiration, authorization, or data-retention requirements merely to keep numbers visible. Audit the relevant rules first. If data must expire, show an honest unavailable state while keeping the rest of the app usable. Never display an expired measurement as current or fabricate a replacement score.

Acceptance:

With the app open through multiple synchronization cycles, authorized valid measurements remain visible during refreshes, update when new evidence arrives, and never cause dependent UI to malfunction.

## 2. Jarvis — Automatically Expanding Message Input

Current problem:

Jarvis's text entry box stays approximately one line tall even when writing longer messages, preventing users from reviewing what they typed.

Required behavior:

- Automatically expand the text area as the message grows.
- Display several lines without requiring the user to scroll horizontally.
- Set a reasonable maximum expanded height, then allow internal scrolling for longer messages.
- Preserve text, cursor position, and focus during expansion.
- Make multiline editing intuitive on iPhone.
- Keep the Send and microphone controls accessible.
- Ensure the iOS keyboard does not overlap the composer.
- Support intentional line breaks.
- Preserve unsent drafts through appropriate modal transitions.

Also correct raw Markdown rendering in Jarvis replies so ordinary bold text, paragraphs, and lists display properly without exposing formatting syntax.

Acceptance:

A long message can be written, reviewed, edited, and sent without losing text or encountering overlapping controls.

## 3. Full Audit of Visible but Unimplemented Features

Perform a systematic functionality audit across the entire application.

Inspect:

- Home
- Training and active workouts
- Nutrition/Fuel
- Recovery
- Stats/Progress
- Deep Dive sections
- Jarvis
- Settings
- Integrations
- Quick actions
- Navigation and modal interfaces

Identify every feature, card, button, menu, setting, or interaction that:

- Is displayed but does nothing.
- Uses placeholder or fabricated data outside explicitly labeled demo mode.
- Is only partially implemented.
- Has an interface but no working underlying logic.
- Is disconnected from saved records.
- Produces inconsistent results across screens.
- Is unnecessarily disabled despite having working backend functionality.
- Claims that a capability is available when it is not.

Create a concise functionality inventory categorizing each item as working, incomplete, intentionally gated, broken, or not yet implemented.

Implement missing features that are already within the approved FitCore scope and have clear requirements.

Do not blindly activate privacy-sensitive integrations, paid services, unsupported platform features, or intentionally gated capabilities. Complete the necessary safe implementation and tests first; otherwise present a clear unavailable state.

Do not waste usage rebuilding already functional features.

## 4. Complete UI/UX Review and Screen Improvements

The app should feel like a finished premium fitness application, not a collection of numbers and disconnected data panels.

Conduct a full review of the following areas.

### Recovery

Transform Recovery into an informative health and training-recovery dashboard.

Include useful combinations of:

- WHOOP Recovery and trends.
- HRV and resting heart rate trends.
- Sleep duration, consistency, and performance.
- Daily strain and activity.
- Relevant historical charts.
- Clear comparisons with the user's established baseline.
- Practical recovery explanations.
- Evidence-based training considerations.

Do not invent a FitCore replacement for a measurement already provided authoritatively by WHOOP.

Present current metrics, trends, explanations, and expandable details.

### Nutrition / Fuel

Improve:

- Daily calories and macros.
- Remaining targets.
- Meal history.
- Saved meals and frequently eaten foods.
- AI photo logging access.
- Quick logging.
- Daily and weekly trends.
- Editable ingredient breakdowns.
- Meal corrections.
- Jarvis integration.

### Training

Improve the presentation of:

- Today's scheduled workout.
- Active workout progress.
- Exercise history.
- Recent performance.
- Strength progression.
- Personal records.
- Training volume.
- Rest timers.
- Routine adherence.
- Suggested next actions.

Keep the interface fast to use during an actual workout.

### Stats / Progress

Present useful performance analytics rather than isolated metrics.

Include supported charts and comparisons for:

- Strength progression.
- Workout volume.
- Bodyweight.
- Exercise performance.
- Training frequency.
- Nutrition adherence.
- Recovery trends.
- Personal records.

Clearly distinguish measured improvement from unsupported conclusions.

### Deep Dive

Deep Dive screens should provide detailed analysis that adds value beyond the main dashboard.

Support appropriate charts, date ranges, comparisons, drill-downs, and historical records.

Avoid copying the same information into multiple screens without additional context or functionality.

### General design requirements

- Consistent typography, spacing, cards, charts, and navigation.
- Visually coherent with FitCore's existing design.
- Prioritize iPhone PWA layouts.
- Maintain accessibility and readable contrast.
- Minimize clutter and unnecessary navigation.
- Use progressive disclosure for advanced information.
- Display correct empty, loading, offline, and error states.
- Keep important actions accessible.
- Avoid fabricated data and excessive AI-generated advice.

Build a coherent visual system rather than independently redesigning every screen.

## 5. Active Workout — Fix Keyboard-Induced Scrolling

Current problem:

When the user types into an input during an active workout, the screen unexpectedly scrolls toward the bottom, disrupting the workout and making it difficult to see the current entry.

Investigate:

- Focus handlers.
- Automatic scrolling.
- React rerender behavior.
- iOS keyboard viewport resizing.
- Scroll anchoring.
- Modal and bottom-sheet behavior.
- Input replacement or remounting.
- Any scroll-to-bottom or scrollIntoView calls.

Required behavior:

- Typing must not unexpectedly jump to the bottom of the page.
- Preserve the user's current scroll context.
- Keep the focused input visible above the iPhone keyboard.
- Do not automatically scroll to unrelated exercises or controls.
- Preserve active workout state and rest timers.
- Ensure corrected sets and notes do not cause focus loss.
- Apply consistent behavior across set inputs, exercise notes, workout notes, and relevant editing dialogs.

Natural minimum scrolling necessary to keep the focused field visible is acceptable; unrelated automatic page movement is not.

Add actual viewport and geometry assertions to mobile browser tests.

Physical iPhone acceptance is required before certifying the fix.

## 6. Intelligent Food Library and Meal Reuse

Build on FitCore's existing saved-nutrition functionality rather than creating an unrelated second database.

The library should support:

- Previously logged meals.
- Previously logged individual foods.
- Saved recipes.
- Custom foods.
- Favorites and frequently eaten meals.
- Search by food name or similar description.
- Previously confirmed serving sizes.
- Stored nutrition values and ingredient breakdowns.
- Editing, reuse, and deletion.

### Jarvis integration

When identifying a meal from text or a photograph, Jarvis should be able to use relevant previously confirmed foods or meals as references.

Example:

The user frequently logs a particular protein powder with known nutritional values.

When Jarvis recognizes or is told that the same powder is being used, it should suggest the previous product and quantities rather than inventing another estimate.

If the user makes homemade overnight oats regularly, Jarvis should be able to find the previous recipe and propose it as a starting point.

The user must be able to confirm that the matched food is actually the same item.

### Nutrition estimation priority

Prefer evidence in this general order:

1. Verified package nutrition information for the correct product and serving.
2. User-confirmed saved food and recipe information.
3. Reliable external food reference data where legally and technically available.
4. AI-estimated food identity and portions.

Do not treat similar foods as identical without confirmation.

Do not overwrite user-confirmed quantities with image estimates.

Use the existing transactional logging, saved-food, backup, correction, and undo systems.

### AI photo correction

Jarvis should:

1. Identify the meal.
2. Estimate visible foods and portions.
3. Check relevant saved foods and recipes.
4. Present an editable ingredient-level estimate.
5. Accept conversational corrections, substitutions, additions, and removals.
6. Recalculate nutrition totals.
7. Save only after user confirmation.

Preserve every correction without restarting the entire analysis unnecessarily.

## 7. Final Extended Stress-Testing Campaign

This should be one of the final major development phases, after the principal features are integrated.

The goal is to expose actual weaknesses and correct them until the application meets defined release criteria.

### A. Data persistence and corruption

Test:

- Hundreds or thousands of synthetic workout records.
- Large nutrition histories.
- Large saved-food libraries.
- Repeated edits, deletes, corrections, and undo.
- Interrupted storage writes.
- Full or unavailable browser storage.
- Backup export/import.
- Upgrade and rollback compatibility.
- Conflicting writes from multiple tabs.
- App crashes and relaunches.

### B. Mobile reliability

Test:

- iPhone WebKit.
- Mobile Chromium.
- Installed PWA where physically available.
- Keyboard opening and closing.
- Orientation and viewport changes.
- Long Jarvis conversations.
- Long text drafts.
- Microphone interruptions.
- Camera cancellation.
- Backgrounding and reopening.
- Offline and intermittent connectivity.
- Service worker updates.

### C. AI functionality

Test:

- Text logging.
- Speech transcription.
- Multiple events in one command.
- Food photo estimation.
- Ingredient corrections.
- Workout corrections.
- Duplicate detection.
- Ambiguous instructions.
- Confirmation before saving.
- Failed requests and retries.
- Rate limits.
- Provider unavailability.
- Malformed or contradictory AI responses.

All synthetic AI requests should be clearly distinguished from authorized live acceptance testing.

### D. WHOOP reliability

Test multiple synchronization cycles, provider cooldowns, stale records, authorized cache reuse, expiry, interrupted requests, account disconnection, app backgrounding, and foreground restoration.

Verify no invalid values, duplicated measurements, contradictory Recovery calculations, or broken dashboards.

### E. UI and performance

Test:

- All major screens and navigation paths.
- Responsive layouts.
- Input focus and scrolling.
- Long-session memory behavior.
- Chart rendering with large datasets.
- Repeated modal opening and closing.
- Accessibility.
- Slow network conditions.
- Concurrent user interactions.
- Errors and recovery states.

Record meaningful performance measurements and identify regressions.

### F. Security and privacy

Validate credential handling, provider consent, WHOOP data boundaries, AI prompt/tool validation, unauthorized actions, backup handling, and secure error reporting.

Use synthetic credentials and data for automated stress tests.

Do not run uncontrolled high-volume requests against real Groq, WHOOP, or other external services.

### G. Test campaign execution

Execute a long, bounded, productive testing campaign.

For every discovered defect:

1. Reproduce it.
2. Identify its root cause.
3. Add an appropriate regression test.
4. Implement the smallest safe fix.
5. Verify the fix.
6. Check affected integrations for regressions.
7. Record the result.

Do not repeatedly run identical tests without a reason.

Use targeted tests during repairs and full integration suites at release milestones.

Organize CI jobs to avoid unnecessary timeouts without reducing required coverage.

Do not generate random code changes or consume tokens merely to keep the session active.

### Final release criteria

Do not declare the application complete until:

- Core features work together.
- Visible interactive features are implemented or accurately gated.
- The app handles common interruptions safely.
- Saved data remains consistent.
- WHOOP integration remains reliable.
- Major screen layouts work correctly.
- No known release-blocking defects remain.
- Complete release tests pass.
- Physical iPhone acceptance is documented.
- Rollback and data migration risks have been addressed.

Provide a final report listing what was tested, defects discovered, fixes completed, remaining limitations, and release readiness.

## Development order and usage efficiency

Choose implementation order based on dependencies, risk, and user impact.

Recommended sequence:

1. Complete and validate existing voice work without discarding PR #303.
2. Fix WHOOP continuity, Jarvis multiline input, and active-workout keyboard behavior.
3. Audit visible application features and complete the approved missing functionality.
4. Integrate the food library and conversational photo estimation.
5. Improve Recovery, Nutrition/Fuel, Training, Stats, Home, and Deep Dive.
6. Complete cross-feature integration and real-device acceptance.
7. Perform the extended stress-testing and stabilization campaign.

Do not perform broad redesign work before resolving fundamental interaction and data-consistency bugs.

Keep pull requests focused and reviewable.

No unauthorized production changes, paid services, destructive operations, or automatic merges.

**Final goal: a complete, stable, useful FitCore application that works reliably during everyday use—not merely a large collection of implemented features.**