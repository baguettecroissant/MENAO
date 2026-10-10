import { describe, expect, it } from "vitest";
import { phoneNumber } from "../src/format.ts";
import {
  addressLines,
  quotePdfData,
  quotePdfFilename,
  type QuoteDocument,
} from "../src/quote-data.ts";

const decennale = {
  assureur: "Assurances Exemple",
  numero: "DEC-123",
  couverture: "France métropolitaine",
  date_fin: "2027-01-31",
};

// Réponse de quote_document pour le brouillon de la maquette (300 € HT, 330 € TTC).
const doc: QuoteDocument = {
  quote: {
    id: "a8000000-0000-4000-8000-000000000001",
    status: "brouillon",
    numero: null,
    issued_on: "2026-10-10",
    total_ht_cents: 30000,
    total_tva_cents: 3000,
    total_ttc_cents: 33000,
    vat_breakdown: [{ rateBp: 1000, baseHtCents: 30000, tvaCents: 3000 }],
  },
  lines: [
    {
      type: "materiel",
      designation: "Prise de courant",
      description: "Finition blanc",
      quantity_milli: 4000,
      unit: "u",
      unit_price_ht_cents: 2250,
      vat_rate_bp: 1000,
      total_ht_cents: 9000,
    },
  ],
  issuer: {
    raison_sociale: "ARTISAN EXEMPLE",
    nom_commercial: "Exemple Électricité",
    forme_juridique_code: "5710",
    siret: "00000002600013",
    tva_intracom: "FR00000000026",
    assujetti_tva: true,
    adresse_ligne: "4 RUE DE LA PAIX",
    code_postal: "75002",
    commune: "PARIS",
    email: "contact@example.test",
    phone: "+33600000000",
    decennale,
  },
  client: { first_name: "Camille", last_name: "Exemple" },
  chantier: {
    title: "Installation de prises",
    adresse: "1 Rue de l'Exemple 06000 Nice",
    code_postal: "06000",
    ville_nom: "Nice",
  },
};

describe("données du devis (quote_document)", () => {
  it("brouillon : aperçu, identité de l'artisan, client, chantier, lignes et totaux", () => {
    const d = quotePdfData(doc);
    expect(d.preview).toBe(true);
    expect(d.numero).toBeNull();
    expect(d.issuedOn).toBe("2026-10-10");
    expect(d.validityDays).toBe(30);
    expect(d.schedule).toEqual([]);
    expect(d.issuer).toEqual({
      name: "ARTISAN EXEMPLE",
      tradeName: "Exemple Électricité",
      addressLines: ["4 RUE DE LA PAIX", "75002 PARIS"],
      siret: "00000002600013",
      legalForm: "SAS",
      vatNumber: "FR00000000026",
      vatExempt: false,
      email: "contact@example.test",
      phone: "+33600000000",
      insurance: {
        insurer: "Assurances Exemple",
        policy: "DEC-123",
        coverage: "France métropolitaine",
      },
    });
    const site = ["1 Rue de l'Exemple", "06000 Nice"];
    expect(d.client).toEqual({ name: "Camille Exemple", addressLines: site });
    expect(d.site).toEqual({ title: "Installation de prises", addressLines: site });
    expect(d.lines).toEqual([
      {
        type: "materiel",
        designation: "Prise de courant",
        description: "Finition blanc",
        quantityMilli: 4000,
        unit: "u",
        unitPriceHtCents: 2250,
        vatRateBp: 1000,
        totalHtCents: 9000,
      },
    ]);
    expect(d.totals).toEqual({
      totalHtCents: 30000,
      totalTvaCents: 3000,
      totalTtcCents: 33000,
      vat: [{ rateBp: 1000, baseHtCents: 30000, tvaCents: 3000 }],
    });
    expect(quotePdfFilename(d)).toBe("devis-apercu.pdf");
  });

  it("attestation décennale échue à la date du devis non reprise ; franchise en base", () => {
    const d = quotePdfData({
      ...doc,
      issuer: {
        ...doc.issuer,
        assujetti_tva: false,
        tva_intracom: null,
        forme_juridique_code: "9999",
        decennale: { ...decennale, date_fin: "2026-10-09" },
      },
    });
    expect(d.issuer.insurance).toBeNull();
    expect(d.issuer.vatExempt).toBe(true);
    expect(d.issuer.legalForm).toBeNull();
  });

  it("devis numéroté : fichier au nom du numéro", () => {
    const d = quotePdfData({
      ...doc,
      quote: { ...doc.quote, status: "envoye", numero: "DEVIS-2026-0018" },
    });
    expect(d.preview).toBe(false);
    expect(quotePdfFilename(d)).toBe("DEVIS-2026-0018.pdf");
  });

  it("adresse en deux lignes, téléphone au format français", () => {
    expect(addressLines("1 Rue de l'Exemple 06000 Nice", "06000", "Nice")).toEqual([
      "1 Rue de l'Exemple",
      "06000 Nice",
    ]);
    expect(addressLines("Lieu-dit Les Pins", "06000", "Nice")).toEqual(["Lieu-dit Les Pins"]);
    expect(addressLines(null, "06000", "Nice")).toEqual(["06000 Nice"]);
    expect(addressLines(null, null, null)).toEqual([]);
    expect(phoneNumber("+33612345678")).toBe("06 12 34 56 78");
    expect(phoneNumber("+41790000000")).toBe("+41790000000");
  });
});
