import { encodeCell, decodeCell, type Player } from "../constants";
import type { BoardState } from "../board";
import { checkWinAt } from "../board";
import type { SearchContext, SearchResult, LevelConfig } from "./types";
import { evaluateLeaf, quickMoveScore, INF } from "./evaluate";
import { CandidateTracker } from "./candidates";
import {
  getZobristKey,
  createTT,
  ttLookup,
  ttStore,
  ttGetBestMove,
} from "./transposition";

const CAP_HIGH = 25;
const CAP_LOW = 15;

export function search(state: BoardState, config: LevelConfig): SearchResult {
  const me = state.currentPlayer;
  const opp: Player = me === "X" ? "O" : "X";

  const zobristKeys = config.useTT ? new Map<number, number>() : null;
  let zobristHash = 0;
  if (zobristKeys) {
    for (const { row, col, player } of state.moves) {
      zobristHash ^= getZobristKey(zobristKeys, encodeCell(row, col), player);
    }
  }

  const ctx: SearchContext = {
    cells: state.cells,
    me,
    opp,
    config,
    killers: new Map(),
    tt: config.useTT ? createTT() : null,
    zobristHash,
    zobristKeys,
    nodesSearched: 0,
    startTime: Date.now(),
    timedOut: false,
  };

  const tracker = new CandidateTracker(
    state.cells,
    state.moves,
    config.candidateRadius,
  );

  const firstKey = tracker.keys.values().next().value;
  let bestResult: SearchResult = {
    move: firstKey !== undefined ? decodeCell(firstKey) : { row: 0, col: 0 },
    score: -INF,
    depth: 0,
  };

  for (let depth = 1; depth <= config.depth; depth++) {
    if (config.timeMs > 0 && Date.now() - ctx.startTime > config.timeMs) break;

    ctx.timedOut = false;
    const result = pvsRoot(ctx, state, tracker, depth);

    if (!ctx.timedOut) {
      bestResult = result;
      if (result.score >= INF / 2) break;
    }
  }

  return bestResult;
}

function pvsRoot(
  ctx: SearchContext,
  state: BoardState,
  tracker: CandidateTracker,
  depth: number,
): SearchResult {
  // Always use full eval at the root — never proximity-only
  const ordered = orderMoves(ctx, tracker, state, Math.max(depth, 3));
  const cap = CAP_HIGH;

  let bestMove = ordered[0] ?? { row: 0, col: 0 };
  let bestScore = -INF;
  let alpha = -INF;
  const beta = INF;

  for (let i = 0; i < Math.min(ordered.length, cap); i++) {
    if (checkTimeout(ctx)) break;

    const { row, col } = ordered[i];
    const key = encodeCell(row, col);

    ctx.cells.set(key, ctx.me);
    state.moves.push({ row, col, player: ctx.me });
    tracker.makeMove(ctx.cells, row, col);
    if (ctx.zobristKeys)
      ctx.zobristHash ^= getZobristKey(ctx.zobristKeys, key, ctx.me);

    const win = checkWinAt(ctx.cells, row, col, ctx.me);
    let score: number;

    if (win) {
      score = INF - 1;
    } else {
      state.currentPlayer = ctx.opp;

      if (i === 0) {
        score = -pvs(ctx, state, tracker, depth - 1, -beta, -alpha);
      } else {
        score = -pvs(ctx, state, tracker, depth - 1, -alpha - 1, -alpha);
        if (score > alpha && score < beta) {
          score = -pvs(ctx, state, tracker, depth - 1, -beta, -alpha);
        }
      }

      state.currentPlayer = ctx.me;
    }

    tracker.undoMove();
    ctx.cells.delete(key);
    state.moves.pop();
    if (ctx.zobristKeys)
      ctx.zobristHash ^= getZobristKey(ctx.zobristKeys, key, ctx.me);

    if (score > bestScore) {
      bestScore = score;
      bestMove = { row, col };
    }
    if (score > alpha) alpha = score;
  }

  return { move: bestMove, score: bestScore, depth };
}

function pvs(
  ctx: SearchContext,
  state: BoardState,
  tracker: CandidateTracker,
  depth: number,
  alpha: number,
  beta: number,
): number {
  ctx.nodesSearched++;

  if (checkTimeout(ctx)) return 0;

  if (ctx.tt && ctx.zobristKeys) {
    const ttHit = ttLookup(ctx.tt, ctx.zobristHash, depth, alpha, beta);
    if (ttHit) return ttHit.score;
  }

  const currentPlayer = state.currentPlayer;
  const opponent: Player = currentPlayer === "X" ? "O" : "X";

  if (depth <= 0) {
    return evaluateLeaf(ctx.cells, currentPlayer, opponent, state.moves);
  }

  if (tracker.keys.size === 0) return 0;

  const ordered = orderMoves(ctx, tracker, state, depth);
  const cap = depth <= 1 ? CAP_LOW : CAP_HIGH;

  let bestScore = -INF;
  let bestMove: { row: number; col: number } | null = null;
  let flag: "exact" | "lower" | "upper" = "upper";

  for (let i = 0; i < Math.min(ordered.length, cap); i++) {
    if (checkTimeout(ctx)) return 0;

    const { row, col } = ordered[i];
    const key = encodeCell(row, col);

    ctx.cells.set(key, currentPlayer);
    state.moves.push({ row, col, player: currentPlayer });
    state.currentPlayer = opponent;
    tracker.makeMove(ctx.cells, row, col);
    if (ctx.zobristKeys)
      ctx.zobristHash ^= getZobristKey(ctx.zobristKeys, key, currentPlayer);

    const win = checkWinAt(ctx.cells, row, col, currentPlayer);
    let score: number;

    if (win) {
      score = INF - 1;
    } else if (i === 0) {
      score = -pvs(ctx, state, tracker, depth - 1, -beta, -alpha);
    } else {
      score = -pvs(ctx, state, tracker, depth - 1, -alpha - 1, -alpha);
      if (score > alpha && score < beta) {
        score = -pvs(ctx, state, tracker, depth - 1, -beta, -alpha);
      }
    }

    tracker.undoMove();
    ctx.cells.delete(key);
    state.moves.pop();
    state.currentPlayer = currentPlayer;
    if (ctx.zobristKeys)
      ctx.zobristHash ^= getZobristKey(ctx.zobristKeys, key, currentPlayer);

    if (score > bestScore) {
      bestScore = score;
      bestMove = { row, col };
    }

    if (score >= beta) {
      if (depth >= 4) {
        const killerList = ctx.killers.get(depth) ?? [];
        if (!killerList.includes(key)) {
          killerList.unshift(key);
          if (killerList.length > 2) killerList.pop();
          ctx.killers.set(depth, killerList);
        }
      }
      flag = "lower";
      break;
    }

    if (score > alpha) {
      alpha = score;
      flag = "exact";
    }
  }

  if (ctx.tt && ctx.zobristKeys) {
    ttStore(ctx.tt, ctx.zobristHash, depth, bestScore, flag, bestMove);
  }

  return bestScore;
}

/** At depth <= 1, sort by proximity (cheap). At depth 2+, use full eval. */
function orderMoves(
  ctx: SearchContext,
  tracker: CandidateTracker,
  state: BoardState,
  depth: number,
): { row: number; col: number }[] {
  if (depth <= 1) {
    const lastMove = state.moves.at(-1);
    if (lastMove) {
      return tracker.toSortedArray(lastMove.row, lastMove.col, CAP_LOW);
    }
    const arr = tracker.toArray();
    if (arr.length > CAP_LOW) arr.length = CAP_LOW;
    return arr;
  }

  const me = state.currentPlayer;
  const opp: Player = me === "X" ? "O" : "X";

  let ttBest: { row: number; col: number } | null = null;
  if (ctx.tt && ctx.zobristKeys) {
    ttBest = ttGetBestMove(ctx.tt, ctx.zobristHash);
  }

  const scored: { row: number; col: number; priority: number }[] = [];

  for (const k of tracker.keys) {
    const { row, col } = decodeCell(k);
    let priority = 0;

    if (ttBest && row === ttBest.row && col === ttBest.col) {
      priority += 10_000_000;
    }

    const killerList = ctx.killers.get(depth);
    if (killerList?.includes(k)) {
      priority += 5_000_000;
    }

    priority += quickMoveScore(ctx.cells, row, col, me, opp, ctx.config.eval);

    scored.push({ row, col, priority });
  }

  scored.sort((a, b) => b.priority - a.priority);
  if (scored.length > CAP_HIGH) scored.length = CAP_HIGH;
  return scored;
}

function checkTimeout(ctx: SearchContext): boolean {
  if (ctx.config.timeMs <= 0) return false;
  if (ctx.timedOut) return true;
  if (ctx.nodesSearched % 1024 !== 0) return false;
  if (Date.now() - ctx.startTime > ctx.config.timeMs) {
    ctx.timedOut = true;
    return true;
  }
  return false;
}
