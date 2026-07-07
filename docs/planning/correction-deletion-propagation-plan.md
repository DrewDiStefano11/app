# Correction & Deletion Propagation Plan

## Purpose
This document details how data corrections and deletions must cascade through the FitCore system. To maintain the "no-wasted-data" principle and ensure accuracy, modifications to base logs must correctly invalidate or update derived calculations, dashboard graphs, and AI memory. Note: This is a planning document only; these systems are not yet implemented.

## Why Corrections and Deletions Must Propagate
If a user corrects a faulty AI meal estimate or deletes an accidental weigh-in, failing to propagate this change leads to desynced dashboards, corrupted FitCore Scores, and AI hallucinations based on deleted context.

## Data Types Affected
- Meal entries
- Macro estimates
- Weigh-ins
- Check-ins
- Workout sessions
- Exercise sets
- Workout notes
- Pain/soreness/tiredness notes
- Recovery metrics
- Sleep metrics
- Wearable imports
- Medical profile data
- Photos
- AI/Jarvis conversation-derived logs
- Demo/test account seed data

## Correction Rules
- **Base Update:** The primary record is updated with the new values.
- **Provenance Preservation:** If correcting an AI estimate, the original estimate metadata is preserved for model training feedback, but the log status becomes 'user_corrected'.
- **Cascade Trigger:** Updating a base record must trigger recalculation of any derived metrics (e.g., daily totals, FitCore Score) for that specific day or time period.

## Deletion Rules
- **Hard Deletion (User Data):** Deleting a manual or verified log permanently removes it from the user's active database and cascades to derived metrics.
- **Orphan Cleanup:** Deleting a parent record (e.g., a Workout session) must cascade-delete all child records (e.g., Exercise sets, Workout notes).

## Derived Data Invalidation Rules
- Derived calculations (e.g., total daily calories, weekly averages, FitCore Score) must be invalidated and recalculated immediately upon correction or deletion of underlying data.
- Caching layers must be explicitly busted for the affected time period.

## Graph/Dashboard Update Rules
- Dashboards must reflect corrections/deletions immediately via reactive state updates or forced refetches.
- UI must not display stale data that contradicts the source of truth.

## AI/Jarvis Memory Update Rules
- Corrections: AI memory must immediately adopt the corrected values.
- Deletions: AI must forget the deleted context entirely.
- If a conversation referenced deleted data, the AI must not re-surface it.

## Export/Delete Account Implications
- All propagation mechanisms must hook into the final "Delete Account" flow to ensure complete wiping across all related tables, AI contexts, and caches.

## Demo/Test Account Separation
- Corrections/deletions in demo mode must strictly operate within the isolated demo state and never propagate to real user databases or real AI memory.

## Edge Cases
- **Offline Modifications:** Corrections made offline must queue and propagate correctly upon reconnection, resolving conflicts based on timestamp.
- **Wearable Sync Overwrites:** If a user corrects wearable data, the next sync must not overwrite the user's correction unless explicitly permitted.

## Failure Examples
- User deletes a faulty 10,000-calorie meal, but the dashboard still shows a massive surplus.
- User changes their weight from 200lbs to 180lbs, but the AI still recommends macros for a 200lb person.
- Deleting an account leaves orphaned photos or AI conversation history in the database.

## Future Implementation Checklist
- [ ] Implement robust cascade delete/update mechanisms in the database/ORM layer.
- [ ] Build a derived-metric recalculation queue.
- [ ] Ensure state management (e.g., React Context/Zustand) reacts to these invalidations.
- [ ] Hook AI memory purge functions into the standard delete flows.
- [ ] Build offline sync resolution for edits.

## Final Propagation Matrix

| Data Type | Correction Behavior | Deletion Behavior | Derived Impact |
|---|---|---|---|
| Meal entries | Update base, keep AI metadata | Remove, calc daily totals | High |
| Macro estimates | Update, flag as user_corrected | Remove | High |
| Weigh-ins | Update | Remove | Modifies trends |
| Check-ins | Update | Remove | Modifies trends |
| Workout sessions | Update, cascade to sets | Remove, cascade to sets | Modifies score |
| Exercise sets | Update | Remove | Modifies volume |
| Workout notes | Update | Remove | AI memory only |
| Pain/soreness | Update | Remove | AI memory only |
| Recovery metrics | Update | Remove | Modifies score |
| Sleep metrics | Update | Remove | Modifies score |
| Wearable imports | Update, lock against resync | Remove | Modifies totals |
| Medical profile | Update, explicit consent | Remove completely | AI safety |
| Photos | Replace/Update | Hard delete from storage | Visual only |
| AI convo logs | Not applicable | Purge memory | AI context |
| Demo seed data | Update demo state | Reset demo state | None |
