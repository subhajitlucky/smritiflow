# SmritiFlow

[![npm version](https://img.shields.io/npm/v/smritiflow.svg)](https://www.npmjs.com/package/smritiflow)
[![npm downloads](https://img.shields.io/npm/dm/smritiflow.svg)](https://www.npmjs.com/package/smritiflow)
[![CI](https://github.com/subhajitlucky/smritiflow/actions/workflows/ci.yml/badge.svg)](https://github.com/subhajitlucky/smritiflow/actions/workflows/ci.yml)

SmritiFlow is a CLI for maintaining living repository memory for coding agents. It scans a codebase, writes structured artifacts, and generates concise agent-facing docs so work can be resumed with current context instead of guesswork.

Fresh agent sessions re-read the same repository and still miss what changed, what is active, and how to run things. SmritiFlow answers that with one scan: a project map, a current-state report, and a runbook that agents and humans read before starting work.

- Status: Published CLI
- Portfolio case study: <https://subhajitpradhan.vercel.app/projects/smritiflow>
- Inspect the implementation: `apps/cli`, `packages/core/src`, `tests`, and `.agents/skills/smritiflow/SKILL.md`

## Quick Start

```bash
npm install -g smritiflow      # or: npx smritiflow <command>
smritiflow init                # once per repository
smritiflow scan                # before substantial work
smritiflow status              # before resuming
smritiflow refresh             # after meaningful changes
smritiflow resume              # when returning to the codebase
```

Both command names are supported: `smritiflow` and `sf`. Install locally with `npm install --save-dev smritiflow` and run through `npx smritiflow <command>`.

| Command | What it does |
| --- | --- |
| `init` | Initialize repository memory files |
| `scan` | Run a full scan and generate all artifacts |
| `refresh` | Update memory after repository changes |
| `status` | Report freshness and stale signals |
| `resume` | Print a focused resume brief |

## What It Generates

| Artifact | Contents |
| --- | --- |
| `.smritiflow/cache.json` | Last scan/refresh times, recorded commit, file hashes |
| `.smritiflow/project-map.json` | Detected stack, routes, module-graph hotspots |
| `.smritiflow/scan-report.json` | Branch, commit, recent commits, changed files, active areas, stale warnings |
| `AGENTS.md` | Managed memory block between SmritiFlow markers |
| `docs/ai/PROJECT_OVERVIEW.md` | What the project is, routes, hotspots |
| `docs/ai/CURRENT_STATE.md` | What changed recently and which areas are active |
| `docs/ai/RUNBOOK.md` | Install, dev, test, lint, and build commands |

## Behavior Notes

- **Commit-aware refresh**: `refresh` compares the commit recorded in `.smritiflow/cache.json` with HEAD, so changes made in commits are detected, not only uncommitted working-tree edits. If the recorded commit is no longer reachable (rebase or force-push), it falls back to a full scan.
- **Ignore handling**: scans respect the repository `.gitignore` and always exclude `node_modules/`, `dist/`, `build/`, `.next/`, `coverage/`, `.turbo/`, `.smritiflow/`, and `docs/ai/` at any depth. Hidden directories such as `.github/` are included.
- **Merge-safe `AGENTS.md`**: generated content lives inside `<!-- smritiflow:begin -->` / `<!-- smritiflow:end -->` markers. Hand-written content outside the block is preserved, and files without markers receive the managed block appended instead of being overwritten.

## Agent Skill

This repository also exposes a `smritiflow` skill for agent workflows via `.agents/skills/smritiflow/SKILL.md`.

```bash
npx skills add subhajitlucky/smritiflow            # install the skill
npx skills add subhajitlucky/smritiflow --list     # optional discovery only
```

The skill is discoverable by the `skills` ecosystem and can surface on `skills.sh` through repo-based installation.

## Development

This repository uses `pnpm` for development; end users install the CLI with npm.

```bash
pnpm install
pnpm validate        # typecheck, tests, and build
```

Individual commands: `pnpm dev`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Releases

Releases publish to npm through the GitHub Actions workflow (OIDC trusted publishing with an `NPM_TOKEN` fallback):

1. Bump the version in `apps/cli/package.json`
2. Push the change to `main`
3. Create and push a tag such as `v0.1.2`
4. Let the workflow publish the package

## Testing

Automated coverage includes repository root detection, stack detection heuristics, route extraction, full scan artifact generation, and refresh/status/resume integration flows.

## Requirements

Node.js 20 or later.

## License

MIT
