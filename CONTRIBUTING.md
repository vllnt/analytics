# Contributing to @vllnt/analytics

Thanks for your interest in contributing!

## Development Setup

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

## Testing

Tests use [Vitest](https://vitest.dev) with `jsdom`:

```bash
pnpm test:once      # single run
pnpm test           # watch mode
pnpm test:coverage  # enforced 100% on covered files
```

Coverage is gated at 100% (`vitest.config.ts`). Every public function needs a happy-path test and
at least one adversarial test (invalid input, SSR, storage unavailable).

## Pull Requests

- Target `main`
- One logical change per PR
- Include tests for new behavior or bug fixes
- Ensure all checks pass: `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build`

## Releases

Maintainers only. Every publish runs in `.github/workflows/publish.yml` with npm trusted
publishing and provenance; nothing is published from a local machine.

- Canary (`@canary`): every push to `main` that touches the package publishes one; you can
  also run the workflow manually on `main`.
- Stable (`@latest`): merge a PR that sets `package.json` `version` and adds a matching
  `## [X.Y.Z]` entry to `CHANGELOG.md`, then push the tag `vX.Y.Z` on that `main` commit.

## Reporting Issues

Use [GitHub Issues](https://github.com/vllnt/analytics/issues). For security vulnerabilities, use
[GitHub Security Advisories](https://github.com/vllnt/analytics/security/advisories/new) instead of a public issue.
