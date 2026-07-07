# FitCore Bootstrap Layer Audit

## Executive Summary

This audit identifies bootstrap, patch, override, and shim code currently present in the FitCore application. The goal of this audit is to catalog temporary code or workarounds that were added to accelerate development or bypass limitations, and to define a path for migrating this behavior into the permanent app source architecture. No bootstrap code was removed during this audit.

## Bootstrap/Patch Files Found

1. `public/sw.js` (Service Worker)
2. `src/lib/persist.ts` (State Persistence/Event Dispatch)
3. `src/lib/lovable-error-reporting.ts` (Error Reporting Shim)
4. `src/components/app/bottom-nav.tsx` (Global Event Dispatch/Shim)
5. `src/components/app/jarvis/jarvis-panel.tsx` (Global Event Listener/Diagnostics)
6. `src/components/app/jarvis/settings-card.tsx` (Diagnostics Sync)
7. `src/components/app/views/nutrition.tsx` (Global Event Trigger)
8. `src/components/app/views/home.tsx` (Global Event Trigger)
9. `src/lib/fitcore-data.ts` (Provenance Data Override/Patch)
10. `src/lib/jarvis/tools.ts` (State Patching/Audit Trail)
11. `src/styles.css` (Animation Override / Shims)
12. `src/lib/ai.functions.ts` (System Prompt Override)

## Purpose of Each File & Temporary/Permanent Behavior

### 1. `public/sw.js`

- **Purpose:** Service worker for offline caching and PWA support. Patches caching behavior by ignoring server/AI requests and explicitly defining static cache items.
- **Behavior:** Permanent feature (PWA), but the hardcoded asset lists and bypass logic for `/ai.functions` acts as a temporary patch to avoid caching dynamic or authenticated data incorrectly.

### 2. `src/lib/persist.ts`

- **Purpose:** Manages local storage persistence and cross-tab synchronization.
- **Behavior:** Uses `window.dispatchEvent` with custom events (`fitcore.ui.changed`) to sync state. This is a shim/override for a robust centralized state management system (like a proper store synchronization mechanism).

### 3. `src/lib/lovable-error-reporting.ts`

- **Purpose:** Error reporting boundary.
- **Behavior:** Uses a global `window.__lovableEvents` shim to capture exceptions. This is a temporary bootstrap to integrate with a specific error reporting platform without a fully typed or imported SDK.

### 4. Component Global Events (`bottom-nav.tsx`, `nutrition.tsx`, `home.tsx`)

- **Purpose:** Trigger AI / Jarvis features from various UI components.
- **Behavior:** Relies heavily on `window.dispatchEvent(new CustomEvent("fitcore:open-ai"))` and `fitcore:jarvis-compose`. This is a shim to bypass React state/context and directly communicate between distant components (e.g., a button opening the Jarvis sheet). This should eventually be moved to a global React context or state store (like Zustand).

### 5. Jarvis Components (`jarvis-panel.tsx`, `settings-card.tsx`)

- **Purpose:** Listens to the global events dispatched by the UI components to open the panel or sync diagnostics.
- **Behavior:** Uses `window.addEventListener` for custom events. Also uses `window.localStorage.setItem` directly for AI diagnostics, bypassing the standard state management. This is a temporary bootstrap for rapid feature delivery.

### 6. `src/lib/fitcore-data.ts`

- **Purpose:** Handles core data mutations.
- **Behavior:** Contains functions like `normalizeProvenance` which accept a `sourceOverride` patch parameter. `updateLog` takes a `patch: Partial<FitCoreLog>` to merge data. While patching is a valid pattern, the reliance on overrides indicates a potential need for stricter schema validation or typed update actions in the permanent source.

### 7. `src/lib/jarvis/tools.ts`

- **Purpose:** Defines AI tools and actions.
- **Behavior:** Heavily utilizes `patch` objects in audit trails to enable undo functionality. This is a permanent architectural design for the audit system, but the implementation of undoing state by blindly applying patches needs careful review to ensure data integrity during complex state changes.

### 8. `src/styles.css`

- **Purpose:** Global styles.
- **Behavior:** Includes `.shimmer-dot` and override queries like `@media (prefers-reduced-motion: reduce)` with `!important` to force animation states. These are valid CSS techniques but act as overrides to default component behavior.

### 9. `src/lib/ai.functions.ts`

- **Purpose:** AI endpoint communication.
- **Behavior:** Accepts a `systemOverride` to inject custom system prompts. This is a bootstrap mechanism to allow the client to define AI behavior dynamically rather than relying on a centralized server prompt configuration.

## Risks by File

- **Global Event Bus (`bottom-nav.tsx`, `jarvis-panel.tsx`, etc.):** High risk. Relying on `window.dispatchEvent` creates invisible dependencies between components. If a component unmounts or fails to register a listener in time, actions are lost silently.
- **`src/lib/lovable-error-reporting.ts`:** Medium risk. Depends on `window.__lovableEvents` being defined by an external script. If the script fails to load, errors are dropped.
- **`public/sw.js`:** High risk. Hardcoded cache names and asset lists can lead to stale caching if versioning isn't perfectly synchronized with the build process. Bypassing specific routes string-matching (e.g., `ai.functions`) is fragile if API routes change.
- **`src/lib/jarvis/tools.ts`:** Medium risk. The patch-based undo system could lead to inconsistent state if multiple complex operations are undone out of order or if the schema changes.

## Load-Order/Cache/Service Worker Concerns

- **Service Worker:** The caching strategy in `sw.js` specifically ignores AI and server endpoints. If new endpoints are added without updating the SW, they might be incorrectly cached (or fail offline). The cache version `fitcore-v1` must be bumped manually to clear stale assets.
- **Event Listeners:** Components like `jarvis-panel.tsx` must be mounted for the `fitcore:open-ai` event to work. If a user clicks a button before the panel is rendered, the event is lost. Load order is critical here.
- **Error Reporting:** The Lovable error script must load before React initializes, or early errors won't be caught by the shim.

## Duplicated Behavior

- The logic to open the AI/Jarvis panel is duplicated across multiple components using the same `window.dispatchEvent` mechanism.
- Local storage manipulation is split between `src/lib/persist.ts` (for UI state) and direct `window.localStorage` calls in `jarvis-panel.tsx` (for diagnostics).

## Recommended Migration Plan

### What should wait (Post-Product Bible Completion)

1.  **Refactoring the AI Tool Undo System:** The patch-based audit trail (`jarvis/tools.ts`) is deeply integrated into the current AI flow. Leave this until the core training and nutrition systems are fully finalized.
2.  **Service Worker Overhaul:** Leave the manual cache management in `sw.js` until a robust build-integrated PWA plugin (like Vite PWA) is fully configured for the final architecture.

### Order of Operations (Future Work)

1.  **State Management Migration:** Replace the `window.dispatchEvent` event bus (for opening Jarvis and syncing state) with a proper React Context or a state management library (Zustand/Jotai). This centralizes the logic and removes load-order dependency risks.
2.  **Centralize Local Storage:** Move the direct `localStorage` calls in Jarvis diagnostics into `src/lib/persist.ts` or a unified storage service.
3.  **Strict Prompt Management:** Move the `systemOverride` logic from client requests to a secure server-side configuration to prevent client-side prompt manipulation.
4.  **Error Reporting:** Replace the `window.__lovableEvents` shim with an official, typed SDK import.

### What can be safely fixed now

- **None.** As per the instructions, no code should be folded into the app source yet. The focus is strictly on auditing.

## Validation Performed

- Searched codebase for keywords: `bootstrap`, `patch`, `override`, `shim`, `window`, `global`.
- Reviewed `public/sw.js` for caching strategies.
- Analyzed cross-component communication patterns (CustomEvents).
- Reviewed data mutation and AI tool logic for patch/override usage.
