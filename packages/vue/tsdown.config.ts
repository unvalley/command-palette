import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  deps: {
    neverBundle: ["vue"],
    alwaysBundle: ["@command-palette/core"],
  },
})
