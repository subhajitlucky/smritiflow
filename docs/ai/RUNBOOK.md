# Runbook

## Setup
- Toolchain: node (pnpm)
- Install: `pnpm install`

## Commands
- dev: `pnpm dev`
- build: `pnpm build`
- test: `pnpm test`
- lint: `pnpm lint`
- typecheck: `pnpm typecheck`

## All Scripts
- check: `pnpm check` — tsx apps/cli/src/index.ts check
- test:watch: `pnpm test:watch` — vitest
- validate: `pnpm validate` — pnpm typecheck && pnpm test && pnpm build && pnpm check

## Workspace Packages
- smritiflow: `pnpm --filter smritiflow dev` (or `cd apps/cli`)

## Environment
- Copy `.env.example` to `.env` when that file exists.
- SmritiFlow never reads or generates secret values.

## Freshness
- Run `smritiflow status` to check whether this runbook matches the current tree.
- Project: smritiflow — SmritiFlow is a CLI for maintaining living repository memory for coding agents.
