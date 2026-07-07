# Phased Roadmap

Phases describe product maturity and dependency order. They are not rigid release numbers. A future PR can prepare infrastructure for a later phase, but user-facing work should respect the dependency sequence and status labels in [03_FEATURE_INVENTORY.md](./03_FEATURE_INVENTORY.md).

## Phase 0 - Foundation

Purpose: make future FitCore work safe, modular, explainable, and data-connected before expanding feature surface.

| Area                  | Roadmap Items                                                                                                                                                                               |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data architecture     | Unified data model, global data routing, raw-log plus structured-data storage pattern, confidence/provenance framework, correlation engine foundation, personal knowledge graph foundation. |
| Platform architecture | Modular architecture, plugin/module architecture foundation, offline sync foundation, local/cloud AI architecture planning, swappable AI model planning.                                    |
| AI foundation         | AI memory framework, explainability framework, local/cloud AI planning.                                                                                                                     |
| Product foundation    | Sample/demo data framework across all tabs, user preferences, privacy and data controls.                                                                                                    |
| Integrations          | Apple Health integration foundation.                                                                                                                                                        |

Primary dependencies:

- Existing local-first storage expectations in [data safety and backup](../../data-safety-and-backup.md).
- Current data integrity expectations in [data flow audit](../../data-flow-audit.md).
- Future Book 2 architecture and data contracts.

## Phase 1 - Core Testable App

Purpose: make the core app testable, coherent, and useful across the primary health operating system loop.

| Area         | Roadmap Items                                                                                                                                                                 |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core UX      | Home dashboard, Progress/stats tab, smarter onboarding, settings redesign with collapsible cards, global preview/sample data across all tabs, basic custom dashboard support. |
| Core metrics | FitCore Score, basic data provenance.                                                                                                                                         |
| Logging      | Training logging, nutrition logging, recovery logging, workout-end notes, exercise substitutions.                                                                             |
| Data flow    | Better data transfer between all screens.                                                                                                                                     |
| AI           | Daily briefing foundation, basic AI recommendations with explanation and confidence.                                                                                          |

Primary dependencies:

- Phase 0 provenance and routing.
- Current UI shell, tab navigation, local storage, and demo data patterns.
- Test coverage in [automated testing](../../automated-testing.md).

## Phase 2 - Logging Friction Reduction

Purpose: reduce manual effort while protecting trust through editable AI drafts and approval flows.

| Area                   | Roadmap Items                                                                                                                        |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| Voice                  | Voice check-ins, voice workout logging, voice food logging.                                                                          |
| Nutrition capture      | AI food camera macro estimation, barcode food scanner, saved meals, recent meals, repeat meals.                                      |
| Daily capture          | Morning/night adaptive questionnaires, conversational logging for lifestyle, pain, symptoms, mood, hobbies, work, and daily context. |
| Nutrition and wellness | Fasting module, hydration/electrolyte tracking, supplement tracking.                                                                 |
| AI data quality        | AI missing-data detection, AI estimated-data drafts with user approval.                                                              |

Primary dependencies:

- Clear source/confidence model.
- Editable AI estimate workflow.
- Privacy controls for sensitive conversational data.

## Phase 3 - Wearables, Sensors, Recovery

Purpose: bring passive and sensor-derived signals into FitCore without creating duplicate, untrusted, or unexplained data.

| Area                   | Roadmap Items                                                                                                                        |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| Wearables              | Apple Health, Apple Watch, Apple Watch live workout screen, Fitbit, WHOOP through Noop/bridge if needed, future Garmin/Oura support. |
| Devices                | Smart scale compatibility, smart bed/sleep sensor compatibility, thermostat/air purifier/environment sensor compatibility.           |
| Training/recovery sync | Workout time-window syncing, heart rate zones, recovery/readiness timeline, muscle recovery map, sports tracking.                    |
| Sleep                  | Sleep overhaul, sleep debt, sleep need.                                                                                              |
| Health signals         | Health monitor alerts, blood pressure, blood glucose, CGM integration, ECG support.                                                  |
| Environment            | Noise, UV, sunlight, air quality, temperature, humidity, altitude, and seasonal context.                                             |

Primary dependencies:

- Integration provider research.
- Deduplication and time-window reconciliation.
- User permission and privacy controls.

## Phase 4 - AI Intelligence

Purpose: make FitCore's AI explainable, cautious, useful, and deeply personal.

| Area               | Roadmap Items                                                                                                                                                   |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Insights           | Insights Hub, daily "What Changed?" summary, natural-language insight search.                                                                                   |
| Explainability     | Explain every recommendation, AI confidence scores, AI uncertainty ranges, AI that explains why it asked a question, AI that explains when it changed its mind. |
| Learning           | Correlation engine, AI Experiment Mode, prediction engine, Personal Playbook, decision history, failed experiment memory.                                       |
| Adaptation         | Same-day context workout adjustment, Health Twin direction, Personal Knowledge Graph.                                                                           |
| Scientific context | AI learns from new scientific research, compares to scientific norms, and compares primarily to the user's own history.                                         |
| Agent architecture | Specialized AI agents plus one master AI.                                                                                                                       |

Primary dependencies:

- Book 3 AI behavior and safety.
- Provenance, confidence, and memory frameworks.
- Clear medical and safety boundaries.

## Phase 5 - Advanced Training

Purpose: evolve training from logging into context-aware coaching, equipment-aware programming, readiness forecasting, and performance intelligence.

| Area                 | Roadmap Items                                                                                                                                                                                              |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gym context          | Gym profiles, location/gym detection, equipment-aware strength tracking, machine/brand/model adjustments, cable attachment tracking, support gear tracking, gym crowded mode, machine availability memory. |
| Performance tracking | Automatic PR detection, exercise-specific readiness, exercise trend charts, volume landmarks, recovery landmarks, plateau detection, automatic deload detection.                                           |
| Workout generation   | Dynamic AI workout builder, time-based workout adaptation, adaptive warmups, mobility recommendations, structured training programs, periodization/deload automation.                                      |
| Readiness and injury | Injury prevention score, predictive injury detection, readiness forecast, muscle balance analytics, fatigue heatmaps.                                                                                      |
| Testing              | Flexibility testing, balance testing, grip strength, vertical jump, sprint speed, reaction time, coordination testing, endurance testing.                                                                  |
| Planning             | Vacation/travel mode, weekly AI planning, energy budget, goal simulator, readiness-based calendar planning, sport season planning.                                                                         |

Primary dependencies:

- Book 5 training system.
- Training data quality and exercise taxonomy.
- Safety model for injury-related recommendations.

## Phase 6 - Nutrition, Lifestyle, Daily Life

Purpose: connect nutrition and daily life context to adherence, recovery, stress, decision load, and health outcomes.

| Area                   | Roadmap Items                                                                                                                                                                                                                                                                                                                                                                   |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nutrition systems      | Behavior journal, meal planning, grocery lists, pantry tracking, pantry expiration tracking, leftover tracking, AI recipe builder, restaurant ordering suggestions, restaurant history, budget-aware nutrition, grocery/supplement/fitness cost tracking, subscription tracking, nutrition periodization, cravings prediction, hunger prediction, emotional eating recognition. |
| Recovery interventions | Sauna, cold plunge, massage, stretching, compression, ice, heat.                                                                                                                                                                                                                                                                                                                |
| Work and daily load    | Work/shift tracking, desk vs active work, occupation-specific fatigue, commute and driving fatigue, chores, house projects, hobbies, recreation tracking.                                                                                                                                                                                                                       |
| Digital and cognitive  | Screen time and digital wellbeing, eye strain, mood, motivation, stress, mental wellbeing, meditation, breathwork, guided stress reduction, journaling, gratitude, reflection, cognitive performance: focus, memory, productivity, learning, decision fatigue.                                                                                                                  |
| Calendar and travel    | Social events and vacations, calendar conflict awareness, personal FitCore calendar that can create events, travel intelligence, time zones, jet lag, hotel gyms, restaurant adaptation.                                                                                                                                                                                        |
| Environment            | Home environment tracking.                                                                                                                                                                                                                                                                                                                                                      |

Primary dependencies:

- Clear scope boundaries from [06_PRODUCT_SCOPE_AND_NON_GOALS.md](./06_PRODUCT_SCOPE_AND_NON_GOALS.md).
- Sensitive-data permissions and privacy controls.
- Lifestyle data routing to actionable insights.

## Phase 7 - Health And Medical Data

Purpose: support health history, medical context, and safety-aware insights without diagnosing or replacing professional care.

| Area                           | Roadmap Items                                                                                                                                                                                                                             |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Labs                           | Blood work, CBC, CMP, lipid panel, hormones, vitamins, ferritin/iron, inflammatory markers, kidney/liver markers, glucose/A1C, electrolytes, lab trend tracking.                                                                          |
| Imaging and assessments        | DEXA scans, InBody scans, MRI, X-ray, CT, ultrasound, PT reports.                                                                                                                                                                         |
| Medical history                | Surgery history and surgery timeline, medications, allergies, blood type, conditions, vaccination timeline, optional family medical history.                                                                                              |
| Documents and integrations     | Medical document upload, external lab/provider integrations later.                                                                                                                                                                        |
| Symptom and condition tracking | Symptom journal, illness mode, respiratory health, digestive health, skin health, dental hygiene, hearing/noise exposure, vision/prescription tracking, heart condition/history tracking.                                                 |
| Safety                         | Medical data informs recovery, training, and insights without diagnosing or replacing medical care; emergency mode with future lock-screen/widgets; injury red-flag checklist; medical-care recommendation when symptoms look concerning. |

Primary dependencies:

- Medical safety/legal review.
- Document storage and privacy model.
- Clear professional-care language and emergency handling.

## Phase 8 - Progress, Analytics, Long-Term Memory

Purpose: turn years of data into an intelligible health story, operating manual, and simulation system.

| Area                  | Roadmap Items                                                                                                                                   |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| History               | Life events, life phases, goal history, bulk/cut/maintenance/rehab/travel/illness/deload phase tracking.                                        |
| Milestones            | Personal records beyond lifting, milestone system, badge/gamification system in Progress, legacy/lifetime statistics.                           |
| Reviews               | Annual health review, Annual health Wrapped, Health Biography, Personal Operating Manual, health-focused calendar, unified health timeline.     |
| Dashboards and graphs | Custom dashboards, graph explanations, graph overlays, graph predictions, confidence evolution over time.                                       |
| Long-term scores      | Healthy life expectancy estimate, healthspan score, frailty score, FitCore Age / biological fitness age.                                        |
| Media and story       | Digital locker for documents/photos/videos, progress photos and body photo tracking, measurement tracking, AI-generated documentary/story mode. |
| Simulation            | Decision replay, timeline branches / alternate futures, Digital Twin simulation.                                                                |

Primary dependencies:

- Long-term storage strategy.
- Personal knowledge graph.
- Strong provenance and confidence over time.

## Phase 9 - Platform And Extensibility

Purpose: allow FitCore to become a durable platform with safe extension points and future hardware/software integrations.

| Area            | Roadmap Items                                                                                                                                                                                                            |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform        | Plugin marketplace, custom modules, developer API, developer integrations.                                                                                                                                               |
| AI architecture | Swappable AI models, cloud AI vs local AI choice, local/on-device AI, specialized agents for training, nutrition, recovery, medical, productivity, finance, lifestyle, and one master AI that can understand everything. |
| Future hardware | Smart gym equipment compatibility, smart clothing later, AR glasses later, brain-computer interfaces later, robotics/home gym robots later.                                                                              |
| Marketplace     | AI marketplace later.                                                                                                                                                                                                    |

Primary dependencies:

- Stable module architecture.
- Security model.
- Consent and sandboxing rules.
- External developer documentation.

## Deferred / Not Current Priority

These items can remain in the backlog or future roadmap, but they should be marked Deferred or Future and not implemented until explicitly approved:

- Coach/friend sharing
- Social sharing/community features
- Exercise form video library as generic content
- Community feed
- Leaderboards
- Family health dashboard
- Smart rest timer
- Pet ownership/caregiving tracking
- Sexual health tracking
- Anonymous similar-user comparisons
- Sport-specific skill tracking
- Competition history
- Smart clothing
- AR glasses
- Brain-computer interfaces
- Robotics
- AI marketplace

## Recommended Merge Order Across Phases

1. Specs/docs
2. Data contracts
3. Shared UI components
4. Individual feature implementation
5. Integration/routing
6. Tests/regression
7. Polish/accessibility
