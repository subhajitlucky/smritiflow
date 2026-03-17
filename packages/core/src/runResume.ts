import path from "node:path";
import fs from "fs-extra";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import type { ScanReport } from "../../shared/src/types.ts";
import { uniqueSorted } from "../../shared/src/utils.ts";

function inferAreasFromChanged(changedFiles: string[]): string[] {
  const values = changedFiles
    .map((filePath) => filePath.replaceAll("\\", "/"))
    .map((normalized) => normalized.split("/").slice(0, 2).join("/"))
    .filter((item) => item.length > 0);

  return uniqueSorted(values);
}

export async function runResume(cwd: string): Promise<void> {
  const repoRoot = await findRepoRoot(cwd);
  const scanReportPath = path.join(repoRoot, ".smritiflow", "scan-report.json");

  if (!(await fs.pathExists(scanReportPath))) {
    console.log("No scan report found. Run: smritiflow scan");
    return;
  }

  const [scanReport, changedFiles] = await Promise.all([
    fs.readJson(scanReportPath) as Promise<ScanReport>,
    getChangedFiles(repoRoot),
  ]);

  const activeAreas =
    changedFiles.length > 0
      ? inferAreasFromChanged(changedFiles)
      : scanReport.activeAreas;

  console.log("SmritiFlow resume");
  console.log("Read first:");
  console.log("- AGENTS.md");
  console.log("- docs/ai/PROJECT_OVERVIEW.md");
  console.log("- docs/ai/CURRENT_STATE.md");
  console.log("- docs/ai/RUNBOOK.md");

  console.log("\nRecent commits:");
  for (const commit of scanReport.recentCommits.slice(0, 5)) {
    console.log(`- ${commit}`);
  }

  console.log("\nLikely active areas:");
  for (const area of activeAreas.slice(0, 8)) {
    console.log(`- ${area}`);
  }

  console.log("\nChanged files right now:");
  if (changedFiles.length === 0) {
    console.log("- no local changes");
  } else {
    for (const file of changedFiles.slice(0, 12)) {
      console.log(`- ${file}`);
    }
  }

  console.log("\nSuggested next steps:");
  if (changedFiles.length > 0) {
    console.log("- Run smritiflow refresh");
    console.log("- Re-open docs/ai/CURRENT_STATE.md");
  } else {
    console.log("- Continue implementation in the top active area");
    console.log("- Re-run smritiflow status before finishing");
  }
}
