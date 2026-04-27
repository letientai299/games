import type { KAPLAYCtx } from "kaplay";
import { unlockAudio, synthNote, synthMelody } from "@games/shared";

export { unlockAudio };

export function loadSounds(k: KAPLAYCtx) {
  // Tap: short click — triangle wave sweeping down
  k.loadSound("tap", synthNote(500, 0.06, "triangle", 300));

  // Correct: two ascending notes (C5 → E5)
  k.loadSound(
    "correct",
    synthMelody(
      [
        { freq: 523.25, duration: 0.12 },
        { freq: 659.25, duration: 0.12 },
      ],
      0.04,
    ),
  );

  // Wrong: low buzz — square wave descending
  k.loadSound("wrong", synthNote(300, 0.2, "square", 150));
}

export function playTap(k: KAPLAYCtx) {
  k.play("tap");
}

export function playCorrect(k: KAPLAYCtx) {
  k.play("correct");
}

export function playWrong(k: KAPLAYCtx) {
  k.play("wrong");
}
