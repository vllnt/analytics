# @vllnt/analytics

Lightweight, privacy-first analytics library with consent management and React integration.

## Features

- **Event tracking** with pre-init queuing (no lost events during hydration)
- **Consent management** — two categories (analytics + functional), localStorage + SSR cookie
- **Versioned consent** — bump version to re-prompt users
- **Do Not Track** — respects browser DNT setting
- **SSR-safe** — all browser APIs guarded
- **Zero external analytics dependencies** — bring your own backend (Vercel Analytics, GA, custom)

## Install

```bash
pnpm add @vllnt/analytics
```

Peer dependency: `react ^18.0.0 || ^19.0.0`

Ships ESM and CommonJS builds with type declarations; no bundler transpilation of `node_modules` is needed.

## For coding agents

The docs are bundled in the package at `node_modules/@vllnt/analytics/docs/` ([`docs/API.md`](docs/API.md)), together with
[`llms.txt`](llms.txt), `CHANGELOG.md` and the TypeScript sources in `src/`. They match the installed
version. Read them before writing code.

## Usage

### React Provider

```tsx
import { AnalyticsProvider } from "@vllnt/analytics/react";

// Keep config stable: the provider re-runs init when it changes.
const config = { app: "my-app", version: 1, debug: true };

function App() {
  return (
    <AnalyticsProvider config={config}>
      {children}
    </AnalyticsProvider>
  );
}
```

### Consent Banner

```tsx
import { useAnalytics } from "@vllnt/analytics/react";

// Render inside <AnalyticsProvider> so accepting starts tracking.
function CookieBanner() {
  const { hasResponded, isLoading, acceptAll, declineAnalytics } = useAnalytics();

  if (isLoading || hasResponded) return null;

  return (
    <div>
      <p>We use cookies for analytics.</p>
      <button onClick={acceptAll}>Accept</button>
      <button onClick={declineAnalytics}>Decline</button>
    </div>
  );
}
```

`useConsent()` exposes the same consent fields without a provider, but it only reads and writes
stored consent: it does not start or stop analytics.

### Track Events

```tsx
import { track, trackPage } from "@vllnt/analytics";

// Generic event
track("button_click", { id: "cta-hero" });

// Page view
trackPage({ path: "/about" });
```

### Tutorial Tracking

Typed helpers for tutorial/content flows:

```tsx
import {
  trackTutorialStart,
  trackSectionView,
  trackSectionComplete,
  trackTutorialComplete,
  trackTutorialNavigation,
  trackTimeSpent,
} from "@vllnt/analytics";

trackTutorialStart({
  tutorial_id: "getting-started",
  tutorial_title: "Getting Started",
  locale: "en",
  total_sections: 5,
});

trackSectionView({
  tutorial_id: "getting-started",
  tutorial_title: "Getting Started",
  locale: "en",
  section_id: "intro",
  section_index: 0,
  total_sections: 5,
});
```

### Identify Users

```tsx
import { identify, resetAnalytics } from "@vllnt/analytics";

// After login
identify("user-123", { plan: "pro" });

// After logout
resetAnalytics();
```

### Consent Utilities (non-React)

```ts
import {
  loadConsent,
  saveConsent,
  clearConsent,
  createAcceptAllConsent,
  createDeclineAnalyticsConsent,
  getConsentFromCookie,
  isDoNotTrackEnabled,
  needsRePrompt,
} from "@vllnt/analytics";

// SSR: read consent from cookie header
const analyticsAllowed = getConsentFromCookie(request.headers.get("cookie") ?? "");

// Check if re-prompt needed after version bump
const consent = loadConsent();
if (consent && needsRePrompt(consent, 2)) {
  clearConsent();
}
```

## API

Full reference with signatures and examples: [`docs/API.md`](docs/API.md).

### Core

| Function                    | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `initAnalytics(config)`     | Initialize analytics singleton                 |
| `track(name, properties?)`  | Track a custom event (empty names are ignored) |
| `trackPage(properties?)`    | Track a page view                              |
| `identify(userId, traits?)` | Identify a user (empty ids are ignored)        |
| `resetAnalytics()`          | Clear user identity (logout)                   |
| `enableAnalytics(config)`   | Re-enable after consent granted                |
| `disableAnalytics()`        | Disable after consent revoked                  |
| `isAnalyticsEnabled()`      | Check if tracking is active                    |

### Consent

| Function                                        | Description                              |
| ----------------------------------------------- | ---------------------------------------- |
| `loadConsent()`                                 | Load consent from localStorage           |
| `saveConsent(state)`                            | Persist consent to localStorage + cookie |
| `clearConsent()`                                | Remove consent (triggers re-prompt)      |
| `createAcceptAllConsent()`                      | Create accept-all consent state          |
| `createDeclineAnalyticsConsent()`               | Create analytics-declined state          |
| `updateConsentCategory(state, category, value)` | Update a single category                 |
| `needsRePrompt(consent, version)`               | Check if version requires re-prompt      |
| `getConsentFromCookie(cookieString)`            | Parse consent from cookie (SSR)          |
| `isDoNotTrackEnabled()`                         | Check browser DNT setting                |

### React (`@vllnt/analytics/react`)

| Export                 | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `AnalyticsProvider`    | Context provider — wires consent + analytics init |
| `useAnalytics()`       | Access full analytics context                     |
| `useConsent(options?)` | Standalone consent hook for banner UIs            |

## How It Works

```
AnalyticsProvider mounts
  │
  ├─ Stored consent outdated? ──▶ Clear it & re-prompt
  │
  ├─ Analytics accepted ──▶ initAnalytics()
  │    ├─ DNT enabled? ──▶ Block tracking
  │    └─ Otherwise ──▶ Start & flush queue
  │
  └─ Declined or no consent ──▶ No init; track() calls stay queued in memory
                                 (declineAnalytics() blocks and empties the queue)
```

Events fired before initialization are queued and flushed once consent is granted and analytics initializes.

## Scripts

```bash
pnpm test          # Run tests (watch mode)
pnpm test:once     # Run tests once
pnpm test:coverage # Run with coverage
pnpm lint          # Lint
pnpm lint:fix      # Lint + autofix
pnpm typecheck     # Type-check
pnpm build         # Build dist (ESM, CJS, types)
```

## Related packages

- [`@vllnt/convex-analytics`](https://www.npmjs.com/package/@vllnt/convex-analytics): a Convex
  component that stores events and serves rollups, funnels and retention. Use it as the backend if
  your app runs on Convex; this package does not send events to it for you.
- [`@vllnt/convex-consent`](https://www.npmjs.com/package/@vllnt/convex-consent): an append-only
  consent ledger stored in Convex. Use it when you need a server-side record of consent per
  subject and purpose; this package only keeps the visitor's choice in the browser.

## License

[MIT](LICENSE)

---

Part of vllnt oss: https://oss.vllnt.com
