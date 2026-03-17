import path from "node:path";
import fs from "fs-extra";

export interface ImportGraphSummary {
  nodes: number;
  edges: number;
  hotspots: string[];
}

const IMPORT_FROM_RE = /from\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

export async function buildImportGraph(
  repoRoot: string,
  files: string[]
): Promise<ImportGraphSummary> {
  const sourceFiles = files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));
  const importCounts = new Map<string, number>();
  let edges = 0;

  for (const file of sourceFiles) {
    const abs = path.join(repoRoot, file);
    let content = "";
    try {
      content = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }

    let localEdges = 0;

    for (const regex of [IMPORT_FROM_RE, DYNAMIC_IMPORT_RE]) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null = regex.exec(content);
      while (match) {
        const target = match[1];
        if (target.startsWith(".") || target.startsWith("/")) {
          localEdges += 1;
          edges += 1;
        }
        match = regex.exec(content);
      }
    }

    if (localEdges > 0) {
      importCounts.set(file, localEdges);
    }
  }

  const hotspots = [...importCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([file, count]) => `${file} (${count})`);

  return {
    nodes: sourceFiles.length,
    edges,
    hotspots,
  };
}
