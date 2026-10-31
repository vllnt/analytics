# Security Policy

## Supported versions

Security fixes go to the latest published release of `@vllnt/analytics` (the `latest` tag on npm).

## Reporting a vulnerability

Please report privately through
[GitHub Security Advisories](https://github.com/vllnt/analytics/security/advisories/new).
Do not open a public issue for a vulnerability.

Include the affected version, steps to reproduce, and the expected impact. Never include real user
data, cookies, tokens or credentials.

## Scope

The package runs in the browser, stores consent in `localStorage` and the `vllnt-consent` cookie,
and does not send data over the network (events are only logged with `debug: true`).
Security-relevant areas:

- consent storage and cookie parsing (`getConsentFromCookie`),
- Do Not Track and consent blocking,
- server/browser boundary guards (SSR safety),
- user id and traits held in memory (`identify`, `resetAnalytics`),
- release integrity: publishing runs in CI with npm trusted publishing and provenance.

Please give maintainers time to investigate and release a fix before disclosing details publicly.
