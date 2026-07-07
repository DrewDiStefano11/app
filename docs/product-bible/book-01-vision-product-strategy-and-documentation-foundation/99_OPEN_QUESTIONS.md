# Open Questions

This file tracks uncertainties, assumptions, and decisions that should be resolved before implementation. Future agents should update this file when questions are answered or new risks appear.

## Assumptions Made In Book 1

- The active app is the FitCore project in `fitcore-data-integrity`.
- Product Bible docs should live under `docs/product-bible`.
- Kebab-case Book folder names are preferred over spaces.
- Book 1 should reference existing docs instead of replacing them.
- Current implementation details are defined by runtime code and existing current-state docs, not by long-term roadmap language.
- Most roadmap items should remain Planned, Deferred, Future, or Needs Decision until code confirms implementation.

## Product Decisions Needed

- Which phase should be considered the next implementation target after this docs-only PR?
- Should FitCore prioritize Apple Health foundation or provenance/confidence framework first?
- What minimum "Core Testable App" definition must be satisfied before Phase 2 starts?
- Which features are too large for early implementation and should be broken into smaller specs first?
- How should the user approve movement of Deferred items into active planning?
- Should "Jarvis" remain the AI brand name long-term or become a role inside a broader FitCore AI system?

## Architecture And Data Research

- What should the unified data model look like across training, nutrition, recovery, medical, lifestyle, and sensors?
- How should raw logs, AI-structured data, and derived metrics be stored separately?
- What provenance schema should support manual input, AI estimate, sensor import, document extraction, and correlation?
- How should FitCore represent confidence, uncertainty ranges, missing data, and user confirmation?
- How should duplicate detection work across manual logs, Apple Health imports, wearable sync, and AI drafts?
- How should migrations evolve beyond the current localStorage default-merge pattern?
- What is the long-term storage plan for years of logs, documents, photos, and AI memory?
- How should local-first storage eventually sync to cloud without breaking trust or offline access?

## AI And OpenAI/API Security Questions

- Which AI calls should run locally, in the browser, on a backend, or through a secure provider service?
- How will API keys and model credentials be protected?
- What data is allowed to leave the device for cloud AI processing?
- What user controls are required for AI memory, deletion, export, and reset?
- How should FitCore separate known fact, user-reported information, wearable data, AI estimate, correlation, hypothesis, experiment result, and medical document interpretation?
- How should AI recommendations cite source data without overwhelming the user?
- How should the app store failed experiments and AI corrections?
- What model-switching abstraction is needed for swappable AI providers?

## Privacy, Legal, And Medical Safety

- What legal review is required before medical document upload, lab interpretation, emergency mode, or red-flag guidance?
- What language should FitCore use to avoid diagnosis while still being helpful?
- How should sensitive categories be permissioned: medical, mental health, location, calendar, photos, family history, sexual health, finances, and work data?
- What should be encrypted locally or remotely?
- How should users delete specific sensitive data without deleting the entire app state?
- Should medical data be exportable separately from general fitness data?
- What consent model is required for future provider integrations?

## Apple Health / WHOOP / Noop / Wearables Unknowns

- Which Apple Health data types are required for Phase 3 foundation?
- What platform constraints apply to Apple Health in the current web/PWA stack?
- Is a native wrapper required for Apple Health or Apple Watch live workout support?
- Is WHOOP access feasible directly, or is Noop/bridge required?
- What are the provider limitations for Fitbit, Garmin, Oura, CGMs, smart scales, and smart beds?
- How should FitCore reconcile conflicting sleep, heart rate, and activity data from multiple devices?
- How should workout time-window syncing avoid double-counting manual and wearable sessions?

## Storage And Long-Term Memory Concerns

- Can browser localStorage support the expected long-term data volume?
- When should FitCore move to IndexedDB, SQLite, secure device storage, or cloud-backed storage?
- How should large files such as medical PDFs, progress photos, body photos, videos, and imaging reports be stored?
- How should the Personal Knowledge Graph be represented and migrated?
- How should "forget this" work for AI memory and derived insights?
- How should backups preserve provenance and raw/structured separation?

## Features Marked Maybe, Deferred, Or Future

- Coach/friend sharing
- Social sharing/community features
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
- Robotics/home gym robots
- AI marketplace
- Finance-focused tracking beyond health/lifestyle cost context

## Areas Requiring Technical Research

- Apple Health and Apple Watch support path for a TanStack/Vite web app.
- Camera food estimation accuracy, confidence display, and correction loop.
- Barcode food database provider choice.
- Voice logging privacy, transcription storage, and offline support.
- Calendar integration provider and permissions model.
- Lab parsing and medical document extraction.
- Wearable provider rate limits, auth, and data quality.
- On-device AI feasibility for sensitive data.
- Plugin/module architecture and sandboxing.
- Long-term analytics performance with years of local data.

## Oversized Early Features

These should be decomposed before implementation:

- Unified data model
- Personal Knowledge Graph
- Health Twin / Digital Twin simulation
- AI Experiment Mode
- Medical document upload and interpretation
- Apple Health plus Apple Watch live workout support
- Plugin marketplace
- Swappable AI models
- Full custom dashboards
- Travel intelligence
- Prediction engine
- Emergency mode
