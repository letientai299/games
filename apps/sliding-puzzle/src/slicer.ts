import type { KAPLAYCtx } from "kaplay";
import { GRID_SIZE } from "./constants";

let generation = 0;

/** Sprite name for a tile at (col, row) in the current generation. */
export function tileSpriteKey(col: number, row: number): string {
  return `tile_g${generation}_${col}_${row}`;
}

/** Sprite name for the preview thumbnail. */
export function previewSpriteKey(): string {
  return `preview_g${generation}`;
}

export const FRAME_SPRITE_KEY = "wood_frame";
export const BLANK_FRAME_SPRITE_KEY = "blank_frame";

interface FrameColors {
  base: string;
  grain: string;
  bevelLight: string;
  bevelDark: string;
}

const WOOD_COLORS: FrameColors = {
  base: "#8B6914",
  grain: "rgba(60,40,0,0.25)",
  bevelLight: "rgba(255,220,140,0.5)",
  bevelDark: "rgba(40,20,0,0.5)",
};

const BLANK_COLORS: FrameColors = {
  base: "#3A5A8C",
  grain: "rgba(20,30,60,0.25)",
  bevelLight: "rgba(140,180,255,0.5)",
  bevelDark: "rgba(15,25,50,0.5)",
};

function generateFrameSprite(size: number, colors: FrameColors): string {
  const border = Math.max(4, Math.round(size * 0.04));
  const full = size + border * 2;
  const c = document.createElement("canvas");
  c.width = full;
  c.height = full;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = colors.base;
  ctx.beginPath();
  roundRect(ctx, 0, 0, full, full, border);
  ctx.fill();

  ctx.strokeStyle = colors.grain;
  ctx.lineWidth = 1;
  for (let y = 2; y < full; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.3) * 1.5);
    ctx.lineTo(full, y + Math.cos(y * 0.2) * 1.5);
    ctx.stroke();
  }

  ctx.strokeStyle = colors.bevelLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(border, full - border);
  ctx.lineTo(border, border);
  ctx.lineTo(full - border, border);
  ctx.stroke();

  ctx.strokeStyle = colors.bevelDark;
  ctx.beginPath();
  ctx.moveTo(full - border, border);
  ctx.lineTo(full - border, full - border);
  ctx.lineTo(border, full - border);
  ctx.stroke();

  ctx.clearRect(border, border, size, size);

  return c.toDataURL();
}

/** Generate and register frame sprites (wood + blank variant). */
export function registerFrameSprite(k: KAPLAYCtx, size: number): void {
  k.loadSprite(FRAME_SPRITE_KEY, generateFrameSprite(size, WOOD_COLORS));
  k.loadSprite(BLANK_FRAME_SPRITE_KEY, generateFrameSprite(size, BLANK_COLORS));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Load an image from a URL into an HTMLImageElement.
 * Works with both asset imports (data URLs / paths) and blob URLs.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Slice an image into grid tiles and register them as Kaplay sprites.
 * The image is center-cropped to a square before slicing.
 * Returns the sprite keys for each tile (row-major, excluding the last tile which is blank).
 */
export function sliceAndRegister(
  k: KAPLAYCtx,
  img: HTMLImageElement,
): string[][] {
  generation++;
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  const tilePixels = Math.ceil(side / GRID_SIZE);
  const keys: string[][] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    keys[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const canvas = document.createElement("canvas");
      canvas.width = tilePixels;
      canvas.height = tilePixels;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        sx + col * tilePixels,
        sy + row * tilePixels,
        tilePixels,
        tilePixels,
        0,
        0,
        tilePixels,
        tilePixels,
      );
      const key = tileSpriteKey(col, row);
      k.loadSprite(key, canvas.toDataURL());
      keys[row][col] = key;
    }
  }

  // Register a small preview sprite with the blank cell (bottom-right) darkened
  const previewCanvas = document.createElement("canvas");
  const previewSize = 128;
  previewCanvas.width = previewSize;
  previewCanvas.height = previewSize;
  const pctx = previewCanvas.getContext("2d")!;
  pctx.drawImage(img, sx, sy, side, side, 0, 0, previewSize, previewSize);

  // Darken the blank cell area
  const cellPx = previewSize / GRID_SIZE;
  const blankX = (GRID_SIZE - 1) * cellPx;
  const blankY = (GRID_SIZE - 1) * cellPx;
  pctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  pctx.fillRect(blankX, blankY, cellPx, cellPx);
  pctx.strokeStyle = "rgba(100, 150, 255, 0.8)";
  pctx.lineWidth = 2;
  pctx.strokeRect(blankX + 1, blankY + 1, cellPx - 2, cellPx - 2);

  k.loadSprite(previewSpriteKey(), previewCanvas.toDataURL());

  return keys;
}
