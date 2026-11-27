// @vitest-environment node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * Checks what `npm pack` would publish, so agents reading
 * node_modules/@vllnt/analytics/ always find docs that match the version.
 */
const root = resolve(__dirname, "../..");

const required = [
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "llms.txt",
  "src/index.ts",
  "src/react.tsx",
  "docs/API.md",
];

/** Contributor and internal files must never ship. */
const forbidden = [
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^CONTRIBUTING\.md$/,
  /^SECURITY\.md$/,
  /^specs\//,
  /^scripts\//,
  /^\.github\//,
  /__tests__\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
];

/** Paths `npm pack` would publish, read from its `--json` report. */
function packedFiles(): string[] {
  const output = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const report: unknown = JSON.parse(output);
  if (!Array.isArray(report)) throw new Error("npm pack report is not a list");
  const [result]: unknown[] = report;
  if (
    typeof result !== "object" ||
    result === null ||
    !("files" in result) ||
    !Array.isArray(result.files)
  ) {
    throw new Error("npm pack report has no file list");
  }
  const entries: unknown[] = result.files;
  return entries.map((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("path" in entry) ||
      typeof entry.path !== "string"
    ) {
      throw new Error("npm pack file entry has no path");
    }
    return entry.path;
  });
}

describe("published package contents", () => {
  let files: string[] = [];

  beforeAll(() => {
    files = packedFiles();
  }, 60_000);

  it.each(required)("ships %s", (path) => {
    expect(files).toContain(path);
  });

  it("ships no contributor, internal or test files", () => {
    expect(
      files.filter((path) => forbidden.some((pattern) => pattern.test(path))),
    ).toEqual([]);
  });
});
