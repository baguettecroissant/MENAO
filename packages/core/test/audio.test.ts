import { describe, expect, it } from "vitest";
import { downmixAndResample, encodeWav, wavDurationSeconds } from "../src/audio";

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
