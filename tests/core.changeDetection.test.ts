import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { classifyChanges, diffHashes } from "../packages/core/src/changeDetection.ts";
import { computeFileHashes, inferActiveAreas } from "../packages/core/src/scanMetadata.ts";
import { runRefresh } from "../packages/core/src/runRefresh.ts";
import { runScan } from "../packages/core/src/runScan.ts";
import { createTempDir, createTempRepo } from "./helpers/tempRepo.ts";

describe("diffHashes", () => {
  it("separates changed, added, and removed files", () => {
    const diff = diffHashes(
      { "a.ts": "1", "b.ts": "2", "gone.ts": "3" },
      { "a.ts": "1", "b.ts": "changed", "new.ts": "4" }
    );

    expect(diff.changed).toEqual(["b.ts"]);
    expect(diff.added).toEqual(["new.ts"]);
    expect(diff.removed).toEqual(["gone.ts"]);
  });

  it("returns empty lists for identical snapshots", () => {
    const diff = diffHashes({ "a.ts": "1" }, { "a.ts": "1" });
    expect(diff).toEqual({ changed: [], added: [], removed: [] });
  });
});

describe("classifyChanges", () => {
  it("classifies by file kind rather than a fixed path list", () => {
    const categories = classifyChanges({
      changed: ["apps/web/package.json"],
      added: ["crates/engine/src/lib.rs", "infra/main.tf", "docs/guide.md"],
      removed: [],
    });

    expect(categories.manifestChanged).toBe(true);
    expect(categories.configChanged).toBe(true);
    expect(categories.sourceChanged).toBe(true);
    expect(categories.docsChanged).toBe(true);
    expect(categories.structureChanged).toBe(true);
  });

  it("flags a readme change without touching other categories", () => {
    const categories = classifyChanges({ changed: ["README.md"], added: [], removed: [] });

    expect(categories.readmeChanged).toBe(true);
    expect(categories.manifestChanged).toBe(false);
    expect(categories.sourceChanged).toBe(false);
    expect(categories.structureChanged).toBe(false);
  });

  it("detects non-TypeScript source changes", () => {
    expect(classifyChanges({ changed: ["app/main.py"], added: [], removed: [] }).sourceChanged).toBe(true);
    expect(classifyChanges({ changed: ["cmd/main.go"], added: [], removed: [] }).sourceChanged).toBe(true);
    expect(classifyChanges({ changed: ["src/lib.rs"], added: [], removed: [] }).sourceChanged).toBe(true);
  });
});

describe("computeFileHashes", () => {
  it("fingerprints nested source and manifest files", async () => {
    const dir = await createTempDir("smritiflow-hashes-");

    try {
      await fs.outputFile(path.join(dir, "package.json"), "{}");
      await fs.outputFile(path.join(dir, "apps", "web", "package.json"), "{}");
      await fs.outputFile(path.join(dir, "src", "deep", "nested", "file.ts"), "export const a = 1;");
      await fs.outputFile(path.join(dir, "assets", "logo.png"), "not-really-a-png");

      const { hashes, strategy } = await computeFileHashes(dir, [
        "package.json",
        "apps/web/package.json",
        "src/deep/nested/file.ts",
        "assets/logo.png",
      ]);

      expect(strategy).toBe("content");
      expect(Object.keys(hashes).sort()).toEqual([
        "apps/web/package.json",
        "package.json",
        "src/deep/nested/file.ts",
      ]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("never fingerprints smritiflow's own generated output", async () => {
    const dir = await createTempDir("smritiflow-hashes-generated-");

    try {
      await fs.outputFile(path.join(dir, "src", "index.ts"), "export const a = 1;");
      await fs.outputFile(path.join(dir, "AGENTS.md"), "generated");
      await fs.outputFile(path.join(dir, "docs", "ai", "CURRENT_STATE.md"), "generated");
      await fs.outputFile(path.join(dir, ".smritiflow", "cache.json"), "{}");

      const { hashes } = await computeFileHashes(dir, [
        "src/index.ts",
        "AGENTS.md",
        "docs/ai/CURRENT_STATE.md",
        ".smritiflow/cache.json",
      ]);

      expect(Object.keys(hashes)).toEqual(["src/index.ts"]);
    } finally {
      await fs.remove(dir);
    }
  });
});

describe("inferActiveAreas", () => {
  it("returns both the top-level and two-segment areas", () => {
    const areas = inferActiveAreas(["apps/web/src/index.ts", "README.md"]);
    expect(areas).toContain("apps");
    expect(areas).toContain("apps/web");
    expect(areas).toContain("README.md");
  });

  it("does not list a shallow file as its own area", () => {
    const areas = inferActiveAreas(["app/service.py"]);

    expect(areas).toEqual(["app"]);
    expect(areas).not.toContain("app/service.py");
  });
});

describe("refresh output formatting", () => {
  it("interpolates the change count instead of printing a template literal", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "format-app" }, null, 2),
      "README.md": "# Format App\n\nDocs.\n",
      "src/index.ts": "export const a = 1;\n",
    });

    const logged: string[] = [];
    const original = console.log;
    console.log = (message: unknown) => {
      logged.push(String(message));
    };

    try {
      await runScan(repoRoot);
      await fs.writeFile(path.join(repoRoot, "README.md"), "# Format App\n\nChanged.\n");
      await runRefresh(repoRoot);
    } finally {
      console.log = original;
      await cleanup();
    }

    const refreshLines = logged.filter((line) => line.startsWith("Refresh complete"));

    expect(refreshLines).toHaveLength(1);
    expect(refreshLines[0]).toMatch(/^Refresh complete\. Changed files: \d+$/);
    expect(refreshLines[0]).not.toContain("${");
  });
});

describe("stat hash fallback", () => {
  it("switches to mtime+size above the content limit and still detects edits", async () => {
    const dir = await createTempDir("smritiflow-stat-");

    try {
      await fs.outputFile(path.join(dir, "a.ts"), "export const a = 1;\n");
      await fs.outputFile(path.join(dir, "b.ts"), "export const b = 1;\n");
      const files = ["a.ts", "b.ts"];

      const content = await computeFileHashes(dir, files, 10);
      expect(content.strategy).toBe("content");

      const stat = await computeFileHashes(dir, files, 1);
      expect(stat.strategy).toBe("stat");
      expect(Object.keys(stat.hashes).sort()).toEqual(["a.ts", "b.ts"]);

      // An edit that changes the size must still register under the weak strategy.
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fs.writeFile(path.join(dir, "a.ts"), "export const a = 999;\n");

      const after = await computeFileHashes(dir, files, 1);
      expect(diffHashes(stat.hashes, after.hashes).changed).toEqual(["a.ts"]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("records the weaker strategy so it is discoverable", async () => {
    const dir = await createTempDir("smritiflow-stat-strategy-");

    try {
      await fs.outputFile(path.join(dir, "a.ts"), "export const a = 1;\n");
      const { strategy, hashes } = await computeFileHashes(dir, ["a.ts"], 0);

      expect(strategy).toBe("stat");
      // A stat hash is a size and mtime pair, not a digest.
      expect(hashes["a.ts"]).toMatch(/^\d+:\d+$/);
    } finally {
      await fs.remove(dir);
    }
  });

  it("misses a same-size edit that preserves mtime, which is why the strategy is recorded", async () => {
    const dir = await createTempDir("smritiflow-stat-weakness-");

    try {
      const target = path.join(dir, "a.ts");
      await fs.outputFile(target, "export const a = 1;\n");

      const before = await computeFileHashes(dir, ["a.ts"], 0);
      const mtime = (await fs.stat(target)).mtime;

      // Replace the contents without altering size, then restore the mtime.
      await fs.writeFile(target, "export const a = 2;\n");
      await fs.utimes(target, mtime, mtime);

      const after = await computeFileHashes(dir, ["a.ts"], 0);
      expect(diffHashes(before.hashes, after.hashes).changed).toEqual([]);

      // Content hashing catches what the weak strategy cannot.
      const strong = await computeFileHashes(dir, ["a.ts"], 100);
      expect(diffHashes(before.strategy === "stat" ? strong.hashes : before.hashes, strong.hashes).changed).toEqual([]);
      const strongChanged = await (async () => {
        await fs.writeFile(target, "export const a = 3;\n");
        const again = await computeFileHashes(dir, ["a.ts"], 100);
        return diffHashes(strong.hashes, again.hashes).changed;
      })();
      expect(strongChanged).toEqual(["a.ts"]);
    } finally {
      await fs.remove(dir);
    }
  });
});
