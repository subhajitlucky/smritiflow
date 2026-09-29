import path from "node:path";
import crypto from "node:crypto";
import fs from "fs-extra";
import type { CacheData, HashStrategy } from "../../shared/src/types.ts";
import { isHashablePath, isReadmePath } from "../../repo-parser/src/languages.ts";
import { isGeneratedPath } from "../../shared/src/constants.ts";
import { uniqueSorted } from "../../shared/src/utils.ts";

/**
 * Above this many hashable files, content hashing costs more than it is worth,
 * so refresh falls back to mtime+size fingerprints. Content hashing stays the
 * default because it is what makes refresh work without git history.
 */
export const CONTENT_HASH_FILE_LIMIT = 20000;

const READ_BATCH_SIZE = 64;

export function inferActiveAreas(changedFiles: string[]): string[] {
  const normalized = changedFiles.map((filePath) => filePath.replaceAll("\\", "/"));
  const firstPass = normalized.map((filePath) => filePath.split("/")[0] ?? ".");
  const secondPass = normalized
    .filter((value) => value.split("/").length > 2)
    .map((value) => value.split("/").slice(0, 2).join("/"))
    .filter((value) => value.length > 0 && value !== ".");

  return uniqueSorted([...firstPass, ...secondPass]);
}

async function contentHashes(repoRoot: string, files: string[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};

  for (let index = 0; index < files.length; index += READ_BATCH_SIZE) {
    const batch = files.slice(index, index + READ_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(repoRoot, file));
          return [file, crypto.createHash("sha256").update(content).digest("hex")] as const;
        } catch {
          return [file, null] as const;
        }
      })
    );

    for (const [file, hash] of results) {
      if (hash) {
        hashes[file] = hash;
      }
    }
  }

  return hashes;
}

async function statHashes(repoRoot: string, files: string[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};

  for (const file of files) {
    try {
      const stats = await fs.stat(path.join(repoRoot, file));
      hashes[file] = `${stats.size}:${Math.round(stats.mtimeMs)}`;
    } catch {
      continue;
    }
  }

  return hashes;
}

/**
 * Fingerprints every hashable file in the tree, not just a fixed set of root
 * manifests. Nested workspace packages and ordinary source files are the ones
 * that used to be invisible to change detection outside of git.
 */
export async function computeFileHashes(
  repoRoot: string,
  files: string[]
): Promise<{ hashes: Record<string, string>; strategy: HashStrategy }> {
  const hashable = files.filter((file) => isHashablePath(file) && !isGeneratedPath(file));

  if (hashable.length > CONTENT_HASH_FILE_LIMIT) {
    return { hashes: await statHashes(repoRoot, hashable), strategy: "stat" };
  }

  return { hashes: await contentHashes(repoRoot, hashable), strategy: "content" };
}

/** Badge and image lines contain no prose, so they cannot describe the project. */
const MARKUP_ONLY_RE = /^(?:\[!\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)|<img\b|<a\b|\[!\[|<p\b)[\s\S]*$/;

export function summarizeReadme(readmeText: string): string {
  const trimmed = readmeText.trim();
  if (!trimmed) {
    return "";
  }

  const paragraph = trimmed
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block.length > 0 &&
        !block.startsWith("#") &&
        !block.startsWith(">") &&
        !MARKUP_ONLY_RE.test(block) &&
        /[a-z]{3}/i.test(block)
    );

  if (!paragraph) {
    return "";
  }

  return paragraph
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !MARKUP_ONLY_RE.test(line))
    .slice(0, 3)
    .join(" ");
}

export function hasBaseline(cache: CacheData | undefined): cache is CacheData {
  return Boolean(cache && Object.keys(cache.hashes ?? {}).length > 0);
}

export function readmeSummaryFor(files: string[]): string | null {
  return files.find(isReadmePath) ?? null;
}
