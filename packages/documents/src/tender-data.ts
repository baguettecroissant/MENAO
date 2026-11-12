/**
 * PDF du DPGF chiffré (F-136, ADR 0287) : données renvoyées par tender_document, mises en forme
 * pour le dessin (tender-pdf.ts). Montants recalculés aux règles des devis.
 */
import { lineTotalHtCents, quoteTotals } from "../../core/src/quote.ts";
import { dateLong, money, quantity, vatRate, winAnsi } from "./format.ts";
import { type QuoteDocument, issuerData } from "./quote-data.ts";
import { insuranceLine, issuerLines } from "./quote-model.ts";

export type TenderDocument = {
  tender: {
    id: string;
    name: string;
    client_name: string | null;
    due_on: string | null;
    vat_rate_bp: number;
    /** AAAA-MM-JJ, heure de Paris. */
    issued_on: string;
  };
  lines: {
    kind: "titre" | "poste";
    lot: string | null;
    code: string | null;
    designation: string;
    unit_label: string | null;
    architect_quantity_milli: number | null;
    quantity_milli: number | null;
    unit_price_ht_cents: number | null;
  }[];
  issuer: QuoteDocument["issuer"];
};

export const TENDER_TEXTS = {
  title: "DPGF chiffré",
  project: (name: string) => `Appel d'offres : ${name}`,
  client: (name: string) => `Maître d'œuvre : ${name}`,
  due: (date: string) => `Remise des offres : ${date}`,
  date: (date: string) => `Établi le ${date}`,
  columns: {
    code: "N°",
    designation: "Désignation",
    unit: "U.",
    quantity: "Qté",
    unitPrice: "P.U. HT",
    total: "Total HT",
  },
  architectQuantity: (value: string) => `DPGF : ${value}`,
  toPrice: "à chiffrer",
  totalHt: "Total HT",
  vat: (rate: string) => `TVA ${rate}`,
  vatExempt: "TVA non applicable, art. 293 B du CGI",
  totalTtc: "Total TTC",
  changed: (count: number) =>
    `${count} quantité${count > 1 ? "s ont été modifiées" : " a été modifiée"} par l'entreprise : la quantité du DPGF est rappelée sous la sienne.`,
  // TODO(legal) : mention sur le caractère forfaitaire de l'offre à faire valider (ADR 0287).
  forfait:
    "Prix global et forfaitaire établi sur la base du dossier de consultation. Les quantités sont celles retenues par l'entreprise.",
  footer: (name: string) => `${name} · DPGF établi avec MENAO`,
} as const;
const T = TENDER_TEXTS;

export type TenderPdfData = {
  title: string;
  issuerName: string;
  issuerLines: string[];
  headLines: string[];
  insuranceLine: string;
  rows: {
    kind: "titre" | "poste";
    code: string;
    designation: string;
    unit: string;
    quantity: string;
    /** Quantité du DPGF de l'architecte, quand l'entreprise l'a changée. */
    architectQuantity: string | null;
    unitPrice: string;
    total: string;
  }[];
  totals: [label: string, value: string][];
  notes: string[];
  footer: string;
  filename: string;
};

export function tenderPdfData(doc: TenderDocument): TenderPdfData {
  const issuer = issuerData(doc.issuer, doc.tender.issued_on);
  const vatExempt = issuer.vatExempt;
  const rate = vatExempt ? 0 : doc.tender.vat_rate_bp;
  let changed = 0;
  const priced: { quantityMilli: number; unitPriceHtCents: number; vatRateBp: number }[] = [];
  const rows = doc.lines.map((l) => {
    if (l.kind === "titre") {
      return {
        kind: l.kind,
        code: winAnsi(l.code ?? ""),
        designation: winAnsi(l.designation),
        unit: "",
        quantity: "",
        architectQuantity: null,
        unitPrice: "",
        total: "",
      };
    }
    const qty = l.quantity_milli;
    const price = l.unit_price_ht_cents;
    const differs =
      qty !== null && l.architect_quantity_milli !== null && qty !== l.architect_quantity_milli;
    if (differs) changed++;
    if (qty !== null && price !== null) {
      priced.push({ quantityMilli: qty, unitPriceHtCents: price, vatRateBp: rate });
    }
    return {
      kind: l.kind,
      code: winAnsi(l.code ?? ""),
      designation: winAnsi(l.designation),
      unit: winAnsi(l.unit_label ?? ""),
      quantity: qty === null ? "" : quantity(qty),
      architectQuantity:
        differs && l.architect_quantity_milli !== null
          ? winAnsi(T.architectQuantity(quantity(l.architect_quantity_milli)))
          : null,
      unitPrice: price === null ? winAnsi(T.toPrice) : money(price),
      total: qty !== null && price !== null ? money(lineTotalHtCents(qty, price)) : "",
    };
  });
  const totals = quoteTotals(priced);
  const name = issuer.name || issuer.tradeName || "";
  return {
    title: winAnsi(T.title),
    issuerName: winAnsi(name),
    issuerLines: issuerLines(issuer),
    headLines: [
      T.project(doc.tender.name),
      ...(doc.tender.client_name ? [T.client(doc.tender.client_name)] : []),
      ...(doc.tender.due_on ? [T.due(dateLong(doc.tender.due_on))] : []),
      T.date(dateLong(doc.tender.issued_on)),
    ].map(winAnsi),
    insuranceLine: insuranceLine(issuer),
    rows,
    totals: (
      [
        [T.totalHt, money(totals.totalHtCents)],
        ...(vatExempt ? [] : [[T.vat(vatRate(rate)), money(totals.totalTvaCents)]]),
        [T.totalTtc, money(totals.totalTtcCents)],
      ] as [string, string][]
    ).map(([label, value]) => [winAnsi(label), value]),
    notes: [
      ...(vatExempt ? [T.vatExempt] : []),
      ...(changed > 0 ? [T.changed(changed)] : []),
      T.forfait,
    ].map(winAnsi),
    footer: winAnsi(T.footer(name)),
    filename: `DPGF-${
      doc.tender.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "appel-d-offres"
    }.pdf`,
  };
}
