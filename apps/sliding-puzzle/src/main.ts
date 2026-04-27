import { type Vec2 } from "kaplay";
import { initGame } from "@games/shared";
import {
  WIDTH,
  BOARD_PADDING,
  BOARD_SIZE,
  BOARD_TOP,
  HEADER_Y,
  INFO_Y,
  CONTROLS_Y,
  PREVIEW_SIZE,
  SLIDE_DURATION,
  TILE_GAP,
  BEST_KEY_PREFIX,
  POKEMON_IMAGES,
  GRID_SIZE,
  CELL_SIZE,
  tileToPixel,
  type PokemonName,
} from "./constants";
import { createBoard, shuffle, tryMove, isSolved, idxToPos } from "./board";
import {
  sliceAndRegister,
  previewSpriteKey,
  loadImage,
  registerFrameSprite,
  FRAME_SPRITE_KEY,
  BLANK_FRAME_SPRITE_KEY,
} from "./slicer";
import { solve } from "./solver";
import { loadSounds, unlockAudio, playSlide, playWin } from "./sound";

// Asset imports
import bulbasaurUrl from "./assets/bulbasaur.png";
import charmanderUrl from "./assets/charmander.png";
import squirtleUrl from "./assets/squirtle.png";
import eeveeUrl from "./assets/eevee.png";
import snorlaxUrl from "./assets/snorlax.png";
import mewtwoUrl from "./assets/mewtwo.png";

const IMAGE_URLS: Record<PokemonName, string> = {
  bulbasaur: bulbasaurUrl,
  charmander: charmanderUrl,
  squirtle: squirtleUrl,
  eevee: eeveeUrl,
  snorlax: snorlaxUrl,
  mewtwo: mewtwoUrl,
};

const k = initGame();

loadSounds(k);

// Shared state between scenes
let selectedImage: PokemonName | "custom" = "bulbasaur";
let customImageSrc: string | null = null;

// File input for image upload
const fileInput = document.getElementById("imageUpload") as HTMLInputElement;

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// ── Menu scene ──────────────────────────────────────────────

k.scene("menu", () => {
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

  // Title
  k.add([
    k.text("Image Scramble", { size: 36 }),
    k.pos(WIDTH / 2, 40),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  // Subtitle
  k.add([
    k.text("Choose an image", { size: 18 }),
    k.pos(WIDTH / 2, 80),
    k.anchor("center"),
    k.color(180, 180, 180),
  ]);

  // Image picker — 2 rows of 3 + upload button
  const thumbSize = 64;
  const gap = 12;
  const startX = WIDTH / 2 - (3 * (thumbSize + gap) - gap) / 2 + thumbSize / 2;
  const startY = 120;

  // Selection highlight
  let selHighlight: ReturnType<typeof k.add> | null = null;

  function showSelection(x: number, y: number) {
    if (selHighlight) selHighlight.destroy();
    selHighlight = k.add([
      k.rect(thumbSize + 6, thumbSize + 6, { radius: 8 }),
      k.pos(x, y),
      k.anchor("center"),
      k.color(255, 215, 0),
      k.z(1),
    ]);
  }

  POKEMON_IMAGES.forEach((name, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = startX + col * (thumbSize + gap);
    const y = startY + row * (thumbSize + gap);

    // Load thumbnail sprite for menu
    const thumbKey = `thumb_${name}`;
    k.loadSprite(thumbKey, IMAGE_URLS[name]);

    const btn = k.add([
      k.rect(thumbSize, thumbSize, { radius: 6 }),
      k.pos(x, y),
      k.anchor("center"),
      k.color(40, 40, 70),
      k.area(),
      k.z(2),
    ]);

    k.add([
      k.sprite(thumbKey, { width: thumbSize - 4, height: thumbSize - 4 }),
      k.pos(x, y),
      k.anchor("center"),
      k.z(3),
    ]);

    if (name === selectedImage) showSelection(x, y);

    btn.onClick(() => {
      selectedImage = name;
      customImageSrc = null;
      showSelection(x, y);
    });
  });

  // Upload button
  const uploadX = startX;
  const uploadY = startY + 2 * (thumbSize + gap);
  const uploadBtn = k.add([
    k.rect(thumbSize, thumbSize, { radius: 6 }),
    k.pos(uploadX, uploadY),
    k.anchor("center"),
    k.color(60, 60, 90),
    k.area(),
    k.z(2),
  ]);
  k.add([
    k.text("+", { size: 32 }),
    k.pos(uploadX, uploadY),
    k.anchor("center"),
    k.color(180, 180, 180),
    k.z(3),
  ]);

  // Custom image indicator
  let customLabel: ReturnType<typeof k.add> | null = null;

  if (selectedImage === "custom" && customImageSrc) {
    showSelection(uploadX, uploadY);
    customLabel = k.add([
      k.text("Custom", { size: 12 }),
      k.pos(uploadX + thumbSize / 2 + 8, uploadY),
      k.anchor("left"),
      k.color(180, 180, 180),
      k.z(3),
    ]);
  }

  uploadBtn.onClick(() => {
    fileInput.click();
  });

  // Handle file selection
  const handleFile = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    customImageSrc = await readFileAsDataURL(file);
    selectedImage = "custom";
    showSelection(uploadX, uploadY);
    if (customLabel) customLabel.destroy();
    customLabel = k.add([
      k.text("Custom", { size: 12 }),
      k.pos(uploadX + thumbSize / 2 + 8, uploadY),
      k.anchor("left"),
      k.color(180, 180, 180),
      k.z(3),
    ]);
    fileInput.value = "";
  };
  fileInput.addEventListener("change", handleFile);
  k.onSceneLeave(() => fileInput.removeEventListener("change", handleFile));

  // Play button
  const playY = uploadY + thumbSize / 2 + 50;
  const playBtn = k.add([
    k.rect(160, 50, { radius: 8 }),
    k.pos(WIDTH / 2, playY),
    k.anchor("center"),
    k.color(70, 160, 70),
    k.area(),
    k.z(10),
  ]);
  k.add([
    k.text("Play", { size: 26 }),
    k.pos(WIDTH / 2, playY),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(11),
  ]);

  playBtn.onClick(async () => {
    unlockAudio();
    const imgSrc =
      selectedImage === "custom" ? customImageSrc : IMAGE_URLS[selectedImage];
    if (!imgSrc) return;

    const img = await loadImage(imgSrc);
    const spriteKeys = sliceAndRegister(k, img);
    k.go("game", { spriteKeys });
  });
});

// ── Game scene ──────────────────────────────────────────────

interface GameArgs {
  spriteKeys: string[][];
}

k.scene("game", ({ spriteKeys }: GameArgs) => {
  const board = createBoard();
  shuffle(board, Math.random);

  let moves = 0;
  let elapsed = 0;
  let running = true;
  let locked = false;
  let showNumbers = false;

  const blankTileValue = GRID_SIZE * GRID_SIZE - 1;

  // Kaplay's k.add() return type loses component info when stored in arrays.
  interface TileObj {
    pos: Vec2;
    opacity: number;
    tween: (
      from: Vec2,
      to: Vec2,
      dur: number,
      setter: (v: Vec2) => void,
      easing: (t: number) => number,
    ) => Promise<void>;
    destroy: () => void;
  }
  const n = GRID_SIZE * GRID_SIZE;
  const tileObjs: (TileObj | null)[] = new Array(n).fill(null);
  const frameObjs: (TileObj | null)[] = new Array(n).fill(null);
  const numberObjs: (TileObj | null)[] = new Array(n).fill(null);
  const tileSize = CELL_SIZE- TILE_GAP;
  const rawFrameSize = tileSize + Math.max(4, Math.round(tileSize * 0.04)) * 2;
  const frameSize = Math.min(rawFrameSize, CELL_SIZE- 4);

  // Generate wooden frame sprite sized for this grid
  registerFrameSprite(k, tileSize);

  // ── Header ──
  k.add([
    k.text("Image Scramble", { size: 24 }),
    k.pos(WIDTH / 2, HEADER_Y + 12),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(10),
  ]);

  // ── Info bar ──
  const movesLabel = k.add([
    k.text("Moves: 0", { size: 18 }),
    k.pos(BOARD_PADDING, INFO_Y),
    k.color(200, 200, 200),
    k.z(10),
  ]);

  const timerLabel = k.add([
    k.text("0:00", { size: 18 }),
    k.pos(BOARD_PADDING, INFO_Y + 26),
    k.color(200, 200, 200),
    k.z(10),
  ]);

  // Preview thumbnail
  k.add([
    k.sprite(previewSpriteKey(), {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
    }),
    k.pos(WIDTH - BOARD_PADDING - PREVIEW_SIZE / 2, INFO_Y + PREVIEW_SIZE / 2),
    k.anchor("center"),
    k.z(10),
  ]);

  // ── Controls (top) ──
  const backBtn = k.add([
    k.rect(80, 30, { radius: 8 }),
    k.pos(BOARD_PADDING + 40, CONTROLS_Y),
    k.anchor("center"),
    k.color(100, 60, 60),
    k.area(),
    k.z(10),
  ]);
  k.add([
    k.text("Back", { size: 16 }),
    k.pos(BOARD_PADDING + 40, CONTROLS_Y),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(11),
  ]);
  backBtn.onClick(() => k.go("menu"));

  const numToggle = k.add([
    k.rect(40, 30, { radius: 8 }),
    k.pos(BOARD_PADDING + 40 + 80 / 2 + 8 + 40 / 2, CONTROLS_Y),
    k.anchor("center"),
    k.color(60, 60, 100),
    k.area(),
    k.z(10),
  ]);
  k.add([
    k.text("#", { size: 18 }),
    k.pos(BOARD_PADDING + 40 + 80 / 2 + 8 + 40 / 2, CONTROLS_Y),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(11),
  ]);
  numToggle.onClick(() => {
    showNumbers = !showNumbers;
    updateNumberVisibility();
  });

  // ── Controls (bottom — Hint & Solve) ──
  const bottomY = BOARD_TOP + BOARD_SIZE + 28;
  const btnW = 100;
  const btnH = 36;
  const btnSpacing = 16;

  let hintHighlight: ReturnType<typeof k.add> | null = null;
  let solving = false;

  // Bottom button game objects (destroyed on win to make room for New Game)
  const bottomObjs: ReturnType<typeof k.add>[] = [];

  // Hint button
  const hintBtn = k.add([
    k.rect(btnW, btnH, { radius: 8 }),
    k.pos(WIDTH / 2 - btnW / 2 - btnSpacing / 2, bottomY),
    k.anchor("center"),
    k.color(60, 100, 160),
    k.area(),
    k.z(10),
  ]);
  bottomObjs.push(hintBtn);
  const hintLabel = k.add([
    k.text("Hint", { size: 18 }),
    k.pos(WIDTH / 2 - btnW / 2 - btnSpacing / 2, bottomY),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(11),
  ]);
  bottomObjs.push(hintLabel);

  hintBtn.onClick(() => {
    if (locked || !running || solving) return;
    if (hintHighlight) {
      hintHighlight.destroy();
      hintHighlight = null;
    }
    const solution = solve(board, 5000);
    if (!solution || solution.length === 0) return;
    const hintIdx = solution[0];
    const { col: hc, row: hr } = idxToPos(hintIdx);
    const { x: hx, y: hy } = tileToPixel(hc, hr);
    hintHighlight = k.add([
      k.rect(tileSize + 4, tileSize + 4, { radius: 4 }),
      k.pos(hx, hy),
      k.anchor("center"),
      k.color(100, 255, 100),
      k.opacity(0.6),
      k.z(3),
    ]);
    k.wait(1.5, () => {
      if (hintHighlight) {
        hintHighlight.destroy();
        hintHighlight = null;
      }
    });
  });

  // Solve button
  const solveBtn = k.add([
    k.rect(btnW, btnH, { radius: 8 }),
    k.pos(WIDTH / 2 + btnW / 2 + btnSpacing / 2, bottomY),
    k.anchor("center"),
    k.color(160, 100, 60),
    k.area(),
    k.z(10),
  ]);
  bottomObjs.push(solveBtn);
  const solveLabel = k.add([
    k.text("Solve", { size: 18 }),
    k.pos(WIDTH / 2 + btnW / 2 + btnSpacing / 2, bottomY),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(11),
  ]);
  bottomObjs.push(solveLabel);

  const solvingLabel = k.add([
    k.text("", { size: 14 }),
    k.pos(WIDTH / 2, bottomY + 28),
    k.anchor("center"),
    k.color(255, 200, 100),
    k.z(11),
  ]);
  bottomObjs.push(solvingLabel);

  solveBtn.onClick(async () => {
    if (locked || !running || solving) return;
    solving = true;
    solvingLabel.text = "Solving...";

    // Run solver in a microtask so the label renders
    await new Promise((r) => setTimeout(r, 50));
    const solution = solve(board, 5000);

    if (!solution || solution.length === 0) {
      solvingLabel.text = solution ? "Already solved!" : "Too complex to solve";
      solving = false;
      k.wait(2, () => (solvingLabel.text = ""));
      return;
    }

    solvingLabel.text = `${solution.length} moves`;

    for (const clickIdx of solution) {
      locked = true;
      animateMove(clickIdx, false);
      await new Promise((r) => setTimeout(r, SLIDE_DURATION * 1000 + 80));
    }

    solving = false;
  });

  // ── Win state (stay on board) ──
  function showWinState() {
    running = false;
    playWin(k);

    // Save best
    const key = BEST_KEY_PREFIX + GRID_SIZE;
    const prev = parseInt(localStorage.getItem(key) ?? "999999");
    const isNewBest = moves < prev;
    if (isNewBest) localStorage.setItem(key, String(moves));

    // Spawn the blank tile so the full image is visible
    const blankRow = Math.floor(board.blankIdx / GRID_SIZE);
    const blankCol = board.blankIdx % GRID_SIZE;
    const lastTileRow = Math.floor(blankTileValue / GRID_SIZE);
    const lastTileCol = blankTileValue % GRID_SIZE;
    const lastSpriteKey = spriteKeys[lastTileRow][lastTileCol];
    const { x: bx, y: by } = tileToPixel(blankCol, blankRow);

    k.add([
      k.sprite(lastSpriteKey, { width: tileSize, height: tileSize }),
      k.pos(bx, by),
      k.anchor("center"),
      k.z(5),
    ]);

    // Remove hint/solve buttons
    for (const obj of bottomObjs) obj.destroy();
    bottomObjs.length = 0;
    if (hintHighlight) {
      hintHighlight.destroy();
      hintHighlight = null;
    }

    // Show completion message
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
    const msg = isNewBest
      ? `Complete! ${moves} moves, ${timeStr} — New Best!`
      : `Complete! ${moves} moves, ${timeStr}`;

    k.add([
      k.text(msg, { size: 16 }),
      k.pos(WIDTH / 2, bottomY - 8),
      k.anchor("center"),
      k.color(isNewBest ? [255, 215, 0] : [100, 255, 100]),
      k.z(11),
    ]);

    // New Game button
    const newGameBtn = k.add([
      k.rect(140, btnH, { radius: 8 }),
      k.pos(WIDTH / 2, bottomY + 22),
      k.anchor("center"),
      k.color(70, 160, 70),
      k.area(),
      k.z(10),
    ]);
    k.add([
      k.text("New Game", { size: 18 }),
      k.pos(WIDTH / 2, bottomY + 22),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.z(11),
    ]);
    newGameBtn.onClick(() => k.go("menu"));
  }

  // ── Board background ──
  k.add([
    k.rect(BOARD_SIZE, BOARD_SIZE, { radius: 4 }),
    k.pos(BOARD_PADDING, BOARD_TOP),
    k.color(30, 30, 55),
    k.z(0),
  ]);

  // ── Static frames at every cell ──
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const { x, y } = tileToPixel(c, r);
      k.add([
        k.sprite(FRAME_SPRITE_KEY, { width: frameSize, height: frameSize }),
        k.pos(x, y),
        k.anchor("center"),
        k.z(1),
      ]);
    }
  }

  // Blank-cell highlight frame (sits above static wood frames, below movable tiles)
  const initBlank = tileToPixel(
    board.blankIdx % GRID_SIZE,
    Math.floor(board.blankIdx / GRID_SIZE),
  );
  const blankFrame = k.add([
    k.sprite(BLANK_FRAME_SPRITE_KEY, {
      width: frameSize,
      height: frameSize,
    }),
    k.pos(initBlank.x, initBlank.y),
    k.anchor("center"),
    k.z(2),
  ]);

  // ── Spawn movable tiles ──
  function spawnTiles() {
    for (let i = 0; i < board.tiles.length; i++) {
      const tileVal = board.tiles[i];
      if (tileVal === blankTileValue) continue;

      const { col, row } = idxToPos(i);
      const tileCol = tileVal % GRID_SIZE;
      const tileRow = Math.floor(tileVal / GRID_SIZE);
      const spriteKey = spriteKeys[tileRow][tileCol];
      const { x, y } = tileToPixel(col, row);

      // Movable frame that slides with the tile
      frameObjs[i] = k.add([
        k.sprite(FRAME_SPRITE_KEY, { width: frameSize, height: frameSize }),
        k.pos(x, y),
        k.anchor("center"),
        k.timer(),
        k.z(4),
      ]) as unknown as TileObj;

      tileObjs[i] = k.add([
        k.sprite(spriteKey, { width: tileSize, height: tileSize }),
        k.pos(x, y),
        k.anchor("center"),
        k.timer(),
        k.z(5),
      ]) as unknown as TileObj;

      numberObjs[i] = k.add([
        k.text(`${tileVal + 1}`, { size: Math.max(12, CELL_SIZE/ 4) }),
        k.pos(x, y),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
        k.timer(),
        k.z(6),
      ]) as unknown as TileObj;
    }
  }

  function updateNumberVisibility() {
    for (const obj of numberObjs) {
      if (obj) obj.opacity = showNumbers ? 0.8 : 0;
    }
  }

  // ── Animate a tile move ──
  function animateMove(clickIdx: number, countMove = true) {
    playSlide(k);
    const blankCol = board.blankIdx % GRID_SIZE;
    const blankRow = Math.floor(board.blankIdx / GRID_SIZE);
    const targetPos = tileToPixel(blankCol, blankRow);
    const oldBlankIdx = board.blankIdx;
    const col = clickIdx % GRID_SIZE;
    const row = Math.floor(clickIdx / GRID_SIZE);

    tryMove(board, col, row);
    if (countMove) {
      moves++;
      movesLabel.text = `Moves: ${moves}`;
    }

    // Move blank-cell highlight to the new blank position
    const newBlank = tileToPixel(
      clickIdx % GRID_SIZE,
      Math.floor(clickIdx / GRID_SIZE),
    );
    blankFrame.pos.x = newBlank.x;
    blankFrame.pos.y = newBlank.y;

    // Update object tracking
    const objs = [tileObjs, frameObjs, numberObjs];
    for (const arr of objs) {
      arr[oldBlankIdx] = arr[clickIdx];
      arr[clickIdx] = null;
    }

    const target = k.vec2(targetPos.x, targetPos.y);
    const tweenables = [
      tileObjs[oldBlankIdx],
      frameObjs[oldBlankIdx],
      numberObjs[oldBlankIdx],
    ];

    const tweenDone = tweenables[0]!.tween(
      k.vec2(tweenables[0]!.pos.x, tweenables[0]!.pos.y),
      target,
      SLIDE_DURATION,
      (p: Vec2) => (tweenables[0]!.pos = p),
      k.easings.easeOutQuad,
    );

    for (let t = 1; t < tweenables.length; t++) {
      const obj = tweenables[t];
      if (!obj) continue;
      obj.tween(
        k.vec2(obj.pos.x, obj.pos.y),
        target,
        SLIDE_DURATION,
        (p: Vec2) => (obj.pos = p),
        k.easings.easeOutQuad,
      );
    }

    tweenDone.then(() => {
      locked = false;
      if (isSolved(board)) {
        k.wait(0.3, () => showWinState());
      }
    });
  }

  // ── Input: tap or drag ──
  function pixelToGrid(
    mx: number,
    my: number,
  ): { col: number; row: number } | null {
    const col = Math.floor((mx - BOARD_PADDING) / CELL_SIZE);
    const row = Math.floor((my - BOARD_TOP) / CELL_SIZE);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return null;
    return { col, row };
  }

  function isAdjacentToBlank(col: number, row: number): boolean {
    const bc = board.blankIdx % GRID_SIZE;
    const br = Math.floor(board.blankIdx / GRID_SIZE);
    const dc = Math.abs(col - bc);
    const dr = Math.abs(row - br);
    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
  }

  const DRAG_THRESHOLD = CELL_SIZE* 0.25;
  let dragStart: { col: number; row: number; mx: number; my: number } | null =
    null;

  k.onMousePress(() => {
    if (locked || !running) return;
    const mp = k.mousePos();
    const gp = pixelToGrid(mp.x, mp.y);
    if (!gp) return;
    const idx = gp.row * GRID_SIZE + gp.col;
    if (board.tiles[idx] === blankTileValue) return;
    dragStart = { col: gp.col, row: gp.row, mx: mp.x, my: mp.y };
  });

  k.onMouseRelease(() => {
    if (locked || !running || !dragStart) return;
    const mp = k.mousePos();
    const dx = mp.x - dragStart.mx;
    const dy = mp.y - dragStart.my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const origin = dragStart;
    dragStart = null;

    if (dist >= DRAG_THRESHOLD) {
      // Drag — determine direction toward the blank
      const bc = board.blankIdx % GRID_SIZE;
      const br = Math.floor(board.blankIdx / GRID_SIZE);
      let targetCol = origin.col;
      let targetRow = origin.row;
      if (Math.abs(dx) > Math.abs(dy)) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }
      // Only accept if dragging toward the blank
      if (targetCol === bc && targetRow === br) {
        locked = true;
        animateMove(origin.row * GRID_SIZE + origin.col);
      }
    } else {
      // Tap — move if adjacent to blank
      if (isAdjacentToBlank(origin.col, origin.row)) {
        locked = true;
        animateMove(origin.row * GRID_SIZE + origin.col);
      }
    }
  });

  // ── Timer ──
  k.onUpdate(() => {
    if (!running) return;
    elapsed += k.dt();
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    timerLabel.text = `${mins}:${secs.toString().padStart(2, "0")}`;
  });

  spawnTiles();
});

// ── Start ───────────────────────────────────────────────────
k.go("menu");
