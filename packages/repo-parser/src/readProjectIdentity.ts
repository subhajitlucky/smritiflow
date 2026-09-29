import path from "node:path";
import fs from "fs-extra";
import { baseName } from "./languages.ts";

export interface ProjectIdentity {
  name: string | null;
  description: string;
  dependencies: string[];
  devDependencies: string[];
}

const EMPTY: ProjectIdentity = { name: null, description: "", dependencies: [], devDependencies: [] };

function parsePyproject(content: string): Partial<ProjectIdentity> {
  const identity: Partial<ProjectIdentity> = {};

  const name = /^name\s*=\s*["']([^"']+)["']/m.exec(content);
  if (name?.[1] && !/^project$/m.test(content.split("\n")[0] ?? "")) {
    identity.name = name[1];
  }

  const description = /^description\s*=\s*["']([^"']+)["']/m.exec(content);
  if (description?.[1]) {
    identity.description = description[1];
  }

  const dependencies: string[] = [];
  const devDependencies: string[] = [];
  const inDependencies = /^\s*dependencies\s*=\s*\[([^\]]*)\]/gm;
  const inOptional = /^\s*\[project\.optional-dependencies\][\s\S]*?=\s*\[([^\]]*)\]/gm;

  for (const match of content.matchAll(inDependencies)) {
    for (const entry of match[1]!.matchAll(/["']([^"']+)["']/g)) {
      dependencies.push(entry[1]!.split(/[<>=~![\s;]/)[0]!);
    }
  }
  for (const match of content.matchAll(inOptional)) {
    for (const entry of match[1]!.matchAll(/["']([^"']+)["']/g)) {
      devDependencies.push(entry[1]!.split(/[<>=~![\s;]/)[0]!);
    }
  }

  return { ...identity, dependencies, devDependencies };
}

function parseCargoToml(content: string): Partial<ProjectIdentity> {
  const identity: Partial<ProjectIdentity> = {};

  const name = /^\s*name\s*=\s*["']([^"']+)["']/m.exec(content);
  if (name?.[1]) {
    identity.name = name[1];
  }

  const description = /^\s*description\s*=\s*["']([^"']+)["']/m.exec(content);
  if (description?.[1]) {
    identity.description = description[1];
  }

  const dependencies = [...content.matchAll(/^\s*([A-Za-z0-9_-]+)\s*=\s*[{"]/gm)]
    .map((match) => match[1]!)
    .filter((name) => name !== "package");

  return { ...identity, dependencies };
}

function parseGoMod(content: string): Partial<ProjectIdentity> {
  const module = /^module\s+(\S+)/m.exec(content);
  const name = module?.[1]?.split("/").pop() ?? null;
  return { name };
}

function parseComposerJson(content: string): Partial<ProjectIdentity> {
  try {
    const parsed = JSON.parse(content) as {
      name?: string;
      description?: string;
      require?: Record<string, string>;
      "require-dev"?: Record<string, string>;
    };
    return {
      name: parsed.name ?? null,
      description: parsed.description ?? "",
      dependencies: Object.keys(parsed.require ?? {}),
      devDependencies: Object.keys(parsed["require-dev"] ?? {}),
    };
  } catch {
    return {};
  }
}

/**
 * Reads project name, description, and dependencies from whichever manifest
 * declares them. Previously only `package.json` was consulted, so a Python
 * service was reported under its directory name with no dependencies.
 */
export async function readProjectIdentity(
  repoRoot: string,
  files: string[]
): Promise<ProjectIdentity> {
  const byName = new Map<string, string>();
  for (const file of files) {
    byName.set(baseName(file), path.join(repoRoot, file));
  }

  const read = async (name: string): Promise<string | null> => {
    const target = byName.get(name);
    if (!target) {
      return null;
    }
    try {
      return await fs.readFile(target, "utf8");
    } catch {
      return null;
    }
  };

  const packageJson = await read("package.json");
  if (packageJson) {
    try {
      const parsed = JSON.parse(packageJson) as {
        name?: string;
        description?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return {
        name: parsed.name ?? null,
        description: parsed.description ?? "",
        dependencies: Object.keys(parsed.dependencies ?? {}),
        devDependencies: Object.keys(parsed.devDependencies ?? {}),
      };
    } catch {
      return EMPTY;
    }
  }

  const pyproject = await read("pyproject.toml");
  if (pyproject) {
    return { ...EMPTY, ...parsePyproject(pyproject) };
  }

  const cargo = await read("Cargo.toml");
  if (cargo) {
    return { ...EMPTY, ...parseCargoToml(cargo) };
  }

  const goMod = await read("go.mod");
  if (goMod) {
    return { ...EMPTY, ...parseGoMod(goMod) };
  }

  const composer = await read("composer.json");
  if (composer) {
    return { ...EMPTY, ...parseComposerJson(composer) };
  }

  return EMPTY;
}
