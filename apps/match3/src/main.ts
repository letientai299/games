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
  SAVE_KEY,
  gridToPixel,
  decodePos,
  type GridPos,
  type SaveData,
} from "./constants";
import {
  createBoard,
  swapCells,
  findMatches,
  findValidMove,
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
import {
  loadSounds,
  playMatchSound,
  playGameOverSound,
  playInvalidSound,
} from "./sound";

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
  texFilter: "linear",
  pixelDensity: devicePixelRatio,
  canvas,
});

for (const name of GEM_NAMES) {
  k.loadSprite(name, SPRITE_URLS[name]);
}
loadSounds(k);

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (
      data.board?.length === ROWS &&
      data.board[0]?.length === COLS &&
      typeof data.score === "number"
    )
      return data;
  } catch {
    /* corrupted save */
  }
  return null;
}

function writeSave(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// ── Title scene ─────────────────────────────────────────────

k.scene("title", () => {
  k.add([
    k.text("Pokemon Match", { size: 40 }),
    k.pos(k.center().x, 200),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  const best = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0");
  if (best > 0) {
    k.add([
      k.text(`Best: ${best}`, { size: 22 }),
      k.pos(k.center().x, 260),
      k.anchor("center"),
      k.color(180, 180, 180),
    ]);
  }

  const save = loadSave();

  function unlockAndGo(scene: string, args?: Record<string, unknown>) {
    if (k.audioCtx.state === "suspended") k.audioCtx.resume();
    k.go(scene, args);
  }

  // Home button
  const homeBtn = k.add([
    k.rect(50, 50, { radius: 10 }),
    k.pos(BOARD_PADDING, BOARD_PADDING),
    k.color(60, 60, 100),
    k.area(),
    k.z(10),
  ]);
  k.add([
    k.text("\u{1F3E0}", { size: 28 }),
    k.pos(BOARD_PADDING + 25, BOARD_PADDING + 25),
    k.anchor("center"),
    k.z(11),
  ]);
  homeBtn.onClick(() => {
    window.location.href = "/";
  });

  if (save) {
    // Continue saved game
    const contBtn = k.add([
      k.rect(260, 60, { radius: 14 }),
      k.pos(k.center().x, 380),
      k.anchor("center"),
      k.color(70, 130, 70),
      k.area(),
    ]);
    k.add([
      k.text(`\u{25B6}\u{FE0F}  Continue (${save.score})`, { size: 22 }),
      k.pos(k.center().x, 380),
      k.anchor("center"),
      k.color(255, 255, 255),
    ]);
    contBtn.onClick(() => unlockAndGo("game", { save }));

    // New game
    const newBtn = k.add([
      k.rect(260, 55, { radius: 14 }),
      k.pos(k.center().x, 460),
      k.anchor("center"),
      k.color(80, 80, 120),
      k.area(),
    ]);
    k.add([
      k.text("\u{1F504}  New Game", { size: 22 }),
      k.pos(k.center().x, 460),
      k.anchor("center"),
      k.color(200, 200, 200),
    ]);
    newBtn.onClick(() => {
      clearSave();
      unlockAndGo("game");
    });
  } else {
    // Play button
    const playBtn = k.add([
      k.rect(260, 70, { radius: 14 }),
      k.pos(k.center().x, 420),
      k.anchor("center"),
      k.color(70, 130, 70),
      k.area(),
    ]);
    k.add([
      k.text("\u{25B6}\u{FE0F}  Play", { size: 30 }),
      k.pos(k.center().x, 420),
      k.anchor("center"),
      k.color(255, 255, 255),
    ]);
    playBtn.onClick(() => unlockAndGo("game"));
  }
});

// ── Game scene ──────────────────────────────────────────────

k.scene("game", (args?: { save?: SaveData }) => {
  const save = args?.save ?? null;

  let board: Board;
  let gems: (GemObj | null)[][];
  let selected: GridPos | null = null;
  let locked = false;
  let score = save?.score ?? 0;

  // Streak bonus: consecutive successful swaps without invalid moves or long pauses
  const STREAK_TIMEOUT = 5; // seconds before streak resets
  let streak = 0;
  let lastMoveTime = 0;

  // Hints: start with 3, earn 1 per 1000 points
  const HINT_START = 3;
  const HINT_INTERVAL = 1000;
  let hintsUsed = save?.hintsUsed ?? 0;
  let hintHighlights: ReturnType<typeof k.add>[] = [];

  // Generate a board that isn't deadlocked, or restore from save
  function initBoard() {
    if (save) {
      board = save.board;
    } else {
      do {
        board = createBoard((choices) => k.choose(choices));
      } while (isDeadlocked(board));
    }
  }

  function saveGame() {
    writeSave({ board, score, hintsUsed });
  }

  // UI
  const scoreLabel = k.add([
    k.text(`Score: ${score}`, { size: 28 }),
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

  function getHintsRemaining() {
    const earned = HINT_START + Math.floor(score / HINT_INTERVAL);
    return Math.max(earned - hintsUsed, 0);
  }

  // Buttons below the board
  const BTN_Y = BOARD_TOP + ROWS * CELL_SIZE + 40;

  // Home button (left)
  const homeBtn = k.add([
    k.rect(55, 50, { radius: 10 }),
    k.pos(BOARD_PADDING, BTN_Y),
    k.anchor("left"),
    k.color(60, 60, 100),
    k.area(),
    k.z(10),
  ]);
  k.add([
    k.text("\u{1F3E0}", { size: 26 }),
    k.pos(BOARD_PADDING + 27, BTN_Y),
    k.anchor("center"),
    k.z(11),
  ]);
  homeBtn.onClick(() => {
    saveGame();
    k.go("title");
  });

  // Hint button (center)
  const hintBtn = k.add([
    k.rect(160, 50, { radius: 10 }),
    k.pos(k.center().x, BTN_Y),
    k.anchor("center"),
    k.color(80, 80, 140),
    k.area(),
    k.z(10),
  ]);
  const hintLabel = k.add([
    k.text(`\u{1F4A1} ${getHintsRemaining()}`, { size: 22 }),
    k.pos(k.center().x, BTN_Y),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(11),
  ]);

  function updateHintLabel() {
    const rem = getHintsRemaining();
    hintLabel.text = `\u{1F4A1} ${rem}`;
    hintBtn.color = k.rgb(
      rem > 0 ? 80 : 50,
      rem > 0 ? 80 : 50,
      rem > 0 ? 140 : 80,
    );
  }

  function clearHintHighlights() {
    for (const h of hintHighlights) h.destroy();
    hintHighlights = [];
  }

  function showHint() {
    if (locked || getHintsRemaining() <= 0) return;
    clearHintHighlights();
    const move = findValidMove(board);
    if (!move) return;
    hintsUsed++;
    updateHintLabel();

    // Highlight both gems in the valid swap with a pulsing green border
    for (const pos of [move.a, move.b]) {
      const { x, y } = gridToPixel(pos.col, pos.row);
      const h = k.add([
        k.rect(CELL_SIZE - 2, CELL_SIZE - 2, { radius: 6 }),
        k.pos(x, y),
        k.anchor("center"),
        k.color(100, 255, 100),
        k.opacity(0.5),
        k.timer(),
        k.z(3),
      ]);
      // Pulse animation
      h.loop(0.5, () => {
        h.tween(
          0.5,
          0.2,
          0.5,
          (v: number) => (h.opacity = v),
          k.easings.easeInOutSine,
        );
      });
      hintHighlights.push(h);
    }

    // Auto-clear after 3 seconds
    k.wait(3, clearHintHighlights);
  }

  hintBtn.onClick(showHint);

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

  /** Floating score popup that drifts up and fades out. */
  function showScorePopup(
    points: number,
    positions: Set<number>,
    bonus: string,
  ) {
    let cx = 0;
    let cy = 0;
    for (const enc of positions) {
      const { row, col } = decodePos(enc);
      const p = gridToPixel(col, row);
      cx += p.x;
      cy += p.y;
    }
    cx /= positions.size;
    cy /= positions.size;

    const label = bonus ? `+${points} ${bonus}` : `+${points}`;
    const popup = k.add([
      k.text(label, { size: 22 }),
      k.pos(cx, cy),
      k.anchor("center"),
      k.color(255, 255, 100),
      k.opacity(1),
      k.timer(),
      k.z(20),
    ]);
    popup.tween(
      popup.pos.clone(),
      k.vec2(cx, cy - 60),
      0.8,
      (p: import("kaplay").Vec2) => (popup.pos = p),
      k.easings.easeOutQuad,
    );
    popup
      .tween(
        1,
        0,
        0.8,
        (v: number) => (popup.opacity = v),
        k.easings.easeInQuad,
      )
      .then(() => popup.destroy());
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

  // Input — supports both tap-to-swap and drag-to-swap
  const DRAG_THRESHOLD = CELL_SIZE * 0.3;
  let dragStart: { pos: GridPos; mouse: { x: number; y: number } } | null =
    null;

  function pixelToGrid(x: number, y: number): GridPos | null {
    const col = Math.floor((x - BOARD_PADDING) / CELL_SIZE);
    const row = Math.floor((y - BOARD_TOP) / CELL_SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { row, col };
  }

  k.onMousePress(() => {
    if (locked) return;
    const mp = k.mousePos();
    const gp = pixelToGrid(mp.x, mp.y);
    if (gp) dragStart = { pos: gp, mouse: { x: mp.x, y: mp.y } };
  });

  k.onMouseRelease(() => {
    if (locked || !dragStart) return;
    const mp = k.mousePos();
    const dx = mp.x - dragStart.mouse.x;
    const dy = mp.y - dragStart.mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const origin = dragStart.pos;
    dragStart = null;

    if (dist >= DRAG_THRESHOLD) {
      // Drag — determine direction
      let target: GridPos;
      if (Math.abs(dx) > Math.abs(dy)) {
        target = { row: origin.row, col: origin.col + (dx > 0 ? 1 : -1) };
      } else {
        target = { row: origin.row + (dy > 0 ? 1 : -1), col: origin.col };
      }
      if (
        target.col >= 0 &&
        target.col < COLS &&
        target.row >= 0 &&
        target.row < ROWS
      ) {
        clearHighlight();
        handleSwap(origin, target);
      }
    } else {
      // Tap — select or swap with previously selected
      const pos = pixelToGrid(mp.x, mp.y);
      if (!pos) return;

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
    }
  });

  async function handleSwap(a: GridPos, b: GridPos) {
    locked = true;
    clearHighlight();
    clearHintHighlights();

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
      playInvalidSound(k);
      await animateSwap(k, gemA, gemB);
      swapCells(board, a, b);
      gems[a.row][a.col] = gemA;
      gems[b.row][b.col] = gemB;
      gemA.gridRow = a.row;
      gemA.gridCol = a.col;
      gemB.gridRow = b.row;
      gemB.gridCol = b.col;
      streak = 0;
      locked = false;
      return;
    }

    // Update streak — reset if too much time passed
    const now = k.time();
    if (now - lastMoveTime > STREAK_TIMEOUT) streak = 0;
    streak++;
    lastMoveTime = now;

    await processCascades(matches);

    if (isDeadlocked(board)) {
      saveHighScore();
      clearSave();
      playGameOverSound(k);
      k.go("gameover", { score });
      return;
    }

    saveGame();
    locked = false;
  }

  async function processCascades(initial: Set<number>) {
    let matches = initial;
    let cascadeStep = 0;

    while (matches.size > 0) {
      // Streak multiplier: x1 for first move, x1.5 for 2nd, x2 for 3rd, etc.
      const streakMult = 1 + (streak - 1) * 0.5;
      // Cascade multiplier: x1 for first clear, x2 for chain, x3, etc.
      const cascadeMult = cascadeStep + 1;
      const { points: rawPoints, maxLen } = scoreMatches(matches);
      const totalPoints = Math.round(rawPoints * cascadeMult * streakMult);

      score += totalPoints;
      scoreLabel.text = `Score: ${score}`;
      updateHintLabel();

      // Build bonus label
      const bonusParts: string[] = [];
      if (cascadeMult > 1) bonusParts.push(`x${cascadeMult} chain`);
      if (streakMult > 1) bonusParts.push(`x${streakMult} streak`);
      showScorePopup(totalPoints, matches, bonusParts.join(" "));

      // Sound: different for match length + rising pitch on cascades
      playMatchSound(k, maxLen, cascadeStep);
      cascadeStep++;

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

      // Fill empty cells — difficulty ramps from 0 to 0.8 as score increases
      const difficulty = Math.min(score / 5000, 0.8);
      const newGems = fillEmpty(
        board,
        () => k.randi(0, NUM_GEMS),
        (choices) => k.choose(choices),
        difficulty,
      );
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

  // Play Again button
  const playBtn = k.add([
    k.rect(250, 60, { radius: 14 }),
    k.pos(k.center().x, 440),
    k.anchor("center"),
    k.color(70, 130, 70),
    k.area(),
  ]);
  k.add([
    k.text("\u{1F504}  Play Again", { size: 26 }),
    k.pos(k.center().x, 440),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);
  playBtn.onClick(() => k.go("game"));

  // Home button
  const homeBtn = k.add([
    k.rect(250, 55, { radius: 14 }),
    k.pos(k.center().x, 520),
    k.anchor("center"),
    k.color(60, 60, 100),
    k.area(),
  ]);
  k.add([
    k.text("\u{1F3E0}  Home", { size: 24 }),
    k.pos(k.center().x, 520),
    k.anchor("center"),
    k.color(200, 200, 200),
  ]);
  homeBtn.onClick(() => k.go("title"));
});

// Start
k.go("title");
