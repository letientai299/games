import type { Player } from "../constants";
import type { TTEntry } from "./types";

const TT_MAX_SIZE = 100_000;

/** Lazy Zobrist key: generates a random 32-bit int on first access. */
export function getZobristKey(
  keys: Map<number, number>,
  cellKey: number,
  player: Player,
): number {
  // Combine cell key and player into a unique lookup key
  const id = player === "X" ? cellKey : cellKey ^ 0x80000000;
  let k = keys.get(id);
  if (k === undefined) {
    k = (Math.random() * 0xffffffff) >>> 0;
    keys.set(id, k);
  }
  return k;
}

export function createTT(): Map<number, TTEntry> {
  return new Map();
}

export function ttLookup(
  tt: Map<number, TTEntry>,
  hash: number,
  depth: number,
  alpha: number,
  beta: number,
): { score: number; bestMove: { row: number; col: number } | null } | null {
  const entry = tt.get(hash);
  if (!entry || entry.depth < depth) return null;

  if (entry.flag === "exact")
    return { score: entry.score, bestMove: entry.bestMove };
  if (entry.flag === "lower" && entry.score >= beta)
    return { score: entry.score, bestMove: entry.bestMove };
  if (entry.flag === "upper" && entry.score <= alpha)
    return { score: entry.score, bestMove: entry.bestMove };

  return null;
}

export function ttStore(
  tt: Map<number, TTEntry>,
  hash: number,
  depth: number,
  score: number,
  flag: "exact" | "lower" | "upper",
  bestMove: { row: number; col: number } | null,
): void {
  const existing = tt.get(hash);
  if (existing && existing.depth > depth) return;

  if (!existing && tt.size >= TT_MAX_SIZE) {
    const first = tt.keys().next().value;
    if (first !== undefined) tt.delete(first);
  }

  tt.set(hash, { depth, score, flag, bestMove });
}

export function ttGetBestMove(
  tt: Map<number, TTEntry>,
  hash: number,
): { row: number; col: number } | null {
  return tt.get(hash)?.bestMove ?? null;
}
