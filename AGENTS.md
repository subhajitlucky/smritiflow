# AGENTS.md

Read docs/ai files first.

<!-- smritiflow:begin -->
## Repository Memory

**Project:** smritiflow
**Toolchain:** node (pnpm)
**Summary:** SmritiFlow is a CLI for maintaining living repository memory for coding agents.
**Languages:** typescript (67), javascript (1)
**Stack:** nodejs-cli, vitest

## Read Order
1. docs/ai/PROJECT_OVERVIEW.md
2. docs/ai/CURRENT_STATE.md
3. docs/ai/RUNBOOK.md
4. .smritiflow/scan-report.json

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Check: `pnpm check`
- Validate: `pnpm validate`
- Test Watch: `pnpm test:watch`

## Most Depended-Upon Modules
- packages/shared/src/types.ts (21)
- tests/helpers/tempRepo.ts (17)
- packages/repo-parser/src/languages.ts (16)
- packages/shared/src/utils.ts (11)
- packages/core/src/runScan.ts (10)

## Working Agreement
- Read the files above before exploring the repository.
- Prefer facts recorded in `.smritiflow/*.json` over assumptions.
- Run `smritiflow refresh` after meaningful code changes so this block stays accurate.
- Run `smritiflow status` before starting work to check whether this block is stale.
- If SmritiFlow is not installed globally, use `pnpm dlx smritiflow <command>`.
<!-- smritiflow:end -->
