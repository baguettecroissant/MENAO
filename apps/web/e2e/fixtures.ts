import type { Page } from "@playwright/test";

function luhnKey(digits: string): string {
  for (let k = 0; k < 10; k++) {
    const candidate = digits + k;
    let sum = 0;
    for (let i = 0; i < candidate.length; i++) {
      let d = Number(candidate[candidate.length - 1 - i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    if (sum % 10 === 0) return String(k);
  }
  throw new Error("clé introuvable");
}

/**
 * SIRET valide et unique pour un test. Préfixe 00008 (entreprise active dans le faux serveur
 * Sirene) ou 00009 (fermée). Utilisé uniquement contre le faux serveur, jamais contre l'INSEE.
 */
export function fakeSiret(kind: "active" | "fermee"): string {
  const prefix = kind === "active" ? "00008" : "00009";
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const siren = prefix + random + luhnKey(prefix + random);
  return siren + "0001" + luhnKey(siren + "0001");
}

/** Remplace la Géoplateforme (géocodage BAN) par des réponses fictives. */
export async function mockGeocoding(page: Page) {
  await page.route("https://data.geopf.fr/geocodage/**", async (route) => {
    const url = new URL(route.request().url());
    const municipality = url.searchParams.get("type") === "municipality";
    const features = municipality
      ? [
          {
            label: "Nice",
            city: "Nice",
            citycode: "06088",
            postcode: "06000",
            coordinates: [7.26, 43.7],
          },
          {
            label: "Antibes",
            city: "Antibes",
            citycode: "06004",
            postcode: "06600",
            coordinates: [7.12, 43.58],
          },
        ]
      : [
          {
            label: "1 Rue de l'Exemple 06000 Nice",
            city: "Nice",
            citycode: "06088",
            postcode: "06000",
            coordinates: [7.27, 43.7],
          },
        ];
    await route.fulfill({
      json: {
        type: "FeatureCollection",
        features: features.map((f) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: f.coordinates },
          properties: { label: f.label, city: f.city, citycode: f.citycode, postcode: f.postcode },
        })),
      },
    });
  });
}

const isoDay = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
export const dates = { recent: isoDay(-10), nextYear: isoDay(365) };

/** Fichiers fictifs pour les dépôts. */
export const files = {
  pdf: {
    name: "document.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n"),
  },
  /** PNG 1 × 1 valide (décodable par le navigateur pour le redimensionnement). */
  png: {
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  },
  /** Page HTML déguisée en PDF : refusée par le contrôle du type réel. */
  fakePdf: {
    name: "facture.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html><body>x</body></html>"),
  },
};
