# Data Integrity QA Checklist

## 1. Purpose
The purpose of this checklist is to ensure that all data written, modified, or deleted within FitCore is accurately persisted, correctly attributed to its source, and consistently propagated across all views and AI contexts without duplication or silent corruption.

## 2. Scope
This checklist focuses on the data lifecycle and consistency. It covers:
* Manual data saving
* AI-estimated data review before save
* Dashboard propagation
* Graph propagation
* Summary propagation
* AI/Jarvis context propagation
* Correction propagation
* Deletion propagation
* Derived-value invalidation
* Source/confidence labels
* Demo data isolation
* Duplicate prevention

## 3. When to use this checklist
* Whenever changes are made to the database schema, storage mechanisms, or data migration scripts.
* After updating state management logic or store caching mechanisms.
* Prior to releasing features that introduce new data types or modify how AI generates records.

## 4. Required preconditions
* Use a known test account with a predefined, verifiable baseline of data.
* Have access to inspect local storage or the underlying database to verify raw data matches the UI representation.
* Familiarity with the source/confidence badge system (Manual, Verified, Jarvis, etc.) is required.

## 5. Step-by-step checklist
1. **Manual data saving**: Manually enter a new log (e.g., a meal or weigh-in) and verify it saves instantly.
2. **AI-estimated review**: Trigger an AI log. Verify it presents a review screen before saving and does not auto-commit without explicit permission.
3. **Dashboard propagation**: Ensure the newly saved data immediately reflects on the main dashboard (e.g., calorie totals increase).
4. **Graph propagation**: Check that historical graphs update to include the new data point.
5. **Summary propagation**: Verify weekly/monthly summaries recalculate to include the new data.
6. **AI/Jarvis context**: Ask Jarvis about the newly logged data to ensure it is immediately available in the AI's context window.
7. **Correction propagation**: Edit the logged item. Verify the change is reflected across the dashboard, graphs, and summaries.
8. **Deletion propagation**: Delete the item. Verify it is removed from all views, summaries recalculate down, and it is cleared from AI context.
9. **Derived-value invalidation**: Check that cached derived values (like the FitCore score) recalculate properly upon data changes.
10. **Source/confidence labels**: Verify that manual entries show a "Manual" badge, and AI entries show the correct source (e.g., "Jarvis" or "Verified" upon confirmation) and confidence level.
11. **Demo data isolation**: Ensure creating data in demo mode does not write to the real user database or leak into real user dashboards.
12. **Duplicate prevention**: Attempt to rapidly submit the same form twice to ensure duplicate entries are prevented.

## 6. Expected pass behavior
* Data entered once is visible everywhere it is relevant.
* Modifications and deletions propagate universally without requiring a hard refresh.
* All data is properly tagged with its source and confidence level.
* Strict separation between demo mode data and real user data is maintained.

## 7. Fail examples
* A deleted meal still contributes to the daily caloric total on the dashboard.
* AI-estimated data is saved to the database before the user hits "Confirm".
* An AI-logged meal is displayed with a "Manual" badge.
* Rapidly tapping the save button creates three identical database records.

## 8. Required notes/screenshots/logs to capture
* Capture database/local storage snapshots before and after a failed propagation step.
* Document any console errors related to state sync or data formatting.
* Provide screenshots of UI inconsistencies (e.g., a graph showing 500 kcal but the summary showing 0 kcal).

## 9. Blocking vs non-blocking issues
* **Blocking**: Any data loss, data duplication, failure to persist user input, or leakage of demo data into a real account.
* **Non-blocking**: A slight delay in derived-value recalculation that resolves itself shortly, provided the source data is safe.

## 10. Future automation opportunities
* Playwright E2E tests can verify end-to-end data propagation from input to dashboard to graph.
* Unit tests should strictly cover derived-value calculations and duplicate-prevention logic at the state layer.

## 11. Final QA matrix

| Area | Test/check | Expected result | Blocking severity | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Manual saving** | Submit manual log | Saves successfully | High | |
| **AI review** | Trigger AI log | Requires confirmation before save | High | |
| **Dashboard sync** | Check home view | New data is reflected instantly | High | |
| **Graph sync** | Check graphs | Graph plots new data point | High | |
| **Summary sync** | Check totals | Summaries include new data | High | |
| **AI context sync** | Ask Jarvis about data | AI knows about the new log | Medium | |
| **Correction sync** | Edit the log | Changes reflect everywhere | High | |
| **Deletion sync** | Delete the log | Data is removed everywhere | High | |
| **Derived invalidation**| Check FitCore score | Score updates based on new data | Medium | |
| **Source labels** | Inspect log badge | Shows correct source/confidence | High | |
| **Demo isolation** | Log data in demo mode | Real data remains untouched | High | |
| **Duplicate prevention**| Rapid fire submit | Only one record is created | High | |
