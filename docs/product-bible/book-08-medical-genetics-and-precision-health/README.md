# Book 8: Medical, Genetics and Precision Health

## Purpose

The purpose of Book 8 is to define the long-term product direction, safety boundaries, privacy rules, data model expectations, explainability requirements, and implementation constraints for medical history, injury context, genetics, medications, conditions, surgeries, allergies, red flags, clinician-facing exports, and future precision health features in FitCore.

## Scope of Book 8

**What Book 8 Owns:**
- Medical profile data models (injuries, pain, surgeries, allergies, medications, diagnosed conditions, blood type, emergency profile, family history).
- Genetic and precision health future feature boundaries.
- Data privacy rules specific to sensitive health records.
- User control boundaries for sharing, storage, and AI use of medical data.
- AI safety, explainability, and escalation rules regarding symptoms and medical context.
- The separation between wellness guidance and medical guidance.

**What Book 8 Does Not Own:**
- General training programming (Owned by [Book 3](../book-03-training-system/README.md)).
- Meal logging and macros (Owned by [Book 4](../book-04-nutrition-system/README.md)).
- General recovery, sleep, and wearables (Owned by [Book 7](../book-07-recovery-sleep-and-wearables/README.md)).
- Broad analytics and the Health Twin (Likely a future [Book 9]).

## Current vs Future Status

The features described in this book are predominantly **Future**, **Planned**, or **Not Yet Implemented**. This book establishes the architectural constraints and safety rules required *before* any implementation of these features occurs. Do not assume medical, genetic, or advanced precision health features are currently functional in FitCore based on this document.

## Chapters

- [01. Medical System Overview](./01-medical-system-overview.md)
- [02. Medical Profile and Health History](./02-medical-profile-and-health-history.md)
- [03. Injuries, Pain, Red Flags, and Care Guidance](./03-injuries-pain-red-flags-and-care-guidance.md)
- [04. Medications, Allergies, Surgeries, and Conditions](./04-medications-allergies-surgeries-and-conditions.md)
- [05. Genetics, Precision Health, and Risk Context](./05-genetics-precision-health-and-risk-context.md)
- [06. Medical Data Privacy, Permissions, and Local-Only Rules](./06-medical-data-privacy-permissions-and-local-only-rules.md)
- [07. AI Medical Safety, Explainability, and Escalation](./07-ai-medical-safety-explainability-and-escalation.md)

## Relationship to Other Books

- **[Book 2: System Architecture, Data Philosophy, and AI Memory](../book-02-system-architecture/README.md)** remains the authority for general architecture, data routing, provenance, and confidence. Book 8 relies on Book 2's foundation for handling sensitive medical records.
- **[Book 3: Training System](../book-03-training-system/README.md)** remains the authority for training. Book 8 defines how injury context and medical safety limits can modify those training suggestions.
- **[Book 4: Nutrition System](../book-04-nutrition-system/README.md)** remains the authority for nutrition. Book 8 defines how allergies or medication interactions might constrain nutrition advice.
- **[Book 7: Recovery, Sleep and Wearables](../book-07-recovery-sleep-and-wearables/README.md)** remains the authority for recovery data. Book 8 defines the escalation path when recovery signals indicate potential medical concerns or red flags.
- **Book 9: Analytics, Insights and Health Twin (Future)** will handle macro-level synthesis, while Book 8 defines the specific constraints on raw medical/genetic data inputs used for those insights.

## Strong Safety Statement

FitCore must not diagnose. FitCore may help organize information, identify red flags, suggest caution, recommend professional care when appropriate, and explain why a recommendation was made. It must never replace a licensed medical professional, emergency services, or formal medical care.

## Privacy Statement

Medical, genetics, photos, sensitive health records, and conversations require extra user control, clear permission, deletion/export support, and local-only options. These data categories are treated as highly sensitive by default. FitCore must not silently ingest, share, or analyze this data without explicit, granular user consent.
