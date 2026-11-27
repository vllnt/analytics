import { readFile, writeFile } from "node:fs/promises";

import { defineConfig, type Options } from "tsup";

const USE_CLIENT = '"use client";';

type TsupPlugin = NonNullable<Options["plugins"]>[number];

/**
 * tsup's CommonJS splitting step inserts helper functions before the code,
 * so a `"use client"` directive from the source ends up after them and is no
 * longer a directive. This moves it back to the start of each CommonJS file
 * that contains it. ESM output already keeps it first.
 */
const hoistUseClientInCjs: TsupPlugin = {
  async buildEnd({ writtenFiles }) {
    if (this.format !== "cjs") return;
    for (const { name } of writtenFiles) {
      if (!name.endsWith(".cjs")) continue;
      const code = await readFile(name, "utf8");
      if (!code.includes(USE_CLIENT) || code.startsWith(USE_CLIENT)) continue;
      await writeFile(name, `${USE_CLIENT}\n${code.replace(USE_CLIENT, "")}`);
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
