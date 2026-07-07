# Onboarding, Settings, and User Control

## Onboarding Purpose

Onboarding should capture enough context to make FitCore useful without making setup feel heavy.

FitCore should earn more context over time. Early onboarding should collect the minimum useful information, explain why sensitive information is requested, and let the user skip or return later where safe.

## Onboarding Areas

| Area | Purpose |
| :--- | :------ |
| Goals | Understand training, nutrition, recovery, body composition, performance, health, or lifestyle priorities. |
| Body metrics | Establish baseline height, weight, age range, sex where relevant, and body composition context when appropriate. |
| Training experience | Understand ability level, current routine, preferences, history, and constraints. |
| Nutrition goal phase | Understand maintenance, fat loss, muscle gain, performance fueling, or other nutrition context. |
| Injury limitations | Capture pain, limitations, and safety constraints without implying diagnosis. |
| Schedule | Understand workout availability, meal rhythm, sleep patterns, and realistic adherence windows. |
| Equipment | Understand gym, home, travel, and available exercise options. |
| Wearable/health integrations | Connect optional sources and explain what data they provide. |
| AI memory preferences | Let users control what the AI assistant may remember or use. |
| Privacy preferences | Let users manage sensitive data use, storage, and visibility. |
| Notification preferences | Let users choose reminders, coaching nudges, and quiet periods. |

## Progressive Onboarding

Progressive onboarding should:

- Ask only what is needed early.
- Allow skipping where safe.
- Fill gaps later through natural use.
- Explain why sensitive information is requested.
- Avoid long forms before the user sees value.
- Avoid hiding critical privacy and AI memory choices.
- Use follow-up prompts when missing context limits a recommendation.

## Settings UX

Settings should be easy to find from the Hub or gear area.

| Setting Area | UX Requirement |
| :----------- | :------------- |
| Profile | Shows user-editable baseline information and goal context. |
| Privacy | Should not be buried; sensitive controls should be understandable and deliberate. |
| AI memory | Should explain what memory means, what can be remembered, and how to change it. |
| Notifications | Should be adjustable by category and timing. |
| Data export/deletion | Should be clear, deliberate, and protected by confirmation. |
| Integrations | Should show connection status, last sync where available, and data types used. |
| Corrections | Should make user-corrected values easy to find when relevant. |

## User Control Requirements

FitCore should make user control visible and practical:

- User can edit logged data.
- User can correct AI estimates.
- User can reject AI suggestions.
- User can see why AI knows something when feasible.
- User can manage sensitive data.
- User can control what data is used for memory/recommendations.
- User can disconnect integrations.
- User can distinguish AI-estimated values from confirmed values.

## Safety and Privacy Expectations

- Sensitive health, photo, medical, and AI memory settings need extra clarity.
- Deletion/export actions need confirmation.
- Do not use dark patterns.
- Do not make AI memory feel hidden.
- Do not pressure users into sharing optional sensitive data.
- Do not make privacy controls harder to use than the features that collect data.

## Cross-Book Boundaries

Book 5 owns onboarding, settings, and control-surface UX. Book 2 owns the underlying privacy, memory, provenance, and data architecture principles. Books 3 and 4 own training and nutrition domain requirements that onboarding may collect or display.
