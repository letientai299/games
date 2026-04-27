import type { Player } from "../constants";
import { encodeCell } from "../constants";
import type { BoardState } from "../board";
import type { AiLevel } from "../constants";
import { LEVELS } from "./levels";
import { quickMoveScore } from "./evaluate";
import { getCandidates } from "./candidates";
import { search } from "./search";

export function findBestMove(
  state: BoardState,
  level: AiLevel,
): { row: number; col: number } {
  const config = LEVELS[level];
  const candidates = getCandidates(state, config.candidateRadius);

  if (candidates.length === 0) return { row: 0, col: 0 };
  if (candidates.length === 1) return candidates[0];

  if (config.depth === 0) {
    return singlePly(state, candidates, config.scoreScale);
  }

  return search(state, config).move;
}

function singlePly(
  state: BoardState,
  candidates: { row: number; col: number }[],
  scoreScale: number,
): { row: number; col: number } {
  const me = state.currentPlayer;
  const opp: Player = me === "X" ? "O" : "X";

  let bestScore = -Infinity;
  const bestMoves: { row: number; col: number }[] = [];

  for (const { row, col } of candidates) {
    const key = encodeCell(row, col);

    state.cells.set(key, me);
    const myScore = quickMoveScore(state.cells, row, col, me, opp, "simple");
    state.cells.delete(key);

    state.cells.set(key, opp);
    const oppScore = quickMoveScore(state.cells, row, col, opp, me, "simple");
    state.cells.delete(key);

    const score =
      Math.pow(myScore, scoreScale) * 1.1 + Math.pow(oppScore, scoreScale);

    if (score > bestScore) {
      bestScore = score;
      bestMoves.length = 0;
      bestMoves.push({ row, col });
    } else if (score === bestScore) {
      bestMoves.push({ row, col });
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
