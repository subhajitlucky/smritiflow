import { Command } from "commander";
import initProjectModule from "../../../packages/core/src/initProject.ts";

const runInit =
  (initProjectModule as { runInit?: (cwd: string) => Promise<void> }).runInit;

if (!runInit) {
  throw new Error("runInit not found in core package");
}

const program = new Command();

program
  .name("smritiflow")
  .description("Living project memory for coding agents")
  .version("0.1.0");

program
  .command("init")
  .action(async () => {
    await runInit(process.cwd());
  });

program.parse();