import fg from "fast-glob";
import { uniqueSorted } from "../../shared/src/utils.ts";
import { applyIgnoreRules, FAST_GLOB_PRUNE_PATTERNS, loadIgnoreRules } from "./ignoreRules.ts";

function normalizeDynamicSegments(routePath: string): string {
  return routePath
    .replace(/\[\[\.\.\.(.+?)\]\]/g, ":$1*")
    .replace(/\[\.\.\.(.+?)\]/g, ":$1*")
    .replace(/\[(.+?)\]/g, ":$1");
}

function filePathToRoute(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");

  if (normalized.includes("/app/")) {
    const tail = normalized.split("/app/")[1] ?? "";
    const cleaned = tail
      .replace(/(^|\/)page\.(tsx|ts|jsx|js|mdx)$/, "$1")
      .replaceAll("/index", "")
      .replace(/(^|\/)\([^/]+\)/g, "")
      .replace(/\/@[^/]+/g, "");
    const route = normalizeDynamicSegments(cleaned);
    return `/${route}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  }

  if (normalized.includes("/pages/")) {
    const tail = normalized.split("/pages/")[1] ?? "";
    const cleaned = tail
      .replace(/\.(tsx|ts|jsx|js|mdx)$/, "")
      .replace(/(^|\/)index$/, "")
      .replace(/\/@[^/]+/g, "");
    const route = normalizeDynamicSegments(cleaned);
    return `/${route}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  }

  return normalized;
}

export async function extractRoutes(repoRoot: string): Promise<string[]> {
  const appRoutes = await fg(["**/app/**/page.{ts,tsx,js,jsx,mdx}"], {
    cwd: repoRoot,
    onlyFiles: true,
    ignore: FAST_GLOB_PRUNE_PATTERNS,
  });

  const pageRoutes = await fg(["**/pages/**/*.{ts,tsx,js,jsx,mdx}"], {
    cwd: repoRoot,
    onlyFiles: true,
    ignore: [
      ...FAST_GLOB_PRUNE_PATTERNS,
      "**/pages/api/**",
      "**/pages/_app.*",
      "**/pages/_document.*",
      "**/pages/_error.*",
    ],
  });

  const rules = await loadIgnoreRules(repoRoot);
  const allRoutes = applyIgnoreRules(rules, [...appRoutes, ...pageRoutes]).map(filePathToRoute);

  return uniqueSorted(allRoutes);
}
