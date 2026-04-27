import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const appsDir = resolve(import.meta.dirname, "apps");
const apps = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const appSet = new Set(apps);

export default defineConfig({
  root: ".",
  appType: "mpa",
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
});
