import fg from "fast-glob";
import { applyIgnoreRules, FAST_GLOB_PRUNE_PATTERNS, loadIgnoreRules } from "./ignoreRules.ts";

export async function scanTree(repoRoot: string): Promise<string[]> {
  const files = await fg(["**/*"], {
    cwd: repoRoot,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: FAST_GLOB_PRUNE_PATTERNS,
  });

  const rules = await loadIgnoreRules(repoRoot);

  return applyIgnoreRules(rules, files).sort((a, b) => a.localeCompare(b));
}
