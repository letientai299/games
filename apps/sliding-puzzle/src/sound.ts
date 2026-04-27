import type { KAPLAYCtx } from "kaplay";
import { unlockAudio, synthNote, synthMelody } from "@games/shared";

export { unlockAudio };

export function loadSounds(k: KAPLAYCtx) {
  // Slide: short click/pop — triangle wave sweeping down
  k.loadSound("slide", synthNote(600, 0.08, "triangle", 300));

  // Win: three ascending notes (C5, E5, G5)
  k.loadSound(
    "win",
    synthMelody(
      [
        { freq: 523.25, duration: 0.15 },
        { freq: 659.25, duration: 0.15 },
        { freq: 783.99, duration: 0.15 },
      ],
      0.05,
    ),
  );
}

export function playSlide(k: KAPLAYCtx) {
  k.play("slide");
}

export function playWin(k: KAPLAYCtx) {
  k.play("win");
}
