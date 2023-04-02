import { defineConfig } from "rollup";

import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const plugins = [typescript(), terser()];

export default defineConfig({
  input: "src/index.ts",
  output: {
    file: "dist/pwebm-helper.js",
    format: "cjs",
  },
  plugins,
});