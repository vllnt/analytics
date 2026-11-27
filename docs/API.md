# @vllnt/analytics API

Reference for every public export of this package version, written from `src/index.ts` and
`src/react.tsx`. Those sources ship in this package under `src/`.

The library has no transport. Events are queued and gated by consent, then dropped; with
`debug: true` they are written to `console.log`. Send them to your own backend yourself.

## Entry points

Only these subpaths are exported (`package.json` `exports`). Each has ESM, CommonJS and type
declarations in `dist/`.

| Import                       | Contents                                                     |
| ---------------------------- | ------------------------------------------------------------ |
| `@vllnt/analytics`           | Tracking functions, consent functions and constants, types   |
| `@vllnt/analytics/react`     | `AnalyticsProvider`, `useAnalytics`, `useConsent`, `initAnalytics` |
| `@vllnt/analytics/package.json` | Package metadata                                          |

Types are exported from `@vllnt/analytics` only. Both entry points share one analytics state, so
`initAnalytics` from `./react` and `track` from `.` act on the same instance.

Peer dependency: `react` `^18.0.0 || ^19.0.0` (used by `./react` only).

All browser APIs are guarded, so importing on the server is safe. On the server `track`,
`trackPage`, `identify` and `resetAnalytics` return early, and consent readers return `null` or
`false`. `initAnalytics`, `enableAnalytics` and `disableAnalytics` have no server guard:
`initAnalytics` on the server starts the process-wide instance, so call it only in the browser.

## Tracking (`@vllnt/analytics`)

### `initAnalytics(config: AnalyticsConfig): void`

Starts the shared analytics instance and flushes queued events. Later calls do nothing while an
instance exists. It does not start, and blocks tracking, when Do Not Track is on (`"1"` or
`"yes"`) or stored consent has `analytics: false`; already queued events are kept, not flushed.
With no stored consent it starts, so call it only after the user accepts if you need opt-in
(`AnalyticsProvider` does this for you). Once tracking is blocked (by a blocked init or by
`disableAnalytics`), calling `initAnalytics` again does not unblock it; only `enableAnalytics`
does.

```ts
import { initAnalytics } from "@vllnt/analytics";

initAnalytics({ app: "my-app", version: 1, debug: true });
```

### `track(name: string, properties?: Record<string, unknown>): void`

Records a custom event. Before `initAnalytics` the event is queued; while blocked it is dropped.
An empty or non-string `name` is ignored.

```ts
track("button_click", { id: "cta-hero" });
```

### `trackPage(properties?: Record<string, unknown>): void`

Records a page view, queued before init like `track`.

```ts
trackPage({ path: "/about" });
```

### `identify(userId: string, traits?: Record<string, unknown>): void`

Stores a user id and traits on the started instance. Ignored before init, while blocked, or
when `userId` is empty or not a string. Not queued.

```ts
identify("user-123", { plan: "pro" });
```

### `resetAnalytics(): void`

Clears the stored user id and traits (for logout). The instance stays started.

```ts
resetAnalytics();
```

### `enableAnalytics(config: AnalyticsConfig): void`

Unblocks, discards the current instance and runs `initAnalytics(config)` again. Does nothing
unless tracking is currently blocked, and does nothing while Do Not Track is on. Because it
re-reads stored consent, save the accepted consent first: a stored `analytics: false` blocks it
again. The new instance has no `userId` or `traits`.

```ts
saveConsent(createAcceptAllConsent());
enableAnalytics({ app: "my-app" });
```

### `disableAnalytics(): void`

Blocks tracking and empties the queue after consent is revoked. It keeps the in-memory user id
and traits; call `resetAnalytics()` or reload the page to clear them.

```ts
disableAnalytics();
resetAnalytics();
```

### `isAnalyticsEnabled(): boolean`

`true` when the instance has started and is not blocked.

```ts
if (isAnalyticsEnabled()) track("export_clicked");
```

### `getAnalyticsState()`

Returns the current instance state for debugging, or `undefined` before init. Shape:
`{ app: string; debug?: boolean; version?: number; userId?: string; traits?: Record<string, unknown> }`.
The state type is not exported.

```ts
console.log(getAnalyticsState()?.userId);
```

### Tutorial helpers

Typed wrappers around `track` that send fixed event names (`TutorialEventName`). Every helper
needs `tutorial_id`, `tutorial_title` and `locale`.

| Function                              | Event name                  | Extra required fields              |
| ------------------------------------- | --------------------------- | ---------------------------------- |
| `trackTutorialStart(properties)`      | `tutorial_start`            | none (`section_id` not allowed)    |
| `trackSectionView(properties)`        | `tutorial_section_view`     | none                               |
| `trackSectionComplete(properties)`    | `tutorial_section_complete` | none                               |
| `trackTutorialComplete(properties)`   | `tutorial_complete`         | none (`section_id` not allowed)    |
| `trackTutorialNavigation(properties)` | `tutorial_navigation`       | `navigation_type`                  |
| `trackTimeSpent(properties)`          | `tutorial_time_spent`       | `time_spent_seconds`               |

```ts
import { trackSectionView, trackTutorialNavigation } from "@vllnt/analytics";

const base = { tutorial_id: "intro", tutorial_title: "Intro", locale: "en" };
trackSectionView({ ...base, section_id: "setup", section_index: 0, total_sections: 5 });
trackTutorialNavigation({ ...base, section_id: "setup", navigation_type: "next" });
```

## Consent (`@vllnt/analytics`)

Consent is stored as JSON in `localStorage` under `CONSENT_STORAGE_KEY` and mirrored to the
`CONSENT_COOKIE_NAME` cookie (`1` allowed, `0` declined; one-year expiry, `path=/`,
`SameSite=Lax`) so the server can read it.

### Constants

| Name                  | Value                        |
| --------------------- | ---------------------------- |
| `CONSENT_VERSION`     | `1`                          |
| `CONSENT_STORAGE_KEY` | `"vllnt:analytics-consent"`  |
| `CONSENT_COOKIE_NAME` | `"vllnt-consent"`            |

### `loadConsent(): ConsentState | null`

Reads and validates stored consent. `null` when none, invalid, or storage is unavailable.

```ts
const consent = loadConsent();
```

### `saveConsent(state: ConsentState): void`

Writes consent to `localStorage` and the cookie. Does nothing when storage is unavailable.

```ts
saveConsent(createAcceptAllConsent());
```

### `clearConsent(): void`

Removes stored consent and expires the cookie.

```ts
clearConsent();
```

### `createAcceptAllConsent(): ConsentState`

New state with `analytics: true`, `functional: true`, the current time and `CONSENT_VERSION`.

```ts
const accepted = createAcceptAllConsent();
```

### `createDeclineAnalyticsConsent(): ConsentState`

New state with `analytics: false`, `functional: true`, the current time and `CONSENT_VERSION`.

```ts
const declined = createDeclineAnalyticsConsent();
```

### `updateConsentCategory(current: ConsentState, category: ConsentCategory, value: boolean): ConsentState`

Returns a copy with one category changed and a new timestamp. Setting `functional` to `false`
returns `current` unchanged.

```ts
const stored = loadConsent();
if (stored) saveConsent(updateConsentCategory(stored, "analytics", false));
```

### `needsRePrompt(consent: ConsentState, currentVersion: number): boolean`

`true` when `consent.version < currentVersion`.

```ts
if (consent && needsRePrompt(consent, 2)) clearConsent();
```

### `getConsentFromCookie(cookieString: string): boolean | null`

Parses a `Cookie` header: `true` for `1`, `false` for any other value, `null` when the cookie is
absent. The name must start the string or follow `;`, so `evil-vllnt-consent=1` does not match.

```ts
const allowed = getConsentFromCookie(request.headers.get("cookie") ?? "");
```

### `isDoNotTrackEnabled(): boolean`

Reads `navigator.doNotTrack`, then `window.doNotTrack`, then `navigator.msDoNotTrack`, and
returns `true` when the first one that is set equals `"1"` or `"yes"`. `false` on the server.

```ts
if (isDoNotTrackEnabled()) hideBanner();
```

### `isStorageAvailable(): boolean`

`true` when `localStorage` can be written. `false` on the server or when storage throws.

```ts
if (!isStorageAvailable()) console.warn("consent will not persist");
```

### `isValidConsentState(value: unknown): value is ConsentState`

Type guard: checks the four fields and their types.

```ts
const parsed: unknown = JSON.parse(raw);
if (isValidConsentState(parsed)) saveConsent(parsed);
```

## React (`@vllnt/analytics/react`)

The ESM build (`dist/react.js`) starts with `"use client"`.

Both `AnalyticsProvider` and `useConsent` read stored consent during the first render. On the
server that read returns `null`, so `consent` is `null` and `hasResponded` is `false` there, while
the first browser render may already see stored consent. If you render a banner from
`hasResponded`, render it only after the component has mounted to avoid a hydration mismatch.

### `AnalyticsProvider`

```ts
function AnalyticsProvider(props: {
  children: ReactNode;
  config: AnalyticsConfig;
  consentVersion?: number; // default CONSENT_VERSION
}): React.JSX.Element;
```

Reads stored consent, clears it when `needsRePrompt(stored, consentVersion)`, and calls
`initAnalytics(config)` while consent has `analytics: true`. Its context actions save consent and
call `enableAnalytics` or `disableAnalytics`. Pass a stable `config` (for example a module
constant), because the init effect depends on it.

With stored `analytics: false`, the provider does not call `initAnalytics`, so tracking is not
blocked after a reload: `track()` calls are queued in memory and are flushed if the user accepts
later. Call `disableAnalytics()` yourself if events from a declined visitor must be dropped.

```tsx
const config = { app: "my-app", version: 1 };

export function Root({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider config={config}>{children}</AnalyticsProvider>;
}
```

### `useAnalytics()`

Returns the provider context; throws `useAnalytics must be used within an AnalyticsProvider`
outside one. Fields: `config`, `consent`, `hasResponded`, `isLoading` (always `false`),
`acceptAll()`, `declineAnalytics()`, `updateConsent(category, value)`, `resetConsent()`.
`updateConsent` does nothing while `consent` is `null` (before the user has responded).

```tsx
function CookieBanner() {
  const { hasResponded, acceptAll, declineAnalytics } = useAnalytics();
  if (hasResponded) return null;
  return (
    <div>
      <button onClick={acceptAll}>Accept</button>
      <button onClick={declineAnalytics}>Decline</button>
    </div>
  );
}
```

### `useConsent(options?: UseConsentOptions): UseConsentReturn`

Standalone consent state with the same fields as `useAnalytics()` except `config`. It reads and
writes stored consent only: it does not start or stop analytics and does not share state with
`AnalyticsProvider`. Inside a provider, use `useAnalytics()` for a banner so accepting starts
tracking.

```tsx
const { consent, updateConsent } = useConsent({ consentVersion: 1 });
```

### `initAnalytics`

Re-export of the core `initAnalytics`, for apps that only import from `./react`.

### Consent version caveat

`createAcceptAllConsent()` and `createDeclineAnalyticsConsent()` always write
`CONSENT_VERSION` (`1`), and the hooks use them. With `consentVersion` above `1`, the stored
consent is older than the requested version on every mount, so it is cleared and the user is
asked again each visit.

## Types (`@vllnt/analytics`)

```ts
type AnalyticsConfig = { app: string; debug?: boolean; version?: number };

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
};

type ConsentCategory = "analytics" | "functional";

type ConsentState = {
  analytics: boolean;
  functional: boolean;
  timestamp: string; // ISO time of the choice
  version: number;
};

type TutorialEventName =
  | "tutorial_complete"
  | "tutorial_navigation"
  | "tutorial_section_complete"
  | "tutorial_section_view"
  | "tutorial_start"
  | "tutorial_time_spent";

type TutorialEventProperties = {
  tutorial_id: string;
  tutorial_title: string;
  locale: string;
  completion_percent?: number; // 0-100
  navigation_type?: "keyboard" | "next" | "prev" | "toc";
  section_id?: string;
  section_index?: number; // 0-based
  time_spent_seconds?: number;
  total_sections?: number;
};

type UseConsentOptions = { consentVersion?: number };

type UseConsentReturn = {
  acceptAll: () => void;
  consent: ConsentState | null;
  declineAnalytics: () => void;
  hasResponded: boolean;
  isLoading: boolean;
  resetConsent: () => void;
  updateConsent: (category: ConsentCategory, value: boolean) => void;
};
```
