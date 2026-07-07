# FitCore First Usable Testing Version Checklist

This document defines what must be true before FitCore can be considered ready for a first real testing version. This is not production readiness. This is the first version that can safely collect real user feedback without obvious broken core flows.

## 1. Definition

It is important to differentiate between various stages of application readiness:

- **Prototype:** An early, often hardcoded or fragile version meant to prove a concept or layout. Data loss is expected.
- **First Usable Testing Version:** A stable baseline where core flows function reliably. It is safe for early testers to use with real data, knowing that some advanced features are missing, but fundamental data integrity and usability are protected.
- **Beta:** A feature-complete version undergoing widespread testing to catch edge-case bugs and polish the user experience before a general release.
- **Production-Ready:** A fully polished, secure, scalable version ready for general public use with guaranteed data safety and complete documentation.

## 2. Required core flows

The first usable testing version must support the following core interactions without critical failures:

- [ ] Homepage loads reliably
- [ ] Main tabs work
- [ ] Bottom nav works
- [ ] Section tabs work where applicable
- [ ] Log Meal opens and saves
- [ ] Check In opens and saves
- [ ] Weigh In opens and saves
- [ ] Active workout starts
- [ ] Active workout logs sets
- [ ] Active workout finishes
- [ ] Workout finish summary appears
- [ ] Saved data appears in relevant screens
- [ ] Basic graphs do not break
- [ ] AI/Jarvis does not create obvious wrong-category logs
- [ ] Settings/privacy basics are understandable
- [ ] Empty account state is usable
- [ ] Low-data state is understandable
- [ ] Mobile layout is usable

## 3. Data integrity minimums

Before inviting testers, data must be treated with respect:

- [ ] Logs are not lost during standard usage
- [ ] Duplicate records are not created unintentionally
- [ ] Corrected data updates relevant places consistently
- [ ] Deleted data stops appearing where it should not
- [ ] Graph data matches stored data accurately
- [ ] AI summaries match source data without hallucination
- [ ] Demo data does not mix with real data
- [ ] User data is not silently overwritten

## 4. Mobile usability minimums

The interface must be usable on the primary target device (mobile):

- [ ] Popups are readable and correctly sized
- [ ] Sheets do not open too low or become inaccessible
- [ ] Bottom nav does not cover controls or critical content
- [ ] Keyboard does not block critical inputs
- [ ] Graph labels are readable on small screens
- [ ] Buttons are tappable with standard touch targets
- [ ] Floating assistant does not block core actions
- [ ] Scrolling works inside popups and sheets

## 5. AI/Jarvis minimums

The AI assistant must operate safely and transparently:

- [ ] AI can answer basic questions
- [ ] AI can log simple data only if supported
- [ ] AI asks for confirmation when uncertain
- [ ] AI does not diagnose medical conditions
- [ ] AI does not use disabled/deleted data for context
- [ ] AI can explain what data it used where applicable
- [ ] AI does not write demo actions into real data

## 6. Privacy/safety minimums

User trust and data safety are paramount:

- [ ] Destructive actions require confirmation
- [ ] Sensitive data is not shown casually or exposed unintentionally
- [ ] Medical/symptom content avoids diagnosis
- [ ] User can understand what data is being used by the AI
- [ ] Settings/privacy controls are not misleading
- [ ] Deleted data behavior is documented or implemented clearly

## 7. Testing checklist

Manual testing must be completed across these scenarios before release:

- [ ] New empty account
- [ ] Normal active account
- [ ] Low-data account
- [ ] Mobile viewport
- [ ] Desktop viewport
- [ ] Active workout flow
- [ ] Meal/check-in/weigh-in flow
- [ ] AI/Jarvis flow
- [ ] Graph/popup flow
- [ ] Demo mode flow

## 8. Release notes requirements

A first usable testing release should clearly document expectations for testers:

- [ ] What works reliably
- [ ] What is incomplete or still in progress
- [ ] Known bugs and edge cases
- [ ] Unsupported flows that should be avoided
- [ ] Privacy/safety limitations
- [ ] What feedback is needed from the testers
- [ ] What not to rely on yet (e.g., specific metrics or incomplete algorithms)

## 9. Blockers

The following issues are considered absolute blockers for a testing release:

- [ ] App cannot load
- [ ] Active workout cannot finish
- [ ] Meal/check-in/weigh-in cannot save
- [ ] Data loss occurs
- [ ] Real/demo data mixing
- [ ] AI logs to wrong category
- [ ] Deleted data still influences AI
- [ ] Privacy leak
- [ ] Mobile UI blocks core flow
- [ ] Medical diagnosis language appears

## 10. Non-blockers

The following items are acceptable gaps for a first usable testing version and should not block release:

- [ ] Minor visual polish or layout quirks
- [ ] Missing advanced analytics or deep insights
- [ ] Missing wearable integrations
- [ ] Missing advanced export formats
- [ ] Incomplete Health Twin features
- [ ] Incomplete automation rules
- [ ] Limited demo data
- [ ] Known low-priority copy issues
