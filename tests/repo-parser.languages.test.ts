import { describe, expect, it } from "vitest";
import {
  fileExtension,
  isConfigPath,
  isHashablePath,
  isManifestPath,
  isReadmePath,
  isSourcePath,
  languageOf,
} from "../packages/repo-parser/src/languages.ts";

describe("languages", () => {
  it("classifies source files across languages", () => {
    expect(isSourcePath("src/index.ts")).toBe(true);
    expect(isSourcePath("app/main.py")).toBe(true);
    expect(isSourcePath("cmd/server/main.go")).toBe(true);
    expect(isSourcePath("src/lib.rs")).toBe(true);
    expect(isSourcePath("app/models/user.rb")).toBe(true);
    expect(isSourcePath("README.md")).toBe(false);
    expect(isSourcePath("assets/logo.png")).toBe(false);
  });

  it("resolves the language for a path", () => {
    expect(languageOf("a/b/c.py")).toBe("python");
    expect(languageOf("a/b/c.go")).toBe("go");
    expect(languageOf("a/b/c.tsx")).toBe("typescript");
    expect(languageOf("a/b/c.unknown")).toBeNull();
  });

  it("recognizes manifests beyond package.json", () => {
    expect(isManifestPath("package.json")).toBe(true);
    expect(isManifestPath("apps/web/package.json")).toBe(true);
    expect(isManifestPath("pyproject.toml")).toBe(true);
    expect(isManifestPath("go.mod")).toBe(true);
    expect(isManifestPath("Cargo.toml")).toBe(true);
    expect(isManifestPath("Dockerfile")).toBe(true);
    expect(isManifestPath("src/index.ts")).toBe(false);
  });

  it("recognizes configuration files without a hardcoded list", () => {
    expect(isConfigPath("tsconfig.json")).toBe(true);
    expect(isConfigPath("apps/web/tsconfig.build.json")).toBe(true);
    expect(isConfigPath("vite.config.ts")).toBe(true);
    expect(isConfigPath("pytest.ini")).toBe(true);
    expect(isConfigPath("infra/main.tf")).toBe(true);
    expect(isConfigPath("apps/web/.env.local")).toBe(true);
    expect(isConfigPath("ruff.toml")).toBe(true);
    expect(isConfigPath("src/index.ts")).toBe(false);
  });

  it("recognizes readme variants", () => {
    expect(isReadmePath("README.md")).toBe(true);
    expect(isReadmePath("readme.rst")).toBe(true);
    expect(isReadmePath("docs/README.md")).toBe(true);
    expect(isReadmePath("CONTRIBUTING.md")).toBe(false);
  });

  it("excludes binary assets from hashing", () => {
    expect(isHashablePath("src/index.ts")).toBe(true);
    expect(isHashablePath("assets/logo.png")).toBe(false);
    expect(isHashablePath("fonts/inter.woff2")).toBe(false);
    expect(isHashablePath("bin/tool.exe")).toBe(false);
  });

  it("returns a normalized extension", () => {
    expect(fileExtension("a/b/File.TS")).toBe("ts");
    expect(fileExtension("Makefile")).toBe("");
    // Dotfiles have no extension; `.env` is matched by name instead.
    expect(fileExtension("a/.env")).toBe("");
  });
});
