import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./index.ts"],
  format: ["cjs"],
  outDir: "dist",
  clean: true,
  platform: "node",
  target: "node24",
  deps: {
    alwaysBundle: ["@actions/core", "@actions/github", "@actions/cache"],
  },
});
