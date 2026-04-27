# Games Monorepo

## Stack

- **Engine**: Kaplay.js (all games)
- **Build**: Vite + TypeScript
- **Package manager**: pnpm workspaces
- **Deploy**: GitHub Pages via GitHub Actions

## Structure

- `apps/<game>/` — each game is independent with its own `package.json` and
  `vite.config.ts`
- `packages/shared/` — shared utilities (touch, math)
- `home/` — landing page listing all games

## Commands

- `pnpm --filter <game> dev` — run one game locally
- `pnpm --filter <game> build` — build one game
- `pnpm -r build` — build all

## Adding a New Game

1. Create `apps/<name>/` with `package.json`, `tsconfig.json`, `vite.config.ts`,
   `index.html`, `src/main.ts`
2. Set `base: '/games/<name>/'` in `vite.config.ts`
3. Add a `favicon.svg` — see Favicon section below
4. Link the favicon in `index.html`:
   `<link rel="icon" type="image/svg+xml" href="./favicon.svg" />`
5. Run `pnpm --filter home run generate` to regenerate the home page (it picks
   up new games and their icons automatically)

## Conventions

- All games use Kaplay.js — do not introduce other game engines
- Each game MUST work offline in the browser
- Touch-first: all games MUST support touch input
- `touchToMouse: true` in Kaplay config for unified pointer handling
- Local storage or IndexedDB for persisting game state
- Canvas size: 480x720 default (portrait, mobile-friendly)

## Favicon

Every game MUST have a `favicon.svg` in its `apps/<name>/` directory. The home
page generator inlines these SVGs as icons next to each game title so kids can
recognize games visually.

Rules for favicon design:

- SVG format, 32x32 viewBox
- Dark rounded-rect background (`#16213e`, `rx="6"`) to match the site theme
- Simple, recognizable shapes that represent the game's core mechanic
- Bright, distinct colors — the icon should be identifiable at 16px in a browser
  tab
- No text — icons only
