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
} from "./constants";
import { createBoard, placeMove, undoMove, type BoardState } from "./board";
import { findBestMove } from "./ai";

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

const UI_HEIGHT = 44;
const GAME_HEIGHT = HEIGHT - UI_HEIGHT;

k.scene("menu", () => {
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
  pvcBtn.onClick(() => k.go("game", { mode: "pvc" as GameMode }));
});

k.scene("game", ({ mode }: { mode: GameMode }) => {
  let state: BoardState = createBoard();
  let camX = 0;
  let camY = 0;
  let locked = false;
  let winCellsCache: Set<string> | null = null;

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

  const menuBtn = k.add([
    k.rect(70, 30, { radius: 6 }),
    k.pos(WIDTH - 12, UI_HEIGHT / 2),
    k.anchor("right"),
    k.color(80, 80, 110),
    k.area(),
    k.z(101),
    k.fixed(),
  ]);
  k.add([
    k.text("Menu", { size: 16 }),
    k.pos(WIDTH - 47, UI_HEIGHT / 2),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(102),
    k.fixed(),
  ]);

  let menuOpen = false;
  const DROPDOWN_W = 140;
  const DROPDOWN_ITEM_H = 38;
  const DROPDOWN_X = WIDTH - 12 - DROPDOWN_W;
  const DROPDOWN_Y = UI_HEIGHT;
  const dropdownObjs: ReturnType<typeof k.add>[] = [];

  const menuOptions = [
    { text: "Undo", action: doUndo },
    { text: "Restart", action: doRestart },
    { text: "New Game", action: () => k.go("menu") },
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
    const label = k.add([
      k.text(menuOptions[i].text, { size: 18 }),
      k.pos(DROPDOWN_X + DROPDOWN_W / 2, y + DROPDOWN_ITEM_H / 2),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.z(201),
      k.fixed(),
    ]);
    label.hidden = true;
    const action = menuOptions[i].action;
    bg.onClick(() => {
      if (!menuOpen) return;
      closeMenu();
      action();
    });
    dropdownObjs.push(bg, label);
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
    if (menuOpen) closeMenu();
    else openMenu();
  });

  function doUndo() {
    if (locked || state.moves.length === 0) return;
    if (mode === "pvc") {
      // Always undo in pairs so it stays the human's turn
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

    // Rebuild win cells cache
    if (state.winner) {
      winCellsCache = new Set(
        state.winner.cells.map((c) => encodeCell(c.row, c.col)),
      );
    } else {
      winCellsCache = null;
    }
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
    const wasMenuOpen = menuOpen;
    if (menuOpen && panStart && panStart.y >= UI_HEIGHT) {
      closeMenu();
    }
    if (!wasMenuOpen && !didPan && !locked && panStart && panStart.y >= UI_HEIGHT) {
      handleClick(k.mousePos());
    }
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
        locked = true;
        k.wait(0.2, () => {
          const move = findBestMove(state);
          placeMove(state, move.row, move.col);
          updateTurnLabel();
          locked = false;
        });
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
