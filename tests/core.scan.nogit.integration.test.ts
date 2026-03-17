import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { runScan } from "../packages/core/src/runScan.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

describe("runScan without git/package", () => {
  it("generates artifacts with safe defaults outside git repos", async () => {
    const repoRoot = await createTempDir("smritiflow-nogit-");

    try {
      await fs.outputFile(path.join(repoRoot, "README.md"), "# No Git Repo\n\nLocal notes.\n");
      await fs.outputFile(path.join(repoRoot, "src", "index.ts"), "export const value = 1;\n");

      await runScan(repoRoot);

      const projectMap = await fs.readJson(path.join(repoRoot, ".smritiflow", "project-map.json"));
      const scanReport = await fs.readJson(path.join(repoRoot, ".smritiflow", "scan-report.json"));

      expect(projectMap.name).toBe(path.basename(repoRoot));
      expect(scanReport.branch).toBe("unknown");
      expect(scanReport.lastCommit).toBe("unknown");
      expect(Array.isArray(scanReport.recentCommits)).toBe(true);
    } finally {
      await fs.remove(repoRoot);
    }
  });
});
