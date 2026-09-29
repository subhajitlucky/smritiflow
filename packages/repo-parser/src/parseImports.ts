import path from "node:path";
import { languageOf } from "./languages.ts";

export interface ImportEdge {
  from: string;
  to: string;
  kind: "internal" | "external" | "unresolved";
  specifier: string;
}

const JS_FROM_RE = /\bfrom\s+["']([^"']+)["']/g;
const JS_BARE_IMPORT_RE = /\bimport\s+["']([^"']+)["']/g;
const JS_DYNAMIC_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const JS_REQUIRE_RE = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

const JS_RESOLVERS = [JS_FROM_RE, JS_BARE_IMPORT_RE, JS_DYNAMIC_RE];
const JS_RESOLVERS_WITH_REQUIRE = [JS_FROM_RE, JS_BARE_IMPORT_RE, JS_DYNAMIC_RE, JS_REQUIRE_RE];

const PYTHON_FROM_RE = /^[ \t]*from\s+([A-Za-z0-9_.]*)[ \t]+import[ \t]+([^\n]+)/gm;
const PYTHON_IMPORT_RE = /^[ \t]*import[ \t]+([^\n]+)/gm;

const GO_BLOCK_RE = /import\s*\(([\s\S]*?)\)/g;
const GO_SINGLE_RE = /^\s*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm;
const GO_STRING_RE = /"([^"]+)"/g;

const RUST_RE = [/^\s*(?:pub\s+)?use\s+([A-Za-z0-9_:{}, *]+);/gm];
const JAVA_RE = [/^\s*import\s+(?:static\s+)?([A-Za-z0-9_.]+);/gm];
const RUBY_RE = [/\brequire(?:_relative)?\s+["']([^"']+)["']/g];
const PHP_RE = [/^\s*use\s+([A-Za-z0-9_\\]+)\s*;/gm];

const RESOLVERS: Record<string, RegExp[]> = {
  typescript: [...JS_RESOLVERS],
  javascript: [...JS_RESOLVERS_WITH_REQUIRE],
  vue: [JS_FROM_RE, JS_DYNAMIC_RE],
  svelte: [JS_FROM_RE, JS_DYNAMIC_RE],
  astro: [...JS_RESOLVERS],
  python: [],
  go: [],
  rust: [...RUST_RE],
  java: [...JAVA_RE],
  csharp: [...JAVA_RE],
  kotlin: [...JAVA_RE],
  scala: [...JAVA_RE],
  ruby: [...RUBY_RE],
  php: [...PHP_RE],
};

const RESOLVABLE_SPECIFIER = /^[A-Za-z0-9_@./:\\-]+$/;
const RESOLUTION_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".astro",
  ".py",
  ".go",
  ".rs",
  ".rb",
];

function extractGoSpecifiers(content: string): string[] {
  const specifiers: string[] = [];

  for (const match of content.matchAll(GO_SINGLE_RE)) {
    specifiers.push(match[1]);
  }

  for (const block of content.matchAll(GO_BLOCK_RE)) {
    for (const literal of (block[1] ?? "").matchAll(GO_STRING_RE)) {
      specifiers.push(literal[1]);
    }
  }

  return specifiers;
}

/**
 * Python's `from . import sibling` names the module in the import list rather
 * than in the module path, so both halves are emitted: the module path and, for
 * relative imports, each imported name as a sibling specifier.
 */
function extractPythonSpecifiers(content: string): string[] {
  const specifiers: string[] = [];

  for (const match of content.matchAll(PYTHON_FROM_RE)) {
    const modulePath = match[1] ?? "";
    const imported = (match[2] ?? "").replace(/[()]/g, "").split(",");

    if (modulePath.length > 0) {
      specifiers.push(modulePath);
    }

    // Only `from . import name` puts the module in the import list. In
    // `from fastapi import FastAPI` the name is a symbol, not a dependency.
    if (!/^\.*$/.test(modulePath)) {
      continue;
    }

    for (const entry of imported) {
      const name = (entry.split(/\s+as\s+/)[0] ?? "").trim();
      if (/^[A-Za-z0-9_]+$/.test(name)) {
        specifiers.push(name);
      }
    }
  }

  for (const match of content.matchAll(PYTHON_IMPORT_RE)) {
    for (const entry of (match[1] ?? "").split(",")) {
      const modulePath = (entry.split(/\s+as\s+/)[0] ?? "").trim();
      if (/^[A-Za-z0-9_.]+$/.test(modulePath)) {
        specifiers.push(modulePath);
      }
    }
  }

  return specifiers;
}

function extractSpecifiers(content: string, language: string | null): string[] {
  if (language === "go") {
    return extractGoSpecifiers(content);
  }

  if (language === "python") {
    return extractPythonSpecifiers(content);
  }

  const resolvers = (language === null ? undefined : RESOLVERS[language]) ?? JS_RESOLVERS;
  const specifiers: string[] = [];

  for (const regex of resolvers) {
    for (const match of content.matchAll(regex)) {
      for (const part of (match[1] ?? "").split(",")) {
        const trimmed = part.trim();
        if (RESOLVABLE_SPECIFIER.test(trimmed)) {
          specifiers.push(trimmed);
        }
      }
    }
  }

  return specifiers;
}

function resolveRelative(specifier: string, fromFile: string, known: Set<string>): string | null {
  const fromDir = path.posix.dirname(fromFile.replaceAll("\\", "/"));
  const target = path.posix.normalize(path.posix.join(fromDir, specifier));

  const candidates = [
    target,
    ...RESOLUTION_EXTENSIONS.map((ext) => `${target}${ext}`),
    ...RESOLUTION_EXTENSIONS.map((ext) => `${target}/index${ext}`),
  ];

  return candidates.find((candidate) => known.has(candidate)) ?? null;
}

function resolvePython(specifier: string, fromFile: string, known: Set<string>): string | null {
  const fromDir = path.posix.dirname(fromFile.replaceAll("\\", "/"));
  const modulePath = specifier.replaceAll(".", "/");

  for (const target of [
    path.posix.normalize(path.posix.join(fromDir, modulePath)),
    path.posix.normalize(path.posix.join(fromDir, "..", modulePath)),
  ]) {
    const match = [`${target}.py`, `${target}/__init__.py`].find((c) => known.has(c));
    if (match) {
      return match;
    }
  }

  return null;
}

/**
 * Builds a real dependency graph where every edge points at a resolved file.
 * The previous implementation only counted import statements per file, so its
 * "hotspots" ranked the most import-verbose files instead of the most
 * depended-upon ones, and edges were never deduplicated.
 */
export interface ParseImportOptions {
  /** Go module path from `go.mod`, used to resolve intra-module imports. */
  goModule?: string;
}

function resolveGoImport(specifier: string, goModule: string | undefined, known: Set<string>): string | null {
  const candidates = [specifier];

  // Go imports use the full module path even for packages inside the module.
  if (goModule && specifier.startsWith(`${goModule}/`)) {
    candidates.push(specifier.slice(goModule.length + 1));
  }

  for (const candidate of candidates) {
    const packageName = candidate.split("/").pop() ?? "";

    for (const attempt of [
      candidate,
      `${candidate}.go`,
      `${candidate}/${packageName}.go`,
    ]) {
      if (known.has(attempt)) {
        return attempt;
      }
    }
  }

  return null;
}

export function parseImports(
  fileContents: Map<string, string>,
  options: ParseImportOptions = {}
): ImportEdge[] {
  const known = new Set(fileContents.keys());
  const edges: ImportEdge[] = [];
  const seen = new Set<string>();

  for (const [file, content] of fileContents) {
    const language = languageOf(file);

    for (const specifier of extractSpecifiers(content, language)) {
      const relative = specifier.startsWith(".") || specifier.startsWith("/");
      let resolved: string | null = null;

      if (language === "python") {
        // Python's dotted relatives (`.helpers`) collide with the JS rule that
        // treats a leading dot as a relative path, so it is resolved first.
        resolved = resolvePython(specifier, file, known);
      } else if (relative) {
        resolved = resolveRelative(specifier, file, known);
      } else if (language === "go") {
        resolved = resolveGoImport(specifier, options.goModule, known);
      }

      // Edges are deduplicated on the resolved target, not on the raw
      // specifier, because `from . import x` and `from .x import y` describe
      // the same dependency.
      const identity = resolved ?? `raw:${specifier}`;
      const key = `${file}\u0000${identity}`;

      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      if (resolved) {
        edges.push({ from: file, to: resolved, kind: "internal", specifier });
      } else if (relative) {
        edges.push({ from: file, to: specifier, kind: "unresolved", specifier });
      } else {
        edges.push({ from: file, to: specifier, kind: "external", specifier });
      }
    }
  }

  return edges;
}
