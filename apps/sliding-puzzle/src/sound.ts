import type { KAPLAYCtx } from "kaplay";

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Resume AudioContext on first user gesture (required by browsers). */
export function unlockAudio() {
  const ac = ctx();
  if (ac.state === "suspended") ac.resume();
}

/**
 * Synthesize a WAV buffer from oscillator params and register as a Kaplay sound.
 * Keeps things self-contained — no external .wav files needed.
 */
function synthBuffer(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  freqEnd?: number,
): AudioBuffer {
  const ac = ctx();
  const sampleRate = ac.sampleRate;
  const len = Math.floor(sampleRate * duration);
  const buf = ac.createBuffer(1, len, sampleRate);
  const data = buf.getChannelData(0);

  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const progress = i / len;
    const f = freqEnd ? freq + (freqEnd - freq) * progress : freq;
    const envelope = 1 - progress; // linear decay

    let sample: number;
    const phase = (2 * Math.PI * f * t) % (2 * Math.PI);
    switch (type) {
      case "square":
        sample = Math.sin(phase) > 0 ? 1 : -1;
        break;
      case "triangle":
        sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      default:
        sample = Math.sin(phase);
    }

    data[i] = sample * envelope * 0.3;
  }
  return buf;
}

function bufToDataURL(buf: AudioBuffer): string {
  const numChannels = 1;
  const sampleRate = buf.sampleRate;
  const samples = buf.getChannelData(0);
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * blockAlign;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export function loadSounds(k: KAPLAYCtx) {
  // Slide: short click/pop — triangle wave sweeping down
  const slideBuf = synthBuffer(600, 0.08, "triangle", 300);
  k.loadSound("slide", bufToDataURL(slideBuf));

  // Win: three ascending notes
  const ac = ctx();
  const sampleRate = ac.sampleRate;
  const noteDur = 0.15;
  const gap = 0.05;
  const totalDur = noteDur * 3 + gap * 2;
  const totalLen = Math.floor(sampleRate * totalDur);
  const winBuf = ac.createBuffer(1, totalLen, sampleRate);
  const winData = winBuf.getChannelData(0);

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  for (let n = 0; n < notes.length; n++) {
    const startSample = Math.floor(sampleRate * n * (noteDur + gap));
    const noteLen = Math.floor(sampleRate * noteDur);
    for (let i = 0; i < noteLen; i++) {
      const t = i / sampleRate;
      const envelope = 1 - i / noteLen;
      winData[startSample + i] =
        Math.sin(2 * Math.PI * notes[n] * t) * envelope * 0.3;
    }
  }
  k.loadSound("win", bufToDataURL(winBuf));
}

export function playSlide(k: KAPLAYCtx) {
  k.play("slide");
}

export function playWin(k: KAPLAYCtx) {
  k.play("win");
}
