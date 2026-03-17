# SmritiFlow

Living project memory for coding agents.

SmritiFlow is a CLI-first tool that scans a repository, builds structured memory artifacts, and generates agent-friendly markdown files so work can be resumed quickly with current context.

## Core Commands

- `pnpm dev init`: Initialize `.smritiflow/` and `docs/ai/` artifacts.
- `pnpm dev scan`: Run a full scan and regenerate machine + markdown memory.
- `pnpm dev refresh`: Refresh memory after code changes.
- `pnpm dev status`: Show freshness/staleness signals.
- `pnpm dev resume`: Print a focused resume brief for next session.

Installed CLI command names:

- `smritiflow init|scan|refresh|status|resume`
- `sf init|scan|refresh|status|resume`

## Generated Outputs

- `.smritiflow/cache.json`
- `.smritiflow/project-map.json`
- `.smritiflow/scan-report.json`
- `AGENTS.md`
- `docs/ai/PROJECT_OVERVIEW.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/RUNBOOK.md`

## Development

- `pnpm typecheck`: Workspace-wide TypeScript checks.
- `pnpm test`: Unit + integration test suite (Vitest).
- `pnpm build`: Build CLI package.
- `pnpm validate`: Full validation (`typecheck`, `test`, `build`).

## pnpm vs npm

- We use `pnpm` in this repository because it is fast and works well for monorepos.
- That does not lock users to `pnpm`.
- SmritiFlow is a normal Node CLI package, so npm users can run it too.

## How People Can Use SmritiFlow

Option 1: Published package (best for teams)

1. Publish `@smritiflow/cli` to npm.
2. Users run `npm install -g @smritiflow/cli`.
3. Then they can run `smritiflow init` or `sf init` in any project.

Option 2: Local link from source (works today)

From this repository:

1. `pnpm install`
2. `pnpm setup` (one-time, only if global pnpm bin is not configured)
3. `cd apps/cli && pnpm link --global`

From target project:

1. `pnpm link --global @smritiflow/cli`
2. Run `smritiflow init` or `sf init`
3. Run `smritiflow scan` or `sf scan`

Option 3: npm users without global install

1. In this repo: `cd apps/cli && npm pack`
2. In target project: `npm install --save-dev /absolute/path/to/smritiflow-cli-<version>.tgz`
3. Run commands with `npx --package @smritiflow/cli smritiflow init`
4. Alias also works with `npx --package @smritiflow/cli sf init`

## Agent Skill

- Local skill file: `.agents/skills/smritiflow/SKILL.md`
- Use this to help coding agents discover SmritiFlow workflow and commands.

## Test On Another Project

From this repository:

1. `pnpm install`
2. `pnpm --filter @smritiflow/cli build`
3. `pnpm setup` (only needed once on your machine)
4. `cd apps/cli && pnpm link --global`

From your target project:

1. `pnpm link --global @smritiflow/cli`
2. Run either `smritiflow init` or `sf init`
3. Then run `smritiflow scan` (or `sf scan`)
4. Check with `smritiflow status` (or `sf status`)

Minimal validation checklist in target project:

1. `.smritiflow/cache.json` exists
2. `.smritiflow/project-map.json` exists
3. `.smritiflow/scan-report.json` exists
4. `docs/ai/PROJECT_OVERVIEW.md` exists
5. `AGENTS.md` exists

## Testing Scope

Automated tests cover:

- Repo root detection (`findRepoRoot`)
- Stack detection heuristics (`detectStack`)
- Route extraction (`extractRoutes`)
- Full scan artifact generation (`runScan` integration)
- Refresh/status/resume behavior (`runRefresh`, `runStatus`, `runResume` integration)
