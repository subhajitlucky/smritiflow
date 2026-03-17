import path from "node:path";
import fs from "fs-extra";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { getCurrentBranch } from "../../git/src/getCurrentBranch.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import { getRecentCommits } from "../../git/src/getRecentCommits.ts";
import { runScan } from "./runScan.ts";
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
import { GENERATED_FILES } from "../../shared/src/constants.ts";
import type { CacheData, ProjectMap, ScanReport } from "../../shared/src/types.ts";
import { nowIso, uniqueSorted } from "../../shared/src/utils.ts";
import { computeHashes, inferActiveAreas, summarizeReadme } from "./scanMetadata.ts";

interface ChangeCategories {
  packageChanged: boolean;
  readmeChanged: boolean;
  configChanged: boolean;
  sourceChanged: boolean;
  foldersChanged: boolean;
  highVolume: boolean;
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

function normalizeChangedPaths(paths: string[]): string[] {
  return uniqueSorted(
    paths
      .map((filePath) => filePath.replaceAll("\\", "/"))
      .filter((filePath) => filePath.length > 0)
      .filter((filePath) => !filePath.startsWith(".smritiflow/"))
  );
}

function isConfigPath(filePath: string): boolean {
  return (
    filePath.endsWith("tsconfig.json") ||
    filePath.endsWith("tsconfig.base.json") ||
    filePath.endsWith("pnpm-workspace.yaml") ||
    filePath.endsWith("next.config.js") ||
    filePath.endsWith("next.config.ts") ||
    filePath.endsWith("vite.config.js") ||
    filePath.endsWith("vite.config.ts") ||
    filePath.endsWith("eslint.config.js") ||
    filePath.endsWith("eslint.config.ts") ||
    filePath.endsWith("jsconfig.json") ||
    filePath.endsWith(".env.example")
  );
}

function isSourcePath(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|mdx)$/.test(filePath);
}

function classifyChanges(changedFiles: string[]): ChangeCategories {
  return {
    packageChanged: changedFiles.some(
      (filePath) =>
        filePath === "package.json" ||
        filePath === "pnpm-lock.yaml" ||
        filePath === "pnpm-workspace.yaml"
    ),
    readmeChanged: changedFiles.some((filePath) => filePath === "README.md"),
    configChanged: changedFiles.some(isConfigPath),
    sourceChanged: changedFiles.some(isSourcePath),
    foldersChanged: changedFiles.some((filePath) =>
      ["apps/", "packages/", "src/", "tests/", "scripts/", "docs/", "prisma/"]
        .some((prefix) => filePath.startsWith(prefix))
    ),
    highVolume: changedFiles.length > 200,
  };
}

async function runFullRefresh(
  repoRoot: string,
  reason: string,
  currentHashes: Record<string, string>,
  allChanged: string[]
): Promise<void> {
  await runScan(repoRoot);

  const cachePath = path.join(repoRoot, ".smritiflow", "cache.json");
  const scanReportPath = path.join(repoRoot, ".smritiflow", "scan-report.json");

  const [refreshedCache, scanReport, lastCommit] = await Promise.all([
    fs.readJson(cachePath) as Promise<CacheData>,
    fs.readJson(scanReportPath) as Promise<ScanReport>,
    getLastCommit(repoRoot),
  ]);

  const changedAreas = inferActiveAreas(allChanged);
  scanReport.staleWarnings = [
    `Refreshed using full scan (${reason}). Areas: ${changedAreas.join(", ") || "none"}`,
  ];

  const nextCache: CacheData = {
    ...refreshedCache,
    lastRefreshAt: nowIso(),
    lastCommit,
    hashes: currentHashes,
    generatedFiles: GENERATED_FILES,
  };

  await fs.ensureDir(path.join(repoRoot, "docs", "ai"));
  await fs.writeFile(
    path.join(repoRoot, "docs", "ai", "CURRENT_STATE.md"),
    generateCurrentState(scanReport)
  );
  await fs.writeJson(scanReportPath, scanReport, { spaces: 2 });
  await fs.writeJson(cachePath, nextCache, { spaces: 2 });
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
  const [gitChangedRaw, currentHashes, branch, lastCommit, recentCommits] = await Promise.all([
    getChangedFiles(repoRoot),
    computeHashes(repoRoot),
    getCurrentBranch(repoRoot),
    getLastCommit(repoRoot),
    getRecentCommits(repoRoot, 8),
  ]);

  const hashChanged = diffHashKeys(prevCache.hashes ?? {}, currentHashes);
  const allChanged = normalizeChangedPaths([...gitChangedRaw, ...hashChanged]);
  const gitChanged = normalizeChangedPaths(gitChangedRaw);

  if (allChanged.length === 0) {
    const nextCache: CacheData = {
      ...prevCache,
      lastRefreshAt: nowIso(),
      lastCommit,
      hashes: currentHashes,
      generatedFiles: GENERATED_FILES,
    };

    await fs.writeJson(cachePath, nextCache, { spaces: 2 });
    console.log("No changes detected. Project memory is already fresh.");
    return;
  }

  const projectMapPath = path.join(repoRoot, ".smritiflow", "project-map.json");
  const scanReportPath = path.join(repoRoot, ".smritiflow", "scan-report.json");
  const docsDir = path.join(repoRoot, "docs", "ai");
  await fs.ensureDir(docsDir);

  if (!(await fs.pathExists(projectMapPath)) || !(await fs.pathExists(scanReportPath))) {
    await runFullRefresh(repoRoot, "missing artifact files", currentHashes, allChanged);
    console.log(`Refresh complete. Changed files: ${allChanged.length}`);
    return;
  }

  const categories = classifyChanges(allChanged);
  if (categories.highVolume) {
    await runFullRefresh(repoRoot, "high change volume", currentHashes, allChanged);
    console.log(`Refresh complete. Changed files: ${allChanged.length}`);
    return;
  }

  const [prevProjectMap, prevScanReport] = await Promise.all([
    fs.readJson(projectMapPath) as Promise<ProjectMap>,
    fs.readJson(scanReportPath) as Promise<ScanReport>,
  ]);

  const nextProjectMap: ProjectMap = {
    ...prevProjectMap,
  };

  let fileCount = prevScanReport.fileCount;
  const treeFiles = await scanTree(repoRoot);
  fileCount = treeFiles.length;

  if (categories.packageChanged) {
    const pkg = await readPackageJson(repoRoot);
    const scripts = pkg.scripts ?? {};
    const dependencyNames = uniqueSorted([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);

    nextProjectMap.name = pkg.name ?? path.basename(repoRoot);
    nextProjectMap.scripts = scripts;
    nextProjectMap.dependencies = dependencyNames;
    nextProjectMap.detectedStack = detectStack(pkg);
  }

  if (categories.configChanged) {
    nextProjectMap.configs = await readConfigs(repoRoot);
  }

  if (categories.foldersChanged || categories.sourceChanged) {
    nextProjectMap.folders = await detectFolders(repoRoot);
  }

  if (categories.sourceChanged) {
    const [routes, moduleGraph] = await Promise.all([
      extractRoutes(repoRoot),
      buildImportGraph(repoRoot, treeFiles),
    ]);

    nextProjectMap.routes = routes;
    nextProjectMap.moduleGraph = moduleGraph;
  }

  const nextScanReport: ScanReport = {
    ...prevScanReport,
    generatedAt: nowIso(),
    branch,
    lastCommit,
    recentCommits,
    changedFiles: gitChanged,
    activeAreas: inferActiveAreas(allChanged),
    fileCount,
    staleWarnings: [
      `Partial refresh applied for areas: ${inferActiveAreas(allChanged).join(", ") || "none"}`,
    ],
  };

  const regenerateOverview =
    categories.packageChanged ||
    categories.readmeChanged ||
    categories.configChanged ||
    categories.sourceChanged ||
    categories.foldersChanged;

  if (regenerateOverview) {
    const readme = await readReadme(repoRoot);
    const overview = generateOverview(nextProjectMap, nextScanReport, summarizeReadme(readme));
    await fs.writeFile(path.join(docsDir, "PROJECT_OVERVIEW.md"), overview);
  }

  if (categories.packageChanged) {
    const runbook = generateRunbook(nextProjectMap.scripts);
    const agents = generateAgents(nextProjectMap);
    await fs.writeFile(path.join(docsDir, "RUNBOOK.md"), runbook);
    await fs.writeFile(path.join(repoRoot, "AGENTS.md"), agents);
  }

  const currentState = generateCurrentState(nextScanReport);
  await fs.writeFile(path.join(docsDir, "CURRENT_STATE.md"), currentState);

  const nextCache: CacheData = {
    ...prevCache,
    lastRefreshAt: nowIso(),
    lastCommit,
    hashes: currentHashes,
    generatedFiles: GENERATED_FILES,
  };

  await fs.writeJson(projectMapPath, nextProjectMap, { spaces: 2 });
  await fs.writeJson(scanReportPath, nextScanReport, { spaces: 2 });
  await fs.writeJson(cachePath, nextCache, { spaces: 2 });

  console.log(`Refresh complete. Changed files: ${allChanged.length}`);
}
