import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { runScan } from "../packages/core/src/runScan.ts";
import { createTempDir, createTempRepo } from "./helpers/tempRepo.ts";

describe("runScan integration", () => {
  it("generates machine and markdown artifacts", async () => {
    const { repoRoot, cleanup } = await createTempRepo({
      "package.json": JSON.stringify(
        {
          name: "sample-app",
          scripts: {
            dev: "node dev.js",
            build: "node build.js",
            test: "vitest run",
            lint: "eslint .",
          },
          dependencies: {
            react: "1.0.0",
            next: "1.0.0",
            express: "1.0.0",
          },
          devDependencies: {
            vitest: "1.0.0",
          },
        },
        null,
        2
      ),
      "README.md": "# Sample App\n\nA sample repository for scan testing.\n",
      "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }, null, 2),
      "src/index.ts": "export const boot = () => 'ok';\n",
      "src/app/home/page.tsx": "export default function Page(){return null;}\n",
    });

    try {
      await runScan(path.join(repoRoot, "src"));

      const projectMapPath = path.join(repoRoot, ".smritiflow", "project-map.json");
      const scanReportPath = path.join(repoRoot, ".smritiflow", "scan-report.json");
      const overviewPath = path.join(repoRoot, "docs", "ai", "PROJECT_OVERVIEW.md");
      const runbookPath = path.join(repoRoot, "docs", "ai", "RUNBOOK.md");
      const agentsPath = path.join(repoRoot, "AGENTS.md");

      expect(await fs.pathExists(projectMapPath)).toBe(true);
      expect(await fs.pathExists(scanReportPath)).toBe(true);
      expect(await fs.pathExists(overviewPath)).toBe(true);
      expect(await fs.pathExists(runbookPath)).toBe(true);
      expect(await fs.pathExists(agentsPath)).toBe(true);

      const projectMap = await fs.readJson(projectMapPath);
      const overview = await fs.readFile(overviewPath, "utf8");
      const runbook = await fs.readFile(runbookPath, "utf8");

      expect(projectMap.name).toBe("sample-app");
      expect(projectMap.scripts.dev).toBe("node dev.js");
      expect(projectMap.detectedStack.frontend).toContain("nextjs");
      expect(projectMap.detectedStack.testing).toContain("vitest");
      expect(Array.isArray(projectMap.routes)).toBe(true);
      expect(projectMap.moduleGraph).toBeTruthy();

      expect(overview).toContain("## Stack");
      expect(overview).toContain("## Dependency Graph");
      expect(overview).toContain("## Route Surface");
      expect(runbook).toContain("## Commands");
      expect(runbook).toContain("npm run dev");
      expect(runbook).toContain("npm run build");
    } finally {
      await cleanup();
    }
  });

  it("does not claim a node package manager for a non-node repository", async () => {
    const dir = await createTempDir("smritiflow-scan-gradle-");

    try {
      await fs.outputFile(
        path.join(dir, "build.gradle"),
        "plugins { id 'java-library' }\n"
      );
      await fs.outputFile(path.join(dir, "README.md"), "# Lib\n\nA library.\n");
      await fs.outputFile(path.join(dir, "src", "main", "Main.kt"), "fun main() {}\n");

      const result = await runScan(dir);
      expect(result.ok).toBe(true);

      const projectMap = await fs.readJson(path.join(dir, ".smritiflow", "project-map.json"));
      expect(projectMap.packageManager).toBe("none");
      expect(projectMap.toolchain.ecosystem).toBe("java");

      const runbook = await fs.readFile(path.join(dir, "docs", "ai", "RUNBOOK.md"), "utf8");
      expect(runbook).toContain("gradle build");
      expect(runbook).not.toContain("npm");
    } finally {
      await fs.remove(dir);
    }
  });

  it("records a node package manager for a node repository", async () => {
    const dir = await createTempDir("smritiflow-scan-pnpm-");

    try {
      await fs.outputFile(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "node-app", scripts: { test: "vitest" } })
      );
      await fs.outputFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      await fs.outputFile(path.join(dir, "README.md"), "# App\n\nAn app.\n");

      await runScan(dir);

      const projectMap = await fs.readJson(path.join(dir, ".smritiflow", "project-map.json"));
      expect(projectMap.packageManager).toBe("pnpm");
    } finally {
      await fs.remove(dir);
    }
  });
});
