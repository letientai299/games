import { readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";

const gitSha = execSync("git rev-parse --short HEAD").toString().trim();

const appsDir = resolve(import.meta.dirname, "apps");
const apps = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const appSet = new Set(apps);

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "VITE_");
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(",").map((h) => h.trim())
    : [];

  return {
    root: ".",
    base: command === "build" ? "/games/" : "/",
    appType: "mpa",
    define: {
      __GIT_SHA__: JSON.stringify(gitSha),
    },
    plugins: [
      {
        name: "dev-routing",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            const url = req.url ?? "";
            if (url === "/" || url === "/index.html") {
              req.url = "/home/index.html";
            } else {
              const match = url.match(/^\/([^/]+)(\/.*)?$/);
              if (match && appSet.has(match[1])) {
                const name = match[1];
                const rest = match[2] ?? "/";
                req.url = `/apps/${name}${rest === "/" ? "/index.html" : rest}`;
              }
            }
            next();
          });
        },
      },
    ],
    server: {
      open: "/",
      allowedHosts,
    },
    build: {
      rollupOptions: {
        input: {
          home: resolve(import.meta.dirname, "home/index.html"),
          ...Object.fromEntries(
            apps.map((name) => [
              name,
              resolve(import.meta.dirname, `apps/${name}/index.html`),
            ]),
          ),
        },
      },
    },
  };
});
