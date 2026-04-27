import type { Player } from "../constants";

export type ThreatType =
  | "FIVE"
  | "OPEN_FOUR"
  | "HALF_FOUR"
  | "BROKEN_FOUR"
  | "OPEN_THREE"
  | "BROKEN_THREE"
  | "HALF_THREE"
  | "OPEN_TWO"
  | "HALF_TWO"
  | "NONE";

export const THREAT_SCORE: Record<ThreatType, number> = {
  FIVE: 1_000_000,
  OPEN_FOUR: 100_000,
  HALF_FOUR: 10_000,
  BROKEN_FOUR: 10_000,
  OPEN_THREE: 5_000,
  BROKEN_THREE: 3_000,
  HALF_THREE: 500,
  OPEN_TWO: 200,
  HALF_TWO: 50,
  NONE: 0,
};

export type EvalMode = "simple" | "patterns" | "patterns-forks";

export interface LevelConfig {
  name: string;
  subtitle: string;
  depth: number;
  timeMs: number;
  eval: EvalMode;
  useTT: boolean;
  candidateRadius: number;
  /** For level 1: scale down scores to miss long-range threats */
  scoreScale: number;
}

export interface SearchResult {
  move: { row: number; col: number };
  score: number;
  depth: number;
}

export interface TTEntry {
  depth: number;
  score: number;
  flag: "exact" | "lower" | "upper";
  bestMove: { row: number; col: number } | null;
}

export interface SearchContext {
  cells: Map<number, Player>;
  me: Player;
  opp: Player;
  config: LevelConfig;
  killers: Map<number, number[]>;
  tt: Map<number, TTEntry> | null;
  zobristHash: number;
  zobristKeys: Map<number, number> | null;
  nodesSearched: number;
  startTime: number;
  timedOut: boolean;
}
