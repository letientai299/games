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
import {
  connectToRoom,
  generateRoomCode,
  warmupRelays,
  type NetworkHandle,
  type NetworkEvent,
  type RelayInfo,
} from "./network";
import type { Player } from "./constants";

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

  // Back to game picker
  const backBtn = k.add([
    k.rect(40, 40, { radius: 10 }),
    k.pos(16, 16),
    k.color(50, 50, 80),
    k.area(),
  ]);
  k.add([
    k.text("\ue9b2", { size: 26, font: ICON_FONT }),
    k.pos(36, 36),
    k.anchor("center"),
    k.color(200, 200, 220),
  ]);
  backBtn.onClick(() => {
    window.location.href = "../";
  });

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

  const remoteBtn = k.add([
    k.rect(260, 60, { radius: 12 }),
    k.pos(WIDTH / 2, 420),
    k.anchor("center"),
    k.color(70, 140, 130),
    k.area(),
  ]);
  k.add([
    k.text("2 Players Remote", { size: 24 }),
    k.pos(WIDTH / 2, 420),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);
  remoteBtn.onClick(() => k.go("remote-lobby"));

  const pvcBtn = k.add([
    k.rect(260, 60, { radius: 12 }),
    k.pos(WIDTH / 2, 500),
    k.anchor("center"),
    k.color(70, 80, 140),
    k.area(),
  ]);
  k.add([
    k.text("vs Computer", { size: 26 }),
    k.pos(WIDTH / 2, 500),
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

function removeCodeInput() {
  document.getElementById("room-code-input")?.remove();
}

const RELAY_COLORS: Record<string, [number, number, number]> = {
  connecting: [180, 180, 100],
  open: [80, 200, 120],
  closed: [200, 80, 80],
};
const RELAY_ICONS: Record<string, string> = {
  connecting: "\u25CB", // ○
  open: "\u25CF",       // ●
  closed: "\u00D7",     // ×
};

function createRelayStatusUI(
  kRef: typeof k,
  baseY: number,
  getNet: () => NetworkHandle | null,
) {
  const labels: ReturnType<typeof k.add>[] = [];
  const startX = 24;

  const statusLabel = kRef.add([
    kRef.text("", { size: 13 }),
    kRef.pos(startX, baseY),
    kRef.color(150, 150, 150),
  ]);
  labels.push(statusLabel);

  let allOpenSince: number | null = null;

  function update() {
    const net = getNet();
    if (!net) return;
    const statuses: RelayInfo[] = net.getRelayStatuses();
    let openCount = 0;
    for (const { status } of statuses) {
      if (status === "open") openCount++;
    }

    if (openCount >= statuses.length && statuses.length > 0) {
      if (!allOpenSince) allOpenSince = Date.now();
      const elapsed = Math.floor((Date.now() - allOpenSince) / 1000);
      statusLabel.text = `${openCount}/${statuses.length} relays | Searching for peer... ${elapsed}s`;
      statusLabel.color = kRef.rgb(120, 180, 160);
    } else if (openCount > 0) {
      statusLabel.text = `Relays: ${openCount}/${statuses.length} connected`;
      statusLabel.color = kRef.rgb(180, 180, 100);
      allOpenSince = null;
    } else {
      statusLabel.text = "Connecting to relays...";
      statusLabel.color = kRef.rgb(150, 150, 150);
      allOpenSince = null;
    }
  }

  const timer = setInterval(update, 500);
  setTimeout(update, 100);

  return {
    labels,
    destroy: () => clearInterval(timer),
  };
}

k.scene(
  "remote-lobby",
  ({ sub = "pick" }: { sub?: "pick" | "create" | "join" } = {}) => {
    let network: NetworkHandle | null = null;

    k.onSceneLeave(() => {
      network?.leave();
      removeCodeInput();
    });

    function drawPick() {
      warmupRelays();
      k.add([
        k.text("Online Play", { size: 40 }),
        k.pos(WIDTH / 2, 120),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);

      const createBtn = k.add([
        k.rect(260, 60, { radius: 12 }),
        k.pos(WIDTH / 2, 280),
        k.anchor("center"),
        k.color(70, 140, 130),
        k.area(),
      ]);
      k.add([
        k.text("Create Game", { size: 26 }),
        k.pos(WIDTH / 2, 280),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);
      createBtn.onClick(() => k.go("remote-lobby", { sub: "create" }));

      const joinBtn = k.add([
        k.rect(260, 60, { radius: 12 }),
        k.pos(WIDTH / 2, 360),
        k.anchor("center"),
        k.color(70, 100, 150),
        k.area(),
      ]);
      k.add([
        k.text("Join Game", { size: 26 }),
        k.pos(WIDTH / 2, 360),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);
      joinBtn.onClick(() => k.go("remote-lobby", { sub: "join" }));

      const backBtn = k.add([
        k.rect(120, 44, { radius: 8 }),
        k.pos(WIDTH / 2, 460),
        k.anchor("center"),
        k.color(80, 80, 110),
        k.area(),
      ]);
      k.add([
        k.text("Back", { size: 20 }),
        k.pos(WIDTH / 2, 460),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);
      backBtn.onClick(() => k.go("menu"));
    }

    function drawCreate() {
      const code = generateRoomCode();

      k.add([
        k.text("Share this code", { size: 28 }),
        k.pos(WIDTH / 2, 140),
        k.anchor("center"),
        k.color(200, 200, 200),
      ]);

      k.add([
        k.text(code, { size: 72 }),
        k.pos(WIDTH / 2, 240),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);

      const statusLabel = k.add([
        k.text("Waiting for opponent...", { size: 20 }),
        k.pos(WIDTH / 2, 330),
        k.anchor("center"),
        k.color(180, 180, 180),
      ]);

      const backBtn = k.add([
        k.rect(120, 44, { radius: 8 }),
        k.pos(WIDTH / 2, 420),
        k.anchor("center"),
        k.color(80, 80, 110),
        k.area(),
      ]);
      k.add([
        k.text("Cancel", { size: 20 }),
        k.pos(WIDTH / 2, 420),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);
      backBtn.onClick(() => {
        network?.leave();
        network = null;
        k.go("remote-lobby");
      });

      network = connectToRoom(code, (event: NetworkEvent) => {
        if (event.type === "connected") {
          relayUI.destroy();
          statusLabel.text = "Connected!";
          statusLabel.color = k.rgb(100, 255, 150);
          const handle = network;
          network = null; // prevent onSceneLeave from closing
          k.wait(0.5, () => {
            k.go("game", {
              mode: "pvp-remote" as GameMode,
              network: handle,
              localPlayer: "X" as Player,
            });
          });
        }
      });

      const relayUI = createRelayStatusUI(k, 530, () => network);
      k.onSceneLeave(() => relayUI.destroy());
    }

    function drawJoin() {
      k.add([
        k.text("Enter room code", { size: 28 }),
        k.pos(WIDTH / 2, 140),
        k.anchor("center"),
        k.color(200, 200, 200),
      ]);

      const statusLabel = k.add([
        k.text("", { size: 18 }),
        k.pos(WIDTH / 2, 340),
        k.anchor("center"),
        k.color(180, 180, 180),
      ]);

      // HTML input + button overlay for mobile-friendly code entry
      const wrapper = document.createElement("div");
      wrapper.id = "room-code-input";
      wrapper.style.cssText = `
      position: fixed; top: 35%; left: 50%; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      z-index: 1000;
    `;

      const input = document.createElement("input");
      input.type = "tel";
      input.inputMode = "numeric";
      input.pattern = "[0-9]*";
      input.maxLength = 4;
      input.placeholder = "0000";
      input.autocomplete = "off";
      input.style.cssText = `
      width: 200px; height: 60px; font-size: 40px; text-align: center;
      letter-spacing: 12px;
      background: rgba(40, 40, 70, 0.95); color: white;
      border: 2px solid rgba(70, 140, 130, 0.8); border-radius: 12px;
      outline: none;
    `;

      const joinHtmlBtn = document.createElement("button");
      joinHtmlBtn.textContent = "Join";
      joinHtmlBtn.style.cssText = `
      width: 160px; height: 50px; font-size: 22px; font-weight: bold;
      background: rgb(70, 140, 130); color: white;
      border: none; border-radius: 10px; cursor: pointer;
    `;

      wrapper.appendChild(input);
      wrapper.appendChild(joinHtmlBtn);
      document.body.appendChild(wrapper);
      input.focus();

      let joinRelayUI: ReturnType<typeof createRelayStatusUI> | null = null;

      function doJoin() {
        const code = input.value.trim();
        if (!/^\d{4}$/.test(code)) {
          statusLabel.text = "Enter a 4-digit code";
          statusLabel.color = k.rgb(255, 100, 100);
          return;
        }
        statusLabel.text = "Connecting...";
        statusLabel.color = k.rgb(180, 180, 180);
        joinHtmlBtn.disabled = true;
        joinHtmlBtn.style.opacity = "0.5";
        input.disabled = true;

        network = connectToRoom(code, (event: NetworkEvent) => {
          if (event.type === "connected") {
            joinRelayUI?.destroy();
            statusLabel.text = "Connected!";
            statusLabel.color = k.rgb(100, 255, 150);
            removeCodeInput();
            const handle = network;
            network = null; // prevent onSceneLeave from closing
            k.wait(0.5, () => {
              k.go("game", {
                mode: "pvp-remote" as GameMode,
                network: handle,
                localPlayer: "O" as Player,
              });
            });
          }
        });

        joinRelayUI = createRelayStatusUI(k, 560, () => network);
      }

      joinHtmlBtn.addEventListener("click", doJoin);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doJoin();
      });

      const backBtn = k.add([
        k.rect(120, 44, { radius: 8 }),
        k.pos(WIDTH / 2, 500),
        k.anchor("center"),
        k.color(80, 80, 110),
        k.area(),
      ]);
      k.add([
        k.text("Back", { size: 20 }),
        k.pos(WIDTH / 2, 500),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);
      backBtn.onClick(() => {
        joinRelayUI?.destroy();
        network?.leave();
        network = null;
        removeCodeInput();
        k.go("remote-lobby");
      });
    }

    if (sub === "pick") drawPick();
    else if (sub === "create") drawCreate();
    else drawJoin();
  },
);

k.scene(
  "game",
  ({
    mode,
    level = 2,
    network = null,
    localPlayer = "X",
  }: {
    mode: GameMode;
    level?: AiLevel;
    network?: NetworkHandle | null;
    localPlayer?: Player;
  }) => {
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

    const initialLabel =
      mode === "pvp-remote"
        ? localPlayer === "X"
          ? "Your turn"
          : "Waiting..."
        : "X's turn";
    const turnLabel = k.add([
      k.text(initialLabel, { size: 22 }),
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
      network?.leave();
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
      {
        text: "New Game",
        icon: "\ue3ba",
        action: () => {
          network?.leave();
          k.go("menu");
        },
      },
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
      if (mode === "pvp-remote") return;
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
      if (mode === "pvp-remote") return;
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
      let label: string;
      if (state.winner) {
        label =
          mode === "pvp-remote"
            ? state.winner.player === localPlayer
              ? "You win!"
              : "You lose!"
            : `${player} wins!`;
      } else if (mode === "pvp-remote") {
        label =
          state.currentPlayer === localPlayer ? "Your turn" : "Waiting...";
      } else {
        label = `${player}'s turn`;
      }
      turnLabel.text = label;
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

      // Level 1: instant, run synchronously
      if (level <= 1) {
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
      if (mode === "pvp-remote" && state.currentPlayer !== localPlayer) return;

      const worldX = screenPos.x + camX - WIDTH / 2;
      const worldY = screenPos.y + camY - (UI_HEIGHT + GAME_HEIGHT / 2);

      const col = Math.round(worldX / CELL_SIZE);
      const row = Math.round(worldY / CELL_SIZE);

      if (placeMove(state, row, col)) {
        updateTurnLabel();

        if (mode === "pvp-remote" && network) {
          network.send({ row, col });
        } else if (mode === "pvc" && !state.winner) {
          requestAiMove();
        }
      }
    }

    // Wire up incoming remote moves and disconnect handling
    if (mode === "pvp-remote" && network) {
      network.setOnEvent((event: NetworkEvent) => {
        if (event.type === "move") {
          if (state.currentPlayer !== localPlayer && !state.winner) {
            placeMove(state, event.row, event.col);
            updateTurnLabel();
          }
        } else if (event.type === "disconnected") {
          showDisconnectOverlay();
        }
      });
    }

    function showDisconnectOverlay() {
      locked = true;
      k.add([
        k.rect(WIDTH, HEIGHT),
        k.pos(0, 0),
        k.color(0, 0, 0),
        k.opacity(0.6),
        k.z(300),
        k.fixed(),
      ]);
      k.add([
        k.text("Opponent disconnected", { size: 24 }),
        k.pos(WIDTH / 2, HEIGHT / 2 - 40),
        k.anchor("center"),
        k.color(255, 100, 100),
        k.z(301),
        k.fixed(),
      ]);
      const backBtn = k.add([
        k.rect(180, 50, { radius: 10 }),
        k.pos(WIDTH / 2, HEIGHT / 2 + 30),
        k.anchor("center"),
        k.color(80, 80, 110),
        k.area(),
        k.z(301),
        k.fixed(),
      ]);
      k.add([
        k.text("Back to Menu", { size: 20 }),
        k.pos(WIDTH / 2, HEIGHT / 2 + 30),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.z(302),
        k.fixed(),
      ]);
      backBtn.onClick(() => {
        network?.leave();
        location.hash = "";
        k.go("menu");
      });
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

        const color = isWinCell
          ? COLOR_WIN
          : player === "X"
            ? COLOR_X
            : COLOR_O;
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
  },
);

k.go("menu");
