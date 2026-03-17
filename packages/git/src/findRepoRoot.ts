import fs from "fs-extra";
import path from "node:path";

export async function findRepoRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);

  while (true) {
    const gitPath = path.join(current, ".git");
    if (await fs.pathExists(gitPath)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }

    current = parent;
  }
}
