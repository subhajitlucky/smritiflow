import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { detectPackageManager } from "../packages/repo-parser/src/detectPackageManager.ts";
import { detectLanguages } from "../packages/repo-parser/src/detectLanguages.ts";
import { detectEntryPoints } from "../packages/repo-parser/src/detectEntryPoints.ts";
import { readWorkspacePackages } from "../packages/repo-parser/src/readWorkspacePackages.ts";
import { summarizeReadme } from "../packages/core/src/scanMetadata.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await createTempDir("smritiflow-pm-");
  try {
    await fn(dir);
  } finally {
    await fs.remove(dir);
  }
}

describe("detectPackageManager", () => {
  it("prefers the explicit packageManager field", async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
      const info = await detectPackageManager(dir, { packageManager: "yarn@4.1.0" });

      expect(info.name).toBe("yarn");
      expect(info.install).toBe("yarn install");
      expect(info.run).toBe("yarn");
    });
  });

  it("falls back to lockfile detection", async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, "bun.lockb"), "");
      const info = await detectPackageManager(dir, {});

      expect(info.name).toBe("bun");
      expect(info.run).toBe("bun run");
      expect(info.exec).toBe("bunx");
    });
  });

  it("detects npm from package-lock", async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, "package-lock.json"), "{}");
      const info = await detectPackageManager(dir, {});

      expect(info.name).toBe("npm");
      expect(info.install).toBe("npm install");
      expect(info.run).toBe("npm run");
      expect(info.exec).toBe("npx");
    });
  });

  it("defaults to npm when nothing is declared", async () => {
    await withTempDir(async (dir) => {
      const info = await detectPackageManager(dir, {});
      expect(info.name).toBe("npm");
    });
  });

  it("reports no lockfile when the field wins", async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
      const info = await detectPackageManager(dir, { packageManager: "pnpm@10.0.0" });
      expect(info.lockfile).toBeNull();
    });
  });
});

describe("detectLanguages", () => {
  it("counts files per language, most used first", () => {
    const languages = detectLanguages([
      "a.ts",
      "b.ts",
      "c.py",
      "d.py",
      "e.py",
      "f.go",
      "README.md",
    ]);

    expect(languages[0]).toEqual({ language: "python", files: 3 });
    expect(languages[1]).toEqual({ language: "typescript", files: 2 });
    expect(languages).toHaveLength(3);
  });
});

describe("detectEntryPoints", () => {
  it("finds conventional entry files", () => {
    const entries = detectEntryPoints([
      "src/index.ts",
      "src/app.tsx",
      "cmd/server/main.go",
      "src/lib/thing.ts",
      "package.json",
    ]);

    expect(entries).toContain("src/index.ts");
    expect(entries).toContain("src/app.tsx");
    expect(entries).toContain("cmd/server/main.go");
    expect(entries).not.toContain("src/lib/thing.ts");
  });
});

describe("readWorkspacePackages", () => {
  it("excludes test fixtures from workspace packages", async () => {
    const dir = await createTempDir("smritiflow-ws-fixtures-");

    try {
      await fs.outputFile(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "root", workspaces: ["packages/*", "apps/*"] })
      );
      await fs.outputFile(
        path.join(dir, "packages", "core", "package.json"),
        JSON.stringify({ name: "@acme/core", dependencies: { zod: "3" } })
      );
      await fs.outputFile(
        path.join(dir, "test", "fixtures", "node-fail", "package.json"),
        JSON.stringify({ name: "node-fail-fixture" })
      );
      await fs.outputFile(
        path.join(dir, "test", "fixtures", "node-pass", "package.json"),
        JSON.stringify({ name: "node-pass-fixture" })
      );

      const packages = await readWorkspacePackages(dir, [
        "package.json",
        "packages/core/package.json",
        "test/fixtures/node-fail/package.json",
        "test/fixtures/node-pass/package.json",
      ], { name: "root", workspaces: ["packages/*", "apps/*"] });

      expect(packages.map((entry) => entry.name)).toEqual(["@acme/core"]);
    } finally {
      await fs.remove(dir);
    }
  });
});

describe("summarizeReadme", () => {
  it("skips a leading blockquote in favour of prose", () => {
    const summary = summarizeReadme(
      ["# Kalia", "", "> invocation text", "> more invocation", "", "A toolkit for evaluating language models."].join("\n")
    );

    expect(summary).toBe("A toolkit for evaluating language models.");
  });

  it("skips badge markup", () => {
    const summary = summarizeReadme(
      ["# P", "", "[![npm](https://img.shields.io/npm/v/p.svg)](https://npmjs.com/package/p)", "", "A real description."].join("\n")
    );

    expect(summary).toBe("A real description.");
  });

  it("returns an empty string when there is no prose", () => {
    expect(summarizeReadme("# Title\n\n")).toBe("");
  });
});
