# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-27

### Added

- The package ships version-matched docs for coding agents and other readers: `docs/API.md`
  (every public export with its signature and an example), `llms.txt`, `CHANGELOG.md` and the
  TypeScript sources in `src/` (tests excluded). `llms.txt` links to these bundled files with
  relative paths.

### Changed

- The package entry points now resolve to compiled output in `dist` (ESM, CommonJS and type
  declarations) instead of raw TypeScript sources, so it works without transpiling
  `node_modules`. The `.` and `./react` export subpaths and the `react` peer range are
  unchanged. `./package.json` is now exported too. Both builds of `./react` start with
  `"use client"`.
- **Breaking:** `track()` ignores events whose name is empty or not a string, and `identify()`
  ignores an empty or non-string user id, instead of recording them.
- **Breaking:** after a stored decline, `AnalyticsProvider` now blocks tracking with
  `disableAnalytics()`, so `track()` calls are dropped. Before, they were queued in memory without
  limit and sent if the user accepted later.
- **Breaking:** when `initAnalytics()` is blocked by Do Not Track or a stored decline, it drops the
  events queued before it, as `disableAnalytics()` does. Before, they were kept and sent by a
  later `enableAnalytics()`.

### Fixed

- `getConsentFromCookie()` no longer matches look-alike cookie names that merely end with
  `vllnt-consent` (for example `evil-vllnt-consent=1`).
- `AnalyticsProvider` and `useConsent` save each choice with their `consentVersion`. Before, they
  always saved version `1`, so a `consentVersion` above `1` asked the user again on every visit.

### Security

- `@latest` is now published only from a `vX.Y.Z` tag on `main` that matches `package.json` and
  this changelog. Before, a manual workflow run bumped the version in CI. Publishing still uses
  npm trusted publishing (OIDC) with provenance, as in 0.1.1.

## [0.1.1] - 2026-03-10

### Added

- CI and publish workflows.

## [0.1.0] - 2026-03-05

### Added

- Initial release: event tracking with a pre-initialization queue, two-category consent management
  (localStorage and SSR cookie), versioned consent re-prompts, Do Not Track support, tutorial
  tracking helpers, and React integration (`AnalyticsProvider`, `useAnalytics`, `useConsent`).
