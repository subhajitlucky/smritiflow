import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { readProjectIdentity } from "../packages/repo-parser/src/readProjectIdentity.ts";
import { detectToolchain } from "../packages/repo-parser/src/detectToolchain.ts";
import { isTestPath } from "../packages/repo-parser/src/languages.ts";
import { createTempDir } from "./helpers/tempRepo.ts";

async function withFiles(files: Record<string, string>, fn: (dir: string, list: string[]) => Promise<void>): Promise<void> {
  const dir = await createTempDir("smritiflow-identity-");

  try {
    for (const [name, content] of Object.entries(files)) {
      await fs.outputFile(path.join(dir, name), content);
    }
    await fn(dir, Object.keys(files));
  } finally {
    await fs.remove(dir);
  }
}

describe("readProjectIdentity", () => {
  it("reads a python project from pyproject.toml", async () => {
    await withFiles(
      {
        "pyproject.toml": [
          "[project]",
          'name = "orders-api"',
          'description = "Internal orders service."',
          'dependencies = ["fastapi", "sqlalchemy>=2.0", "uvicorn"]',
          "",
          "[project.optional-dependencies]",
          'dev = ["pytest", "ruff"]',
        ].join("\n"),
      },
      async (dir, files) => {
        const identity = await readProjectIdentity(dir, files);

        expect(identity.name).toBe("orders-api");
        expect(identity.description).toBe("Internal orders service.");
        expect(identity.dependencies).toEqual(["fastapi", "sqlalchemy", "uvicorn"]);
        expect(identity.devDependencies).toEqual(["pytest", "ruff"]);
      }
    );
  });

  it("reads a rust project from Cargo.toml", async () => {
    await withFiles(
      { "Cargo.toml": '[package]\nname = "engine"\ndescription = "Core engine."\n\n[dependencies]\naxum = "0.7"\n' },
      async (dir, files) => {
        const identity = await readProjectIdentity(dir, files);
        expect(identity.name).toBe("engine");
        expect(identity.dependencies).toContain("axum");
      }
    );
  });

  it("reads a go project name from go.mod", async () => {
    await withFiles({ "go.mod": "module github.com/acme/orders\n\ngo 1.22\n" }, async (dir, files) => {
      const identity = await readProjectIdentity(dir, files);
      expect(identity.name).toBe("orders");
    });
  });

  it("reads dependencies from requirements.txt", async () => {
    await withFiles(
      {
        "requirements.txt": ["# comment", "torch>=2.4", "numpy>=1.26", "-r other.txt", "huggingface_hub>=0.23"].join("\n"),
      },
      async (dir, files) => {
        const identity = await readProjectIdentity(dir, files);

        expect(identity.dependencies).toEqual(["torch", "numpy", "huggingface_hub"]);
        expect(identity.name).toBeNull();
      }
    );
  });

  it("prefers package.json when present", async () => {
    await withFiles(
      {
        "package.json": JSON.stringify({ name: "web-app", description: "Web.", dependencies: { react: "18" } }),
        "pyproject.toml": '[project]\nname = "ignored"\n',
      },
      async (dir, files) => {
        const identity = await readProjectIdentity(dir, files);
        expect(identity.name).toBe("web-app");
      }
    );
  });

  it("returns empty identity for a repository with no manifest", async () => {
    await withFiles({ "main.go": "package main\n" }, async (dir, files) => {
      expect(await readProjectIdentity(dir, files)).toEqual({
        name: null,
        description: "",
        dependencies: [],
        devDependencies: [],
      });
    });
  });
});

describe("detectToolchain", () => {
  it("reports python commands instead of npm for a python repo", async () => {
    await withFiles({ "pyproject.toml": '[project]\nname = "svc"\n' }, async (dir, files) => {
      const toolchain = await detectToolchain(dir, files, {});

      expect(toolchain.ecosystem).toBe("python");
      expect(toolchain.install).toBe("pip install -r requirements.txt");
      expect(toolchain.install).not.toContain("npm");
    });
  });

  it("prefers uv when uv.lock is present", async () => {
    await withFiles({ "pyproject.toml": '[project]\nname = "svc"\n', "uv.lock": "" }, async (dir, files) => {
      const toolchain = await detectToolchain(dir, files, {});
      expect(toolchain.manager).toBe("uv");
      expect(toolchain.install).toBe("uv sync");
    });
  });

  it("detects go and rust", async () => {
    await withFiles({ "go.mod": "module x\n" }, async (dir, files) => {
      expect((await detectToolchain(dir, files, {})).ecosystem).toBe("go");
    });
    await withFiles({ "Cargo.toml": "[package]\nname=\"x\"\n" }, async (dir, files) => {
      expect((await detectToolchain(dir, files, {})).ecosystem).toBe("rust");
    });
  });

  it("reports node when a node manifest exists", async () => {
    await withFiles(
      { "package.json": JSON.stringify({ scripts: { test: "vitest" } }), "pnpm-lock.yaml": "" },
      async (dir, files) => {
        const toolchain = await detectToolchain(dir, files, { scripts: { test: "vitest" } });

        expect(toolchain.ecosystem).toBe("node");
        expect(toolchain.manager).toBe("pnpm");
        expect(toolchain.install).toBe("pnpm install");
        expect(toolchain.test).toBe("pnpm test");
        expect(toolchain.run).toBeNull();
      }
    );
  });

  it("does not invent a uvicorn run command for a non-service python repo", async () => {
    await withFiles(
      {
        "requirements.txt": "torch>=2.4\n",
        "train.py": "import torch\n",
        "eval/eval_bench.py": "def run(): pass\n",
      },
      async (dir, files) => {
        const toolchain = await detectToolchain(dir, files, {});

        expect(toolchain.ecosystem).toBe("python");
        expect(toolchain.install).toBe("pip install -r requirements.txt");
        expect(toolchain.run).toBeNull();
      }
    );
  });

  it("offers a uvicorn run command when a FastAPI service entry exists", async () => {
    await withFiles(
      {
        "requirements.txt": "fastapi\n",
        "app/main.py": "from fastapi import FastAPI\napp = FastAPI()\n",
      },
      async (dir, files) => {
        const toolchain = await detectToolchain(dir, files, {});
        expect(toolchain.run).toBe("uvicorn app.main:app --reload");
      }
    );
  });

  it("offers no run command for a gradle library", async () => {
    await withFiles({ "build.gradle": "plugins { id 'java-library' }\n" }, async (dir, files) => {
      const toolchain = await detectToolchain(dir, files, {});

      expect(toolchain.ecosystem).toBe("java");
      expect(toolchain.run).toBeNull();
      expect(toolchain.build).toBe("gradle build");
    });
  });

  it("reports an unknown toolchain when nothing is declared", async () => {
    await withFiles({ "README.md": "# hi\n" }, async (dir, files) => {
      const toolchain = await detectToolchain(dir, files, {});
      expect(toolchain.ecosystem).toBe("unknown");
      expect(toolchain.install).toBe("");
    });
  });
});

describe("isTestPath", () => {
  it("recognizes test files and directories", () => {
    expect(isTestPath("tests/api.test.ts")).toBe(true);
    expect(isTestPath("src/foo.spec.ts")).toBe(true);
    expect(isTestPath("__tests__/foo.js")).toBe(true);
    expect(isTestPath("e2e/checkout.ts")).toBe(true);
    expect(isTestPath("app/main_test.go")).toBe(true);
    expect(isTestPath("tests/test_main.py")).toBe(true);
    expect(isTestPath("src/index.ts")).toBe(false);
    expect(isTestPath("apps/web/tests/legacy-helper.ts")).toBe(true);
  });
});
