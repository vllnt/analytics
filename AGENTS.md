# Agent Instructions

Applies to the whole `vllnt/analytics` repository (`@vllnt/analytics`, public on npm).

## What this is

A small, privacy-first analytics library with consent management and a React integration.
It has no transport: events are never sent anywhere. `track()` only calls `console.log` when
`debug: true` is set. Consumers wire their own backend.

## Commands

Node is pinned in `.node-version` (24.22.1) and pnpm in `package.json` (`packageManager`).

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:coverage   # 100% coverage gate (vitest.config.ts)
pnpm build           # tsup -> dist (ESM, CJS, .d.ts)
```

Run all four checks before opening a PR; CI runs the same ones.

## Layout

- `src/index.ts`: root entry (`@vllnt/analytics`); re-exports from `analytics.ts`, `consent.ts`, `types.ts`.
- `src/react.tsx`: `./react` entry (`AnalyticsProvider`, `useAnalytics`, `useConsent`, `initAnalytics`).
- `src/analytics.ts`: module-level singleton, pre-init event queue, DNT/consent blocking, tutorial helpers.
- `src/consent.ts`: consent storage and cookie (`vllnt-consent`), DNT check, validators.
- `src/types.ts`: public types.
- `src/__tests__/`: Vitest tests (jsdom).
- `tsup.config.ts`: build config. Shared chunks keep the singleton shared across both entries.
- `.github/workflows/`: `ci.yml`, `publish.yml` (release-critical), `leak-gate.yml`.

## Behaviour to preserve

- Consent first: `initAnalytics` blocks when Do Not Track is on (`"1"` or `"yes"`) or stored
  consent has `analytics: false`. No stored consent means not blocked.
- `getConsentFromCookie` matches the cookie name only at the start of the string or after `;`,
  so look-alike names such as `evil-vllnt-consent` do not match.
- `track()` ignores empty or non-string names; `identify()` ignores empty or non-string ids.
- All browser APIs are guarded so importing on the server is safe.
- Published exports (`.`, `./react`, `./package.json`) and the `react` peer range
  (`^18.0.0 || ^19.0.0`) are public API; do not change them without a version decision.
- Do not add analytics vendor dependencies to the core.

## Releases

Maintainers only; nothing is published from a local machine.

- Canary: every push to `main` that touches the package publishes `@canary`.
- Stable: set `version` in `package.json`, add the matching `## [X.Y.Z]` entry to `CHANGELOG.md`,
  merge, then push the tag `vX.Y.Z` on that `main` commit. The workflow publishes `@latest`.
- Publishing uses npm trusted publishing (OIDC) with provenance; no npm token is stored.

Do not bump versions, tag, or publish in ordinary PRs. Never commit secrets, tokens or private URLs.
