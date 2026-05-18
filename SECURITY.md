# Security Policy

`@vllnt/analytics` is a public npm package for consent-aware analytics helpers. Security reports should be handled privately before public disclosure.

## Supported versions

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |

## Reporting a vulnerability

Please report suspected vulnerabilities through GitHub private vulnerability reporting for this repository when available:

https://github.com/vllnt/analytics/security/advisories/new

If private vulnerability reporting is unavailable, open a minimal public issue that says a private security report is needed, without exploit details or sensitive data.

## Scope

Security-sensitive areas include:

- consent persistence and cookie parsing,
- SSR/browser boundary handling,
- user identity and trait handling,
- event queuing behavior,
- package publishing/provenance workflow integrity.

## Disclosure expectations

- Do not publicly disclose exploit details until maintainers have had time to investigate and release a fix.
- Include reproduction steps, affected versions, expected impact, and any suggested mitigation.
- Never include real user data, private customer data, tokens, cookies, or credentials in a report.
