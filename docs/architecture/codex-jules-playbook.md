# FitCore Development Playbook: Codex & Jules Collaboration

## Overview

This playbook defines the interaction patterns and responsibilities for Codex (Architect/Logic) and Jules (Implementation/UI) to ensure efficient collaboration, prevent overlapping work, and maintain a high-quality codebase.

## Team Roles

### Codex (Architect/Logic)

- **Responsibility:** Core logic, data structures, state management, complex migrations, and backend-equivalent logic.
- **Key Files:** `src/lib/types.ts`, `src/lib/fitcore-data.ts`, `src/lib/daily-decision.ts`, `src/lib/jarvis/tools.ts`.
- **Focus:** Data integrity, provenance foundation, complex algorithms (Daily Decision Engine), and cross-domain data synchronization.

### Jules (Implementation/UI)

- **Responsibility:** User interface implementation, component development, styling, and comprehensive end-to-end testing.
- **Key Files:** `src/components/**`, `src/routes/**`, `styles.css`, `tests/e2e/**`.
- **Focus:** Mobile responsiveness, accessible tap targets, visual hierarchy, user feedback loops, and regression testing.

## Task Batching & Sequencing

To minimize context switching and PR conflicts, work is organized into batches:

- **Batch Structure:** 1 Codex task (foundational) followed by 3 Jules tasks (UI/Implementation).
- **Sequencing:** Codex completes core logic and provides the data contract before Jules begins building the UI components that consume that data.

## Forbidden Zones & Overlap Prevention

- **Strict Boundaries:** Jules should not modify core logic in `src/lib/` unless explicitly instructed for bug fixes or minor adjustments. Codex should not focus on CSS or pixel-perfect UI.
- **Testing:** Jules is the primary owner of Playwright E2E tests. Codex writes unit tests for core logic when applicable.
- **Shared Files:** Avoid simultaneous edits to `src/lib/types.ts` or `src/lib/fitcore-data.ts`.

## Communication Patterns

- **Contract First:** Codex documents the expected data shape in a spec or `types.ts` before implementation.
- **Review Loop:** Jules reviews Codex's data structures for UI-friendliness; Codex reviews Jules's implementation for data integrity.
- **Handoff:** Every task handoff should include a summary of changed data contracts or UI requirements.

## Jules/Codex Usage Optimization

- **Do not duplicate work:** Check `AGENTS.md` and `docs/` for existing patterns before implementing from scratch.
- **Reuse components:** Jules should prioritize existing UI components (`Tile`, `Eyebrow`, `PageHeader`, `EmptyState`) over creating new ones.
- **Data Provenance:** Always use the provenance helpers in `src/lib/fitcore-data.ts` instead of manual metadata objects.
