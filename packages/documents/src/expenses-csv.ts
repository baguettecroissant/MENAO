/**
 * Export des dépenses de l'artisan pour son comptable (F-62) : même format que l'export des
 * factures (CSV séparé par « ; », montants à virgule, marque d'ordre des octets). Commun au site
 * (téléchargement) et à l'application (partage du fichier).
 */

export type ExpenseCsvRow = {
  /** AAAA-MM-JJ. */
  issuedOn: string;
  supplier: string;
  reference: string;
  title: string;
  /** Libellés (« Facture », « Matériaux »). */
  kind: string;
  category: string;
  chantier: string;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  /** AAAA-MM-JJ ou chaîne vide. */
  dueOn: string;
  paidOn: string;
};

const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
const amount = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function expensesCsv(headers: readonly string[], rows: readonly ExpenseCsvRow[]): string {
  const lines = [
    [...headers],
    ...rows.map((r) => [
      r.issuedOn,
      r.supplier,
      r.reference,
      r.title,
      r.kind,
      r.category,
      r.chantier,
      amount(r.totalHtCents),
      amount(r.totalTvaCents),
      amount(r.totalTtcCents),
      r.dueOn,
      r.paidOn,
    ]),
  ];
  return `${String.fromCharCode(0xfeff)}${lines.map((row) => row.map(cell).join(";")).join("\r\n")}\r\n`;
}
