import path from "node:path";
import fs from "fs-extra";
import type { ModuleGraphSummary } from "../../shared/src/types.ts";
import { isSourcePath } from "./languages.ts";
import { parseImports, type ParseImportOptions } from "./parseImports.ts";

const MAX_FILES = 4000;
const MAX_GRAPH_BYTES = 48 * 1024 * 1024;
const TOP_N = 8;
const MAX_CYCLES = 5;
const MAX_ORPHANS = 10;

function tarjanComponents(
  nodes: string[],
  adjacency: Map<string, string[]>
): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let counter = 0;

  const strongConnect = (node: string): void => {
    index.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of adjacency.get(node) ?? []) {
      if (!index.has(next)) {
        strongConnect(next);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(next) ?? 0));
      }
    }

    if (low.get(node) !== index.get(node)) {
      return;
    }

    const component: string[] = [];
    let current: string;
    do {
      current = stack.pop() as string;
      onStack.delete(current);
      component.push(current);
    } while (current !== node);

    components.push(component);
  };

  for (const node of nodes) {
    if (!index.has(node)) {
      strongConnect(node);
    }
  }

  return components;
}

function rankByCount(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_N)
    .map(([key, count]) => `${key} (${count})`);
}

async function readGoModule(repoRoot: string): Promise<string | undefined> {
  const goModPath = path.join(repoRoot, "go.mod");

  if (!(await fs.pathExists(goModPath))) {
    return undefined;
  }

  try {
    const match = /^module\s+(\S+)/m.exec(await fs.readFile(goModPath, "utf8"));
    return match?.[1];
  } catch {
    return undefined;
  }
}

export async function buildImportGraph(
  repoRoot: string,
  files: string[]
): Promise<ModuleGraphSummary> {
  const sourceFiles = files.filter(isSourcePath).slice(0, MAX_FILES);
  const contents = new Map<string, string>();
  let totalBytes = 0;

  for (const file of sourceFiles) {
    if (totalBytes > MAX_GRAPH_BYTES) {
      break;
    }
    try {
      const content = await fs.readFile(path.join(repoRoot, file), "utf8");
      totalBytes += content.length;
      contents.set(file, content);
    } catch {
      continue;
    }
  }

  const importOptions: ParseImportOptions = { goModule: await readGoModule(repoRoot) };
  const edges = parseImports(contents, importOptions);
  const internal = edges.filter((edge) => edge.kind === "internal");

  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const externalCounts = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const referenced = new Set<string>();

  for (const edge of edges) {
    if (edge.kind === "external") {
      externalCounts.set(edge.specifier, (externalCounts.get(edge.specifier) ?? 0) + 1);
    }
    if (edge.kind !== "internal") {
      continue;
    }
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
    referenced.add(edge.to);
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  }

  const orphans = [...contents.keys()]
    .filter((file) => (inDegree.get(file) ?? 0) === 0)
    .slice(0, MAX_ORPHANS)
    .sort();

  const cycles = tarjanComponents([...contents.keys()], adjacency)
    .filter((component) => component.length > 1)
    .slice(0, MAX_CYCLES)
    .map((component) => component.sort());

  return {
    nodes: contents.size,
    edges: internal.length,
    hotspots: rankByCount(inDegree),
    externalDependencies: rankByCount(externalCounts),
    cycles,
    orphans,
  };
}
