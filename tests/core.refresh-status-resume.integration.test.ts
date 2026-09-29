import path from "node:path";
import fs from "fs-extra";
import simpleGit from "simple-git";
import { describe, expect, it, vi } from "vitest";
import { runScan } from "../packages/core/src/runScan.ts";
import { runRefresh } from "../packages/core/src/runRefresh.ts";
import { runStatus } from "../packages/core/src/runStatus.ts";
import { runResume } from "../packages/core/src/runResume.ts";
import { createTempDir, createTempRepo } from "./helpers/tempRepo.ts";

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

const BASIC_REPO = {
  "package.json": JSON.stringify(
    { name: "resume-app", scripts: { dev: "node dev.js", build: "node build.js" }, dependencies: { react: "1.0.0" } },
    null,
    2
  ),
  "README.md": "# Resume App\n\nInitial state.\n",
  "src/index.ts": "export const value = 1;\n",
};

describe("runRefresh/runStatus/runResume integration", () => {
  it("refreshes cache and provides resume/status guidance", async () => {
    const { repoRoot, cleanup } = await createTempRepo(BASIC_REPO);

    try {
      await runScan(repoRoot);

      await fs.writeFile(path.join(repoRoot, "README.md"), "# Resume App\n\nChanged.\n");

      const statusResult = await runStatus(repoRoot);
      expect(statusResult.stale).toBe(true);

      const statusOutput = await captureConsoleLogs(async () => {
        await runStatus(repoRoot);
      });

      expect(statusOutput).toContain("SmritiFlow status");
      expect(statusOutput).toContain("Stale: yes");
      expect(statusOutput).toContain("Recommended action: smritiflow refresh");

      const refreshResult = await runRefresh(repoRoot);

      expect(refreshResult.mode).toBe("partial");
      expect(refreshResult.changedFiles).toContain("README.md");

      const cache = await fs.readJson(path.join(repoRoot, ".smritiflow", "cache.json"));
      expect(cache.lastRefreshAt).toBeTruthy();

      // staleWarnings must describe staleness, not record refresh bookkeeping.
      const scanReport = await fs.readJson(path.join(repoRoot, ".smritiflow", "scan-report.json"));
      expect(scanReport.staleWarnings).toEqual([]);
      expect(scanReport.notes.join(" ")).toContain("Partial refresh");

      const resumeResult = await runResume(repoRoot);
      expect(resumeResult.readFirst).toContain("AGENTS.md");

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

      const result = await runRefresh(repoRoot);

      expect(result.mode).toBe("none");
      expect(result.changedCount).toBe(0);

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

      const statusResult = await runStatus(repoRoot);
      expect(statusResult.stale).toBe(false);

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

      const result = await runRefresh(repoRoot);

      expect(result.mode).not.toBe("none");
      expect(result.changedFiles).toContain("src/index.ts");

      const scanReport = await fs.readJson(
        path.join(repoRoot, ".smritiflow", "scan-report.json")
      );
      expect(scanReport.changedFiles).toContain("src/index.ts");
      expect(scanReport.changedFiles).not.toContain("AGENTS.md");
      expect(scanReport.staleWarnings).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  it("does not re-run analyzers when a commit carries no new content", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "content-app" }, null, 2),
      "README.md": "# Content App\n\nStable.\n",
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await runScan(repoRoot);

      // Fingerprint the current content, then commit it. The commit moves HEAD
      // but the tree SmritiFlow already recorded is identical, so nothing needs
      // regenerating.
      const git = simpleGit(repoRoot);
      await git.add(".");
      await git.commit("chore: commit already-scanned state");

      const result = await runRefresh(repoRoot);

      expect(result.mode).toBe("none");
      expect(result.changedCount).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("detects committed changes without relying on a reachable recorded commit", async () => {
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

      const git = simpleGit(repoRoot);
      await fs.writeFile(path.join(repoRoot, "src", "index.ts"), "export const value = 2;\n");
      await git.add(".");
      await git.commit("feat: change after history rewrite");

      const result = await runRefresh(repoRoot);

      // An unreachable recorded commit no longer forces a full scan, because
      // content fingerprints carry the change signal on their own.
      expect(result.changedFiles).toContain("src/index.ts");
    } finally {
      await cleanup();
    }
  });

  it("falls back to a full scan when the recorded commit is unavailable and nothing else changed", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "rewrite-app" }, null, 2),
      "README.md": "# Rewrite App\n\nStable.\n",
      "src/index.ts": "export const value = 1;\n",
    });

    try {
      await runScan(repoRoot);

      const cachePath = path.join(repoRoot, ".smritiflow", "cache.json");
      const cache = await fs.readJson(cachePath);
      cache.hashes = {};
      await fs.writeJson(cachePath, cache);

      const result = await runRefresh(repoRoot);

      expect(result.mode).toBe("full");
      expect(result.reason).toContain("baseline");
    } finally {
      await cleanup();
    }
  });
});

describe("missing fingerprint baseline", () => {
  it("reports a clone with artifacts but no baseline as needing refresh", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "clone-app" }, null, 2),
      "README.md": "# Clone App\n\nDocs.\n",
      "src/index.ts": "export const a = 1;\n",
    });

    try {
      await runScan(repoRoot);

      // cache.json is gitignored, so a fresh clone has artifacts but no baseline.
      await fs.remove(path.join(repoRoot, ".smritiflow", "cache.json"));

      const status = await runStatus(repoRoot);
      expect(status.initialized).toBe(true);
      expect(status.hasBaseline).toBe(false);
      expect(status.stale).toBe(true);
      expect(status.staleReasons[0]).toContain("fingerprint baseline");

      const output = await captureConsoleLogs(async () => {
        await runStatus(repoRoot);
      });
      expect(output).toContain("Recommended action: smritiflow refresh");

      const refreshed = await runRefresh(repoRoot);
      expect(refreshed.mode).toBe("full");
      expect(refreshed.reason).toContain("baseline");

      const after = await runStatus(repoRoot);
      expect(after.hasBaseline).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("reports a repository with no artifacts at all as uninitialized", async () => {
    const repoRoot = await createTempDir("smritiflow-uninitialized-");

    try {
      await fs.outputFile(path.join(repoRoot, "package.json"), JSON.stringify({ name: "bare" }));

      const status = await runStatus(repoRoot);
      expect(status.initialized).toBe(false);
      expect(status.staleReasons[0]).toBe("no scan has been recorded");

      const output = await captureConsoleLogs(async () => {
        await runStatus(repoRoot);
      });
      expect(output).toContain("Recommended action: smritiflow init");
    } finally {
      await fs.remove(repoRoot);
    }
  });
});

describe("refresh without git", () => {
  it("detects source edits in a repository with no git history", async () => {
    const repoRoot = await createTempDir("smritiflow-nogit-refresh-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "package.json"),
        JSON.stringify({ name: "plain-app", scripts: { test: "node test.js" } }, null, 2)
      );
      await fs.outputFile(path.join(repoRoot, "README.md"), "# Plain App\n\nDocs.\n");
      await fs.outputFile(path.join(repoRoot, "src", "index.ts"), "export const value = 1;\n");

      await runScan(repoRoot);

      const noop = await runRefresh(repoRoot);
      expect(noop.mode).toBe("none");

      await fs.writeFile(path.join(repoRoot, "src", "index.ts"), "export const value = 2;\n");

      const result = await runRefresh(repoRoot);

      expect(result.mode).toBe("partial");
      expect(result.changedFiles).toContain("src/index.ts");

      const scanReport = await fs.readJson(
        path.join(repoRoot, ".smritiflow", "scan-report.json")
      );
      expect(scanReport.changedFiles).toContain("src/index.ts");
      expect(scanReport.branch).toBe("unknown");
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("detects a nested workspace manifest change that root-only hashing would miss", async () => {
    const repoRoot = await createTempDir("smritiflow-nested-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "package.json"),
        JSON.stringify({ name: "monorepo", workspaces: ["apps/*"] }, null, 2)
      );
      await fs.outputFile(
        path.join(repoRoot, "apps", "web", "package.json"),
        JSON.stringify({ name: "web", dependencies: { react: "18.0.0" } }, null, 2)
      );
      await fs.outputFile(path.join(repoRoot, "README.md"), "# Monorepo\n\nDocs.\n");

      await runScan(repoRoot);

      await fs.writeFile(
        path.join(repoRoot, "apps", "web", "package.json"),
        JSON.stringify({ name: "web", dependencies: { react: "19.0.0" } }, null, 2)
      );

      const result = await runRefresh(repoRoot);

      expect(result.changedFiles).toContain("apps/web/package.json");
      // A manifest change invalidates the project map, so it forces a full scan.
      expect(result.mode).toBe("full");
      expect(result.reason).toContain("manifest");

      const projectMap = await fs.readJson(
        path.join(repoRoot, ".smritiflow", "project-map.json")
      );
      expect(projectMap.dependencies).toContain("react");
    } finally {
      await fs.remove(repoRoot);
    }
  });
});
