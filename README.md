# Games

A collection of browser games for kids. Built with [Kaplay.js][kaplay], bundled
with [Vite][vite], deployed to [GitHub Pages][site].

## Games

- **Caro** — get five in a row on an infinite board
- **Light Up** — remember which cells light up
- **Match 3** — swap gems to match three or more in a row
- **Sliding Puzzle** — unscramble the picture by sliding tiles

## Development

```sh
pnpm install
pnpm dev           # all games + home page
pnpm --filter caro dev  # single game
```

See `AGENTS.md` for project conventions and instructions on adding new games.

[kaplay]: https://kaplayjs.com/
[vite]: https://vite.dev/
[site]: https://letientai299.github.io/games/
