import path from "node:path";
import fs from "fs-extra";
import type {
  CacheData,
  ProjectMap,
  ScanCommandResult,
  ScanReport,
  Toolchain,
} from "../../shared/src/types.ts";
import type { Reporter } from "./reporter.ts";
import { consoleReporter } from "./reporter.ts";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { getCurrentBranch } from "../../git/src/getCurrentBranch.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import { getRecentCommits } from "../../git/src/getRecentCommits.ts";
import { readPackageJson } from "../../repo-parser/src/readPackageJson.ts";
import { readWorkspacePackages } from "../../repo-parser/src/readWorkspacePackages.ts";
import { detectEntryPoints } from "../../repo-parser/src/detectEntryPoints.ts";
import { detectStack } from "../../repo-parser/src/detectStack.ts";
import { detectToolchain } from "../../repo-parser/src/detectToolchain.ts";
import { readProjectIdentity } from "../../repo-parser/src/readProjectIdentity.ts";
import { detectPackageManager, type PackageManagerInfo } from "../../repo-parser/src/detectPackageManager.ts";
import { detectLanguages } from "../../repo-parser/src/detectLanguages.ts";
import { detectFolders } from "../../repo-parser/src/detectFolders.ts";
import { scanTree } from "../../repo-parser/src/scanTree.ts";
import { readConfigs } from "../../repo-parser/src/readConfigs.ts";
import { readReadme } from "../../repo-parser/src/readReadme.ts";
import { extractRoutes } from "../../repo-parser/src/extractRoutes.ts";
import { extractTodos } from "../../repo-parser/src/extractTodos.ts";
import { buildImportGraph } from "../../repo-parser/src/buildImportGraph.ts";
import { generateOverview } from "../../generators/src/generateOverview.ts";
import { generateCurrentState } from "../../generators/src/generateCurrentState.ts";
import { generateRunbook } from "../../generators/src/generateRunbook.ts";
import { generateAgents, type ProjectContext } from "../../generators/src/generateAgents.ts";
import { writeArtifacts } from "../../generators/src/writeArtifacts.ts";
import { GENERATED_FILES, SMRITI_DIR } from "../../shared/src/constants.ts";
import { isSourcePath } from "../../repo-parser/src/languages.ts";
import { nowIso, uniqueSorted } from "../../shared/src/utils.ts";
import { computeFileHashes, inferActiveAreas, summarizeReadme } from "./scanMetadata.ts";

export interface ProjectFacts {
  pkg: Awaited<ReturnType<typeof readPackageJson>>;
  packageManager: PackageManagerInfo;
  configs: string[];
  folders: Awaited<ReturnType<typeof detectFolders>>;
  readme: string;
  routes: string[];
  branch: string;
  lastCommit: string;
  recentCommits: string[];
  changedFiles: string[];
  todos: ScanReport["todos"];
  moduleGraph: ProjectMap["moduleGraph"];
  workspacePackages: ProjectMap["workspacePackages"];
  entryPoints: string[];
  identity: Awaited<ReturnType<typeof readProjectIdentity>>;
  toolchain: ProjectMap["toolchain"];
}

export function buildProjectContext(
  packageManager: PackageManagerInfo,
  toolchain: Toolchain,
  summary: string
): ProjectContext {
  return {
    packageManager: packageManager.name,
    installCommand: packageManager.install,
    runCommand: packageManager.run,
    execCommand: packageManager.exec,
    docsDir: "docs/ai",
    toolchain,
    summary,
  };
}

export async function collectProjectFacts(
  repoRoot: string,
  files: string[]
): Promise<ProjectFacts> {
  const pkg = await readPackageJson(repoRoot);

  const [
    packageManager,
    configs,
    folders,
    readme,
    routes,
    branch,
    lastCommit,
    recentCommits,
    changedFiles,
    todos,
    moduleGraph,
    workspacePackages,
    identity,
  ] = await Promise.all([
    detectPackageManager(repoRoot, pkg),
    readConfigs(repoRoot, files),
    detectFolders(repoRoot, files),
    readReadme(repoRoot, files),
    extractRoutes(repoRoot),
    getCurrentBranch(repoRoot),
    getLastCommit(repoRoot),
    getRecentCommits(repoRoot, 8),
    getChangedFiles(repoRoot),
    extractTodos(repoRoot, files),
    buildImportGraph(repoRoot, files),
    readWorkspacePackages(repoRoot, files, pkg),
    readProjectIdentity(repoRoot, files),
  ]);

  return {
    pkg,
    packageManager,
    configs,
    folders,
    readme,
    routes,
    branch,
    lastCommit,
    recentCommits,
    changedFiles,
    todos,
    moduleGraph,
    workspacePackages,
    entryPoints: detectEntryPoints(files),
    identity,
    toolchain: await detectToolchain(repoRoot, files, pkg),
  };
}

export function buildProjectMap(
  repoRoot: string,
  files: string[],
  facts: ProjectFacts
): ProjectMap {
  return {
    name: facts.identity.name ?? facts.pkg.name ?? path.basename(repoRoot),
    description: facts.identity.description || facts.pkg.description || "",
    root: repoRoot,
    packageManager: facts.toolchain.ecosystem === "node" ? facts.packageManager.name : "none",
    toolchain: facts.toolchain,
    detectedStack: detectStack([...facts.identity.dependencies, ...facts.identity.devDependencies]),
    languages: detectLanguages(files),
    scripts: facts.pkg.scripts ?? {},
    folders: facts.folders,
    configs: facts.configs,
    dependencies: uniqueSorted([
      ...facts.identity.dependencies,
      ...facts.identity.devDependencies,
      ...facts.workspacePackages.flatMap((entry) => entry.dependencies),
    ]),
    workspacePackages: facts.workspacePackages,
    routes: facts.routes,
    entryPoints: facts.entryPoints,
    moduleGraph: facts.moduleGraph,
  };
}

export async function readCache(repoRoot: string): Promise<CacheData | null> {
  const cachePath = path.join(repoRoot, SMRITI_DIR, "cache.json");

  if (!(await fs.pathExists(cachePath))) {
    return null;
  }

  return fs.readJson(cachePath);
}

export async function runScan(
  cwd: string,
  reporter: Reporter = consoleReporter
): Promise<ScanCommandResult> {
  const repoRoot = await findRepoRoot(cwd);
  const files = await scanTree(repoRoot);
  const facts = await collectProjectFacts(repoRoot, files);
  const projectMap = buildProjectMap(repoRoot, files, facts);
  const { hashes, strategy } = await computeFileHashes(repoRoot, files);

  const scanReport: ScanReport = {
    generatedAt: nowIso(),
    branch: facts.branch,
    lastCommit: facts.lastCommit,
    recentCommits: facts.recentCommits,
    changedFiles: facts.changedFiles,
    addedFiles: [],
    removedFiles: [],
    activeAreas: inferActiveAreas(facts.changedFiles),
    fileCount: files.length,
    todos: facts.todos,
    notes: [`Full scan fingerprinted ${Object.keys(hashes).length} file(s) (${strategy}).`],
    staleWarnings: [],
  };

  const prevCache = await readCache(repoRoot);

  const cache: CacheData = {
    ...(prevCache ?? { lastScanAt: null, lastRefreshAt: null }),
    lastScanAt: scanReport.generatedAt,
    lastCommit: facts.lastCommit,
    hashes,
    hashStrategy: strategy,
    generatedFiles: GENERATED_FILES,
  };

  const readmeSummary = summarizeReadme(facts.readme);
  const context = buildProjectContext(facts.packageManager, facts.toolchain, readmeSummary);

  await writeArtifacts({
    repoRoot,
    projectMap,
    scanReport,
    cache,
    docs: {
      agents: generateAgents(projectMap, context),
      overview: generateOverview(projectMap, scanReport, readmeSummary),
      currentState: generateCurrentState(scanReport),
      runbook: generateRunbook(projectMap, context),
    },
  });

  const result: ScanCommandResult = {
    command: "scan",
    ok: true,
    repoRoot,
    fileCount: files.length,
    sourceFileCount: files.filter(isSourcePath).length,
    branch: facts.branch,
    lastCommit: facts.lastCommit,
    routeCount: facts.routes.length,
    todoCount: facts.todos.length,
    artifacts: GENERATED_FILES,
  };

  reporter.log(`SmritiFlow scan complete at: ${repoRoot}`);
  reporter.log(`Scanned files: ${result.fileCount}`);
  reporter.log(`Branch: ${result.branch}`);

  return result;
}
