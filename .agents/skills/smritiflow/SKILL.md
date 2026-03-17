---
name: smritiflow
description: Repository memory workflow skill for SmritiFlow init, scan, refresh, status, and resume commands.
---

# SmritiFlow Skill

Use this skill when you need repository memory context, freshness checks, or a fast resume workflow for a codebase.

## When To Use

Use this skill when asked to:
- initialize repo memory
- scan or refresh repository context
- check whether repo memory is stale
- resume work with active-area context
- prepare an agent handoff summary

Do not use this skill when:
- the user only wants a generic code explanation with no repository-memory workflow
- the repo does not need SmritiFlow artifacts or freshness checks

## Quick Start

Prefer these commands:

```bash
smritiflow status
smritiflow refresh
smritiflow resume
```

Both command names are supported:

- `smritiflow init|scan|refresh|status|resume`
- `sf init|scan|refresh|status|resume`

If SmritiFlow is not installed, the normal install path is:

```bash
npm install -g smritiflow
```

Project-local usage also works after a local install:

```bash
npm install --save-dev smritiflow
npx smritiflow status
```

## Workflow

1. Start with `smritiflow status`.
2. If the repo is stale, run `smritiflow refresh`.
3. Use `smritiflow resume` to identify active areas and next actions.
4. Use `smritiflow scan` when a full regeneration is needed.
5. Use `smritiflow init` only when memory files do not exist yet.

## Read Order

When SmritiFlow artifacts exist, prefer this order:

1. `.smritiflow/scan-report.json`
2. `docs/ai/PROJECT_OVERVIEW.md`
3. `docs/ai/CURRENT_STATE.md`
4. `docs/ai/RUNBOOK.md`
5. `AGENTS.md`

## Generated Outputs

- `.smritiflow/cache.json`
- `.smritiflow/project-map.json`
- `.smritiflow/scan-report.json`
- `AGENTS.md`
- `docs/ai/PROJECT_OVERVIEW.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/RUNBOOK.md`

## Rules

- Prefer facts from `.smritiflow/*.json` over assumptions.
- Treat `docs/ai/*.md` as summaries of the generated JSON artifacts.
- If `status` is stale, refresh before making planning decisions.
- Use `resume` to narrow focus before broad repo exploration.
- After meaningful code changes, run `refresh` so artifacts stay current.
