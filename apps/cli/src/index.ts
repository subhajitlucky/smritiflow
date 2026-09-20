import { Command } from "commander";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "../../../packages/core/src/initProject.js";
import { runScan } from "../../../packages/core/src/runScan.js";
import { runRefresh } from "../../../packages/core/src/runRefresh.js";
import { runStatus } from "../../../packages/core/src/runStatus.js";
import { runResume } from "../../../packages/core/src/runResume.js";

function readCliVersion(): string {
  try {
    const here =
      typeof __dirname === "string"
        ? __dirname
        : path.dirname(fileURLToPath(import.meta.url));
    const manifest = JSON.parse(
      readFileSync(path.join(here, "..", "package.json"), "utf8")
    ) as { version?: string };
    return manifest.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const program = new Command();
const invokedCommand = path.basename(process.argv[1] ?? "smritiflow");

program
  .name(invokedCommand === "sf" ? "sf" : "smritiflow")
  .description("Living project memory for coding agents")
  .version(readCliVersion());

program
  .command("init")
  .description("initialize project memory files")
  .action(async () => {
    await runInit(process.cwd());
  });

program
  .command("scan")
  .description("run full repository scan and generate living memory files")
  .action(async () => {
    await runScan(process.cwd());
  });

program
  .command("refresh")
  .description("refresh memory files after repository changes")
  .action(async () => {
    await runRefresh(process.cwd());
  });

program
  .command("status")
  .description("show memory freshness and stale signals")
  .action(async () => {
    await runStatus(process.cwd());
  });

program
  .command("resume")
  .description("print a focused repo resume brief for the next work session")
  .action(async () => {
    await runResume(process.cwd());
  });

program.parse();