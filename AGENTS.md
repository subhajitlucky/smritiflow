# AGENTS.md

Read docs/ai files first.

## Project Summary
SmritiFlow keeps living repo memory for coding agents.

## Read Order
1. docs/ai/PROJECT_OVERVIEW.md
2. docs/ai/CURRENT_STATE.md
3. docs/ai/RUNBOOK.md
4. .smritiflow/scan-report.json

## Important Commands
- pnpm build
- pnpm dev
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm test:watch
- pnpm dev init
- pnpm dev scan
- pnpm dev refresh
- pnpm dev status
- pnpm dev resume

## Agent Resume Workflow
- Start with `smritiflow status`.
- If stale, run `smritiflow refresh` before coding.
- Use `smritiflow resume` to get active areas and next actions.

## Coding Agent Contract
- Prefer deterministic facts from JSON artifacts over assumptions.
- Refresh docs after meaningful code changes.
- Keep edits scoped to active areas when possible.

## High-Risk Areas
- Generated docs can become stale after code changes.
- Re-run scan/refresh before agent implementation work.