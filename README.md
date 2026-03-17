# SmritiFlow

SmritiFlow is a CLI for maintaining living repository memory for coding agents. It scans a codebase, writes structured artifacts, and generates concise agent-facing docs so work can be resumed with current context instead of guesswork.

## What It Generates

- `.smritiflow/cache.json`
- `.smritiflow/project-map.json`
- `.smritiflow/scan-report.json`
- `AGENTS.md`
- `docs/ai/PROJECT_OVERVIEW.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/RUNBOOK.md`

## Install

SmritiFlow is published as the `smritiflow` CLI package.

```bash
npm install -g smritiflow
```

You can also install it in a project and run it locally:

```bash
npm install --save-dev smritiflow
npx smritiflow <command>
```

Both command names are supported:

- `smritiflow`
- `sf`

## Quick Start

```bash
smritiflow init
smritiflow scan
smritiflow status
smritiflow refresh
smritiflow resume
```

Typical workflow:

1. `init` once per repository
2. `scan` before substantial work
3. `status` before resuming
4. `refresh` after meaningful changes
5. `resume` when returning to an active codebase

## Commands

- `smritiflow init`: initialize repository memory files
- `smritiflow scan`: run a full scan and generate artifacts
- `smritiflow refresh`: refresh memory after repository changes
- `smritiflow status`: report freshness and stale signals
- `smritiflow resume`: print a focused resume brief

## Agent Skill

This repository also exposes a `smritiflow` skill for agent workflows via `.agents/skills/smritiflow/SKILL.md`.

Install the skill from GitHub with:

```bash
npx skills add subhajitlucky/smritiflow
```

That installs the repo-hosted `smritiflow` skill for supported agents.

Optional discovery only:

```bash
npx skills add subhajitlucky/smritiflow --list
```

Use the CLI itself with:

```bash
npm install -g smritiflow
```

The skill is discoverable by the `skills` ecosystem and can surface on `skills.sh` through repo-based installation.

## Development

This repository uses `pnpm` for development, but end users can install the CLI with npm.

```bash
pnpm install
pnpm validate
```

Main development commands:

- `pnpm dev`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`

## Releases

This repository includes a GitHub Actions publish workflow for npm trusted publishing.

Typical release flow:

1. bump the version in `apps/cli/package.json`
2. push the change to `main`
3. create and push a tag such as `v0.1.1`
4. let GitHub Actions publish the package to npm

## Testing

Automated coverage includes:

- repository root detection
- stack detection heuristics
- route extraction
- full scan artifact generation
- refresh, status, and resume integration flows
