import path from "node:path";
import fs from "fs-extra";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getCurrentBranch } from "../../git/src/getCurrentBranch.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import type { CacheData } from "../../shared/src/types.ts";

export async function runStatus(cwd: string): Promise<void> {
  const repoRoot = await findRepoRoot(cwd);
  const cachePath = path.join(repoRoot, ".smritiflow", "cache.json");

  if (!(await fs.pathExists(cachePath))) {
    console.log("SmritiFlow is not initialized. Run: smritiflow init");
    return;
  }

  const cache = (await fs.readJson(cachePath)) as CacheData;
  const [branch, changedFiles, currentCommit] = await Promise.all([
    getCurrentBranch(repoRoot),
    getChangedFiles(repoRoot),
    getLastCommit(repoRoot),
  ]);

  const staleReasons: string[] = [];

  if (!cache.lastScanAt) {
    staleReasons.push("no scan has been recorded");
  }

  if (changedFiles.length > 0) {
    staleReasons.push(`working tree has ${changedFiles.length} changed file(s)`);
  }

  if (cache.lastCommit && cache.lastCommit !== currentCommit) {
    staleReasons.push("HEAD commit differs from last scanned commit");
  }

  const stale = staleReasons.length > 0;

  console.log("SmritiFlow status");
  console.log(`- Repo: ${repoRoot}`);
  console.log(`- Branch: ${branch}`);
  console.log(`- Last scan: ${cache.lastScanAt ?? "never"}`);
  console.log(`- Last refresh: ${cache.lastRefreshAt ?? "never"}`);
  console.log(`- Last scanned commit: ${cache.lastCommit ?? "unknown"}`);
  console.log(`- Current commit: ${currentCommit}`);
  console.log(`- Changed files: ${changedFiles.length}`);
  console.log(`- Stale: ${stale ? "yes" : "no"}`);

  if (stale) {
    for (const reason of staleReasons) {
      console.log(`  - ${reason}`);
    }
    console.log("Recommended action: smritiflow refresh");
  } else {
    console.log("Project memory looks fresh.");
  }
}
