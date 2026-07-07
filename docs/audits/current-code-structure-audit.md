# Current Code Structure Audit

## Executive Summary

This audit reviews the current state of the FitCore codebase to identify maintainability risks and assess readiness for the upcoming Product Bible-driven implementation phase. The primary finding is that the codebase currently follows a horizontal (type-based) architecture rather than a vertical (feature-based) one. Several files have become overloaded, acting as "god objects" that mix state, logic, and UI concerns. While the app is functional, this structure presents significant maintainability risks as new features are added.

## Files/folders reviewed

- `src/components/app/` (including subdirectories `views`, `jarvis`, `popups`)
- `src/components/ui/`
- `src/lib/` (including `analytics.ts`, `daily-decision.ts`, `fitcore-data.ts`, `store.tsx`, `ai.functions.ts`)
- `docs/product-bible/` (assessed at a high level for readiness comparison)
- Global routing and configuration files

## Major structure findings

1. **Horizontal instead of Vertical Slicing:** The codebase groups files by their technical role (`components/views`, `components/popups`, `lib/`) rather than by product domain (e.g., Training, Nutrition, Recovery). This means logic for a single feature is scattered across multiple directories.
2. **Centralized Global State:** `src/lib/store.tsx` and related state files act as a massive central repository for the entire app's state, rather than domain-specific state modules.
3. **Overloaded `lib/` directory:** `src/lib/` acts as a catch-all for utility functions, business logic (`daily-decision.ts`), API clients (`ai.functions.ts`), data schemas (`fitcore-data.ts`), and analytics, leading to a tangled web of dependencies.
4. **UI Component Overload:** The `src/components/app/` directory contains massive UI components that mix presentation, state management, and business logic.
5. **Shadcn UI Separation:** The `src/components/ui/` directory is well-maintained and properly separated from application logic, which is a positive structural pattern.

## High-risk files or folders

- **`src/components/app/active-workout.tsx` (40KB):** Highly overloaded. Mixes complex UI rendering, active timer state, workout session state, and persistence logic. Likely to cause severe merge conflicts when the Training System book is implemented.
- **`src/lib/daily-decision.ts` (42KB):** Contains the entirety of the decision engine's logic. As the Product Bible expands decision rules, this file will become unmaintainable.
- **`src/lib/ai.functions.ts` (36KB):** Centralizes all AI interactions. Risk of merge conflicts as multiple domains (nutrition parsing, recovery analysis, coaching) expand their AI capabilities simultaneously.
- **`src/lib/jarvis/tools.ts`:** A major cross-domain hotspot because it centralizes AI/Jarvis actions and handlers across meals, workouts, recovery, daily decisions, confirmations, audit trails, and state mutations. Future Product Bible implementation work could easily collide there.
- **`src/lib/fitcore-data.ts` (30KB):** Handles schemas, logging generation, and provenance. Modifying data models here risks unintended side effects across the app.
- **`src/components/app/views/home.tsx` (27KB):** The main dashboard mixes multiple domains (training, nutrition, recovery insights) and imports a large number of popup components, making it a heavy "god component."

## Medium-risk files or folders

- **`src/components/app/views/nutrition.tsx` (30KB) & `training.tsx` (20KB):** Large view files that contain too much inline logic instead of delegating to smaller, domain-specific components and hooks.
- **`src/components/app/jarvis/jarvis-panel.tsx` (20KB):** The AI assistant panel is growing large and handles complex state for chat history and tool confirmation.
- **`src/lib/store.tsx`:** While necessary, its monolithic nature means any state change requires touching this file, increasing the risk of conflicts.

## Temporary/bootstrap code

- **Demo Data (`src/lib/demo-data.ts`):** Contains mock data for initial development. This is a temporary bootstrap layer that should eventually be replaced by real user data generation and testing mocks.
- **Lovable error reporting (`src/lib/lovable-error-reporting.ts`):** Specific to the initial prototyping environment. May not be needed in a production deployment, but safe to leave for as-is now.

## Maintainability risks

- **Merge Conflicts:** The monolithic nature of files like `store.tsx`, `ai.functions.ts`, and `daily-decision.ts` guarantees merge conflicts when developers work on different features (e.g., Training vs. Nutrition) concurrently.
- **Unclear Dependencies:** Business logic in `lib/` frequently imports from other `lib/` files, creating a tangled dependency graph that makes it difficult to isolate domains for testing.
- **Fragile Load Order:** Deeply intertwined state and analytics functions might lead to circular dependencies or subtle bugs if initialization order changes.

## Product Bible readiness

The current app structure is **not ready** for scalable Product Bible implementation. The Product Bible clearly defines distinct systems (Training System, Nutrition System, System Architecture). The current codebase's horizontal architecture directly conflicts with this vision. Implementing new features from the books into the current "catch-all" files will compound existing technical debt. A transition to a feature-sliced or domain-driven architecture (e.g., grouping by `features/training`, `features/nutrition`) is highly recommended before heavy implementation begins.

## Suggested cleanup order

1. **Domain Extraction (Safe to start):** Begin extracting pure business logic from UI components (like `active-workout.tsx`) into custom hooks.
2. **Feature Slicing (Wait for Book 02):** Reorganize `src/components/app/views/` into domain-specific folders.
3. **State Decentralization (Wait for Book 02/03/04):** Break apart `store.tsx` and `daily-decision.ts` into domain-specific modules.

## Items safe to fix now

- Extracting inline types and small utility functions from large view components into view-local or feature-local files/hooks/components, rather than adding more catch-all files to the overloaded `src/lib/` directory.
- Standardizing imports (e.g., ensuring components only import what they need).
- Removing unused code or dead variables.
- Breaking massive components (like `home.tsx`) into smaller, presentational sub-components that still live in the same folder.

## Items that should wait until after the Product Bible is complete

- **Major Directory Restructuring:** Do not move views or lib files into a `features/` directory until Book 02 (System Architecture) is finalized and provides explicit structural guidelines.
- **State Management Overhaul:** Do not break apart `store.tsx` until the data models in Book 03 and Book 04 are finalized.
- **Database/Schema Changes:** Do not modify `fitcore-data.ts` core types until the Product Bible dictates the final schemas.

## Validation performed

- Automated traversal of `src/` directory to analyze file sizes and imports.
- Review of `docs/product-bible/` structure to compare against app architecture.
- Analyzed `active-workout.tsx` and `daily-decision.ts` to confirm tight coupling of concerns.
