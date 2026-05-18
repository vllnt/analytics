# Contributing to @vllnt/analytics

Thanks for helping improve `@vllnt/analytics`.

This package is a small, privacy-first TypeScript library. Keep changes focused, easy to review, and safe for public npm consumers.

## Development setup

1. Install pnpm 9.x.
2. Install dependencies:

```bash
pnpm install --frozen-lockfile
```

3. Run the local quality gates before opening a pull request:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test:once
```

## Pull requests

- Branch from `main` for ordinary changes.
- Use focused branches such as `docs/...`, `fix/...`, `feat/...`, or `test/...`.
- Keep public documentation, tests, and examples in sync with behavior changes.
- Do not include secrets, customer data, private URLs, or internal operating notes.
- Do not bump `package.json` versions, create git tags, publish to npm, or announce releases from a normal PR.

## Release-review gate

Before any release PR is merged, tagged, published, or announced, a maintainer must explicitly review the release readiness evidence:

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

A passing gate means the change is in the VLLNT OSS release-readiness area of responsibility, relevant context has been read, evidence is attached, public-opsec has been checked, and there are no known blocking findings. It does not by itself authorize publishing; release dispatch remains a separate maintainer action.

## Coding guidelines

- Prefer TypeScript types over runtime ambiguity.
- Keep browser APIs guarded so SSR imports remain safe.
- Preserve consent-first behavior and Do Not Track handling.
- Avoid adding analytics vendor dependencies to the core package.
- Add or update Vitest coverage for behavior changes.

## Reporting issues

Open a GitHub issue with:

- the package version,
- runtime/framework details,
- expected behavior,
- actual behavior,
- a minimal reproduction when possible.
