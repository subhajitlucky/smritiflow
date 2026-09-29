import { uniqueSorted } from "../../shared/src/utils.ts";
import { isTestPath } from "./languages.ts";

const ENTRY_STEMS = [
  "index",
  "main",
  "app",
  "server",
  "cli",
  "program",
  "run",
  "lib/index",
  "src/lib/index",
  "src/index",
  "src/main",
  "src/app",
  "src/server",
  "cmd/root",
];

const ENTRY_SUFFIXES = [
  "main.go",
  "main.rs",
  "main.py",
  "__main__.py",
  "app.py",
  "manage.py",
  "application.rb",
  "config.ru",
  "docker-entrypoint.sh",
];

const MAX_ENTRY_POINTS = 12;

function isEntryFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();

  if (ENTRY_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return true;
  }

  const withoutExtension = lower.replace(/\.[a-z0-9]+$/, "");
  return ENTRY_STEMS.includes(withoutExtension);
}

/**
 * Best-effort entry-point detection. Every hit becomes a "start reading here"
 * hint for agents, so a false positive is cheaper than a false negative.
 */
export function detectEntryPoints(files: string[]): string[] {
  return uniqueSorted(files.filter((file) => !isTestPath(file) && isEntryFile(file))).slice(
    0,
    MAX_ENTRY_POINTS
  );
}
