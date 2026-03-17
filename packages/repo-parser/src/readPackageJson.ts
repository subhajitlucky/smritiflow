import path from "node:path";
import fs from "fs-extra";
import type { PackageJsonLite } from "../../shared/src/types.ts";

export async function readPackageJson(repoRoot: string): Promise<PackageJsonLite> {
  const pkgPath = path.join(repoRoot, "package.json");
  if (!(await fs.pathExists(pkgPath))) {
    return {};
  }

  return fs.readJson(pkgPath);
}
