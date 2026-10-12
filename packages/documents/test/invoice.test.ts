import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { money } from "../src/format.ts";
import { invoicePdfData, invoicePdfFilename, type InvoiceDocument } from "../src/invoice-data.ts";
import { invoiceDocumentModel } from "../src/invoice-model.ts";
import { renderInvoicePdf } from "../src/invoice-pdf.ts";
import { JPEG_LOGO, drawnImages } from "./logo-fixtures.ts";

// Réponse de invoice_document : acompte de 30 % sur un devis de 330 € TTC (TVA 10 %).
const doc: InvoiceDocument = {
  invoice: {
    id: "ad000000-0000-4000-8000-000000000001",
    artisan_id: "ad400000-0000-4000-8000-000000000001",
    numero: "FAC-2026-0001",
    kind: "acompte",
    issued_on: "2026-10-10",
    paid_on: "2026-10-10",
    total_ht_cents: 9000,
    total_tva_cents: 900,
    total_ttc_cents: 9900,
    vat_breakdown: [{ rateBp: 1000, baseHtCents: 9000, tvaCents: 900 }],
  },
  quote: { numero: "DEVIS-2026-0001", total_ttc_cents: 33000, deposit_percent: 30 },
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

describe("facture d'acompte (F-35)", () => {
  it("titre, références, artisan, client, ligne d'acompte, totaux, paiement, mentions", () => {
    const m = invoiceDocumentModel(invoicePdfData(doc));
    expect(m.title).toBe("FACTURE D'ACOMPTE");
    expect(m.numberLine).toBe("N° FAC-2026-0001");
    expect(m.dateLine).toBe("Date : 10 octobre 2026");
    expect(m.quoteLine).toBe("Devis n° DEVIS-2026-0001");
    expect(m.issuerLines).toContain("SIRET : 00000002600013");
    expect(m.clientLines).toEqual(["Camille Exemple", "1 Rue de l'Exemple", "06000 Nice"]);
    expect(m.insuranceLine).toContain("Assurances Exemple, contrat n° DEC-123");
    expect(m.rows).toEqual([
      {
        designation: `Acompte de 30 % sur le devis n° DEVIS-2026-0001 (montant total TTC : ${money(33000)})`,
        total: money(9000),
      },
    ]);
    expect(m.totals.map(([label]) => label)).toEqual([
      "Total HT",
      expect.stringMatching(/^TVA 10/),
      "Total TTC",
    ]);
    expect(m.totals.at(-1)?.[1]).toBe(money(9900));
    expect(m.paymentLine).toBe(
      "Payée le 10 octobre 2026, par paiement en ligne (Stripe), directement à l'entreprise.",
    );
    expect(m.mentions).toEqual([
      "Nature de l'opération : prestation de services.",
      "Le montant de cet acompte sera déduit de la facture de solde.",
    ]);
    expect(invoicePdfFilename(invoicePdfData(doc))).toBe("FAC-2026-0001.pdf");
  });

  it("franchise en base : total net, mention de l'article 293 B", () => {
    const m = invoiceDocumentModel(
      invoicePdfData({
        ...doc,
        issuer: { ...doc.issuer, assujetti_tva: false, tva_intracom: null },
        invoice: {
          ...doc.invoice,
          total_ht_cents: 9900,
          total_tva_cents: 0,
          vat_breakdown: [{ rateBp: 0, baseHtCents: 9900, tvaCents: 0 }],
        },
      }),
    );
    expect(m.totals).toEqual([
      ["Total HT", money(9900)],
      ["Total net", money(9900)],
    ]);
    expect(m.mentions).toContain("TVA non applicable, art. 293 B du CGI");
  });

  it("PDF : une page, métadonnées de la facture", async () => {
    const bytes = await renderInvoicePdf(invoicePdfData(doc));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Facture FAC-2026-0001");
  });

  it("PDF : logo de l'entreprise en tête, s'il y en a un (ADR 0038)", async () => {
    const bytes = await renderInvoicePdf(invoicePdfData(doc), { logo: JPEG_LOGO });
    expect(await drawnImages(bytes)).toEqual([{ width: 60, height: 24 }]);
    expect(await drawnImages(await renderInvoicePdf(invoicePdfData(doc)))).toEqual([]);
  });

  it("facture de solde : lignes du devis, totaux des travaux, acompte déduit, solde", async () => {
    const solde: InvoiceDocument = {
      ...doc,
      invoice: {
        ...doc.invoice,
        numero: "FAC-2026-0002",
        kind: "solde",
        total_ht_cents: 21000,
        total_tva_cents: 2100,
        total_ttc_cents: 23100,
        vat_breakdown: [{ rateBp: 1000, baseHtCents: 21000, tvaCents: 2100 }],
      },
      lines: [
        {
          type: "materiel",
          designation: "Prise de courant",
          description: null,
          quantity_milli: 4000,
          unit: "u",
          unit_price_ht_cents: 2250,
          vat_rate_bp: 1000,
          total_ht_cents: 9000,
        },
        {
          type: "main_oeuvre",
          designation: "Pose",
          description: null,
          quantity_milli: 3500,
          unit: "h",
          unit_price_ht_cents: 6000,
          vat_rate_bp: 1000,
          total_ht_cents: 21000,
        },
      ],
      quote_totals: {
        total_ht_cents: 30000,
        total_tva_cents: 3000,
        total_ttc_cents: 33000,
        vat_breakdown: [{ rateBp: 1000, baseHtCents: 30000, tvaCents: 3000 }],
      },
      deposits: [{ numero: "FAC-2026-0001", paid_on: "2026-10-10", total_ttc_cents: 9900 }],
    };
    const m = invoiceDocumentModel(invoicePdfData(solde));
    expect(m.title).toBe("FACTURE DE SOLDE");
    expect(m.rows).toEqual([
      { designation: `Prise de courant (4 u × ${money(2250)} HT)`, total: money(9000) },
      { designation: `Pose (3,5 h × ${money(6000)} HT)`, total: money(21000) },
    ]);
    expect(m.totals.map(([label]) => label)).toEqual([
      "Total HT des travaux",
      expect.stringMatching(/^TVA 10/),
      "Total TTC des travaux",
      "Acompte versé (facture FAC-2026-0001)",
      "Solde HT",
      expect.stringMatching(/^TVA 10.* sur le solde$/),
      "Solde TTC",
    ]);
    expect(m.totals[3]?.[1]).toBe(`\u2013 ${money(9900)}`);
    expect(m.totals.at(-1)?.[1]).toBe(money(23100));
    expect(m.mentions).toContain(
      "Facture de solde : les acomptes versés sont déduits du total des travaux.",
    );
    const pdf = await PDFDocument.load(await renderInvoicePdf(invoicePdfData(solde)));
    expect(pdf.getPageCount()).toBe(1);
  });
});
