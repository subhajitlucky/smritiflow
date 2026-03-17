# Runbook

## Install
- `pnpm install`

## Dev
- pnpm --filter ./apps/cli dev

## Test
- vitest run

## Lint
- pnpm typecheck

## Build
- pnpm -r build

## Environment Setup
- Check `.env.example` when present.

## Common Scripts
- build: pnpm -r build
- dev: pnpm --filter ./apps/cli dev
- lint: pnpm typecheck
- typecheck: tsc -p tsconfig.json --noEmit
- test: vitest run
- test:watch: vitest
- validate: pnpm typecheck && pnpm test && pnpm build