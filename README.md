# FitCore

FitCore is a local-first AI fitness command center built with TanStack Start, React, TypeScript, Vite, Tailwind/Radix-style UI primitives, and Recharts. It helps users plan and track training, nutrition, recovery, body metrics, progress, and AI-assisted coaching from one mobile-first dashboard.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (preferred) or [Node.js](https://nodejs.org/) (v22+)

### Local Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install --frozen-lockfile
   ```
3. Run the development server:
   ```bash
   bun run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal)

### Scripts

**Preferred (Bun):**

- `bun run dev`: Start development server
- `bun run build`: Build for production
- `bun run lint`: Run ESLint checks
- `bun run format`: Run Prettier formatting

**Optional Fallback (npm):**

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run format` (or `npx prettier --write .`)

## Main App Sections

- **Onboarding**: Initial setup and goal setting.
- **Home / FitCore Today**: Your daily dashboard summary.
- **Training**: Workout library and scheduling.
- **Active Workout**: Real-time tracking during your session.
- **Nutrition**: Food and hydration logging.
- **Recovery**: Sleep, stress, and readiness tracking.
- **Progress**: Body metrics and performance history with Recharts.
- **Settings / Hub**: App configuration and data management.
- **Jarvis / AI Launcher**: AI-assisted coaching and command center.
- **Demo Data Mode**: Toggle sample data to explore app features.
- **Data export/import/reset**: Manage your local-first data.

## Development Workflow

- Create small feature branches from current `main`.
- Open draft PRs for larger changes.
- Keep PRs focused: UI, AI, data, docs, and infra should be separate when possible.
- Run lint, build, and formatting checks before merge.
- Add screenshots or screen recordings for UI changes.
- Use the manual QA checklist before merging behavior/UI changes.
- Do not mix visual polish with AI/data/storage changes unless the PR explicitly says so.

### Active PR Safety Boundaries

To avoid conflicts with active work (e.g., AI PR #2 and Premium UI Codex PR), do not modify the following unless explicitly requested:

- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/jarvis/settings-card.tsx`
- `src/lib/types.ts`
- `src/lib/store.tsx`
- `src/routes/index.tsx`
- `src/styles.css`
- `eslint.config.js`
- Shared UI primitives and dashboard layout code.

## Future Work

Future work is tracked via GitHub Issues. Please use the following labels:

- `bug`: Bug reports
- `feature`: New feature requests
- `ui-polish`: Visual or UX improvements
- `ai`: Jarvis and AI-related tasks
- `data-integrity`: Storage and schema tasks
- `dashboard-customization`: Widgets and layout improvements
- `docs`: Documentation updates
- `qa`: Quality assurance and testing infrastructure

## Quality Assurance

Before submitting a PR, please refer to the [Manual QA Checklist](./docs/manual-qa-checklist.md) and ensure all relevant sections are tested.

## Data Safety

For information on how FitCore handles your data, see [Data Safety and Backup](./docs/data-safety-and-backup.md).
