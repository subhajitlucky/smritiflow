import { describe, expect, it } from "vitest";
import { generateAgents, describeProject } from "../packages/generators/src/generateAgents.ts";
import { generateRunbook } from "../packages/generators/src/generateRunbook.ts";
import type { ProjectMap } from "../packages/shared/src/types.ts";
import {
  toolchainCommands,
  type ProjectContext,
} from "../packages/generators/src/generateAgents.ts";

const BASE_MAP: ProjectMap = {
  schemaVersion: 2,
  name: "acme-api",
  description: "Billing API for Acme customers.",
  root: "/repo",
  packageManager: "npm",
  toolchain: {
    ecosystem: "node",
    manager: "npm",
    install: "npm install",
    run: "npm run <script>",
    test: "npm run test",
    build: "npm run build",
  },
  detectedStack: { frontend: [], backend: ["express"], database: ["postgres"], testing: ["vitest"] },
  languages: [{ language: "typescript", files: 42 }],
  scripts: { dev: "tsx watch src", test: "vitest run" },
  folders: [],
  configs: [],
  dependencies: [],
  routes: [],
  entryPoints: ["src/index.ts"],
  workspacePackages: [],
  moduleGraph: {
    nodes: 10,
    edges: 12,
    hotspots: ["src/services/billing.ts (4)"],
    externalDependencies: ["express (10)"],
    cycles: [["src/a.ts", "src/b.ts"]],
    orphans: ["src/legacy.ts"],
  },
};

const CONTEXT: ProjectContext = {
  packageManager: "npm",
  installCommand: "npm install",
  runCommand: "npm run",
  execCommand: "npx",
  docsDir: "docs/ai",
  toolchain: BASE_MAP.toolchain,
  summary: "",
};

const PYTHON_TOOLCHAIN = {
  ecosystem: "python",
  manager: "uv",
  install: "uv sync",
  run: "uvicorn app.main:app --reload",
  test: "pytest",
  build: null,
};

describe("describeProject", () => {
  it("uses the package description when present", () => {
    expect(describeProject(BASE_MAP)).toBe("Billing API for Acme customers.");
  });

  it("falls back to detected stack, then languages", () => {
    const noDescription = { ...BASE_MAP, description: "", detectedStack: { frontend: [], backend: [], database: [], testing: [] } };
    expect(describeProject(noDescription)).toBe("acme-api, written in typescript.");
  });

  it("prefers the readme summary over a guessed description", () => {
    const noDescription = { ...BASE_MAP, description: "", detectedStack: { frontend: [], backend: [], database: [], testing: [] } };
    expect(describeProject(noDescription, "Inventory reconciliation service. Built with Go.")).toBe(
      "Inventory reconciliation service."
    );
  });

  it("keeps an explicit description ahead of the readme", () => {
    expect(describeProject(BASE_MAP, "Something else entirely.")).toBe(
      "Billing API for Acme customers."
    );
  });
});

describe("generateAgents", () => {
  it("describes the actual project instead of SmritiFlow itself", () => {
    const output = generateAgents(BASE_MAP, CONTEXT);

    expect(output).toContain("**Project:** acme-api");
    expect(output).toContain("Billing API for Acme customers.");
    expect(output).not.toContain("SmritiFlow keeps living repo memory");
  });

  it("does not emit SmritiFlow's own dev commands", () => {
    const output = generateAgents(BASE_MAP, CONTEXT);

    expect(output).not.toContain("pnpm dev scan");
    expect(output).not.toContain("pnpm dev refresh");
    expect(output).not.toContain("pnpm dev init");
  });

  it("uses the detected package manager rather than assuming pnpm", () => {
    const yarnMap = { ...BASE_MAP, packageManager: "yarn" };
    const output = generateAgents(yarnMap, {
      ...CONTEXT,
      packageManager: "yarn",
      installCommand: "yarn install",
      runCommand: "yarn",
      execCommand: "yarn dlx",
    });

    expect(output).toContain("yarn install");
    expect(output).toContain("yarn dev");
    expect(output).not.toContain("npm run dev");
    expect(output).not.toContain("pnpm");
  });

  it("lists real scripts, modules, and cycles", () => {
    const output = generateAgents(BASE_MAP, CONTEXT);

    expect(output).toContain("npm run dev");
    expect(output).toContain("npm run test");
    expect(output).toContain("src/services/billing.ts (4)");
    expect(output).toContain("src/a.ts -> src/b.ts");
  });

  it("does not invent scripts that the project does not define", () => {
    const output = generateAgents({ ...BASE_MAP, scripts: { dev: "vite" } }, CONTEXT);

    expect(output).toContain("npm run dev");
    expect(output).not.toContain("npm run test");
    expect(output).not.toContain("npm run build");
  });

  it("handles a project with no scripts", () => {
    const output = generateAgents({ ...BASE_MAP, scripts: {} }, CONTEXT);

    expect(output).toContain("npm install");
    expect(output).toContain("no run, test, or build commands detected");
  });

  it("omits section headings it has no data for", () => {
    const output = generateAgents(
      {
        ...BASE_MAP,
        moduleGraph: { ...BASE_MAP.moduleGraph, hotspots: [], cycles: [] },
        languages: [],
      },
      CONTEXT
    );

    expect(output).not.toContain("## Most Depended-Upon Modules");
    expect(output).not.toContain("## Known Import Cycles");
    expect(output).not.toContain("**Languages:**");
  });
});

describe("generateRunbook", () => {
  it("uses the detected package manager", () => {
    const output = generateRunbook(BASE_MAP, CONTEXT);

    expect(output).toContain("Toolchain: node (npm)");
    expect(output).toContain("npm install");
    expect(output).toContain("npm run dev");
    expect(output).toContain("npm run test");
  });

  it("documents pnpm commands for a pnpm repo", () => {
    const output = generateRunbook(
      { ...BASE_MAP, toolchain: { ...BASE_MAP.toolchain, manager: "pnpm" } },
      {
        ...CONTEXT,
        packageManager: "pnpm",
        installCommand: "pnpm install",
        runCommand: "pnpm",
        toolchain: { ...BASE_MAP.toolchain, manager: "pnpm" },
      }
    );

    expect(output).toContain("Toolchain: node (pnpm)");
    expect(output).toContain("pnpm dev");
    expect(output).not.toContain("npm run dev");
  });

  it("reports when nothing runnable exists instead of inventing commands", () => {
    const output = generateRunbook({ ...BASE_MAP, scripts: {} }, CONTEXT);
    expect(output).toContain("no run, test, or build commands detected");
  });

  it("documents workspace package commands", () => {
    const output = generateRunbook(
      {
        ...BASE_MAP,
        scripts: {},
        workspacePackages: [
          { name: "web", path: "apps/web", private: false, scripts: { dev: "vite" }, dependencies: [] },
        ],
      },
      CONTEXT
    );

    expect(output).toContain("## Workspace Packages");
    expect(output).toContain("npm run --filter web dev");
  });
});

describe("toolchainCommands", () => {
  it("uses node commands for a node project", () => {
    expect(toolchainCommands(CONTEXT, { dev: "vite", test: "vitest", build: "tsc" })).toEqual({
      install: "npm install",
      run: "npm run dev",
      test: "npm run test",
      build: "npm run build",
    });
  });

  it("uses the real toolchain for a non-node project", () => {
    const commands = toolchainCommands({ ...CONTEXT, toolchain: PYTHON_TOOLCHAIN });

    expect(commands.install).toBe("uv sync");
    expect(commands.test).toBe("pytest");
    expect(commands.run).toBe("uvicorn app.main:app --reload");
  });
});

describe("generateAgents for a non-node project", () => {
  it("never instructs a python project to run npm", () => {
    const output = generateAgents(
      { ...BASE_MAP, name: "orders-api", packageManager: "npm", toolchain: PYTHON_TOOLCHAIN, scripts: {} },
      { ...CONTEXT, toolchain: PYTHON_TOOLCHAIN }
    );

    expect(output).toContain("**Toolchain:** python (uv)");
    expect(output).toContain("uv sync");
    expect(output).toContain("pytest");
    expect(output).not.toContain("npm install");
    expect(output).not.toContain("npm run");
  });

  it("reports when no toolchain could be detected", () => {
    const output = generateAgents(
      { ...BASE_MAP, toolchain: { ecosystem: "unknown", manager: "none", install: "", run: null, test: null, build: null }, scripts: {} },
      { ...CONTEXT, toolchain: { ecosystem: "unknown", manager: "none", install: "", run: null, test: null, build: null } }
    );

    expect(output).toContain("no run, test, or build commands detected");
  });
});
