import { WIN_LENGTH, DIRECTIONS, encodeCell, type Player } from "./constants";

export interface Move {
  row: number;
  col: number;
  player: Player;
}

export interface WinResult {
  player: Player;
  cells: { row: number; col: number }[];
}

export interface BoardState {
  cells: Map<string, Player>;
  moves: Move[];
  currentPlayer: Player;
  winner: WinResult | null;
}

export function createBoard(): BoardState {
  return {
    cells: new Map(),
    moves: [],
    currentPlayer: "X",
    winner: null,
  };
}

export function placeMove(
  state: BoardState,
  row: number,
  col: number,
): boolean {
  const key = encodeCell(row, col);
  if (state.cells.has(key) || state.winner) return false;

  state.cells.set(key, state.currentPlayer);
  state.moves.push({ row, col, player: state.currentPlayer });

  const win = checkWinAt(state.cells, row, col, state.currentPlayer);
  if (win) {
    state.winner = win;
  } else {
    state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
  }

  return true;
}

export function undoMove(state: BoardState): Move | null {
  if (state.moves.length === 0) return null;

  const move = state.moves.pop()!;
  state.cells.delete(encodeCell(move.row, move.col));
  state.winner = null;
  state.currentPlayer = move.player;
  return move;
}

export function checkWinAt(
  cells: Map<string, Player>,
  row: number,
  col: number,
  player: Player,
): WinResult | null {
  for (const [dr, dc] of DIRECTIONS) {
    // Walk backward to find the start of the line through (row, col)
    let startR = row;
    let startC = col;
    while (cells.get(encodeCell(startR - dr, startC - dc)) === player) {
      startR -= dr;
      startC -= dc;
    }

    // Walk forward from start, collecting consecutive cells
    const line: { row: number; col: number }[] = [];
    let r = startR;
    let c = startC;
    while (cells.get(encodeCell(r, c)) === player) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    if (line.length >= WIN_LENGTH) {
      return { player, cells: line.slice(0, WIN_LENGTH) };
    }
  }

  return null;
}
