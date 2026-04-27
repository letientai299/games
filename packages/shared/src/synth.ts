let audioCtx: AudioContext | null = null;

/** Lazy singleton AudioContext. */
export function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Resume AudioContext on first user gesture (required by browsers). */
export function unlockAudio(): void {
  const ac = getAudioContext();
  if (ac.state === "suspended") ac.resume();
}

function synthBuffer(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  freqEnd?: number,
): AudioBuffer {
  const ac = getAudioContext();
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

/** Synthesize a single note and return a data URL (WAV blob). */
export function synthNote(
  freq: number,
  duration: number,
  type?: OscillatorType,
  freqEnd?: number,
): string {
  return bufToDataURL(synthBuffer(freq, duration, type, freqEnd));
}

/** Synthesize a sequence of sine notes with a gap between them. Returns a data URL. */
export function synthMelody(
  notes: { freq: number; duration: number }[],
  gap: number,
): string {
  const ac = getAudioContext();
  const sr = ac.sampleRate;

  const totalDur = notes.reduce(
    (sum, n) => sum + n.duration,
    gap * (notes.length - 1),
  );
  const totalLen = Math.floor(sr * totalDur);
  const buf = ac.createBuffer(1, totalLen, sr);
  const data = buf.getChannelData(0);

  let offset = 0;
  for (const note of notes) {
    const startSample = Math.floor(sr * offset);
    const noteLen = Math.floor(sr * note.duration);
    for (let i = 0; i < noteLen; i++) {
      const t = i / sr;
      const envelope = 1 - i / noteLen;
      data[startSample + i] =
        Math.sin(2 * Math.PI * note.freq * t) * envelope * 0.3;
    }
    offset += note.duration + gap;
  }

  return bufToDataURL(buf);
}
