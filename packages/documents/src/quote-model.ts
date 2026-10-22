/**
 * Contenu du devis (F-20), commun au PDF et à l'aperçu web : textes et montants mis en forme,
 * testés à part du dessin. Mentions minimales de la spec, à faire valider par l'expert-comptable :
 * TODO(legal) numérotation, durée de validité, mentions de TVA (taux réduits, franchise en base),
 * assurance décennale, « Devis reçu avant l'exécution des travaux », « Bon pour accord ».
 * TODO(legal) non collectés à ce jour : RCS ou RM et capital social des sociétés, médiateur de la
 * consommation, information sur le droit de rétractation.
 */
import type { QuoteLineType, QuoteUnit } from "../../core/src/quote.ts";
import { dateLong, money, phoneNumber, quantity, unit, vatRate, winAnsi } from "./format.ts";

export type QuotePdfData = {
  /** Brouillon : filigrane « APERÇU », numéro et modalités fixés à l'envoi. */
  preview: boolean;
  numero: string | null;
  /** Date d'émission (AAAA-MM-JJ). */
  issuedOn: string;
  validUntil: string | null;
  validityDays: number;
  issuer: {
    name: string;
    tradeName: string | null;
    addressLines: string[];
    siret: string | null;
    legalForm: string | null;
    vatNumber: string | null;
    vatExempt: boolean;
    email: string | null;
    phone: string | null;
    insurance: { insurer: string | null; policy: string | null; coverage: string | null } | null;
  };
  client: { name: string; addressLines: string[] };
  site: { title: string; addressLines: string[] };
  startDate: string | null;
  duration: string | null;
  schedule: { percent: number; trigger: "signature" | "reception"; amountCents: number }[];
  lines: {
    type: QuoteLineType;
    designation: string;
    description: string | null;
    quantityMilli: number;
    unit: QuoteUnit;
    unitPriceHtCents: number;
    vatRateBp: number;
    totalHtCents: number;
  }[];
  totals: {
    totalHtCents: number;
    totalTvaCents: number;
    totalTtcCents: number;
    vat: { rateBp: number; baseHtCents: number; tvaCents: number }[];
  };
};

export type QuoteDocumentModel = {
  title: string;
  numberLine: string;
  dateLine: string;
  validityLine: string;
  issuerName: string;
  /** Franchise en base de TVA : pas de taux par ligne. */
  vatExempt: boolean;
  issuerLines: string[];
  clientLines: string[];
  siteLines: string[];
  subjectLine: string;
  insuranceLine: string;
  datesLine: string;
  rows: {
    designation: string;
    description: string | null;
    quantity: string;
    unit: string;
    unitPrice: string;
    vat: string;
    total: string;
  }[];
  totals: [label: string, value: string][];
  scheduleLines: string[];
  /** Échéancier pas encore choisi (aperçu d'un brouillon). */
  scheduleNote: string | null;
  mentions: string[];
  footer: string;
  /**
   * Devis envoyé (ADR 0157) : « Confidentiel – établi pour [client], usage personnel », en pied de
   * page et en filigrane sur chaque page. Null pour l'aperçu d'un brouillon.
   */
  confidential: string | null;
};

export const QUOTE_TEXTS = {
  title: "DEVIS",
  number: (n: string) => `N° ${n}`,
  numberPreview: "Aperçu : numéro attribué à l'envoi",
  date: (d: string) => `Date : ${d}`,
  validUntil: (d: string) => `Valable jusqu'au ${d}`,
  validityPreview: (days: number) => `Validité : ${days} jours à compter de l'envoi`,
  siret: (s: string) => `SIRET : ${s}`,
  vatNumber: (v: string) => `TVA intracommunautaire : ${v}`,
  vatExempt: "TVA non applicable, art. 293 B du CGI",
  client: "Client",
  site: "Adresse du chantier",
  subject: (t: string) => `Objet : ${t}`,
  insurance: (i: string, p: string, c: string) =>
    `Assurance décennale : ${i}, contrat n° ${p}, couverture géographique : ${c}`,
  insuranceMissing: "Assurance décennale : informations à compléter",
  dates: (start: string, duration: string) =>
    `Début prévisionnel des travaux : ${start}. Durée estimée : ${duration}.`,
  datesPreview: "Début prévisionnel et durée des travaux : précisés à l'envoi du devis.",
  columns: {
    designation: "Désignation",
    quantity: "Qté",
    unit: "Unité",
    unitPrice: "PU HT",
    vat: "TVA",
    total: "Total HT",
  },
  totalHt: "Total HT",
  vatLine: (rate: string) => `TVA ${rate}`,
  totalTtc: "Total TTC",
  totalNet: "Total net à payer",
  scheduleTitle: "Échéancier de paiement",
  schedulePending: "Précisé à l'envoi du devis.",
  tranche: (percent: number, trigger: "signature" | "reception", amount: string) =>
    trigger === "signature"
      ? `${percent} % à la signature du devis, soit ${amount}`
      : `${percent} % à la réception des travaux, soit ${amount}`,
  payment:
    "Règlement en ligne via MENAO, par paiement sécurisé Stripe versé directement à l'entreprise, selon l'échéancier ci-dessus.",
  received: "Devis reçu avant l'exécution des travaux.",
  reducedVat:
    "Taux réduit de TVA : travaux dans un logement achevé depuis plus de deux ans ; le client atteste remplir les conditions d'application.",
  agreement: "Bon pour accord",
  agreementDate: "Date :",
  agreementSignature: "Signature du client :",
  footer: (name: string, siret: string | null) =>
    `${name}${siret ? ` · SIRET ${siret}` : ""} · Devis établi avec MENAO`,
  page: (n: number, total: number) => `Page ${n} / ${total}`,
  watermark: "APERÇU",
  confidential: (client: string) => `Confidentiel – établi pour ${client}, usage personnel`,
};
const T = QUOTE_TEXTS;

export type Issuer = QuotePdfData["issuer"];

/** Identité de l'artisan (raison sociale à part) : en-tête des devis et des factures. */
export function issuerLines(issuer: Issuer): string[] {
  return [
    ...(issuer.tradeName && issuer.tradeName !== issuer.name ? [issuer.tradeName] : []),
    ...issuer.addressLines,
    ...(issuer.legalForm ? [issuer.legalForm] : []),
    ...(issuer.siret ? [T.siret(issuer.siret)] : []),
    issuer.vatExempt ? T.vatExempt : issuer.vatNumber ? T.vatNumber(issuer.vatNumber) : "",
    [issuer.email, issuer.phone && phoneNumber(issuer.phone)].filter(Boolean).join(" · "),
  ]
    .filter(Boolean)
    .map(winAnsi);
}

/** Assurance décennale (obligatoire sur les devis et les factures du bâtiment). */
export function insuranceLine(issuer: Issuer): string {
  const ins = issuer.insurance;
  return winAnsi(
    ins?.insurer && ins.policy && ins.coverage
      ? T.insurance(ins.insurer, ins.policy, ins.coverage)
      : T.insuranceMissing,
  );
}

/** Contenu du devis (textes et montants mis en forme), indépendant du dessin. */
export function quoteDocumentModel(d: QuotePdfData): QuoteDocumentModel {
  const issuer = d.issuer;
  const reduced = d.lines.some((l) => l.vatRateBp === 550 || l.vatRateBp === 1000);
  return {
    title: T.title,
    numberLine: d.preview || !d.numero ? T.numberPreview : T.number(d.numero),
    dateLine: T.date(dateLong(d.issuedOn)),
    validityLine:
      d.preview || !d.validUntil
        ? T.validityPreview(d.validityDays)
        : T.validUntil(dateLong(d.validUntil)),
    issuerName: winAnsi(issuer.name),
    vatExempt: issuer.vatExempt,
    issuerLines: issuerLines(issuer),
    clientLines: [d.client.name, ...d.client.addressLines].filter(Boolean).map(winAnsi),
    siteLines: d.site.addressLines.map(winAnsi),
    subjectLine: winAnsi(T.subject(d.site.title)),
    insuranceLine: insuranceLine(issuer),
    datesLine: winAnsi(
      !d.preview && d.startDate && d.duration
        ? T.dates(dateLong(d.startDate), d.duration)
        : T.datesPreview,
    ),
    rows: d.lines.map((l) => ({
      designation: winAnsi(l.designation),
      description: l.description ? winAnsi(l.description) : null,
      quantity: quantity(l.quantityMilli),
      unit: unit(l.unit),
      unitPrice: money(l.unitPriceHtCents),
      vat: issuer.vatExempt ? "-" : vatRate(l.vatRateBp),
      total: money(l.totalHtCents),
    })),
    totals: issuer.vatExempt
      ? [
          [T.totalHt, money(d.totals.totalHtCents)],
          [T.totalNet, money(d.totals.totalTtcCents)],
        ]
      : [
          [T.totalHt, money(d.totals.totalHtCents)],
          ...d.totals.vat.map(
            (v) => [T.vatLine(vatRate(v.rateBp)), money(v.tvaCents)] as [string, string],
          ),
          [T.totalTtc, money(d.totals.totalTtcCents)],
        ],
    scheduleLines: d.schedule.map((s) =>
      winAnsi(T.tranche(s.percent, s.trigger, money(s.amountCents))),
    ),
    scheduleNote: d.schedule.length ? null : winAnsi(T.schedulePending),
    mentions: [
      T.payment,
      T.received,
      ...(issuer.vatExempt ? [T.vatExempt] : reduced ? [T.reducedVat] : []),
    ].map(winAnsi),
    footer: winAnsi(T.footer(issuer.name, issuer.siret)),
    confidential: d.preview ? null : winAnsi(T.confidential(d.client.name)),
  };
}
