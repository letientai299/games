import { encodeCell, decodeCell, type Player } from "../constants";
import type { BoardState } from "../board";

/**
 * Generate candidate moves (for single-ply levels that don't use search).
 */
export function getCandidates(
  state: BoardState,
  radius: number,
): { row: number; col: number }[] {
  if (state.moves.length === 0) return [{ row: 0, col: 0 }];

  const seen = new Set<number>();

  for (const { row, col } of state.moves) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const key = encodeCell(row + dr, col + dc);
        if (!state.cells.has(key)) {
          seen.add(key);
        }
      }
    }
  }

  return [...seen].map(decodeCell);
}

/**
 * Incremental candidate tracker for the search tree.
 * Maintains a set of candidate keys with O(1) make/undo.
 */
export class CandidateTracker {
  readonly keys: Set<number>;
  private undoStack: { removed: number; added: number[] }[] = [];
  private radius: number;

  constructor(
    cells: Map<number, Player>,
    moves: { row: number; col: number }[],
    radius: number,
  ) {
    this.radius = radius;
    this.keys = new Set();

    if (moves.length === 0) {
      this.keys.add(encodeCell(0, 0));
      return;
    }

    for (const { row, col } of moves) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const k = encodeCell(row + dr, col + dc);
          if (!cells.has(k)) this.keys.add(k);
        }
      }
    }
  }

  /** Call AFTER cells.set(key, player). */
  makeMove(cells: Map<number, Player>, row: number, col: number): void {
    const key = encodeCell(row, col);
    const wasCandidate = this.keys.delete(key);
    const added: number[] = [];

    for (let dr = -this.radius; dr <= this.radius; dr++) {
      for (let dc = -this.radius; dc <= this.radius; dc++) {
        const nk = encodeCell(row + dr, col + dc);
        if (!cells.has(nk) && !this.keys.has(nk)) {
          this.keys.add(nk);
          added.push(nk);
        }
      }
    }

    this.undoStack.push({ removed: wasCandidate ? key : -1, added });
  }

  /** Call BEFORE cells.delete(key). */
  undoMove(): void {
    const frame = this.undoStack.pop()!;
    for (const k of frame.added) this.keys.delete(k);
    if (frame.removed !== -1) this.keys.add(frame.removed);
  }

  toArray(): { row: number; col: number }[] {
    return [...this.keys].map(decodeCell);
  }

  /** Return candidates sorted by proximity to (lastRow, lastCol), capped. */
  toSortedArray(
    lastRow: number,
    lastCol: number,
    cap: number,
  ): { row: number; col: number }[] {
    const arr: { row: number; col: number; dist: number }[] = [];
    for (const k of this.keys) {
      const { row, col } = decodeCell(k);
      arr.push({
        row,
        col,
        dist: Math.abs(row - lastRow) + Math.abs(col - lastCol),
      });
    }
    arr.sort((a, b) => a.dist - b.dist);
    if (arr.length > cap) arr.length = cap;
    return arr;
  }
}
