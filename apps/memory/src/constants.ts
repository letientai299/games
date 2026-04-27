export const WIDTH = 480;
export const HEIGHT = 720;
export const ICON_FONT = "material-symbols";
export const DISPLAY_TIME = 5000;
export const RESULT_PAUSE = 1500;
export const STREAK_TO_LEVEL_UP = 3;
export const STREAK_TO_LEVEL_DOWN = 2;

export const COLOR_BG: [number, number, number] = [26, 26, 46];
export const COLOR_CELL: [number, number, number] = [60, 60, 90];
export const COLOR_CELL_HOVER: [number, number, number] = [75, 75, 110];
export const COLOR_LIT: [number, number, number] = [255, 215, 0];
export const COLOR_BOMB: [number, number, number] = [255, 80, 80];
export const COLOR_CORRECT: [number, number, number] = [80, 220, 100];
export const COLOR_WRONG: [number, number, number] = [255, 60, 60];
export const COLOR_MISSED: [number, number, number] = [180, 160, 60];
export const COLOR_UI_BG: [number, number, number] = [40, 40, 70];
export const COLOR_TEXT: [number, number, number] = [220, 220, 240];
export const COLOR_TEXT_DIM: [number, number, number] = [140, 140, 170];
export const COLOR_SELECTED: [number, number, number] = [100, 180, 255];
export const COLOR_BTN: [number, number, number] = [70, 130, 180];

export type Profile = {
  name: string;
  level: number;
  streak: number;
  streakType: "correct" | "wrong";
};

export type LevelConfig = {
  gridSize: number;
  litCount: number;
  bombCount: number;
};
