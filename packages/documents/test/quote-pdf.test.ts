import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { money, winAnsi } from "../src/format.ts";
import { LOGO_BOX, fitLogo } from "../src/pdf-layout.ts";
import { quoteDocumentModel, type QuotePdfData } from "../src/quote-model.ts";
import { SIGNATURE_TAGS, renderQuotePdf } from "../src/quote-pdf.ts";
import { JPEG_LOGO, PNG_LOGO, drawnImages } from "./logo-fixtures.ts";

const NBSP = "\u00a0";

const prise: QuotePdfData["lines"][number] = {
  type: "materiel",
  designation: "Prise Céliane étanche",
  description: "Finition blanc, IP44",
  quantityMilli: 4000,
  unit: "u",
  unitPriceHtCents: 2250,
  vatRateBp: 1000,
  totalHtCents: 9000,
};

// Devis de la maquette : 300,00 € HT, 30,00 € de TVA (10 %), 330,00 € TTC.
const base: QuotePdfData = {
  preview: false,
  numero: "DEVIS-2026-0018",
  issuedOn: "2026-02-21",
  validUntil: "2026-03-23",
  validityDays: 30,
  issuer: {
    name: "JEAN ELEC PRO",
    tradeName: null,
    addressLines: ["4 Rue de la Paix", "75002 Paris"],
    siret: "12345678900012",
    legalForm: "SASU",
    vatNumber: "FR12123456789",
    vatExempt: false,
    email: "contact@example.test",
    phone: "+33600000000",
    insurance: {
      insurer: "Assurances Exemple",
      policy: "DEC-123",
      coverage: "France métropolitaine",
    },
  },
  client: { name: "Camille Exemple", addressLines: ["1 Rue de l'Exemple", "06000 Nice"] },
  site: { title: "Installation de prises", addressLines: ["1 Rue de l'Exemple", "06000 Nice"] },
  startDate: "2026-03-02",
  duration: "2 jours",
  schedule: [
    { percent: 30, trigger: "signature", amountCents: 9900 },
    { percent: 70, trigger: "reception", amountCents: 23100 },
  ],
  lines: [
    prise,
    {
      type: "main_oeuvre",
      designation: "Pose et raccordement",
      description: null,
      quantityMilli: 3000,
      unit: "h",
      unitPriceHtCents: 5500,
      vatRateBp: 1000,
      totalHtCents: 16500,
    },
    {
      type: "autre",
      designation: "Forfait déplacement",
      description: null,
      quantityMilli: 1000,
      unit: "forfait",
      unitPriceHtCents: 4500,
      vatRateBp: 1000,
      totalHtCents: 4500,
    },
  ],
  totals: {
    totalHtCents: 30000,
    totalTvaCents: 3000,
    totalTtcCents: 33000,
    vat: [{ rateBp: 1000, baseHtCents: 30000, tvaCents: 3000 }],
  },
};

describe("contenu du devis (F-20)", () => {
  it("devis envoyé : numéro, dates, artisan, assurance, lignes, totaux, échéancier, mentions", () => {
    const m = quoteDocumentModel(base);
    expect(m.numberLine).toBe("N° DEVIS-2026-0018");
    expect(m.dateLine).toBe("Date : 21 février 2026");
    expect(m.validityLine).toBe("Valable jusqu'au 23 mars 2026");
    expect(m.issuerLines).toEqual([
      "4 Rue de la Paix",
      "75002 Paris",
      "SASU",
      "SIRET : 12345678900012",
      "TVA intracommunautaire : FR12123456789",
      "contact@example.test · 06 00 00 00 00",
    ]);
    expect(m.insuranceLine).toBe(
      "Assurance décennale : Assurances Exemple, contrat n° DEC-123, couverture géographique : France métropolitaine",
    );
    expect(m.datesLine).toBe(
      "Début prévisionnel des travaux : 2 mars 2026. Durée estimée : 2 jours.",
    );
    expect(m.rows[0]).toEqual({
      designation: "Prise Céliane étanche",
      description: "Finition blanc, IP44",
      quantity: "4",
      unit: "u",
      unitPrice: `22,50${NBSP}€`,
      vat: `10${NBSP}%`,
      total: `90,00${NBSP}€`,
    });
    expect(m.totals).toEqual([
      ["Total HT", `300,00${NBSP}€`],
      [`TVA 10${NBSP}%`, `30,00${NBSP}€`],
      ["Total TTC", `330,00${NBSP}€`],
    ]);
    expect(m.scheduleLines).toEqual([
      `30 % à la signature du devis, soit 99,00${NBSP}€`,
      `70 % à la réception des travaux, soit 231,00${NBSP}€`,
    ]);
    expect(m.scheduleNote).toBeNull();
    expect(m.mentions).toContain("Devis reçu avant l'exécution des travaux.");
    expect(m.mentions.some((x) => x.startsWith("Taux réduit de TVA"))).toBe(true);
  });

  it("aperçu (brouillon) : numéro, validité et dates fixés à l'envoi", () => {
    const m = quoteDocumentModel({
      ...base,
      preview: true,
      numero: null,
      validUntil: null,
      startDate: null,
      duration: null,
      schedule: [],
    });
    expect(m.numberLine).toBe("Aperçu : numéro attribué à l'envoi");
    expect(m.validityLine).toBe("Validité : 30 jours à compter de l'envoi");
    expect(m.datesLine).toBe(
      "Début prévisionnel et durée des travaux : précisés à l'envoi du devis.",
    );
    expect(m.scheduleLines).toEqual([]);
    expect(m.scheduleNote).toBe("Précisé à l'envoi du devis.");
  });

  it("franchise en base : pas de TVA, mention de l'article 293 B ; assurance incomplète signalée", () => {
    const m = quoteDocumentModel({
      ...base,
      issuer: { ...base.issuer, vatExempt: true, vatNumber: null, insurance: null },
      lines: base.lines.map((l) => ({ ...l, vatRateBp: 0 })),
      totals: {
        totalHtCents: 30000,
        totalTvaCents: 0,
        totalTtcCents: 30000,
        vat: [{ rateBp: 0, baseHtCents: 30000, tvaCents: 0 }],
      },
    });
    expect(m.issuerLines).toContain("TVA non applicable, art. 293 B du CGI");
    expect(m.rows[0]?.vat).toBe("-");
    expect(m.totals).toEqual([
      ["Total HT", `300,00${NBSP}€`],
      ["Total net à payer", `300,00${NBSP}€`],
    ]);
    expect(m.mentions).toContain("TVA non applicable, art. 293 B du CGI");
    expect(m.insuranceLine).toBe("Assurance décennale : informations à compléter");
  });

  it("caractères hors police standard remplacés, espaces fines rendues insécables", () => {
    expect(winAnsi("Prise 🔌 œuvre – « ok » 中")).toBe("Prise ? œuvre – « ok » ?");
    expect(money(123456)).toBe(`1${NBSP}234,56${NBSP}€`);
  });
});

describe("rendu PDF", () => {
  it("une page pour un devis court, métadonnées en français", async () => {
    const bytes = await renderQuotePdf(base);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Devis DEVIS-2026-0018");
  });

  it("plusieurs pages pour un long devis, aperçu sans erreur avec des textes longs", async () => {
    const bytes = await renderQuotePdf({
      ...base,
      preview: true,
      lines: Array.from({ length: 80 }, (_, i) => ({
        ...prise,
        designation: `${i + 1}. ${"Fourniture et pose d'un élément particulièrement détaillé ".repeat(2)}`,
        description:
          "Description supplémentaire avec un motTrèsLongSansEspacesQuiDoitÊtreCoupéProprementParLeMoteurDeMiseEnPage",
      })),
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(3);
    expect(pdf.getTitle()).toBe("Devis (aperçu)");
  });

  it("balises du prestataire de signature : rôle du signataire, signature et date", () => {
    expect(SIGNATURE_TAGS.signature).toBe(
      "{{Signature;role=Client;type=signature;width=200;height=34}}",
    );
    expect(SIGNATURE_TAGS.date).toBe("{{Date;role=Client;type=date;width=90;height=12}}");
  });
});

describe("logo de l'entreprise (ADR 0038)", () => {
  it("cadre de 140 × 56 points, proportions conservées", () => {
    expect(LOGO_BOX).toEqual({ width: 140, height: 56 });
    expect(fitLogo(600, 150)).toEqual({ width: 140, height: 35 });
    expect(fitLogo(512, 512)).toEqual({ width: 56, height: 56 });
    expect(fitLogo(200, 400)).toEqual({ width: 28, height: 56 });
    expect(fitLogo(60, 24)).toEqual({ width: 140, height: 56 });
  });

  it("logo PNG (transparence) ou JPEG dessiné une fois, en tête du devis", async () => {
    for (const logo of [PNG_LOGO, JPEG_LOGO]) {
      const bytes = await renderQuotePdf(base, { logo });
      expect(await drawnImages(bytes)).toEqual([{ width: 60, height: 24 }]);
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    }
  });

  it("sans logo, ou fichier illisible : devis sans image, sans erreur", async () => {
    expect(await drawnImages(await renderQuotePdf(base))).toEqual([]);
    expect(await drawnImages(await renderQuotePdf(base, { logo: null }))).toEqual([]);
    const broken = { type: "png" as const, bytes: PNG_LOGO.bytes.slice(0, 40) };
    expect(await drawnImages(await renderQuotePdf(base, { logo: broken }))).toEqual([]);
    const mislabeled = { type: "jpeg" as const, bytes: PNG_LOGO.bytes };
    expect(await drawnImages(await renderQuotePdf(base, { logo: mislabeled }))).toEqual([]);
  });
});
