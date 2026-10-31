# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - Unreleased

### Changed

- The package now ships compiled output in `dist` (ESM, CommonJS and type declarations) instead of
  raw TypeScript sources, so it works without transpiling `node_modules`. The `.` and `./react`
  export subpaths and the `react` peer range are unchanged. `./package.json` is now exported too.
- `track()` ignores events whose name is empty or not a string, and `identify()` ignores an empty
  or non-string user id, instead of recording them.

### Fixed

- `getConsentFromCookie()` no longer matches look-alike cookie names that merely end with
  `vllnt-consent` (for example `evil-vllnt-consent=1`).

### Security

- Releases are published from CI with npm trusted publishing and provenance. `@latest` is published
  only from a `vX.Y.Z` tag on `main` that matches `package.json` and this changelog.

## [0.1.1] - 2026-03-10

### Added

- CI and publish workflows.

## [0.1.0] - 2026-03-05

### Added

- Initial release: event tracking with a pre-initialization queue, two-category consent management
  (localStorage and SSR cookie), versioned consent re-prompts, Do Not Track support, tutorial
  tracking helpers, and React integration (`AnalyticsProvider`, `useAnalytics`, `useConsent`).
