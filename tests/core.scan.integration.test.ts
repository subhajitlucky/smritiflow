import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { runScan } from "../packages/core/src/runScan.ts";
import { createTempRepo } from "./helpers/tempRepo.ts";

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

      expect(overview).toContain("## Tech Stack");
      expect(overview).toContain("## Architecture Summary");
      expect(runbook).toContain("## Dev");
      expect(runbook).toContain("## Build");
    } finally {
      await cleanup();
    }
  });
});
