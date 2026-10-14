import { describe, expect, it } from "vitest";
import {
  SILENCE_RMS,
  SILENCE_WARNING_MS,
  captureToWav,
  downmixAndResample,
  encodeWav,
  isSilent,
  levelFromRms,
  pcm16ToChannels,
  peakRms,
  rms,
  toBase64,
  wavDurationSeconds,
} from "../src/audio";

describe("WAV (dictée F-05)", () => {
  it("encode en PCM 16 bits mono et relit la durée", () => {
    const samples = new Float32Array(16000 * 3).fill(0.25);
    const wav = encodeWav(samples, 16000);
    expect(wav.length).toBe(44 + samples.length * 2);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe("WAVE");
    expect(wavDurationSeconds(wav)).toBeCloseTo(3, 5);
  });

  it("refuse ce qui n'est pas un WAV PCM", () => {
    expect(wavDurationSeconds(new Uint8Array(10))).toBeNull();
    const notWav = encodeWav(new Float32Array(100), 16000);
    notWav[8] = 0x41;
    expect(wavDurationSeconds(notWav)).toBeNull();
  });

  it("mélange les canaux et rééchantillonne", () => {
    const left = new Float32Array(48000).fill(1);
    const right = new Float32Array(48000).fill(0);
    const out = downmixAndResample([left, right], 48000, 16000);
    expect(out.length).toBe(16000);
    expect(out[100]).toBeCloseTo(0.5, 5);
  });
});

describe("niveau du micro et silence (dictée F-05, F-19)", () => {
  it("niveau efficace (RMS) d'un bloc d'échantillons", () => {
    expect(rms(new Float32Array(100))).toBe(0);
    expect(rms(new Float32Array(100).fill(0.5))).toBeCloseTo(0.5, 6);
    expect(rms(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1, 6);
  });

  it("niveau affiché de 0 à 1 sur 60 dB : -60 dB et moins = 0, 0 dB = 1", () => {
    expect(levelFromRms(0)).toBe(0);
    expect(levelFromRms(0.001)).toBe(0);
    expect(levelFromRms(1)).toBe(1);
    expect(levelFromRms(0.1)).toBeCloseTo(2 / 3, 6);
  });

  it("silence : le bloc de 50 ms le plus fort reste sous le seuil (micro coupé, mauvais micro)", () => {
    expect(SILENCE_RMS).toBe(0.01);
    expect(SILENCE_WARNING_MS).toBe(3000);
    const quiet = new Float32Array(16000).fill(0.002);
    expect(isSilent(peakRms(quiet, 16000))).toBe(true);
    // Une seule syllabe audible suffit : 100 ms de voix au milieu d'une seconde de silence.
    const speech = new Float32Array(16000).fill(0.002);
    speech.fill(0.08, 8000, 9600);
    expect(peakRms(speech, 16000)).toBeCloseTo(0.08, 2);
    expect(isSilent(peakRms(speech, 16000))).toBe(false);
    expect(peakRms(new Float32Array(0), 16000)).toBe(0);
  });
});

describe("capture du micro de l'application (dictée)", () => {
  const pcm = (values: number[]) => {
    const bytes = new Uint8Array(values.length * 2);
    const view = new DataView(bytes.buffer);
    values.forEach((v, i) => view.setInt16(i * 2, v, true));
    return bytes;
  };

  it("convertit le PCM 16 bits mono en échantillons de −1 à 1", () => {
    const [mono] = pcm16ToChannels(pcm([0, 16384, -32768, 32767]), 1);
    expect(Array.from(mono ?? [])).toEqual([0, 0.5, -1, 32767 / 32768]);
  });

  it("sépare les canaux entrelacés", () => {
    const channels = pcm16ToChannels(pcm([16384, -16384, 8192, -8192]), 2);
    expect(channels.map((c) => Array.from(c))).toEqual([
      [0.5, 0.25],
      [-0.5, -0.25],
    ]);
  });

  it("ignore un octet incomplet en fin de capture", () => {
    const bytes = new Uint8Array([0, 64, 1]);
    expect(pcm16ToChannels(bytes, 1)[0]?.length).toBe(1);
  });

  it("encode en base64 comme le navigateur", () => {
    const encode = (text: string) => toBase64(new TextEncoder().encode(text));
    expect(encode("")).toBe("");
    expect(encode("f")).toBe("Zg==");
    expect(encode("fo")).toBe("Zm8=");
    expect(encode("foo")).toBe("Zm9v");
    expect(encode("Dictée")).toBe("RGljdMOpZQ==");
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5]), 16000);
    expect(toBase64(wav)).toBe(Buffer.from(wav).toString("base64"));
    // Plus d'un bloc, longueur non multiple de 3.
    const long = new Uint8Array(30_001).map((_, i) => (i * 7) % 256);
    expect(toBase64(long)).toBe(Buffer.from(long).toString("base64"));
  });
});

describe("dictée de l'application : capture → WAV pour transcribe", () => {
  /** Son de 440 Hz en PCM 16 bits entrelacé, découpé en morceaux comme la capture du micro. */
  const tone = (seconds: number, rate: number, channels: number, amplitude: number) => {
    const frames = Math.round(seconds * rate);
    const bytes = new Uint8Array(frames * channels * 2);
    const view = new DataView(bytes.buffer);
    for (let f = 0; f < frames; f++) {
      const value = Math.round(amplitude * 32767 * Math.sin((2 * Math.PI * 440 * f) / rate));
      for (let c = 0; c < channels; c++) view.setInt16((f * channels + c) * 2, value, true);
    }
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 4096) chunks.push(bytes.subarray(i, i + 4096));
    return chunks;
  };

  it("produit un WAV 16 kHz mono que la fonction transcribe accepte, de la bonne durée", () => {
    const { wav, silent } = captureToWav(tone(2, 48_000, 2, 0.25), 48_000, 2);
    expect(silent).toBe(false);
    expect(wavDurationSeconds(wav)).toBeCloseTo(2, 2);
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(16_000);
    expect(new DataView(wav.buffer).getUint16(22, true)).toBe(1);
  });

  it("signale une capture silencieuse (micro coupé)", () => {
    expect(captureToWav(tone(1, 16_000, 1, 0), 16_000, 1).silent).toBe(true);
  });
});
