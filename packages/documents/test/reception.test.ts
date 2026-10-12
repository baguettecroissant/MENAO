import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { money } from "../src/format.ts";
import {
  receptionPdfData,
  receptionPdfFilename,
  type ReceptionDocument,
} from "../src/reception-data.ts";
import { receptionDocumentModel } from "../src/reception-model.ts";
import { renderReceptionPdf } from "../src/reception-pdf.ts";
import { PNG_LOGO, drawnImages } from "./logo-fixtures.ts";

// Réponse de reception_document : devis de 330 € TTC, acompte de 30 % payé.
const doc: ReceptionDocument = {
  reception: {
    id: "ae000000-0000-4000-8000-000000000001",
    artisan_id: "ad400000-0000-4000-8000-000000000001",
    chantier_id: "ad500000-0000-4000-8000-000000000001",
    numero: "PV-2026-R01",
    status: "en_signature",
    issued_on: "2026-10-20",
    with_reserves: false,
    reserves: null,
  },
  quote: {
    numero: "DEVIS-2026-0001",
    signed_on: "2026-10-12",
    total_ttc_cents: 33000,
    deposit_percent: 30,
  },
  paid_cents: 9900,
  finished_on: "2026-10-19",
  issuer: {
    raison_sociale: "ARTISAN EXEMPLE",
    nom_commercial: null,
    forme_juridique_code: "5710",
    siret: "00000002600013",
    tva_intracom: "FR00000000026",
    assujetti_tva: true,
    adresse_ligne: "4 RUE DE LA PAIX",
    code_postal: "75002",
    commune: "PARIS",
    email: "contact@example.test",
    phone: null,
    decennale: {
      assureur: "Assurances Exemple",
      numero: "DEC-123",
      couverture: "France métropolitaine",
      date_fin: "2027-01-31",
    },
  },
  client: { first_name: "Camille", last_name: "Exemple" },
  chantier: {
    title: "Installation de prises",
    adresse: "1 Rue de l'Exemple 06000 Nice",
    code_postal: "06000",
    ville_nom: "Nice",
  },
};

describe("procès-verbal de réception (F-25, F-26)", () => {
  it("sans réserves : case cochée, parties, références, récapitulatif, lieu et date", () => {
    const m = receptionDocumentModel(receptionPdfData(doc));
    expect(m.title).toBe("PROCÈS-VERBAL DE RÉCEPTION");
    expect(m.numberLine).toBe("N° PV-2026-R01");
    expect(m.dateLine).toBe("Date : 20 octobre 2026");
    expect(m.parties).toEqual([
      ["Maître de l'ouvrage", "Camille Exemple, 1 Rue de l'Exemple, 06000 Nice"],
      ["Entreprise", "ARTISAN EXEMPLE, 4 RUE DE LA PAIX, 75002 PARIS"],
    ]);
    expect(m.references).toEqual([
      "Devis n° DEVIS-2026-0001, signé le 12 octobre 2026",
      "Travaux déclarés achevés par l'entreprise le 19 octobre 2026.",
    ]);
    expect(m.nature).toBe("Installation de prises");
    expect(m.choices).toEqual([
      { label: "Réception des travaux SANS RÉSERVES", checked: true },
      { label: "Réception des travaux AVEC RÉSERVES", checked: false },
    ]);
    expect(m.observations).toEqual(["Néant."]);
    expect(m.financial).toEqual([
      ["Montant total TTC", money(33000)],
      ["Acompte versé (30 %)", money(9900)],
      ["Solde restant à payer (70 %)", money(23100)],
    ]);
    expect(m.placeLine).toBe("Fait à Nice, le 20 octobre 2026");
    expect(m.insuranceLine).toContain("Assurances Exemple, contrat n° DEC-123");
    expect(receptionPdfFilename(receptionPdfData(doc))).toBe("PV-2026-R01.pdf");
  });

  it("avec réserves : seule la case « avec réserves » cochée, réserves en observations", () => {
    const m = receptionDocumentModel(
      receptionPdfData({
        ...doc,
        reception: {
          ...doc.reception,
          with_reserves: true,
          reserves: "Plinthe à repeindre.\nPrise du salon mal fixée.",
        },
      }),
    );
    expect(m.choices.map((c) => c.checked)).toEqual([false, true]);
    expect(m.observations).toEqual(["Plinthe à repeindre.", "Prise du salon mal fixée."]);
  });

  it("solde jamais négatif, pourcentages absents si l'échéancier est inconnu", () => {
    const m = receptionDocumentModel(
      receptionPdfData({
        ...doc,
        quote: { ...doc.quote, deposit_percent: null },
        paid_cents: 40000,
      }),
    );
    expect(m.financial.map(([label]) => label)).toEqual([
      "Montant total TTC",
      "Acompte versé",
      "Solde restant à payer",
    ]);
    expect(m.financial.at(-1)?.[1]).toBe(money(0));
  });

  it("PDF : une page, métadonnées du PV, aperçu sans balises de signature", async () => {
    for (const preview of [false, true]) {
      const bytes = await renderReceptionPdf(receptionPdfData(doc, preview));
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getTitle()).toBe("Procès-verbal de réception PV-2026-R01");
    }
  });

  it("PDF : logo de l'entreprise en tête, s'il y en a un (ADR 0038)", async () => {
    const bytes = await renderReceptionPdf(receptionPdfData(doc, true), { logo: PNG_LOGO });
    expect(await drawnImages(bytes)).toEqual([{ width: 60, height: 24 }]);
    expect(await drawnImages(await renderReceptionPdf(receptionPdfData(doc)))).toEqual([]);
  });
});
