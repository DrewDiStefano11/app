# Parallel Implementation Strategy

This strategy helps Jules/Codex run multiple FitCore tasks without overlapping in unsafe ways.

The current app structure includes:

- `src/components/app` for app-level UI components and views.
- `src/components/app/views` for major tab views.
- `src/components/app/popups` for sheets and popup workflows.
- `src/components/app/jarvis` and `src/lib/jarvis` for AI/Jarvis surfaces and tools.
- `src/lib` for store, types, analytics, demo data, persistence, and decision logic.
- `src/routes` for TanStack routes.
- `docs` for product, architecture, QA, audits, and now Product Bible documentation.

Large shared files such as `src/lib/store.tsx`, `src/lib/types.ts`, `src/routes/index.tsx`, `src/styles.css`, and shared dashboard/UI components should not be edited by multiple agents at the same time.

## PR Rules

- Each PR should implement one feature, one workflow, or one isolated foundation change.
- Avoid PRs touching multiple lanes unless it is an intentional integration PR.
- Split cross-lane work into foundation PR, UI PR, logic PR, integration PR, and testing PR.
- Avoid two agents modifying the same large file at the same time.
- Prefer new modules over editing monolithic files.
- If a large file must be changed, first extract the relevant section into smaller modules.
- Docs-only PRs must not modify source files, generated files, lockfiles, or runtime behavior.
- AI/data/storage changes require provenance, migration, and rollback thinking.
- UI changes require mobile viewport checks and accessibility checks.

## Merge Order

1. Specs/docs
2. Data contracts
3. Shared UI components
4. Individual feature implementation
5. Integration/routing
6. Tests/regression
7. Polish/accessibility

## Lanes

| Lane                         | Owned files/folders if known                                                                                                      | Files to avoid                                                              | Dependencies                                               | Can run in parallel with                   | Should not run in parallel with                                          | Required test coverage                                                           | Merge order guidance                                    |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------- | :----------------------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------------------- | :------------------------------------------------------ |
| Documentation / Specs Lane   | `docs/product-bible`, `docs/product`, `docs/architecture`, `docs/qa`, top-level docs                                              | Runtime files in `src`, lockfiles, generated route files                    | Current docs and Product Bible structure                   | Most lanes when docs-only                  | Any PR editing the same docs                                             | Link checks by inspection, markdown formatting, docs-only diff review            | Merge before implementation PRs                         |
| Data Model Lane              | `src/lib/types.ts`, future data contract modules, migration docs                                                                  | UI views, broad styling, unrelated components                               | Book 2, data flow audit, privacy rules                     | Docs, Testing/QA after contracts stabilize | AI, Training, Nutrition, Recovery, Medical if touching same types        | TypeScript, migration tests, import/export checks, localStorage compatibility    | Merge before dependent UI and logic                     |
| Shared UI Shell Lane         | `src/components/app/ui.tsx`, `src/components/app/tile.tsx`, `src/components/app/sheet.tsx`, `src/components/ui`, `src/styles.css` | Domain logic, AI tools, data migrations                                     | UI design system, accessibility docs                       | Docs, isolated feature logic               | Home, Training, Nutrition, Recovery if editing shared containers         | Visual/mobile checks, accessibility, smoke navigation                            | Merge before feature UI polish                          |
| Onboarding / Settings Lane   | Onboarding components, settings/hub components, preferences modules                                                               | Data model changes without contract PR, unrelated tabs                      | User preferences, privacy controls, sample data            | Docs, Testing/QA, some Home work           | Data Model when preferences schema changes                               | Onboarding flow, settings persistence, import/export if touched                  | After data contracts; before privacy-dependent features |
| Home / Daily Experience Lane | Home dashboard view, FitCore Today, daily briefing, quick actions                                                                 | Shared store/type changes without foundation PR                             | Training, nutrition, recovery, AI, analytics data          | Domain lanes if using stable contracts     | AI/Insights when same recommendation surfaces change                     | Home smoke tests, quick action tests, mobile overflow                            | After source data contracts; before polish              |
| Training Lane                | Training views, active workout, exercise modules, workout history                                                                 | Nutrition/recovery internals, global store/type edits without foundation PR | Exercise taxonomy, readiness, data model                   | Nutrition, Docs, Testing/QA                | Recovery/AI when same readiness/substitution logic changes               | Start/finish workout, set editing, substitutions, persistence                    | After data contracts; before AI integration             |
| Nutrition Lane               | Nutrition views, meal logging, food modules, supplement modules                                                                   | Training internals, unrelated dashboard layout                              | Food data model, provenance, confidence                    | Training, Docs, Testing/QA                 | AI when camera/estimate workflow changes same files                      | Meal log, saved/recent/repeat meal, hydration/supplements, confidence labels     | After data contracts; before AI estimates               |
| Recovery / Sleep Lane        | Recovery view, sleep entries, check-ins, muscle fatigue                                                                           | Training logic unless integration PR                                        | Wearables, readiness model, symptoms/privacy               | Nutrition, Docs, Testing/QA                | Training/AI when readiness logic changes same modules                    | Recovery check-in, sleep log, readiness display, sensitive data QA               | After data contracts; before wearable integrations      |
| Wearables / Sensors Lane     | Future integration adapters, sync modules, device settings                                                                        | Core UI and store without contract PR                                       | Provider research, permissions, dedupe model               | Docs, Testing/QA                           | Data Model when sync schema is unstable                                  | Mock sync, duplicate detection, permission states, time-window reconciliation    | After data contracts and privacy controls               |
| Sports / Activities Lane     | Future sport/activity modules, activity summaries                                                                                 | Core training modules unless shared taxonomy agreed                         | Wearables, calendar, training load                         | Training if contracts stable, Docs         | Wearables when same activity import code changes                         | Activity logging/import tests, sport-specific metrics where scoped               | After activity data model                               |
| AI / Insights Lane           | `src/components/app/jarvis`, `src/lib/jarvis`, AI insight components, decision logic                                              | `src/lib/types.ts` or store without foundation PR                           | Provenance, confidence, memory, privacy, Book 3            | Docs, Testing/QA                           | Home/Training/Nutrition/Recovery if editing same recommendation surfaces | Recommendation source/confidence tests, undo/confirm flows, prompt safety review | After data and provenance contracts                     |
| Analytics / Progress Lane    | Progress/stats views, analytics modules, chart modules                                                                            | Raw logging workflows unless integration PR                                 | Data routing, metric definitions, chart standards          | Docs, domain lanes if read-only            | Data Model when metrics schema changes                                   | Chart rendering, no empty/decorative charts, metric provenance checks            | After source data and metric contracts                  |
| Medical / Health Lane        | Future medical modules, document upload, lab tracking, red flag flows                                                             | AI diagnosis behavior, unrelated health claims                              | Privacy, legal/safety, document storage, Book 8            | Docs, Testing/QA                           | AI/Insights when same medical interpretation changes                     | Sensitive data permissions, red-flag wording, document provenance                | After privacy/security and safety specs                 |
| Lifestyle / Calendar Lane    | Future lifestyle, work, travel, calendar modules                                                                                  | Medical and finance internals unless integration PR                         | Scope rules, privacy controls, calendar provider decisions | Nutrition, Recovery, Docs                  | AI when same conversational capture changes                              | Calendar permission states, lifestyle logging, routing to insights               | After scope and privacy decisions                       |
| Privacy / Platform Lane      | Settings privacy, export/import, storage, sync, future plugin APIs                                                                | Domain UI unless integration PR                                             | Data contracts, threat model, user controls                | Docs, Testing/QA                           | Data Model if same storage files change                                  | Export/import, reset, permissions, migration, security review                    | Early, before sensitive integrations                    |
| Testing / QA Lane            | `tests`, `docs/qa`, Playwright config when needed                                                                                 | Runtime behavior changes unless test-enabling PR                            | Feature specs, existing automated testing docs             | Most lanes after stable contracts          | Any PR changing same test files                                          | E2E, mobile viewport, accessibility, regression checklists                       | Merge after feature logic; before polish                |

## Cross-Lane Work Splitting

When a feature crosses lanes, split it:

| Work Type   | Example                                                   | Preferred PR       |
| :---------- | :-------------------------------------------------------- | :----------------- |
| Foundation  | Add source/confidence types for AI-estimated meals        | Data Model PR      |
| UI          | Show confidence badges in meal history                    | Nutrition UI PR    |
| Logic       | Calculate uncertainty range for photo macros              | Nutrition logic PR |
| AI          | Generate editable meal estimate drafts                    | AI/Insights PR     |
| Integration | Route confirmed estimate to dashboard and progress charts | Integration PR     |
| Tests       | Add meal estimate confirmation regression coverage        | Testing/QA PR      |

## Protected Large Files

Avoid concurrent edits to:

- `src/lib/types.ts`
- `src/lib/store.tsx`
- `src/routes/index.tsx`
- `src/styles.css`
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/jarvis/settings-card.tsx`
- Shared UI primitives and dashboard layout code
- Generated route files unless a route change requires them

If a large file must change, create an extraction/refactor PR first with narrow behavior-preserving scope.

## Required PR Checklist

- [ ] Feature is listed in the inventory or the PR adds it.
- [ ] Owner lane is clear.
- [ ] Scope stays inside the lane or is explicitly an integration PR.
- [ ] Data provenance/confidence requirements are addressed.
- [ ] Privacy and sensitive-data handling are addressed.
- [ ] Tests or manual QA notes match the blast radius.
- [ ] No unrelated formatting or generated-file churn.
- [ ] Docs-only PRs changed only docs.
