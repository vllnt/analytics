// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";

import { build } from "tsup";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../tsup.config";

/**
 * Enforces the agent-first docs contract: README layout, complete and
 * type-checked examples, documented exports and errors, resolving links, and
 * the shared footer and ecosystem links.
 */
const root = resolve(__dirname, "../..");
const read = (file: string): string => readFileSync(join(root, file), "utf8");

const SECTIONS = [
  "For coding agents",
  "When to use",
  "Install",
  "Quick start",
  "API",
  "Common tasks",
  "Errors and fixes",
  "Limits and gotchas",
  "Compatibility",
  "Testing",
  "Security",
  "Related packages",
  "Contributing",
  "License",
];

const FOOTER =
  "---\n\nPart of [vllnt open source](https://oss.vllnt.com) · [Package page](https://oss.vllnt.com/packages/analytics) · [vllnt.com](https://vllnt.com) · Built by [bntvllnt](https://bntvllnt.com)";

const ECOSYSTEM = `## Ecosystem

- [Package page](https://oss.vllnt.com/packages/analytics)
- [All @vllnt packages](https://oss.vllnt.com/llms.txt)
- [vllnt](https://vllnt.com/llms.txt)
- [Author](https://bntvllnt.com)`;

const DOCS = ["README.md", "docs/API.md"];

/** Built at runtime so the domain itself never appears in the repository. */
const RETIRED_DOMAIN = ["vllnt", "ai"].join(".");

type CodeBlock = { code: string; end: number; file: string; lang: string };

/** Fenced code blocks with their language and the 1-based closing line. */
function codeBlocks(file: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let open: undefined | { lang: string; lines: string[] };
  for (const [index, line] of read(file).split("\n").entries()) {
    if (!line.startsWith("```")) {
      open?.lines.push(line);
      continue;
    }
    if (open) {
      blocks.push({
        code: open.lines.join("\n"),
        end: index + 1,
        file,
        lang: open.lang,
      });
      open = undefined;
    } else {
      open = { lang: line.slice(3).trim(), lines: [] };
    }
  }
  if (open) throw new Error(`${file} has an unclosed code block`);
  return blocks;
}

/** GitHub heading anchors of a Markdown file. */
function anchors(file: string): Set<string> {
  const seen = new Map<string, number>();
  const result = new Set<string>();
  const text = read(file).replaceAll(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = (match[1] ?? "")
      .trim()
      .toLowerCase()
      .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
      .replaceAll(" ", "-");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    result.add(count === 0 ? base : `${base}-${count}`);
  }
  return result;
}

/** Relative link targets of a doc file, as [path, anchor]. */
function relativeLinks(file: string): [string, string][] {
  const links: [string, string][] = [];
  for (const match of read(file).matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1] ?? "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const [path = "", anchor = ""] = target.split("#");
    links.push([
      path ? posix.normalize(posix.join(dirname(file), path)) : file,
      anchor,
    ]);
  }
  return links;
}

/** Paths `npm pack` would publish. */
function packedFiles(): string[] {
  const output = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const report: unknown = JSON.parse(output);
  if (!Array.isArray(report))
    throw new TypeError("npm pack report is not a list");
  const [first]: unknown[] = report;
  if (
    typeof first !== "object" ||
    first === null ||
    !("files" in first) ||
    !Array.isArray(first.files)
  ) {
    throw new TypeError("npm pack report has no file list");
  }
  const entries: unknown[] = first.files;
  return entries.map((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("path" in entry) ||
      typeof entry.path !== "string"
    ) {
      throw new TypeError("npm pack file entry has no path");
    }
    return entry.path;
  });
}

const project = mkdtempSync(join(tmpdir(), "vllnt-analytics-docs-"));
const installed = join(project, "node_modules/@vllnt/analytics");

describe("agent-first docs", () => {
  const readme = read("README.md");
  const readmeLines = readme.split("\n");
  let program: ts.Program;
  let exportNames: string[] = [];
  let packed: string[] = [];

  beforeAll(async () => {
    if (Array.isArray(config) || typeof config === "function") {
      throw new TypeError("tsup.config.ts must export a single options object");
    }
    await build({ ...config, outDir: join(installed, "dist"), silent: true });
    cpSync(join(root, "package.json"), join(installed, "package.json"));
    mkdirSync(join(project, "node_modules/@types"), { recursive: true });
    symlinkSync(
      join(root, "node_modules/react"),
      join(project, "node_modules/react"),
      "dir",
    );
    symlinkSync(
      join(root, "node_modules/@types/react"),
      join(project, "node_modules/@types/react"),
      "dir",
    );

    const examples: string[] = [];
    for (const file of DOCS) {
      for (const [index, block] of codeBlocks(file).entries()) {
        if (block.lang !== "ts" && block.lang !== "tsx") continue;
        const name = join(
          project,
          `${file.replaceAll(/\W/g, "_")}_${index}.${block.lang}`,
        );
        writeFileSync(name, block.code);
        examples.push(name);
      }
    }
    const entries = ["index.d.ts", "react.d.ts"].map((file) =>
      join(installed, "dist", file),
    );
    program = ts.createProgram([...examples, ...entries], {
      jsx: ts.JsxEmit.ReactJSX,
      lib: ["lib.es2024.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
      module: ts.ModuleKind.ESNext,
      moduleDetection: ts.ModuleDetectionKind.Force,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
      types: [],
    });
    const checker = program.getTypeChecker();
    const names = new Set<string>();
    for (const entry of entries) {
      const source = program.getSourceFile(entry);
      const symbol = source && checker.getSymbolAtLocation(source);
      if (!symbol) throw new Error(`no module symbol for ${entry}`);
      for (const exported of checker.getExportsOfModule(symbol))
        names.add(exported.name);
    }
    exportNames = [...names].toSorted();
    packed = packedFiles();
  }, 180_000);

  afterAll(() => {
    rmSync(project, { force: true, recursive: true });
  });

  it("README has the shared sections in order", () => {
    expect(readmeLines[0]).toBe("# @vllnt/analytics");
    expect(readmeLines[2]).toMatch(/^[A-Z].+\.$/);
    const sections = readmeLines
      .filter((line) => line.startsWith("## "))
      .map((line) => line.slice(3));
    expect(sections).toEqual(SECTIONS);
  });

  it("README has the install command and the quick start in the first 40 lines", () => {
    expect(readmeLines.indexOf("pnpm add @vllnt/analytics")).toBeLessThan(40);
    const quickStart = readmeLines.indexOf("## Quick start");
    const first = codeBlocks("README.md").find(
      (block) => block.end > quickStart,
    );
    expect(first?.lang).toBe("tsx");
    expect(first?.end).toBeLessThanOrEqual(40);
  });

  it.each(DOCS)("every code block in %s has a language and no gaps", (file) => {
    for (const block of codeBlocks(file)) {
      expect(block.lang, `${file}:${block.end}`).not.toBe("");
      expect(block.code, `${file}:${block.end}`).not.toMatch(
        /^\s*(\/\/\s*)?(\.\.\.|…)\s*$/m,
      );
    }
  });

  it("README and API examples type-check against the built package", () => {
    const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => {
      const where = diagnostic.file
        ? diagnostic.file.fileName.replace(project, "")
        : "";
      return `${where}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    });
    expect(diagnostics).toEqual([]);
  });

  it("every export is in the README API table and in docs/API.md", () => {
    const api = read("docs/API.md");
    expect(exportNames.length).toBeGreaterThan(30);
    for (const name of exportNames) {
      expect(readme, name).toMatch(
        new RegExp(`^\\| \\[\`${name}\`\\]\\(docs/API\\.md#[\\w-]+\\)`, "m"),
      );
      expect(api, name).toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it("every export has a TSDoc summary in the built declarations", () => {
    const checker = program.getTypeChecker();
    const missing: string[] = [];
    for (const file of ["index.d.ts", "react.d.ts"]) {
      const source = program.getSourceFile(join(installed, "dist", file));
      const symbol = source && checker.getSymbolAtLocation(source);
      for (const exported of symbol ? checker.getExportsOfModule(symbol) : []) {
        const target =
          exported.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(exported)
            : exported;
        if (
          ts
            .displayPartsToString(target.getDocumentationComment(checker))
            .trim() === ""
        ) {
          missing.push(exported.name);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("the main entry links its package page in the built declarations", () => {
    const declarations = readdirSync(join(installed, "dist"))
      .filter((file) => file.endsWith(".d.ts"))
      .map((file) => readFileSync(join(installed, "dist", file), "utf8"))
      .join("\n");
    expect(declarations).toContain(
      "@see https://oss.vllnt.com/packages/analytics",
    );
  });

  it("every thrown or logged error message is in the errors table", () => {
    const errors = readme.slice(
      readme.indexOf("## Errors and fixes"),
      readme.indexOf("## Limits and gotchas"),
    );
    const sources = readdirSync(join(root, "src")).filter((file) =>
      /\.tsx?$/.test(file),
    );
    const messages = sources.flatMap((file) => [
      ...read(`src/${file}`).matchAll(
        /(?:throw new \w*Error|console\.(?:warn|error))\(\s*"([^"]+)"/g,
      ),
    ]);
    expect(messages.length).toBeGreaterThan(0);
    for (const [, message] of messages)
      expect(errors).toContain(`| \`${message}\` |`);
  });

  it.each(["README.md", "docs/API.md", "llms.txt"])(
    "relative links and anchors in %s resolve",
    (file) => {
      for (const [path, anchor] of relativeLinks(file)) {
        expect(packed, `${file} -> ${path}`).toContain(path);
        if (anchor)
          expect(anchors(path), `${file} -> ${path}#${anchor}`).toContain(
            anchor,
          );
      }
    },
  );

  it("README ends with the shared footer", () => {
    expect(readme.trimEnd().endsWith(FOOTER)).toBe(true);
  });

  it("llms.txt ends with the ecosystem block and names the package index once", () => {
    const llms = read("llms.txt");
    expect(llms.trimEnd().endsWith(ECOSYSTEM)).toBe(true);
    expect(llms.split("https://oss.vllnt.com/llms.txt")).toHaveLength(2);
  });

  it("no shipped file mentions the retired company domain", () => {
    const shipped = packed
      .filter((path) => !path.startsWith("dist/"))
      .map((path) => read(path));
    const built = readdirSync(join(installed, "dist")).map((file) =>
      readFileSync(join(installed, "dist", file), "utf8"),
    );
    for (const text of [...shipped, ...built])
      expect(text.toLowerCase()).not.toContain(RETIRED_DOMAIN);
  });
});
