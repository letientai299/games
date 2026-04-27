import type { LevelConfig } from "./constants";

const LEVELS: LevelConfig[] = [
  { gridSize: 3, litCount: 2, bombCount: 0 },
  { gridSize: 3, litCount: 3, bombCount: 0 },
  { gridSize: 3, litCount: 4, bombCount: 0 },
  { gridSize: 3, litCount: 5, bombCount: 0 },
  { gridSize: 4, litCount: 3, bombCount: 0 },
  { gridSize: 4, litCount: 4, bombCount: 0 },
  { gridSize: 4, litCount: 5, bombCount: 0 },
  { gridSize: 4, litCount: 6, bombCount: 0 },
  { gridSize: 4, litCount: 5, bombCount: 1 },
  { gridSize: 4, litCount: 6, bombCount: 1 },
  { gridSize: 5, litCount: 4, bombCount: 0 },
  { gridSize: 5, litCount: 5, bombCount: 0 },
  { gridSize: 5, litCount: 6, bombCount: 1 },
  { gridSize: 5, litCount: 7, bombCount: 1 },
  { gridSize: 5, litCount: 8, bombCount: 2 },
  { gridSize: 6, litCount: 5, bombCount: 0 },
  { gridSize: 6, litCount: 6, bombCount: 1 },
  { gridSize: 6, litCount: 7, bombCount: 1 },
  { gridSize: 6, litCount: 8, bombCount: 2 },
  { gridSize: 6, litCount: 9, bombCount: 2 },
];

export function getLevel(level: number): LevelConfig {
  if (level <= LEVELS.length) return LEVELS[level - 1];

  const extra = level - LEVELS.length;
  const litCount = Math.min(9 + Math.floor(extra / 2), 18);
  const bombCount = Math.min(2 + Math.floor(extra / 3), 6);
  return { gridSize: 6, litCount, bombCount };
}
