import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { runCheck } from "../packages/core/src/runCheck.ts";
import { runScan } from "../packages/core/src/runScan.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

async function fixture(): Promise<string> {
  const dir = await createTempDir("smritiflow-check-");

  await fs.outputFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "check-app", scripts: { test: "vitest" } }, null, 2)
  );
  await fs.outputFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await fs.outputFile(path.join(dir, "README.md"), "# Check App\n\nA fixture.\n");
  await fs.outputFile(path.join(dir, "src", "index.ts"), "export const a = 1;\n");

  return dir;
}

describe("runCheck", () => {
  it("reports up to date immediately after a scan", async () => {
    const dir = await fixture();

    try {
      await runScan(dir);
      const result = await runCheck(dir);

      expect(result.upToDate).toBe(true);
      expect(result.drift).toEqual([]);
      expect(result.checked).toContain("docs/ai/PROJECT_OVERVIEW.md");
      expect(result.checked).toContain("docs/ai/RUNBOOK.md");
      expect(result.checked).toContain("AGENTS.md");
      expect(result.checked).toContain(".smritiflow/project-map.json");
    } finally {
      await fs.remove(dir);
    }
  });

  it("detects drift when a script is added after the scan", async () => {
    const dir = await fixture();

    try {
      await runScan(dir);

      const pkgPath = path.join(dir, "package.json");
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts.lint = "eslint .";
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });

      const result = await runCheck(dir);

      expect(result.upToDate).toBe(false);
      expect(result.drift.map((entry) => entry.file)).toContain("docs/ai/RUNBOOK.md");
      expect(result.drift.map((entry) => entry.file)).toContain("AGENTS.md");
    } finally {
      await fs.remove(dir);
    }
  });

  it("never writes, so a drifted repository cannot be made to look clean", async () => {
    const dir = await fixture();

    try {
      await runScan(dir);

      await fs.outputFile(path.join(dir, "src", "extra.ts"), "export const extra = 1;\n");

      const first = await runCheck(dir);
      expect(first.upToDate).toBe(false);

      const second = await runCheck(dir);
      expect(second.upToDate).toBe(false);

      const overview = await fs.readFile(path.join(dir, "docs", "ai", "PROJECT_OVERVIEW.md"), "utf8");
      expect(overview).not.toContain("extra");
    } finally {
      await fs.remove(dir);
    }
  });

  it("does not compare point-in-time snapshots", async () => {
    const dir = await fixture();

    try {
      await runScan(dir);

      const statePath = path.join(dir, "docs", "ai", "CURRENT_STATE.md");
      const before = await fs.readFile(statePath, "utf8");
      await fs.writeFile(statePath, `${before}\nhand written drift\n`);

      const result = await runCheck(dir);

      expect(result.upToDate).toBe(true);
      expect(result.skipped).toContain("docs/ai/CURRENT_STATE.md");
    } finally {
      await fs.remove(dir);
    }
  });

  it("reports an ungenerated repository as drift", async () => {
    const dir = await fixture();

    try {
      const result = await runCheck(dir);
      expect(result.upToDate).toBe(false);
      expect(result.drift.some((entry) => entry.reason === "not generated")).toBe(true);
    } finally {
      await fs.remove(dir);
    }
  });

  it("ignores the absolute repository root recorded in project-map.json", async () => {
    const dir = await fixture();

    try {
      await runScan(dir);

      const mapPath = path.join(dir, ".smritiflow", "project-map.json");
      const map = await fs.readJson(mapPath);
      map.root = "/some/other/absolute/path";
      await fs.writeJson(mapPath, map, { spaces: 2 });

      const result = await runCheck(dir);
      expect(result.upToDate).toBe(true);
    } finally {
      await fs.remove(dir);
    }
  });
});

describe("scan idempotency", () => {
  it("produces identical artifacts on a fresh repository, before and after its own output exists", async () => {
    const dir = await fixture();

    try {
      await runScan(dir);
      const first = await runCheck(dir);

      await runScan(dir);
      const second = await runCheck(dir);

      // The first scan writes AGENTS.md and docs/ai/. If those counted as
      // repository content, the second scan would disagree with the first.
      expect(first.upToDate).toBe(true);
      expect(second.upToDate).toBe(true);
      expect(second.drift).toEqual([]);
    } finally {
      await fs.remove(dir);
    }
  });

  it("scans a nested AGENTS.md but excludes the root one it writes itself", async () => {
    const dir = await fixture();

    try {
      await fs.outputFile(path.join(dir, "packages", "web", "AGENTS.md"), "# Web notes\n");

      // 4 fixture files plus the nested AGENTS.md. The root AGENTS.md is written
      // by this scan and must not inflate the count.
      const result = await runScan(dir);
      expect(result.fileCount).toBe(5);

      const second = await runScan(dir);
      expect(second.fileCount).toBe(5);
      expect((await runCheck(dir)).upToDate).toBe(true);
    } finally {
      await fs.remove(dir);
    }
  });
});
