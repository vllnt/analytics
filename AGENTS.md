# Agent Instructions

These instructions apply to the entire `vllnt/analytics` repository.

## Scope

`@vllnt/analytics` is a lightweight, privacy-first TypeScript analytics package with consent management and React integration.

## Safety rules

- Do not release, tag, publish to npm, merge, or announce without explicit maintainer approval.
- Do not change `package.json` version as part of ordinary docs, tests, or implementation work.
- Do not commit secrets, tokens, customer data, private URLs, or internal operating notes.
- Preserve privacy-first behavior: consent checks, Do Not Track handling, SSR safety, and no default external analytics vendor dependency.

## Development commands

Use pnpm 9.x.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm exec tsc --noEmit
pnpm test:once
```

## Repository map

- `src/analytics.ts`: core analytics singleton, queueing, identity, page/event/tutorial tracking helpers.
- `src/consent.ts`: consent storage, cookie parsing, Do Not Track detection, consent constructors and validators.
- `src/react.tsx`: React provider and consent hooks.
- `src/types.ts`: public TypeScript types.
- `src/__tests__/`: Vitest coverage for analytics, consent, React, exports, and SSR safety.
- `.github/workflows/ci.yml`: pull-request quality gates.
- `.github/workflows/publish.yml`: canary and manual release workflow. Treat this as release-critical.

## Release-readiness gate

Before any PR that prepares release work is merged or any publish/tag action is run, attach this gate with current evidence:

```json
{
  "branch": "vllnt-oss",
  "tenant": "releases",
  "aor_fit": true,
  "context_read": true,
  "evidence_attached": true,
  "opsec_checked": true,
  "safe_for_next_step": true,
  "blocking_findings": []
}
```
