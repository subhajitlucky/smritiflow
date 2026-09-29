import path from "node:path";
import fs from "fs-extra";
import type { CheckCommandResult, ScanReport } from "../../shared/src/types.ts";
import { findRepoRoot } from "../../git/src/findRepoRoot.ts";
import { scanTree } from "../../repo-parser/src/scanTree.ts";
import { AGENTS_BLOCK_BEGIN, AGENTS_BLOCK_END } from "../../generators/src/writeAgents.ts";
import { generateOverview } from "../../generators/src/generateOverview.ts";
import { generateRunbook } from "../../generators/src/generateRunbook.ts";
import { generateAgents } from "../../generators/src/generateAgents.ts";
import { ARTIFACT_SCHEMA_VERSION, DOCS_AI_DIR, SMRITI_DIR } from "../../shared/src/constants.ts";
import { summarizeReadme } from "./scanMetadata.ts";
import {
  buildProjectContext,
  buildProjectMap,
  collectProjectFacts,
} from "./runScan.ts";

/**
 * Sections that describe a moment in time rather than the repository. They are
 * regenerated on every scan, so a fresh generation can never match what is
 * committed and comparing them would report drift on every commit.
 */
const POINT_IN_TIME_SECTIONS = new Set([
  "Recent Commits",
  "Changed Files",
  "Likely Active Areas",
  "Structural Change",
  "Stale Warnings",
  "Refresh Notes",
]);

const VOLATILE_LINE = /^-\s*(Generated|Generated at|Last scan|Last refresh|Commit|Branch|Change|Fingerprint)/;

const SKIPPED = [
  `${DOCS_AI_DIR}/CURRENT_STATE.md`,
  `${SMRITI_DIR}/scan-report.json`,
  `${SMRITI_DIR}/cache.json`,
];

function normalizeMarkdown(markdown: string): string {
  const lines: string[] = [];
  let skipping = false;

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const heading = /^##\s+(.*)$/.exec(line);

    if (heading) {
      skipping = POINT_IN_TIME_SECTIONS.has(heading[1]!.trim());
      lines.push(line);
      continue;
    }

    if (skipping || VOLATILE_LINE.test(line)) {
      continue;
    }

    lines.push(line.replace(/\s+$/, ""));
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function managedBlock(agents: string): string {
  const start = agents.indexOf(AGENTS_BLOCK_BEGIN);
  const end = agents.indexOf(AGENTS_BLOCK_END);

  if (start === -1 || end === -1 || end < start) {
    return normalizeMarkdown(agents);
  }

  return normalizeMarkdown(agents.slice(start, end + AGENTS_BLOCK_END.length));
}

function normalizeProjectMap(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    delete parsed.root;
    return `${JSON.stringify(parsed, null, 2).trim()}\n`;
  } catch {
    return raw.trimEnd();
  }
}

function firstDifference(expected: string, actual: string): string {
  const left = expected.split("\n");
  const right = actual.split("\n");

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) {
      const committed = right[index] === undefined ? "(missing line)" : right[index];
      return `line ${index + 1} differs: generated ${JSON.stringify(left[index] ?? "(missing line)")}, committed ${JSON.stringify(committed)}`;
    }
  }

  return "content differs";
}

/**
 * Reports whether the committed memory matches what a fresh scan would produce.
 *
 * This is a drift check, not a staleness check. Staleness compares a scan to
 * the local working tree and is meaningless in CI, where the fingerprint
 * baseline is gitignored and the working tree is whatever the commit contained.
 * Drift is the property that can be enforced: the committed documents should
 * describe the committed code. The check never writes, so running it cannot
 * make a drifted repository look clean.
 */
export async function runCheck(cwd: string): Promise<CheckCommandResult> {
  const repoRoot = await findRepoRoot(cwd);
  const files = await scanTree(repoRoot);
  const facts = await collectProjectFacts(repoRoot, files);
  const projectMap = buildProjectMap(repoRoot, files, facts);
  const readmeSummary = summarizeReadme(facts.readme);
  const context = buildProjectContext(facts.packageManager, facts.toolchain, readmeSummary);

  // A synthetic report carries the structural facts the documents depend on
  // while leaving out anything point-in-time, so comparison is meaningful.
  const scanReport: ScanReport = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    generatedAt: "",
    branch: "",
    lastCommit: "",
    recentCommits: [],
    changedFiles: [],
    addedFiles: [],
    removedFiles: [],
    activeAreas: [],
    fileCount: files.length,
    todos: facts.todos,
    notes: [],
    staleWarnings: [],
  };
  const expected = new Map<string, string>([
    [
      `${DOCS_AI_DIR}/PROJECT_OVERVIEW.md`,
      normalizeMarkdown(generateOverview(projectMap, scanReport, readmeSummary)),
    ],
    [`${DOCS_AI_DIR}/RUNBOOK.md`, normalizeMarkdown(generateRunbook(projectMap, context))],
    [`${SMRITI_DIR}/project-map.json`, normalizeProjectMap(JSON.stringify(projectMap, null, 2))],
    [
      "AGENTS.md",
      managedBlock(
        `${AGENTS_BLOCK_BEGIN}\n${generateAgents(projectMap, context).trim()}\n${AGENTS_BLOCK_END}\n`
      ),
    ],
  ]);

  const drift: Array<{ file: string; reason: string }> = [];
  const checked: string[] = [];

  for (const [relative, expectedContent] of expected) {
    const target = path.join(repoRoot, relative);

    if (!(await fs.pathExists(target))) {
      drift.push({ file: relative, reason: "not generated" });
      continue;
    }

    const committedRaw = await fs.readFile(target, "utf8");
    const committed = relative.endsWith(".json")
      ? normalizeProjectMap(committedRaw)
      : relative === "AGENTS.md"
        ? managedBlock(committedRaw)
        : normalizeMarkdown(committedRaw);

    checked.push(relative);

    if (committed !== expectedContent) {
      drift.push({ file: relative, reason: firstDifference(expectedContent, committed) });
    }
  }

  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    command: "check",
    ok: true,
    repoRoot,
    upToDate: drift.length === 0,
    checked,
    skipped: SKIPPED,
    drift,
  };
}
