import { type GridSize, SHUFFLE_SWAPS } from "./constants";

export interface Board {
  size: GridSize;
  /** Flat array of tile indices. 0..n-2 are image tiles, n-1 is the blank. */
  tiles: number[];
  /** Index of the blank tile in the tiles array. */
  blankIdx: number;
}

export function createBoard(size: GridSize): Board {
  const n = size * size;
  const tiles = Array.from({ length: n }, (_, i) => i);
  return { size, tiles, blankIdx: n - 1 };
}

/** Returns the flat indices of tiles adjacent to the blank. */
function blankNeighbors(board: Board): number[] {
  const { size, blankIdx } = board;
  const row = Math.floor(blankIdx / size);
  const col = blankIdx % size;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(blankIdx - size);
  if (row < size - 1) neighbors.push(blankIdx + size);
  if (col > 0) neighbors.push(blankIdx - 1);
  if (col < size - 1) neighbors.push(blankIdx + 1);
  return neighbors;
}

/** Shuffle by random-walking the blank from the solved state. */
export function shuffle(board: Board, rand: () => number): void {
  const swaps = SHUFFLE_SWAPS[board.size];
  let prev = -1;
  for (let i = 0; i < swaps; i++) {
    const neighbors = blankNeighbors(board).filter((n) => n !== prev);
    const pick = neighbors[Math.floor(rand() * neighbors.length)];
    prev = board.blankIdx;
    board.tiles[board.blankIdx] = board.tiles[pick];
    board.tiles[pick] = board.size * board.size - 1;
    board.blankIdx = pick;
  }
}

/** Try to move tile at (col, row) into the blank. Returns true if valid. */
export function tryMove(board: Board, col: number, row: number): boolean {
  const idx = row * board.size + col;
  const neighbors = blankNeighbors(board);
  if (!neighbors.includes(idx)) return false;

  board.tiles[board.blankIdx] = board.tiles[idx];
  board.tiles[idx] = board.size * board.size - 1;
  board.blankIdx = idx;
  return true;
}

/** Check if the puzzle is solved (all tiles in order). */
export function isSolved(board: Board): boolean {
  return board.tiles.every((t, i) => t === i);
}

/** Get (col, row) for a flat index. */
export function idxToPos(
  idx: number,
  size: GridSize,
): { col: number; row: number } {
  return { col: idx % size, row: Math.floor(idx / size) };
}
