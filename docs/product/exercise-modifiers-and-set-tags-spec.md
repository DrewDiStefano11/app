# Exercise Modifiers and Set Tags Spec

## Purpose

Capture the nuances of training that weight and reps alone cannot describe. Modifiers and tags provide high-fidelity context to training data, enabling more accurate AI coaching and progression analysis.

## Product Rule Alignment

- **Reduce Logging Friction:** Simple, one-tap toggles for common tags; smart defaults for exercise-level modifiers.
- **Improve Trust:** Distinguishing between a "warmup" and a "top set" ensures strength trends aren't skewed by sub-maximal work.
- **Connect Training & Recovery:** The "Pain/Discomfort" flag creates a direct bridge to the recovery domain.

## User Problems Solved

- Warmup sets "polluting" personal record (PR) and volume charts.
- No way to track training intensity techniques (drop sets, failure).
- Inability to distinguish between bilateral and unilateral variations without creating separate exercises.
- Losing context on _how_ a set felt (e.g., "knee felt weird").

## Modifier Model

Modifiers can exist at two levels:

1.  **Set-level:** Applies only to a specific set (e.g., "Set 4 was a drop set").
2.  **Exercise-level:** Applies to all sets within that exercise for the current workout (e.g., "This whole exercise was performed unilaterally today").

### Supported Modifiers

- **warmup:** Excludes the set from PR calculations and volume-load totals where appropriate.
- **drop set:** Indicates a subsequent set performed with lower weight immediately after a primary set.
- **unilateral:** Tracks left/right side performance separately (or flags that the weight is per-side).
- **failure:** Flags that the user could not complete another rep with good form.
- **partials:** Reps performed with a limited range of motion at the end of a set.
- **paused:** Specific focus on the isometric/stretched portion of the lift.
- **tempo:** Indicates a specific eccentric/concentric speed was followed.
- **machine:** Metadata for exercise variation.
- **bodyweight:** Weight is the user's own body mass.
- **assisted:** Weight is subtracted from bodyweight (e.g., assisted pull-up).
- **pain/discomfort:** A critical flag for the recovery engine.

## Set-Level Behavior

- **Non-Inheritance:** Set-level modifiers (like "drop set" or "failure") do not automatically apply to the next set.
- **Visual Badge:** Active tags appear as small, high-contrast badges next to the set number.
- **Quick Action:** Long-press or tap on the set row to open the modifier menu.

## Exercise-Level Behavior

- **Global Toggle:** Modifiers like "unilateral" or "machine" can be toggled for the entire exercise.
- **Visibility:** Visible in the exercise header so the user doesn't forget the context.
- **Persistence:** These can be "sticky" (saved to a template) or one-off for the session.

## UI Behavior

- **Minimalist Default:** The logging row remains clean; modifiers are hidden behind a secondary interaction (e.g., a "..." menu or swipe) to avoid clutter.
- **Tag Cloud:** When selecting modifiers, use a clear "tag cloud" interface for fast tapping.
- **Color Coding:** Use subtle color coding (e.g., Red for "Failure", Amber for "Pain", Blue for "Warmup").

## Data/Provenance Behavior

- **Audit Trail:** Modifiers must be preserved in the `auditPatch` to allow for undo/redo and historical analysis.
- **Export Ready:** Tags are included in CSV/JSON exports for external analysis.
- **Versioned:** Modifier definitions are versioned to ensure backward compatibility as new tags are added.

## Jarvis Behavior

- **Natural Language Input:** Jarvis recognizes tags in voice/text:
  - _"Log 185 for 8, drop set"_
  - _"Mark this whole exercise as unilateral"_
  - _"That was a warmup set"_
  - _"I hit failure on the last set"_
  - _"My knee felt uncomfortable on that set"_
- **Proactive Tagging:** Jarvis can suggest tags based on performance (e.g., "That looked like a grind, mark as failure?").

## Edge Cases

- **Conflicting Tags:** Logic to prevent nonsensical combinations (e.g., a set cannot be both "assisted" and "drop set" in most common contexts, though allowed if the user insists).
- **Accidental Tags:** Easy "one-tap" removal of a tag if added by mistake.
- **Unilateral Asymmetry:** Handling cases where a user does 10 reps on the left but only 8 on the right.

## Future Implementation Checklist

- [ ] Add `modifiers` field to `ExerciseSet` type in `src/lib/types.ts`.
- [ ] Build the `SetModifierPicker` sheet component.
- [ ] Update volume/PR calculation logic to respect the `warmup` tag.
- [ ] Implement "Left/Right" split logging for unilateral sets.
- [ ] Create the visual badge system for the `SetRow` component.
