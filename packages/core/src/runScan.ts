import path from "node:path";
import fs from "fs-extra";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { getCurrentBranch } from "../../git/src/getCurrentBranch.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import { getRecentCommits } from "../../git/src/getRecentCommits.ts";
import { readPackageJson } from "../../repo-parser/src/readPackageJson.ts";
import { detectStack } from "../../repo-parser/src/detectStack.ts";
import { scanTree } from "../../repo-parser/src/scanTree.ts";
import { readConfigs } from "../../repo-parser/src/readConfigs.ts";
import { detectFolders } from "../../repo-parser/src/detectFolders.ts";
import { readReadme } from "../../repo-parser/src/readReadme.ts";
import { extractRoutes } from "../../repo-parser/src/extractRoutes.ts";
import { buildImportGraph } from "../../repo-parser/src/buildImportGraph.ts";
import { generateOverview } from "../../generators/src/generateOverview.ts";
import { generateCurrentState } from "../../generators/src/generateCurrentState.ts";
import { generateRunbook } from "../../generators/src/generateRunbook.ts";
import { generateAgents } from "../../generators/src/generateAgents.ts";
import { writeArtifacts } from "../../generators/src/writeArtifacts.ts";
import { GENERATED_FILES } from "../../shared/src/constants.ts";
import type { CacheData, ProjectMap, ScanReport } from "../../shared/src/types.ts";
import { nowIso, uniqueSorted } from "../../shared/src/utils.ts";
import { computeHashes, inferActiveAreas, summarizeReadme } from "./scanMetadata.ts";

export async function runScan(cwd: string): Promise<void> {
  const repoRoot = await findRepoRoot(cwd);

  const [files, pkg, configs, folders, readme, routes, branch, lastCommit, recentCommits, changedFiles] =
    await Promise.all([
      scanTree(repoRoot),
      readPackageJson(repoRoot),
      readConfigs(repoRoot),
      detectFolders(repoRoot),
      readReadme(repoRoot),
      extractRoutes(repoRoot),
      getCurrentBranch(repoRoot),
      getLastCommit(repoRoot),
      getRecentCommits(repoRoot, 8),
      getChangedFiles(repoRoot),
    ]);

  const scripts = pkg.scripts ?? {};
  const dependencyNames = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ];

  const activeAreas = inferActiveAreas(changedFiles);
  const moduleGraph = await buildImportGraph(repoRoot, files);

  const projectMap: ProjectMap = {
    name: pkg.name ?? path.basename(repoRoot),
    root: repoRoot,
    detectedStack: detectStack(pkg),
    scripts,
    folders,
    configs,
    dependencies: uniqueSorted(dependencyNames),
    routes,
    moduleGraph,
  };

  const scanReport: ScanReport = {
    generatedAt: nowIso(),
    branch,
    lastCommit,
    recentCommits,
    changedFiles,
    activeAreas,
    fileCount: files.length,
    staleWarnings: [],
  };

  const cachePath = path.join(repoRoot, ".smritiflow", "cache.json");
  let prevCache: CacheData = { lastScanAt: null, lastRefreshAt: null };

  if (await fs.pathExists(cachePath)) {
    prevCache = await fs.readJson(cachePath);
  }

  const cache: CacheData = {
    ...prevCache,
    lastScanAt: scanReport.generatedAt,
    lastCommit,
    hashes: await computeHashes(repoRoot),
    generatedFiles: GENERATED_FILES,
  };

  const readmeSummary = summarizeReadme(readme);

  const docs = {
    agents: generateAgents(projectMap),
    overview: generateOverview(projectMap, scanReport, readmeSummary),
    currentState: generateCurrentState(scanReport),
    runbook: generateRunbook(scripts),
  };

  await writeArtifacts({
    repoRoot,
    projectMap,
    scanReport,
    cache,
    docs,
  });

  console.log(`SmritiFlow scan complete at: ${repoRoot}`);
  console.log(`Scanned files: ${files.length}`);
  console.log(`Branch: ${branch}`);
}
