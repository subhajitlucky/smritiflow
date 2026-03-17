import fs from "fs-extra";
import path from "node:path";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";

async function writeJsonIfMissing(filePath: string, value: unknown): Promise<void> {
  if (await fs.pathExists(filePath)) {
    return;
  }

  await fs.writeJson(filePath, value, { spaces: 2 });
}

async function writeFileIfMissing(filePath: string, content: string): Promise<void> {
  if (await fs.pathExists(filePath)) {
    return;
  }

  await fs.writeFile(filePath, content);
}

export async function runInit(cwd: string): Promise<void> {
  const repoRoot = await findRepoRoot(cwd);

  const smritiDir = path.join(repoRoot, ".smritiflow");
  const docsAiDir = path.join(repoRoot, "docs", "ai");

  await fs.ensureDir(smritiDir);
  await fs.ensureDir(docsAiDir);

  await writeJsonIfMissing(path.join(smritiDir, "cache.json"), {
    lastScanAt: null,
    lastRefreshAt: null,
  });

  await writeJsonIfMissing(path.join(smritiDir, "config.json"), {
    version: 1,
    docsDir: "docs/ai",
  });

  await writeFileIfMissing(path.join(repoRoot, "AGENTS.md"), "# AGENTS.md\n\nRead docs/ai files first.\n");

  await writeFileIfMissing(path.join(docsAiDir, "PROJECT_OVERVIEW.md"), "# Project Overview\n");

  await writeFileIfMissing(path.join(docsAiDir, "CURRENT_STATE.md"), "# Current State\n");

  await writeFileIfMissing(path.join(docsAiDir, "RUNBOOK.md"), "# Runbook\n");

  console.log(`SmritiFlow initialized at: ${repoRoot}`);
}
