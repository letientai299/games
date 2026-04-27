// Grid
export const COLS = 8;
export const ROWS = 8;

// Layout
export const BOARD_PADDING = 16;
export const BOARD_WIDTH = 480 - BOARD_PADDING * 2; // 448
export const CELL_SIZE = BOARD_WIDTH / COLS; // 56
export const BOARD_TOP = 120;

// Gem sprites (indices 0–6) — chosen for max color contrast
export const GEM_NAMES = [
  "pikachu", // yellow
  "arcanine", // red/orange
  "lapras", // blue
  "oddish", // green
  "gengar", // purple
  "wigglytuff", // pink
  "dewgong", // white/cyan
] as const;

export const NUM_GEMS = GEM_NAMES.length;

// Sprite natural size (resized from PokeAPI official artwork)
export const SPRITE_SIZE = 128;
export const GEM_DISPLAY = CELL_SIZE - 4; // 52px with 2px gap
export const GEM_SCALE = GEM_DISPLAY / SPRITE_SIZE;

// Scoring
export const MATCH_SCORES: Record<number, number> = {
  3: 30,
  4: 60,
  5: 100,
};

// Animation durations (seconds)
export const SWAP_DURATION = 0.2;
export const FALL_PER_CELL = 0.08;
export const DESTROY_DURATION = 0.15;

// Persistence
export const HIGH_SCORE_KEY = "match3_high_score";
export const SAVE_KEY = "match3_save";

export interface SaveData {
  board: number[][];
  score: number;
  hintsUsed: number;
}

// Types
export interface GridPos {
  row: number;
  col: number;
}

export function gridToPixel(col: number, row: number) {
  return {
    x: BOARD_PADDING + col * CELL_SIZE + CELL_SIZE / 2,
    y: BOARD_TOP + row * CELL_SIZE + CELL_SIZE / 2,
  };
}

export function encodePos(row: number, col: number) {
  return row * COLS + col;
}

export function decodePos(encoded: number): GridPos {
  return { row: Math.floor(encoded / COLS), col: encoded % COLS };
}
