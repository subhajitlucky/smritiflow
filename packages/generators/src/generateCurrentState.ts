import type { ScanReport } from "../../shared/src/types.ts";

export function generateCurrentState(scanReport: ScanReport): string {
  const changed =
    scanReport.changedFiles.length === 0
      ? ["- no changed files detected"]
      : scanReport.changedFiles.map((f) => `- ${f}`);

  const activeAreas =
    scanReport.activeAreas.length === 0
      ? ["- no active areas inferred"]
      : scanReport.activeAreas.map((a) => `- ${a}`);

  const staleWarnings =
    scanReport.staleWarnings.length === 0
      ? ["- no stale warnings"]
      : scanReport.staleWarnings.map((w) => `- ${w}`);

  return [
    "# Current State",
    "",
    `- Generated at: ${scanReport.generatedAt}`,
    `- Branch: ${scanReport.branch}`,
    `- Last commit: ${scanReport.lastCommit}`,
    "",
    "## Recent Commits",
    ...scanReport.recentCommits.map((commit) => `- ${commit}`),
    "",
    "## Changed Files",
    ...changed,
    "",
    "## Likely Active Areas",
    ...activeAreas,
    "",
    "## Active Work Signals",
    `- Changed file count: ${scanReport.changedFiles.length}`,
    `- Active area count: ${scanReport.activeAreas.length}`,
    "",
    "## Known TODOs",
    "- no TODO extraction yet",
    "",
    "## Likely Next Steps",
    "- run `smritiflow refresh` after code changes",
    "- run `smritiflow status` before resuming",
    "",
    "## Stale Warnings",
    ...staleWarnings,
  ].join("\n");
}
