# 04. Medications, Allergies, Surgeries, and Conditions

## Representation and Sensitivity

Medications, allergies, surgeries, and chronic conditions represent highly sensitive personal health information. They must be explicitly provided by the user (or imported with explicit permission) and stored securely. This data fundamentally alters the baseline assumptions FitCore makes about a user's physiology and capabilities.

## Cross-System Impact

These data categories can significantly affect:
- **Training Safety:** Certain medications affect heart rate (e.g., beta-blockers), invalidating standard HR zones. Surgeries create mechanical limitations.
- **Recovery/Readiness:** Conditions like autoimmune disorders can drastically alter recovery timelines.
- **Nutrition Guidance:** Food allergies restrict diet options; conditions like diabetes alter macro-nutrient processing.
- **Hydration & Supplements:** Medications may have contraindications with common supplements (e.g., caffeine, creatine) or require increased hydration.
- **Sleep:** Medications or conditions may cause insomnia or altered sleep architecture.
- **Wearable Interpretation:** A resting heart rate of 50 bpm might be excellent fitness for one user, but a medication side effect for another.

## Medication Rules

If FitCore supports medication tracking in the future, it must follow these strict rules:
- **User-Provided Only:** Store only information the user explicitly provides or imports with explicit permission.
- **No Prescribing:** Never suggest starting, stopping, or changing a medication.
- **Warn to Consult:** Always warn the user to consult a pharmacist or doctor for questions about medication interactions or side effects.
- **Track Metadata:** Track the source, date added, and dosage *only* if the user provides it.
- **AI Caution:** AI may note that a medication *might* cause a symptom (e.g., "Medication X is known to sometimes cause fatigue"), but must not declare it as the definitive cause.

## Allergy Rules

Allergies (especially food and severe environmental) require zero-tolerance handling:
- **Highlight Relevance:** Clearly indicate when an allergy is relevant to food or supplement suggestions.
- **Prevent Unsafe Suggestions:** The AI must *never* suggest a food or supplement that conflicts with a known allergy. This is a hard constraint on the Book 4 Nutrition system.
- **Emergency Relevance:** Severe allergies (e.g., carrying an EpiPen) should be highlighted in the emergency profile.

## Surgery Rules

Surgical history dictates structural and mechanical realities for the user:
- **Inform Restrictions:** Surgery history must inform training restrictions (e.g., "Avoid heavy axial loading due to L5-S1 spinal fusion").
- **Recovery Context:** Recent surgeries drastically alter readiness scores and recovery expectations.
- **Required Data:** A complete surgery record should include: date, body area, procedure name, current status (healing vs. fully recovered), specific restrictions, rehab notes, and user notes.

## Conditions Rules

Chronic or diagnosed conditions provide a vital lens through which the AI views user data:
- **User-Controlled:** Condition tracking must be entirely user-controlled and marked as highly sensitive.
- **Adapt Tone and Caution:** The AI can adapt its tone and increase its caution based on a condition (e.g., being more conservative with intensity progressions for a user with chronic fatigue syndrome).
- **No Diagnosis or Override:** The AI must never diagnose a condition, and must never override guidance provided by the user's clinician.

## Future State Data Tables (Conceptual)

*Note: These tables represent conceptual requirements, not actual implementation code.*

### Medications

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | E.g., "Lisinopril" |
| `dosage` | String | E.g., "10mg daily" (Optional) |
| `purpose` | String | E.g., "Blood pressure" (Optional) |
| `aiConstraint` | Enum | E.g., `alters_hr`, `requires_hydration` |

### Allergies

| Field | Type | Description |
| :--- | :--- | :--- |
| `allergen` | String | E.g., "Peanuts", "Penicillin" |
| `severity` | Enum | E.g., `mild`, `severe`, `anaphylactic` |
| `type` | Enum | E.g., `food`, `medication`, `environmental` |

### Surgeries

| Field | Type | Description |
| :--- | :--- | :--- |
| `procedure` | String | E.g., "ACL Reconstruction" |
| `affectedArea` | String | E.g., "Right Knee" |
| `date` | Timestamp | When the surgery occurred |
| `restrictions` | String | E.g., "No deep squats past 90 degrees" |

### Conditions

| Field | Type | Description |
| :--- | :--- | :--- |
| `condition` | String | E.g., "Type 1 Diabetes" |
| `status` | Enum | E.g., `active`, `managed`, `remission` |
| `impactAreas` | Array | E.g., `['nutrition', 'recovery']` |
