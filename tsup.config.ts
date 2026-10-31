import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: { index: "src/index.ts", react: "src/react.tsx" },
  external: ["react"],
  format: ["esm", "cjs"],
  // Shared chunks keep the module-level analytics state a singleton across
  // both entry points, in ESM and in CJS.
  splitting: true,
});
