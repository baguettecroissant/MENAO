import { crc32, deflateSync } from "node:zlib";
import { test, type Page } from "@playwright/test";

/** PNG blanc de `width` × `height` pixels, assez grand pour être tracé (mesure à l'échelle). */
function whitePng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits, RVB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0xff)]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Captures des écrans (ordinateur et mobile 390 px), publiées par la CI pour la revue du design. */
export async function capture(page: Page, name: string) {
  const viewport = page.viewportSize();
  await page.screenshot({ path: test.info().outputPath(`captures/${name}.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath(`captures/${name}-mobile.png`),
    fullPage: true,
  });
  if (viewport) await page.setViewportSize(viewport);
}

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

/**
 * Remplace l'API Recherche d'entreprises (ADR 0110) par une entreprise fictive : celle du faux
 * serveur Sirene pour ce SIRET, avec son siège à Nice et une dirigeante fictive.
 */
export async function mockCompanySearch(page: Page, siret: string) {
  await page.route("https://recherche-entreprises.api.gouv.fr/**", async (route) => {
    await route.fulfill({
      json: {
        results: [
          {
            siren: siret.slice(0, 9),
            nom_raison_sociale: "MENUISERIE EXEMPLE",
            nom_complet: "MENUISERIE EXEMPLE",
            nature_juridique: "5499",
            etat_administratif: "A",
            activite_principale: "43.32A",
            date_creation: "2018-04-01",
            siege: {
              siret,
              etat_administratif: "A",
              adresse: "1 RUE DE L'EXEMPLE 06000 NICE",
              code_postal: "06000",
              libelle_commune: "NICE",
              commune: "06088",
              latitude: "43.7",
              longitude: "7.27",
            },
            dirigeants: [
              {
                type_dirigeant: "personne physique",
                nom: "EXEMPLE",
                prenoms: "DOMINIQUE",
                qualite: "Gérant",
              },
            ],
          },
        ],
        total_results: 1,
      },
    });
  });
}

// Image PNG transparente de 1 × 1 pixel, à la place des tuiles du Plan IGN.
const BLANK_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/**
 * Remplace la Géoplateforme (géocodage BAN) par des réponses fictives, et ses tuiles du Plan IGN
 * (aperçu de la zone, ADR 0126) par une image vide : la CI ne dépend pas du service.
 */
export async function mockGeocoding(page: Page) {
  await page.route("https://data.geopf.fr/wmts**", (route) =>
    route.fulfill({ contentType: "image/png", body: BLANK_TILE }),
  );
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
export const dates = {
  recent: isoDay(-10),
  yesterday: isoDay(-1),
  inTwoWeeks: isoDay(14),
  nextYear: isoDay(365),
  /** Date de fin lue sur un document par le faux serveur d'IA (mock-ai.mjs). */
  inTenYears: isoDay(3650),
};

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
  /** Photo d'un plan, 800 × 600 : assez grande pour la mesure à l'échelle (ADR 0326). */
  planPhoto: { name: "plan-rdc.png", mimeType: "image/png", buffer: whitePng(800, 600) },
  /** Logo PNG 60 × 24 à fond transparent (logo des documents, ADR 0038). */
  logo: {
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAADwAAAAYCAYAAACmwZ5SAAAAO0lEQVR42u3WsQ0AMAgDQcbLKtlfoiUzpATuJQ9wnSMkjercrEkDBt4O/g0YGBgYGBjY8QAG3gqW1KoHzSEcSMK+IsMAAAAASUVORK5CYII=",
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
