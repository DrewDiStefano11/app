# 02. Medical Profile and Health History

## The Future Medical Profile Concept

The Medical Profile is a planned centralized location within FitCore where users can voluntarily store and manage their health history. It is designed to act as a secure, private repository that informs the AI's understanding of the user's physical capabilities and limitations. It is strictly a support layer, ensuring the core fitness and nutrition functions operate safely within the user's specific health context.

## Information Users May Store

When fully implemented, the Medical Profile may allow users to track:

- Age, sex, and body context (only when relevant to specific physiological models).
- Emergency contacts.
- Allergies (food, medication, environmental).
- Medications (current and historical, including dosages if provided).
- Surgeries (past procedures, dates, affected areas).
- Injuries (historical and active, including severity and affected areas).
- Chronic conditions (e.g., asthma, diabetes, hypertension).
- Blood type.
- Limitations or restrictions (e.g., "cannot lift overhead," "must avoid high-impact cardio").
- Family medical history.
- Clinician notes (summaries or future document uploads).

## User Control Rules

Because medical data is highly sensitive, the Medical Profile is subject to strict user control requirements:

- **Optional by Default:** The Medical Profile is entirely optional. FitCore must function effectively even if a user chooses to provide zero medical data.
- **Clear Edit/Delete:** Users must have the ability to easily view, edit, and permanently delete any medical record they have entered.
- **Explicit Permission:** Before the AI can use any data from the Medical Profile to formulate a recommendation, the user must explicitly grant permission.
- **Category-Level Toggles:** Users should be able to enable or disable AI access on a per-category basis (e.g., allowing the AI to see injuries, but hiding medication history).
- **Local-Only Mode:** Sensitive health records should support a "local-only" storage mode, meaning they are never synced to the cloud, even if other app data is.

## Data Model Expectations

Any data structure created to support the Medical Profile must adhere to the data philosophy outlined in [Book 2](../book-02-system-architecture/README.md) and include the following attributes:

- **Timestamp:** When the record was created or last updated.
- **Source:** Where the data came from (e.g., Manual entry, Apple Health import, AI inference).
- **Confidence:** A rating (0.0 - 1.0) of how certain the system is about the data (e.g., manual entry = 1.0, AI inference = 0.6).
- **User-Confirmed Flag:** A boolean indicating if the user has explicitly reviewed and verified the data.
- **Active/Resolved Status:** Primarily for injuries and conditions (e.g., is this a current acute injury or a resolved historical one?).
- **Severity:** A standardized scale (e.g., mild, moderate, severe) to gauge impact.
- **Affected Body Area:** Crucial for linking injuries/surgeries to training modifications.
- **Related Impact:** Explicitly defined links to training, recovery, or nutrition systems.
- **Notes:** Free-text field for user or clinician context.

## Cross-Screen Behavior

The Medical Profile is intended to influence other areas of the app invisibly, surfacing only when necessary for safety or explanation.

- **Influence, Don't Overcrowd:** Medical context may influence training safety warnings, recovery suggestions, and readiness explanations, but the raw medical data should not overcrowd normal screens (like the active workout view).
- **Careful Summarization:** When sensitive context must be shown, it should be summarized carefully (e.g., "Adjusted due to reported shoulder limitation" rather than displaying the full clinical history of the injury).

## Future Data Schema Table (Conceptual)

*Note: This table represents the conceptual requirements, not actual implementation code.*

| Field | Type | Description | Required? |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Unique identifier for the medical record. | Yes |
| `type` | Enum | Category (e.g., `injury`, `medication`, `allergy`). | Yes |
| `name` | String | User-facing name (e.g., "Peanut Allergy", "Torn ACL"). | Yes |
| `status` | Enum | E.g., `active`, `resolved`, `ongoing`. | Yes |
| `severity` | Enum/Number | Level of concern or impact. | Optional |
| `affectedArea` | String/Array | Body parts involved (for injuries/surgeries). | Optional |
| `dateOccurred` | Timestamp | When the event happened or was diagnosed. | Optional |
| `provenance` | Object | Standard FitCore provenance (source, confidence, confirmed flag). | Yes |
| `aiAllowed` | Boolean | Did the user permit the AI to use this specific record? | Yes (Default False) |
| `notes` | String | Additional context. | Optional |
