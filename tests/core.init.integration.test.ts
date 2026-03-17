import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { runInit } from "../packages/core/src/initProject.ts";
import { createTempRepo } from "./helpers/tempRepo.ts";

describe("runInit integration", () => {
  it("initializes at repo root from a nested cwd and stays idempotent", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "init-app" }, null, 2),
      "src/nested/file.ts": "export const value = 1;\n",
    });

    try {
      const nestedCwd = path.join(repoRoot, "src", "nested");
      await runInit(nestedCwd);

      expect(await fs.pathExists(path.join(repoRoot, ".smritiflow", "cache.json"))).toBe(true);
      expect(await fs.pathExists(path.join(repoRoot, "docs", "ai", "PROJECT_OVERVIEW.md"))).toBe(
        true
      );

      const customAgents = "# AGENTS.md\n\ncustom content\n";
      await fs.writeFile(path.join(repoRoot, "AGENTS.md"), customAgents);
      await runInit(repoRoot);

      const agentsText = await fs.readFile(path.join(repoRoot, "AGENTS.md"), "utf8");
      expect(agentsText).toBe(customAgents);
    } finally {
      await cleanup();
    }
  });
});
