import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";
import { uniqueSorted } from "../../shared/src/utils.ts";
import { applyIgnoreRules, FAST_GLOB_PRUNE_PATTERNS, loadIgnoreRules } from "./ignoreRules.ts";
import { isSourcePath, isTestPath } from "./languages.ts";

const COMPONENT_DIRECTORY_RE = /(^|\/)(components|component|widgets|examples|demos?)\//;

const MAX_SOURCE_FILES = 2000;

interface RoutePattern {
  pattern: RegExp;
  pathGroup: number;
  methodGroup: number | null;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  // FastAPI / Flask / Bottle: @app.get("/x"), @blueprint.route("/x")
  { pattern: /@(?:app|router|blueprint|bp)\.(route|get|post|put|patch|delete|options|head)\s*\(\s*["'`]([^"'`]+)["'`]/g, pathGroup: 2, methodGroup: 1 },
  // Express / Fastify / Koa: app.get("/x"), router.post("/x")
  { pattern: /@?(?:app|router|server|api|fastify|express)\.(get|post|put|patch|delete|options|head|all)\s*\(\s*["'`]([^"'`]+)["'`]/g, pathGroup: 2, methodGroup: 1 },
  // Spring: @GetMapping("/x")
  { pattern: /@(Get|Post|Put|Patch|Delete)Mapping\s*\(\s*(?:value\s*=\s*)?["'`]([^"'`]+)["'`]/g, pathGroup: 2, methodGroup: 1 },
  // Spring: @RequestMapping("/x")
  { pattern: /@RequestMapping\s*\(\s*["'`]([^"'`]+)["'`]/g, pathGroup: 1, methodGroup: null },
  // Go: mux.HandleFunc("/x", h), mux.Handle("/x", h)
  { pattern: /\b(?:mux|router|r|app|http|server|httpsrv|chi)\.(?:HandleFunc|Handle)\s*\(\s*"([^"]+)"/g, pathGroup: 1, methodGroup: null },
  // Go: r.GET("/x", h)
  { pattern: /\b(?:mux|router|r|http|server|httpsrv|chi)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/g, pathGroup: 2, methodGroup: 1 },
  // Rails: get "/x" => ...
  { pattern: /^\s*(get|post|put|patch|delete)\s+["'`]([^"'`]+)["'`]\s*(?:=>|:)/gm, pathGroup: 2, methodGroup: 1 },
];

/** `@app.route("/x")` registers several verbs, so the label is not a method. */
const NON_METHOD_LABEL = new Set(["route", "all"]);

const COMMENT_LINE_RE = /^(?:\/\/+|\*|\/\*|#|--|<!--)/;

/**
 * Route declarations are found with regular expressions, so prose that merely
 * documents them would otherwise be reported as real routes. Whole-line
 * comments are dropped before matching.
 */
function stripCommentLines(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((line) => !COMMENT_LINE_RE.test(line.trimStart()))
    .join("\n");
}

function normalizeDynamicSegments(routePath: string): string {
  return routePath
    .replace(/\[\[\.\.\.(.+?)\]\]/g, ":$1*")
    .replace(/\[\.\.\.(.+?)\]/g, ":$1*")
    .replace(/\[(.+?)\]/g, ":$1");
}

function normalizeRoutePath(routePath: string): string {
  const withoutQuery = routePath.split("?")[0]!.trim();
  const normalized = normalizeDynamicSegments(withoutQuery).replace(/\/+/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized || "/";
}

function filePathToRoute(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");

  if (normalized.includes("/app/")) {
    const tail = normalized.split("/app/")[1] ?? "";
    const cleaned = tail
      .replace(/(^|\/)(page|route)\.(tsx|ts|jsx|js|mdx)$/, "$1")
      .replaceAll("/index", "")
      .replace(/(^|\/)\([^/]+\)/g, "")
      .replace(/\/@[^/]+/g, "");
    return normalizeRoutePath(`/${cleaned}`);
  }

  if (normalized.includes("/pages/")) {
    const tail = normalized.split("/pages/")[1] ?? "";
    const cleaned = tail
      .replace(/\.(tsx|ts|jsx|js|mdx)$/, "")
      .replace(/(^|\/)index$/, "")
      .replace(/\/@[^/]+/g, "");
    return normalizeRoutePath(`/${cleaned}`);
  }

  return normalized;
}

/**
 * Next.js only treats `app/`, `pages/`, `src/app/`, and `src/pages/` as routing
 * roots, plus one level of workspace applications. Globbing `**\/pages/**`
 * instead swept up embedded component demos, which reported hundreds of
 * fictional routes in a repository whose real route table was far smaller.
 *
 * The two conventions are matched differently on purpose: the app router only
 * creates a route for `page.*` and `route.*` files, so `layout.*` and colocated
 * components are not routes, whereas the pages router treats every file in
 * `pages/` as one.
 */
const APP_ROOTS = ["app", "src/app", "apps/*/app", "packages/*/app"];
const PAGES_ROOTS = ["pages", "src/pages", "apps/*/pages", "packages/*/pages"];

const NON_ROUTE_FILES = ["**/pages/api/**", "**/pages/_app.*", "**/pages/_document.*", "**/pages/_error.*"];

async function collectConventionRoutes(repoRoot: string, rules: Awaited<ReturnType<typeof loadIgnoreRules>>): Promise<string[]> {
  const appRoutes = await fg(
    APP_ROOTS.map((root) => `${root}/**/{page,route}.{ts,tsx,js,jsx,mdx}`),
    { cwd: repoRoot, onlyFiles: true, ignore: FAST_GLOB_PRUNE_PATTERNS }
  );

  const pageRoutes = await fg(
    PAGES_ROOTS.map((root) => `${root}/**/*.{ts,tsx,js,jsx,mdx}`),
    {
      cwd: repoRoot,
      onlyFiles: true,
      ignore: [...FAST_GLOB_PRUNE_PATTERNS, ...NON_ROUTE_FILES],
    }
  );

  return applyIgnoreRules(rules, [...appRoutes, ...pageRoutes]).map(filePathToRoute);
}

async function readSourceFiles(repoRoot: string, rules: Awaited<ReturnType<typeof loadIgnoreRules>>): Promise<Map<string, string>> {
  const candidates = await fg(["**/*"], {
    cwd: repoRoot,
    dot: true,
    onlyFiles: true,
    ignore: FAST_GLOB_PRUNE_PATTERNS,
  });

  const contents = new Map<string, string>();

  // Route registration does not live in component, example, or demo trees.
  // Scanning them reported demo scenarios as real endpoints.
  const sourceFiles = candidates.filter(
    (file) =>
      isSourcePath(file) && !isTestPath(file) && !COMPONENT_DIRECTORY_RE.test(file)
  );

  for (const file of applyIgnoreRules(rules, sourceFiles).slice(0, MAX_SOURCE_FILES)) {
    try {
      contents.set(file, await fs.readFile(path.join(repoRoot, file), "utf8"));
    } catch {
      continue;
    }
  }

  return contents;
}

function collectDeclaredRoutes(contents: Map<string, string>): Map<string, Set<string>> {
  const routes = new Map<string, Set<string>>();

  for (const rawContent of contents.values()) {
    const content = stripCommentLines(rawContent);

    for (const { pattern, pathGroup, methodGroup } of ROUTE_PATTERNS) {
      for (const match of content.matchAll(pattern)) {
        const rawPath = match[pathGroup];
        if (!rawPath?.startsWith("/")) {
          continue;
        }

        const route = normalizeRoutePath(rawPath);
        const methods = routes.get(route) ?? new Set<string>();

        if (methodGroup !== null) {
          const verb = match[methodGroup];
          if (verb && !NON_METHOD_LABEL.has(verb.toLowerCase())) {
            methods.add(verb.toUpperCase());
          }
        }

        routes.set(route, methods);
      }
    }
  }

  return routes;
}

function formatRoute(route: string, methods: Set<string>): string {
  return methods.size === 0 ? route : `${route} [${[...methods].sort().join(", ")}]`;
}

/**
 * Collects routes from filesystem conventions (Next.js app and pages routers)
 * and from in-code declarations for FastAPI, Express, Fastify, Flask, Go
 * net/http, Spring, and Rails.
 */
export async function extractRoutes(repoRoot: string): Promise<string[]> {
  const rules = await loadIgnoreRules(repoRoot);
  const [conventionRoutes, contents] = await Promise.all([
    collectConventionRoutes(repoRoot, rules),
    readSourceFiles(repoRoot, rules),
  ]);

  const routes = collectDeclaredRoutes(contents);

  for (const route of conventionRoutes) {
    if (!routes.has(route)) {
      routes.set(route, new Set());
    }
  }

  return uniqueSorted([...routes.entries()].map(([route, methods]) => formatRoute(route, methods)));
}
