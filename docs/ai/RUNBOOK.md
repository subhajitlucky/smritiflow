# Runbook

## Install
- `pnpm install`

## Dev
- pnpm --filter @smritiflow/cli dev

## Test
- vitest run

## Lint
- pnpm -r lint

## Build
- pnpm -r build

## Environment Setup
- Check `.env.example` when present.

## Common Scripts
- build: pnpm -r build
- dev: pnpm --filter @smritiflow/cli dev
- lint: pnpm -r lint
- typecheck: tsc -p tsconfig.json --noEmit
- test: vitest run
- test:watch: vitest
- validate: pnpm typecheck && pnpm test && pnpm build