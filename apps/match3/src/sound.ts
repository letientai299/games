/**
 * Audio for match3 using Kaplay's sound system.
 * Uses Kenney Interface Sounds (CC0 license).
 */
import type { KAPLAYCtx } from "kaplay";

// Vite asset imports
import match3Url from "./assets/sounds/match3.wav";
import match4Url from "./assets/sounds/match4.wav";
import match5Url from "./assets/sounds/match5.wav";
import match6Url from "./assets/sounds/match6.wav";
import chain1Url from "./assets/sounds/chain1.wav";
import chain2Url from "./assets/sounds/chain2.wav";
import chain3Url from "./assets/sounds/chain3.wav";
import chain4Url from "./assets/sounds/chain4.wav";
import chain5Url from "./assets/sounds/chain5.wav";
import chain6Url from "./assets/sounds/chain6.wav";
import invalidUrl from "./assets/sounds/invalid.wav";
import gameoverUrl from "./assets/sounds/gameover.wav";

const MATCH_SOUNDS = [match3Url, match4Url, match5Url, match6Url];
const CHAIN_SOUNDS = [
  chain1Url,
  chain2Url,
  chain3Url,
  chain4Url,
  chain5Url,
  chain6Url,
];

export function loadSounds(k: KAPLAYCtx) {
  MATCH_SOUNDS.forEach((url, i) => k.loadSound(`match${i + 3}`, url));
  CHAIN_SOUNDS.forEach((url, i) => k.loadSound(`chain${i + 1}`, url));
  k.loadSound("invalid", invalidUrl);
  k.loadSound("gameover", gameoverUrl);
}

/**
 * Play match clear sound based on match length and cascade step.
 * - matchLen 3/4/5/6+ selects different sounds
 * - cascadeStep > 0 uses chain sounds with rising detune
 */
export function playMatchSound(
  k: KAPLAYCtx,
  matchLen: number,
  cascadeStep: number,
) {
  if (cascadeStep > 0) {
    // Chain cascade: use glass sounds with rising pitch
    const idx = Math.min(cascadeStep, CHAIN_SOUNDS.length);
    k.play(`chain${idx}`, { detune: cascadeStep * 200 });
  }
  // Always play the match-length sound
  const len = Math.min(Math.max(matchLen, 3), 6);
  k.play(`match${len}`, { detune: cascadeStep * 100 });
}

export function playInvalidSound(k: KAPLAYCtx) {
  k.play("invalid");
}

export function playGameOverSound(k: KAPLAYCtx) {
  k.play("gameover");
}
