import path from "node:path";
import fs from "fs-extra";
import type { StatusCommandResult } from "../../shared/src/types.ts";
import type { Reporter } from "./reporter.ts";
import { consoleReporter } from "./reporter.ts";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getCurrentBranch } from "../../git/src/getCurrentBranch.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import { SMRITI_DIR } from "../../shared/src/constants.ts";
import { readCache } from "./runScan.ts";

/**
 * Status compares the recorded commit and working tree against HEAD. It used to
 * report freshness from the working tree alone, so a repository that was clean
 * but many commits ahead of the last scan still looked fresh.
 */
export async function runStatus(
  cwd: string,
  reporter: Reporter = consoleReporter
): Promise<StatusCommandResult> {
  const repoRoot = await findRepoRoot(cwd);
  const cache = await readCache(repoRoot);
  const [branch, changedFiles, currentCommit] = await Promise.all([
    getCurrentBranch(repoRoot),
    getChangedFiles(repoRoot),
    getLastCommit(repoRoot),
  ]);

  if (!cache) {
    // The fingerprint baseline is local and gitignored, so a fresh clone can
    // have generated artifacts without one. That is not the same as never
    // having run a scan.
    const initialized = await fs.pathExists(path.join(repoRoot, SMRITI_DIR, "project-map.json"));
    const reason = initialized
      ? "no local fingerprint baseline (run refresh to rebuild it)"
      : "no scan has been recorded";

    reporter.log("SmritiFlow status");
    reporter.log(`- Repo: ${repoRoot}`);
    reporter.log(`- Initialized: ${initialized ? "yes" : "no"}`);
    reporter.log("- Fingerprint baseline: absent");
    reporter.log("- Stale: yes");
    reporter.log(`  - ${reason}`);
    reporter.log(`Recommended action: smritiflow ${initialized ? "refresh" : "init"}`);

    return {
      command: "status",
      ok: true,
      repoRoot,
      initialized,
      hasBaseline: false,
      branch,
      lastScanAt: null,
      lastRefreshAt: null,
      lastCommit: null,
      currentCommit,
      changedFiles: [],
      stale: true,
      staleReasons: [reason],
    };
  }

  const staleReasons: string[] = [];

  if (!cache.lastScanAt) {
    staleReasons.push("no scan has been recorded");
  }

  if (changedFiles.length > 0) {
    staleReasons.push(`working tree has ${changedFiles.length} changed file(s)`);
  }

  if (cache.lastCommit && cache.lastCommit !== "unknown" && cache.lastCommit !== currentCommit) {
    staleReasons.push(
      `HEAD commit ${currentCommit.slice(0, 7)} differs from last scanned commit ${cache.lastCommit.slice(0, 7)}`
    );
  }

  if (!(await fs.pathExists(path.join(repoRoot, SMRITI_DIR, "project-map.json")))) {
    staleReasons.push("project-map.json is missing");
  }

  const stale = staleReasons.length > 0;

  reporter.log("SmritiFlow status");
  reporter.log(`- Repo: ${repoRoot}`);
  reporter.log("- Initialized: yes");
  reporter.log(`- Branch: ${branch}`);
  reporter.log(`- Last scan: ${cache.lastScanAt ?? "never"}`);
  reporter.log(`- Last refresh: ${cache.lastRefreshAt ?? "never"}`);
  reporter.log(`- Last scanned commit: ${cache.lastCommit ?? "unknown"}`);
  reporter.log(`- Current commit: ${currentCommit}`);
  reporter.log(`- Fingerprint strategy: ${cache.hashStrategy ?? "unknown"}`);
  reporter.log(`- Tracked fingerprints: ${Object.keys(cache.hashes ?? {}).length}`);
  reporter.log(`- Changed files: ${changedFiles.length}`);
  reporter.log(`- Stale: ${stale ? "yes" : "no"}`);

  if (stale) {
    for (const reason of staleReasons) {
      reporter.log(`  - ${reason}`);
    }
    reporter.log("Recommended action: smritiflow refresh");
  } else {
    reporter.log("Project memory looks fresh.");
  }

  return {
    command: "status",
    ok: true,
    repoRoot,
    initialized: true,
    hasBaseline: true,
    branch,
    lastScanAt: cache.lastScanAt,
    lastRefreshAt: cache.lastRefreshAt,
    lastCommit: cache.lastCommit ?? null,
    currentCommit,
    changedFiles,
    stale,
    staleReasons,
  };
}
