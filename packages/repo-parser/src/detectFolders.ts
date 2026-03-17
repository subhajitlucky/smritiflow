import path from "node:path";
import fs from "fs-extra";
import type { FolderInfo } from "../../shared/src/types.ts";

const FOLDER_RULES: Array<{ path: string; purpose: string }> = [
  { path: "src/app", purpose: "app routes or app router entry" },
  { path: "src/pages", purpose: "pages router entry" },
  { path: "src/components", purpose: "shared ui components" },
  { path: "src/lib", purpose: "utilities and services" },
  { path: "src/server", purpose: "backend server code" },
  { path: "prisma", purpose: "database schema and migrations" },
  { path: "scripts", purpose: "automation scripts" },
  { path: "tests", purpose: "test suites" },
  { path: "apps", purpose: "workspace applications" },
  { path: "packages", purpose: "shared internal packages" },
  { path: "docs", purpose: "documentation and memory artifacts" },
];

export async function detectFolders(repoRoot: string): Promise<FolderInfo[]> {
  const found: FolderInfo[] = [];

  for (const rule of FOLDER_RULES) {
    const target = path.join(repoRoot, rule.path);
    if (await fs.pathExists(target)) {
      found.push(rule);
    }
  }

  return found;
}
