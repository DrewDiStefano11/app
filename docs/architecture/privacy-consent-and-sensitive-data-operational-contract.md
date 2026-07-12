# FitCore Privacy, Consent, and Sensitive-Data Operational Contract

## 1. Purpose and Limits

This document establishes the canonical runtime-facing contract for how FitCore handles personal data, sensitive health data, local-only data, cloud synchronization, AI context use, AI memory, explicit consent, sensitive unlock, data-source explanations, exports, deletion, retention, imported records, wearable records, photos, conversations, and emergency and medical information.

**This is not legal advice.** This document does not claim or establish HIPAA, GDPR, CCPA, medical-device, or other regulatory compliance. Its scope is purely technical and product-focused.

The intended readers are runtime implementers, privacy-feature reviewers, UI designers, AI and Jarvis developers, wearable developers, import/export developers, and test authors. This contract guides runtime code and tests to ensure consistent product behavior and technical enforcement of privacy rules.

**Definitions:**
*   **Privacy:** The overarching framework controlling data visibility and sharing.
*   **Security:** The mechanisms protecting data from unauthorized access.
*   **Consent:** Explicit user authorization for specific data uses.
*   **User Preference:** General settings that guide behavior but may be overridden by stricter mandatory privacy constraints.

## 2. Current Implementation Snapshot

*   **Inspected Main SHA:** `d8d635683c2588a09ab3167a6d129d5899fdf977`
*   **Privacy-related source files on main:**
    *   No dedicated privacy policy engine currently exists on `main` (e.g., `src/lib/privacy-policy.ts` is absent).
*   **Relevant open PRs:**
    *   `remotes/origin/feat-privacy-policy-3536910500190315346` (Implements `src/lib/privacy-policy.ts` and `src/lib/privacy-policy-defaults.ts`)
    *   `remotes/origin/privacy-data-control-foundation-10056088835897202161`
    *   `remotes/origin/docs/privacy-and-ai-data-governance-planning-5921409764558806377`
*   **Settings surfaces:** `src/components/app/views/settings.tsx` contains placeholders for planned privacy modes, such as "Planned mode for privacy-conscious storage limits" and "Planned full privacy policy".
*   **Persistence behavior:** All application state is persisted in `localStorage` under the key `fitcore.v1`. Data reset is available and completely clears this store.
*   **AI entry points:** Basic Jarvis interactions exist, but fine-grained AI memory and context control are pending implementation.
*   **Cloud behavior:** Currently a local-first application. Cloud syncing is not implemented.
*   **Current gaps:** The foundational privacy engine, explicit consent tracking, sensitive unlock mechanisms, and granular data classification are entirely unimplemented on `main`. All described behavior below (unless otherwise noted) reflects **Product Intent**.

## 3. Privacy Concepts

*   **Enabled:** The data category is active and being processed by the system.
*   **Collection allowed:** The system is authorized to ingest this data (e.g., from sensors or user input).
*   **Storage allowed:** The system is authorized to persist this data.
*   **Local-only:** Data must strictly remain on the local device and never be transmitted to external servers (including cloud sync).
*   **Cloud sync:** Data is authorized to be transmitted to and stored on remote FitCore servers.
*   **Current-session AI use:** Data may be included in the context window for a live AI conversation or immediate analysis, but not permanently stored by the AI.
*   **Persistent AI memory:** The AI is authorized to extract facts from this data and store them long-term in its memory profile.
*   **Explicit consent:** A distinct, affirmative user action specifically authorizing a sensitive action (e.g., sharing medical data).
*   **Sensitive unlock:** A security measure requiring re-authentication or biometric verification before accessing highly sensitive data.
*   **Export:** The ability for the user to download a complete, readable copy of their data.
*   **Deletion:** Permanent removal of data from all storage locations (local and cloud).
*   **Retention:** The policy dictating how long data is kept before automatic deletion.
*   **Source visibility:** Whether the original source of a derived fact or AI memory is identifiable and accessible to the user.
*   **Reason visibility:** The level of detail provided when explaining why a decision was made or a fact is known.
*   **Provenance:** The documented origin and history of a piece of data (e.g., "Imported from Apple Health on Date").
*   **Revocation:** The process of withdrawing previously granted consent or deleting data upon request.
*   **Category override:** A user preference modifying the default policy for a specific data category.
*   **Mandatory constraint:** A strict, hardcoded rule that cannot be overridden by user preference (e.g., medical data MUST be local-only).

## 4. Data Classification Model

*   **Ordinary Personal:**
    *   Examples: Name, age, target goals.
    *   Expected Default: Cloud sync, AI memory allowed.
    *   Local-Only Preference: Optional.
    *   Consent Expectation: Not required.
    *   Unlock Expectation: Not required.
    *   AI-Memory Expectation: Allowed.
    *   Cloud-Sync Expectation: Allowed.
    *   Source-Display Expectation: Always visible.
    *   Deletion Expectation: Allowed.

*   **Behavioral:**
    *   Examples: Past workouts, nutrition logs.
    *   Expected Default: Cloud sync, AI memory allowed.
    *   Local-Only Preference: Optional.
    *   Consent Expectation: Not required.
    *   Unlock Expectation: Not required.
    *   AI-Memory Expectation: Allowed.
    *   Cloud-Sync Expectation: Allowed.
    *   Source-Display Expectation: Always visible.
    *   Deletion Expectation: Allowed.

*   **Health-Related:**
    *   Examples: Sleep data, daily weigh-ins, body measurements.
    *   Expected Default: Cloud sync, AI memory allowed.
    *   Local-Only Preference: Optional.
    *   Consent Expectation: Not required.
    *   Unlock Expectation: Not required.
    *   AI-Memory Expectation: Allowed.
    *   Cloud-Sync Expectation: Allowed.
    *   Source-Display Expectation: Always visible.
    *   Deletion Expectation: Allowed.

*   **Highly Sensitive Health:**
    *   Examples: Medical diagnoses, allergies, DNA reports.
    *   Expected Default: **Local-only mandatory**.
    *   Local-Only Preference: Mandatory.
    *   Consent Expectation: Explicit consent required.
    *   Unlock Expectation: Sensitive unlock required.
    *   AI-Memory Expectation: Not allowed by default.
    *   Cloud-Sync Expectation: Denied.
    *   Source-Display Expectation: Hidden or on-request only.
    *   Deletion Expectation: Allowed.

*   **Biometric or Image:**
    *   Examples: Progress photos.
    *   Expected Default: Local-only preference.
    *   Local-Only Preference: Strongly recommended/default.
    *   Consent Expectation: Explicit consent required for AI processing.
    *   Unlock Expectation: Sensitive unlock expected.
    *   AI-Memory Expectation: Not allowed.
    *   Cloud-Sync Expectation: Optional.
    *   Source-Display Expectation: Hidden.
    *   Deletion Expectation: Allowed.

*   **Emergency:**
    *   Examples: Emergency contacts, critical medical flags.
    *   Expected Default: Local-only, bypass unlock in emergency mode.
    *   Local-Only Preference: Optional.
    *   Consent Expectation: Explicit consent to add.
    *   Unlock Expectation: Bypassed for emergency access.
    *   AI-Memory Expectation: Not allowed.
    *   Cloud-Sync Expectation: Optional.
    *   Source-Display Expectation: Hidden from standard AI context.
    *   Deletion Expectation: Allowed.

*   **Conversation:**
    *   Examples: Raw chat logs, voice memos.
    *   Expected Default: Cloud sync (if chat history enabled).
    *   Local-Only Preference: Optional.
    *   Consent Expectation: Optional for standard chat, explicit for voice.
    *   Unlock Expectation: Not required for standard, yes for sensitive.
    *   AI-Memory Expectation: Allowed.
    *   Cloud-Sync Expectation: Allowed.
    *   Source-Display Expectation: Always visible.
    *   Deletion Expectation: Allowed.

*   **Imported:**
    *   Examples: CSV uploads, records from third parties.
    *   Expected Default: Inherits sensitivity of target category.
    *   Local-Only Preference: Inherits target category rules.
    *   Consent Expectation: Explicit consent on import.
    *   Unlock Expectation: Inherits target category rules.
    *   AI-Memory Expectation: Inherits target category rules.
    *   Cloud-Sync Expectation: Inherits target category rules.
    *   Source-Display Expectation: Always visible.
    *   Deletion Expectation: Allowed.

*   **Wearable-derived:**
    *   Examples: Apple Health sync, continuous HR.
    *   Expected Default: Inherits sensitivity of target category.
    *   Local-Only Preference: Inherits target category rules.
    *   Consent Expectation: Explicit consent on connection.
    *   Unlock Expectation: Inherits target category rules.
    *   AI-Memory Expectation: Inherits target category rules.
    *   Cloud-Sync Expectation: Inherits target category rules.
    *   Source-Display Expectation: Always visible.
    *   Deletion Expectation: Allowed.

*   **AI-derived:**
    *   Examples: Extracted facts, generated insights.
    *   Expected Default: Inherits sensitivity of source data.
    *   Local-Only Preference: Inherits source rules.
    *   Consent Expectation: Implicit based on source.
    *   Unlock Expectation: Inherits source rules.
    *   AI-Memory Expectation: Allowed.
    *   Cloud-Sync Expectation: Inherits source rules.
    *   Source-Display Expectation: Always visible.
    *   Deletion Expectation: Allowed.

*   **Location:**
    *   Examples: GPS tracks.
    *   Expected Default: Disabled or Local-Only.
    *   Local-Only Preference: Mandatory.
    *   Consent Expectation: Explicit consent required.
    *   Unlock Expectation: Sensitive unlock required.
    *   AI-Memory Expectation: Not allowed.
    *   Cloud-Sync Expectation: Denied.
    *   Source-Display Expectation: Hidden.
    *   Deletion Expectation: Allowed.

## 5. Category Policy Matrix

| Category | Examples | Sensitivity | Enabled by Default | Local-Only Default | Cloud Sync Allowed | Current AI Use Allowed | AI Memory Allowed | Explicit Consent Required | Sensitive Unlock Required | Export Allowed | Deletion Allowed | Retention Mode | Source Visibility | Reason Visibility | Implementation Status | Source File | Unresolved Question |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Basic Profile | Name, age | Ordinary Personal | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Goals | Target weight | Ordinary Personal | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Training History | Past workouts | Behavioral | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Active Workout | Live HR, GPS | Behavioral | Yes | Yes | No | Yes | No | Yes | Yes | No | Yes | Session-only | Hidden | Hidden | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Nutrition History | Meals, macros | Behavioral | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Recovery Check-ins | Soreness, mood | Health-Related | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Sleep | Sleep stages | Health-Related | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Bodyweight | Daily weigh-ins | Health-Related | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Body Measurements | Waist size | Health-Related | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Medical History | Diagnoses | Highly Sensitive Health | Yes | Yes (Mandatory) | No | No | No | Yes | Yes | Yes | Yes | Indefinite | On-request | On-request | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Allergies | Peanut allergy | Highly Sensitive Health | Yes | Yes (Mandatory) | No | No | No | Yes | Yes | Yes | Yes | Indefinite | On-request | On-request | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Medications | Prescriptions | Highly Sensitive Health | Yes | Yes (Mandatory) | No | No | No | Yes | Yes | Yes | Yes | Indefinite | On-request | On-request | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Conditions | Diabetes | Highly Sensitive Health | Yes | Yes (Mandatory) | No | No | No | Yes | Yes | Yes | Yes | Indefinite | On-request | On-request | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Surgeries | ACL repair | Highly Sensitive Health | Yes | Yes (Mandatory) | No | No | No | Yes | Yes | Yes | Yes | Indefinite | On-request | On-request | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Emergency Contacts | Phone numbers | Emergency | Yes | Yes | No | No | No | Yes | Yes | No | Yes | Indefinite | Hidden | Hidden | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Progress Photos | Images | Biometric or Image | Yes | Yes | No | No | No | Yes | Yes | Yes | Yes | Indefinite | Hidden | Hidden | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Conversations | Jarvis chats | Conversation | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| AI Memories | Extracted facts | AI-derived | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Wearable Data | Apple Health sync | Wearable-derived | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Reduced-history | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Location | GPS tracks | Location | No | Yes | No | No | No | Yes | Yes | No | Yes | Disabled | Hidden | Hidden | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Imported Records | CSV uploads | Imported | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes | Yes | Indefinite | Always | Always | Open PR | `src/lib/privacy-policy-defaults.ts` | None |
| Genetics | DNA reports | Highly Sensitive Health | No | Yes (Mandatory) | No | No | No | Yes | Yes | Yes | Yes | Indefinite | Hidden | Low | Product Intent | None | None |
| Injury & Pain | Sore knee | Health-Related | Yes | No | Yes | Yes | Yes | No | No | Yes | Yes | Indefinite | High | High | Product Intent | None | None |
| Voice Recordings | Audio memos | Conversation | No | Yes | No | No | No | Yes | No | Yes | Yes | Transient | Hidden | Low | Product Intent | None | None |

## 6. Policy Resolution Order

When determining whether an action is permitted for a specific data item, the system must evaluate policies in the following deterministic order. The first rule that triggers a DENY overrides all subsequent allowances.

1.  **System Safety Requirements:** Is the operation technically safe and well-formed?
2.  **Mandatory Category Defaults:** Does the hardcoded system policy (e.g., `localOnly: true` for Medical History) prohibit the action? **These constraints are non-overridable.**
3.  **Local-Only Restriction:** If the data is designated as local-only (either by mandatory default or user preference), any action attempting to transmit the data off-device (including cloud sync and server-side AI processing) is DENIED.
4.  **Action-Specific Consent:** Has the user explicitly consented to this specific action (if required by the category)? If missing, DENY.
5.  **Sensitive Unlock State:** If the category requires sensitive unlock, is the device currently unlocked? If no, DENY.
6.  **User Category Settings:** Has the user disabled this specific data category or action? User preferences can make policies stricter, but cannot override mandatory restrictions.
7.  **Retention:** Has the data expired based on retention rules? If yes, it must not be used and should be deleted.
8.  **Source Visibility:** If the data is used in an AI context, ensure its source attribution follows the required visibility rules. Hidden sources must not leak through explanations.
9.  **Final Decision:** If no restrictions trigger a denial, the action is ALLOWED.

**Key Principles:**
*   **Disabled Data is Invisible:** If a data category is disabled by the user, it MUST NOT enter the AI context, generate memories, or sync to the cloud.
*   **Local-Only means Local-Only:** Local-only data must never leave the device. It cannot be synced and cannot be sent to a cloud LLM for processing.

## 7. Action Decision Matrix

| Action | Required Policy Fields | Required Consent | Required Unlock | Local-Only Implications | Denial Behavior | Explanation Behavior | Audit Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Store locally | `storageAllowed: true` | None | None | Permitted | Do not store | None | File/DB write log |
| Sync to cloud | `cloudSync: true` | None | None | **Must be false** | Keep local only | None | Network request log |
| Include in current AI context | `currentSessionAIUse: true` | Category dependent | Category dependent | **Must be false (if cloud LLM)** | Exclude from context | None | Prompt trace |
| Save as AI memory | `aiMemoryAllowed: true` | None | None | Inherits source limit | Do not save | None | Memory DB write log |
| Retrieve source detail | `sourceVisibility: visible` | None | Category dependent | None | Return generic summary | "Based on private data" | Access log |
| Show “why do you know this?” | `reasonVisibility: visible` | None | None | None | Omit source details | Provide generic reasoning | UI render log |
| Export | `exportAllowed: true` | Global export consent | Yes | Included in local export | Exclude from export | None | Export generation log |
| Delete | `deletionAllowed: true` | None | None | Deletes local copy | Action fails | None | Deletion confirmation |
| Share with coach | N/A (Feature incomplete) | Explicit per-coach | Yes | **Must be false** | Block share | None | Sharing log |
| Use for analytics | `analyticsAllowed: true` | None | None | None (if local analytics) | Exclude from analytics | None | Analytics event log |
| Use for notifications | `notificationsAllowed: true` | None | None | None | Block notification | None | Notification dispatch log |
| Use for emergency display | `emergencyDisplay: true` | None | **Bypassed** | Permitted | Hide from emergency screen | None | Emergency access log |

## 8. AI Use Versus AI Memory

**Current-Session AI Use:**
*   Data provided in the immediate prompt context to answer a specific user query or perform real-time analysis.
*   This data is temporary. It influences the immediate response but is NOT persisted by the AI system after the session ends.

**Persistent AI Memory:**
*   Facts, summaries, or conclusions extracted by the AI from source data and saved long-term in a distinct "memory" database.
*   This allows the AI to recall information across different sessions.

**Category-Level Controls:**
*   Users must be able to control AI memory generation per data category. (e.g., "Jarvis can remember my workouts, but not my weight.")

**Global Controls:**
*   Users must be able to globally pause or disable all AI memory generation, overriding individual category settings.

**Reduced-History Behavior:**
*   For high-volume continuous data (like Wearables), the AI must support a reduced-history mode where only recent trends are kept in context, and old data is actively summarized or purged.

**Temporary Use and Session-Only Behavior:**
*   For sensitive or live data (like Active Workout), data is constrained strictly to the active session. The AI can process it live but must immediately drop it when the session terminates.

**Deleting Memory vs. Deleting Source Data:**
*   These are distinct actions. A user must be able to delete a specific AI memory (e.g., "Forget that I injured my knee") without deleting the underlying source data (the medical log of the injury).
*   Conversely, deleting source data MUST trigger cascading deletion of derived AI memories.

**Prohibited Behaviors:**
*   **Remembering data when memory is disabled:** If `aiMemoryAllowed` is false for a category, the AI must strictly operate in current-session mode only for that data.
*   **Using disabled data in current context:** If a user disables a data category entirely, it must not be fed to the AI even temporarily.
*   **Reconstructing deleted memory from cached summaries:** Memory deletion must be complete and absolute.
*   **Hiding the original source category:** If an AI memory is derived from a sensitive source, that lineage must be tracked to enforce sensitive unlock and deletion rules.
*   **Treating analytics output as memory:** Analytics dashboards and AI memories are separate systems; analytics aggregations should not bypass AI memory restrictions.
