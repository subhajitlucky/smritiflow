import type { FolderInfo } from "../../shared/src/types.ts";

const FOLDER_RULES: Array<{ path: string; purpose: string }> = [
  { path: "src", purpose: "primary source tree" },
  { path: "src/app", purpose: "app routes or application entry" },
  { path: "src/pages", purpose: "pages router entry" },
  { path: "src/components", purpose: "shared ui components" },
  { path: "src/lib", purpose: "utilities and services" },
  { path: "src/server", purpose: "backend server code" },
  { path: "src/routes", purpose: "route definitions" },
  { path: "app", purpose: "application entry or package" },
  { path: "pages", purpose: "pages router entry" },
  { path: "lib", purpose: "library code" },
  { path: "packages", purpose: "shared internal packages" },
  { path: "apps", purpose: "workspace applications" },
  { path: "services", purpose: "service units" },
  { path: "internal", purpose: "internal packages" },
  { path: "pkg", purpose: "package implementations" },
  { path: "cmd", purpose: "command entrypoints" },
  { path: "crates", purpose: "rust workspace crates" },
  { path: "api", purpose: "api layer" },
  { path: "server", purpose: "server implementation" },
  { path: "client", purpose: "client implementation" },
  { path: "web", purpose: "web frontend" },
  { path: "prisma", purpose: "database schema and migrations" },
  { path: "migrations", purpose: "database migrations" },
  { path: "db", purpose: "database layer" },
  { path: "supabase", purpose: "supabase functions and migrations" },
  { path: "infra", purpose: "infrastructure definitions" },
  { path: "terraform", purpose: "infrastructure as code" },
  { path: "scripts", purpose: "automation scripts" },
  { path: "bin", purpose: "executable entrypoints" },
  { path: "tests", purpose: "test suites" },
  { path: "test", purpose: "test suites" },
  { path: "spec", purpose: "test suites" },
  { path: "e2e", purpose: "end-to-end tests" },
  { path: "docs", purpose: "documentation and memory artifacts" },
  { path: ".github", purpose: "workflows and automation" },
];

/**
 * Reports directories that carry a known purpose, derived solely from the
 * scanned file list.
 *
 * Falling back to an existence probe made the result depend on SmritiFlow's own
 * output: the first scan of a repository without a `docs/` directory writes
 * `docs/ai/`, so a second scan reported a `docs` folder the first had not seen.
 * Deriving from scanned files keeps consecutive scans identical.
 */
export function detectFolders(files: string[]): FolderInfo[] {
  const known = new Set<string>();

  for (const file of files) {
    const segments = file.replaceAll("\\", "/").split("/");
    for (let index = 1; index < segments.length; index += 1) {
      known.add(segments.slice(0, index).join("/"));
    }
  }

  return FOLDER_RULES.filter((rule) => known.has(rule.path));
}
