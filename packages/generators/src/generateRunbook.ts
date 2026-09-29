import type { ProjectMap } from "../../shared/src/types.ts";
import type { ProjectContext } from "./generateAgents.ts";
import { describeProject, toolchainCommands } from "./generateAgents.ts";

const PRIMARY_SCRIPTS = ["dev", "build", "start", "test", "lint", "typecheck", "preview"];

/**
 * Builds the runbook from the package manager actually present in the repo.
 * The previous version hardcoded `pnpm install`, which was wrong for every
 * npm, yarn, and bun project.
 */
export function generateRunbook(projectMap: ProjectMap, context: ProjectContext): string {
  const scripts = projectMap.scripts;
  const lines: string[] = ["# Runbook", ""];

  const commands = toolchainCommands(context, scripts);

  lines.push("## Setup");
  lines.push(`- Toolchain: ${projectMap.toolchain.ecosystem} (${projectMap.toolchain.manager})`);
  if (commands.install.length > 0) {
    lines.push(`- Install: \`${commands.install}\``);
  }
  lines.push("");

  const primary = PRIMARY_SCRIPTS.filter((name) => scripts[name]);

  if (primary.length > 0) {
    lines.push("## Commands");
    for (const name of primary) {
      lines.push(`- ${name}: \`${context.runCommand} ${name}\``);
    }

    const remaining = Object.keys(scripts)
      .filter((name) => !PRIMARY_SCRIPTS.includes(name))
      .sort();

    if (remaining.length > 0) {
      lines.push("");
      lines.push("## All Scripts");
      for (const name of remaining) {
        lines.push(`- ${name}: \`${context.runCommand} ${name}\` — ${scripts[name]}`);
      }
    }
  } else {
    lines.push("## Commands");

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
  }

  if (projectMap.workspacePackages.length > 0) {
    lines.push("");
    lines.push("## Workspace Packages");

    for (const entry of projectMap.workspacePackages) {
      const dev = entry.scripts.dev ?? entry.scripts.start;
      const test = entry.scripts.test;

      if (dev) {
        lines.push(`- ${entry.name}: \`${context.runCommand} --filter ${entry.name} dev\` (or \`cd ${entry.path}\`)`);
      } else if (test) {
        lines.push(`- ${entry.name}: \`cd ${entry.path} && ${context.installCommand}\``);
      } else {
        lines.push(`- ${entry.name}: \`cd ${entry.path}\``);
      }
    }
  }

  lines.push("");
  lines.push("## Environment");
  lines.push("- Copy `.env.example` to `.env` when that file exists.");
  lines.push("- SmritiFlow never reads or generates secret values.");
  lines.push("");
  lines.push("## Freshness");
  lines.push("- Run `smritiflow status` to check whether this runbook matches the current tree.");
  lines.push(`- Project: ${projectMap.name} — ${describeProject(projectMap, context.summary)}`);

  return lines.join("\n");
}
