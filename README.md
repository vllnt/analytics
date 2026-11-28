# @vllnt/analytics

Cookie consent state and consent-gated event tracking for React and TypeScript, with Do Not Track and an SSR consent cookie.

## For coding agents

Version-matched docs ship in the package: [`docs/API.md`](docs/API.md), [`llms.txt`](llms.txt),
`CHANGELOG.md` and the TypeScript sources in `src/`. Read them before writing code.

## When to use

- Use it when a React app needs cookie-banner state stored in `localStorage` and a cookie.
- Use it when tracking calls must wait for consent and stop on Do Not Track or a decline.
- Use it when server code must read the visitor's choice from the `Cookie` header.
- Do not use it when events must reach a backend: it sends nothing; use your analytics vendor's SDK.
- Do not use it for a server-side consent record: use [`@vllnt/convex-consent`](https://oss.vllnt.com/packages/convex-consent).

## Install

```bash
pnpm add @vllnt/analytics
```

## Quick start

```tsx
import { track } from "@vllnt/analytics";
import { AnalyticsProvider, useAnalytics } from "@vllnt/analytics/react";

const config = { app: "my-app" };

function Banner() {
  const { hasResponded, acceptAll, declineAnalytics } = useAnalytics();
  return hasResponded ? null : <p><button onClick={acceptAll}>Accept</button><button onClick={declineAnalytics}>Decline</button></p>;
}

export const App = () => (
  <AnalyticsProvider config={config}><Banner /><button onClick={() => track("cta_click")}>Buy</button></AnalyticsProvider>
);
```

## API

Every public export. Full signatures and examples: [`docs/API.md`](docs/API.md).

| Export | Entry | What it does |
| --- | --- | --- |
| [`initAnalytics`](docs/API.md#initanalytics) | `.`, `./react` | Starts the shared instance and flushes queued events, unless blocked. |
| [`track`](docs/API.md#track) | `.` | Records a custom event; queued before init, dropped while blocked. |
| [`trackPage`](docs/API.md#trackpage) | `.` | Records a page view, queued before init like `track`. |
| [`identify`](docs/API.md#identify) | `.` | Stores a user id and traits on the started instance. |
| [`resetAnalytics`](docs/API.md#resetanalytics) | `.` | Clears the user id and traits (logout). |
| [`enableAnalytics`](docs/API.md#enableanalytics) | `.` | Unblocks after consent is granted and starts again. |
| [`disableAnalytics`](docs/API.md#disableanalytics) | `.` | Blocks tracking and empties the queue. |
| [`isAnalyticsEnabled`](docs/API.md#isanalyticsenabled) | `.` | `true` when started and not blocked. |
| [`getAnalyticsState`](docs/API.md#getanalyticsstate) | `.` | Current instance state, for debugging. |
| [`trackTutorialStart`](docs/API.md#tutorial-helpers) | `.` | Tracks a `tutorial_start` event. |
| [`trackSectionView`](docs/API.md#tutorial-helpers) | `.` | Tracks a `tutorial_section_view` event. |
| [`trackSectionComplete`](docs/API.md#tutorial-helpers) | `.` | Tracks a `tutorial_section_complete` event. |
| [`trackTutorialComplete`](docs/API.md#tutorial-helpers) | `.` | Tracks a `tutorial_complete` event. |
| [`trackTutorialNavigation`](docs/API.md#tutorial-helpers) | `.` | Tracks a `tutorial_navigation` event. |
| [`trackTimeSpent`](docs/API.md#tutorial-helpers) | `.` | Tracks a `tutorial_time_spent` event. |
| [`CONSENT_VERSION`](docs/API.md#constants) | `.` | Default consent version, `1`. |
| [`CONSENT_STORAGE_KEY`](docs/API.md#constants) | `.` | `localStorage` key, `"vllnt:analytics-consent"`. |
| [`CONSENT_COOKIE_NAME`](docs/API.md#constants) | `.` | Cookie name, `"vllnt-consent"`. |
| [`loadConsent`](docs/API.md#loadconsent) | `.` | Reads and validates stored consent, or `null`. |
| [`saveConsent`](docs/API.md#saveconsent) | `.` | Writes consent to `localStorage` and the cookie. |
| [`clearConsent`](docs/API.md#clearconsent) | `.` | Removes stored consent and expires the cookie. |
| [`createAcceptAllConsent`](docs/API.md#createacceptallconsent) | `.` | New consent state with everything accepted. |
| [`createDeclineAnalyticsConsent`](docs/API.md#createdeclineanalyticsconsent) | `.` | New consent state with analytics declined. |
| [`updateConsentCategory`](docs/API.md#updateconsentcategory) | `.` | Copy of a consent state with one category changed. |
| [`needsRePrompt`](docs/API.md#needsreprompt) | `.` | `true` when stored consent is older than a version. |
| [`getConsentFromCookie`](docs/API.md#getconsentfromcookie) | `.` | Parses the consent cookie from a `Cookie` header. |
| [`isDoNotTrackEnabled`](docs/API.md#isdonottrackenabled) | `.` | `true` when the browser sends Do Not Track. |
| [`isStorageAvailable`](docs/API.md#isstorageavailable) | `.` | `true` when `localStorage` can be written. |
| [`isValidConsentState`](docs/API.md#isvalidconsentstate) | `.` | Type guard for a stored consent object. |
| [`AnalyticsProvider`](docs/API.md#analyticsprovider) | `./react` | Context provider that wires consent to tracking. |
| [`useAnalytics`](docs/API.md#useanalytics) | `./react` | Provider context: consent state and actions. |
| [`useConsent`](docs/API.md#useconsent) | `./react` | Standalone consent state; does not start tracking. |
| [`AnalyticsConfig`](docs/API.md#types) | `.` (type) | `{ app; debug?; version? }`. |
| [`AnalyticsEvent`](docs/API.md#types) | `.` (type) | A queued event: name, properties, timestamp. |
| [`ConsentCategory`](docs/API.md#types) | `.` (type) | `"analytics" \| "functional"`. |
| [`ConsentState`](docs/API.md#types) | `.` (type) | Stored consent: categories, timestamp, version. |
| [`TutorialEventName`](docs/API.md#types) | `.` (type) | Event names used by the tutorial helpers. |
| [`TutorialEventProperties`](docs/API.md#types) | `.` (type) | Properties for the tutorial helpers. |
| [`UseConsentOptions`](docs/API.md#types) | `.` (type) | `{ consentVersion? }`. |
| [`UseConsentReturn`](docs/API.md#types) | `.` (type) | Return value of `useConsent`. |

## Common tasks

### Show the banner only after mount

Stored consent is read in the browser only, so on the server `hasResponded` is `false`. Render the
banner after mount to avoid a hydration mismatch.

```tsx
import { useEffect, useState } from "react";
import { useAnalytics } from "@vllnt/analytics/react";

export function CookieBanner() {
  const { hasResponded, acceptAll, declineAnalytics } = useAnalytics();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || hasResponded) return null;
  return (
    <div>
      <button onClick={acceptAll}>Accept</button>
      <button onClick={declineAnalytics}>Decline</button>
    </div>
  );
}
```

### Read consent on the server

```ts
import { getConsentFromCookie } from "@vllnt/analytics";

export function GET(request: Request): Response {
  const allowed = getConsentFromCookie(request.headers.get("cookie") ?? "");
  return Response.json({ allowed });
}
```

### Ask every visitor again after a policy change

Raise `consentVersion`. Stored choices with a lower version are cleared once; new choices are saved
with the new version.

```tsx
import type { ReactNode } from "react";
import { AnalyticsProvider } from "@vllnt/analytics/react";

const config = { app: "my-app" };

export function Root({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider config={config} consentVersion={2}>
      {children}
    </AnalyticsProvider>
  );
}
```

### Let the visitor change their choice later

```tsx
import { useAnalytics } from "@vllnt/analytics/react";

export function PrivacySettings() {
  const { consent, updateConsent, resetConsent } = useAnalytics();
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={consent?.analytics ?? false}
          onChange={(event) => updateConsent("analytics", event.target.checked)}
        />
        Analytics
      </label>
      <button onClick={resetConsent}>Ask me again</button>
    </div>
  );
}
```

### Track page views, users and tutorials

```ts
import { identify, resetAnalytics, trackPage, trackSectionView } from "@vllnt/analytics";

trackPage({ path: "/about" });

identify("user-123", { plan: "pro" });
resetAnalytics();

trackSectionView({
  tutorial_id: "getting-started",
  tutorial_title: "Getting Started",
  locale: "en",
  section_id: "intro",
  section_index: 0,
  total_sections: 5,
});
```

### Use it without React

```ts
import {
  createAcceptAllConsent,
  createDeclineAnalyticsConsent,
  disableAnalytics,
  enableAnalytics,
  initAnalytics,
  loadConsent,
  saveConsent,
} from "@vllnt/analytics";

const config = { app: "my-app" };

// A stored accept starts tracking; a stored decline blocks it and drops queued events.
if (loadConsent()) initAnalytics(config);

export function onAccept(): void {
  saveConsent(createAcceptAllConsent());
  enableAnalytics(config);
  initAnalytics(config);
}

export function onDecline(): void {
  saveConsent(createDeclineAnalyticsConsent());
  disableAnalytics();
}
```

## Errors and fixes

The package has no error codes. These are every message it throws or logs as a warning.

| Message | Kind | Cause | Fix |
| --- | --- | --- | --- |
| `useAnalytics must be used within an AnalyticsProvider` | thrown by `useAnalytics()` | The hook ran outside `<AnalyticsProvider>`. | Render the component inside `<AnalyticsProvider>`, or use `useConsent()`. |
| `Failed to save consent:` | `console.warn` from `saveConsent()` | Writing `localStorage` or the cookie threw, for example a full quota. | The new choice applies on this page but is not stored, so later visits load the earlier stored choice, if any. A failed accept over a stored decline stays blocked on this page too, because `initAnalytics` re-reads the stored decline. Free storage, or call `clearConsent()` after a failed save. |

## Limits and gotchas

- No transport and no event callback: events never leave the page. With `debug: true` they are
  logged with `console.log` as `[analytics:track]`, `[analytics:page]` and similar.
- Before the visitor responds, `track()` and `trackPage()` are queued in memory with no size
  limit. The first unblocked `initAnalytics()` flushes them; a decline or a Do Not Track block drops
  them. After `resetConsent()`, tracking is blocked and events are dropped until the visitor
  responds again.
- `identify()` before init or while blocked does nothing; it is not queued.
- `track()` with an empty or non-string name and `identify()` with an empty or non-string id do
  nothing.
- `initAnalytics()` runs once: later calls, and later `config` values, are ignored while an
  instance exists. Pass a stable `config` (a module constant) to `AnalyticsProvider`.
- Once blocked, only `enableAnalytics()` unblocks. It re-reads stored consent, so save the accepted
  consent first, and it does nothing while Do Not Track (`"1"` or `"yes"`) is on.
- `disableAnalytics()` keeps the user id and traits; call `resetAnalytics()` to clear them.
- On the server, `track`, `trackPage`, `identify` and `resetAnalytics` do nothing and `loadConsent`
  returns `null`. `initAnalytics` has no server guard: call it only in the browser.
- When `localStorage` is unavailable, `saveConsent` and `clearConsent` do nothing, so the choice
  lasts for the current page only.
- `updateConsent("functional", false)` is ignored: functional consent is always on.
  `updateConsent` does nothing while `consent` is `null`.
- `useConsent()` reads and writes stored consent only; it does not start or stop tracking and does
  not share state with `AnalyticsProvider`.
- `isLoading` is always `false`.
- The cookie is `vllnt-consent=1` or `vllnt-consent=0`, with a one-year expiry, `path=/` and
  `SameSite=Lax`, and without `Secure` or `HttpOnly`.

```text
AnalyticsProvider mounts
  ├─ Stored consent older than consentVersion ──▶ cleared, banner shown again
  ├─ Analytics accepted ──▶ initAnalytics()
  │    ├─ Do Not Track on ──▶ blocked, queue dropped
  │    └─ otherwise ──▶ started, queue flushed
  ├─ Analytics declined ──▶ disableAnalytics(); track() calls dropped
  └─ No consent yet ──▶ no init; track() calls queued in memory
```

## Compatibility

- React: peer range `^18.0.0 || ^19.0.0`, used by `./react` only.
- Module formats: ESM and CommonJS, with type declarations for both, from `dist/`.
- `./react` starts with `"use client"` in both builds; the core entry does not, so server code can
  import it.
- Runtimes: browsers for tracking and consent storage. Server runtimes can import every entry point;
  there, use `getConsentFromCookie` to read consent.

## Testing

The analytics state is a module-level singleton with no public reset. In your tests, clear
`localStorage` between cases and load the module fresh when a case needs a new instance.

This repository's own checks: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (Vitest with
jsdom, 100% coverage gate), `pnpm build` and `pnpm test:package` (installs the packed tarball in a
clean project with the repo's release-age rule, and imports and type-checks every entry point).

## Security

Report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/vllnt/analytics/security/advisories/new). Releases
are published from CI with npm trusted publishing and provenance.

## Related packages

None: no other @vllnt package is used together with this one in code.

## Contributing

See [CONTRIBUTING.md](https://github.com/vllnt/analytics/blob/main/CONTRIBUTING.md). Setup:
`pnpm install`, then `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm test:package`.

## Links

- Docs and changelog: [oss.vllnt.com/packages/analytics](https://oss.vllnt.com/packages/analytics) · [release feed](https://oss.vllnt.com/packages/analytics/rss.xml)
- All @vllnt packages: [oss.vllnt.com](https://oss.vllnt.com) · [search packages and docs on index.vllnt.com](https://index.vllnt.com)
- Source and issues: [GitHub](https://github.com/vllnt/analytics) · [issues](https://github.com/vllnt/analytics/issues)
- Questions and updates: [Discord](https://bntvllnt.com/discord) · [X @bntvllnt](https://x.com/bntvllnt)
- Company and author: [vllnt.com](https://vllnt.com) · [bntvllnt.com](https://bntvllnt.com) · [GitHub @bntvllnt](https://github.com/bntvllnt) · [LinkedIn](https://linkedin.com/in/bntvllnt)
- Sponsor: [GitHub Sponsors](https://github.com/sponsors/bntvllnt)

## License

[MIT](LICENSE)

---

Part of [vllnt open source](https://oss.vllnt.com) · [Package page](https://oss.vllnt.com/packages/analytics) · [vllnt.com](https://vllnt.com) · Built by [bntvllnt](https://bntvllnt.com)
