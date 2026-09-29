import path from "node:path";
import fs from "fs-extra";
import type {
  CacheData,
  ProjectMap,
  RefreshCommandResult,
  RefreshMode,
  ScanReport,
} from "../../shared/src/types.ts";
import type { Reporter } from "./reporter.ts";
import { consoleReporter } from "./reporter.ts";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { shouldTrackChangedFile } from "../../git/src/getChangedFiles.ts";
import { getCurrentBranch } from "../../git/src/getCurrentBranch.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import { getRecentCommits } from "../../git/src/getRecentCommits.ts";
import { scanTree } from "../../repo-parser/src/scanTree.ts";
import { readConfigs } from "../../repo-parser/src/readConfigs.ts";
import { detectFolders } from "../../repo-parser/src/detectFolders.ts";
import { readReadme } from "../../repo-parser/src/readReadme.ts";
import { extractRoutes } from "../../repo-parser/src/extractRoutes.ts";
import { extractTodos } from "../../repo-parser/src/extractTodos.ts";
import { buildImportGraph } from "../../repo-parser/src/buildImportGraph.ts";
import { generateOverview } from "../../generators/src/generateOverview.ts";
import { generateCurrentState } from "../../generators/src/generateCurrentState.ts";
import {
  ARTIFACT_SCHEMA_VERSION,
  DOCS_AI_DIR,
  GENERATED_FILES,
  SMRITI_DIR,
} from "../../shared/src/constants.ts";
import { nowIso, uniqueSorted } from "../../shared/src/utils.ts";
import { classifyChanges, diffHashes, type HashDiff } from "./changeDetection.ts";
import { computeFileHashes, inferActiveAreas, summarizeReadme } from "./scanMetadata.ts";
import { readCache, runScan } from "./runScan.ts";

const FULL_SCAN_TOUCHED_THRESHOLD = 200;
const FULL_SCAN_ADDED_THRESHOLD = 60;

interface RefreshEnvironment {
  repoRoot: string;
  branch: string;
  lastCommit: string;
  recentCommits: string[];
}

function normalizePaths(paths: string[]): string[] {
  return uniqueSorted(
    paths
      .map((filePath) => filePath.replaceAll("\\", "/"))
      .filter((filePath) => filePath.length > 0 && shouldTrackChangedFile(filePath))
  );
}

function writeCache(cache: CacheData, repoRoot: string): Promise<void> {
  return fs.writeJson(path.join(repoRoot, SMRITI_DIR, "cache.json"), cache, { spaces: 2 });
}

function requiresFullScan(
  diff: HashDiff,
  touched: string[],
  hasBaseline: boolean,
  strategyChanged: boolean
): string | null {
  if (!hasBaseline) {
    return "no fingerprint baseline to compare against";
  }
  if (strategyChanged) {
    return "fingerprint strategy changed since the last scan";
  }
  if (classifyChanges(diff).manifestChanged) {
    return "project manifest changed";
  }
  if (touched.length > FULL_SCAN_TOUCHED_THRESHOLD) {
    return `high change volume (${touched.length} files)`;
  }
  if (diff.added.length > FULL_SCAN_ADDED_THRESHOLD) {
    return `many new files (${diff.added.length})`;
  }
  if (diff.removed.length > FULL_SCAN_ADDED_THRESHOLD) {
    return `many removed files (${diff.removed.length})`;
  }
  return null;
}

interface PartialInput {
  repoRoot: string;
  files: string[];
  previousCache: CacheData;
  previousMap: ProjectMap;
  previousReport: ScanReport;
  hashes: Record<string, string>;
  strategy: CacheData["hashStrategy"];
  diff: HashDiff;
  env: RefreshEnvironment;
  categories: ReturnType<typeof classifyChanges>;
}

/**
 * Re-runs only the analyzers whose inputs changed, reusing the tree listing and
 * fingerprints the caller already computed. The previous implementation always
 * walked the full tree and regenerated every document, so a "partial" refresh
 * cost about as much as a scan.
 */
async function runPartialRefresh(input: PartialInput): Promise<string[]> {
  const { repoRoot, files, previousCache, previousMap, previousReport, diff, env, categories } =
    input;

  const refreshedSections: string[] = [];
  const nextMap: ProjectMap = { ...previousMap };
  const nextReport: ScanReport = {
    ...previousReport,
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    fileCount: files.length,
  };

  if (categories.configChanged) {
    nextMap.configs = await readConfigs(repoRoot, files);
    refreshedSections.push("configs");
  }

  if (categories.structureChanged) {
    nextMap.folders = detectFolders(files);
    refreshedSections.push("folders");
  }

  if (categories.sourceChanged) {
    const [routes, moduleGraph, todos] = await Promise.all([
      extractRoutes(repoRoot),
      buildImportGraph(repoRoot, files),
      extractTodos(repoRoot, files),
    ]);
    nextMap.routes = routes;
    nextMap.moduleGraph = moduleGraph;
    nextReport.todos = todos;
    refreshedSections.push("routes", "moduleGraph", "todos");
  }

  const overviewChanged =
    categories.readmeChanged || categories.sourceChanged || categories.configChanged || categories.structureChanged;

  if (categories.docsChanged) {
    nextReport.todos = await extractTodos(repoRoot, files);
    if (!refreshedSections.includes("todos")) {
      refreshedSections.push("todos");
    }
  }

  if (overviewChanged) {
    const readme = await readReadme(repoRoot, files);
    await fs.writeFile(
      path.join(repoRoot, DOCS_AI_DIR, "PROJECT_OVERVIEW.md"),
      `${generateOverview(nextMap, nextReport, summarizeReadme(readme)).trimEnd()}\n`
    );
    refreshedSections.push("overview");
  }

  const touched = normalizePaths([...diff.changed, ...diff.added, ...diff.removed]);

  Object.assign(nextReport, {
    generatedAt: nowIso(),
    branch: env.branch,
    lastCommit: env.lastCommit,
    recentCommits: env.recentCommits,
    changedFiles: normalizePaths([...diff.changed, ...diff.added]),
    addedFiles: diff.added,
    removedFiles: diff.removed,
    activeAreas: inferActiveAreas(touched),
    notes: [`Partial refresh re-ran: ${refreshedSections.join(", ") || "nothing"}.`],
    staleWarnings: [],
  } satisfies Partial<ScanReport>);

  await fs.writeFile(
    path.join(repoRoot, DOCS_AI_DIR, "CURRENT_STATE.md"),
    `${generateCurrentState(nextReport).trimEnd()}\n`
  );

  await fs.writeJson(
    path.join(repoRoot, SMRITI_DIR, "project-map.json"),
    nextMap,
    { spaces: 2 }
  );
  await fs.writeJson(
    path.join(repoRoot, SMRITI_DIR, "scan-report.json"),
    nextReport,
    { spaces: 2 }
  );
  await writeCache(
    {
      ...previousCache,
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      lastRefreshAt: nowIso(),
      lastCommit: env.lastCommit,
      hashes: input.hashes,
      hashStrategy: input.strategy,
      generatedFiles: GENERATED_FILES,
    },
    repoRoot
  );

  return refreshedSections;
}

export async function runRefresh(
  cwd: string,
  reporter: Reporter = consoleReporter
): Promise<RefreshCommandResult> {
  const repoRoot = await findRepoRoot(cwd);
  const previousCache = await readCache(repoRoot);

  if (!previousCache) {
    reporter.log("No fingerprint baseline. Running full scan instead.");
    await runScan(repoRoot, reporter);
    return emptyResult(
      repoRoot,
      "full",
      "no fingerprint baseline",
      await getLastCommit(repoRoot),
      []
    );
  }

  const files = await scanTree(repoRoot);
  const { hashes, strategy } = await computeFileHashes(repoRoot, files);

  const [branch, lastCommit, recentCommits] = await Promise.all([
    getCurrentBranch(repoRoot),
    getLastCommit(repoRoot),
    getRecentCommits(repoRoot, 8),
  ]);
  const env: RefreshEnvironment = { repoRoot, branch, lastCommit, recentCommits };

  // Content fingerprints are authoritative. Git only supplies commit metadata,
  // because an uncommitted file whose content is already fingerprinted needs no
  // regeneration and reporting it as changed would be noise.
  const diff = diffHashes(previousCache.hashes ?? {}, hashes);
  const touched = normalizePaths([...diff.changed, ...diff.added, ...diff.removed]);
  const schemaChanged =
    previousCache.schemaVersion !== undefined && previousCache.schemaVersion !== ARTIFACT_SCHEMA_VERSION;

  // An artifact written by an older schema cannot be compared against, so it is
  // rebuilt even when no file changed. Without this the old shape would persist
  // indefinitely on a quiet repository.
  if (schemaChanged) {
    await runScan(repoRoot, reporter);
    reporter.log(`Refresh complete. Changed files: ${touched.length}`);
    return result(
      repoRoot,
      "full",
      `artifact schema changed (${ARTIFACT_SCHEMA_VERSION})`,
      lastCommit,
      diff,
      touched,
      ["full scan"]
    );
  }

  if (touched.length === 0) {
    await writeCache(
      {
        ...previousCache,
        lastRefreshAt: nowIso(),
        lastCommit,
        hashes,
        hashStrategy: strategy,
        generatedFiles: GENERATED_FILES,
      },
      repoRoot
    );
    reporter.log("No changes detected. Project memory is already fresh.");
    return emptyResult(repoRoot, "none", null, lastCommit, []);
  }

  const projectMapPath = path.join(repoRoot, SMRITI_DIR, "project-map.json");
  const scanReportPath = path.join(repoRoot, SMRITI_DIR, "scan-report.json");

  if (!(await fs.pathExists(projectMapPath)) || !(await fs.pathExists(scanReportPath))) {
    await runScan(repoRoot, reporter);
    reporter.log(`Refresh complete. Changed files: ${touched.length}`);
    return result(repoRoot, "full", "missing artifact files", lastCommit, diff, touched, ["full scan"]);
  }

  const hasBaseline = Object.keys(previousCache.hashes ?? {}).length > 0;
  const strategyChanged = previousCache.hashStrategy !== undefined && previousCache.hashStrategy !== strategy;
  const fullScanReason = requiresFullScan(diff, touched, hasBaseline, strategyChanged);

  if (fullScanReason) {
    await runScan(repoRoot, reporter);
    reporter.log(`Refresh complete. Changed files: ${touched.length}`);
    return result(repoRoot, "full", fullScanReason, lastCommit, diff, touched, ["full scan"]);
  }

  const [previousMap, previousReport] = await Promise.all([
    fs.readJson(projectMapPath) as Promise<ProjectMap>,
    fs.readJson(scanReportPath) as Promise<ScanReport>,
  ]);

  const refreshedSections = await runPartialRefresh({
    repoRoot,
    files,
    previousCache,
    previousMap,
    previousReport,
    hashes,
    strategy,
    diff,
    env,
    categories: classifyChanges(diff),
  });

  reporter.log(`Refresh complete. Changed files: ${touched.length}`);

  return result(repoRoot, "partial", null, lastCommit, diff, touched, refreshedSections);
}

function emptyResult(
  repoRoot: string,
  mode: RefreshMode,
  reason: string | null,
  lastCommit: string,
  touched: string[]
): RefreshCommandResult {
  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    command: "refresh",
    ok: true,
    repoRoot,
    mode,
    reason,
    changedFiles: touched,
    changedCount: touched.length,
    addedFiles: [],
    removedFiles: [],
    activeAreas: [],
    refreshedSections: mode === "full" ? ["full scan"] : [],
    lastCommit,
  };
}

function result(
  repoRoot: string,
  mode: RefreshMode,
  reason: string | null,
  lastCommit: string,
  diff: HashDiff,
  touched: string[],
  refreshedSections: string[]
): RefreshCommandResult {
  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    command: "refresh",
    ok: true,
    repoRoot,
    mode,
    reason,
    changedFiles: touched,
    changedCount: touched.length,
    addedFiles: diff.added,
    removedFiles: diff.removed,
    activeAreas: inferActiveAreas(touched),
    refreshedSections,
    lastCommit,
  };
}
