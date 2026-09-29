---
name: smritiflow
description: Repository memory workflow skill for SmritiFlow init, scan, refresh, status, resume, and hook commands.
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
smritiflow status --json
smritiflow refresh
smritiflow resume
smritiflow hook session-start
```

Both command names are supported:

- `smritiflow init|scan|refresh|status|resume|hook`
- `sf init|scan|refresh|status|resume|hook`

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

1. Start with `smritiflow status --json` and read `stale` and `staleReasons`.
2. If the repo is stale, run `smritiflow refresh` and re-read `docs/ai/CURRENT_STATE.md`.
3. Use `smritiflow resume --json` to get active areas, changed files, and open markers.
4. Use `smritiflow scan` when a full regeneration is needed.
5. Use `smritiflow init` only when memory files do not exist yet.

## Machine-Readable Output

Every command accepts `--json` and returns a single JSON object on stdout with
no human text mixed in. Prefer it over parsing prose.

| Command | Fields worth reading |
| --- | --- |
| `status --json` | `initialized`, `stale`, `staleReasons`, `changedFiles`, `lastScanAt` |
| `refresh --json` | `mode` (`full` \| `partial` \| `none`), `changedFiles`, `refreshedSections` |
| `resume --json` | `readFirst`, `activeAreas`, `changedFiles`, `todos`, `nextSteps` |
| `scan --json` | `fileCount`, `sourceFileCount`, `routeCount`, `todoCount` |
| `hook --json` | `stale`, `readFirst`, `activeAreas`, `brief` |

`docs/ai/CURRENT_STATE.md` lists open `TODO`, `FIXME`, `HACK`, `XXX`, `BUG`, and
`OPTIMIZE` markers with file and line numbers. Read them before planning work:
they are the closest thing the repository has to a task list.

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

- Prefer facts from `.smritiflow/*.json` and `--json` output over assumptions.
- Treat `docs/ai/*.md` as summaries of the generated JSON artifacts.
- If `status` is stale, refresh before making planning decisions.
- Use `resume` to narrow focus before broad repo exploration.
- Read the most depended-upon modules in `docs/ai/PROJECT_OVERVIEW.md` before
  guessing where behaviour lives.
- Check `docs/ai/PROJECT_OVERVIEW.md` for reported import cycles before
  introducing a new cross-package dependency.
- After meaningful code changes, run `refresh` so artifacts stay current.
- Never edit files inside `<!-- smritiflow:begin -->` / `<!-- smritiflow:end -->`;
  they are regenerated.
