import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { findRepoRoot } from "../packages/git/src/findRepoRoot.ts";
import { createTempDir, createTempRepo } from "./helpers/tempRepo.ts";

describe("findRepoRoot", () => {
  it("finds the git root by walking upward", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "tmp" }, null, 2),
      "src/nested/file.ts": "export const x = 1;\n",
    });

    try {
      const start = path.join(repoRoot, "src", "nested");
      const found = await findRepoRoot(start);
      expect(found).toBe(repoRoot);
    } finally {
      await cleanup();
    }
  });

  it("falls back to start directory when no git root exists", async () => {
    const dir = await createTempDir("smritiflow-no-git-");
    const nested = path.join(dir, "deep", "path");
    await fs.ensureDir(nested);

    try {
      const found = await findRepoRoot(nested);
      expect(found).toBe(path.resolve(nested));
    } finally {
      await fs.remove(dir);
    }
  });
});
