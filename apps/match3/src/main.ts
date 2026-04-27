import kaplay from "kaplay";
import {
  COLS,
  ROWS,
  CELL_SIZE,
  BOARD_PADDING,
  BOARD_TOP,
  GEM_NAMES,
  NUM_GEMS,
  HIGH_SCORE_KEY,
  gridToPixel,
  decodePos,
  type GridPos,
} from "./constants";
import {
  createBoard,
  swapCells,
  findMatches,
  scoreMatches,
  applyGravity,
  fillEmpty,
  isDeadlocked,
  type Board,
} from "./board";
import {
  createGem,
  animateSwap,
  animateDestroy,
  animateFall,
  type GemObj,
} from "./gem";

// Load sprites as Vite assets for correct URL resolution
import pikachuUrl from "./assets/pikachu.png";
import arcanineUrl from "./assets/arcanine.png";
import laprasUrl from "./assets/lapras.png";
import oddishUrl from "./assets/oddish.png";
import gengarUrl from "./assets/gengar.png";
import wigglytuffUrl from "./assets/wigglytuff.png";
import dewgongUrl from "./assets/dewgong.png";

const SPRITE_URLS: Record<string, string> = {
  pikachu: pikachuUrl,
  arcanine: arcanineUrl,
  lapras: laprasUrl,
  oddish: oddishUrl,
  gengar: gengarUrl,
  wigglytuff: wigglytuffUrl,
  dewgong: dewgongUrl,
};

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const k = kaplay({
  width: 480,
  height: 720,
  background: [26, 26, 46],
  touchToMouse: true,
  stretch: true,
  letterbox: true,
  pixelDensity: devicePixelRatio,
  canvas,
});

for (const name of GEM_NAMES) {
  k.loadSprite(name, SPRITE_URLS[name]);
}

// ── Game scene ──────────────────────────────────────────────

k.scene("game", () => {
  let board: Board;
  let gems: (GemObj | null)[][];
  let selected: GridPos | null = null;
  let locked = false;
  let score = 0;

  // Generate a board that isn't deadlocked
  function initBoard() {
    do {
      board = createBoard((choices) => k.choose(choices));
    } while (isDeadlocked(board));
  }

  // UI
  const scoreLabel = k.add([
    k.text("Score: 0", { size: 28 }),
    k.pos(BOARD_PADDING, 20),
    k.color(255, 255, 255),
    k.z(10),
  ]);

  const highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0");
  k.add([
    k.text(`Best: ${highScore}`, { size: 20 }),
    k.pos(480 - BOARD_PADDING, 24),
    k.anchor("topright"),
    k.color(180, 180, 180),
    k.z(10),
  ]);

  // Board background
  k.add([
    k.rect(COLS * CELL_SIZE, ROWS * CELL_SIZE, { radius: 8 }),
    k.pos(BOARD_PADDING, BOARD_TOP),
    k.color(40, 40, 70),
    k.z(0),
  ]);

  // Checkerboard pattern for visual clarity
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 === 0) {
        k.add([
          k.rect(CELL_SIZE, CELL_SIZE),
          k.pos(BOARD_PADDING + c * CELL_SIZE, BOARD_TOP + r * CELL_SIZE),
          k.color(50, 50, 80),
          k.opacity(0.3),
          k.z(0),
        ]);
      }
    }
  }

  // Selection highlight
  let highlight: ReturnType<typeof k.add> | null = null;

  function showHighlight(pos: GridPos) {
    if (highlight) highlight.destroy();
    const { x, y } = gridToPixel(pos.col, pos.row);
    highlight = k.add([
      k.rect(CELL_SIZE - 2, CELL_SIZE - 2, { radius: 6 }),
      k.pos(x, y),
      k.anchor("center"),
      k.color(255, 255, 100),
      k.opacity(0.35),
      k.z(2),
    ]);
  }

  function clearHighlight() {
    if (highlight) {
      highlight.destroy();
      highlight = null;
    }
    selected = null;
  }

  // Create gem objects from board data
  function spawnAllGems() {
    gems = [];
    for (let r = 0; r < ROWS; r++) {
      gems[r] = [];
      for (let c = 0; c < COLS; c++) {
        gems[r][c] = createGem(k, c, r, board[r][c]);
      }
    }
  }

  // Input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  k.onClick("gem", (clicked: any) => {
    const gem = clicked as GemObj;
    if (locked) return;
    const pos: GridPos = { row: gem.gridRow, col: gem.gridCol };

    if (!selected) {
      selected = pos;
      showHighlight(pos);
      return;
    }

    const dr = Math.abs(pos.row - selected.row);
    const dc = Math.abs(pos.col - selected.col);

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      handleSwap(selected, pos);
    } else {
      selected = pos;
      showHighlight(pos);
    }
  });

  async function handleSwap(a: GridPos, b: GridPos) {
    locked = true;
    clearHighlight();

    const gemA = gems[a.row][a.col]!;
    const gemB = gems[b.row][b.col]!;

    // Animate swap
    await animateSwap(k, gemA, gemB);

    // Swap in data + object arrays
    swapCells(board, a, b);
    gems[a.row][a.col] = gemB;
    gems[b.row][b.col] = gemA;
    gemA.gridRow = b.row;
    gemA.gridCol = b.col;
    gemB.gridRow = a.row;
    gemB.gridCol = a.col;

    const matches = findMatches(board);
    if (matches.size === 0) {
      // Invalid — swap back
      await animateSwap(k, gemA, gemB);
      swapCells(board, a, b);
      gems[a.row][a.col] = gemA;
      gems[b.row][b.col] = gemB;
      gemA.gridRow = a.row;
      gemA.gridCol = a.col;
      gemB.gridRow = b.row;
      gemB.gridCol = b.col;
      locked = false;
      return;
    }

    await processCascades(matches);

    if (isDeadlocked(board)) {
      saveHighScore();
      k.go("gameover", { score });
      return;
    }

    locked = false;
  }

  async function processCascades(initial: Set<number>) {
    let matches = initial;
    let multiplier = 1;

    while (matches.size > 0) {
      score += scoreMatches(matches) * multiplier;
      scoreLabel.text = `Score: ${score}`;
      multiplier++;

      // Destroy matched gems
      const destroyPromises: Promise<void>[] = [];
      for (const enc of matches) {
        const { row, col } = decodePos(enc);
        const gem = gems[row][col];
        if (gem) {
          destroyPromises.push(animateDestroy(k, gem));
          gems[row][col] = null;
          board[row][col] = -1;
        }
      }
      await Promise.all(destroyPromises);

      // Gravity
      const moves = applyGravity(board);
      const fallPromises: Promise<void>[] = [];

      for (const mv of moves) {
        const gem = gems[mv.fromRow][mv.col]!;
        gems[mv.fromRow][mv.col] = null;
        gems[mv.toRow][mv.col] = gem;
        gem.gridCol = mv.col;
        fallPromises.push(animateFall(k, gem, mv.toRow, mv.toRow - mv.fromRow));
      }

      // Fill empty cells with new gems
      const newGems = fillEmpty(board, () => k.randi(0, NUM_GEMS));
      for (const ng of newGems) {
        // Start above visible board
        const gem = createGem(k, ng.col, -(ng.row + 1), ng.type);
        gem.gridCol = ng.col;
        gems[ng.row][ng.col] = gem;
        fallPromises.push(animateFall(k, gem, ng.row, ng.row + 1));
      }

      await Promise.all(fallPromises);

      matches = findMatches(board);
    }
  }

  function saveHighScore() {
    const prev = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0");
    if (score > prev) localStorage.setItem(HIGH_SCORE_KEY, String(score));
  }

  // Init
  initBoard();
  spawnAllGems();
});

// ── Game Over scene ─────────────────────────────────────────

k.scene("gameover", ({ score }: { score: number }) => {
  const best = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0");

  k.add([
    k.text("No More Moves!", { size: 36 }),
    k.pos(k.center().x, 200),
    k.anchor("center"),
    k.color(255, 120, 120),
  ]);

  k.add([
    k.text(`Score: ${score}`, { size: 40 }),
    k.pos(k.center().x, 300),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  if (score >= best) {
    k.add([
      k.text("New Best!", { size: 24 }),
      k.pos(k.center().x, 350),
      k.anchor("center"),
      k.color(255, 215, 0),
    ]);
  } else {
    k.add([
      k.text(`Best: ${best}`, { size: 24 }),
      k.pos(k.center().x, 350),
      k.anchor("center"),
      k.color(180, 180, 180),
    ]);
  }

  const btn = k.add([
    k.rect(220, 60, { radius: 12 }),
    k.pos(k.center().x, 460),
    k.anchor("center"),
    k.color(70, 130, 70),
    k.area(),
  ]);

  k.add([
    k.text("Play Again", { size: 26 }),
    k.pos(k.center().x, 460),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  btn.onClick(() => k.go("game"));
});

// Start
k.go("game");
