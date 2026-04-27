export const CELL_SIZE = 40;
export const WIDTH = 480;
export const HEIGHT = 720;
export const WIN_LENGTH = 5;

export const COLOR_BG: [number, number, number] = [26, 26, 46];
export const COLOR_GRID: [number, number, number] = [60, 60, 90];
export const COLOR_X: [number, number, number] = [255, 100, 100];
export const COLOR_O: [number, number, number] = [100, 180, 255];
export const COLOR_WIN: [number, number, number] = [255, 215, 0];
export const COLOR_LAST: [number, number, number] = [255, 255, 100];
export const COLOR_UI_BG: [number, number, number] = [40, 40, 70];

export type Player = "X" | "O";

export type GameMode = "pvp" | "pvc";

// Right, down, down-right, down-left
export const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function encodeCell(row: number, col: number): string {
  return `${row},${col}`;
}

export function decodeCell(key: string): { row: number; col: number } {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}
