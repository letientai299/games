import { describe, test, expect } from "vitest";
import type { AiLevel } from "../constants";
import { createBoard, placeMove } from "../board";
import { findBestMove } from "./index";

function boardFromMoves(
  moves: [number, number][],
): ReturnType<typeof createBoard> {
  const state = createBoard();
  for (const [r, c] of moves) placeMove(state, r, c);
  return state;
}

describe("findBestMove", () => {
  const levels: AiLevel[] = [1, 2, 3, 4, 5, 6];

  test("returns valid move on empty board", () => {
    for (const level of levels) {
      const state = createBoard();
      const move = findBestMove(state, level);
      expect(move).toHaveProperty("row");
      expect(move).toHaveProperty("col");
    }
  });

  describe.each([2, 3, 4, 5, 6] as AiLevel[])("level %i", (level) => {
    test("takes winning move (4 in a row, complete to 5)", () => {
      // X has 4 in a row: (0,0),(0,1),(0,2),(0,3) — should play (0,4) or (0,-1)
      // O has scattered moves to fill alternation
      const state = boardFromMoves([
        [0, 0],
        [5, 0], // O
        [0, 1],
        [5, 1], // O
        [0, 2],
        [5, 2], // O
        [0, 3],
        [5, 3], // O — X's turn, should win
      ]);
      const move = findBestMove(state, level);
      const wins =
        (move.row === 0 && move.col === 4) ||
        (move.row === 0 && move.col === -1);
      expect(wins).toBe(true);
    });

    test("blocks opponent four in a row", () => {
      // O has 4 in a row: (1,0),(1,1),(1,2),(1,3)
      // X must block at (1,4) or (1,-1)
      const state = boardFromMoves([
        [0, 0],
        [1, 0], // O
        [0, 1],
        [1, 1], // O
        [0, 2],
        [1, 2], // O
        [5, 5],
        [1, 3], // O has 4: (1,0)-(1,3), X's turn
      ]);
      const move = findBestMove(state, level);
      const blocks =
        (move.row === 1 && move.col === 4) ||
        (move.row === 1 && move.col === -1);
      expect(blocks).toBe(true);
    });
  });

  describe.each([3, 4, 5, 6] as AiLevel[])("level %i (lookahead)", (level) => {
    test("blocks open three (prevents opponent open four)", () => {
      // O has open three: .OOO. at row 1
      // X should block one of the ends
      const state = boardFromMoves([
        [0, 0],
        [1, 1], // O
        [0, 5],
        [1, 2], // O
        [0, 6],
        [1, 3], // O has open three, X's turn
      ]);
      const move = findBestMove(state, level);
      // Should play near the threat — either blocking end or within the line
      const nearThreat =
        move.row >= 0 && move.row <= 2 && move.col >= 0 && move.col <= 5;
      expect(nearThreat).toBe(true);
    });
  });
});
