import path from "node:path";
import fs from "fs-extra";
import type { CacheData, ProjectMap, ScanReport } from "../../shared/src/types.ts";

interface WriteArtifactsInput {
  repoRoot: string;
  projectMap: ProjectMap;
  scanReport: ScanReport;
  cache: CacheData;
  docs: {
    agents: string;
    overview: string;
    currentState: string;
    runbook: string;
  };
}

export async function writeArtifacts(input: WriteArtifactsInput): Promise<void> {
  const smritiDir = path.join(input.repoRoot, ".smritiflow");
  const docsDir = path.join(input.repoRoot, "docs", "ai");

  await fs.ensureDir(smritiDir);
  await fs.ensureDir(docsDir);

  await fs.writeJson(path.join(smritiDir, "project-map.json"), input.projectMap, {
    spaces: 2,
  });

  await fs.writeJson(path.join(smritiDir, "scan-report.json"), input.scanReport, {
    spaces: 2,
  });

  await fs.writeJson(path.join(smritiDir, "cache.json"), input.cache, {
    spaces: 2,
  });

  await fs.writeFile(path.join(input.repoRoot, "AGENTS.md"), input.docs.agents);
  await fs.writeFile(path.join(docsDir, "PROJECT_OVERVIEW.md"), input.docs.overview);
  await fs.writeFile(path.join(docsDir, "CURRENT_STATE.md"), input.docs.currentState);
  await fs.writeFile(path.join(docsDir, "RUNBOOK.md"), input.docs.runbook);
}
