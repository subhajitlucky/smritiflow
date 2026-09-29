import { Command, Option } from "commander";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "../../../packages/core/src/initProject.js";
import { runScan } from "../../../packages/core/src/runScan.js";
import { runRefresh } from "../../../packages/core/src/runRefresh.js";
import { runStatus } from "../../../packages/core/src/runStatus.js";
import { runResume } from "../../../packages/core/src/runResume.js";
import { runHook } from "../../../packages/core/src/runHook.js";
import { runCheck } from "../../../packages/core/src/runCheck.js";
import { consoleReporter, silentReporter } from "../../../packages/core/src/reporter.js";

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

interface GlobalOptions {
  json: boolean;
}

function globalOptions(): GlobalOptions {
  return program.opts<GlobalOptions>();
}

function emit(payload: unknown): void {
  if (globalOptions().json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }
}

/**
 * Every command returns a structured result. Human output goes through the
 * reporter, so `--json` emits the same facts with no duplicated formatting
 * logic and agents can consume SmritiFlow directly.
 */
async function runCommand<T>(
  work: (reporter: typeof consoleReporter) => Promise<T>
): Promise<void> {
  const asJson = globalOptions().json;
  const result = await work(asJson ? silentReporter : consoleReporter);

  if (asJson) {
    emit(result);
  }
}

program
  .name(invokedCommand === "sf" ? "sf" : "smritiflow")
  .description("Living project memory for coding agents")
  .version(readCliVersion())
  .addOption(
    new Option("--json", "emit a machine-readable JSON result instead of human-readable text")
      .default(false)
      .env("SMRITIFLOW_JSON")
  );

program
  .command("init")
  .description("initialize project memory files")
  .action(async () => {
    await runInit(process.cwd());
  });

program
  .command("scan")
  .description("run a full repository scan and generate living memory files")
  .action(async () => {
    await runCommand((reporter) => runScan(process.cwd(), reporter));
  });

program
  .command("refresh")
  .description("refresh memory files after repository changes")
  .action(async () => {
    await runCommand((reporter) => runRefresh(process.cwd(), reporter));
  });

program
  .command("status")
  .description("show memory freshness and stale signals")
  .action(async () => {
    await runCommand((reporter) => runStatus(process.cwd(), reporter));
  });

program
  .command("resume")
  .description("print a focused repo resume brief for the next work session")
  .action(async () => {
    await runCommand((reporter) => runResume(process.cwd(), reporter));
  });

program
  .command("hook")
  .description("print a session-start brief for agent harnesses")
  .argument("[event]", "harness event name", "session-start")
  .action(async (event: string) => {
    const result = await runHook(process.cwd(), event);

    if (globalOptions().json) {
      emit(result);
    } else {
      console.log(result.brief);
    }
  });

program
  .command("check")
  .description("fail when committed memory no longer describes the code")
  .action(async () => {
    const result = await runCheck(process.cwd());
    const asJson = globalOptions().json;

    if (asJson) {
      emit(result);
    } else {
      console.log(result.upToDate ? "Repository memory is up to date." : "Repository memory has drifted:");
      for (const item of result.drift) {
        console.log(`- ${item.file}: ${item.reason}`);
      }
      console.log(`Run \`smritiflow scan\` to regenerate, then commit the artifacts.`);
      console.log(`Not compared (point-in-time snapshots): ${result.skipped.join(", ")}`);
    }

    if (!result.upToDate) {
      process.exitCode = 1;
    }
  });

program.parse();
