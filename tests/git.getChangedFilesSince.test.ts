import fs from "fs-extra";
import path from "node:path";
import simpleGit from "simple-git";
import { describe, expect, it } from "vitest";
import { getChangedFilesSince } from "../packages/git/src/getChangedFilesSince.ts";
import { getLastCommit } from "../packages/git/src/getLastCommit.ts";
import { createTempRepo } from "./helpers/tempRepo.ts";

describe("getChangedFilesSince", () => {
  it("lists files changed by commits since the recorded commit", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      const baseline = await getLastCommit(repoRoot);
      const git = simpleGit(repoRoot);

      await fs.writeFile(path.join(repoRoot, "src", "new.ts"), "export const added = 2;\n");
      await fs.writeFile(path.join(repoRoot, "src", "index.ts"), "export const value = 3;\n");
      await git.add(".");
      await git.commit("feat: committed change");

      const changed = await getChangedFilesSince(repoRoot, baseline);

      expect(changed).toContain("src/new.ts");
      expect(changed).toContain("src/index.ts");
    } finally {
      await cleanup();
    }
  });

  it("throws when the recorded commit is no longer reachable", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await expect(
        getChangedFilesSince(repoRoot, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
      ).rejects.toThrow();
    } finally {
      await cleanup();
    }
  });
});
