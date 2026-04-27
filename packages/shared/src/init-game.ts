import kaplay, { type KAPLAYCtx, type KAPLAYOpt } from "kaplay";

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 720;
const DEFAULT_BG: [number, number, number] = [26, 26, 46];

type InitGameOpts = Omit<
  KAPLAYOpt,
  "canvas" | "stretch" | "letterbox" | "touchToMouse" | "pixelDensity"
>;

/** Create a canvas, append it to body, and initialize kaplay with shared defaults. */
export function initGame(opts: InitGameOpts = {}): KAPLAYCtx {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  return kaplay({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    background: DEFAULT_BG,
    texFilter: "linear",
    ...opts,
    touchToMouse: true,
    stretch: true,
    letterbox: true,
    pixelDensity: window.devicePixelRatio,
    canvas,
  });
}
