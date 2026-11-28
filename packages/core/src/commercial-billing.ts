import { normalizeIban } from "./connect-prefill";

/**
 * Relevés et factures des conseillers (F-197, lot 86, ADR 0397), d'après l'article 11 du contrat
 * d'agent commercial : relevé des primes acquises le 25 au plus tard (R134-3), facture émise par
 * l'agent sur la base du relevé (TVA selon son régime), virement le dernier jour du mois si la
 * facture est reçue avant le 28, sinon sous sept jours.
 */

/** Jour du relevé et jour limite de la facture pour le virement de fin de mois. */
export const STATEMENT_DAY = 25;
export const INVOICE_CUTOFF_DAY = 28;
/** Taux de TVA normal d'un agent assujetti. */
export const COMMERCIAL_VAT_RATE = 0.2;

export type CommercialVatMode = "franchise" | "assujetti";
export const COMMERCIAL_VAT_MODES: readonly CommercialVatMode[] = ["franchise", "assujetti"];

/** Mention de TVA d'une facture en franchise en base. */
export const VAT_EXEMPTION_NOTE = "TVA non applicable, art. 293 B du CGI";

/** IBAN valide (format et clé modulo 97), d'après normalizeIban (connect-prefill). */
export function isValidIban(value: string): boolean {
  return normalizeIban(value) !== null;
}

/** « FR76 •••• •••• 1234 » : seuls le pays et les quatre derniers caractères restent visibles. */
export function maskIban(value: string): string {
  const iban = value.replace(/[\s-]+/g, "").toUpperCase();
  return iban.length < 8 ? "••••" : `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;
}

/** Numéro de facture : préfixe et compteur sur trois chiffres au moins (« SK-2026-002 »). */
export function invoiceNumber(prefix: string, n: number): string {
  return `${prefix}${String(Math.max(1, Math.floor(n))).padStart(3, "0")}`;
}

/** Préfixe proposé : initiales et année (« SK-2026- »). */
export function suggestedInvoicePrefix(name: string, year: number): string {
  const initials = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
  return `${initials || "F"}-${year}-`;
}

/** Totaux d'une facture en centimes : franchise sans TVA, assujetti à 20 % (arrondi au centime). */
export function commercialInvoiceTotals(htCents: number, mode: CommercialVatMode) {
  const vat = mode === "assujetti" ? Math.round(htCents * COMMERCIAL_VAT_RATE) : 0;
  return { ht: htCents, vat, ttc: htCents + vat };
}

/** AAAA-MM-JJ du dernier jour du mois d'une date. */
export function lastDayOfMonth(date: string): string {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${date.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

/** AAAA-MM-JJ décalé de n jours. */
function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Date du virement d'une facture reçue un jour donné : le dernier jour du mois si elle arrive avant
 * le 28, sinon sept jours après sa réception.
 */
export function payoutDate(receivedOn: string): string {
  const day = Number(receivedOn.slice(8, 10));
  return day < INVOICE_CUTOFF_DAY ? lastDayOfMonth(receivedOn) : shift(receivedOn, 7);
}

/** Le relevé du mois est dû à partir du 25. */
export function statementDue(today: string): boolean {
  return Number(today.slice(8, 10)) >= STATEMENT_DAY;
}

export type TransferRow = {
  name: string;
  iban: string;
  amountCents: number;
  reference: string;
};

const csvCell = (value: string) =>
  /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/** Virements à charger dans la banque (CSV, point-virgule) : bénéficiaire, IBAN, montant, référence. */
export function transfersCsv(rows: readonly TransferRow[]): string {
  const lines = ["Bénéficiaire;IBAN;Montant;Devise;Référence"];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        normalizeIban(r.iban) ?? r.iban.replace(/\s+/g, ""),
        (r.amountCents / 100).toFixed(2).replace(".", ","),
        "EUR",
        csvCell(r.reference),
      ].join(";"),
    );
  }
  return `${lines.join("\n")}\n`;
}

export type InvoiceLedgerRow = {
  commercial: string;
  number: string | null;
  issuedOn: string;
  htCents: number;
  vatCents: number | null;
  ttcCents: number | null;
  paidOn: string | null;
  reference: string | null;
};

const euros = (cents: number | null) =>
  cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");

/** Factures des conseillers pour le comptable (CSV, point-virgule). Déposées : TVA inconnue. */
export function commercialInvoicesCsv(rows: readonly InvoiceLedgerRow[]): string {
  const lines = [
    "Conseiller;Numéro;Date;Montant HT;TVA;Montant TTC;Payée le;Référence du virement",
  ];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.commercial),
        csvCell(r.number ?? ""),
        r.issuedOn,
        euros(r.htCents),
        euros(r.vatCents),
        euros(r.ttcCents),
        r.paidOn ?? "",
        csvCell(r.reference ?? ""),
      ].join(";"),
    );
  }
  return `${lines.join("\n")}\n`;
}

export type GainsStepKey = "primes" | "releve" | "facture" | "virement";
export type GainsStepState = "fait" | "next" | "todo";
export type GainsStep = { key: GainsStepKey; state: GainsStepState; date: string | null };

/**
 * Le mois du conseiller étape par étape : primes comptées, relevé du 25, facture avant le 28,
 * virement. Dates au format AAAA-MM-JJ ; la facture porte la date limite tant qu'elle n'est pas
 * émise, le virement sa date prévue tant qu'il n'est pas fait.
 */
export function gainsMonthSteps(input: {
  today: string;
  monthCents: number;
  statementOn: string | null;
  invoiceOn: string | null;
  paidOn: string | null;
}): GainsStep[] {
  const { today, monthCents, statementOn, invoiceOn, paidOn } = input;
  const month = today.slice(0, 7);
  const primes = monthCents > 0 || statementOn !== null;
  const state = (done: boolean, ready: boolean): GainsStepState =>
    done ? "fait" : ready ? "next" : "todo";
  return [
    { key: "primes", state: primes ? "fait" : "next", date: null },
    {
      key: "releve",
      state: state(statementOn !== null, primes),
      date: statementOn ?? `${month}-${String(STATEMENT_DAY).padStart(2, "0")}`,
    },
    {
      key: "facture",
      state: state(invoiceOn !== null, statementOn !== null),
      date: invoiceOn ?? `${month}-${String(INVOICE_CUTOFF_DAY).padStart(2, "0")}`,
    },
    {
      key: "virement",
      state: state(paidOn !== null, invoiceOn !== null),
      // Facture pas encore reçue : comme si elle arrivait aujourd'hui.
      date: paidOn ?? payoutDate(invoiceOn ?? today),
    },
  ];
}

/** Total des primes possibles à venir (« jusqu'à … »). */
export function upcomingTotal(items: readonly { centimes: number | null }[]): number {
  return items.reduce((sum, i) => sum + (i.centimes ?? 0), 0);
}
