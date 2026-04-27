import kaplay from "kaplay";
import type { Vec2 } from "kaplay";
import {
  CELL_SIZE,
  WIDTH,
  HEIGHT,
  COLOR_BG,
  COLOR_GRID,
  COLOR_X,
  COLOR_O,
  COLOR_WIN,
  COLOR_LAST,
  COLOR_UI_BG,
  encodeCell,
  type GameMode,
  type AiLevel,
} from "./constants";
import { createBoard, placeMove, undoMove, type BoardState } from "./board";
import { findBestMove } from "./ai/index";
import { LEVELS } from "./ai/levels";
import { loadSounds, playPlace, playWin } from "./sound";
import materialSymbolsUrl from "./assets/fonts/material-symbols.ttf";

const ICON_FONT = "material-symbols";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const k = kaplay({
  width: WIDTH,
  height: HEIGHT,
  background: COLOR_BG,
  touchToMouse: true,
  stretch: true,
  letterbox: true,
  pixelDensity: window.devicePixelRatio,
  canvas,
});

k.loadFont(ICON_FONT, materialSymbolsUrl);
loadSounds(k);

const UI_HEIGHT = 44;
const GAME_HEIGHT = HEIGHT - UI_HEIGHT;

let aiWorker: Worker | null = null;

function getAiWorker(): Worker {
  if (!aiWorker) {
    aiWorker = new Worker(new URL("./ai/worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return aiWorker;
}

k.scene("menu", () => {
  document.getElementById("loading")?.remove();

  k.add([
    k.text("Caro", { size: 56 }),
    k.pos(WIDTH / 2, 150),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  k.add([
    k.text("First to 5 in a row wins", { size: 20 }),
    k.pos(WIDTH / 2, 210),
    k.anchor("center"),
    k.color(180, 180, 180),
  ]);

  const pvpBtn = k.add([
    k.rect(260, 60, { radius: 12 }),
    k.pos(WIDTH / 2, 340),
    k.anchor("center"),
    k.color(70, 130, 70),
    k.area(),
  ]);
  k.add([
    k.text("2 Players", { size: 26 }),
    k.pos(WIDTH / 2, 340),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);
  pvpBtn.onClick(() => k.go("game", { mode: "pvp" as GameMode }));

  const pvcBtn = k.add([
    k.rect(260, 60, { radius: 12 }),
    k.pos(WIDTH / 2, 430),
    k.anchor("center"),
    k.color(70, 80, 140),
    k.area(),
  ]);
  k.add([
    k.text("vs Computer", { size: 26 }),
    k.pos(WIDTH / 2, 430),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);
  pvcBtn.onClick(() => k.go("level-select"));
});

k.scene("level-select", () => {
  k.add([
    k.text("Select Difficulty", { size: 36 }),
    k.pos(WIDTH / 2, 80),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  const cols = 2;
  const btnW = 200;
  const btnH = 70;
  const gapX = 20;
  const gapY = 16;
  const gridW = cols * btnW + (cols - 1) * gapX;
  const startX = (WIDTH - gridW) / 2;
  const startY = 140;

  const levelColors: [number, number, number][] = [
    [60, 130, 60],
    [70, 120, 70],
    [70, 100, 130],
    [100, 80, 130],
    [130, 70, 90],
    [140, 50, 50],
  ];

  for (let i = 1; i <= 6; i++) {
    const config = LEVELS[i];
    const r = Math.floor((i - 1) / cols);
    const c = (i - 1) % cols;
    const x = startX + c * (btnW + gapX) + btnW / 2;
    const y = startY + r * (btnH + gapY) + btnH / 2;

    const btn = k.add([
      k.rect(btnW, btnH, { radius: 10 }),
      k.pos(x, y),
      k.anchor("center"),
      k.color(...levelColors[i - 1]),
      k.area(),
    ]);

    k.add([
      k.text(config.name, { size: 22 }),
      k.pos(x, y - 12),
      k.anchor("center"),
      k.color(255, 255, 255),
    ]);

    k.add([
      k.text(config.subtitle, { size: 13 }),
      k.pos(x, y + 14),
      k.anchor("center"),
      k.color(200, 200, 200),
    ]);

    btn.onClick(() =>
      k.go("game", { mode: "pvc" as GameMode, level: i as AiLevel }),
    );
  }

  const backBtn = k.add([
    k.rect(120, 44, { radius: 8 }),
    k.pos(WIDTH / 2, startY + 3 * (btnH + gapY) + 30),
    k.anchor("center"),
    k.color(80, 80, 110),
    k.area(),
  ]);

  k.add([
    k.text("Back", { size: 20 }),
    k.pos(WIDTH / 2, startY + 3 * (btnH + gapY) + 30),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  backBtn.onClick(() => k.go("menu"));
});

k.scene("game", ({ mode, level = 2 }: { mode: GameMode; level?: AiLevel }) => {
  let state: BoardState = createBoard();
  let camX = 0;
  let camY = 0;
  let locked = false;
  let uiClicked = false;
  let winCellsCache: Set<number> | null = null;
  let aiMoveId = 0;

  let isPanning = false;
  let panStart: Vec2 | null = null;
  let camStart: Vec2 | null = null;
  let didPan = false;

  k.add([
    k.rect(WIDTH, UI_HEIGHT),
    k.pos(0, 0),
    k.color(...COLOR_UI_BG),
    k.z(100),
    k.fixed(),
  ]);

  const turnLabel = k.add([
    k.text("X's turn", { size: 22 }),
    k.pos(16, UI_HEIGHT / 2),
    k.anchor("left"),
    k.color(...COLOR_X),
    k.z(101),
    k.fixed(),
  ]);

  // Home button with house icon
  const homeBtn = k.add([
    k.rect(36, 30, { radius: 6 }),
    k.pos(WIDTH - 12, UI_HEIGHT / 2),
    k.anchor("right"),
    k.color(80, 80, 110),
    k.area(),
    k.z(101),
    k.fixed(),
  ]);
  k.add([
    k.text("\ue9b2", { size: 22, font: ICON_FONT }),
    k.pos(WIDTH - 30, UI_HEIGHT / 2),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(102),
    k.fixed(),
  ]);
  homeBtn.onClick(() => {
    uiClicked = true;
    aiMoveId++;
    k.go("menu");
  });

  // Menu button with hamburger icon
  const menuBtn = k.add([
    k.rect(36, 30, { radius: 6 }),
    k.pos(WIDTH - 54, UI_HEIGHT / 2),
    k.anchor("right"),
    k.color(80, 80, 110),
    k.area(),
    k.z(101),
    k.fixed(),
  ]);
  k.add([
    k.text("\ue5d2", { size: 22, font: ICON_FONT }),
    k.pos(WIDTH - 72, UI_HEIGHT / 2),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(102),
    k.fixed(),
  ]);

  let menuOpen = false;
  const DROPDOWN_W = 140;
  const DROPDOWN_ITEM_H = 38;
  const DROPDOWN_X = WIDTH - 54 - DROPDOWN_W;
  const DROPDOWN_Y = UI_HEIGHT;
  const dropdownObjs: ReturnType<typeof k.add>[] = [];

  const menuOptions = [
    { text: "Undo", icon: "\ue166", action: doUndo },
    { text: "Restart", icon: "\uf053", action: doRestart },
    { text: "New Game", icon: "\ue3ba", action: () => k.go("menu") },
  ];

  for (let i = 0; i < menuOptions.length; i++) {
    const y = DROPDOWN_Y + i * DROPDOWN_ITEM_H;
    const bg = k.add([
      k.rect(DROPDOWN_W, DROPDOWN_ITEM_H - 2, { radius: 4 }),
      k.pos(DROPDOWN_X, y + 1),
      k.color(55, 55, 85),
      k.area(),
      k.z(200),
      k.fixed(),
    ]);
    bg.hidden = true;
    const icon = k.add([
      k.text(menuOptions[i].icon, { size: 20, font: ICON_FONT }),
      k.pos(DROPDOWN_X + 22, y + DROPDOWN_ITEM_H / 2),
      k.anchor("center"),
      k.color(200, 200, 220),
      k.z(201),
      k.fixed(),
    ]);
    icon.hidden = true;
    const label = k.add([
      k.text(menuOptions[i].text, { size: 18 }),
      k.pos(DROPDOWN_X + DROPDOWN_W / 2 + 12, y + DROPDOWN_ITEM_H / 2),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.z(201),
      k.fixed(),
    ]);
    label.hidden = true;
    const action = menuOptions[i].action;
    bg.onClick(() => {
      if (!menuOpen) return;
      uiClicked = true;
      closeMenu();
      action();
    });
    dropdownObjs.push(bg, icon, label);
  }

  function openMenu() {
    menuOpen = true;
    for (const obj of dropdownObjs) obj.hidden = false;
  }

  function closeMenu() {
    menuOpen = false;
    for (const obj of dropdownObjs) obj.hidden = true;
  }

  menuBtn.onClick(() => {
    uiClicked = true;
    if (menuOpen) closeMenu();
    else openMenu();
  });

  function doUndo() {
    if (locked || state.moves.length === 0) return;
    if (mode === "pvc") {
      undoMove(state);
      if (state.moves.length > 0 && state.currentPlayer !== "X") {
        undoMove(state);
      }
    } else {
      undoMove(state);
    }
    updateTurnLabel();
  }

  function doRestart() {
    aiMoveId++;
    state = createBoard();
    camX = 0;
    camY = 0;
    locked = false;
    updateTurnLabel();
  }

  function updateTurnLabel() {
    const player = state.winner ? state.winner.player : state.currentPlayer;
    const color = player === "X" ? COLOR_X : COLOR_O;
    turnLabel.text = state.winner ? `${player} wins!` : `${player}'s turn`;
    turnLabel.color = k.rgb(...color);

    // Play sound for the piece that was just placed
    const lastMove = state.moves.at(-1);
    if (lastMove) {
      if (state.winner) {
        playWin(k);
      } else {
        playPlace(k, lastMove.player);
      }
    }

    if (state.winner) {
      winCellsCache = new Set(
        state.winner.cells.map((c) => encodeCell(c.row, c.col)),
      );
    } else {
      winCellsCache = null;
    }
  }

  function requestAiMove() {
    locked = true;

    // Levels 1-2: instant, run synchronously
    if (level <= 2) {
      k.wait(0.2, () => {
        const move = findBestMove(state, level);
        placeMove(state, move.row, move.col);
        updateTurnLabel();
        locked = false;
      });
      return;
    }

    // Levels 3+: run in Web Worker to avoid UI freeze
    turnLabel.text = "Thinking...";
    turnLabel.color = k.rgb(180, 180, 180);

    const worker = getAiWorker();
    const id = ++aiMoveId;
    worker.onmessage = (e) => {
      if (e.data.moveId !== id) return;
      placeMove(state, e.data.row, e.data.col);
      updateTurnLabel();
      locked = false;
    };
    worker.postMessage({
      moves: state.moves.map((m) => ({
        row: m.row,
        col: m.col,
        player: m.player,
      })),
      level,
      moveId: id,
    });
  }

  k.onMousePress("left", () => {
    const mpos = k.mousePos();
    if (mpos.y < UI_HEIGHT) return;
    isPanning = false;
    didPan = false;
    panStart = mpos.clone();
    camStart = k.vec2(camX, camY);
  });

  k.onMouseMove(() => {
    if (!panStart || !camStart) return;
    const mpos = k.mousePos();
    const dx = mpos.x - panStart.x;
    const dy = mpos.y - panStart.y;
    if (!isPanning && Math.abs(dx) + Math.abs(dy) > 8) {
      isPanning = true;
      didPan = true;
    }
    if (isPanning) {
      camX = camStart.x - dx;
      camY = camStart.y - dy;
    }
  });

  k.onMouseRelease("left", () => {
    if (menuOpen && panStart && panStart.y >= UI_HEIGHT) {
      closeMenu();
    }
    if (
      !uiClicked &&
      !didPan &&
      !locked &&
      panStart &&
      panStart.y >= UI_HEIGHT
    ) {
      handleClick(k.mousePos());
    }
    uiClicked = false;
    isPanning = false;
    panStart = null;
    camStart = null;
  });

  function handleClick(screenPos: Vec2) {
    if (state.winner) return;
    if (mode === "pvc" && state.currentPlayer === "O") return;

    const worldX = screenPos.x + camX - WIDTH / 2;
    const worldY = screenPos.y + camY - (UI_HEIGHT + GAME_HEIGHT / 2);

    const col = Math.round(worldX / CELL_SIZE);
    const row = Math.round(worldY / CELL_SIZE);

    if (placeMove(state, row, col)) {
      updateTurnLabel();

      if (mode === "pvc" && !state.winner) {
        requestAiMove();
      }
    }
  }

  k.onDraw(() => {
    const offsetX = WIDTH / 2 - camX;
    const offsetY = UI_HEIGHT + GAME_HEIGHT / 2 - camY;

    const leftWorld = camX - WIDTH / 2;
    const topWorld = camY - GAME_HEIGHT / 2;
    const rightWorld = camX + WIDTH / 2;
    const bottomWorld = camY + GAME_HEIGHT / 2;

    const minCol = Math.floor(leftWorld / CELL_SIZE) - 1;
    const maxCol = Math.ceil(rightWorld / CELL_SIZE) + 1;
    const minRow = Math.floor(topWorld / CELL_SIZE) - 1;
    const maxRow = Math.ceil(bottomWorld / CELL_SIZE) + 1;

    const half = CELL_SIZE / 2;
    for (let col = minCol; col <= maxCol; col++) {
      const x = col * CELL_SIZE - half + offsetX;
      k.drawLine({
        p1: k.vec2(x, UI_HEIGHT),
        p2: k.vec2(x, HEIGHT),
        width: 1,
        color: k.rgb(...COLOR_GRID),
        opacity: 0.4,
      });
    }
    for (let row = minRow; row <= maxRow; row++) {
      const y = row * CELL_SIZE - half + offsetY;
      if (y < UI_HEIGHT || y > HEIGHT) continue;
      k.drawLine({
        p1: k.vec2(0, y),
        p2: k.vec2(WIDTH, y),
        width: 1,
        color: k.rgb(...COLOR_GRID),
        opacity: 0.4,
      });
    }

    const lastMove = state.moves.at(-1) ?? null;

    for (const { row, col, player } of state.moves) {
      const cx = col * CELL_SIZE + offsetX;
      const cy = row * CELL_SIZE + offsetY;

      if (cx < -CELL_SIZE || cx > WIDTH + CELL_SIZE) continue;
      if (cy < UI_HEIGHT - CELL_SIZE || cy > HEIGHT + CELL_SIZE) continue;

      const isWinCell = winCellsCache?.has(encodeCell(row, col)) ?? false;
      const isLast = lastMove && lastMove.row === row && lastMove.col === col;

      if (isLast && !isWinCell) {
        k.drawRect({
          pos: k.vec2(cx - CELL_SIZE / 2, cy - CELL_SIZE / 2),
          width: CELL_SIZE,
          height: CELL_SIZE,
          color: k.rgb(...COLOR_LAST),
          opacity: 0.15,
        });
      }

      if (isWinCell) {
        k.drawRect({
          pos: k.vec2(cx - CELL_SIZE / 2, cy - CELL_SIZE / 2),
          width: CELL_SIZE,
          height: CELL_SIZE,
          color: k.rgb(...COLOR_WIN),
          opacity: 0.25,
        });
      }

      const color = isWinCell ? COLOR_WIN : player === "X" ? COLOR_X : COLOR_O;
      const pad = CELL_SIZE * 0.25;

      if (player === "X") {
        drawX(cx, cy, pad, color);
      } else {
        drawO(cx, cy, pad, color);
      }
    }

    k.drawRect({
      pos: k.vec2(0, 0),
      width: WIDTH,
      height: UI_HEIGHT,
      color: k.rgb(...COLOR_UI_BG),
    });
  });

  function drawX(
    cx: number,
    cy: number,
    pad: number,
    color: [number, number, number],
  ) {
    k.drawLine({
      p1: k.vec2(cx - pad, cy - pad),
      p2: k.vec2(cx + pad, cy + pad),
      width: 3,
      color: k.rgb(...color),
    });
    k.drawLine({
      p1: k.vec2(cx + pad, cy - pad),
      p2: k.vec2(cx - pad, cy + pad),
      width: 3,
      color: k.rgb(...color),
    });
  }

  function drawO(
    cx: number,
    cy: number,
    pad: number,
    color: [number, number, number],
  ) {
    k.drawCircle({
      pos: k.vec2(cx, cy),
      radius: pad,
      fill: false,
      outline: { width: 3, color: k.rgb(...color) },
    });
  }
});

k.go("menu");
