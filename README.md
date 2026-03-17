# SmritiFlow

Living project memory for coding agents.

SmritiFlow is a CLI-first tool that scans a repository, builds structured memory artifacts, and generates agent-friendly markdown files so work can be resumed quickly with current context.

## Core Commands

- `pnpm dev init`: Initialize `.smritiflow/` and `docs/ai/` artifacts.
- `pnpm dev scan`: Run a full scan and regenerate machine + markdown memory.
- `pnpm dev refresh`: Refresh memory after code changes.
- `pnpm dev status`: Show freshness/staleness signals.
- `pnpm dev resume`: Print a focused resume brief for next session.

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

## Testing Scope

Automated tests cover:

- Repo root detection (`findRepoRoot`)
- Stack detection heuristics (`detectStack`)
- Route extraction (`extractRoutes`)
- Full scan artifact generation (`runScan` integration)
- Refresh/status/resume behavior (`runRefresh`, `runStatus`, `runResume` integration)
