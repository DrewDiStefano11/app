# 05. Genetics, Precision Health, and Risk Context

## Genetics as a Future Feature

Genetics and advanced precision health inputs (like continuous biomarker tracking or microbiome analysis) are entirely **Future** features for FitCore. They represent the highest tier of personalized data, but also carry the highest level of privacy risk and ethical responsibility.

FitCore's philosophy regarding genetics is to use it as an *informational modifier* for wellness, never as a medical diagnostic tool.

## Data Sensitivity

Genetic data is inherently immutable and uniquely identifiable. It is the most sensitive data FitCore could potentially handle. Because of this, it requires specialized handling, local-first encryption, and an absolute ban on third-party sharing or hidden AI processing.

## What FitCore May Use Genetics For (Allowed Uses)

If integrated, genetic data may only be used to provide context for general wellness:

- **General Trait Context:** E.g., fast vs. slow twitch muscle fiber dominance tendencies.
- **Recovery Tendencies:** E.g., genetic predispositions toward longer inflammation resolution times.
- **Injury Risk Context:** E.g., collagen synthesis markers that suggest a higher likelihood of tendinopathy, prompting more conservative training progression.
- **Caffeine/Sleep Sensitivity:** E.g., fast vs. slow caffeine metabolism affecting late-day supplement recommendations.
- **Nutrition Tendencies:** E.g., predispositions regarding lactose tolerance, saturated fat response, or vitamin synthesis.
- **Family History Context:** As a supporting layer to user-reported family history.
- **Medication Response (High-Level Caution Only):** E.g., flagging a known genetic pathway that *might* interact with a reported medication, strongly prompting the user to consult their doctor.

## What FitCore Must Not Do (Forbidden Uses)

FitCore must strictly avoid crossing into deterministic or diagnostic territory:

- **No Deterministic Predictions:** Never say "You will get [Disease] because you have [Gene]."
- **No Diagnosis:** Never use genetic data to diagnose an existing condition.
- **No Disease-Risk Fear Messaging:** Avoid highlighting severe, unpreventable disease risks (e.g., Alzheimer's risk markers) unless explicitly requested in a dedicated "Clinical Insights" mode, which is outside the current scope of FitCore.
- **No Medical Treatment Instructions:** Never suggest a medical treatment based on genetic data.
- **No Hidden Use:** The AI must never silently use genetic data to alter recommendations without explaining that it did so.

## User Controls

Genetic and precision health data requires the strictest user controls:

- **Opt-In Only:** Features must be entirely opt-in.
- **Local-Only Option:** Must support a fully local storage mode.
- **Category-Level Permission:** Users can allow AI access to "Nutrition Genetics" but block "Injury Risk Genetics."
- **Delete/Export:** Unrestricted right to permanently delete or export the raw data.
- **Explainability:** AI must always show "why this was used" when a genetic factor influences a recommendation.

## Confidence and Provenance

As with all FitCore data (per Book 2), genetic data must have clear provenance:

- **Source:** Where did the data come from? (e.g., "Imported from 23andMe", "User Entered").
- **Confidence/Limitations:** The AI must understand and communicate the limitations of consumer genetic testing (e.g., "This marker suggests a tendency, but lifestyle factors play a larger role").
- **Last Updated:** When the data was imported.

## Scenarios and Escalation Table

| Genetic/Precision Health Category | Possible Future Use | Forbidden Use | Required Permission | Explainability Requirement | Sensitivity Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Caffeine Metabolism** | Suggesting earlier cut-off times for pre-workout. | Diagnosing sleep disorders. | AI Nutrition/Supplement Use | "Because your genetic profile suggests slow caffeine metabolism..." | Medium |
| **Collagen Synthesis Markers** | Recommending slower progression on heavy lifting. | Diagnosing a current tendon tear. | AI Training Use | "Because your profile indicates a higher tendency for tendon stress..." | High |
| **Lactose Tolerance** | Filtering dairy out of suggested recipes. | Claiming a user has a clinical allergy without user confirmation. | AI Nutrition Use | "Excluded dairy based on your genetic lactose tolerance profile." | Medium |
| **Cardiovascular Risk Markers** | Suggesting a balanced mix of Zone 2 cardio. | Predicting a heart attack; recommending statins. | AI General Health Use | "Added Zone 2 work to support general cardiovascular health tendencies." | Extremely High |
| **Pharmacogenomics (Medication Response)** | Prompting user to discuss a supplement/medication interaction with their doctor. | Suggesting the user change their dosage. | AI Medical Context Use | "This marker can interact with X. Please discuss this with your physician." | Extremely High |
