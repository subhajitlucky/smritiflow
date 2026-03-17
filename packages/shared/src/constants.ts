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

export const CONFIG_CANDIDATES = [
  "tsconfig.json",
  "tsconfig.base.json",
  "jsconfig.json",
  "next.config.js",
  "next.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "eslint.config.js",
  "eslint.config.ts",
  ".env.example",
];
