import path from "node:path";
import fs from "fs-extra";

export async function readReadme(repoRoot: string): Promise<string> {
  const readmePath = path.join(repoRoot, "README.md");
  if (!(await fs.pathExists(readmePath))) {
    return "";
  }

  return fs.readFile(readmePath, "utf8");
}
