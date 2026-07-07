# 01. Medical System Overview

## Purpose of Medical and Precision Health in FitCore

FitCore acts as an AI fitness command center, and a comprehensive understanding of a user's health context is crucial for effective and safe guidance. The purpose of integrating medical and precision health context is to enhance personalization, prevent injury, and improve recovery by allowing FitCore to account for real-world health variables.

Medical context within FitCore is treated strictly as a **support layer**. It exists to inform training, nutrition, and recovery systems, not to serve as the primary product offering.

## Why Medical Context Matters

Understanding medical context allows the AI to:
- **Training:** Modify suggested exercises to avoid aggravating known injuries (e.g., swapping barbell squats for leg presses if a user has a lower back issue).
- **Nutrition:** Avoid suggesting foods a user is allergic to or that might negatively interact with reported medications.
- **Recovery:** Interpret sleep or fatigue data more accurately (e.g., recognizing that disrupted sleep might be related to a known chronic condition rather than poor habits).
- **AI Recommendations:** Provide generally safer and more realistic goals by recognizing a user's physical limitations.

## Boundaries Between Wellness Guidance and Medical Guidance

FitCore operates strictly within the realm of wellness and fitness guidance.

**Wellness Guidance (Allowed):**
- Suggesting a deload week due to high accumulated fatigue.
- Recommending mobility work for reported stiffness.
- Highlighting that a specific exercise might be risky given a past injury and suggesting an alternative.

**Medical Guidance (Forbidden):**
- Diagnosing a condition based on symptoms.
- Suggesting a treatment plan for an injury.
- Recommending medication changes.
- Claiming a user is "medically cleared" for an activity.

## Current vs. Future Product Status

The vast majority of features described in this book are **Future** or **Planned**. Currently, FitCore may handle basic pain or soreness modifiers (covered in Book 3 and Book 7), but robust medical profiling, genetic integration, and advanced precision health features are not yet implemented. This book sets the required constraints for when those features are built.

## Data Categories

FitCore may eventually handle the following categories of medical data:
- Injuries
- Pain
- Surgeries
- Allergies
- Medications
- Diagnosed conditions
- Blood type
- Emergency profile
- Family history
- Genetic traits
- Lab results/future biomarkers
- Clinician notes/future uploads

## Non-Goals

FitCore will strictly avoid the following:
- **No diagnosis:** FitCore will never attempt to diagnose a medical condition.
- **No treatment plans:** FitCore will not provide medical treatment plans.
- **No emergency replacement:** FitCore is not a replacement for emergency services (e.g., 911).
- **No medication prescribing:** FitCore will not prescribe or recommend specific medications.
- **No genetic deterministic predictions:** FitCore will not make deterministic claims about health outcomes based on genetics (e.g., "You will get disease X").
- **No hidden use of sensitive data:** Medical data will never be used by the AI or shared without explicit, transparent user consent.

## Medical System Feature Status

| Area | Product Purpose | Data Sensitivity | Status | Safety Level | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Basic Injury Tracking** | Avoid aggravating known injuries during training. | High | Planned | Caution | Integrates heavily with Book 3 (Training). |
| **Pain/Soreness Modifiers** | Adjust workout volume/intensity based on daily feedback. | Medium | Partial | Informational | Basic implementation exists; needs formal medical data model. |
| **Medication Tracking** | Understand potential impacts on recovery and performance. | High | Future | Caution | Requires strict "no prescribing" guardrails. |
| **Allergies** | Prevent AI from suggesting unsafe foods/supplements. | High | Planned | Stop/Modify | Critical for the Nutrition system (Book 4). |
| **Surgeries & Conditions** | Provide context for long-term limitations and capabilities. | High | Future | Caution | Must rely entirely on user-provided data. |
| **Emergency Profile** | Store critical contact and blood type info. | High | Future | Informational | |
| **Genetic Traits** | Enhance personalization of nutrition/recovery tendencies. | Extremely High | Future | Caution | Requires highest level of privacy and explainability. |
| **Lab Results Integration** | Provide biomarker context for long-term health tracking. | High | Future | Caution | Must not be used for diagnosis. |
