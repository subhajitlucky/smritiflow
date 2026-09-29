export interface DetectedStack {
  frontend: string[];
  backend: string[];
  database: string[];
  testing: string[];
}

export interface FolderInfo {
  path: string;
  purpose: string;
}

export interface TodoItem {
  file: string;
  line: number;
  tag: string;
  text: string;
}

export interface ModuleGraphSummary {
  nodes: number;
  edges: number;
  hotspots: string[];
  externalDependencies: string[];
  cycles: string[][];
  orphans: string[];
}

export interface ProjectMap {
  schemaVersion: number;
  name: string;
  description: string;
  root: string;
  packageManager: string;
  toolchain: Toolchain;
  detectedStack: DetectedStack;
  languages: Array<{ language: string; files: number }>;
  scripts: Record<string, string>;
  folders: FolderInfo[];
  configs: string[];
  dependencies: string[];
  workspacePackages: WorkspacePackage[];
  routes: string[];
  entryPoints: string[];
  moduleGraph: ModuleGraphSummary;
}

export interface Toolchain {
  ecosystem: string;
  manager: string;
  install: string;
  run: string | null;
  test: string | null;
  build: string | null;
}

export interface CheckCommandResult {
  schemaVersion: number;
  command: "check";
  ok: true;
  repoRoot: string;
  upToDate: boolean;
  checked: string[];
  skipped: string[];
  drift: Array<{ file: string; reason: string }>;
}

export interface WorkspacePackage {
  name: string;
  path: string;
  private: boolean;
  scripts: Record<string, string>;
  dependencies: string[];
}

export type RefreshMode = "full" | "partial" | "none";

export interface ScanReport {
  schemaVersion: number;
  generatedAt: string;
  branch: string;
  lastCommit: string;
  recentCommits: string[];
  changedFiles: string[];
  addedFiles: string[];
  removedFiles: string[];
  activeAreas: string[];
  fileCount: number;
  todos: TodoItem[];
  notes: string[];
  staleWarnings: string[];
}

export interface CacheData {
  schemaVersion?: number;
  lastScanAt: string | null;
  lastRefreshAt: string | null;
  lastCommit?: string;
  hashes?: Record<string, string>;
  hashStrategy?: HashStrategy;
  generatedFiles?: string[];
}

export type HashStrategy = "content" | "stat";

export interface PackageJsonLite {
  name?: string;
  description?: string;
  version?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

export interface ScanCommandResult {
  schemaVersion: number;
  command: "scan";
  ok: true;
  repoRoot: string;
  fileCount: number;
  sourceFileCount: number;
  branch: string;
  lastCommit: string;
  routeCount: number;
  todoCount: number;
  artifacts: string[];
}

export interface RefreshCommandResult {
  schemaVersion: number;
  command: "refresh";
  ok: true;
  repoRoot: string;
  mode: RefreshMode;
  reason: string | null;
  changedFiles: string[];
  changedCount: number;
  addedFiles: string[];
  removedFiles: string[];
  activeAreas: string[];
  refreshedSections: string[];
  lastCommit: string;
}

export interface StatusCommandResult {
  schemaVersion: number;
  command: "status";
  ok: true;
  repoRoot: string;
  initialized: boolean;
  hasBaseline: boolean;
  branch: string;
  lastScanAt: string | null;
  lastRefreshAt: string | null;
  lastCommit: string | null;
  currentCommit: string;
  changedFiles: string[];
  stale: boolean;
  staleReasons: string[];
}

export interface ResumeCommandResult {
  schemaVersion: number;
  command: "resume";
  ok: true;
  repoRoot: string;
  readFirst: string[];
  recentCommits: string[];
  activeAreas: string[];
  changedFiles: string[];
  todos: TodoItem[];
  nextSteps: string[];
}

export interface HookCommandResult {
  schemaVersion: number;
  command: "hook";
  ok: true;
  event: string;
  repoRoot: string;
  stale: boolean;
  readFirst: string[];
  activeAreas: string[];
  changedFiles: string[];
  brief: string;
}
