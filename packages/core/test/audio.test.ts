import { describe, expect, it } from "vitest";
import {
  SILENCE_RMS,
  SILENCE_WARNING_MS,
  downmixAndResample,
  encodeWav,
  isSilent,
  levelFromRms,
  peakRms,
  rms,
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
