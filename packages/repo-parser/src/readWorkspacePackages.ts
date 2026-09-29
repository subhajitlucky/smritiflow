import path from "node:path";
import fs from "fs-extra";
import type { PackageJsonLite, WorkspacePackage } from "../../shared/src/types.ts";
import { uniqueSorted } from "../../shared/src/utils.ts";
import { baseName } from "./languages.ts";

const MAX_WORKSPACE_PACKAGES = 40;

function isNestedManifest(filePath: string): boolean {
  return baseName(filePath) === "package.json" && filePath.includes("/");
}

/**
 * Reads nested `package.json` manifests. A monorepo's real dependencies,
 * scripts, and test commands live in the workspace packages, so reading only
 * the root manifest produced an almost empty project map for those repos.
 */
export async function readWorkspacePackages(
  repoRoot: string,
  files: string[],
  rootPkg: PackageJsonLite
): Promise<WorkspacePackage[]> {
  const manifests = files.filter(isNestedManifest).slice(0, MAX_WORKSPACE_PACKAGES);
  const declared = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : rootPkg.workspaces?.packages;
  const packages: WorkspacePackage[] = [];

  for (const manifest of manifests) {
    const location = path.dirname(manifest).replaceAll("\\", "/");

    if (declared && declared.length > 0 && !matchesWorkspacePattern(location, declared)) {
      continue;
    }

    try {
      const pkg = (await fs.readJson(path.join(repoRoot, manifest))) as PackageJsonLite;

      packages.push({
        name: pkg.name ?? location,
        path: location,
        private: Boolean((pkg as { private?: boolean }).private),
        scripts: pkg.scripts ?? {},
        dependencies: uniqueSorted([
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ]),
      });
    } catch {
      continue;
    }
  }

  return packages;
}

function matchesWorkspacePattern(location: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const cleaned = pattern.replace(/^\.\//, "").replace(/\/\*$/, "").replace(/\*$/, "").replace(/\/$/, "");
    return cleaned.length === 0 ? true : location === cleaned || location.startsWith(`${cleaned}/`);
  });
}
