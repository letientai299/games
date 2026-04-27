import type { KAPLAYCtx, GameObj, Vec2 } from "kaplay";
import {
  GEM_NAMES,
  GEM_SCALE,
  SWAP_DURATION,
  DESTROY_DURATION,
  FALL_PER_CELL,
  gridToPixel,
} from "./constants";

export interface GemObj extends GameObj {
  gemType: number;
  gridCol: number;
  gridRow: number;
}

export function createGem(
  k: KAPLAYCtx,
  col: number,
  row: number,
  gemType: number,
): GemObj {
  const { x, y } = gridToPixel(col, row);
  return k.add([
    k.sprite(GEM_NAMES[gemType]),
    k.pos(x, y),
    k.anchor("center"),
    k.scale(GEM_SCALE),
    k.area(),
    k.opacity(1),
    k.timer(),
    k.z(1),
    "gem",
    { gemType, gridCol: col, gridRow: row },
  ]) as unknown as GemObj;
}

export function animateSwap(k: KAPLAYCtx, a: GemObj, b: GemObj): Promise<void> {
  const posA = a.pos.clone();
  const posB = b.pos.clone();
  return Promise.all([
    a.tween(
      posA,
      posB,
      SWAP_DURATION,
      (p: Vec2) => (a.pos = p),
      k.easings.easeOutQuad,
    ),
    b.tween(
      posB,
      posA,
      SWAP_DURATION,
      (p: Vec2) => (b.pos = p),
      k.easings.easeOutQuad,
    ),
  ]).then(() => {});
}

export function animateDestroy(k: KAPLAYCtx, gem: GemObj): Promise<void> {
  return gem
    .tween(
      1,
      0,
      DESTROY_DURATION,
      (v: number) => {
        gem.opacity = v;
        gem.scale = k.vec2(GEM_SCALE * v);
      },
      k.easings.easeOutQuad,
    )
    .then(() => {
      gem.destroy();
    });
}

export function animateFall(
  k: KAPLAYCtx,
  gem: GemObj,
  targetRow: number,
  distance: number,
): Promise<void> {
  const { x, y } = gridToPixel(gem.gridCol, targetRow);
  const duration = distance * FALL_PER_CELL;
  return gem
    .tween(
      gem.pos.clone(),
      k.vec2(x, y),
      duration,
      (p: Vec2) => (gem.pos = p),
      k.easings.easeOutBounce,
    )
    .then(() => {
      gem.gridRow = targetRow;
    });
}
