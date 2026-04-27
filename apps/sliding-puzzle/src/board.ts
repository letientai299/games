import { GRID_SIZE, SHUFFLE_SWAPS } from "./constants";

export interface Board {
  /** Flat array of tile indices. 0..n-2 are image tiles, n-1 is the blank. */
  tiles: number[];
  /** Index of the blank tile in the tiles array. */
  blankIdx: number;
}

const N = GRID_SIZE * GRID_SIZE;

export function createBoard(): Board {
  const tiles = Array.from({ length: N }, (_, i) => i);
  return { tiles, blankIdx: N - 1 };
}

/** Returns the flat indices of tiles adjacent to the blank. */
function blankNeighbors(board: Board): number[] {
  const { blankIdx } = board;
  const row = Math.floor(blankIdx / GRID_SIZE);
  const col = blankIdx % GRID_SIZE;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(blankIdx - GRID_SIZE);
  if (row < GRID_SIZE - 1) neighbors.push(blankIdx + GRID_SIZE);
  if (col > 0) neighbors.push(blankIdx - 1);
  if (col < GRID_SIZE - 1) neighbors.push(blankIdx + 1);
  return neighbors;
}

/** Shuffle by random-walking the blank from the solved state. */
export function shuffle(board: Board, rand: () => number): void {
  let prev = -1;
  for (let i = 0; i < SHUFFLE_SWAPS; i++) {
    const neighbors = blankNeighbors(board).filter((n) => n !== prev);
    const pick = neighbors[Math.floor(rand() * neighbors.length)];
    prev = board.blankIdx;
    board.tiles[board.blankIdx] = board.tiles[pick];
    board.tiles[pick] = N - 1;
    board.blankIdx = pick;
  }
}

/** Try to move tile at (col, row) into the blank. Returns true if valid. */
export function tryMove(board: Board, col: number, row: number): boolean {
  const idx = row * GRID_SIZE + col;
  const neighbors = blankNeighbors(board);
  if (!neighbors.includes(idx)) return false;

  board.tiles[board.blankIdx] = board.tiles[idx];
  board.tiles[idx] = N - 1;
  board.blankIdx = idx;
  return true;
}

/** Check if the puzzle is solved (all tiles in order). */
export function isSolved(board: Board): boolean {
  return board.tiles.every((t, i) => t === i);
}

/** Get (col, row) for a flat index. */
export function idxToPos(idx: number): { col: number; row: number } {
  return { col: idx % GRID_SIZE, row: Math.floor(idx / GRID_SIZE) };
}
