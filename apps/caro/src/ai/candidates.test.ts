import { describe, test, expect } from "vitest";
import { encodeCell, type Player } from "../constants";
import { createBoard, placeMove } from "../board";
import { getCandidates, CandidateTracker } from "./candidates";

describe("getCandidates", () => {
  test("returns center on empty board", () => {
    const state = createBoard();
    const candidates = getCandidates(state, 2);
    expect(candidates).toEqual([{ row: 0, col: 0 }]);
  });

  test("radius 1 returns 8 neighbors after first move", () => {
    const state = createBoard();
    placeMove(state, 0, 0); // X at center
    const candidates = getCandidates(state, 1);
    // 8 neighbors minus the occupied cell
    expect(candidates).toHaveLength(8);
    for (const c of candidates) {
      expect(Math.abs(c.row)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.col)).toBeLessThanOrEqual(1);
      expect(c.row !== 0 || c.col !== 0).toBe(true);
    }
  });

  test("excludes occupied cells", () => {
    const state = createBoard();
    placeMove(state, 0, 0);
    placeMove(state, 0, 1);
    const candidates = getCandidates(state, 1);
    const occupied = candidates.filter(
      (c) => (c.row === 0 && c.col === 0) || (c.row === 0 && c.col === 1),
    );
    expect(occupied).toHaveLength(0);
  });
});

describe("CandidateTracker", () => {
  test("make/undo is reversible", () => {
    const cells = new Map<number, Player>();
    cells.set(encodeCell(0, 0), "X");
    const moves = [{ row: 0, col: 0 }];
    const tracker = new CandidateTracker(cells, moves, 2);

    const keysBefore = new Set(tracker.keys);

    // Make a move
    const key = encodeCell(1, 1);
    cells.set(key, "O");
    tracker.makeMove(cells, 1, 1);

    // Keys should have changed
    expect(tracker.keys.has(key)).toBe(false); // occupied cell removed

    // Undo
    tracker.undoMove();
    cells.delete(key);

    expect(new Set(tracker.keys)).toEqual(keysBefore);
  });

  test("toSortedArray returns closest moves first", () => {
    const cells = new Map<number, Player>();
    cells.set(encodeCell(0, 0), "X");
    cells.set(encodeCell(3, 3), "O");
    const moves = [
      { row: 0, col: 0 },
      { row: 3, col: 3 },
    ];
    const tracker = new CandidateTracker(cells, moves, 2);

    const sorted = tracker.toSortedArray(0, 0, 5);
    // First element should be closest to (0,0)
    const dist0 = Math.abs(sorted[0].row) + Math.abs(sorted[0].col);
    const distLast =
      Math.abs(sorted[sorted.length - 1].row) +
      Math.abs(sorted[sorted.length - 1].col);
    expect(dist0).toBeLessThanOrEqual(distLast);
  });

  test("cap limits result size", () => {
    const cells = new Map<number, Player>();
    cells.set(encodeCell(0, 0), "X");
    const moves = [{ row: 0, col: 0 }];
    const tracker = new CandidateTracker(cells, moves, 2);

    const sorted = tracker.toSortedArray(0, 0, 3);
    expect(sorted.length).toBeLessThanOrEqual(3);
  });
});
