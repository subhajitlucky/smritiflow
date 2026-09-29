import path from "node:path";
import fs from "fs-extra";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createTempRepo, createTempDir } from "./helpers/tempRepo.ts";

const run = promisify(execFile);

const REPO_ROOT = path.resolve(__dirname, "..");
const TSX = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");
const CLI = path.join(REPO_ROOT, "apps", "cli", "src", "index.ts");

async function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  const result = await run(TSX, [CLI, ...args], {
    cwd,
    env: { ...process.env, SMRITIFLOW_JSON: undefined },
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

describe("cli json output", () => {
  it("emits parseable JSON for status", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "json-app" }, null, 2),
      "README.md": "# Json App\n\nDocs.\n",
      "src/index.ts": "export const a = 1;\n",
    });

    try {
      await runCli(["scan"], repoRoot);
      const { stdout } = await runCli(["--json", "status"], repoRoot);
      const parsed = JSON.parse(stdout);

      expect(parsed.command).toBe("status");
      expect(parsed.ok).toBe(true);
      expect(parsed.stale).toBe(false);
      expect(parsed.staleReasons).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  it("emits parseable JSON for scan and refresh", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "json-refresh-app" }, null, 2),
      "README.md": "# Json App\n\nDocs.\n",
      "src/index.ts": "export const a = 1;\n",
    });

    try {
      const scanned = JSON.parse((await runCli(["--json", "scan"], repoRoot)).stdout);
      expect(scanned.command).toBe("scan");
      expect(scanned.fileCount).toBeGreaterThan(0);
      expect(scanned.artifacts).toContain("AGENTS.md");

      const noop = JSON.parse((await runCli(["--json", "refresh"], repoRoot)).stdout);
      expect(noop.command).toBe("refresh");
      expect(noop.mode).toBe("none");
    } finally {
      await cleanup();
    }
  });

  it("suppresses human text when --json is set", async () => {
    const repoRoot = await createTempDir("smritiflow-json-quiet-");

    try {
      await fs.outputFile(
        path.join(repoRoot, "package.json"),
        JSON.stringify({ name: "quiet-app" }, null, 2)
      );

      const { stdout } = await runCli(["--json", "status"], repoRoot);

      expect(() => JSON.parse(stdout)).not.toThrow();
      expect(stdout).not.toContain("SmritiFlow status");
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("prints human text without --json", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "human-app" }, null, 2),
      "README.md": "# Human App\n",
    });

    try {
      await runCli(["scan"], repoRoot);
      const { stdout } = await runCli(["status"], repoRoot);

      expect(stdout).toContain("SmritiFlow status");
      expect(stdout).toContain("Stale:");
    } finally {
      await cleanup();
    }
  });
});

describe("cli hook", () => {
  it("prints a session-start brief and flags staleness", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "hook-app" }, null, 2),
      "README.md": "# Hook App\n\nDocs.\n",
      "src/index.ts": "export const a = 1;\n",
    });

    try {
      await runCli(["scan"], repoRoot);

      const fresh = await runCli(["hook"], repoRoot);
      expect(fresh.stdout).toContain("Repository memory is fresh.");
      expect(fresh.stdout).toContain("docs/ai/CURRENT_STATE.md");

      await fs.writeFile(path.join(repoRoot, "src", "index.ts"), "export const a = 2;\n");

      const stale = await runCli(["hook"], repoRoot);
      expect(stale.stdout).toContain("STALE");
      expect(stale.stdout).toContain("smritiflow refresh");
    } finally {
      await cleanup();
    }
  });

  it("tells the agent to scan when memory is missing", async () => {
    const repoRoot = await createTempDir("smritiflow-hook-empty-");

    try {
      await fs.outputFile(path.join(repoRoot, "package.json"), JSON.stringify({ name: "bare" }));
      const { stdout } = await runCli(["hook"], repoRoot);

      expect(stdout).toContain("not initialized");
      expect(stdout).toContain("smritiflow scan");
    } finally {
      await fs.remove(repoRoot);
    }
  });

  it("emits the hook brief as JSON when asked", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify({ name: "hook-json-app" }, null, 2),
      "README.md": "# Hook App\n",
    });

    try {
      await runCli(["scan"], repoRoot);
      const { stdout } = await runCli(["--json", "hook", "session-start"], repoRoot);
      const parsed = JSON.parse(stdout);

      expect(parsed.command).toBe("hook");
      expect(parsed.event).toBe("session-start");
      expect(typeof parsed.brief).toBe("string");
      expect(parsed.readFirst).toContain("AGENTS.md");
    } finally {
      await cleanup();
    }
  });
});
