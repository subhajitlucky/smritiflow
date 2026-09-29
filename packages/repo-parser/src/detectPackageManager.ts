import path from "node:path";
import fs from "fs-extra";
import type { PackageJsonLite } from "../../shared/src/types.ts";

export interface PackageManagerInfo {
  name: string;
  lockfile: string | null;
  install: string;
  run: string;
  exec: string;
}

const LOCKFILES: Array<{ file: string; name: string }> = [
  { file: "pnpm-lock.yaml", name: "pnpm" },
  { file: "bun.lockb", name: "bun" },
  { file: "bun.lock", name: "bun" },
  { file: "yarn.lock", name: "yarn" },
  { file: "deno.lock", name: "deno" },
  { file: "package-lock.json", name: "npm" },
];

const COMMANDS: Record<string, { install: string; run: string; exec: string }> = {
  pnpm: { install: "pnpm install", run: "pnpm", exec: "pnpm dlx" },
  yarn: { install: "yarn install", run: "yarn", exec: "yarn exec" },
  bun: { install: "bun install", run: "bun run", exec: "bunx" },
  npm: { install: "npm install", run: "npm run", exec: "npx" },
  deno: { install: "deno install", run: "deno task", exec: "deno run" },
};

function fromField(field: string | undefined): string | null {
  if (!field) {
    return null;
  }
  const name = field.split("@")[0]?.trim().toLowerCase();
  return name && name.length > 0 ? name : null;
}

/**
 * Resolves the package manager from the explicit `packageManager` field first,
 * then lockfiles, and defaults to npm. Every generator uses this so runbooks
 * and agent instructions never assume a package manager the repo does not use.
 */
export async function detectPackageManager(
  repoRoot: string,
  pkg: PackageJsonLite = {}
): Promise<PackageManagerInfo> {
  let name = fromField(pkg.packageManager);
  let lockfile: string | null = null;

  if (!name) {
    for (const candidate of LOCKFILES) {
      if (await fs.pathExists(path.join(repoRoot, candidate.file))) {
        name = candidate.name;
        lockfile = candidate.file;
        break;
      }
    }
  }

  const resolved = name ?? "npm";
  const commands = COMMANDS[resolved] ?? COMMANDS.npm;

  return { name: resolved, lockfile, ...commands };
}
