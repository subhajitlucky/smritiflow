import type { ProjectMap, ScanReport } from "../../shared/src/types.ts";

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- none detected";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

export function generateOverview(
  projectMap: ProjectMap,
  scanReport: ScanReport,
  readmeSummary: string
): string {
  const routes =
    projectMap.routes.length === 0
      ? ["- no routes detected"]
      : projectMap.routes.map((route) => `- ${route}`);

  const hotspots =
    projectMap.moduleGraph.hotspots.length === 0
      ? ["- no internal import hotspots found"]
      : projectMap.moduleGraph.hotspots.map((spot) => `- ${spot}`);

  return [
    "# Project Overview",
    "",
    "## What This Project Is",
    readmeSummary || "Repository memory system for coding agents.",
    "",
    "## Tech Stack",
    "### Frontend",
    formatList(projectMap.detectedStack.frontend),
    "",
    "### Backend",
    formatList(projectMap.detectedStack.backend),
    "",
    "### Database",
    formatList(projectMap.detectedStack.database),
    "",
    "### Testing",
    formatList(projectMap.detectedStack.testing),
    "",
    "## Repo Layout",
    ...projectMap.folders.map((f) => `- ${f.path}: ${f.purpose}`),
    "",
    "## Architecture Summary",
    `- Internal source files: ${projectMap.moduleGraph.nodes}`,
    `- Internal import edges: ${projectMap.moduleGraph.edges}`,
    "",
    "### Route Surface",
    ...routes,
    "",
    "### Module Hotspots",
    ...hotspots,
    "",
    "## Important Configs",
    ...projectMap.configs.map((cfg) => `- ${cfg}`),
    "",
    "## Current Maturity",
    `- Last scan: ${scanReport.generatedAt}`,
    `- Files scanned: ${scanReport.fileCount}`,
    `- Branch: ${scanReport.branch}`,
  ].join("\n");
}
