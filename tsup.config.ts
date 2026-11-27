import { readFile, writeFile } from "node:fs/promises";

import { defineConfig, type Options } from "tsup";

const USE_CLIENT = '"use client";';

type TsupPlugin = NonNullable<Options["plugins"]>[number];

/**
 * tsup's CommonJS splitting step inserts helper functions on the first line,
 * before the code, so a `"use client"` directive from the source ends up after
 * them and is no longer a directive. This moves it back to the start of each
 * CommonJS file whose first line has it. ESM output already keeps it first.
 * No newline is added, so line numbers do not shift.
 */
const hoistUseClientInCjs: TsupPlugin = {
  async buildEnd({ writtenFiles }) {
    if (this.format !== "cjs") return;
    for (const { name } of writtenFiles) {
      if (!name.endsWith(".cjs")) continue;
      const code = await readFile(name, "utf8");
      const firstLine = code.split("\n", 1)[0] ?? "";
      const at = firstLine.indexOf(USE_CLIENT);
      if (at <= 0) continue;
      await writeFile(
        name,
        USE_CLIENT + code.slice(0, at) + code.slice(at + USE_CLIENT.length),
      );
    }
  },
  name: "hoist-use-client-in-cjs",
};

export default defineConfig({
  clean: true,
  dts: true,
  entry: { index: "src/index.ts", react: "src/react.tsx" },
  external: ["react"],
  format: ["esm", "cjs"],
  plugins: [hoistUseClientInCjs],
  // Shared chunks keep the module-level analytics state a singleton across
  // both entry points, in ESM and in CJS.
  splitting: true,
});
