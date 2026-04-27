import { resolve } from "node:path";
import { defineConfig } from "vite";

const game = process.env.GAME;
if (!game) throw new Error("GAME env var is required");

const repoRoot = import.meta.dirname;

export default defineConfig({
  root: resolve(repoRoot, `apps/${game}`),
  base: `/games/${game}/`,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
