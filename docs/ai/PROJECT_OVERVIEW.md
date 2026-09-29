# Project Overview

## What This Project Is
SmritiFlow is a CLI for maintaining living repository memory for coding agents. It scans a codebase, writes structured artifacts, and generates concise agent-facing docs so work can be resumed with current context instead of guesswork.

## Stack
- Toolchain: node (pnpm)
- Languages: typescript (67), javascript (1)

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
- Internal source files: 68
- Internal import edges: 184

### Most Depended-Upon Modules
- packages/shared/src/types.ts (21)
- tests/helpers/tempRepo.ts (17)
- packages/repo-parser/src/languages.ts (16)
- packages/shared/src/utils.ts (11)
- packages/core/src/runScan.ts (10)
- packages/git/src/findRepoRoot.ts (8)
- packages/shared/src/constants.ts (8)
- packages/core/src/scanMetadata.ts (7)

### Most-Used External Modules
- node:path (41)
- fs-extra (40)
- vitest (21)
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
- Generated: 2026-09-29T10:55:41.654Z
- Files scanned: 85
- Branch: main
- Commit: 7b2f7a43dfb956d3e7b27c65292780d713167e8e
