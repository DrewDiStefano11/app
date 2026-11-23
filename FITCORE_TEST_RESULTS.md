# FitCore regression reconciliation results

November 23, 2026 — PR #312 reconciled with main f784d55 after #308.

## Scope and evidence

Six new files provide 15 scenarios. All original coverage is retained. The original desktop WHOOP failure reproduced (90% expected, 80% received); its scheduling assumption was corrected without production changes. See FITCORE_BUG_REPORT.md. The same fake clock now works.

Desktop validation: corrected WHOOP 2/2; other five files 13/13; strengthened Settings/provider-error cases 5/5. Independent review requested a distinct successful-retry value in the manual-record preservation test; the final case now awaits 90% before comparing every sleep entry and timestamp. Final mobile and retry validation is recorded in the PR discussion and handoff when complete.

Settings now actually changes and verifies a preference after reload, and exports, reads, mutates, imports and reloads a backup. Jarvis failure waits for explicit error feedback before checking draft retention. No production code or dependencies changed. Scoped semantic lint and git diff --check pass.

## Interpretation

The original result was 14 passed and 1 failed, total 15. The failed case was described as blocked; it was not an additional sixteenth test. The original claim of a React/fake-clock rendering limitation is superseded by the reproduced scheduling cause.

Existing Kilo baseline evidence is preserved in Git history; it is not rerun or relabeled as new validation. Hosted checks must pass on the final reconciled head before merge. Browser fixtures use synthetic records and mocked provider responses, with no credentials or real health records.

Installed-iPhone camera picker, native keyboard, actual provider accuracy and WHOOP cold-start acceptance require physical testing. The current goal's unresolved cold-start report supersedes earlier release notes claiming it was physically confirmed fixed.

Final validation: all 30 mobile cases passed across iPhone WebKit and mobile Chromium (2.8m). After independent review and replacing the fixed settlement delay with the app's actual refresh-complete status, final WHOOP tests passed 6/6 across desktop Chromium, mobile Chromium and iPhone WebKit (22.3s). The intermediate repeat had 2 WebKit retry timeouts and 4 Chromium passes; it was not a clean pass and is superseded by the final 6/6. No application code changed.
