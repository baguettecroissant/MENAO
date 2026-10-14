import { describe, expect, it } from "vitest";
import { invoiceCsvParties, invoicesCsv } from "../src/invoices-csv.ts";

const HEADERS = ["Numéro", "Date", "Type", "Client", "Chantier", "Devis", "HT", "TVA", "TTC"];

describe("export des factures pour le comptable (F-35)", () => {
  it("produit un CSV « ; » lisible par un tableur français", () => {
    const csv = invoicesCsv(HEADERS, [
      {
        numero: "F-2026-0001",
        issuedOn: "2026-10-01",
        kind: "Acompte",
        client: "Client Test",
        chantier: 'Salle de bain "zen"',
        quoteNumero: "D-2026-0003",
        totalHtCents: 100000,
        totalTvaCents: 20000,
        totalTtcCents: 120000,
      },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(HEADERS.map((h) => `"${h}"`).join(";"));
    expect(lines[1]).toBe(
      '"F-2026-0001";"2026-10-01";"Acompte";"Client Test";"Salle de bain ""zen""";"D-2026-0003";"1000,00";"200,00";"1200,00"',
    );
    expect(lines[2]).toBe("");
  });

  it("lit le client, le chantier et le devis dans l'instantané de la facture", () => {
    expect(
      invoiceCsvParties({
        client: { first_name: "Client", last_name: "Test" },
        chantier: { title: "Peinture" },
        quote: { numero: "D-1" },
      }),
    ).toEqual({ client: "Client Test", chantier: "Peinture", quoteNumero: "D-1" });
    expect(invoiceCsvParties(null)).toEqual({ client: "", chantier: "", quoteNumero: "" });
  });
});
