// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * Checks what `npm pack` would publish, so agents reading
 * node_modules/@vllnt/analytics/ always find docs that match the version.
 */
const root = resolve(__dirname, "../..");

const documentFiles = readdirSync(join(root, "docs"))
  .filter((name) => name.endsWith(".md"))
  .map((name) => `docs/${name}`);

const required = [
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "llms.txt",
  "src/index.ts",
  "src/react.tsx",
  ...documentFiles,
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
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
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

function relativeLinks(file: string): string[] {
  const text = readFileSync(join(root, file), "utf8");
  const links: string[] = [];
  for (const match of text.matchAll(/\]\(([^)\s#]*)[^)\s]*\)/g)) {
    const target = match[1];
    if (target && !/^[a-z]+:/i.test(target)) {
      links.push(posix.normalize(posix.join(dirname(file), target)));
    }
  }
  return links;
}

describe("published package contents", () => {
  let files: string[] = [];

  beforeAll(() => {
    files = packedFiles();
  }, 60_000);

  it("ships docs/API.md", () => {
    expect(documentFiles).toContain("docs/API.md");
  });

  it.each(required)("ships %s", (path) => {
    expect(files).toContain(path);
  });

  it("ships no contributor, internal or test files", () => {
    expect(
      files.filter((path) => forbidden.some((pattern) => pattern.test(path))),
    ).toEqual([]);
  });

  it.each(["llms.txt", "README.md", ...documentFiles])(
    "relative links in %s resolve inside the package",
    (file) => {
      const missing = relativeLinks(file).filter(
        (target) => !files.includes(target),
      );
      expect(missing).toEqual([]);
    },
  );
});
