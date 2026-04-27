import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

const game = process.env.GAME;
if (!game) throw new Error("GAME env var is required");

const repoRoot = import.meta.dirname;
const gitSha = execSync("git rev-parse --short HEAD", { cwd: repoRoot })
  .toString()
  .trim();

export default defineConfig({
  root: resolve(repoRoot, `apps/${game}`),
  base: `/games/${game}/`,
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
