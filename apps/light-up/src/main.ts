import kaplay from "kaplay";
import materialSymbolsUrl from "./assets/fonts/material-symbols.ttf";
import {
  WIDTH,
  HEIGHT,
  ICON_FONT,
  DISPLAY_TIME,
  RESULT_PAUSE,
  STREAK_TO_LEVEL_UP,
  STREAK_TO_LEVEL_DOWN,
  COLOR_BG,
  COLOR_CELL,
  COLOR_LIT,
  COLOR_BOMB,
  COLOR_CORRECT,
  COLOR_WRONG,
  COLOR_MISSED,
  COLOR_UI_BG,
  COLOR_TEXT,
  COLOR_TEXT_DIM,
  COLOR_SELECTED,
  COLOR_BTN,
  type Profile,
} from "./constants";
import { getLevel } from "./levels";
import {
  loadProfiles,
  createProfile,
  deleteProfile,
  getProfile,
  updateProfile,
} from "./storage";

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

// ---------------------------------------------------------------------------
// Profiles scene
// ---------------------------------------------------------------------------

k.scene("profiles", () => {
  // Title
  k.add([
    k.text("Light Up", { size: 44 }),
    k.pos(WIDTH / 2, 60),
    k.anchor("center"),
    k.color(...COLOR_TEXT),
  ]);
  k.add([
    k.text("Tap the cells you remember", { size: 16 }),
    k.pos(WIDTH / 2, 92),
    k.anchor("center"),
    k.color(...COLOR_TEXT_DIM),
  ]);

  // Home button
  const homeBtn = k.add([
    k.rect(40, 40, { radius: 10 }),
    k.pos(16, 16),
    k.color(...COLOR_UI_BG),
    k.area(),
  ]);
  k.add([
    k.text("\ue9b2", { size: 26, font: ICON_FONT }),
    k.pos(36, 36),
    k.anchor("center"),
    k.color(200, 200, 220),
  ]);
  homeBtn.onClick(() => {
    window.location.href = "../";
  });

  const LIST_TOP = 140;
  const ROW_HEIGHT = 46;
  const ROW_GAP = 14;
  const ROW_STEP = ROW_HEIGHT + ROW_GAP;
  const LIST_X = 40;
  const LIST_W = WIDTH - 80;
  let pendingDelete: string | null = null;

  function renderList() {
    k.get("profile-row").forEach((o) => k.destroy(o));
    k.get("profile-label").forEach((o) => k.destroy(o));

    const profiles = loadProfiles();

    profiles.forEach((p, i) => {
      const y = LIST_TOP + i * ROW_STEP;

      const row = k.add([
        k.rect(LIST_W, 46, { radius: 10 }),
        k.pos(LIST_X, y),
        k.color(...COLOR_UI_BG),
        k.area(),
        "profile-row",
      ]);

      k.add([
        k.text(p.name, { size: 20 }),
        k.pos(LIST_X + 16, y + ROW_HEIGHT / 2),
        k.anchor("left"),
        k.color(...COLOR_TEXT),
        "profile-label",
      ]);

      k.add([
        k.text(`Lv ${p.level}`, { size: 16 }),
        k.pos(LIST_X + LIST_W - 56, y + ROW_HEIGHT / 2),
        k.anchor("right"),
        k.color(...COLOR_TEXT_DIM),
        "profile-label",
      ]);

      const trash = k.add([
        k.text("\ue872", { size: 22, font: ICON_FONT }),
        k.pos(LIST_X + LIST_W - 16, y + ROW_HEIGHT / 2),
        k.anchor("center"),
        k.color(180, 100, 100),
        k.area({ shape: new k.Rect(k.vec2(-16, -16), 32, 32) }),
        "profile-label",
      ]);

      trash.onClick(() => {
        if (pendingDelete === p.name) {
          deleteProfile(p.name);
          pendingDelete = null;
          renderList();
        } else {
          pendingDelete = p.name;
          trash.color = k.rgb(255, 60, 60);
        }
      });

      row.onClick(() => {
        k.go("game", { profileName: p.name });
      });
    });

    // "New Player" button
    const btnY = LIST_TOP + profiles.length * ROW_STEP;
    const btnW = 200;
    const btnX = (WIDTH - btnW) / 2;
    const btn = k.add([
      k.rect(btnW, ROW_HEIGHT, { radius: 10 }),
      k.pos(btnX, btnY),
      k.color(...COLOR_BTN),
      k.area(),
      "profile-row",
    ]);
    k.add([
      k.text("+ New Player", { size: 20 }),
      k.pos(btnX + btnW / 2, btnY + ROW_HEIGHT / 2),
      k.anchor("center"),
      k.color(255, 255, 255),
      "profile-label",
    ]);
    btn.onClick(() => showNameInput());
  }

  function showNameInput() {
    const wrapper = document.createElement("div");
    wrapper.id = "name-input-overlay";
    wrapper.style.cssText = `
      position: fixed; top: 35%; left: 50%; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      z-index: 1000;
    `;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 12;
    input.placeholder = "Name";
    input.autocomplete = "off";
    input.style.cssText = `
      width: 220px; height: 54px; font-size: 28px; text-align: center;
      background: rgba(40, 40, 70, 0.95); color: white;
      border: 2px solid rgba(100, 180, 255, 0.8); border-radius: 12px;
      outline: none;
    `;

    const btnRow = document.createElement("div");
    btnRow.style.cssText = `display: flex; gap: 12px;`;

    const okBtn = document.createElement("button");
    okBtn.textContent = "Create";
    okBtn.style.cssText = `
      width: 120px; height: 44px; font-size: 20px; font-weight: bold;
      background: rgb(70, 130, 180); color: white;
      border: none; border-radius: 10px; cursor: pointer;
    `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      width: 100px; height: 44px; font-size: 20px;
      background: rgb(80, 80, 110); color: white;
      border: none; border-radius: 10px; cursor: pointer;
    `;

    btnRow.appendChild(okBtn);
    btnRow.appendChild(cancelBtn);
    wrapper.appendChild(input);
    wrapper.appendChild(btnRow);
    document.body.appendChild(wrapper);
    input.focus();

    function cleanup() {
      wrapper.remove();
    }

    function submit() {
      const name = input.value.trim();
      if (!name) return;
      if (loadProfiles().some((p) => p.name === name)) {
        input.style.borderColor = "rgba(255, 80, 80, 0.8)";
        return;
      }
      createProfile(name);
      cleanup();
      renderList();
    }

    okBtn.addEventListener("click", submit);
    cancelBtn.addEventListener("click", cleanup);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") cleanup();
    });
  }

  renderList();
});

// ---------------------------------------------------------------------------
// Game scene
// ---------------------------------------------------------------------------

k.scene("game", ({ profileName }: { profileName: string }) => {
  let profile: Profile | undefined = getProfile(profileName);
  if (!profile) {
    k.go("profiles");
    return;
  }

  const TOP_BAR_H = 56;
  const GRID_PAD = 24;
  const GRID_AREA = WIDTH - GRID_PAD * 2;
  const GRID_TOP = TOP_BAR_H + 20;

  // Top bar
  k.add([k.rect(WIDTH, TOP_BAR_H), k.pos(0, 0), k.color(...COLOR_UI_BG)]);

  const levelLabel = k.add([
    k.text(`Level ${profile.level}`, { size: 22 }),
    k.pos(20, TOP_BAR_H / 2),
    k.anchor("left"),
    k.color(...COLOR_TEXT),
  ]);

  const backBtn = k.add([
    k.rect(40, 40, { radius: 10 }),
    k.pos(WIDTH - 36, TOP_BAR_H / 2),
    k.anchor("center"),
    k.color(60, 60, 90),
    k.area(),
  ]);
  k.add([
    k.text("\ue5cd", { size: 26, font: ICON_FONT }),
    k.pos(WIDTH - 36, TOP_BAR_H / 2),
    k.anchor("center"),
    k.color(200, 200, 220),
  ]);
  backBtn.onClick(() => k.go("profiles"));

  const statusLabel = k.add([
    k.text("", { size: 20 }),
    k.pos(WIDTH / 2, HEIGHT - 40),
    k.anchor("center"),
    k.color(...COLOR_TEXT),
  ]);

  const counterLabel = k.add([
    k.text("", { size: 18 }),
    k.pos(WIDTH / 2, GRID_TOP - 6),
    k.anchor("bot"),
    k.color(...COLOR_TEXT_DIM),
  ]);

  // Done button
  const doneBtn = k.add([
    k.rect(140, 46, { radius: 10 }),
    k.pos(WIDTH / 2, HEIGHT - 90),
    k.anchor("center"),
    k.color(...COLOR_BTN),
    k.area(),
    k.opacity(0),
  ]);
  const doneBtnLabel = k.add([
    k.text("Done", { size: 22 }),
    k.pos(WIDTH / 2, HEIGHT - 90),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.opacity(0),
  ]);

  let phase: "preview" | "input" | "result" = "preview";
  let litSet = new Set<number>();
  let bombSet = new Set<number>();
  let selected = new Set<number>();
  let cellObjects: ReturnType<typeof k.add>[] = [];
  let cellLabelObjects: ReturnType<typeof k.add>[] = [];
  let config = getLevel(profile.level);

  function cs() {
    const gap = 6;
    return (GRID_AREA - (config.gridSize - 1) * gap) / config.gridSize;
  }

  function cellPos(idx: number): [number, number] {
    const gap = 6;
    const size = cs();
    const col = idx % config.gridSize;
    const row = Math.floor(idx / config.gridSize);
    const totalW = config.gridSize * size + (config.gridSize - 1) * gap;
    const ox = (WIDTH - totalW) / 2;
    const oy = GRID_TOP + (GRID_AREA - totalW) / 2;
    return [ox + col * (size + gap), oy + row * (size + gap)];
  }

  function pickRandom(
    count: number,
    total: number,
    exclude: Set<number>,
  ): Set<number> {
    const available: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!exclude.has(i)) available.push(i);
    }
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return new Set(available.slice(0, count));
  }

  function clearGrid() {
    cellObjects.forEach((o) => k.destroy(o));
    cellLabelObjects.forEach((o) => k.destroy(o));
    cellObjects = [];
    cellLabelObjects = [];
  }

  function cellColor(i: number): [number, number, number] {
    if (phase === "preview") {
      if (litSet.has(i)) return COLOR_LIT;
      if (bombSet.has(i)) return COLOR_BOMB;
      return COLOR_CELL;
    }
    if (phase === "input") {
      return selected.has(i) ? COLOR_SELECTED : COLOR_CELL;
    }
    // result
    if (litSet.has(i) && selected.has(i)) return COLOR_CORRECT;
    if (litSet.has(i)) return COLOR_MISSED;
    if (bombSet.has(i) && selected.has(i)) return COLOR_WRONG;
    if (bombSet.has(i)) return COLOR_BOMB;
    if (selected.has(i)) return COLOR_WRONG;
    return COLOR_CELL;
  }

  function drawGrid() {
    clearGrid();
    const size = cs();
    const total = config.gridSize * config.gridSize;
    const radius = Math.max(6, size * 0.1);

    for (let i = 0; i < total; i++) {
      const [x, y] = cellPos(i);

      const cell = k.add([
        k.rect(size, size, { radius }),
        k.pos(x, y),
        k.color(...cellColor(i)),
        k.area(),
      ]);
      cellObjects.push(cell);

      if ((phase === "preview" || phase === "result") && bombSet.has(i)) {
        const lbl = k.add([
          k.text("\ue3ba", { size: Math.min(size * 0.5, 28), font: ICON_FONT }),
          k.pos(x + size / 2, y + size / 2),
          k.anchor("center"),
          k.color(255, 255, 255),
        ]);
        cellLabelObjects.push(lbl);
      }

      if (phase === "input") {
        cell.onClick(() => {
          if (phase !== "input") return;
          if (selected.has(i)) selected.delete(i);
          else selected.add(i);
          updateCounter();
          const [r, g, b] = cellColor(i);
          cell.color = k.rgb(r, g, b);
        });
      }
    }
  }

  function updateCounter() {
    counterLabel.text =
      phase === "input" ? `${selected.size} / ${config.litCount}` : "";
  }

  function showDoneBtn(visible: boolean) {
    doneBtn.opacity = visible ? 1 : 0;
    doneBtnLabel.opacity = visible ? 1 : 0;
    doneBtn.area.scale = k.vec2(visible ? 1 : 0);
  }

  function startRound() {
    profile = getProfile(profileName)!;
    config = getLevel(profile.level);
    levelLabel.text = `Level ${profile.level}`;
    statusLabel.text = "Remember the pattern";
    statusLabel.color = k.rgb(...COLOR_TEXT);

    const total = config.gridSize * config.gridSize;
    litSet = pickRandom(config.litCount, total, new Set());
    bombSet = pickRandom(config.bombCount, total, litSet);
    selected = new Set();

    phase = "preview";
    showDoneBtn(false);
    updateCounter();
    drawGrid();

    let remaining = DISPLAY_TIME / 1000;
    statusLabel.text = `Remember the pattern  ${remaining}s`;
    const countdown = k.onUpdate(() => {
      const next = Math.ceil(remaining - k.dt());
      if (next !== Math.ceil(remaining) || next < remaining) {
        remaining -= k.dt();
        if (remaining > 0) {
          statusLabel.text = `Remember the pattern  ${Math.ceil(remaining)}s`;
        }
      } else {
        remaining -= k.dt();
      }
    });

    k.wait(DISPLAY_TIME / 1000, () => {
      countdown.cancel();
      phase = "input";
      statusLabel.text = "Tap the lit cells";
      showDoneBtn(true);
      updateCounter();
      drawGrid();
    });
  }

  function evaluateRound() {
    phase = "result";
    showDoneBtn(false);

    let correct = true;
    for (const i of litSet) {
      if (!selected.has(i)) {
        correct = false;
        break;
      }
    }
    if (correct) {
      for (const i of selected) {
        if (!litSet.has(i)) {
          correct = false;
          break;
        }
      }
    }

    drawGrid();

    if (correct) {
      statusLabel.color = k.rgb(...COLOR_CORRECT);
      if (profile!.streakType === "correct") {
        profile!.streak++;
      } else {
        profile!.streak = 1;
        profile!.streakType = "correct";
      }
      if (profile!.streak >= STREAK_TO_LEVEL_UP) {
        profile!.level++;
        profile!.streak = 0;
        statusLabel.text = `Correct! Level up → ${profile!.level}`;
      } else {
        statusLabel.text = "Correct!";
      }
    } else {
      statusLabel.color = k.rgb(...COLOR_WRONG);
      if (profile!.streakType === "wrong") {
        profile!.streak++;
      } else {
        profile!.streak = 1;
        profile!.streakType = "wrong";
      }
      if (profile!.streak >= STREAK_TO_LEVEL_DOWN && profile!.level > 1) {
        profile!.level--;
        profile!.streak = 0;
        statusLabel.text = `Wrong! Level down → ${profile!.level}`;
      } else {
        statusLabel.text = "Wrong!";
      }
    }

    updateProfile(profile!);
    updateCounter();

    k.wait(RESULT_PAUSE / 1000, () => {
      startRound();
    });
  }

  doneBtn.onClick(() => {
    if (phase === "input") evaluateRound();
  });

  startRound();
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

k.go("profiles");
