# Project Overview

## What This Project Is
SmritiFlow is a CLI for maintaining living repository memory for coding agents. It scans a codebase, writes structured artifacts, and generates concise agent-facing docs so work can be resumed with current context instead of guesswork.

## Tech Stack
### Frontend
- none detected

### Backend
- nodejs-cli

### Database
- none detected

### Testing
- vitest

## Repo Layout
- tests: test suites
- apps: workspace applications
- packages: shared internal packages
- docs: documentation and memory artifacts

## Architecture Summary
- Internal source files: 42
- Internal import edges: 89

### Route Surface
- no routes detected

### Module Hotspots
- packages/core/src/runRefresh.ts (22)
- packages/core/src/runScan.ts (22)
- packages/core/src/runStatus.ts (5)
- tests/core.refresh-status-resume.integration.test.ts (5)
- packages/core/src/runResume.ts (4)
- tests/repo-parser.buildImportGraph.test.ts (4)
- packages/git/src/getChangedFiles.ts (2)
- packages/repo-parser/src/readConfigs.ts (2)

## Important Configs
- tsconfig.base.json
- tsconfig.json
- vitest.config.ts

## Current Maturity
- Last scan: 2026-03-17T13:24:44.936Z
- Files scanned: 63
- Branch: main