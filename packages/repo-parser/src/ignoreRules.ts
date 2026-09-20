import path from "node:path";
import fs from "fs-extra";
import ignore, { type Ignore } from "ignore";

/**
 * Gitignore-style rules applied to every scanned path. Patterns without a slash
 * match at any depth (so nested node_modules/dist directories are excluded), while
 * paths like .smritiflow/ and docs/ai/ stay anchored to the repository root.
 */
const BUILT_IN_IGNORES = [
  ".git/",
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
  ".turbo/",
  ".smritiflow/",
  "docs/ai/",
  "*.tgz",
  "*.log",
  ".DS_Store"
];

/**
 * Cheaper glob patterns used to prune directory walks before gitignore matching.
 * The `ignore` package then applies the full rule set, including .gitignore.
 */
export const FAST_GLOB_PRUNE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/.turbo/**",
  ".smritiflow/**",
  "docs/ai/**"
];

export async function loadIgnoreRules(repoRoot: string): Promise<Ignore> {
  const rules = ignore().add(BUILT_IN_IGNORES);
  const gitignorePath = path.join(repoRoot, ".gitignore");

  if (await fs.pathExists(gitignorePath)) {
    rules.add(await fs.readFile(gitignorePath, "utf8"));
  }

  return rules;
}

export function applyIgnoreRules(rules: Ignore, filePaths: readonly string[]): string[] {
  return rules.filter(filePaths.map((filePath) => filePath.replaceAll("\\", "/")));
}
