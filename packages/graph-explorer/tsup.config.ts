import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  target: "esnext",
  sourcemap: true,
  external: ["react", "react-dom"],
  clean: true,
  loader: {
    ".css": "local-css", // This is the magic line
  },
});
