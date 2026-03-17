import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { buildImportGraph } from "../packages/repo-parser/src/buildImportGraph.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

describe("buildImportGraph", () => {
  it("counts local static and dynamic imports", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "src", "a.ts"),
        [
          "import { x } from './b';",
          "import('~/ignore-me');",
          "import('./c');",
          "import thing from 'react';",
        ].join("\n")
      );
      await fs.outputFile(path.join(repoRoot, "src", "b.ts"), "export const x = 1;\n");
      await fs.outputFile(path.join(repoRoot, "src", "c.ts"), "export const y = 2;\n");

      const graph = await buildImportGraph(repoRoot, ["src/a.ts", "src/b.ts", "src/c.ts"]);

      expect(graph.nodes).toBe(3);
      expect(graph.edges).toBe(2);
      expect(graph.hotspots[0]).toContain("src/a.ts");
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("skips missing files without throwing", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-missing-");

    try {
      await fs.outputFile(path.join(repoRoot, "src", "ok.ts"), "export const ok = 1;\n");

      const graph = await buildImportGraph(repoRoot, ["src/ok.ts", "src/missing.ts"]);

      expect(graph.nodes).toBe(2);
      expect(graph.edges).toBe(0);
    } finally {
      await fs.remove(repoRoot);
    }
  });
});
