/**
 * Devis (F-19) : lignes et totaux en centimes entiers (CLAUDE.md règle 5), quantités en
 * millièmes (2,5 h = 2500) pour ne jamais calculer avec des nombres à virgule. La base applique
 * les mêmes règles (artisan_save_quote_draft).
 *
 * Arrondi : total HT de chaque ligne au centime le plus proche (moitié vers le haut), puis TVA
 * calculée par taux sur la somme hors taxe des lignes de ce taux.
 * TODO(legal) : règle d'arrondi et ventilation de la TVA à faire valider par l'expert-comptable.
 */

export const QUOTE_LINE_TYPES = ["materiel", "main_oeuvre", "autre"] as const;
export type QuoteLineType = (typeof QUOTE_LINE_TYPES)[number];

export const QUOTE_UNITS = ["u", "h", "jour", "m", "ml", "m2", "m3", "kg", "l", "forfait"] as const;
export type QuoteUnit = (typeof QUOTE_UNITS)[number];

/** Unité proposée selon le type de ligne (maquettes). */
export const DEFAULT_UNIT: Record<QuoteLineType, QuoteUnit> = {
  materiel: "u",
  main_oeuvre: "h",
  autre: "forfait",
};

/** Taux de TVA en points de base : 5,5 %, 10 %, 20 % ; 0 % pour la franchise en base. */
export const VAT_RATES_BP = [550, 1000, 2000] as const;
export const VAT_EXEMPT_BP = 0;

/** Taux possibles : franchise en base (art. 293 B du CGI) pour un artisan non assujetti. */
export function allowedVatRates(assujettiTva: boolean): readonly number[] {
  return assujettiTva ? VAT_RATES_BP : [VAT_EXEMPT_BP];
}

/** Bornes (mêmes contrôles en base). */
export const QUOTE_LIMITS = {
  maxLines: 200,
  maxQuantityMilli: 100_000_000, // 100 000 unités
  maxUnitPriceCents: 100_000_000, // 1 000 000 €
  maxLineTotalCents: 1_000_000_000, // 10 000 000 € par ligne
  designationMaxLength: 200,
  descriptionMaxLength: 1000,
} as const;

/** Durée de validité proposée pour un devis, en jours (maquette : « Devis valable 1 mois »). */
export const QUOTE_VALIDITY_DAYS = 30;

// ---------------------------------------------------------------------------
// Envoi du devis (F-20, F-21) : échéancier, date de début et durée estimée. Mêmes règles en base
// (artisan_send_quote).
// ---------------------------------------------------------------------------

export const PAYMENT_TRIGGERS = ["signature", "reception"] as const;
export type PaymentTrigger = (typeof PAYMENT_TRIGGERS)[number];
export type PaymentTranche = { percent: number; trigger: PaymentTrigger; amountCents: number };

/** « Mon échéancier par défaut » proposé (maquette : 30 % à la signature, 70 % à la réception). */
export const DEFAULT_DEPOSIT_PERCENT = 30;
export const QUOTE_START_MAX_DAYS = 365;
export const QUOTE_DURATION_MAX_DAYS = 365;

export const isValidDepositPercent = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 99;

export const isValidDurationDays = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= QUOTE_DURATION_MAX_DAYS;

/**
 * Acompte à la signature (arrondi au centime inférieur), solde à la réception = TTC − acompte :
 * le solde est toujours calculé (CLAUDE.md règle 5).
 */
export function paymentSchedule(totalTtcCents: number, depositPercent: number): PaymentTranche[] {
  const deposit = Math.floor((totalTtcCents * depositPercent) / 100);
  return [
    { percent: depositPercent, trigger: "signature", amountCents: deposit },
    { percent: 100 - depositPercent, trigger: "reception", amountCents: totalTtcCents - deposit },
  ];
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Numéro du jour (UTC) d'une date AAAA-MM-JJ réelle, sinon null (31 février…). */
function dayNumber(date: string): number | null {
  const m = ISO_DATE.exec(date);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return value.getTime() / 86_400_000;
}

/** Date de début prévisionnelle : après aujourd'hui (AAAA-MM-JJ, heure de Paris), dans l'année. */
export function quoteStartDateError(
  date: string,
  today: string,
): "invalide" | "passee" | "trop_loin" | null {
  const start = dayNumber(date);
  const now = dayNumber(today);
  if (start === null || now === null) return "invalide";
  if (start <= now) return "passee";
  if (start > now + QUOTE_START_MAX_DAYS) return "trop_loin";
  return null;
}

export type QuoteLineAmounts = {
  quantityMilli: number;
  unitPriceHtCents: number;
  vatRateBp: number;
};

/** Division entière arrondie au plus proche (moitié vers le haut), pour des valeurs positives. */
function roundDiv(numerator: bigint, denominator: bigint): number {
  return Number((numerator * 2n + denominator) / (denominator * 2n));
}

/** Total HT d'une ligne : quantité × prix unitaire, au centime le plus proche. */
export function lineTotalHtCents(quantityMilli: number, unitPriceHtCents: number): number {
  return roundDiv(BigInt(quantityMilli) * BigInt(unitPriceHtCents), 1000n);
}

function vatCents(baseHtCents: number, rateBp: number): number {
  return roundDiv(BigInt(baseHtCents) * BigInt(rateBp), 10_000n);
}

/** TTC affiché sur la carte d'une ligne (maquettes) ; les totaux du devis font foi. */
export function lineTtcCents(line: QuoteLineAmounts): number {
  const ht = lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents);
  return ht + vatCents(ht, line.vatRateBp);
}

export type QuoteTotals = {
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  vat: { rateBp: number; baseHtCents: number; tvaCents: number }[];
};

export function quoteTotals(lines: readonly QuoteLineAmounts[]): QuoteTotals {
  const bases = new Map<number, number>();
  for (const line of lines) {
    const ht = lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents);
    bases.set(line.vatRateBp, (bases.get(line.vatRateBp) ?? 0) + ht);
  }
  const vat = [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rateBp, baseHtCents]) => ({
      rateBp,
      baseHtCents,
      tvaCents: vatCents(baseHtCents, rateBp),
    }));
  const totalHtCents = vat.reduce((sum, v) => sum + v.baseHtCents, 0);
  const totalTvaCents = vat.reduce((sum, v) => sum + v.tvaCents, 0);
  return { totalHtCents, totalTvaCents, totalTtcCents: totalHtCents + totalTvaCents, vat };
}

// Espaces de milliers acceptés : espace, insécable, fine insécable (toutes couvertes par \s).
const SPACES = /\s/g;

/** « 22,50 » ou « 22.5 » → 2250 centimes ; null si invalide (2 décimales au plus). */
export function parseEuros(input: string): number | null {
  const value = input.replace(SPACES, "").replace(",", ".");
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** « 2,5 » → 2500 millièmes ; null si invalide, nulle ou à plus de 3 décimales. */
export function parseQuantity(input: string): number | null {
  const value = input.replace(SPACES, "").replace(",", ".");
  const m = /^(\d{1,9})(?:\.(\d{1,3}))?$/.exec(value);
  if (!m) return null;
  const milli = Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0"));
  return milli > 0 ? milli : null;
}

const quantityFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

/** 2500 → « 2,5 ». */
export function formatQuantity(quantityMilli: number): string {
  return quantityFormat.format(quantityMilli / 1000);
}

// ---------------------------------------------------------------------------
// Dictée intelligente (F-19) : lignes proposées par l'IA (Edge Function quote-from-voice).
// Ce fichier n'importe rien : la fonction Deno l'importe directement.
// ---------------------------------------------------------------------------

export const VOICE_MAX_LINES = 50;

/** Ligne telle que décrite par quoteFromVoiceJsonSchema (prix en euros, TVA en %). */
export type RawVoiceLine = {
  type: string;
  designation: string;
  description: string | null;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number | null;
  tva: number | null;
};

export type VoiceLine = {
  type: QuoteLineType;
  designation: string;
  description: string;
  quantityMilli: number;
  unit: QuoteUnit;
  unitPriceHtCents: number;
  vatRateBp: number;
};

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

/** Schéma JSON de la sortie structurée du modèle. */
export function quoteFromVoiceJsonSchema() {
  const properties = {
    type: { type: "string", enum: [...QUOTE_LINE_TYPES] },
    designation: { type: "string" },
    description: nullable({ type: "string" }),
    quantite: { type: "number" },
    unite: { type: "string", enum: [...QUOTE_UNITS] },
    prix_unitaire_ht: nullable({ type: "number" }),
    tva: nullable({ type: "number" }),
  };
  return {
    type: "object" as const,
    properties: {
      lignes: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties,
          required: Object.keys(properties),
          additionalProperties: false,
        },
      },
    },
    required: ["lignes"],
    additionalProperties: false,
  };
}

const VAT_FROM_PERCENT: Record<string, number> = { "5.5": 550, "10": 1000, "20": 2000 };

/**
 * Lignes prêtes pour l'éditeur : quantités et prix en entiers, unité et taux contrôlés.
 * Un prix non dicté devient 0 € (à compléter) ; les lignes inutilisables sont écartées.
 * L'artisan vérifie toujours les lignes avant d'enregistrer.
 */
export function normalizeVoiceLines(
  raw: readonly RawVoiceLine[],
  options: { assujettiTva: boolean; defaultVatBp: number },
): VoiceLine[] {
  const lines: VoiceLine[] = [];
  for (const r of raw) {
    if (lines.length >= VOICE_MAX_LINES) break;
    const type = (QUOTE_LINE_TYPES as readonly string[]).includes(r.type)
      ? (r.type as QuoteLineType)
      : null;
    const designation = r.designation.trim().slice(0, QUOTE_LIMITS.designationMaxLength);
    if (!type || !designation) continue;
    const quantityMilli = Math.round(r.quantite * 1000);
    const unitPriceHtCents = Math.round((r.prix_unitaire_ht ?? 0) * 100);
    if (
      !Number.isFinite(quantityMilli) ||
      quantityMilli <= 0 ||
      quantityMilli > QUOTE_LIMITS.maxQuantityMilli ||
      !Number.isFinite(unitPriceHtCents) ||
      unitPriceHtCents < 0 ||
      unitPriceHtCents > QUOTE_LIMITS.maxUnitPriceCents ||
      lineTotalHtCents(quantityMilli, unitPriceHtCents) > QUOTE_LIMITS.maxLineTotalCents
    ) {
      continue;
    }
    const unit = (QUOTE_UNITS as readonly string[]).includes(r.unite)
      ? (r.unite as QuoteUnit)
      : DEFAULT_UNIT[type];
    lines.push({
      type,
      designation,
      description: (r.description ?? "").trim().slice(0, QUOTE_LIMITS.descriptionMaxLength),
      quantityMilli,
      unit,
      unitPriceHtCents,
      vatRateBp: options.assujettiTva
        ? (VAT_FROM_PERCENT[String(r.tva)] ?? options.defaultVatBp)
        : VAT_EXEMPT_BP,
    });
  }
  return lines;
}
