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
  "Links",
  "License",
];

const FOOTER =
  "---\n\nPart of [vllnt open source](https://oss.vllnt.com) · [Package page](https://oss.vllnt.com/packages/analytics) · [vllnt.com](https://vllnt.com) · Built by [bntvllnt](https://bntvllnt.com)";

const ECOSYSTEM = `## Ecosystem

- [Package page](https://oss.vllnt.com/packages/analytics)
- [Release feed](https://oss.vllnt.com/packages/analytics/rss.xml)
- [All @vllnt packages](https://oss.vllnt.com/llms.txt)
- [Search vllnt packages and docs](https://index.vllnt.com)
- [vllnt](https://vllnt.com/llms.txt)
- [Author](https://bntvllnt.com)`;

const LINKS = `## Links

- Docs and changelog: [oss.vllnt.com/packages/analytics](https://oss.vllnt.com/packages/analytics) · [release feed](https://oss.vllnt.com/packages/analytics/rss.xml)
- All @vllnt packages: [oss.vllnt.com](https://oss.vllnt.com) · [search packages and docs on index.vllnt.com](https://index.vllnt.com)
- Source and issues: [GitHub](https://github.com/vllnt/analytics) · [issues](https://github.com/vllnt/analytics/issues)
- Questions and updates: [Discord](https://bntvllnt.com/discord) · [X @bntvllnt](https://x.com/bntvllnt)
- Company and author: [vllnt.com](https://vllnt.com) · [bntvllnt.com](https://bntvllnt.com) · [GitHub @bntvllnt](https://github.com/bntvllnt) · [LinkedIn](https://linkedin.com/in/bntvllnt)
- Sponsor: [GitHub Sponsors](https://github.com/sponsors/bntvllnt)`;

const DOCS = ["README.md", "docs/API.md"];

/** Marketing and recommendation words the docs must not use. */
const BANNED_WORDS =
  /\b(lightweight|blazing|powerful|seamless(ly)?|effortless(ly)?|robust|cutting-edge|best-in-class|world-class|best|recommend(ed|s)?|prefer(red|s)?|always use)\b/i;

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

  it("every export has one README API row, linked to its own entry in docs/API.md", () => {
    const api = read("docs/API.md");
    const apiAnchors = anchors("docs/API.md");
    expect(exportNames.length).toBeGreaterThan(30);
    for (const name of exportNames) {
      const rows = [
        ...readme.matchAll(
          new RegExp(
            `^\\| \\[\`${name}\`\\]\\(docs/API\\.md#([\\w-]+)\\)`,
            "gm",
          ),
        ),
      ];
      expect(rows, name).toHaveLength(1);
      const own = name.toLowerCase();
      if (apiAnchors.has(own)) expect(rows[0]?.[1], name).toBe(own);
      const documented = [
        `### \`${name}\``,
        `| \`${name}\``,
        `| \`${name}(`,
        `type ${name} =`,
      ].some((form) => api.includes(form));
      expect(documented, `${name} has no entry in docs/API.md`).toBe(true);
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

  it("initAnalytics, and only it, links the package page in TSDoc", () => {
    const see = "@see https://oss.vllnt.com/packages/analytics";
    const sources = readdirSync(join(root, "src"))
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => read(`src/${file}`));
    expect(sources.join("\n").split(see)).toHaveLength(2);

    const checker = program.getTypeChecker();
    const source = program.getSourceFile(join(installed, "dist", "index.d.ts"));
    const module = source && checker.getSymbolAtLocation(source);
    const exported = module
      ? checker
          .getExportsOfModule(module)
          .find((symbol) => symbol.name === "initAnalytics")
      : undefined;
    const target = exported && checker.getAliasedSymbol(exported);
    const tags = (target?.getJsDocTags(checker) ?? []).map(
      (tag) => `@${tag.name} ${ts.displayPartsToString(tag.text)}`,
    );
    expect(tags).toContain(see);
  });

  it("every thrown or logged error message is in the errors table", () => {
    const errors = readme.slice(
      readme.indexOf("## Errors and fixes"),
      readme.indexOf("## Limits and gotchas"),
    );
    const sources = readdirSync(join(root, "src")).filter((file) =>
      /\.tsx?$/.test(file),
    );
    const code = sources.map((file) => read(`src/${file}`)).join("\n");
    const calls = [...code.matchAll(/\bthrow\b|console\.(?:warn|error)\(/g)];
    const messages = [
      ...code.matchAll(
        /(?:throw new \w*Error|console\.(?:warn|error))\(\s*(["'`])([^"'`$]+)\1/g,
      ),
    ].map((match) => match[2]);
    expect(messages.length).toBeGreaterThan(0);
    expect(
      messages,
      "every throw and warning needs a literal message",
    ).toHaveLength(calls.length);
    for (const message of messages)
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

  it("README has the shared links section", () => {
    const links = readme.slice(
      readme.indexOf("## Links"),
      readme.indexOf("## License"),
    );
    expect(links.trimEnd()).toBe(LINKS);
  });

  it("README, package.json and llms.txt share one summary sentence", () => {
    const package_: unknown = JSON.parse(read("package.json"));
    const { description } = package_ as { description: unknown };
    const summaries = read("llms.txt")
      .split("\n")
      .filter((line) => line.startsWith("> "))
      .map((line) => line.slice(2));
    expect(summaries).toEqual([readmeLines[2]]);
    expect(description).toBe(readmeLines[2]);
  });

  it.each(["README.md", "docs/API.md", "llms.txt"])(
    "%s has descriptive link text and image alt text",
    (file) => {
      for (const match of read(file).matchAll(/(!?)\[([^\]]*)\]\(/g)) {
        const [whole, image, text = ""] = match;
        if (image) expect(text.trim(), `${file}: ${whole}`).not.toBe("");
        else
          expect(text.trim().toLowerCase(), `${file}: ${whole}`).not.toBe(
            "here",
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

  it("package.json and repository metadata follow the discovery rules", () => {
    const package_: unknown = JSON.parse(read("package.json"));
    expect(package_).toMatchObject({
      author: { name: "bntvllnt", url: "https://bntvllnt.com" },
      bugs: { url: "https://github.com/vllnt/analytics/issues" },
      funding: { type: "github", url: "https://github.com/sponsors/bntvllnt" },
      homepage: "https://oss.vllnt.com/packages/analytics",
    });
    const { description, keywords } = package_ as {
      description: unknown;
      keywords: unknown;
    };
    expect(typeof description).toBe("string");
    const text = String(description);
    expect(text.length).toBeLessThanOrEqual(160);
    expect(text).toMatch(/^[^.]+\.$/);
    expect(text).not.toMatch(/vllnt projects/i);
    expect(text).toMatch(/React/);
    expect(Array.isArray(keywords)).toBe(true);
    const list = Array.isArray(keywords) ? keywords : [];
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.length).toBeLessThanOrEqual(12);
    expect(new Set(list).size).toBe(list.length);
  });

  it.each(["README.md", "docs/API.md", "llms.txt", "package.json"])(
    "%s uses no marketing or recommendation words",
    (file) => {
      expect(read(file)).not.toMatch(BANNED_WORDS);
    },
  );

  it("no tracked or shipped file mentions the retired company domain", () => {
    const tracked = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\0")
      .filter((path) => path !== "" && !/\.(png|jpe?g|gif|ico)$/i.test(path));
    const shipped = [
      ...new Set([
        ...tracked,
        ...packed.filter((path) => !path.startsWith("dist/")),
      ]),
    ].map((path) => read(path));
    const built = readdirSync(join(installed, "dist")).map((file) =>
      readFileSync(join(installed, "dist", file), "utf8"),
    );
    for (const text of [...shipped, ...built])
      expect(text.toLowerCase()).not.toContain(RETIRED_DOMAIN);
  });
});
