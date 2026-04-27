import type { KAPLAYCtx } from "kaplay";
import type { GridSize } from "./constants";

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

/** Generate and register a wooden frame sprite (called once). */
export function registerFrameSprite(k: KAPLAYCtx, size: number): void {
  const border = Math.max(4, Math.round(size * 0.04));
  const full = size + border * 2;
  const c = document.createElement("canvas");
  c.width = full;
  c.height = full;
  const ctx = c.getContext("2d")!;

  // Wood base color
  ctx.fillStyle = "#8B6914";
  ctx.beginPath();
  roundRect(ctx, 0, 0, full, full, border);
  ctx.fill();

  // Horizontal grain lines
  ctx.strokeStyle = "rgba(60,40,0,0.25)";
  ctx.lineWidth = 1;
  for (let y = 2; y < full; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.3) * 1.5);
    ctx.lineTo(full, y + Math.cos(y * 0.2) * 1.5);
    ctx.stroke();
  }

  // Light bevel on top-left edges
  ctx.strokeStyle = "rgba(255,220,140,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(border, full - border);
  ctx.lineTo(border, border);
  ctx.lineTo(full - border, border);
  ctx.stroke();

  // Dark bevel on bottom-right edges
  ctx.strokeStyle = "rgba(40,20,0,0.5)";
  ctx.beginPath();
  ctx.moveTo(full - border, border);
  ctx.lineTo(full - border, full - border);
  ctx.lineTo(border, full - border);
  ctx.stroke();

  // Cut out center (transparent hole for the image)
  ctx.clearRect(border, border, size, size);

  k.loadSprite(FRAME_SPRITE_KEY, c.toDataURL());
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
  gridSize: GridSize,
): string[][] {
  generation++;
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  const tilePixels = Math.ceil(side / gridSize);
  const keys: string[][] = [];

  for (let row = 0; row < gridSize; row++) {
    keys[row] = [];
    for (let col = 0; col < gridSize; col++) {
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

  // Register a small preview sprite (full image, square-cropped)
  const previewCanvas = document.createElement("canvas");
  const previewSize = 128;
  previewCanvas.width = previewSize;
  previewCanvas.height = previewSize;
  const pctx = previewCanvas.getContext("2d")!;
  pctx.drawImage(img, sx, sy, side, side, 0, 0, previewSize, previewSize);
  k.loadSprite(previewSpriteKey(), previewCanvas.toDataURL());

  return keys;
}
