/**
 * Archive envoyée au comptable (F-63, ADR 0187) : factures et dépenses d'une période, en tableaux
 * CSV (mêmes formats que les exports du site et de l'application) et en pièces (PDF des factures,
 * factures et tickets des dépenses), dans un fichier ZIP. Commun à l'Edge Function
 * accountant-export (Deno) et aux tests ; les imports portent leur extension.
 */
import { zipSync, type Zippable } from "fflate";
import { expensesCsv } from "./expenses-csv.ts";
import { invoiceCsvParties, invoicesCsv } from "./invoices-csv.ts";

/** Textes de l'archive (en-têtes repris des exports du site). */
export const ACCOUNTANT_EXPORT_TEXTS = {
  invoiceHeaders: [
    "Numéro",
    "Date",
    "Type",
    "Client",
    "Chantier",
    "Devis",
    "Total HT",
    "TVA",
    "Total TTC",
  ],
  invoiceKinds: { acompte: "Acompte", solde: "Solde" } as Record<string, string>,
  expenseHeaders: [
    "Date",
    "Fournisseur",
    "Numéro",
    "Titre",
    "Type",
    "Catégorie",
    "Chantier",
    "Total HT",
    "TVA",
    "Total TTC",
    "Échéance",
    "Payée le",
  ],
  expenseKinds: { facture: "Facture", ticket: "Ticket" } as Record<string, string>,
  expenseCategories: {
    materiaux: "Matériaux",
    outillage: "Outillage",
    location: "Location",
    sous_traitance: "Sous-traitance",
    carburant: "Carburant et déplacements",
    autre: "Autre",
  } as Record<string, string>,
  readme: (company: string, period: string, invoices: number | null, expenses: number | null) =>
    [
      `${company} — ${period}`,
      "",
      "Export préparé par MENAO pour le comptable de l'entreprise.",
      "",
      ...(invoices === null
        ? []
        : [`Factures émises : ${invoices} (factures.csv et dossier « factures »).`]),
      ...(expenses === null
        ? []
        : [`Dépenses : ${expenses} (depenses.csv et pièces dans le dossier « depenses »).`]),
      "",
      "Tableaux CSV séparés par « ; », montants en euros avec une virgule décimale.",
      "",
    ].join("\r\n"),
};

export type AccountantInvoice = {
  numero: string;
  /** AAAA-MM-JJ. */
  issuedOn: string;
  kind: string;
  /** Instantané de la facture (`invoices.document`) : client, chantier et devis. */
  document: unknown;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  /** PDF de la facture, ou null s'il n'a pas pu être produit. */
  pdf: Uint8Array | null;
};

export type AccountantExpense = {
  issuedOn: string;
  supplier: string | null;
  reference: string | null;
  title: string;
  kind: string;
  category: string | null;
  chantier: string | null;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  dueOn: string | null;
  paidOn: string | null;
  /** Pièce de la dépense, avec son extension (« pdf », « jpg », « png »). */
  piece: { bytes: Uint8Array; extension: string } | null;
};

/** Morceau de nom de fichier sans accents ni caractères spéciaux (« Négoce Exemple » → « negoce-exemple »). */
export function fileSlug(value: string, max = 40): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/** Nom unique de la pièce d'une dépense : date, fournisseur (ou titre), numéro. */
export function expensePieceName(
  expense: Pick<AccountantExpense, "issuedOn" | "supplier" | "reference" | "title">,
  extension: string,
  used: Set<string>,
): string {
  const base = [
    expense.issuedOn,
    fileSlug(expense.supplier ?? expense.title),
    fileSlug(expense.reference ?? "", 30),
  ]
    .filter(Boolean)
    .join("_");
  let name = `${base}.${extension}`;
  for (let n = 2; used.has(name); n++) name = `${base}-${n}.${extension}`;
  used.add(name);
  return name;
}

/**
 * Fichier ZIP de l'export : `factures.csv` et `factures/<numéro>.pdf`, `depenses.csv` et
 * `depenses/<date>_<fournisseur>_<numéro>.<ext>`, et un `LISEZ-MOI.txt`. `invoices` ou
 * `expenses` à null : la partie n'est pas demandée par l'artisan. Les pièces, déjà compressées,
 * sont rangées sans recompression.
 */
export function accountantArchive({
  company,
  period,
  invoices,
  expenses,
}: {
  company: string;
  period: string;
  invoices: AccountantInvoice[] | null;
  expenses: AccountantExpense[] | null;
}): Uint8Array {
  const t = ACCOUNTANT_EXPORT_TEXTS;
  const text = (value: string) => new TextEncoder().encode(value);
  const files: Zippable = {};
  const stored = (bytes: Uint8Array) => [bytes, { level: 0 }] as [Uint8Array, { level: 0 }];

  if (invoices) {
    files["factures.csv"] = text(
      invoicesCsv(
        t.invoiceHeaders,
        invoices.map((invoice) => ({
          numero: invoice.numero,
          issuedOn: invoice.issuedOn,
          kind: t.invoiceKinds[invoice.kind] ?? invoice.kind,
          ...invoiceCsvParties(invoice.document),
          totalHtCents: invoice.totalHtCents,
          totalTvaCents: invoice.totalTvaCents,
          totalTtcCents: invoice.totalTtcCents,
        })),
      ),
    );
    for (const invoice of invoices) {
      if (invoice.pdf) files[`factures/${invoice.numero}.pdf`] = stored(invoice.pdf);
    }
  }

  if (expenses) {
    files["depenses.csv"] = text(
      expensesCsv(
        t.expenseHeaders,
        expenses.map((expense) => ({
          issuedOn: expense.issuedOn,
          supplier: expense.supplier ?? "",
          reference: expense.reference ?? "",
          title: expense.title,
          kind: t.expenseKinds[expense.kind] ?? expense.kind,
          category: expense.category ? (t.expenseCategories[expense.category] ?? "") : "",
          chantier: expense.chantier ?? "",
          totalHtCents: expense.totalHtCents,
          totalTvaCents: expense.totalTvaCents,
          totalTtcCents: expense.totalTtcCents,
          dueOn: expense.dueOn ?? "",
          paidOn: expense.paidOn ?? "",
        })),
      ),
    );
    const used = new Set<string>();
    for (const expense of expenses) {
      if (!expense.piece) continue;
      files[`depenses/${expensePieceName(expense, expense.piece.extension, used)}`] = stored(
        expense.piece.bytes,
      );
    }
  }

  files["LISEZ-MOI.txt"] = text(
    t.readme(company, period, invoices?.length ?? null, expenses?.length ?? null),
  );
  return zipSync(files, { level: 6 });
}
