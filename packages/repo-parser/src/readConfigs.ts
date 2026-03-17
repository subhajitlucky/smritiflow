import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";
import { CONFIG_CANDIDATES } from "../../shared/src/constants.ts";
import { uniqueSorted } from "../../shared/src/utils.ts";

export async function readConfigs(repoRoot: string): Promise<string[]> {
  const fixedHits: string[] = [];
  for (const candidate of CONFIG_CANDIDATES) {
    const fullPath = path.join(repoRoot, candidate);
    if (await fs.pathExists(fullPath)) {
      fixedHits.push(candidate);
    }
  }

  const discovered = await fg(["*config.{js,cjs,mjs,ts,json}"], {
    cwd: repoRoot,
    onlyFiles: true,
  });

  return uniqueSorted([...fixedHits, ...discovered]);
}
