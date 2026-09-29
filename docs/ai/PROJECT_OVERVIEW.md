# Project Overview

## What This Project Is
SmritiFlow is a CLI for maintaining living repository memory for coding agents. It scans a codebase, writes structured artifacts, and generates concise agent-facing docs so work can be resumed with current context instead of guesswork.

## Stack
- Toolchain: node (pnpm)
- Languages: typescript (65), javascript (1)

### Frontend
- none detected

### Backend
- nodejs-cli
- nodejs-cli
- nodejs-cli
- nodejs-cli

### Database
- none detected

### Testing
- vitest

## Layout
- packages: shared internal packages
- apps: workspace applications
- tests: test suites
- docs: documentation and memory artifacts
- .github: workflows and automation

## Dependency Graph
- Internal source files: 66
- Internal import edges: 169

### Most Depended-Upon Modules
- packages/shared/src/types.ts (20)
- packages/repo-parser/src/languages.ts (16)
- tests/helpers/tempRepo.ts (16)
- packages/shared/src/utils.ts (11)
- packages/core/src/runScan.ts (8)
- packages/git/src/findRepoRoot.ts (7)
- packages/shared/src/constants.ts (7)
- packages/git/src/getChangedFiles.ts (6)

### Most-Used External Modules
- node:path (40)
- fs-extra (39)
- vitest (20)
- simple-git (8)
- fast-glob (2)
- node:crypto (2)
- commander (1)
- ignore (1)

## Workspace Packages
- smritiflow (apps/cli): dev, build, typecheck

## Route Surface
- no routes detected

## Configuration
- .github/workflows/ci.yml
- .github/workflows/publish.yml
- .gitignore
- apps/cli/package.json
- apps/cli/tsconfig.json
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- tsconfig.base.json
- tsconfig.json
- vitest.config.ts

## Snapshot
- Generated: 2026-09-29T09:59:58.568Z
- Files scanned: 82
- Branch: main
- Commit: 317e19938a9508bcb14bd5d34ada1bb1b6a4bc52
