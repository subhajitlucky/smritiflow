import path from "node:path";
import fs from "fs-extra";
import type { ResumeCommandResult } from "../../shared/src/types.ts";
import type { Reporter } from "./reporter.ts";
import { consoleReporter } from "./reporter.ts";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { getChangedFiles } from "../../git/src/getChangedFiles.ts";
import { ARTIFACT_SCHEMA_VERSION, DOCS_AI_DIR, SMRITI_DIR } from "../../shared/src/constants.ts";
import { inferActiveAreas } from "./scanMetadata.ts";
import type { ScanReport } from "../../shared/src/types.ts";

const MAX_COMMITS = 5;
const MAX_AREAS = 8;
const MAX_FILES = 12;
const MAX_TODOS = 8;

const READ_ORDER = [
  "AGENTS.md",
  `${DOCS_AI_DIR}/PROJECT_OVERVIEW.md`,
  `${DOCS_AI_DIR}/CURRENT_STATE.md`,
  `${DOCS_AI_DIR}/RUNBOOK.md`,
];

export async function runResume(
  cwd: string,
  reporter: Reporter = consoleReporter
): Promise<ResumeCommandResult> {
  const repoRoot = await findRepoRoot(cwd);
  const scanReportPath = path.join(repoRoot, SMRITI_DIR, "scan-report.json");

  if (!(await fs.pathExists(scanReportPath))) {
    reporter.log("No scan report found. Run: smritiflow scan");
    return {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
    command: "resume",
      ok: true,
      repoRoot,
      readFirst: READ_ORDER,
      recentCommits: [],
      activeAreas: [],
      changedFiles: [],
      todos: [],
      nextSteps: ["Run smritiflow scan to generate repository memory."],
    };
  }

  const [scanReport, changedFiles] = await Promise.all([
    fs.readJson(scanReportPath) as Promise<ScanReport>,
    getChangedFiles(repoRoot),
  ]);

  const activeAreas =
    changedFiles.length > 0
      ? inferActiveAreas(changedFiles).slice(0, MAX_AREAS)
      : scanReport.activeAreas.slice(0, MAX_AREAS);

  const nextSteps: string[] =
    changedFiles.length > 0
      ? [
          "Run `smritiflow refresh` so memory reflects the working tree.",
          `Re-read ${DOCS_AI_DIR}/CURRENT_STATE.md after refreshing.`,
        ]
      : [
          "Continue work in the top active area listed below.",
          "Run `smritiflow refresh` after meaningful code changes.",
          "Run `smritiflow status` before finishing to confirm memory is fresh.",
        ];

  const todos = scanReport.todos ?? [];

  reporter.log("SmritiFlow resume");
  reporter.log("Read first:");
  for (const file of READ_ORDER) {
    reporter.log(`- ${file}`);
  }

  reporter.log("");
  reporter.log("Recent commits:");
  for (const commit of scanReport.recentCommits.slice(0, MAX_COMMITS)) {
    reporter.log(`- ${commit}`);
  }

  reporter.log("");
  reporter.log("Likely active areas:");
  if (activeAreas.length === 0) {
    reporter.log("- no active areas inferred");
  } else {
    for (const area of activeAreas) {
      reporter.log(`- ${area}`);
    }
  }

  reporter.log("");
  reporter.log("Changed files right now:");
  if (changedFiles.length === 0) {
    reporter.log("- no local changes");
  } else {
    for (const file of changedFiles.slice(0, MAX_FILES)) {
      reporter.log(`- ${file}`);
    }
  }

  if (todos.length > 0) {
    reporter.log("");
    reporter.log("Open markers:");
    for (const todo of todos.slice(0, MAX_TODOS)) {
      reporter.log(`- ${todo.file}:${todo.line} ${todo.tag}: ${todo.text}`);
    }
  }

  reporter.log("");
  reporter.log("Suggested next steps:");
  for (const step of nextSteps) {
    reporter.log(`- ${step}`);
  }

  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    command: "resume",
    ok: true,
    repoRoot,
    readFirst: READ_ORDER,
    recentCommits: scanReport.recentCommits.slice(0, MAX_COMMITS),
    activeAreas,
    changedFiles,
    todos,
    nextSteps,
  };
}
