import fs from "fs-extra";
import path from "node:path";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";

export async function runInit(cwd: string): Promise<void> {
  const repoRoot = await findRepoRoot(cwd);

  const smritiDir = path.join(repoRoot, ".smritiflow");
  const docsAiDir = path.join(repoRoot, "docs", "ai");

  await fs.ensureDir(smritiDir);
  await fs.ensureDir(docsAiDir);

  await fs.writeJson(
    path.join(smritiDir, "cache.json"),
    { lastScanAt: null, lastRefreshAt: null },
    { spaces: 2 }
  );

  await fs.writeJson(
    path.join(smritiDir, "config.json"),
    { version: 1, docsDir: "docs/ai" },
    { spaces: 2 }
  );

  await fs.writeFile(
    path.join(repoRoot, "AGENTS.md"),
    "# AGENTS.md\n\nRead docs/ai files first.\n"
  );

  await fs.writeFile(
    path.join(docsAiDir, "PROJECT_OVERVIEW.md"),
    "# Project Overview\n"
  );

  await fs.writeFile(
    path.join(docsAiDir, "CURRENT_STATE.md"),
    "# Current State\n"
  );

  await fs.writeFile(
    path.join(docsAiDir, "RUNBOOK.md"),
    "# Runbook\n"
  );

  console.log(`SmritiFlow initialized at: ${repoRoot}`);
}