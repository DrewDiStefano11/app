# FitCore Jules & Codex Task Playbook

## 1. Goal

Maximize development efficiency by routing tasks to the most capable agent and reducing overhead per PR.

---

## 2. Agent Specialization

### Codex (The Architect/Data Engineer)

_Best for high-complexity, logic-heavy, or core system tasks._

- **Task Types:**
  - Database schema changes (`src/lib/types.ts`).
  - Complex algorithms (Daily Decision Engine, Training Load).
  - Data migrations and persistence logic.
  - New Jarvis tools and provider integrations.
  - Performance optimization for large datasets.
- **Guideline:** Use Codex when the "How" is ambiguous or the risk to data integrity is high.

### Jules (The Builder/UI Engineer)

_Best for implementation, UI/UX, and standardized feature work._

- **Task Types:**
  - Building React components based on existing patterns.
  - Connecting UI to existing data stores.
  - Visualizing data (Charts, Badges, Lists).
  - Writing E2E tests (Playwright).
  - Documentation and QA checklists.
- **Guideline:** Use Jules when the requirements are clear and the patterns already exist in the codebase.

---

## 3. PR Best Practices

### Task Sizing

- **Avoid "Micro-PRs":** Do not spend usage on tiny doc updates or single-line CSS fixes unless they block a larger workstream.
- **Batching:** Group 4 related tasks (e.g., 1 Codex + 3 Jules) into a single logical workstream to minimize context switching.
- **Docs-Only Batches:** Use documentation PRs to map out large phases (like this one) to prevent future wasted usage.

### Writing PR Descriptions

Every PR must answer:

1. **What changed?** (List files and high-level logic).
2. **Why it matters?** (Which Product Rule does it satisfy?).
3. **How was it verified?** (Tests run, screenshots, or manual checklist).
4. **Any side effects?** (Conflict risks with #34 or the Engine).

---

## 4. Parking & Deprioritization

If a task falls into these categories, **Park It**:

- **Voice Mode:** High friction, low current utility compared to the Decision Engine.
- **Social Features:** Outside the V1 goal of a "Trusted Coach".
- **Broad UI Redesigns:** Wait until the #34 popup/sheet foundation is merged.
- **Experimental Models:** Stick to verified OpenAI/Claude providers unless directed otherwise.

---

## 5. Usage Efficiency Checklist

- [ ] Is this task implementation-ready? (Clear specs exist).
- [ ] Does it avoid overlapping with active branches?
- [ ] Is the agent selected the best fit for the task type?
- [ ] Could this be bundled with 2-3 other small tasks?
- [ ] Is there a manual test plan to avoid infinite "Retry" loops?
