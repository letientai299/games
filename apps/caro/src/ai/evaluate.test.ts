import { describe, test, expect } from "vitest";
import { encodeCell, type Player } from "../constants";
import { evaluateSimple, evaluateLeaf } from "./evaluate";

function makeBoard(moves: [number, number, Player][]): Map<number, Player> {
  const cells = new Map<number, Player>();
  for (const [r, c, p] of moves) cells.set(encodeCell(r, c), p);
  return cells;
}

describe("evaluateSimple", () => {
  test("five in a row returns 100_000", () => {
    const cells = makeBoard([
      [0, 0, "X"],
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    expect(evaluateSimple(cells, 0, 2, "X")).toBe(100_000);
  });

  test("open four (both ends open) includes 50_000", () => {
    // .XXXX. — evaluating the center piece
    // Score includes the horizontal open four (50_000) plus minor contributions
    // from other directions (diagonal singles with open ends).
    const cells = makeBoard([
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const score = evaluateSimple(cells, 0, 2, "X");
    expect(score).toBeGreaterThanOrEqual(50_000);
    expect(score).toBeLessThan(100_000);
  });

  test("half four (one end blocked) includes 5_000", () => {
    // OXXXX. — 4 X's with O blocking one end
    const cells = makeBoard([
      [0, 0, "O"],
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const score = evaluateSimple(cells, 0, 2, "X");
    expect(score).toBeGreaterThanOrEqual(5_000);
    expect(score).toBeLessThan(50_000);
  });

  test("open three includes 3_000", () => {
    // .XXX. — 3 in a row with both ends open
    const cells = makeBoard([
      [0, 1, "X"],
      [0, 2, "X"],
      [0, 3, "X"],
    ]);
    const score = evaluateSimple(cells, 0, 2, "X");
    expect(score).toBeGreaterThanOrEqual(3_000);
    expect(score).toBeLessThan(5_000);
  });

  test("isolated piece with open ends scores 10 per direction", () => {
    const cells = makeBoard([[5, 5, "X"]]);
    const score = evaluateSimple(cells, 5, 5, "X");
    // 4 directions, each has 1 piece with 2 open ends = 10 each
    expect(score).toBe(40);
  });

  test("blocked line with no open ends scores 0", () => {
    // OXO — single X between two O's (horizontal)
    const cells = makeBoard([
      [0, 0, "O"],
      [0, 1, "X"],
      [0, 2, "O"],
    ]);
    // evaluateSimple at (0,1) for X: horizontal is blocked both sides
    // other 3 directions have 1 piece with 2 open ends = 10 each = 30
    const score = evaluateSimple(cells, 0, 1, "X");
    expect(score).toBe(30);
  });
});

describe("evaluateLeaf", () => {
  test("returns positive when current player has better position", () => {
    const cells = makeBoard([
      [0, 0, "X"],
      [0, 1, "X"],
      [0, 2, "X"],
      [1, 0, "O"],
    ]);
    const moves = [
      { row: 0, col: 0, player: "X" as Player },
      { row: 1, col: 0, player: "O" as Player },
      { row: 0, col: 1, player: "X" as Player },
      { row: 0, col: 2, player: "X" as Player },
    ];
    const score = evaluateLeaf(cells, "X", "O", moves);
    expect(score).toBeGreaterThan(0);
  });

  test("windows to recent moves for large move lists", () => {
    // Create a board with many moves — only recent ones should matter
    const cells = new Map<number, Player>();
    const moves: { row: number; col: number; player: Player }[] = [];

    // Add 20 scattered moves
    for (let i = 0; i < 20; i++) {
      const player: Player = i % 2 === 0 ? "X" : "O";
      const row = Math.floor(i / 5) * 3;
      const col = (i % 5) * 3;
      cells.set(encodeCell(row, col), player);
      moves.push({ row, col, player });
    }

    // evaluateLeaf should not throw and should return a number
    const score = evaluateLeaf(cells, "X", "O", moves);
    expect(typeof score).toBe("number");
    expect(Number.isFinite(score)).toBe(true);
  });

  test("uses pattern eval when mode is patterns", () => {
    // A broken-four pattern that simple eval misses but pattern eval catches
    // X.XXX — evaluateCell sees BROKEN_FOUR, evaluateSimple doesn't
    const cells = makeBoard([
      [0, 0, "X"],
      // gap at [0, 1]
      [0, 2, "X"],
      [0, 3, "X"],
      [0, 4, "X"],
    ]);
    const moves = [
      { row: 0, col: 0, player: "X" as Player },
      { row: 0, col: 2, player: "X" as Player },
      { row: 0, col: 3, player: "X" as Player },
      { row: 0, col: 4, player: "X" as Player },
    ];
    const simpleScore = evaluateLeaf(cells, "X", "O", moves, "simple");
    const patternScore = evaluateLeaf(cells, "X", "O", moves, "patterns");
    // Pattern eval should detect stronger threats
    expect(patternScore).toBeGreaterThan(simpleScore);
  });
});
