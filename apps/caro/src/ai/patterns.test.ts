import { describe, test, expect } from "vitest";
import { encodeCell, type Player } from "../constants";
import { evaluateCell } from "./patterns";
import { THREAT_SCORE } from "./types";

function makeBoard(moves: [number, number, Player][]): Map<number, Player> {
  const cells = new Map<number, Player>();
  for (const [r, c, p] of moves) cells.set(encodeCell(r, c), p);
  return cells;
}

describe("evaluateCell", () => {
  test("five in a row scores FIVE", () => {
    // XXXXX — evaluate the center cell
    const cells = makeBoard([
      [0, 0, "X"],
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const score = evaluateCell(cells, 0, 2, "X", false);
    expect(score).toBeGreaterThanOrEqual(THREAT_SCORE.FIVE);
  });

  test("open four detected", () => {
    // .XXXX. — 4 in a row with both ends open
    const cells = makeBoard([
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const score = evaluateCell(cells, 0, 2, "X", false);
    expect(score).toBeGreaterThanOrEqual(THREAT_SCORE.OPEN_FOUR);
  });

  test("half four (one end blocked)", () => {
    // OXXXX. — blocked on left
    const cells = makeBoard([
      [0, 0, "O"],
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const score = evaluateCell(cells, 0, 2, "X", false);
    expect(score).toBeGreaterThanOrEqual(THREAT_SCORE.HALF_FOUR);
  });

  test("broken four: X_XXX pattern", () => {
    // X.XXX — gap at position 1, evaluate at (0,2) which is adjacent to the gap
    const cells = makeBoard([
      [0, 0, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const score = evaluateCell(cells, 0, 2, "X", false);
    expect(score).toBeGreaterThanOrEqual(THREAT_SCORE.BROKEN_FOUR);
  });

  test("broken four: XX_XX pattern", () => {
    const cells = makeBoard([
      [0, 0, "X"],
      [0, 1, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    // Evaluate at (0,1) — should see gap at (0,2) with pieces after
    const score = evaluateCell(cells, 0, 1, "X", false);
    expect(score).toBeGreaterThanOrEqual(THREAT_SCORE.BROKEN_FOUR);
  });

  test("open three detected", () => {
    // .XXX. — 3 with both ends open
    const cells = makeBoard([
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
    ]);
    const score = evaluateCell(cells, 0, 2, "X", false);
    expect(score).toBeGreaterThanOrEqual(THREAT_SCORE.OPEN_THREE);
  });

  test("fork: double four bonus with detectForks=true", () => {
    // Create a position where placing gives two half-fours
    // Vertical: X at (1,3),(2,3),(3,3),(4,3) — evaluating (3,3)
    // Horizontal: X at (3,1),(3,2),(3,3),(3,4) — evaluating (3,3)
    const cells = makeBoard([
      [1, 3, "X"],
      [2, 3, "X"],
      [3, 3, "X"],
      [4, 3, "X"],
      [3, 1, "X"],
      [3, 2, "X"],
      [3, 4, "X"],
    ]);
    const withForks = evaluateCell(cells, 3, 3, "X", true);
    const withoutForks = evaluateCell(cells, 3, 3, "X", false);
    expect(withForks).toBeGreaterThan(withoutForks);
  });

  test("fork: four + open three bonus", () => {
    // Create a position with one four-threat and one open-three
    // Vertical: 4 in column (half four or open four)
    // Horizontal: 3 in row (open three)
    const cells = makeBoard([
      [0, 3, "X"],
      [1, 3, "X"],
      [2, 3, "X"],
      [3, 3, "X"],
      [3, 2, "X"],
      [3, 4, "X"],
    ]);
    const withForks = evaluateCell(cells, 3, 3, "X", true);
    const withoutForks = evaluateCell(cells, 3, 3, "X", false);
    expect(withForks).toBeGreaterThan(withoutForks);
  });

  test("empty neighborhood returns 0 or NONE-level score", () => {
    const cells = makeBoard([[0, 0, "X"]]);
    // Evaluate for a piece with no neighbors in any direction
    const score = evaluateCell(cells, 5, 5, "X", false);
    expect(score).toBe(0);
  });

  test("opponent pieces don't count", () => {
    // XOXXX — mixed, evaluate for X at (0,2)
    const cells = makeBoard([
      [0, 0, "X"],
      [0, 1, "O"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const score = evaluateCell(cells, 0, 2, "X", false);
    // O at (0,1) breaks the line — shouldn't see 5-in-a-row
    expect(score).toBeLessThan(THREAT_SCORE.FIVE);
  });
});
