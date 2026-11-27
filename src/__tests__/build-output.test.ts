// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { build } from "tsup";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../tsup.config";

/**
 * Builds the JavaScript with the real tsup config and checks the directive
 * prologue of each output file, so the result is proven on built files.
 */
const outputDirectory = mkdtempSync(join(tmpdir(), "vllnt-analytics-build-"));

/** String directives at the start of a file, in order. */
function directives(file: string): string[] {
  const code = readFileSync(join(outputDirectory, file), "utf8");
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.JS,
  );
  const found: string[] = [];
  for (const statement of source.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    ) {
      break;
    }
    found.push(statement.expression.text);
  }
  return found;
}

describe("built output", () => {
  let files: string[] = [];

  beforeAll(async () => {
    if (Array.isArray(config) || typeof config === "function") {
      throw new TypeError("tsup.config.ts must export a single options object");
    }
    await build({
      ...config,
      dts: false,
      outDir: outputDirectory,
      silent: true,
    });
    files = readdirSync(outputDirectory).filter((file) => /\.c?js$/.test(file));
  }, 120_000);

  afterAll(() => {
    rmSync(outputDirectory, { force: true, recursive: true });
  });

  it.each(["react.js", "react.cjs"])(
    '%s starts with the "use client" directive',
    (file) => {
      expect(directives(file)).toContain("use client");
    },
  );

  it('only the react entry is marked "use client"', () => {
    const marked = files.filter((file) =>
      directives(file).includes("use client"),
    );
    expect(marked.toSorted()).toEqual(["react.cjs", "react.js"]);
  });
});
