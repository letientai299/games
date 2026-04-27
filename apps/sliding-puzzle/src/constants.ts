// Canvas
export const WIDTH = 480;
export const HEIGHT = 720;

// Grid sizes
export type GridSize = 3 | 4 | 5 | 6;
export const GRID_SIZES: GridSize[] = [3, 4, 5, 6];

// Shuffle swap counts per grid size (random-walk from solved)
export const SHUFFLE_SWAPS: Record<GridSize, number> = {
  3: 100,
  4: 200,
  5: 400,
  6: 600,
};

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

export function cellSize(gridSize: GridSize): number {
  return BOARD_SIZE / gridSize;
}

export function tileToPixel(
  col: number,
  row: number,
  gridSize: GridSize,
): { x: number; y: number } {
  const cs = cellSize(gridSize);
  return {
    x: BOARD_PADDING + col * cs + cs / 2,
    y: BOARD_TOP + row * cs + cs / 2,
  };
}
