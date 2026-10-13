import { describe, expect, it } from "vitest";
import { fitWithin, uploadBatch, uploadId, type UploadStatus } from "./uploads";

// Format exigé par process-upload pour le fichier déposé dans « uploads/<user_id>/<uuid> ».
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("taille des photos envoyées", () => {
  it("réduit le côté le plus long à 2 000 px en gardant les proportions", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000 });
    expect(fitWithin(5000, 1000)).toEqual({ width: 2000, height: 400 });
  });

  it("laisse telle quelle une photo déjà assez petite", () => {
    expect(fitWithin(2000, 1500)).toBeNull();
    expect(fitWithin(800, 600)).toBeNull();
  });
});

describe("nom du fichier déposé", () => {
  it("est un UUID v4 accepté par process-upload", () => {
    expect(uploadId()).toMatch(UUID);
  });

  it("reste un UUID v4 sans crypto.randomUUID (Hermes)", () => {
    for (const value of [0, 0.5, 0.999999]) {
      const id = uploadId(() => value);
      expect(id).toMatch(UUID);
      expect(id[14]).toBe("4");
      expect("89ab").toContain(id[19]);
    }
  });

  it("change à chaque envoi", () => {
    expect(uploadId(Math.random)).not.toBe(uploadId(Math.random));
  });
});

describe("envoi groupé des photos du journal", () => {
  const run = (statuses: UploadStatus[]) => {
    const progress: string[] = [];
    let call = 0;
    return uploadBatch(
      statuses.map((_, i) => i),
      async () => statuses[call++] ?? "ok",
      (done, total) => progress.push(`${done}/${total}`),
    ).then((result) => ({ result, progress, calls: call }));
  };

  it("compte les photos ajoutées et les échecs, en suivant la progression", async () => {
    const { result, progress } = await run(["ok", "unreadable", "ok", "unavailable"]);
    expect(result).toEqual({ added: 2, failed: 2, stopped: null });
    expect(progress).toEqual(["1/4", "2/4", "3/4", "4/4"]);
  });

  it("s'arrête au plafond de photos du chantier", async () => {
    const { result, calls } = await run(["ok", "limit", "ok"]);
    expect(result).toEqual({ added: 1, failed: 0, stopped: "limit" });
    expect(calls).toBe(2);
  });

  it("s'arrête à la limite de fréquence", async () => {
    const { result, calls } = await run(["rate_limited", "ok"]);
    expect(result).toEqual({ added: 0, failed: 0, stopped: "rate_limited" });
    expect(calls).toBe(1);
  });
});
