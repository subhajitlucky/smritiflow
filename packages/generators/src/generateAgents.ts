import type { ProjectMap, Toolchain } from "../../shared/src/types.ts";

export interface ProjectContext {
  packageManager: string;
  installCommand: string;
  runCommand: string;
  execCommand: string;
  docsDir: string;
  toolchain: Toolchain;
  summary: string;
}

/**
 * Install and run instructions for whatever toolchain the repo actually uses.
 * Falls back to the Node commands only when the project is a Node project.
 */
export function toolchainCommands(
  context: ProjectContext,
  scripts: Record<string, string> = {}
): { install: string; run: string | null; test: string | null; build: string | null } {
  const { toolchain } = context;

  if (toolchain.ecosystem === "node") {
    const scriptCommand = (...names: string[]): string | null => {
      const name = names.find((candidate) => scripts[candidate]);
      return name ? `${context.runCommand} ${name}` : null;
    };

    return {
      install: context.installCommand,
      run: scriptCommand("dev", "start", "serve"),
      test: scriptCommand("test"),
      build: scriptCommand("build"),
    };
  }

  return {
    install: toolchain.install,
    run: toolchain.run,
    test: toolchain.test,
    build: toolchain.build,
  };
}

const SCRIPT_PRIORITY = [
  "dev",
  "build",
  "start",
  "test",
  "test:unit",
  "lint",
  "typecheck",
  "format",
  "check",
  "validate",
  "migrate",
  "seed",
  "e2e",
  "preview",
  "docs",
];

const MAX_COMMANDS = 10;

function titleCase(value: string): string {
  return value
    .split(/[-_:]/)
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function firstSentence(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  const sentence = /^.*?[.!?](?=\s|$)/.exec(collapsed)?.[0];
  return (sentence ?? collapsed).slice(0, 240).trim();
}

export function describeProject(projectMap: ProjectMap, readmeSummary = ""): string {
  if (projectMap.description.trim().length > 0) {
    return firstSentence(projectMap.description);
  }

  if (readmeSummary.trim().length > 0) {
    return firstSentence(readmeSummary);
  }

  const stack = [
    ...projectMap.detectedStack.frontend,
    ...projectMap.detectedStack.backend,
    ...projectMap.detectedStack.testing,
  ];

  if (stack.length > 0) {
    return `${projectMap.name} (${unique(stack).join(", ")}).`;
  }

  const languages = projectMap.languages.slice(0, 3).map((entry) => entry.language);

  if (languages.length > 0) {
    return `${projectMap.name}, written in ${languages.join(", ")}.`;
  }

  return projectMap.name;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function orderedScripts(scripts: Record<string, string>): string[] {
  const known = SCRIPT_PRIORITY.filter((name) => scripts[name]);
  const rest = Object.keys(scripts).filter((name) => !SCRIPT_PRIORITY.includes(name)).sort();
  return [...known, ...rest].slice(0, MAX_COMMANDS);
}

/**
 * Builds the managed AGENTS.md block from detected project facts.
 *
 * This previously emitted SmritiFlow's own description and dev commands into
 * every consumer repository, which told agents to run `pnpm dev scan` in repos
 * that had no such script and often did not use pnpm at all.
 */
export function generateAgents(projectMap: ProjectMap, context: ProjectContext): string {
  const lines: string[] = ["## Repository Memory", ""];

  lines.push(`**Project:** ${projectMap.name}`);
  lines.push(`**Toolchain:** ${projectMap.toolchain.ecosystem} (${projectMap.toolchain.manager})`);
  lines.push(`**Summary:** ${describeProject(projectMap, context.summary)}`);

  const languages = projectMap.languages
    .slice(0, 5)
    .map((entry) => `${entry.language} (${entry.files})`);
  if (languages.length > 0) {
    lines.push(`**Languages:** ${languages.join(", ")}`);
  }

  const stack = unique([
    ...projectMap.detectedStack.frontend,
    ...projectMap.detectedStack.backend,
    ...projectMap.detectedStack.database,
    ...projectMap.detectedStack.testing,
  ]);
  if (stack.length > 0) {
    lines.push(`**Stack:** ${stack.join(", ")}`);
  }

  lines.push("");

  lines.push("## Read Order");
  lines.push(`1. ${context.docsDir}/PROJECT_OVERVIEW.md`);
  lines.push(`2. ${context.docsDir}/CURRENT_STATE.md`);
  lines.push(`3. ${context.docsDir}/RUNBOOK.md`);
  lines.push("4. .smritiflow/scan-report.json");
  lines.push("");

  const scripts = orderedScripts(projectMap.scripts);
  if (scripts.length > 0) {
    lines.push("## Commands");
    lines.push(`- Install: \`${context.installCommand}\``);
    for (const name of scripts) {
      lines.push(`- ${titleCase(name)}: \`${context.runCommand} ${name}\``);
    }
    lines.push("");
  } else {
    const commands = toolchainCommands(context, projectMap.scripts);

    lines.push("## Commands");
    if (commands.install.length > 0) {
      lines.push(`- Install: \`${commands.install}\``);
    }
    for (const [label, command] of [
      ["Run", commands.run],
      ["Test", commands.test],
      ["Build", commands.build],
    ] as const) {
      if (command) {
        lines.push(`- ${label}: \`${command}\``);
      }
    }
    if (!commands.run && !commands.test && !commands.build) {
      lines.push("- no run, test, or build commands detected");
    }
    lines.push("");
  }

  if (projectMap.moduleGraph.hotspots.length > 0) {
    lines.push("## Most Depended-Upon Modules");
    for (const hotspot of projectMap.moduleGraph.hotspots.slice(0, 5)) {
      lines.push(`- ${hotspot}`);
    }
    lines.push("");
  }

  if (projectMap.moduleGraph.cycles.length > 0) {
    lines.push("## Known Import Cycles");
    for (const cycle of projectMap.moduleGraph.cycles) {
      lines.push(`- ${cycle.join(" -> ")}`);
    }
    lines.push("");
  }

  lines.push("## Working Agreement");
  lines.push("- Read the files above before exploring the repository.");
  lines.push("- Prefer facts recorded in `.smritiflow/*.json` over assumptions.");
  lines.push("- Run `smritiflow refresh` after meaningful code changes so this block stays accurate.");
  lines.push("- Run `smritiflow status` before starting work to check whether this block is stale.");
  lines.push(`- If SmritiFlow is not installed globally, use \`${context.execCommand} smritiflow <command>\`.`);

  return lines.join("\n");
}
