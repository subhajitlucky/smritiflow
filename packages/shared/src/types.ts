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

export interface ProjectMap {
  name: string;
  root: string;
  detectedStack: DetectedStack;
  scripts: Record<string, string>;
  folders: FolderInfo[];
  configs: string[];
  dependencies: string[];
  routes: string[];
  moduleGraph: {
    nodes: number;
    edges: number;
    hotspots: string[];
  };
}

export interface ScanReport {
  generatedAt: string;
  branch: string;
  lastCommit: string;
  recentCommits: string[];
  changedFiles: string[];
  activeAreas: string[];
  fileCount: number;
  staleWarnings: string[];
}

export interface CacheData {
  lastScanAt: string | null;
  lastRefreshAt: string | null;
  lastCommit?: string;
  hashes?: Record<string, string>;
  generatedFiles?: string[];
}

export interface PackageJsonLite {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
