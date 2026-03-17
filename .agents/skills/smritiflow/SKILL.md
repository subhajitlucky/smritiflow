# SmritiFlow Skill

Use this skill when you need repository memory context, onboarding guidance, or freshness checks for a codebase.

## Purpose

SmritiFlow creates and maintains living repository memory for coding agents by generating machine-readable artifacts and agent-readable docs.

## When To Use

Use this skill when asked to:
- initialize project memory
- scan or refresh repository context
- check whether repo memory is stale
- resume work quickly with active-area context
- prepare an agent handoff summary

## Core Commands

Both command names are supported:
- `smritiflow init`
- `smritiflow scan`
- `smritiflow refresh`
- `smritiflow status`
- `smritiflow resume`

Short alias equivalents:
- `sf init`
- `sf scan`
- `sf refresh`
- `sf status`
- `sf resume`

## Package Manager Compatibility

- SmritiFlow can be developed with `pnpm` and consumed with `npm`.
- End users do not need to switch package managers to run the CLI.
- Typical end-user install after publish is `npm install -g @smritiflow/cli`.
- `npm install smritiflow` works only if a package named `smritiflow` is published.

## Suggested Workflow

1. Run `smritiflow init` once per repository.
2. Run `smritiflow scan` before starting substantial work.
3. Run `smritiflow status` before and after implementation.
4. Run `smritiflow refresh` after meaningful changes.
5. Run `smritiflow resume` when returning to paused work.

## Generated Files

- `.smritiflow/cache.json`
- `.smritiflow/project-map.json`
- `.smritiflow/scan-report.json`
- `AGENTS.md`
- `docs/ai/PROJECT_OVERVIEW.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/RUNBOOK.md`

## Agent Guidance

- Prefer facts from `.smritiflow/*.json` over assumptions.
- Treat `docs/ai/*.md` as human-readable summaries of JSON artifacts.
- If `status` is stale, run `refresh` before making decisions.
- Use `resume` output to focus on active areas first.
- If a user prefers npm, provide npm install/link or `npx --package` examples.
