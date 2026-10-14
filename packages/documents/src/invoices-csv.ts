/**
 * Export des factures de l'artisan pour son comptable (F-35) : CSV séparé par « ; », montants à
 * virgule, marque d'ordre des octets pour que les tableurs lisent les accents. Commun au site
 * (téléchargement) et à l'application (partage du fichier).
 */

export type InvoiceCsvRow = {
  numero: string;
  /** AAAA-MM-JJ. */
  issuedOn: string;
  /** Libellé du type (« Acompte », « Solde »). */
  kind: string;
  client: string;
  chantier: string;
  quoteNumero: string;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
};

/** Champ CSV entre guillemets (séparateur « ; », ouverture directe dans un tableur français). */
const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
const amount = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function invoicesCsv(headers: readonly string[], rows: readonly InvoiceCsvRow[]): string {
  const lines = [
    [...headers],
    ...rows.map((r) => [
      r.numero,
      r.issuedOn,
      r.kind,
      r.client,
      r.chantier,
      r.quoteNumero,
      amount(r.totalHtCents),
      amount(r.totalTvaCents),
      amount(r.totalTtcCents),
    ]),
  ];
  return `${String.fromCharCode(0xfeff)}${lines.map((row) => row.map(cell).join(";")).join("\r\n")}\r\n`;
}

/** Instantané de la facture (`invoices.document`) : client, chantier et devis, pour l'export. */
export function invoiceCsvParties(document: unknown): {
  client: string;
  chantier: string;
  quoteNumero: string;
} {
  const doc = (document ?? {}) as {
    client?: { first_name?: string | null; last_name?: string | null };
    chantier?: { title?: string };
    quote?: { numero?: string | null };
  };
  return {
    client: [doc.client?.first_name, doc.client?.last_name].filter(Boolean).join(" "),
    chantier: doc.chantier?.title ?? "",
    quoteNumero: doc.quote?.numero ?? "",
  };
}
