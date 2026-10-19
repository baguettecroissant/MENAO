import { describe, expect, it } from "vitest";
import {
  ARTISAN_BADGE_SIZE,
  artisanBadge,
  artisanBadgeSvg,
  artisanPageUrl,
  isArtisanSlug,
  seoDescription,
} from "../src/artisan-page";

describe("adresse de la fiche publique (F-61)", () => {
  it("accepte les adresses produites par la base", () => {
    for (const ok of ["noe-plomberie-nice", "electricite-cote-d-azur-antibes-2", "a1"]) {
      expect(isArtisanSlug(ok)).toBe(true);
    }
  });

  it("refuse le reste sans interroger la base", () => {
    for (const bad of ["", "-nice", "nice-", "a--b", "Noe", "noé", "a b", "a/b", "x".repeat(81)]) {
      expect(isArtisanSlug(bad)).toBe(false);
    }
  });

  it("construit l'adresse complète, sans double barre", () => {
    expect(artisanPageUrl("https://menao.fr/", "noe-plomberie-nice")).toBe(
      "https://menao.fr/artisans/noe-plomberie-nice",
    );
  });
});

describe("description pour les moteurs de recherche", () => {
  it("garde la présentation entière quand elle est courte, espaces resserrés", () => {
    expect(seoDescription("  Plombier   à Nice.\nDevis rapide. ", "repli")).toBe(
      "Plombier à Nice. Devis rapide.",
    );
  });

  it("coupe une présentation longue sur un mot, avec des points de suspension", () => {
    const text = `${"Rénovation complète de salles de bain ".repeat(8)}fin`;
    const result = seoDescription(text, "repli");
    expect(result.length).toBeLessThanOrEqual(158);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });

  it("utilise le texte de repli sans présentation", () => {
    expect(seoDescription(null, "Artisan vérifié par MENAO")).toBe("Artisan vérifié par MENAO");
    expect(seoDescription("   ", "repli")).toBe("repli");
  });
});

describe("badge « Assuré et vérifié par MENAO » (F-61)", () => {
  it("annonce la vérification seulement quand elle est acquise", () => {
    const verified = artisanBadgeSvg(true);
    expect(verified).toContain("Assuré et vérifié");
    expect(verified).toContain("par MENAO");
    const neutral = artisanBadgeSvg(false);
    expect(neutral).not.toMatch(/vérifié/i);
    expect(neutral).toContain("Artisan sur MENAO");
  });

  it("produit un SVG autonome, à la taille annoncée", () => {
    const svg = artisanBadgeSvg(true);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`width="${ARTISAN_BADGE_SIZE.width}"`);
    expect(svg).toContain(`height="${ARTISAN_BADGE_SIZE.height}"`);
    expect(svg).not.toMatch(/<script|href=/);
  });

  it("donne l'extrait à coller : lien vers la fiche, image, texte neutre échappé", () => {
    const badge = artisanBadge("https://menao.fr/", "noe-plomberie-nice", 'Noé "Plomberie" <06>');
    expect(badge.page).toBe("https://menao.fr/artisans/noe-plomberie-nice");
    expect(badge.image).toBe("https://menao.fr/badge/noe-plomberie-nice.svg");
    expect(badge.snippet).toBe(
      '<a href="https://menao.fr/artisans/noe-plomberie-nice">' +
        '<img src="https://menao.fr/badge/noe-plomberie-nice.svg" width="232" height="64" ' +
        'alt="Noé &quot;Plomberie&quot; &lt;06&gt; sur MENAO"></a>',
    );
  });
});
