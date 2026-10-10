/**
 * Procès-verbal de réception des travaux (F-25, F-26), signé par le client (maître de l'ouvrage)
 * chez le prestataire de signature. Case cochée selon le cas réel (spec §16, correction 6) ;
 * solde = total TTC − acompte versé, toujours calculé (CLAUDE.md règle 5). Testé à part du dessin.
 * TODO(legal) : mentions du PV et signature de l'entreprise (réception contradictoire, art. 1792-6
 * du code civil) à faire valider.
 */
import { dateLong, money, winAnsi } from "./format.ts";
import { insuranceLine, issuerLines, type Issuer } from "./quote-model.ts";

export type ReceptionPdfData = {
  numero: string;
  /** Dates AAAA-MM-JJ. */
  issuedOn: string;
  finishedOn: string | null;
  quote: {
    numero: string | null;
    signedOn: string | null;
    totalTtcCents: number;
    depositPercent: number | null;
  };
  /** Acompte(s) déjà versé(s) à l'entreprise. */
  paidCents: number;
  withReserves: boolean;
  reserves: string | null;
  issuer: Issuer;
  client: { name: string; addressLines: string[] };
  site: { title: string; addressLines: string[]; city: string | null };
  /** Aperçu affiché au client avant la signature : sans balises du prestataire. */
  preview: boolean;
};

export type ReceptionDocumentModel = {
  title: string;
  numberLine: string;
  dateLine: string;
  issuerName: string;
  issuerLines: string[];
  clientLines: string[];
  partiesTitle: string;
  parties: [label: string, text: string][];
  siteTitle: string;
  siteLines: string[];
  references: string[];
  natureTitle: string;
  nature: string;
  receptionTitle: string;
  choices: { label: string; checked: boolean }[];
  observationsTitle: string;
  observations: string[];
  financialTitle: string;
  financial: [label: string, value: string][];
  placeLine: string;
  signatureLabel: string;
  insuranceLine: string;
  footer: string;
};

export const RECEPTION_TEXTS = {
  title: "PROCÈS-VERBAL DE RÉCEPTION",
  number: (n: string) => `N° ${n}`,
  date: (d: string) => `Date : ${d}`,
  partiesTitle: "Entre les soussigné(e)s",
  owner: "Maître de l'ouvrage",
  company: "Entreprise",
  siteTitle: "Adresse du chantier",
  quote: (n: string, signed: string | null) =>
    signed ? `Devis n° ${n}, signé le ${signed}` : `Devis n° ${n}`,
  finished: (d: string) => `Travaux déclarés achevés par l'entreprise le ${d}.`,
  natureTitle: "Nature des travaux réalisés",
  receptionTitle: "Réception des travaux",
  withoutReserves: "Réception des travaux SANS RÉSERVES",
  withReserves: "Réception des travaux AVEC RÉSERVES",
  observationsTitle: "Observations",
  noObservation: "Néant.",
  financialTitle: "Récapitulatif financier",
  total: "Montant total TTC",
  deposit: (percent: number | null) => `Acompte versé${percent ? ` (${percent} %)` : ""}`,
  balance: (percent: number | null) =>
    `Solde restant à payer${percent ? ` (${100 - percent} %)` : ""}`,
  place: (city: string | null, date: string) =>
    city ? `Fait à ${city}, le ${date}` : `Fait le ${date}`,
  signature: "Le maître de l'ouvrage",
  footer: (name: string, siret: string | null) =>
    `${name}${siret ? ` · SIRET ${siret}` : ""} · PV établi avec MENAO`,
};
const T = RECEPTION_TEXTS;

/** Contenu du PV (textes et montants mis en forme), indépendant du dessin. */
export function receptionDocumentModel(d: ReceptionPdfData): ReceptionDocumentModel {
  const balance = Math.max(0, d.quote.totalTtcCents - d.paidCents);
  const reserves = d.withReserves ? (d.reserves ?? "").trim() : "";
  return {
    title: winAnsi(T.title),
    numberLine: winAnsi(T.number(d.numero)),
    dateLine: winAnsi(T.date(dateLong(d.issuedOn))),
    issuerName: winAnsi(d.issuer.name),
    issuerLines: issuerLines(d.issuer),
    clientLines: [d.client.name, ...d.client.addressLines].filter(Boolean).map(winAnsi),
    partiesTitle: winAnsi(T.partiesTitle),
    parties: [
      [T.owner, [d.client.name, d.client.addressLines.join(", ")].filter(Boolean).join(", ")],
      [T.company, [d.issuer.name, d.issuer.addressLines.join(", ")].filter(Boolean).join(", ")],
    ].map(([label, text]) => [winAnsi(label ?? ""), winAnsi(text ?? "")] as [string, string]),
    siteTitle: winAnsi(T.siteTitle),
    siteLines: d.site.addressLines.map(winAnsi),
    references: [
      ...(d.quote.numero
        ? [T.quote(d.quote.numero, d.quote.signedOn ? dateLong(d.quote.signedOn) : null)]
        : []),
      ...(d.finishedOn ? [T.finished(dateLong(d.finishedOn))] : []),
    ].map(winAnsi),
    natureTitle: winAnsi(T.natureTitle),
    nature: winAnsi(d.site.title),
    receptionTitle: winAnsi(T.receptionTitle),
    choices: [
      { label: winAnsi(T.withoutReserves), checked: !d.withReserves },
      { label: winAnsi(T.withReserves), checked: d.withReserves },
    ],
    observationsTitle: winAnsi(T.observationsTitle),
    observations: (reserves
      ? reserves.split(/\r?\n/).filter((l) => l.trim())
      : [T.noObservation]
    ).map(winAnsi),
    financialTitle: winAnsi(T.financialTitle),
    financial: [
      [winAnsi(T.total), money(d.quote.totalTtcCents)],
      [winAnsi(T.deposit(d.quote.depositPercent)), money(d.paidCents)],
      [winAnsi(T.balance(d.quote.depositPercent)), money(balance)],
    ],
    placeLine: winAnsi(T.place(d.site.city, dateLong(d.issuedOn))),
    signatureLabel: winAnsi(T.signature),
    insuranceLine: insuranceLine(d.issuer),
    footer: winAnsi(T.footer(d.issuer.name, d.issuer.siret)),
  };
}
