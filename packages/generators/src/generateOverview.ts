import type { ProjectMap, ScanReport } from "../../shared/src/types.ts";
import { describeProject } from "./generateAgents.ts";

function formatList(items: string[]): string[] {
  return items.length === 0 ? ["- none detected"] : items.map((item) => `- ${item}`);
}

export function generateOverview(
  projectMap: ProjectMap,
  scanReport: ScanReport,
  readmeSummary: string
): string {
  const lines: string[] = ["# Project Overview", ""];

  lines.push("## What This Project Is");
  lines.push(readmeSummary.length > 0 ? readmeSummary : describeProject(projectMap));
  lines.push("");

  lines.push("## Stack");
  lines.push(`- Toolchain: ${projectMap.toolchain.ecosystem} (${projectMap.toolchain.manager})`);
  lines.push(
    `- Languages: ${
      projectMap.languages.length > 0
        ? projectMap.languages.map((entry) => `${entry.language} (${entry.files})`).join(", ")
        : "none detected"
    }`
  );
  lines.push("");
  lines.push("### Frontend");
  lines.push(...formatList(projectMap.detectedStack.frontend));
  lines.push("");
  lines.push("### Backend");
  lines.push(...formatList(projectMap.detectedStack.backend));
  lines.push("");
  lines.push("### Database");
  lines.push(...formatList(projectMap.detectedStack.database));
  lines.push("");
  lines.push("### Testing");
  lines.push(...formatList(projectMap.detectedStack.testing));
  lines.push("");

  lines.push("## Layout");
  lines.push(
    ...(projectMap.folders.length > 0
      ? projectMap.folders.map((folder) => `- ${folder.path}: ${folder.purpose}`)
      : ["- no known layout directories detected"])
  );
  lines.push("");

  lines.push("## Dependency Graph");
  lines.push(`- Internal source files: ${projectMap.moduleGraph.nodes}`);
  lines.push(`- Internal import edges: ${projectMap.moduleGraph.edges}`);
  lines.push("");

  if (projectMap.moduleGraph.hotspots.length > 0) {
    lines.push("### Most Depended-Upon Modules");
    lines.push(...projectMap.moduleGraph.hotspots.map((spot) => `- ${spot}`));
    lines.push("");
  }

  if (projectMap.moduleGraph.externalDependencies.length > 0) {
    lines.push("### Most-Used External Modules");
    lines.push(...projectMap.moduleGraph.externalDependencies.map((dep) => `- ${dep}`));
    lines.push("");
  }

  if (projectMap.moduleGraph.cycles.length > 0) {
    lines.push("### Import Cycles");
    for (const cycle of projectMap.moduleGraph.cycles) {
      lines.push(`- ${cycle.join(" -> ")}`);
    }
    lines.push("");
  }

  if (projectMap.entryPoints.length > 0) {
    lines.push("## Start Reading Here");
    lines.push(...projectMap.entryPoints.map((entry) => `- ${entry}`));
    lines.push("");
  }

  if (projectMap.workspacePackages.length > 0) {
    lines.push("## Workspace Packages");
    for (const entry of projectMap.workspacePackages) {
      const scripts = Object.keys(entry.scripts);
      lines.push(
        `- ${entry.name} (${entry.path})${scripts.length > 0 ? `: ${scripts.join(", ")}` : ""}`
      );
    }
    lines.push("");
  }

  lines.push("## Route Surface");
  lines.push(
    ...(projectMap.routes.length > 0
      ? projectMap.routes.map((route) => `- ${route}`)
      : ["- no routes detected"])
  );
  lines.push("");

  lines.push("## Configuration");
  lines.push(
    ...(projectMap.configs.length > 0
      ? projectMap.configs.map((config) => `- ${config}`)
      : ["- no configuration files detected"])
  );
  lines.push("");

  lines.push("## Snapshot");
  lines.push(`- Generated: ${scanReport.generatedAt}`);
  lines.push(`- Files scanned: ${scanReport.fileCount}`);
  lines.push(`- Branch: ${scanReport.branch}`);
  lines.push(`- Commit: ${scanReport.lastCommit}`);

  return lines.join("\n");
}
