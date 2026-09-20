import path from "node:path";
import fs from "fs-extra";
import simpleGit from "simple-git";
import { describe, expect, it, vi } from "vitest";
import { runScan } from "../packages/core/src/runScan.ts";
import { runRefresh } from "../packages/core/src/runRefresh.ts";
import { runStatus } from "../packages/core/src/runStatus.ts";
import { runResume } from "../packages/core/src/runResume.ts";
import { createTempRepo } from "./helpers/tempRepo.ts";

async function captureConsoleLogs(fn: () => Promise<void>): Promise<string> {
  const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  try {
    await fn();
    return spy.mock.calls
      .map((call) => call.map((value) => String(value)).join(" "))
      .join("\n");
  } finally {
    spy.mockRestore();
  }
}

describe("runRefresh/runStatus/runResume integration", () => {
  it("refreshes cache and provides resume/status guidance", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify(
        {
          name: "resume-app",
          scripts: { dev: "node dev.js", build: "node build.js" },
          dependencies: { react: "1.0.0" },
        },
        null,
        2
      ),
      "README.md": "# Resume App\n\nInitial state.\n",
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await runScan(repoRoot);

      // Create a local change so status can report staleness.
      await fs.writeFile(path.join(repoRoot, "README.md"), "# Resume App\n\nChanged.\n");

      const statusOutput = await captureConsoleLogs(async () => {
        await runStatus(repoRoot);
      });

      expect(statusOutput).toContain("SmritiFlow status");
      expect(statusOutput).toContain("Stale: yes");
      expect(statusOutput).toContain("Recommended action: smritiflow refresh");

      await runRefresh(repoRoot);

      const cache = await fs.readJson(path.join(repoRoot, ".smritiflow", "cache.json"));
      const scanReport = await fs.readJson(path.join(repoRoot, ".smritiflow", "scan-report.json"));
      expect(cache.lastRefreshAt).toBeTruthy();
      expect(scanReport.staleWarnings[0]).toContain("Partial refresh applied");

      const resumeOutput = await captureConsoleLogs(async () => {
        await runResume(repoRoot);
      });

      expect(resumeOutput).toContain("SmritiFlow resume");
      expect(resumeOutput).toContain("Read first:");
      expect(resumeOutput).toContain("Suggested next steps:");
    } finally {
      await cleanup();
    }
  });

  it("reports no-op refresh when nothing changed", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "noop-app" }, null, 2),
      "README.md": "# Noop App\n\nStable.\n",
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await runScan(repoRoot);

      const refreshOutput = await captureConsoleLogs(async () => {
        await runRefresh(repoRoot);
      });

      expect(refreshOutput).toContain("No changes detected. Project memory is already fresh.");
    } finally {
      await cleanup();
    }
  });

  it("reports fresh status when working tree is unchanged", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "fresh-app" }, null, 2),
      "README.md": "# Fresh App\n\nStable.\n",
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await runScan(repoRoot);

      const statusOutput = await captureConsoleLogs(async () => {
        await runStatus(repoRoot);
      });

      expect(statusOutput).toContain("Stale: no");
      expect(statusOutput).toContain("Project memory looks fresh.");
    } finally {
      await cleanup();
    }
  });

  it("detects commits made after the last scan", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "commit-app" }, null, 2),
      "README.md": "# Commit App\n\nStable.\n",
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await runScan(repoRoot);

      const git = simpleGit(repoRoot);
      await fs.writeFile(path.join(repoRoot, "src", "index.ts"), "export const value = 2;\n");
      await git.add(".");
      await git.commit("feat: update value");

      const refreshOutput = await captureConsoleLogs(async () => {
        await runRefresh(repoRoot);
      });

      expect(refreshOutput).toContain("Refresh complete");
      expect(refreshOutput).not.toContain("No changes detected");

      const scanReport = await fs.readJson(
        path.join(repoRoot, ".smritiflow", "scan-report.json")
      );
      expect(scanReport.changedFiles).toContain("src/index.ts");
      expect(scanReport.changedFiles).not.toContain("AGENTS.md");
      expect(scanReport.staleWarnings[0]).toContain("Partial refresh applied");
    } finally {
      await cleanup();
    }
  });

  it("falls back to a full scan when the recorded commit is unavailable", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "rewrite-app" }, null, 2),
      "README.md": "# Rewrite App\n\nStable.\n",
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await runScan(repoRoot);

      const cachePath = path.join(repoRoot, ".smritiflow", "cache.json");
      const cache = await fs.readJson(cachePath);
      cache.lastCommit = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
      await fs.writeJson(cachePath, cache);

      const refreshOutput = await captureConsoleLogs(async () => {
        await runRefresh(repoRoot);
      });

      expect(refreshOutput).toContain("Refresh complete");
      const scanReport = await fs.readJson(
        path.join(repoRoot, ".smritiflow", "scan-report.json")
      );
      expect(scanReport.staleWarnings[0]).toContain("full scan");
    } finally {
      await cleanup();
    }
  });
});
