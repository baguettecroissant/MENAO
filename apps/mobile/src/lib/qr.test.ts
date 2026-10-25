import { describe, expect, it } from "vitest";
import { qrPath } from "./qr";

describe("QR code d'une adresse", () => {
  it("donne un carré avec 4 modules de marge de chaque côté", () => {
    const { size, path } = qrPath("https://menao.fr/p/pjhfnxvm/pro");
    // Côté d'un QR code valide (21, 25, 29… modules), plus les marges.
    expect((size - 8 - 21) % 4).toBe(0);
    expect(size - 8).toBeGreaterThanOrEqual(21);
    expect(path.startsWith("M")).toBe(true);
    // Aucun module dans la marge.
    const xs = [...path.matchAll(/M(\d+) (\d+)/g)].flatMap((m) => [Number(m[1]), Number(m[2])]);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...xs)).toBeLessThan(size - 4);
  });

  it("change avec l'adresse et reste stable pour la même adresse", () => {
    const a = qrPath("https://menao.fr/artisans/julien-exemple");
    expect(qrPath("https://menao.fr/artisans/julien-exemple")).toEqual(a);
    expect(qrPath("https://menao.fr/artisans/autre").path).not.toBe(a.path);
  });
});
