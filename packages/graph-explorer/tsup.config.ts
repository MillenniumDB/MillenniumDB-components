import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  target: "esnext",
  sourcemap: true,
  external: ["react", "react-dom"],
});
