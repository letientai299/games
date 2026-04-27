import type { KAPLAYCtx } from "kaplay";

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function unlockAudio() {
  const ac = ctx();
  if (ac.state === "suspended") ac.resume();
}

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
    const envelope = 1 - progress;

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
  const sampleRate = buf.sampleRate;
  const samples = buf.getChannelData(0);
  const bitsPerSample = 16;
  const byteRate = (sampleRate * bitsPerSample) / 8;
  const blockAlign = bitsPerSample / 8;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
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
  view.setUint16(22, 1, true);
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

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

export function loadSounds(k: KAPLAYCtx) {
  // Tap: short click — triangle wave sweeping down
  const tapBuf = synthBuffer(500, 0.06, "triangle", 300);
  k.loadSound("tap", bufToDataURL(tapBuf));

  // Correct: two ascending notes (C5 → E5)
  const ac = ctx();
  const sr = ac.sampleRate;
  const noteDur = 0.12;
  const gap = 0.04;

  const correctBuf = ac.createBuffer(1, Math.floor(sr * (noteDur * 2 + gap)), sr);
  const correctData = correctBuf.getChannelData(0);
  const correctNotes = [523.25, 659.25]; // C5, E5
  for (let n = 0; n < correctNotes.length; n++) {
    const start = Math.floor(sr * n * (noteDur + gap));
    const noteLen = Math.floor(sr * noteDur);
    for (let i = 0; i < noteLen; i++) {
      const t = i / sr;
      const envelope = 1 - i / noteLen;
      correctData[start + i] =
        Math.sin(2 * Math.PI * correctNotes[n] * t) * envelope * 0.3;
    }
  }
  k.loadSound("correct", bufToDataURL(correctBuf));

  // Wrong: low buzz — square wave descending
  const wrongBuf = synthBuffer(300, 0.2, "square", 150);
  k.loadSound("wrong", bufToDataURL(wrongBuf));
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
