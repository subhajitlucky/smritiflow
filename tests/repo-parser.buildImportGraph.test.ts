import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { buildImportGraph } from "../packages/repo-parser/src/buildImportGraph.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

describe("buildImportGraph", () => {
  it("resolves internal edges and ranks hotspots by inbound usage", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "src", "a.ts"),
        [
          "import { x } from './b';",
          "import('./c');",
          "import thing from 'react';",
        ].join("\n")
      );
      await fs.outputFile(
        path.join(repoRoot, "src", "b.ts"),
        "import './a';\nimport './c';\nexport const x = 1;\n"
      );
      await fs.outputFile(path.join(repoRoot, "src", "c.ts"), "export const y = 2;\n");

      const graph = await buildImportGraph(repoRoot, ["src/a.ts", "src/b.ts", "src/c.ts"]);

      expect(graph.nodes).toBe(3);
      expect(graph.edges).toBe(4);

      // src/c.ts is imported by both a.ts and b.ts, so it is the true hotspot.
      expect(graph.hotspots[0]).toContain("src/c.ts");

      // The a.ts <-> b.ts pair is a real cycle only because targets resolve.
      expect(graph.cycles).toHaveLength(1);
      expect(graph.cycles[0]).toEqual(["src/a.ts", "src/b.ts"]);

      // Every file here is imported by something, so none is an orphan.
      expect(graph.orphans).toEqual([]);

      // Third-party packages are reported separately from internal edges.
      expect(graph.externalDependencies.some((dep) => dep.startsWith("react"))).toBe(true);
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("counts repeated imports of the same module as one edge", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-dedupe-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "src", "a.ts"),
        ["import { one } from './shared';", "import { two } from './shared';"].join("\n")
      );
      await fs.outputFile(path.join(repoRoot, "src", "shared.ts"), "export const shared = 1;\n");

      const graph = await buildImportGraph(repoRoot, ["src/a.ts", "src/shared.ts"]);

      expect(graph.edges).toBe(1);
      expect(graph.hotspots[0]).toContain("src/shared.ts (1)");
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("resolves extensionless and directory index imports", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-resolve-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "src", "entry.ts"),
        ["import './util';", "import './feature';"].join("\n")
      );
      await fs.outputFile(path.join(repoRoot, "src", "util.ts"), "export const u = 1;\n");
      await fs.outputFile(path.join(repoRoot, "src", "feature", "index.ts"), "export const f = 1;\n");

      const graph = await buildImportGraph(repoRoot, [
        "src/entry.ts",
        "src/util.ts",
        "src/feature/index.ts",
      ]);

      expect(graph.edges).toBe(2);
      expect(graph.orphans).not.toContain("src/util.ts");
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("skips missing files without throwing", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-missing-");

    try {
      await fs.outputFile(path.join(repoRoot, "src", "ok.ts"), "export const ok = 1;\n");

      const graph = await buildImportGraph(repoRoot, ["src/ok.ts", "src/missing.ts"]);

      // Only files that could actually be read become graph nodes.
      expect(graph.nodes).toBe(1);
      expect(graph.edges).toBe(0);
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("builds a graph for a python codebase", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-py-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "app", "main.py"),
        ["from . import service", "import os", "from .service import run"].join("\n")
      );
      await fs.outputFile(
        path.join(repoRoot, "app", "service.py"),
        "import os\n\ndef run():\n    return os.getcwd()\n"
      );

      const graph = await buildImportGraph(repoRoot, ["app/main.py", "app/service.py"]);

      expect(graph.nodes).toBe(2);
      expect(graph.edges).toBe(1);
      expect(graph.hotspots[0]).toContain("app/service.py");
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("detects a python cycle through sibling imports", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-py-cycle-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "app", "main.py"),
        ["from . import service", "from .service import run", "import os"].join("\n")
      );
      await fs.outputFile(
        path.join(repoRoot, "app", "service.py"),
        ["from .main import app", "import os"].join("\n")
      );

      const graph = await buildImportGraph(repoRoot, ["app/main.py", "app/service.py"]);

      // `from . import service` and `from .service import run` are one dependency.
      expect(graph.edges).toBe(2);
      expect(graph.cycles).toHaveLength(1);
      expect(graph.cycles[0]).toEqual(["app/main.py", "app/service.py"]);
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("resolves go intra-module imports through the module path", async () => {
    const repoRoot = await createTempDir("smritiflow-import-graph-go-");

    try {
      await fs.writeFile(
        path.join(repoRoot, "go.mod"),
        "module github.com/acme/inv\n\ngo 1.22\n"
      );
      await fs.outputFile(
        path.join(repoRoot, "cmd", "server", "main.go"),
        [
          "package main",
          "import (",
          '\t"net/http"',
          "",
          '\t"github.com/acme/inv/internal/store"',
          ")",
          "",
          "func main() { store.Ping() }",
        ].join("\n")
      );
      await fs.outputFile(
        path.join(repoRoot, "internal", "store", "store.go"),
        "package store\n\nfunc Ping() {}\n"
      );

      const graph = await buildImportGraph(repoRoot, [
        "cmd/server/main.go",
        "internal/store/store.go",
      ]);

      expect(graph.edges).toBe(1);
      expect(graph.hotspots[0]).toContain("internal/store/store.go");
      expect(graph.externalDependencies.some((dep) => dep.startsWith("net/http"))).toBe(true);
    } finally {
      await fs.remove(repoRoot);
    }
  });
});
