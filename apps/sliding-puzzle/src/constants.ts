// Canvas
export const WIDTH = 480;
export const HEIGHT = 720;

// Grid
export const GRID_SIZE = 3;
export const SHUFFLE_SWAPS = 100;

// Layout
export const BOARD_PADDING = 20;
export const BOARD_SIZE = WIDTH - BOARD_PADDING * 2; // 440
export const BOARD_TOP = 160;

export const HEADER_Y = 10;
export const INFO_Y = 50;
export const CONTROLS_Y = 120;
export const PREVIEW_SIZE = 80;

// Tile appearance
export const TILE_GAP = 8;

// Animation
export const SLIDE_DURATION = 0.12;

// Persistence
export const BEST_KEY_PREFIX = "scramble_best_";

// Pokémon images
export const POKEMON_IMAGES = [
  "bulbasaur",
  "charmander",
  "squirtle",
  "eevee",
  "snorlax",
  "mewtwo",
] as const;

export type PokemonName = (typeof POKEMON_IMAGES)[number];

export const CELL_SIZE = BOARD_SIZE / GRID_SIZE;

export function tileToPixel(
  col: number,
  row: number,
): { x: number; y: number } {
  return {
    x: BOARD_PADDING + col * CELL_SIZE + CELL_SIZE / 2,
    y: BOARD_TOP + row * CELL_SIZE + CELL_SIZE / 2,
  };
}
