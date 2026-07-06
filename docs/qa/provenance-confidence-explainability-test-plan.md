# Provenance, Confidence, and Explainability Test Plan

## Purpose

This document outlines the testing strategy for ensuring data integrity, trust, and transparency within FitCore. It focuses on the metadata attached to every logged item, ensuring that the origin (provenance), certainty (confidence), and reasoning (explainability) of data are accurately tracked and utilized.

## Scope

This plan covers all data entry points in the application, including manual user input, AI assistant (Jarvis) actions, camera-based estimations, and data lifecycle events like imports/exports.

## Core QA Principles

- **Total Traceability:** Every data point must have a known source and timestamp.
- **Trust Calibration:** High-confidence data is treated as truth; low-confidence data requires user verification.
- **Transparency:** The user should always know _why_ a piece of data exists and _how_ it was generated.
- **Safety First:** AI should never overwrite user-confirmed data without explicit permission.

## Test Matrix

| Feature / Action             | Source/Provenance | Confidence Level      | Confirmation State     | AI/Coaching Eligibility    |
| :--------------------------- | :---------------- | :-------------------- | :--------------------- | :------------------------- |
| Manually log workout set     | `manual`          | `1.0` (High)          | `confirmed`            | Eligible                   |
| Jarvis logs workout set      | `ai`              | `0.9` (High)          | `pending_confirmation` | Restricted until confirmed |
| Undo Jarvis set log          | `audit_rollback`  | N/A                   | `deleted`              | Removed                    |
| Log meal manually            | `manual`          | `1.0`                 | `confirmed`            | Eligible                   |
| Estimate food from camera    | `camera`          | Variable (0.5 - 0.8)  | `pending_confirmation` | Restricted                 |
| Correct AI macro estimate    | `manual_edit`     | `1.0`                 | `confirmed`            | Eligible                   |
| Weigh-in                     | `manual`          | `1.0`                 | `confirmed`            | Eligible                   |
| Complete daily check-in      | `manual`          | `1.0`                 | `confirmed`            | Eligible                   |
| Add soreness/tiredness notes | `manual`          | `1.0`                 | `confirmed`            | Eligible                   |
| Import/Restore data          | `system_import`   | Preserved from source | Preserved              | Eligible                   |

## Explainability Checks

- **Source Labeling:** Does the UI clearly indicate if a log was created by Jarvis vs. the User?
- **Confidence Indicators:** Are low-confidence AI estimates (e.g., from camera) visually flagged?
- **Audit Trail:** In the data model, is the `source` field correctly populated for every transaction?
- **Impact Explanation:** Does Jarvis explain how a new log (e.g., a high-soreness note) affects future recommendations?

## Regression Risks

- **Metadata Loss:** Updates to the data schema might accidentally drop `source` or `confidence` fields.
- **Overwriting Truth:** Jarvis might incorrectly overwrite manual logs if logic is not strictly partitioned.
- **Import/Export Corruption:** Metadata might be lost during JSON serialization/deserialization.
- **State Desync:** The UI might show a "Confirmed" status while the underlying state remains "Pending".

## PR Review Checklist

- [ ] Does the new feature include `source` and `confidence` metadata in its state updates?
- [ ] Are audit patches generated for all data-modifying actions?
- [ ] Does the UI distinguish between user-entered and AI-suggested values?
- [ ] Is there a mechanism for users to confirm or correct AI-generated data?
- [ ] Are tests included for both the "Happy Path" (accurate estimation) and "Correction Path" (user edit)?
- [ ] Does the change respect `FITCORE_DATA_VERSION`?
