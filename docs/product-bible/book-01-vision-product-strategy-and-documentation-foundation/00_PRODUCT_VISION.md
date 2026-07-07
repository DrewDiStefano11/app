# Product Vision

## North Star

FitCore is an AI-powered personal health and life operating system.

It exists to help the user understand the meaningful signals that affect health, training, nutrition, recovery, longevity, stress, decision-making, and quality of life. FitCore should not merely track what happened. It should connect signals, preserve context, explain changes, and help the user decide what to do next.

The long-term direction is a personalized Health Twin and Personal Operating Manual that learns how the user responds to training, nutrition, sleep, stress, lifestyle, environment, medical context, preferences, and major life events over years.

## Product Promise

FitCore should make the user feel:

- "I know what changed."
- "I know why it probably changed."
- "I know what to do next."
- "I trust where this recommendation came from."
- "The app remembers what matters about me."
- "Logging is worth it because the data comes back as useful intelligence."

## What FitCore Is

FitCore is:

- A local-first personal health and performance command center.
- A training, nutrition, recovery, and lifestyle intelligence layer.
- A trusted decision engine that connects user input, sensor data, AI estimates, and long-term history.
- A progressively personalized system that learns from confirmed data, corrections, experiments, and outcomes.
- A structured memory system for health-related data and life context.
- A platform that can eventually support specialized agents while preserving one coherent user-facing intelligence.

## What FitCore Is Not

FitCore is not:

- A generic habit tracker.
- A social fitness feed.
- A chart gallery.
- A medical diagnosis product.
- A content library pretending to be personalization.
- An AI chatbot detached from stored data.
- A set of isolated tabs that do not share information.

## The Core Product Loop

1. The user logs, imports, or confirms data with minimal friction.
2. FitCore preserves raw input and stores structured data separately.
3. The data routes to dashboards, metrics, AI memory, recommendations, trends, and future check-ins.
4. FitCore identifies changes, gaps, correlations, risks, and opportunities.
5. FitCore explains what happened, why it thinks it happened, and how confident it is.
6. The user edits, confirms, rejects, or acts on the recommendation.
7. FitCore learns from the outcome and improves future guidance.

## Product Scope

FitCore can include life data only when that data meaningfully affects at least one of:

- Health
- Performance
- Recovery
- Longevity
- Stress
- Decision-making
- Quality of life

Lifestyle features are in scope when they explain or influence the user's health and performance. They are out of scope when they become disconnected journaling, entertainment, social networking, or generic productivity without health relevance.

## Long-Term Health Twin Direction

The Health Twin direction means FitCore should eventually model:

- Baseline physiology and normal ranges for the user.
- Training response by exercise, muscle group, volume, intensity, and context.
- Nutrition response by macros, timing, food type, adherence, hunger, cravings, and body composition goals.
- Recovery response by sleep, stress, soreness, illness, environment, and life load.
- Medical and health context, including labs, conditions, medications, documents, and red flags.
- Lifestyle context, including work, travel, calendar load, screen time, environment, and emotional state.
- Decision history, failed experiments, successful interventions, and preference patterns.

The Health Twin should compare the user primarily to their own history. Scientific norms and population ranges can provide context, but FitCore's strongest value is understanding the individual.

## Relationship To Existing Current-State Docs

Book 1 sets the long-term direction. Current implementation details remain in existing docs:

- Current app goals and near-term batches: [product execution roadmap](../../product/fitcore-execution-roadmap.md)
- Current data storage and flow: [data flow audit](../../data-flow-audit.md)
- Local-first backup model: [data safety and backup](../../data-safety-and-backup.md)
- QA expectations: [automated testing](../../automated-testing.md) and [merge checklist](../../qa/fitcore-merge-checklist.md)
