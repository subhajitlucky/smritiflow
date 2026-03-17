import { Command } from "commander";
import path from "node:path";

type CoreAction = (cwd: string) => Promise<void>;

async function loadCoreAction(
  modulePath: string,
  exportName: string
): Promise<CoreAction> {
  const mod = await import(modulePath);
  const named = (mod as Record<string, unknown>)[exportName];

  if (typeof named === "function") {
    return named as CoreAction;
  }

  const asDefault = (mod as { default?: unknown }).default;
  if (typeof asDefault === "function") {
    return asDefault as CoreAction;
  }

  if (
    asDefault &&
    typeof asDefault === "object" &&
    typeof (asDefault as Record<string, unknown>)[exportName] === "function"
  ) {
    return (asDefault as Record<string, CoreAction>)[exportName];
  }

  throw new Error(`${exportName} not found in ${modulePath}`);
}

async function run(modulePath: string, exportName: string): Promise<void> {
  const action = await loadCoreAction(modulePath, exportName);
  await action(process.cwd());
}

const program = new Command();
const invokedCommand = path.basename(process.argv[1] ?? "smritiflow");

program
  .name(invokedCommand === "sf" ? "sf" : "smritiflow")
  .description("Living project memory for coding agents")
  .version("0.1.0");

program
  .command("init")
  .description("initialize project memory files")
  .action(async () => {
    await run("../../../packages/core/src/initProject", "runInit");
  });

program
  .command("scan")
  .description("run full repository scan and generate living memory files")
  .action(async () => {
    await run("../../../packages/core/src/runScan", "runScan");
  });

program
  .command("refresh")
  .description("refresh memory files after repository changes")
  .action(async () => {
    await run("../../../packages/core/src/runRefresh", "runRefresh");
  });

program
  .command("status")
  .description("show memory freshness and stale signals")
  .action(async () => {
    await run("../../../packages/core/src/runStatus", "runStatus");
  });

program
  .command("resume")
  .description("print a focused repo resume brief for the next work session")
  .action(async () => {
    await run("../../../packages/core/src/runResume", "runResume");
  });

program.parse();