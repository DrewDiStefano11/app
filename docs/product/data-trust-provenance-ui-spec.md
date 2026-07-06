# Data Trust & Provenance UI Spec

## Purpose

Expose the source and confidence of logged data to the user to build trust and encourage data quality.

## Product-Rule Alignment

- **Flag low confidence:** Visually distinguish AI-estimated data that needs review.
- **Explain reasoning:** Show the original text or photo used by Jarvis to generate an entry.
- **Explicit user review:** Require confirmation for low-confidence or critical data changes.

## User Problem Solved

Users feel "magic" AI logging is opaque and untrustworthy. Visible provenance allows users to verify and correct AI mistakes easily.

## UI Patterns

### 1. Confidence Indicators

- **High:** Standard appearance.
- **Medium/Low:** Subtle icon (e.g., alert-circle) or dimmed text.
- **Unconfirmed:** Highlighted state (e.g., amber border or "Needs Review" tag).

### 2. Provenance Detail Sheet

- **Original Source:** "Logged via Jarvis Voice", "Imported from Apple Health", "Manual Entry".
- **Evidence:** Show `originalText` or `assumptions` used for the entry.
- **Edit History:** "Edited by you at 2:00 PM".

### 3. Actionable Review

- "Confirm" and "Edit" buttons prominent on any unconfirmed AI-logged item.

## Implementation Zones

- **Allowed:** `src/components/app/nutrition/`, `src/components/app/training/`, `src/components/app/sheet.tsx`.
- **Forbidden:** `src/lib/fitcore-data.ts` (Logic only).

## Acceptance Criteria

- Unconfirmed logs are visually distinct.
- Tapping a log entry shows its provenance and confidence metadata.
- Users can confirm or correct an AI estimate with one tap.
- Deleting an AI-logged item provides an "Undo" option that restores the state perfectly.

## Future Checklist

- [ ] Implement project-wide "Review Queue" for all unconfirmed AI items.
- [ ] Add "Source" icons to all log list items.
- [ ] Visual history of edits for high-impact logs (e.g., bodyweight).
