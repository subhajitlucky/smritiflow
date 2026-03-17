export function generateRunbook(scripts: Record<string, string>): string {
  const line = (name: string) => scripts[name] ?? "not defined";

  return [
    "# Runbook",
    "",
    "## Install",
    "- `pnpm install`",
    "",
    "## Dev",
    `- ${line("dev")}`,
    "",
    "## Test",
    `- ${line("test")}`,
    "",
    "## Lint",
    `- ${line("lint")}`,
    "",
    "## Build",
    `- ${line("build")}`,
    "",
    "## Environment Setup",
    "- Check `.env.example` when present.",
    "",
    "## Common Scripts",
    ...Object.entries(scripts).map(([name, cmd]) => `- ${name}: ${cmd}`),
  ].join("\n");
}
