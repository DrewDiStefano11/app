# FitCore Hub Detail Implementation Plan

## 1. Purpose
This document plans the future FitCore Hub detail screens. The Hub serves as the central control center for settings, profiles, and cross-cutting concerns. This plan establishes intended sections, placeholder definitions, and privacy-sensitive guardrails without implementing UI at this stage.

## 2. Hub Architectural Rules
- The Hub is a top-right full-screen control center accessed from the global header.
- The Hub is **not** a bottom tab.
- Do not add bottom tabs for Profile, Settings, More, Health, Body, Log, or Coach.
- The Hub should not become the main daily dashboard.
- Initial implementation must use placeholder/detail screens, connecting real settings/persistence in later phases.
- Medical/Health boundaries must be strictly maintained and visibly separate.
- Privacy-sensitive areas must be explicitly protected.

## 3. Hub Sections

### 3.1 Profile
- **Purpose:** User identity and core demographic data.
- **First-pass placeholder:** Static user info card (Name, Age, Height, Current Weight).
- **Future real settings:** Editable form connecting to global state.
- **Likely runtime files:** `src/components/app/hub/profile.tsx`
- **Data/privacy sensitivity:** Medium (PII).
- **Risks:** Leaking PII into AI context without consent.
- **Acceptance criteria:** Renders safely, clearly distinguishes editable fields from read-only derived data.

### 3.2 Goals & Phases
- **Purpose:** Define current training and nutrition objectives.
- **First-pass placeholder:** Static list of current goal (e.g., "Hypertrophy Phase").
- **Future real settings:** Flow to switch phases, recalculating macros/targets.
- **Likely runtime files:** `src/components/app/hub/goals.tsx`
- **Data/privacy sensitivity:** Low.
- **Risks:** Altering a phase might silently wipe current daily targets.
- **Acceptance criteria:** Clearly shows active phase and implications of changing it.

### 3.3 Daily View / Deep Dive
- **Purpose:** Global toggle controlling app layout density.
- **First-pass placeholder:** UI toggle mirroring the one on 'Today'.
- **Future real settings:** Persists state to local storage across sessions.
- **Likely runtime files:** `src/components/app/hub/mode-toggle.tsx`
- **Data/privacy sensitivity:** None.
- **Risks:** Desync between Hub toggle and Today toggle states.
- **Acceptance criteria:** Must stay perfectly synchronized with the 'Today' view toggle; toggling updates layout immediately.

### 3.4 Notifications
- **Purpose:** Manage push and local notification preferences.
- **First-pass placeholder:** Disabled toggles for Reminders, AI alerts, etc.
- **Future real settings:** Integration with PWA/service worker push APIs.
- **Likely runtime files:** `src/components/app/hub/notifications.tsx`
- **Data/privacy sensitivity:** Low.
- **Risks:** Annoying users with bad defaults; failing to request permissions cleanly.
- **Acceptance criteria:** Renders toggle states; handles OS-level denial gracefully.

### 3.5 Privacy & AI
- **Purpose:** Control what data Jarvis can access and remember.
- **First-pass placeholder:** Static toggles for "Allow AI to read workouts", "Allow AI to read nutrition", etc.
- **Future real settings:** Active filtering of the AI context pipeline based on these toggles.
- **Likely runtime files:** `src/components/app/hub/privacy-ai.tsx`
- **Data/privacy sensitivity:** High.
- **Risks:** Accidentally leaking private info to LLM context if toggles fail.
- **Acceptance criteria:** Must include a visible "Clear AI Memory" button; changes must instantly clear related active contexts.

### 3.6 Medical / Health
- **Purpose:** Centralized repository for injuries, genetic flags, and health limitations.
- **First-pass placeholder:** Locked section showing "Opt-in required".
- **Future real settings:** Secured form requiring explicit consent before data influences algorithms.
- **Likely runtime files:** `src/components/app/hub/medical.tsx`
- **Data/privacy sensitivity:** Critical.
- **Risks:** Suggesting medical advice or storing HIPAA-adjacent info unsafely.
- **Acceptance criteria:** Explicit UI warnings that FitCore does not provide medical diagnosis; explicit opt-in required.

### 3.7 Wearables & Devices
- **Purpose:** Manage third-party integrations (Apple Health, Oura, Whoop, etc.).
- **First-pass placeholder:** List of dummy integrations marked "Coming Soon".
- **Future real settings:** OAuth flows and background sync status.
- **Likely runtime files:** `src/components/app/hub/wearables.tsx`
- **Data/privacy sensitivity:** High.
- **Risks:** Token leakage; duplicate data entry between syncs.
- **Acceptance criteria:** Safely display disconnected vs connected states.

### 3.8 Data Management
- **Purpose:** Export, import, and account deletion capabilities.
- **First-pass placeholder:** Non-functional buttons for Export CSV, Delete Account.
- **Future real settings:** Full data blob generation and destructive deletion flows.
- **Likely runtime files:** `src/components/app/hub/data-management.tsx`
- **Data/privacy sensitivity:** Critical.
- **Risks:** Incomplete deletions leaving orphaned PII.
- **Acceptance criteria:** Export/delete data behavior must be prominent and unambiguous; deletion requires double-confirmation.

### 3.9 Appearance
- **Purpose:** Theming and visual preferences.
- **First-pass placeholder:** Light/Dark/System toggle.
- **Future real settings:** Persisted CSS variables or Tailwind class toggles.
- **Likely runtime files:** `src/components/app/hub/appearance.tsx`
- **Data/privacy sensitivity:** None.
- **Risks:** Flash of incorrect theme on initial load.
- **Acceptance criteria:** Theme toggles update the app visually without reloading.

### 3.10 App Settings
- **Purpose:** General unit preferences (lbs/kg, km/mi) and locale.
- **First-pass placeholder:** Static unit toggles.
- **Future real settings:** Global unit conversion utility integration.
- **Likely runtime files:** `src/components/app/hub/app-settings.tsx`
- **Data/privacy sensitivity:** Low.
- **Risks:** Inconsistent units shown across different views (e.g. mix of lbs and kg).
- **Acceptance criteria:** Changes propagate to all data views (cards, graphs) immediately.

### 3.11 About / QA
- **Purpose:** App versioning, debug info, and support links.
- **First-pass placeholder:** Version number display.
- **Future real settings:** State dump functionality for bug reports.
- **Likely runtime files:** `src/components/app/hub/about.tsx`
- **Data/privacy sensitivity:** Low.
- **Risks:** Exposing internal debug routes to normal users.
- **Acceptance criteria:** About/QA/debug information must include current commit/version hash if available.
