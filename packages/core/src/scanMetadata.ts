import path from "node:path";
import { sha256File, topLevelArea, uniqueSorted } from "../../shared/src/utils.ts";

const HASH_TRACKED_FILES = [
  "package.json",
  "README.md",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "tsconfig.base.json",
  "pnpm-workspace.yaml",
];

export function inferActiveAreas(changedFiles: string[]): string[] {
  const firstPass = changedFiles.map((filePath) => topLevelArea(filePath));
  const secondPass = changedFiles
    .map((filePath) => filePath.replaceAll("\\", "/"))
    .map((normalized) => normalized.split("/").slice(0, 2).join("/"))
    .filter((value) => value.length > 0 && value !== ".");

  return uniqueSorted([...firstPass, ...secondPass]);
}

export async function computeHashes(repoRoot: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};

  for (const relPath of HASH_TRACKED_FILES) {
    const hash = await sha256File(path.join(repoRoot, relPath));
    if (hash) {
      hashes[relPath] = hash;
    }
  }

  return hashes;
}

export function summarizeReadme(readmeText: string): string {
  const trimmed = readmeText.trim();
  if (!trimmed) {
    return "SmritiFlow repository.";
  }

  const firstNonHeading = trimmed
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#"));

  return firstNonHeading ?? "SmritiFlow repository.";
}
