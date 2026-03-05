---
title: Achieve 100% Test Coverage
status: active
created: 2026-03-05
estimate: 3h
tier: standard
---

# Achieve 100% Test Coverage

## Context

Existing test suite covers major happy paths and some error paths but has coverage gaps in error handling branches, SSR guards, storage failure paths, and DNT fallback detection. Goal: behavioral confidence first, line/branch coverage second. Fill gaps with integration tests for consent lifecycle + unit tests for uncovered branches.

Note: This package uses `workspace:*` deps from the vllnt monorepo. Tests must run within the monorepo context (`pnpm install` at root). Cannot run standalone.

**Design decisions documented (from spec review):**
- "No consent = default allow" is an intentional design choice. GDPR-incompatible for EU deployment without a wrapping opt-in layer. Tested as-is but flagged.
- `sendEvent` is a debug-log stub. All tracking assertions validate logging, not event delivery. Will need revision when a real transport is added.
- `disableAnalytics()` clears event queue but does NOT clear `userId`/`traits` from memory. Potential GDPR Art. 17 concern. Tested and filed as known issue.

## Codebase Impact (MANDATORY)

| Area | Impact | Detail |
|------|--------|--------|
| `src/__tests__/analytics.test.ts` | MODIFY | Add queued page flush, enableAnalytics no-op, consent lifecycle integration, PII cleanup test |
| `src/__tests__/consent.test.ts` | MODIFY | Add storage failure, DNT fallback isolation, adversarial cookie regex, consent round-trip |
| `src/__tests__/react.test.tsx` | MODIFY | Add updateConsent enabling analytics, no-consent guard |
| `src/__tests__/ssr.test.ts` | CREATE | SSR-specific tests with `// @vitest-environment node` directive |
| `src/__tests__/exports.test.ts` | CREATE | Entry-point smoke tests for package exports |
| `vitest.config.ts` | MODIFY | Add coverage thresholds |

**Files:** 2 create | 4 modify | 0 affected
**Reuse:** Existing test patterns (vi.spyOn, localStorage mocking, Object.defineProperty for navigator), existing setup.ts
**Breaking changes:** None
**New dependencies:** None (coverage already in devDeps: `@vitest/coverage-v8`)

## User Journey (MANDATORY)

### Primary Journey

ACTOR: Developer maintaining @vllnt/analytics
GOAL: Run `pnpm test:coverage` and see 100% across all metrics with high behavioral confidence
PRECONDITION: Tests pass, coverage is <100%, some behavioral paths untested

1. Developer runs `pnpm test:coverage`
   -> System runs all test suites (jsdom + node environments)
   -> Developer sees 100% statements, branches, functions, lines

2. Developer pushes code
   -> CI runs coverage check
   -> CI passes (thresholds enforced in vitest config)

POSTCONDITION: All source files at 100% coverage with enforced thresholds. Consent lifecycle, SSR, and privacy paths verified.

### Error Journeys

E1. Developer adds code without test
   Trigger: New branch/statement not covered
   1. Developer runs `pnpm test:coverage`
      -> System reports coverage below threshold
      -> vitest exits with non-zero code
   2. Developer adds missing test
      -> System passes
   Recovery: Coverage back to 100%

E2. Consumer import breaks silently
   Trigger: Export removed from index.ts or /react subpath
   1. Developer runs `pnpm test`
      -> Entry-point smoke test fails
   Recovery: Restore export

### Edge Cases

EC1. SSR code paths (`typeof window === 'undefined'`) — tested in dedicated `ssr.test.ts` with `@vitest-environment node`
EC2. `isStorageAvailable` when `window` exists but `localStorage` throws (private browsing) — mock localStorage to throw
EC3. DNT OR-chain truthiness bug — `navigator.doNotTrack = "unspecified"` (truthy) short-circuits fallbacks
EC4. Consent storage failure + default-allow = silent consent reversal on reload

## Acceptance Criteria (MANDATORY)

### Must Have (BLOCKING)

**P0 — Behavioral integration (from spec review)**

- [ ] AC-10: GIVEN user declines analytics WHEN localStorage.setItem throws QuotaExceededError THEN on simulated reload (reset + loadConsent), consent is null AND analytics would use default-allow (documents the consent-reversal vulnerability)
- [ ] AC-11: GIVEN navigator.doNotTrack is undefined WHEN window.doNotTrack is "1" THEN isDoNotTrackEnabled returns true (fallback isolation)
- [ ] AC-12: GIVEN navigator.doNotTrack is undefined AND window.doNotTrack is undefined WHEN navigator.msDoNotTrack is "1" THEN isDoNotTrackEnabled returns true (second fallback isolation)
- [ ] AC-13: GIVEN user calls identify("user-123", {email}) then disableAnalytics() WHEN getAnalyticsState() is checked THEN userId and traits still persist in analyticsState (documents PII-retention known issue)
- [ ] AC-14: GIVEN index.ts and /react subpath WHEN importing all documented exports THEN every export is defined and has correct type (function/object)
- [ ] AC-15: GIVEN events queued pre-consent WHEN disableAnalytics clears queue THEN enableAnalytics re-inits with empty queue (documents intentional event-loss behavior)

**P1 — Unit coverage gaps**

- [ ] AC-5: GIVEN analytics.ts WHEN page view is queued pre-init THEN processQueue flushes it via the `__page__` path (debug log confirms)
- [ ] AC-6: GIVEN consent.ts WHEN localStorage.setItem throws THEN isStorageAvailable returns false
- [ ] AC-7: GIVEN consent.ts WHEN isStorageAvailable returns false THEN loadConsent returns null, saveConsent/clearConsent return early without error
- [ ] AC-8: GIVEN consent.ts WHEN saveConsent encounters an error THEN console.warn is called with error message
- [ ] AC-9: GIVEN consent.ts WHEN isDoNotTrackEnabled checks fallbacks THEN window.doNotTrack and msDoNotTrack are detected (with explicit navigator.doNotTrack = undefined setup)

**P2 — SSR + coverage enforcement**

- [ ] AC-16: GIVEN ssr.test.ts with `@vitest-environment node` WHEN track/trackPage/identify/resetAnalytics called THEN all return early without error (no window)
- [ ] AC-17: GIVEN ssr.test.ts WHEN isStorageAvailable/isDoNotTrackEnabled called THEN return false (no window)
- [ ] AC-4: GIVEN vitest.config.ts WHEN coverage thresholds are set THEN thresholds enforce 100% on all metrics
- [ ] AC-1: GIVEN all test suites WHEN running `vitest run --coverage` THEN statement coverage is 100%
- [ ] AC-2: GIVEN all test suites WHEN running `vitest run --coverage` THEN branch coverage is 100%
- [ ] AC-3: GIVEN all test suites WHEN running `vitest run --coverage` THEN function coverage is 100%

**P1 — Adversarial edge cases**

- [ ] AC-18: GIVEN getConsentFromCookie WHEN cookie string contains "evil-vllnt-consent=1" (substring match) THEN returns null (not fooled by prefix)
- [ ] AC-19: GIVEN navigator.doNotTrack = "unspecified" (truthy non-DNT string) WHEN isDoNotTrackEnabled called THEN returns false (not fooled by truthiness)

### Error Criteria (BLOCKING)

- [ ] AC-E1: GIVEN malformed localStorage data WHEN loadConsent is called THEN returns null without throwing
- [ ] AC-E2: GIVEN no AnalyticsProvider WHEN useAnalytics is called THEN throws descriptive error (existing, verify maintained)

### Should Have

- [ ] AC-S1: GIVEN react.tsx WHEN AnalyticsProvider.updateConsent enables analytics THEN enableAnalytics is called
- [ ] AC-S2: GIVEN react.tsx WHEN AnalyticsProvider.updateConsent is called with no consent THEN no-op

## Scope

**P0 — Behavioral integration tests (FIRST)**

- [ ] 1. Add consent lifecycle round-trip test (decline -> storage fail -> reload -> verify) -> AC-10
- [ ] 2. Add DNT fallback isolation tests (each fallback in isolation) -> AC-11, AC-12, AC-19
- [ ] 3. Add PII persistence test after disableAnalytics -> AC-13
- [ ] 4. Add entry-point export smoke tests -> AC-14
- [ ] 5. Add event-loss documentation test (queue -> disable -> enable -> verify empty) -> AC-15

**P1 — Unit coverage gaps**

- [ ] 6. Add analytics.ts coverage gap tests (queued page flush, enableAnalytics no-op) -> AC-5
- [ ] 7. Add consent.ts storage failure + error handling tests -> AC-6, AC-7, AC-8
- [ ] 8. Add consent.ts DNT unit tests -> AC-9
- [ ] 9. Add adversarial cookie regex test -> AC-18
- [ ] 10. Add react.tsx coverage gap tests -> AC-S1, AC-S2

**P2 — SSR + enforcement**

- [ ] 11. Create ssr.test.ts with `@vitest-environment node` -> AC-16, AC-17
- [ ] 12. Add coverage thresholds to vitest.config.ts -> AC-4
- [ ] 13. Verify 100% coverage passes -> AC-1, AC-2, AC-3

### Out of Scope

- Browser E2E testing (this is a library, not an app)
- Fixing the consent-reversal vulnerability (AC-10 documents it; fix is separate work)
- Fixing the PII-retention issue (AC-13 documents it; fix is separate work)
- Fixing the cookie regex vulnerability (AC-18 may reveal a bug; fix is separate work)
- Adding consent TTL/expiry feature
- Adding `defaultConsent` config option
- Performance testing

## Quality Checklist

### Blocking

- [ ] All Must Have ACs passing
- [ ] All Error Criteria ACs passing
- [ ] All scope items implemented
- [ ] No regressions in existing tests
- [ ] Error states handled (not just happy path)
- [ ] No hardcoded secrets or credentials
- [ ] Coverage thresholds enforced in vitest config
- [ ] Every `afterEach` restores all window/navigator property overrides
- [ ] No istanbul ignore comments (SSR handled via node env test file)

### Advisory

- [ ] All Should Have ACs passing
- [ ] Code follows existing test patterns (vi.spyOn, Object.defineProperty)
- [ ] Tests are readable and descriptive
- [ ] Known issues documented in spec Notes section

## Test Strategy (MANDATORY)

### Test Environment

| Component | Status | Detail |
|-----------|--------|--------|
| Test runner | Detected | vitest 4.x |
| E2E framework | N/A | Library package — unit/integration tests only |
| Test DB | N/A | No database |
| Mock inventory | 3 existing patterns | localStorage mock, navigator.doNotTrack mock, console.log spy |
| SSR testing | NEW | `ssr.test.ts` with `// @vitest-environment node` directive |

### AC -> Test Mapping

| AC | Test Type | Test File | Test Intention |
|----|-----------|-----------|----------------|
| AC-1 | Coverage gate | (all) | 100% statement coverage |
| AC-2 | Coverage gate | (all) | 100% branch coverage |
| AC-3 | Coverage gate | (all) | 100% function coverage |
| AC-4 | Config | vitest.config.ts | Coverage thresholds enforced |
| AC-5 | Unit | analytics.test.ts | Queued page flush via __page__ path |
| AC-6 | Unit | consent.test.ts | isStorageAvailable false when throws |
| AC-7 | Unit | consent.test.ts | load/save/clear no-op when unavailable |
| AC-8 | Unit | consent.test.ts | saveConsent console.warn on error |
| AC-9 | Unit | consent.test.ts | DNT fallback detection |
| AC-10 | Integration | consent.test.ts | Consent round-trip under storage failure |
| AC-11 | Unit | consent.test.ts | window.doNotTrack fallback isolation |
| AC-12 | Unit | consent.test.ts | msDoNotTrack fallback isolation |
| AC-13 | Integration | analytics.test.ts | PII persistence after disableAnalytics |
| AC-14 | Smoke | exports.test.ts | Entry-point export validation |
| AC-15 | Integration | analytics.test.ts | Event-loss on disable/enable cycle |
| AC-16 | Unit | ssr.test.ts | SSR early returns (no window) |
| AC-17 | Unit | ssr.test.ts | SSR storage/DNT returns false |
| AC-18 | Unit | consent.test.ts | Adversarial cookie regex |
| AC-19 | Unit | consent.test.ts | DNT truthiness edge case |
| AC-E1 | Unit | consent.test.ts | Malformed JSON handling |
| AC-E2 | Unit | react.test.tsx | useAnalytics outside provider |
| AC-S1 | Unit | react.test.tsx | updateConsent enables analytics |
| AC-S2 | Unit | react.test.tsx | updateConsent no-op without consent |

### Failure Mode Tests (MANDATORY)

| Source | ID | Test Intention | Priority |
|--------|----|----------------|----------|
| Error Journey | E1 | Coverage drop detected by threshold enforcement | BLOCKING |
| Error Journey | E2 | Removed export caught by smoke test | BLOCKING |
| Edge Case | EC1 | SSR branches tested via node env (not ignored) | BLOCKING |
| Edge Case | EC2 | Private browsing localStorage failure handled | BLOCKING |
| Edge Case | EC3 | DNT OR-chain truthiness bug caught | BLOCKING |
| Edge Case | EC4 | Consent reversal on storage failure documented | BLOCKING |
| Failure Hypothesis | FH-1 (HIGH) | SSR guards tested in real node env, not istanbul-ignored | BLOCKING |
| Failure Hypothesis | FH-2 (HIGH) | Consent storage failure -> reload -> consent reversal documented | BLOCKING |
| Failure Hypothesis | FH-3 (HIGH) | DNT "unspecified" truthiness doesn't bypass detection | BLOCKING |
| Failure Hypothesis | FH-4 (MED) | Tests validate behavior (return values), not just "doesn't throw" | BLOCKING |
| Failure Hypothesis | FH-5 (MED) | Entry-point exports match documented API | BLOCKING |

### Mock Boundary

| Dependency | Strategy | Justification |
|------------|----------|---------------|
| localStorage | jsdom built-in | Already available in test env |
| localStorage (failure) | vi.spyOn(Storage.prototype, 'setItem') to throw | Test storage unavailable path |
| navigator.doNotTrack | Object.defineProperty + afterEach restore | Existing pattern |
| window.doNotTrack | Object.defineProperty + afterEach restore | DNT fallback isolation |
| navigator.msDoNotTrack | Object.defineProperty + afterEach restore | DNT fallback isolation |
| console.log/warn | vi.spyOn | Verify debug/error output |
| window (SSR) | vitest `environment: 'node'` | No mocking needed — window genuinely absent |

### TDD Commitment

Tests written BEFORE implementation changes. RED -> GREEN -> REFACTOR per AC.
For coverage-only tests: write test -> confirm passes (GREEN immediately).
For tests that reveal bugs (AC-18 cookie regex, AC-19 DNT truthiness): write test -> confirm RED -> fix is OUT OF SCOPE (documented, separate work).

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| DNT OR-chain has a real bug (AC-19) | MED | HIGH | Test documents it. Fix is separate scope item. |
| Cookie regex has substring match vuln (AC-18) | MED | HIGH | Test documents it. Fix is separate scope item. |
| `disableAnalytics` doesn't clear PII (AC-13) | HIGH | CONFIRMED | Test documents it. Fix is separate scope item (GDPR concern). |
| Consent reversal on storage failure (AC-10) | HIGH | MED | Test documents the architectural vulnerability. Fix requires fallback persistence. |
| `sendEvent` is a stub — tests prove logging, not delivery | MED | CONFIRMED | Documented. Will need transport-layer testing when real integration added. |
| Default-allow model GDPR-incompatible for EU | HIGH | CONFIRMED | Documented as intentional design choice. Separate work to add `defaultConsent` config. |
| Monorepo setup friction inflates estimate | LOW | MED | 3h estimate includes buffer. Prerequisite: `pnpm install` at monorepo root. |
| Mock teardown leaks between tests | LOW | LOW | Explicit afterEach restore required in quality checklist. |

**Kill criteria:** If any AC reveals a bug that makes 100% coverage impossible without a production code fix, document the bug, set coverage threshold to highest achievable level, and create a follow-up spec for the fix.

## State Machine

N/A — stateless feature. Adding tests to existing code, no state transitions.

## Analysis

### Assumptions Challenged

| Assumption | Evidence For | Evidence Against | Verdict |
|------------|-------------|-----------------|---------|
| istanbul ignore is acceptable for SSR guards | Common practice | SSR guards are the highest-value consumer paths (Next.js). 6+ guards = kill criterion fires. All 4 review perspectives rejected this. | WRONG -> use @vitest-environment node |
| 100% coverage = library works correctly | Ensures every line executes | Coverage measures execution, not correctness. Consent lifecycle compositions, event-loss behavior, PII persistence untested by line coverage. | RISKY -> behavioral tests first |
| "No consent = default allow" is fine | Works as coded | GDPR requires opt-in. Storage failure + default-allow = silent consent reversal. | RISKY -> document, flag |
| 2h estimate is realistic | Small codebase | Monorepo setup, jsdom mocking complexity, React hook debugging | RISKY -> revised to 3h |
| Existing mock patterns sufficient | vi.spyOn/Object.defineProperty work | DNT OR-chain truthiness bug needs novel isolation. afterEach restore not specified. | VALID with caveats |

### Blind Spots (from spec review)

1. **[privacy/HIGH]** PII persists in memory after `disableAnalytics()`. `userId`/`traits` survive consent revocation. GDPR Art. 17 concern.
   -> AC-13 added to document this.

2. **[consumer/MED]** No entry-point smoke tests. All tests import from relative paths. Removed export = silent consumer breakage.
   -> AC-14 added, exports.test.ts created.

3. **[privacy/HIGH]** Consent storage failure = silent reversal. `saveConsent` catches + warns. Reload -> null consent -> default-allow -> tracking despite decline.
   -> AC-10 added to document this.

4. **[privacy/HIGH]** DNT OR-chain truthiness bug. `"unspecified"` (truthy) wins OR, fails `=== '1'` check. Fallback `window.doNotTrack = "1"` never reached.
   -> AC-19 added. Likely a source code bug.

5. **[consumer/MED]** Event-loss on consent revocation/re-grant undocumented. Queue cleared by `disableAnalytics`, not restored by `enableAnalytics`.
   -> AC-15 added to document this.

6. **[security/LOW]** Cookie regex vulnerable to substring matching. `evil-vllnt-consent=1` would match.
   -> AC-18 added.

### Failure Hypotheses

| IF | THEN | BECAUSE | Severity | Mitigation |
|----|------|---------|----------|------------|
| istanbul ignore used for SSR + catch blocks | Kill criterion fires (9-12 branches, not 5) | Spec underestimated branch count | HIGH | Resolved: SSR test file replaces istanbul ignore |
| Storage fails + default-allow + reload | Consent silently reversed | saveConsent catches, loadConsent returns null = allow | HIGH | AC-10 documents. Fix is separate work. |
| DNT "unspecified" in browser | DNT bypassed silently | OR-chain truthiness, not semantic intent | HIGH | AC-19 tests. Fix is separate work. |
| Tests only assert "doesn't throw" | Coverage green but regressions pass | Absence of failure != presence of correctness | MED | All ACs now specify expected return values |
| Export removed from index.ts | No test fails, consumers break | Tests use relative imports | MED | AC-14 + exports.test.ts |

### The Real Question

**Reframed after spec review:** The goal is NOT "100% line coverage." The goal is **behavioral confidence in the library's consent lifecycle, privacy boundaries, and consumer API surface**, with 100% line coverage as a side-effect validation metric.

The spec now prioritizes:
1. P0: Integration tests for composition bugs (consent round-trip, DNT isolation, PII, exports)
2. P1: Unit tests for uncovered branches
3. P2: SSR coverage via node env + thresholds

### Open Items

- [risk] `sendEvent` is a stub — tests prove logging, not delivery -> no action (documented in Risks)
- [question] Default-allow model: intentional for non-EU? -> no action (documented, separate work)
- [question] Consent TTL/expiry: intentional omission? -> no action (out of scope)
- [risk] AC-18 (cookie regex) and AC-19 (DNT truthiness) may reveal source code bugs that need fixing -> kill criteria updated

## Notes

Spec review applied: 2026-03-05. Perspectives: Testing Architect, Library Consumer, Privacy/Compliance Engineer, Skeptic.

**Known issues to file after testing:**
- `disableAnalytics()` does not clear `userId`/`traits` (PII persistence)
- `getConsentFromCookie` regex vulnerable to substring match (if AC-18 confirms)
- DNT OR-chain truthiness bug (if AC-19 confirms)
- Consent reversal on storage failure (AC-10 confirms architectural gap)

## Progress

| # | Scope Item | Status | Iteration |
|---|-----------|--------|-----------|
| 1 | Consent lifecycle round-trip test | [x] Complete | 1 |
| 2 | DNT fallback isolation tests | [x] Complete | 1 |
| 3 | PII persistence test | [x] Complete | 1 |
| 4 | Entry-point export smoke tests | [x] Complete | 1 |
| 5 | Event-loss documentation test | [x] Complete | 1 |
| 6 | analytics.ts unit coverage gaps | [x] Complete | 1 |
| 7 | consent.ts storage failure tests | [x] Complete | 1 |
| 8 | consent.ts DNT unit tests | [x] Complete | 1 |
| 9 | Adversarial cookie regex test | [x] Complete | 1 |
| 10 | react.tsx coverage gaps | [x] Complete | 1 |
| 11 | SSR test file (node env) | [x] Complete | 1 |
| 12 | Coverage thresholds in vitest config | [x] Complete | 1 |
| 13 | Verify 100% coverage | [ ] Blocked | monorepo deps needed |

## Timeline

| Action | Timestamp | Duration | Notes |
|--------|-----------|----------|-------|
| plan | 2026-03-05T00:00:00Z | - | Created |
| spec-review | 2026-03-05T00:00:00Z | - | 4 perspectives: Testing Architect, Library Consumer, Privacy/Compliance, Skeptic. Verdict: NOT_READY -> updated |
| spec-review merge | 2026-03-05T00:00:00Z | - | Added P0 integration ACs, SSR test file strategy, adversarial tests, revised estimate to 3h |
| ship | 2026-03-05T00:00:00Z | - | All test files written. 12/13 scope items complete. Pending: monorepo install + coverage verification. |
