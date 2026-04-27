import { COLS, ROWS, NUM_GEMS, MATCH_SCORES, encodePos } from "./constants";

/** -1 means empty cell */
export type Board = number[][];

export function createBoard(chooseFn: (choices: number[]) => number): Board {
  const allTypes = Array.from({ length: NUM_GEMS }, (_, i) => i);
  const board: Board = [];

  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      const forbidden = new Set<number>();
      if (c >= 2 && board[r][c - 1] === board[r][c - 2])
        forbidden.add(board[r][c - 1]);
      if (r >= 2 && board[r - 1][c] === board[r - 2][c])
        forbidden.add(board[r - 1][c]);
      const choices = allTypes.filter((t) => !forbidden.has(t));
      board[r][c] = chooseFn(choices);
    }
  }
  return board;
}

export function swapCells(
  board: Board,
  a: { row: number; col: number },
  b: { row: number; col: number },
) {
  const tmp = board[a.row][a.col];
  board[a.row][a.col] = board[b.row][b.col];
  board[b.row][b.col] = tmp;
}

export function findMatches(board: Board): Set<number> {
  const matched = new Set<number>();

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let start = 0;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && board[r][c] >= 0 && board[r][c] === board[r][start])
        continue;
      if (c - start >= 3 && board[r][start] >= 0) {
        for (let i = start; i < c; i++) matched.add(encodePos(r, i));
      }
      start = c;
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    let start = 0;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && board[r][c] >= 0 && board[r][c] === board[start][c])
        continue;
      if (r - start >= 3 && board[start][c] >= 0) {
        for (let i = start; i < r; i++) matched.add(encodePos(i, c));
      }
      start = r;
    }
  }

  return matched;
}

export interface MatchResult {
  points: number;
  maxLen: number;
}

export function scoreMatches(matched: Set<number>): MatchResult {
  let total = 0;
  let maxLen = 0;

  // Horizontal runs
  for (let r = 0; r < ROWS; r++) {
    let runLen = 0;
    for (let c = 0; c <= COLS; c++) {
      if (c < COLS && matched.has(encodePos(r, c))) {
        runLen++;
      } else {
        if (runLen >= 3) {
          total += MATCH_SCORES[Math.min(runLen, 5)] ?? 100;
          if (runLen > maxLen) maxLen = runLen;
        }
        runLen = 0;
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < COLS; c++) {
    let runLen = 0;
    for (let r = 0; r <= ROWS; r++) {
      if (r < ROWS && matched.has(encodePos(r, c))) {
        runLen++;
      } else {
        if (runLen >= 3) {
          total += MATCH_SCORES[Math.min(runLen, 5)] ?? 100;
          if (runLen > maxLen) maxLen = runLen;
        }
        runLen = 0;
      }
    }
  }

  return { points: total, maxLen };
}

export interface FallMove {
  col: number;
  fromRow: number;
  toRow: number;
}

export function applyGravity(board: Board): FallMove[] {
  const moves: FallMove[] = [];

  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] >= 0) {
        if (r !== writeRow) {
          board[writeRow][c] = board[r][c];
          board[r][c] = -1;
          moves.push({ col: c, fromRow: r, toRow: writeRow });
        }
        writeRow--;
      }
    }
  }

  return moves;
}

export interface NewGem {
  col: number;
  row: number;
  type: number;
}

export function fillEmpty(board: Board, randFn: () => number): NewGem[] {
  const added: NewGem[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] < 0) {
        board[r][c] = randFn();
        added.push({ col: c, row: r, type: board[r][c] });
      }
    }
  }
  return added;
}

export function isDeadlocked(board: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Try swap right
      if (c + 1 < COLS) {
        swapCells(board, { row: r, col: c }, { row: r, col: c + 1 });
        const has = findMatches(board).size > 0;
        swapCells(board, { row: r, col: c }, { row: r, col: c + 1 });
        if (has) return false;
      }
      // Try swap down
      if (r + 1 < ROWS) {
        swapCells(board, { row: r, col: c }, { row: r + 1, col: c });
        const has = findMatches(board).size > 0;
        swapCells(board, { row: r, col: c }, { row: r + 1, col: c });
        if (has) return false;
      }
    }
  }
  return true;
}
