import path from "node:path";
import fs from "fs-extra";
import type { HookCommandResult, ScanReport } from "../../shared/src/types.ts";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { getLastCommit } from "../../git/src/getLastCommit.ts";
import { ARTIFACT_SCHEMA_VERSION, DOCS_AI_DIR, SMRITI_DIR } from "../../shared/src/constants.ts";
import { inferActiveAreas } from "./scanMetadata.ts";
import { readCache } from "./runScan.ts";

const MAX_AREAS = 6;
const MAX_FILES = 10;
const MAX_TODOS = 5;

const READ_ORDER = [
  "AGENTS.md",
  `${DOCS_AI_DIR}/PROJECT_OVERVIEW.md`,
  `${DOCS_AI_DIR}/CURRENT_STATE.md`,
  `${DOCS_AI_DIR}/RUNBOOK.md`,
];

function bulletList(items: string[], empty: string): string[] {
  return items.length === 0 ? [empty] : items.map((item) => `- ${item}`);
}

/**
 * Emits a compact, machine-readable resume brief for agent harnesses that can
 * run a command at session start. This is the piece that removes the need for
 * an agent to remember to invoke SmritiFlow at all.
 */
export async function runHook(
  cwd: string,
  event = "session-start"
): Promise<HookCommandResult> {
  const repoRoot = await findRepoRoot(cwd);
  const [cache, changedFiles, currentCommit] = await Promise.all([
    readCache(repoRoot),
    getChangedFiles(repoRoot),
    getLastCommit(repoRoot),
  ]);

  if (!cache) {
    const brief = [
      `# SmritiFlow (${event})`,
      "",
      "Repository memory is not initialized for this repository.",
      "",
      "Next step:",
      "- Run `smritiflow scan` to generate repository memory before exploring the codebase.",
    ].join("\n");

    return {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
    command: "hook",
      ok: true,
      event,
      repoRoot,
      stale: true,
      readFirst: [],
      activeAreas: [],
      changedFiles: [],
      brief,
    };
  }

  const scanReportPath = path.join(repoRoot, SMRITI_DIR, "scan-report.json");
  const scanReport = (await fs.pathExists(scanReportPath))
    ? ((await fs.readJson(scanReportPath)) as ScanReport)
    : null;

  const commitDrift =
    cache.lastCommit !== undefined &&
    cache.lastCommit !== "unknown" &&
    cache.lastCommit !== currentCommit;

  const stale = changedFiles.length > 0 || commitDrift;
  const todos = scanReport?.todos ?? [];
  const activeAreas = (
    changedFiles.length > 0 ? inferActiveAreas(changedFiles) : (scanReport?.activeAreas ?? [])
  ).slice(0, MAX_AREAS);

  const lines = [`# SmritiFlow (${event})`, ""];

  lines.push(
    stale
      ? "Repository memory is STALE. Refresh before relying on it."
      : "Repository memory is fresh."
  );
  lines.push("");
  lines.push("Read first:");
  lines.push(...bulletList(READ_ORDER, "- nothing generated yet"));
  lines.push("");

  if (stale) {
    lines.push("Why:");
    if (changedFiles.length > 0) {
      lines.push(`- ${changedFiles.length} uncommitted change(s) in the working tree`);
    }
    if (commitDrift) {
      lines.push(
        `- HEAD moved to ${currentCommit.slice(0, 7)} since the last scan at ${cache.lastCommit?.slice(0, 7)}`
      );
    }
    lines.push("");
    lines.push("Next step:");
    lines.push("- Run `smritiflow refresh`, then re-read docs/ai/CURRENT_STATE.md");
    lines.push("");
  }

  lines.push("Active areas:");
  lines.push(...bulletList(activeAreas, "- no active areas inferred"));
  lines.push("");

  lines.push("Changed files:");
  lines.push(...bulletList(changedFiles.slice(0, MAX_FILES), "- working tree is clean"));
  lines.push("");

  if (todos.length > 0) {
    lines.push("Open markers:");
    lines.push(
      ...todos.slice(0, MAX_TODOS).map((todo) => `- ${todo.file}:${todo.line} ${todo.tag}: ${todo.text}`)
    );
    lines.push("");
  }

  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    command: "hook",
    ok: true,
    event,
    repoRoot,
    stale,
    readFirst: READ_ORDER,
    activeAreas,
    changedFiles,
    brief: lines.join("\n").trimEnd(),
  };
}
