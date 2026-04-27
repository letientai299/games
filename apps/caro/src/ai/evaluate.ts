import { WIN_LENGTH, DIRECTIONS, encodeCell, type Player } from "../constants";
import type { EvalMode } from "./types";
import { evaluateCell } from "./patterns";

const INF = 1_000_000_000;

/**
 * Simple evaluation (levels 1-3): scores a move by counting consecutive
 * pieces and open ends in each direction.
 */
export function evaluateSimple(
  cells: Map<number, Player>,
  row: number,
  col: number,
  player: Player,
): number {
  let total = 0;

  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    let openEnds = 0;

    for (let i = 1; i < WIN_LENGTH; i++) {
      const cell = cells.get(encodeCell(row + dr * i, col + dc * i));
      if (cell === player) count++;
      else {
        if (cell === undefined) openEnds++;
        break;
      }
    }

    for (let i = 1; i < WIN_LENGTH; i++) {
      const cell = cells.get(encodeCell(row - dr * i, col - dc * i));
      if (cell === player) count++;
      else {
        if (cell === undefined) openEnds++;
        break;
      }
    }

    if (count >= WIN_LENGTH) return 100_000;
    if (openEnds === 0) continue;

    total += simpleLineScore(count, openEnds);
  }

  return total;
}

function simpleLineScore(count: number, openEnds: number): number {
  if (count === 4 && openEnds === 2) return 50_000;
  if (count === 4 && openEnds === 1) return 5_000;
  if (count === 3 && openEnds === 2) return 3_000;
  if (count === 3 && openEnds === 1) return 500;
  if (count === 2 && openEnds === 2) return 200;
  if (count === 2 && openEnds === 1) return 50;
  if (count === 1 && openEnds === 2) return 10;
  return 1;
}

/**
 * Piece-based leaf evaluation: scores ALL occupied cells on the board.
 * Captures threats regardless of proximity to the last move.
 */
export function evaluateLeaf(
  cells: Map<number, Player>,
  me: Player,
  _opp: Player,
  moves: { row: number; col: number; player: Player }[],
): number {
  let myScore = 0;
  let oppScore = 0;

  for (const { row, col, player } of moves) {
    const s = evaluateSimple(cells, row, col, player);
    if (player === me) myScore += s;
    else oppScore += s;
  }

  return myScore - oppScore;
}

/**
 * Quick heuristic score for a single move (used for move ordering).
 */
export function quickMoveScore(
  cells: Map<number, Player>,
  row: number,
  col: number,
  me: Player,
  opp: Player,
  evalMode: EvalMode,
): number {
  let myScore: number;
  let oppScore: number;

  if (evalMode === "simple") {
    const key = encodeCell(row, col);
    cells.set(key, me);
    myScore = evaluateSimple(cells, row, col, me);
    cells.delete(key);

    cells.set(key, opp);
    oppScore = evaluateSimple(cells, row, col, opp);
    cells.delete(key);
  } else {
    const detectForks = evalMode === "patterns-forks";
    myScore = evaluateCell(cells, row, col, me, detectForks);
    oppScore = evaluateCell(cells, row, col, opp, detectForks);
  }

  return myScore * 1.1 + oppScore;
}

export { INF };
