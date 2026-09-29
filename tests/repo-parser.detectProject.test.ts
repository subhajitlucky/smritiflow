import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { detectPackageManager } from "../packages/repo-parser/src/detectPackageManager.ts";
import { detectLanguages } from "../packages/repo-parser/src/detectLanguages.ts";
import { detectEntryPoints } from "../packages/repo-parser/src/detectEntryPoints.ts";
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
