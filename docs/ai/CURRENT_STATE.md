# Current State

- Generated at: 2026-09-29T10:55:41.654Z
- Branch: main
- Commit: 7b2f7a43dfb956d3e7b27c65292780d713167e8e

## Recent Commits
- 7b2f7a4 feat: version the machine-readable contract and enforce memory freshness (#6)
- 17d7eac chore(release): describe the current CLI surface on npm (#5)
- f5e95ca fix: correct output found by scanning twenty real repositories (#4)
- 43f3dd9 feat: generate memory from verified repository facts (#3)
- 317e199 docs: add handoff preview from live scan run
- 37c761f docs(readme): add badges, artifact table, and requirements (#2)
- 9f4d7e0 ci(publish): authenticate with NPM_TOKEN so releases publish without trusted-publisher setup
- 608f7cd Merge pull request #1 from subhajitlucky/fix/refresh-ignores-agents

## Changed Files
- .claude/settings.json
- CHANGELOG.md
- packages/core/src/runStatus.ts
- packages/core/src/scanMetadata.ts
- README.md
- tests/core.changeDetection.test.ts

## Likely Active Areas
- .claude
- CHANGELOG.md
- packages
- packages/core
- README.md
- tests

## Open Markers
- 10 marker(s) across 6 file(s) [OPTIMIZE, TODO]

- .agents/skills/smritiflow/SKILL.md:77 TODO: `, `FIXME`, `HACK`, `XXX`, `BUG`, and
- .agents/skills/smritiflow/SKILL.md:78 OPTIMIZE: ` markers with file and line numbers. Read them before planning work:
- CHANGELOG.md:45 TODO: `/`FIXME`/`HACK`/`XXX`/`BUG`/`OPTIMIZE` extraction with file and line
- CHANGELOG.md:46 TODO: extraction yet` placeholder.
- packages/generators/src/generateCurrentState.ts:25 TODO: , FIXME, HACK, XXX, BUG, or OPTIMIZE markers found"];
- packages/repo-parser/src/extractTodos.ts:7 TODO: |FIXME|HACK|XXX|BUG|OPTIMIZE)\b[:\s-]
- packages/repo-parser/src/extractTodos.ts:13 TODO: style markers with file and line numbers. This replaces the
- packages/repo-parser/src/extractTodos.ts:14 TODO: extraction yet` placeholder that previously shipped in every
- packages/repo-parser/src/languages.ts:44 TODO: extraction
- README.md:66 TODO: /FIXME markers.

## Stale Warnings
- none

## Refresh Notes
- Full scan fingerprinted 81 file(s) (content).
