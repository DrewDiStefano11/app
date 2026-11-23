import type { AppState } from "../types";
import type { ToolResult } from "./tools";

export type JarvisStateUpdate = (state: AppState) => AppState;
export type CommitJarvisState = (update: JarvisStateUpdate) => boolean;

export function commitJarvisAction(
  base: AppState,
  commit: CommitJarvisState,
  action: (stage: (update: JarvisStateUpdate) => void) => ToolResult,
): ToolResult {
  let proposed = base;
  const result = action((update) => {
    proposed = update(proposed);
  });
  if (!result.ok || result.needsConfirmation || proposed === base) return result;

  let currentMatches = false;
  try {
    const saved = commit((current) => {
      currentMatches = current === base;
      return currentMatches ? proposed : current;
    });
    if (!currentMatches) {
      return {
        ok: false,
        summary:
          "FitCore changed while Jarvis was reviewing this action. Ask again to review the current data.",
      };
    }
    if (saved) return result;
  } catch {
    // The store may reject a commit before publishing a verified state.
  }
  return {
    ok: false,
    summary: "FitCore could not verify the save. Check the current record before retrying.",
  };
}
