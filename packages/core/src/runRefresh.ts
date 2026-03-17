import path from "node:path";
import fs from "fs-extra";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import { runScan } from "./runScan.ts";
import type { CacheData, ScanReport } from "../../shared/src/types.ts";
import { nowIso, sha256File, topLevelArea, uniqueSorted } from "../../shared/src/utils.ts";

async function computeHashes(repoRoot: string): Promise<Record<string, string>> {
  const keyFiles = [
    "package.json",
    "README.md",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "tsconfig.base.json",
  ];

  const hashes: Record<string, string> = {};
  for (const rel of keyFiles) {
    const hash = await sha256File(path.join(repoRoot, rel));
    if (hash) {
      hashes[rel] = hash;
    }
  }

  return hashes;
}

function diffHashKeys(
  previous: Record<string, string>,
  current: Record<string, string>
): string[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  const changed: string[] = [];

  for (const key of keys) {
    if (previous[key] !== current[key]) {
      changed.push(key);
    }
  }

  return changed;
}

export async function runRefresh(cwd: string): Promise<void> {
  const repoRoot = await findRepoRoot(cwd);
  const cachePath = path.join(repoRoot, ".smritiflow", "cache.json");

  if (!(await fs.pathExists(cachePath))) {
    console.log("No cache found. Running full scan instead.");
    await runScan(repoRoot);
    return;
  }

  const prevCache = (await fs.readJson(cachePath)) as CacheData;
  const [gitChanged, currentHashes] = await Promise.all([
    getChangedFiles(repoRoot),
    computeHashes(repoRoot),
  ]);

  const hashChanged = diffHashKeys(prevCache.hashes ?? {}, currentHashes);
  const allChanged = uniqueSorted([...gitChanged, ...hashChanged]);

  if (allChanged.length === 0) {
    const nextCache: CacheData = {
      ...prevCache,
      lastRefreshAt: nowIso(),
      hashes: currentHashes,
    };

    await fs.writeJson(cachePath, nextCache, { spaces: 2 });
    console.log("No changes detected. Project memory is already fresh.");
    return;
  }

  await runScan(repoRoot);

  const scanReportPath = path.join(repoRoot, ".smritiflow", "scan-report.json");
  const refreshedCache = (await fs.readJson(cachePath)) as CacheData;
  const scanReport = (await fs.readJson(scanReportPath)) as ScanReport;

  const changedAreas = uniqueSorted(allChanged.map((file) => topLevelArea(file)));
  scanReport.staleWarnings = [
    `Refreshed due to changes in: ${changedAreas.join(", ")}`,
  ];

  const nextCache: CacheData = {
    ...refreshedCache,
    lastRefreshAt: nowIso(),
    lastCommit: await getLastCommit(repoRoot),
    hashes: currentHashes,
  };

  await fs.writeJson(scanReportPath, scanReport, { spaces: 2 });
  await fs.writeJson(cachePath, nextCache, { spaces: 2 });

  console.log(`Refresh complete. Changed files: ${allChanged.length}`);
}
