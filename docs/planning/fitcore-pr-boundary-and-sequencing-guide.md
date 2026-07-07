# FitCore PR Boundary & Sequencing Guide

## 1. Core PR Rules

To maintain high development velocity and reduce merge conflicts, all contributors must adhere to these strict boundary rules:

- **Docs-Only PRs:** Must ONLY modify `.md` files. No changes to `src/`, `tests/`, `package.json`, or config files.
- **Test-Only PRs:** Must ONLY modify `tests/` or Playwright configurations. No changes to application source code.
- **UI-Only PRs:** Focus on styling and component layout. Must not change business formulas, data persistence logic, or the core Engine.
- **Data/Model PRs:** Focus on schema changes, migrations, and persistence. Must include migration notes and stay separated from UI polish.
- **Daily Decision Engine PRs:** Must remain deterministic and read-only regarding the core application state. Logic must be isolated from UI integration.
- **Jarvis Provider/Tool PRs:** Focus on AI logic and tool definitions. Must not silently change user permission levels or core data structures.
- **Popup/Sheet PRs:** Must stay scoped to layout and positioning; do not use these as a vehicle for broad UI redesigns.

---

## 2. Sequencing & Parallelism Matrix

| Workstream               | Parallel with #34 (Popups)? | Parallel with Engine? | Risk Level | Validation Required                  |
| :----------------------- | :-------------------------: | :-------------------: | :--------: | :----------------------------------- |
| **Data Trust UI**        |            ⚠️ No            |        ✅ Yes         |   Medium   | Visual QA; Sheet Positioning         |
| **Engine UI**            |            ⚠️ No            |        ✅ Yes         |   Medium   | Engine Mock Data; Mobile Layout      |
| **Import/Export**        |           ✅ Yes            |        ✅ Yes         |    High    | Data Integrity; JSON Validation      |
| **Nutrition Correction** |            ⚠️ No            |        ✅ Yes         |    High    | Tool Safety; Persistence Audit       |
| **Recovery Insights**    |           ✅ Yes            |        ✅ Yes         |    Low     | Formula Verification; No-Data States |
| **Saved Foods**          |           ✅ Yes            |        ✅ Yes         |   Medium   | Migration Safety; Dupe Check         |

---

## 3. Conflict Prevention Matrix

| Affected Files                 | Primary Workstream | Secondary Workstream | Conflict Risk | Mitigation                                                      |
| :----------------------------- | :----------------- | :------------------- | :------------ | :-------------------------------------------------------------- |
| `src/lib/types.ts`             | Data/Model         | All                  | **Critical**  | Batch schema changes early in the PR cycle.                     |
| `src/lib/fitcore-data.ts`      | Model/Migration    | Recovery/Nutrition   | **High**      | Use atomic functional updates; avoid large file rewrites.       |
| `src/components/app/sheet.tsx` | Popup/Sheet (#34)  | UI Integrations      | **Critical**  | Freeze all new sheet usage until #34 is merged.                 |
| `src/lib/jarvis/tools.ts`      | Jarvis/Tools       | Engine               | **High**      | Separate engine-specific tools into a dedicated file if needed. |
| `styles.css`                   | UI/Styling         | All                  | **Medium**    | Use existing Tailwind classes; avoid global CSS overrides.      |

---

## 4. PR Validation Checklist

Before submitting any PR, ensure:

1. **Scope Check:** Does this PR contain changes outside its primary goal? (e.g., UI polish in a Model PR). If yes, split it.
2. **Migration Check:** If `src/lib/types.ts` was changed, is `FITCORE_DATA_VERSION` updated and a migration provided?
3. **No-Silencing:** Ensure no `console.log` or debug code remains.
4. **Tool Integrity:** If modifying Jarvis tools, verify against `docs/audits/jarvis-tool-safety-audit.md`.
5. **Parallel Check:** If working on UI, confirm no active conflicts with #34 popup positioning.
