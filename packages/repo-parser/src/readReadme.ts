import path from "node:path";
import fs from "fs-extra";
import { isReadmePath } from "./languages.ts";

/**
 * Reads the repository readme. Accepts the scanned file list so variants such as
 * `README.rst` or `readme.md` are still found in non-JavaScript projects.
 */
export async function readReadme(repoRoot: string, files: string[] = []): Promise<string> {
  const readmes = files.filter(isReadmePath);
  const atRoot = readmes.filter((file) => !file.includes("/"));
  const target = atRoot[0] ?? readmes[0] ?? "README.md";
  const readmePath = path.join(repoRoot, target);

  if (!(await fs.pathExists(readmePath))) {
    return "";
  }

  return fs.readFile(readmePath, "utf8");
}
