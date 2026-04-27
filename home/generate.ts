import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface GameMeta {
  name: string;
  displayName: string;
  description: string;
  icon: string;
}

const base = process.argv[2] ?? "/";
const appsDir = join(import.meta.dirname, "..", "apps");

const games: GameMeta[] = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => {
    if (!d.isDirectory()) return false;
    try {
      readFileSync(join(appsDir, d.name, "package.json"));
      return true;
    } catch {
      return false;
    }
  })
  .map((d) => {
    const pkg = JSON.parse(
      readFileSync(join(appsDir, d.name, "package.json"), "utf-8"),
    );
    const iconPath = join(appsDir, d.name, "favicon.svg");
    const icon = existsSync(iconPath)
      ? readFileSync(iconPath, "utf-8").trim()
      : "";
    return {
      name: pkg.name,
      displayName: pkg.displayName ?? pkg.name,
      description: pkg.description ?? "",
      icon,
    };
  })
  .sort((a, b) => a.displayName.localeCompare(b.displayName));

const cards = games
  .map(
    (g) => `      <a class="game-card" href="${base}${g.name}/">
        ${g.icon ? `<div class="game-icon">${g.icon}</div>` : ""}
        <div class="game-info">
          <h2>${g.displayName}</h2>
          <p>${g.description}</p>
        </div>
      </a>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <title>Games</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        background: #1a1a2e;
        color: #e0e0e0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
      }
      h1 {
        font-size: 2rem;
        margin-bottom: 2rem;
        color: #fff;
      }
      .games {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1.5rem;
        width: 100%;
        max-width: 800px;
      }
      .game-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: #16213e;
        border-radius: 12px;
        padding: 1rem 1.25rem;
        text-decoration: none;
        color: #e0e0e0;
        transition: transform 0.2s, background 0.2s;
      }
      .game-card:hover {
        transform: translateY(-4px);
        background: #1a2a4e;
      }
      .game-icon {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
      }
      .game-icon svg {
        width: 100%;
        height: 100%;
      }
      .game-info {
        min-width: 0;
      }
      .game-card h2 {
        font-size: 1.1rem;
        color: #fff;
      }
      .game-card p {
        font-size: 0.85rem;
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <h1>Games</h1>
    <div class="games">
${cards}
    </div>
  </body>
</html>
`;

const outPath = join(import.meta.dirname, "index.html");
writeFileSync(outPath, html);
console.log(`Generated ${outPath} with ${games.length} games`);
