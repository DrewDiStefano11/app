# 03. Injuries, Pain, Red Flags, and Care Guidance

## Injury and Pain Tracking Principles

FitCore must distinguish between normal training adaptations and potential medical concerns. The system tracks these signals to protect the user from overtraining and to flag when professional evaluation might be necessary.

**Key Distinctions:**
- **Soreness (DOMS):** Normal, delayed discomfort following novel or intense exertion. Generally safe to train through lightly.
- **Fatigue:** General systemic or localized tiredness. Affects readiness but is not an injury.
- **Pain:** Sharp, acute, or localized discomfort that occurs during or immediately after movement. Often indicates poor mechanics or tissue overload.
- **Injury:** Documented tissue damage (e.g., sprain, strain, tear) or a condition requiring modification of activity for healing.
- **Medical Red Flag:** Symptoms that suggest severe injury, systemic illness, or a life-threatening condition requiring immediate medical attention.

## Handling Specific Scenarios

FitCore should handle reported symptoms and histories according to these guidelines:

- **Past Surgeries (e.g., ACL/Knee history):** AI should ask about lingering limitations and proactively suggest appropriate warm-ups or exercise modifications (e.g., favoring low-impact cardio).
- **Pain During Training:** AI must suggest stopping the specific movement immediately and offer an alternative that does not load the affected area.
- **Swelling/Limited Range of Motion:** AI should suggest resting the area and monitoring for improvement, potentially advising against loading the joint until swelling subsides.
- **Weakness/Asymmetry:** AI can suggest unilateral work to address the imbalance, provided there is no acute pain.
- **Returning to Sport/Activity:** AI should enforce a conservative progression model, avoiding sudden spikes in volume or intensity.
- **Recurring Pain:** AI should flag chronic issues and recommend seeking a physical therapist (PT) or doctor.

**Red Flags (Strict Escalation Required):**
- Sudden, sharp, severe pain.
- Neurological symptoms (numbness, tingling, radiating pain).
- Chest pain, severe shortness of breath, or unexplained dizziness.
- Severe allergic reactions (anaphylaxis symptoms).
- Head injury or concussion symptoms (nausea, confusion, light sensitivity).

## Red-Flag Checklist Concept

The Red-Flag Checklist is a conceptual future feature where the AI briefly pauses to ask the user standard safety questions if they report concerning symptoms, determining if the issue requires immediate escalation rather than just a workout modification.

## Care Guidance Levels

FitCore uses a tiered escalation framework based on the severity of the reported data:

1.  **Monitor:** Minor soreness or fatigue. (Action: Note it, proceed normally or slightly reduce intensity).
2.  **Reduce Load:** Moderate fatigue or mild discomfort. (Action: Decrease weight/volume, suggest easier variations).
3.  **Stop Workout (or specific movement):** Acute pain during an exercise. (Action: Halt the movement, find an alternative, or end the session).
4.  **Consider PT/Doctor:** Chronic, recurring pain, or failure to improve with rest. (Action: Suggest professional evaluation; do not diagnose).
5.  **Seek Urgent Medical Care:** Concerning symptoms that need prompt attention (e.g., potential fracture, severe sprain). (Action: Strong recommendation to see a doctor soon).
6.  **Emergency Care:** Life-threatening red flags (chest pain, stroke symptoms, severe allergic reaction). (Action: Instruct user to stop all activity and call emergency services).

## AI Behavior and Rules

When dealing with pain or injuries, the AI must strictly adhere to these rules:
- **Explain the Trigger:** Always explain what data triggered the safety response (e.g., "Because you reported sharp knee pain yesterday...").
- **Avoid Diagnosis:** Never say "You have a torn meniscus." Say "That sounds like sharp knee pain."
- **Recommend Professional Care:** Always err on the side of suggesting a doctor or PT when symptoms are concerning or persistent.
- **Never Hide Uncertainty:** If the AI is unsure how a limitation affects an exercise, it must say so and suggest caution.

## Training Integration Table

| Signal | Possible Concern | FitCore Response | User-Facing Wording Style | Escalation Level | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Delayed onset muscle soreness (quads) | Normal DOMS | Proceed, maybe light activity to flush. | "Looks like your quads are sore. Let's stick to the plan but warm up well." | 1 (Monitor) | Handled by Book 3/7 logic. |
| Dull ache in shoulder after 3 weeks of pressing | Overuse / Tendinopathy | Suggest swapping barbell for dumbbells; reduce volume. | "Since your shoulder is aching, let's try dumbbells today to see if that feels better." | 2 (Reduce Load) | |
| Sharp pain in lower back during deadlift | Acute strain or disc issue | Stop the deadlift immediately. No heavy spinal loading. | "Stop that movement immediately. Let's avoid loading your back for the rest of today." | 3 (Stop Workout) | Must log the incident for future context. |
| Tingling/numbness radiating down leg | Nerve involvement (Sciatica) | Stop loading; recommend medical evaluation. | "Numbness is a red flag. I strongly suggest you skip training your legs/back today and consult a doctor." | 4 (Consider PT/Doctor) | Clear red flag. |
| Sudden chest pain and dizziness mid-workout | Cardiac event | Immediate stop; emergency prompt. | "Stop immediately. Chest pain and dizziness are severe red flags. Please seek emergency medical help right away." | 6 (Emergency Care) | Overrides all wellness logic. |
