/**
 * Contenu des factures (F-35), au nom de l'artisan (MENAO est l'outil), testé à part du dessin.
 * Mentions de F-20, plus le devis de référence, la date de paiement et le montant déjà réglé.
 * Facture de solde : lignes du devis, totaux des travaux, acomptes déduits, puis le solde.
 * TODO(legal) : mentions obligatoires (dont celles de la réforme de la facturation électronique)
 * à faire valider par l'expert-comptable.
 */
import { dateLong, money, vatRate, winAnsi } from "./format.ts";
import { QUOTE_TEXTS, insuranceLine, issuerLines, type Issuer } from "./quote-model.ts";

export type InvoiceKind = "acompte" | "solde";

export type InvoicePdfData = {
  kind: InvoiceKind;
  numero: string;
  /** Dates AAAA-MM-JJ. */
  issuedOn: string;
  paidOn: string | null;
  quote: { numero: string | null; totalTtcCents: number; depositPercent: number | null };
  issuer: Issuer;
  client: { name: string; addressLines: string[] };
  site: { title: string; addressLines: string[] };
  vat: { rateBp: number; baseHtCents: number; tvaCents: number }[];
  totals: { totalHtCents: number; totalTvaCents: number; totalTtcCents: number };
  /** Facture de solde : lignes et totaux du devis, acomptes déjà facturés. */
  lines?: { designation: string; detail: string; totalHtCents: number }[];
  quoteTotals?: {
    totalHtCents: number;
    totalTvaCents: number;
    totalTtcCents: number;
    vat: { rateBp: number; baseHtCents: number; tvaCents: number }[];
  };
  deposits?: { numero: string; paidOn: string | null; totalTtcCents: number }[];
};

export type InvoiceDocumentModel = {
  title: string;
  numberLine: string;
  dateLine: string;
  quoteLine: string | null;
  issuerName: string;
  issuerLines: string[];
  clientLines: string[];
  siteLines: string[];
  subjectLine: string;
  insuranceLine: string;
  rows: { designation: string; total: string }[];
  totals: [label: string, value: string][];
  paymentLine: string | null;
  mentions: string[];
  footer: string;
};

export const INVOICE_TEXTS = {
  title: { acompte: "FACTURE D'ACOMPTE", solde: "FACTURE DE SOLDE" } satisfies Record<
    InvoiceKind,
    string
  >,
  number: (n: string) => `N° ${n}`,
  date: (d: string) => `Date : ${d}`,
  quote: (n: string) => `Devis n° ${n}`,
  columns: { designation: "Désignation", total: "Total HT" },
  depositLine: (percent: number | null, quote: string | null, total: string) =>
    `Acompte${percent ? ` de ${percent} %` : ""} sur le devis${quote ? ` n° ${quote}` : ""} (montant total TTC : ${total})`,
  totalHt: "Total HT",
  vatLine: (rate: string) => `TVA ${rate}`,
  totalTtc: "Total TTC",
  totalNet: "Total net",
  worksHt: "Total HT des travaux",
  worksTtc: "Total TTC des travaux",
  worksNet: "Total des travaux",
  depositDeducted: (numero: string) => `Acompte versé (facture ${numero})`,
  balanceHt: "Solde HT",
  balanceVat: (rate: string) => `TVA ${rate} sur le solde`,
  balanceTtc: "Solde TTC",
  balanceNet: "Solde net",
  // Tiret demi-cadratin : le signe moins n'existe pas en WinAnsi (polices standard du PDF).
  deducted: (amount: string) => `\u2013 ${amount}`,
  balanceNote: "Facture de solde : les acomptes versés sont déduits du total des travaux.",
  paid: (date: string) =>
    `Payée le ${date}, par paiement en ligne (Stripe), directement à l'entreprise.`,
  nature: "Nature de l'opération : prestation de services.",
  depositNote: "Le montant de cet acompte sera déduit de la facture de solde.",
  footer: (name: string, siret: string | null) =>
    `${name}${siret ? ` · SIRET ${siret}` : ""} · Facture établie avec MENAO`,
};
const T = INVOICE_TEXTS;

/** Contenu de la facture (textes et montants mis en forme), indépendant du dessin. */
export function invoiceDocumentModel(d: InvoicePdfData): InvoiceDocumentModel {
  const exempt = d.issuer.vatExempt;
  const balance = d.kind === "solde" && d.lines && d.quoteTotals;
  return {
    title: T.title[d.kind],
    numberLine: T.number(d.numero),
    dateLine: T.date(dateLong(d.issuedOn)),
    quoteLine: d.quote.numero ? T.quote(d.quote.numero) : null,
    issuerName: winAnsi(d.issuer.name),
    issuerLines: issuerLines(d.issuer),
    clientLines: [d.client.name, ...d.client.addressLines].filter(Boolean).map(winAnsi),
    siteLines: d.site.addressLines.map(winAnsi),
    subjectLine: winAnsi(QUOTE_TEXTS.subject(d.site.title)),
    insuranceLine: insuranceLine(d.issuer),
    rows: balance
      ? (d.lines ?? []).map((l) => ({
          designation: winAnsi(`${l.designation} (${l.detail})`),
          total: money(l.totalHtCents),
        }))
      : [
          {
            designation: winAnsi(
              T.depositLine(d.quote.depositPercent, d.quote.numero, money(d.quote.totalTtcCents)),
            ),
            total: money(d.totals.totalHtCents),
          },
        ],
    totals: balance
      ? balanceTotals(d, exempt)
      : exempt
        ? [
            [T.totalHt, money(d.totals.totalHtCents)],
            [T.totalNet, money(d.totals.totalTtcCents)],
          ]
        : [
            [T.totalHt, money(d.totals.totalHtCents)],
            ...d.vat.map(
              (v) => [T.vatLine(vatRate(v.rateBp)), money(v.tvaCents)] as [string, string],
            ),
            [T.totalTtc, money(d.totals.totalTtcCents)],
          ],
    paymentLine: d.paidOn ? winAnsi(T.paid(dateLong(d.paidOn))) : null,
    mentions: [
      T.nature,
      ...(d.kind === "acompte" ? [T.depositNote] : [T.balanceNote]),
      ...(exempt ? [QUOTE_TEXTS.vatExempt] : []),
    ].map(winAnsi),
    footer: winAnsi(T.footer(d.issuer.name, d.issuer.siret)),
  };
}

/** Totaux de la facture de solde : travaux, acomptes déduits, puis solde (dernière ligne). */
function balanceTotals(d: InvoicePdfData, exempt: boolean): [string, string][] {
  const works = d.quoteTotals;
  if (!works) return [];
  const deposits = (d.deposits ?? []).map(
    (dep) =>
      [winAnsi(T.depositDeducted(dep.numero)), winAnsi(T.deducted(money(dep.totalTtcCents)))] as [
        string,
        string,
      ],
  );
  if (exempt) {
    return [
      [T.worksNet, money(works.totalTtcCents)],
      ...deposits,
      [T.balanceNet, money(d.totals.totalTtcCents)],
    ];
  }
  return [
    [T.worksHt, money(works.totalHtCents)],
    ...works.vat.map(
      (v) => [winAnsi(T.vatLine(vatRate(v.rateBp))), money(v.tvaCents)] as [string, string],
    ),
    [T.worksTtc, money(works.totalTtcCents)],
    ...deposits,
    [T.balanceHt, money(d.totals.totalHtCents)],
    ...d.vat.map(
      (v) => [winAnsi(T.balanceVat(vatRate(v.rateBp))), money(v.tvaCents)] as [string, string],
    ),
    [T.balanceTtc, money(d.totals.totalTtcCents)],
  ];
}
