import type { KAPLAYCtx } from "kaplay";

import placeXUrl from "./assets/sounds/place-x.wav";
import placeOUrl from "./assets/sounds/place-o.wav";
import winUrl from "./assets/sounds/win.wav";

export function loadSounds(k: KAPLAYCtx) {
  k.loadSound("place-x", placeXUrl);
  k.loadSound("place-o", placeOUrl);
  k.loadSound("win", winUrl);
}

export function playPlace(k: KAPLAYCtx, player: "X" | "O") {
  k.play(player === "X" ? "place-x" : "place-o");
}

export function playWin(k: KAPLAYCtx) {
  k.play("win");
}
