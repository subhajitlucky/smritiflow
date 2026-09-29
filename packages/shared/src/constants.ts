export const SMRITI_DIR = ".smritiflow";
export const DOCS_AI_DIR = "docs/ai";

export const GENERATED_FILES = [
  "AGENTS.md",
  "docs/ai/PROJECT_OVERVIEW.md",
  "docs/ai/CURRENT_STATE.md",
  "docs/ai/RUNBOOK.md",
  ".smritiflow/project-map.json",
  ".smritiflow/scan-report.json",
  ".smritiflow/cache.json",
];

export const DEFAULT_CACHE = {
  lastScanAt: null,
  lastRefreshAt: null,
};

/**
 * Paths SmritiFlow writes itself. These are excluded from change detection so
 * a scan can never report its own output as a repository change, which would
 * otherwise mark memory stale immediately after every run.
 */
export const GENERATED_PATH_PREFIXES = [".smritiflow/", "docs/ai/"];

export function isGeneratedPath(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/");

  if (GENERATED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  return GENERATED_FILES.includes(normalized);
}
