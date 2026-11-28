#!/usr/bin/env bash
#
# test-package.sh — install the packed tarball into a clean project and prove
# every entry point loads (ESM and CJS) and type-checks for strict consumers.
#
# Needs an existing dist/ (run `pnpm build` first) and an installed repo
# (react, @types/react and typescript versions come from node_modules).
#
# Stages:
#   1. pnpm pack into a temp dir outside the repo
#   2. pnpm add the tarball, react, react-dom, @types/react and typescript,
#      with the repo's release-age rule (minimumReleaseAge and
#      minimumReleaseAgeExclude from pnpm-workspace.yaml)
#   3. import every "exports" entry of the tarball's package.json (ESM)
#   4. require every "exports" entry (CJS)
#   5-7. tsc on a strict consumer: NodeNext ESM, NodeNext CJS (.d.cts),
#        Bundler with exactOptionalPropertyTypes
#
# Exit codes: 0 all stages passed, 1 a stage failed.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d dist ]] || [[ -z "$(ls -A dist)" ]]; then
  echo "error: dist/ is missing or empty; run 'pnpm build' first" >&2
  exit 1
fi

version_of() {
  node -p "require('$1/package.json').version" 2>/dev/null || {
    echo "error: $1 is not installed; run 'pnpm install --frozen-lockfile' first" >&2
    exit 1
  }
}
REACT_VERSION="$(version_of react)"
TYPES_REACT_VERSION="$(version_of @types/react)"
TS_VERSION="$(version_of typescript)"
if [[ "$REACT_VERSION" != 19.* || "$TYPES_REACT_VERSION" != 19.* ]]; then
  echo "error: expected react and @types/react 19.x, got $REACT_VERSION and $TYPES_REACT_VERSION" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
log="$tmp/log.txt"

# Runs a command quietly; prints its output only when it fails.
quiet() {
  if ! "$@" > "$log" 2>&1; then
    cat "$log" >&2
    return 1
  fi
}

fail() {
  echo "FAIL  $1" >&2
  exit 1
}

# 1. Pack
mkdir -p "$tmp/pack"
tarball="$tmp/pack/package.tgz"
quiet pnpm pack --out "$tarball" || fail "pnpm pack"
tar -xzOf "$tarball" package/package.json > "$tmp/pack/package.json"
PKG_NAME="$(node -p "require('$tmp/pack/package.json').name")"
echo "OK    pack: $(tar -tzf "$tarball" | wc -l | tr -d ' ') file(s)"

# 2. Clean consumer project
app="$tmp/app"
mkdir -p "$app"
printf '{ "name": "package-consumer", "private": true, "type": "module" }\n' > "$app/package.json"
# Apply the repo's release-age rule to this install: copy only the
# minimumReleaseAge and minimumReleaseAgeExclude keys from pnpm-workspace.yaml.
awk '/^[^[:space:]#]/ { keep = ($1 == "minimumReleaseAge:" || $1 == "minimumReleaseAgeExclude:") } keep' \
  "$ROOT/pnpm-workspace.yaml" > "$app/pnpm-workspace.yaml"
grep -q '^minimumReleaseAge: [0-9][0-9]*$' "$app/pnpm-workspace.yaml" \
  && grep -q '^minimumReleaseAgeExclude:' "$app/pnpm-workspace.yaml" \
  || fail "release-age keys missing from pnpm-workspace.yaml"
# PACKAGE_TEST_MIN_RELEASE_AGE (minutes) overrides the age, to prove the rule applies.
if [[ -n "${PACKAGE_TEST_MIN_RELEASE_AGE:-}" ]]; then
  [[ "$PACKAGE_TEST_MIN_RELEASE_AGE" =~ ^[0-9]+$ ]] || fail "PACKAGE_TEST_MIN_RELEASE_AGE must be a number of minutes"
  sed "s/^minimumReleaseAge: .*/minimumReleaseAge: $PACKAGE_TEST_MIN_RELEASE_AGE/" \
    "$app/pnpm-workspace.yaml" > "$tmp/workspace.yaml"
  mv "$tmp/workspace.yaml" "$app/pnpm-workspace.yaml"
fi
MIN_RELEASE_AGE="$(sed -n 's/^minimumReleaseAge: //p' "$app/pnpm-workspace.yaml")"
(
  cd "$app"
  quiet pnpm add "$tarball" \
    "react@$REACT_VERSION" "react-dom@$REACT_VERSION" \
    "@types/react@$TYPES_REACT_VERSION" "typescript@$TS_VERSION"
) || fail "pnpm add tarball into a clean project"
echo "OK    install: $PKG_NAME with react $REACT_VERSION, typescript $TS_VERSION (minimumReleaseAge $MIN_RELEASE_AGE)"

# Entry points come from the tarball's own package.json, so a file the
# exports map points at but the tarball lacks fails here.
ENTRIES="$(node -e '
  const pkg = require(process.argv[1]);
  console.log(JSON.stringify(Object.keys(pkg.exports || {})));
' "$tmp/pack/package.json")"
[[ "$ENTRIES" != "[]" ]] || fail "tarball package.json has no exports"

# 3. ESM import
cat > "$app/check.mjs" <<'EOF'
const [name, entriesJson] = process.argv.slice(2);
const entries = JSON.parse(entriesJson);
const loaded = {};
for (const key of entries) {
  const specifier = name + key.slice(1);
  loaded[key] = key.endsWith(".json")
    ? await import(specifier, { with: { type: "json" } })
    : await import(specifier);
  if (Object.keys(loaded[key]).length === 0) throw new Error(`${specifier} has no exports`);
}
if (typeof loaded["."]?.initAnalytics !== "function") throw new Error("initAnalytics missing from .");
if (loaded["."].initAnalytics !== loaded["./react"]?.initAnalytics) {
  throw new Error("initAnalytics from . and ./react are not the same function");
}
console.log(`OK    esm import: ${entries.join(", ")}; shared initAnalytics`);
EOF
(cd "$app" && node check.mjs "$PKG_NAME" "$ENTRIES") || fail "esm import"

# 4. CJS require
cat > "$app/check.cjs" <<'EOF'
const [name, entriesJson] = process.argv.slice(2);
const entries = JSON.parse(entriesJson);
const loaded = {};
for (const key of entries) {
  const specifier = name + key.slice(1);
  loaded[key] = require(specifier);
  if (Object.keys(loaded[key]).length === 0) throw new Error(`${specifier} has no exports`);
}
if (typeof loaded["."]?.initAnalytics !== "function") throw new Error("initAnalytics missing from .");
if (loaded["."].initAnalytics !== loaded["./react"]?.initAnalytics) {
  throw new Error("initAnalytics from . and ./react are not the same function");
}
console.log(`OK    cjs require: ${entries.join(", ")}; shared initAnalytics`);
EOF
(cd "$app" && node check.cjs "$PKG_NAME" "$ENTRIES") || fail "cjs require"

# 5-7. Strict consumer type-check
cat > "$tmp/consumer.ts" <<EOF
import {
  getConsentFromCookie,
  initAnalytics,
  track,
  type AnalyticsConfig,
  type ConsentState,
  type UseConsentReturn,
} from "$PKG_NAME";
import {
  AnalyticsProvider,
  initAnalytics as initAnalyticsFromReact,
  useAnalytics,
  useConsent,
} from "$PKG_NAME/react";

const config: AnalyticsConfig = { app: "consumer", debug: false };
const init: typeof initAnalytics = initAnalyticsFromReact;
init(config);
track("signup", { plan: "free" });
// @ts-expect-error event names must be strings
track(42);

const allowed: boolean | null = getConsentFromCookie("vllnt-consent=1");
const providerProps: Parameters<typeof AnalyticsProvider>[0] = {
  children: null,
  config,
  consentVersion: 2,
};

export function useBanner(): UseConsentReturn {
  const consent: ConsentState | null = useAnalytics().consent;
  void consent;
  return useConsent({ consentVersion: 2 });
}

export { allowed, providerProps };
EOF

typecheck() {
  local label="$1" dir="$2" module="$3" resolution="$4" exact="$5" want="$6"
  mkdir -p "$dir"
  cp "$tmp/consumer.ts" "$dir/consumer.ts"
  cat > "$dir/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "$module",
    "moduleResolution": "$resolution",
    "strict": true,
    "skipLibCheck": false,
    "exactOptionalPropertyTypes": $exact,
    "noEmit": true
  },
  "files": ["consumer.ts"]
}
EOF
  (cd "$dir" && quiet "$app/node_modules/.bin/tsc" -p tsconfig.json --listFiles) \
    || fail "typecheck $label"
  # Prove which declaration files were resolved for both entry points.
  local f
  for f in index react; do
    grep -q "/dist/$f$want\$" "$log" || fail "typecheck $label: dist/$f$want not resolved"
  done
  echo "OK    typecheck $label: strict, dist/{index,react}$want"
}

typecheck "NodeNext ESM" "$app/esm" NodeNext NodeNext false .d.ts
mkdir -p "$app/cjs"
printf '{ "type": "commonjs" }\n' > "$app/cjs/package.json"
typecheck "NodeNext CJS" "$app/cjs" NodeNext NodeNext false .d.cts
typecheck "Bundler exactOptionalPropertyTypes" "$app/bundler" ESNext Bundler true .d.ts

echo "OK    test-package.sh"
