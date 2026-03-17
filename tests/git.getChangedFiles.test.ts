import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { getChangedFiles } from "../packages/git/src/getChangedFiles.ts";
import { createTempRepo } from "./helpers/tempRepo.ts";

describe("getChangedFiles", () => {
  it("ignores generated artifacts and operational files", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "changed-files-app" }, null, 2),
      "src/index.ts": "export const value = 1;\n",
      "AGENTS.md": "# AGENTS\n",
      "docs/ai/CURRENT_STATE.md": "# Current State\n",
      ".smritiflow/cache.json": JSON.stringify({ lastScanAt: null, lastRefreshAt: null }, null, 2),
      "node_modules/.pnpm-workspace-state-v1.json": JSON.stringify(
        { lastValidatedTimestamp: 1 },
        null,
        2
      ),
    });

    try {
      await fs.writeFile(path.join(repoRoot, "src", "index.ts"), "export const value = 2;\n");
      await fs.writeFile(path.join(repoRoot, "src", "new.ts"), "export const newValue = 3;\n");
      await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "# AGENTS\n\nupdated\n");
      await fs.writeFile(path.join(repoRoot, "docs", "ai", "CURRENT_STATE.md"), "# Current State\n\nupdated\n");
      await fs.writeJson(path.join(repoRoot, ".smritiflow", "cache.json"), {
        lastScanAt: "2026-03-17T00:00:00.000Z",
        lastRefreshAt: "2026-03-17T00:00:00.000Z",
      });
      await fs.writeJson(path.join(repoRoot, "node_modules", ".pnpm-workspace-state-v1.json"), {
        lastValidatedTimestamp: 2,
      });
      await fs.writeFile(path.join(repoRoot, "docs", "ai", "UNTRACKED_NOTE.md"), "note\n");

      const changed = await getChangedFiles(repoRoot);
      expect(changed).toEqual(["src/index.ts", "src/new.ts"]);
    } finally {
      await cleanup();
    }
  });
});
