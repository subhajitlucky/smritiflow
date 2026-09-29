# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.2.0] - Unreleased

Rewrites how repository memory is detected and generated. Generated documents
previously contained invented content, and change detection did not work outside
of git.

### Breaking

- **Artifact schemas changed.** `ScanReport` gains `addedFiles`, `removedFiles`,
  `todos`, and `notes`. `ProjectMap` gains `toolchain`, `languages`,
  `description`, `entryPoints`, and `workspacePackages`. `CacheData` gains
  `schemaVersion` and `hashStrategy`.
- **`staleWarnings` was redefined.** It used to hold refresh bookkeeping, so it
  always had content and never described staleness. It now contains warnings
  only, and refresh notes live in `notes`.
- **`.smritiflow/cache.json` is gitignored.** It is per-machine baseline state
  and grew to one fingerprint per file. A fresh clone has no baseline, so `status`
  distinguishes "artifacts exist but no baseline" (run `refresh`) from "never
  scanned" (run `init`), and `refresh` rebuilds it.
- **`AGENTS.md` needs a one-time manual fix.** 0.1 wrote its generated block
  without markers. On 0.2 that block survives above `<!-- smritiflow:begin -->`
  as hand-written content, because the merge cannot tell generated text from
  yours. Delete it once, by hand, after your first scan.

### Added

- `--json` on every command, also `SMRITIFLOW_JSON=1`, returning a single JSON
  object with no human text mixed in.
- `smritiflow hook`, a session-start brief for agent harnesses.
- `smritiflow check`, which fails when committed memory has drifted from the
  code. Runs inside `pnpm validate`.
- `schemaVersion` on every JSON result and artifact, so consumers can detect a
  shape change. A cache from an older schema is rebuilt rather than compared.
- `TODO`/`FIXME`/`HACK`/`XXX`/`BUG`/`OPTIMIZE` extraction with file and line
  numbers, replacing a `no TODO extraction yet` placeholder.
- Monorepo support: nested workspace manifests are read and their dependencies
  aggregated.
- Multi-language support for Python, Go, Rust, Java, Ruby, and PHP, including
  toolchain-aware commands, project identity from `pyproject.toml`,
  `Cargo.toml`, `go.mod`, and `composer.json`, and route detection for FastAPI,
  Flask, Express, Fastify, Koa, Spring, Go `net/http`, and Rails.
- Import graph resolves every edge to a real file, deduplicates on the resolved
  target, ranks by inbound degree, and reports import cycles and orphans.

### Fixed

- `refresh` reported "no changes" in any repository without git history, and
  missed nested workspace manifests. Change detection now compares SHA-256
  fingerprints of every hashable file; git supplies commit metadata only.
- Generated output never reported SmritiFlow's own artifacts as repository
  changes.
- `AGENTS.md` no longer hardcoded SmritiFlow's description and dev commands into
  every consumer repository, and the runbook no longer assumed `pnpm install`.
- Run commands are no longer fabricated. A Python repository without a service
  entry point is no longer offered `uvicorn app.main:app`.
- Import "hotspots" ranked the most import-verbose files rather than the most
  depended-upon ones.
- Route extraction reported 303 routes against a real table of 78 in a repository
  with embedded component demos.
- Test fixtures were reported as workspace packages, producing runbook commands
  that were wrong.
- A README opening with a blockquote produced a summary of the quote.
- Two `console.log` calls printed a literal `${hashChanged.length}`.
- `pnpm dev` failed to start: with no `"type": "module"` in the root manifest,
  tsx emitted CJS and Node could not see named exports.
- Consecutive scans of an unchanged repository produced different artifacts,
  because SmritiFlow's own output fed back into layout analysis and file counts.

[Unreleased]: https://github.com/subhajitlucky/smritiflow/compare/v0.1.2...HEAD
[0.2.0]: https://github.com/subhajitlucky/smritiflow/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/subhajitlucky/smritiflow/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/subhajitlucky/smritiflow/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/subhajitlucky/smritiflow/releases/tag/v0.1.0
