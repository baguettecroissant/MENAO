/**
 * Données renvoyées par la fonction SQL quote_document (noms de la base) → données du devis.
 * Partagé par l'Edge Function generate-pdf et l'aperçu web (ADR 0020).
 */
import { FORMES_JURIDIQUES } from "../../core/src/legal-forms.ts";
import {
  QUOTE_VALIDITY_DAYS,
  type PaymentTrigger,
  type QuoteLineType,
  type QuoteUnit,
} from "../../core/src/quote.ts";
import { days } from "./format.ts";
import type { QuotePdfData } from "./quote-model.ts";

export type QuoteDocument = {
  quote: {
    id: string;
    artisan_id: string;
    status: string;
    numero: string | null;
    version: number;
    /** AAAA-MM-JJ, heure de Paris. */
    issued_on: string;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    vat_breakdown: { rateBp: number; baseHtCents: number; tvaCents: number }[];
    /** Devis signé (F-13) : PDF signé chez le prestataire, conservé. */
    signed_at?: string | null;
    signed_pdf_path?: string | null;
  };
  lines: {
    type: QuoteLineType;
    designation: string;
    description: string | null;
    quantity_milli: number;
    unit: QuoteUnit;
    unit_price_ht_cents: number;
    vat_rate_bp: number;
    total_ht_cents: number;
  }[];
  issuer: {
    raison_sociale: string | null;
    nom_commercial: string | null;
    forme_juridique_code: string | null;
    siret: string | null;
    tva_intracom: string | null;
    assujetti_tva: boolean | null;
    adresse_ligne: string | null;
    code_postal: string | null;
    commune: string | null;
    email: string | null;
    phone: string | null;
    decennale: {
      assureur: string | null;
      numero: string | null;
      couverture: string | null;
      date_fin: string | null;
    } | null;
  };
  client: { first_name: string | null; last_name: string | null };
  chantier: {
    title: string;
    adresse: string | null;
    code_postal: string | null;
    ville_nom: string | null;
  };
  /** Modalités fixées à l'envoi (F-21) ; null pour un brouillon. */
  terms: {
    valid_until: string;
    start_date: string;
    duration_days: number;
    schedule: { percent: number; trigger: PaymentTrigger; amount_cents: number }[];
  } | null;
};

/** Adresse « 1 Rue de l'Exemple 06000 Nice » → voie, puis code postal et commune. */
export function addressLines(
  label: string | null,
  codePostal: string | null,
  commune: string | null,
): string[] {
  const value = label?.trim();
  if (value) {
    const m = /^(.+?)\s+(\d{5}\s+\S.*)$/.exec(value);
    return m?.[1] && m[2] ? [m[1], m[2]] : [value];
  }
  const city = [codePostal, commune].filter(Boolean).join(" ");
  return city ? [city] : [];
}

/** Artisan d'après les données de la base ; attestation décennale échue à la date donnée : non reprise. */
export function issuerData(
  issuer: QuoteDocument["issuer"],
  onDate: string,
): QuotePdfData["issuer"] {
  const decennale = issuer.decennale;
  const insured = decennale && (!decennale.date_fin || decennale.date_fin >= onDate);
  return {
    name: issuer.raison_sociale ?? issuer.nom_commercial ?? "",
    tradeName: issuer.nom_commercial,
    addressLines: [
      issuer.adresse_ligne ?? "",
      [issuer.code_postal, issuer.commune].filter(Boolean).join(" "),
    ].filter(Boolean),
    siret: issuer.siret,
    legalForm: issuer.forme_juridique_code
      ? (FORMES_JURIDIQUES[issuer.forme_juridique_code] ?? null)
      : null,
    vatNumber: issuer.tva_intracom,
    vatExempt: issuer.assujetti_tva === false,
    email: issuer.email,
    phone: issuer.phone,
    insurance: insured
      ? { insurer: decennale.assureur, policy: decennale.numero, coverage: decennale.couverture }
      : null,
  };
}

/** Client et chantier. TODO(legal) : le particulier n'a pas encore d'adresse propre ; celle du chantier. */
export function partiesData(
  client: QuoteDocument["client"],
  chantier: QuoteDocument["chantier"],
): Pick<QuotePdfData, "client" | "site"> {
  const site = addressLines(chantier.adresse, chantier.code_postal, chantier.ville_nom);
  return {
    client: {
      name: [client.first_name, client.last_name].filter(Boolean).join(" "),
      addressLines: site,
    },
    site: { title: chantier.title, addressLines: site },
  };
}

/**
 * Brouillon : aperçu (numéro, échéance de validité, dates et échéancier fixés à l'envoi, F-21).
 * Devis envoyé : données figées à l'envoi.
 */
export function quotePdfData(doc: QuoteDocument): QuotePdfData {
  const { quote, terms } = doc;
  return {
    preview: quote.status === "brouillon",
    numero: quote.numero,
    issuedOn: quote.issued_on,
    validUntil: terms?.valid_until ?? null,
    validityDays: QUOTE_VALIDITY_DAYS,
    issuer: issuerData(doc.issuer, quote.issued_on),
    ...partiesData(doc.client, doc.chantier),
    startDate: terms?.start_date ?? null,
    duration: terms ? days(terms.duration_days) : null,
    schedule: (terms?.schedule ?? []).map((t) => ({
      percent: t.percent,
      trigger: t.trigger,
      amountCents: t.amount_cents,
    })),
    lines: doc.lines.map((l) => ({
      type: l.type,
      designation: l.designation,
      description: l.description,
      quantityMilli: l.quantity_milli,
      unit: l.unit,
      unitPriceHtCents: l.unit_price_ht_cents,
      vatRateBp: l.vat_rate_bp,
      totalHtCents: l.total_ht_cents,
    })),
    totals: {
      totalHtCents: quote.total_ht_cents,
      totalTvaCents: quote.total_tva_cents,
      totalTtcCents: quote.total_ttc_cents,
      vat: quote.vat_breakdown,
    },
  };
}

/** « devis-apercu.pdf » pour un brouillon, sinon le numéro du devis. */
export function quotePdfFilename(data: QuotePdfData): string {
  return data.preview || !data.numero ? "devis-apercu.pdf" : `${data.numero}.pdf`;
}
