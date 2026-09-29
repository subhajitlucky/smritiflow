import type { ScanReport } from "../../shared/src/types.ts";
import { groupTodosByFile, summarizeTodoTags } from "../../repo-parser/src/extractTodos.ts";

const MAX_LISTED_CHANGED = 40;
const MAX_LISTED_AREAS = 20;
const MAX_LISTED_TODO_FILES = 15;
const MAX_LISTED_TODOS_PER_FILE = 5;

function changedFilesSection(scanReport: ScanReport): string[] {
  if (scanReport.changedFiles.length === 0) {
    return ["- no changed files detected"];
  }

  const listed = scanReport.changedFiles.slice(0, MAX_LISTED_CHANGED);
  const overflow = scanReport.changedFiles.length - listed.length;

  return [
    ...listed.map((file) => `- ${file}`),
    ...(overflow > 0 ? [`- ... and ${overflow} more (see .smritiflow/scan-report.json)`] : []),
  ];
}

function todoSection(scanReport: ScanReport): string[] {
  if (scanReport.todos.length === 0) {
    return ["- no TODO, FIXME, HACK, XXX, BUG, or OPTIMIZE markers found"];
  }

  const grouped = groupTodosByFile(scanReport.todos);
  const tags = summarizeTodoTags(scanReport.todos).join(", ");
  const lines = [
    `- ${scanReport.todos.length} marker(s) across ${grouped.length} file(s) [${tags}]`,
    "",
  ];

  for (const [file, todos] of grouped.slice(0, MAX_LISTED_TODO_FILES)) {
    for (const todo of todos.slice(0, MAX_LISTED_TODOS_PER_FILE)) {
      lines.push(`- ${file}:${todo.line} ${todo.tag}: ${todo.text}`);
    }
  }

  const hiddenFiles = grouped.length - MAX_LISTED_TODO_FILES;
  if (hiddenFiles > 0) {
    lines.push(`- ... and ${hiddenFiles} more file(s) with markers`);
  }

  return lines;
}

export function generateCurrentState(scanReport: ScanReport): string {
  const lines: string[] = ["# Current State", ""];

  lines.push(`- Generated at: ${scanReport.generatedAt}`);
  lines.push(`- Branch: ${scanReport.branch}`);
  lines.push(`- Commit: ${scanReport.lastCommit}`);
  lines.push("");

  lines.push("## Recent Commits");
  lines.push(
    ...(scanReport.recentCommits.length > 0
      ? scanReport.recentCommits.map((commit) => `- ${commit}`)
      : ["- no git history available"])
  );
  lines.push("");

  lines.push("## Changed Files");
  lines.push(...changedFilesSection(scanReport));
  lines.push("");

  if (scanReport.addedFiles.length > 0 || scanReport.removedFiles.length > 0) {
    lines.push("## Structural Change");
    lines.push(`- Added: ${scanReport.addedFiles.length}`);
    lines.push(`- Removed: ${scanReport.removedFiles.length}`);
    if (scanReport.addedFiles.length > 0) {
      lines.push(...scanReport.addedFiles.slice(0, MAX_LISTED_CHANGED).map((file) => `- + ${file}`));
    }
    if (scanReport.removedFiles.length > 0) {
      lines.push(
        ...scanReport.removedFiles.slice(0, MAX_LISTED_CHANGED).map((file) => `- - ${file}`)
      );
    }
    lines.push("");
  }

  lines.push("## Likely Active Areas");
  lines.push(
    ...(scanReport.activeAreas.length > 0
      ? scanReport.activeAreas.slice(0, MAX_LISTED_AREAS).map((area) => `- ${area}`)
      : ["- no active areas inferred"])
  );
  lines.push("");

  lines.push("## Open Markers");
  lines.push(...todoSection(scanReport));
  lines.push("");

  lines.push("## Stale Warnings");
  lines.push(
    ...(scanReport.staleWarnings.length > 0
      ? scanReport.staleWarnings.map((warning) => `- ${warning}`)
      : ["- none"])
  );

  if (scanReport.notes.length > 0) {
    lines.push("");
    lines.push("## Refresh Notes");
    lines.push(...scanReport.notes.map((note) => `- ${note}`));
  }

  return lines.join("\n");
}
