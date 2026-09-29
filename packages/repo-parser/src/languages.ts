const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  py: "python",
  pyi: "python",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  cs: "csharp",
  scala: "scala",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  tf: "terraform",
  css: "css",
  scss: "css",
  less: "css",
};

const DOCUMENTATION_EXTENSIONS = new Set(["md", "mdx", "rst", "txt", "adoc"]);

/**
 * Extensions that carry program logic. Change detection and TODO extraction
 * both key off this set, so it stays deliberately broad across languages.
 */
const SOURCE_EXTENSIONS = new Set(Object.keys(LANGUAGE_BY_EXTENSION));

const MANIFEST_FILENAMES = new Set([
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "deno.json",
  "deno.jsonc",
  "pyproject.toml",
  "requirements.txt",
  "requirements-dev.txt",
  "setup.py",
  "setup.cfg",
  "pipfile",
  "poetry.lock",
  "uv.lock",
  "go.mod",
  "go.sum",
  "cargo.toml",
  "cargo.lock",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "gemfile",
  "gemfile.lock",
  "composer.json",
  "composer.lock",
  "mix.exs",
  "pubspec.yaml",
  "package.swift",
  "makefile",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "containerfile",
]);

const CONFIG_FILENAME_RE =
  /^(tsconfig(\..+)?\.json|jsconfig\.json|.*\.(config|conf)\.(js|cjs|mjs|ts|mts|cts|json|jsonc|ya?ml|toml)|.*\.tf(vars)?|.*\.ya?ml|.*\.toml|.*\.ini|.*\.cfg|\.env(\..+)?|makefile|docker-compose.*|\.eslintrc.*|\.prettierrc.*|\.editorconfig|\.gitattributes|\.gitignore|\.dockerignore|\.npmrc|\.nvmrc|\.node-version|\.ruby-version|\.python-version|procfile|renovate\.json.*|netlify\.toml|vercel\.json|turbo\.json|nx\.json|biome\.json|go\.mod|go\.sum|cargo\.toml|gemfile|brewfile)$/i;

const README_RE = /^readme(\.[a-z0-9]+)?$/i;

const TEST_DIRECTORY_SEGMENTS = new Set([
  "test",
  "tests",
  "spec",
  "specs",
  "e2e",
  "__tests__",
  "__mocks__",
  "fixture",
  "fixtures",
  "testdata",
  "test_data",
]);

function normalize(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

/**
 * Test paths are excluded from route and marker detection. Test fixtures
 * contain route-like strings (`app.get("/health")`) and marker-like comments
 * that would otherwise be reported as real routes and real work items.
 */
export function isTestPath(filePath: string): boolean {
  const normalized = normalize(filePath).toLowerCase();
  const segments = normalized.split("/");
  const directories = segments.slice(0, -1);
  const name = segments[segments.length - 1] ?? "";

  if (directories.some((segment) => TEST_DIRECTORY_SEGMENTS.has(segment))) {
    return true;
  }

  if (/\.(test|spec)\.[a-z0-9]+$/.test(name)) {
    return true;
  }

  return /(^test_.*\.py$|.*_test\.(go|py|js|ts)$)/.test(name);
}

export function fileExtension(filePath: string): string {
  const name = normalize(filePath).split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) {
    return "";
  }
  return name.slice(dot + 1).toLowerCase();
}

export function baseName(filePath: string): string {
  return normalize(filePath).split("/").pop() ?? "";
}

export function languageOf(filePath: string): string | null {
  return LANGUAGE_BY_EXTENSION[fileExtension(filePath)] ?? null;
}

export function isSourcePath(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(fileExtension(filePath));
}

export function isDocumentationPath(filePath: string): boolean {
  return DOCUMENTATION_EXTENSIONS.has(fileExtension(filePath));
}

export function isManifestPath(filePath: string): boolean {
  return MANIFEST_FILENAMES.has(baseName(filePath).toLowerCase());
}

export function isConfigPath(filePath: string): boolean {
  if (isManifestPath(filePath)) {
    return false;
  }
  return CONFIG_FILENAME_RE.test(baseName(filePath));
}

export function isReadmePath(filePath: string): boolean {
  return README_RE.test(baseName(filePath));
}

/**
 * Files worth content-hashing. Binary and media assets are excluded so a
 * refresh never pays to read images, archives, or build output.
 */
export function isHashablePath(filePath: string): boolean {
  if (isSourcePath(filePath) || isManifestPath(filePath) || isConfigPath(filePath)) {
    return true;
  }
  if (isDocumentationPath(filePath) || isReadmePath(filePath)) {
    return true;
  }
  return [".env", ".sql", ".prisma", ".graphql"].some((ext) =>
    normalize(filePath).toLowerCase().endsWith(ext)
  );
}
