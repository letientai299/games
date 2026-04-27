import {
  WIN_LENGTH,
  DIRECTIONS,
  encodeCell,
  decodeCell,
  type Player,
} from "./constants";
import { type BoardState } from "./board";

export function findBestMove(state: BoardState): { row: number; col: number } {
  const me = state.currentPlayer;
  const opp: Player = me === "X" ? "O" : "X";
  const candidates = getCandidates(state);

  if (candidates.length === 0) return { row: 0, col: 0 };

  let bestScore = -Infinity;

  const bestMoves: { row: number; col: number }[] = [];

  for (const { row, col } of candidates) {
    const key = encodeCell(row, col);

    let myScore: number;
    let oppScore: number;
    try {
      state.cells.set(key, me);
      myScore = evaluatePosition(state.cells, row, col, me);
    } finally {
      state.cells.delete(key);
    }
    try {
      state.cells.set(key, opp);
      oppScore = evaluatePosition(state.cells, row, col, opp);
    } finally {
      state.cells.delete(key);
    }

    const score = myScore * 1.1 + oppScore;

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

function getCandidates(state: BoardState): { row: number; col: number }[] {
  const candidates = new Set<string>();

  for (const { row, col } of state.moves) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const key = encodeCell(row + dr, col + dc);
        if (!state.cells.has(key)) {
          candidates.add(key);
        }
      }
    }
  }

  return [...candidates].map(decodeCell);
}

function evaluatePosition(
  cells: Map<string, Player>,
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

    if (count >= WIN_LENGTH) return 100000;
    if (openEnds === 0) continue;

    total += lineScore(count, openEnds);
  }

  return total;
}

function lineScore(count: number, openEnds: number): number {
  if (count === 4 && openEnds === 2) return 50000; // Open four — unstoppable
  if (count === 4 && openEnds === 1) return 5000; // Half-open four
  if (count === 3 && openEnds === 2) return 3000; // Open three
  if (count === 3 && openEnds === 1) return 500;
  if (count === 2 && openEnds === 2) return 200;
  if (count === 2 && openEnds === 1) return 50;
  if (count === 1 && openEnds === 2) return 10;
  return 1;
}
