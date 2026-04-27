import { createBoard, placeMove } from "../board";
import { findBestMove } from "./index";
import type { AiLevel, Player } from "../constants";

interface WorkerRequest {
  moves: { row: number; col: number; player: Player }[];
  level: AiLevel;
  moveId: number;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { moves, level, moveId } = e.data;

  const state = createBoard();
  for (const { row, col } of moves) {
    placeMove(state, row, col);
  }

  const move = findBestMove(state, level);
  self.postMessage({ row: move.row, col: move.col, moveId });
};
