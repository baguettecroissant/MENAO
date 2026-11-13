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

/** Moments de paiement : signature (acompte), démarrage des travaux (facultatif), réception (solde). */
export const PAYMENT_TRIGGERS = ["signature", "demarrage", "reception"] as const;
export type PaymentTrigger = (typeof PAYMENT_TRIGGERS)[number];
export type PaymentTranche = { percent: number; trigger: PaymentTrigger; amountCents: number };

/** Motifs de refus d'un devis par le client (enum public.quote_refusal_reason). */
export const QUOTE_REFUSAL_REASONS = [
  "trop_cher",
  "autre_artisan",
  "projet_reporte",
  "autre",
] as const;
export type QuoteRefusalReason = (typeof QUOTE_REFUSAL_REASONS)[number];
export const QUOTE_REVISION_MESSAGE_LIMITS = { min: 10, max: 1000 } as const;

/** « Mon échéancier par défaut » proposé (maquette : 30 % à la signature, 70 % à la réception). */
export const DEFAULT_DEPOSIT_PERCENT = 30;
/** Part payée au démarrage des travaux par défaut : aucune (F-146). */
export const DEFAULT_START_PERCENT = 0;
export const QUOTE_START_MAX_DAYS = 365;
export const QUOTE_DURATION_MAX_DAYS = 365;

/** Part d'une tranche (acompte ou démarrage) : entier de 0 à 99 % ; 0 % = pas de tranche (F-146). */
export const isValidDepositPercent = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 99;
export const isValidStartPercent = isValidDepositPercent;

/**
 * Échéancier choisi par l'artisan : acompte et démarrage entre 0 et 99 %, au moins 1 % pour le
 * solde à la réception. Mêmes règles en base (app.check_payment_schedule).
 */
export function paymentScheduleError(
  depositPercent: number,
  startPercent: number,
): "acompte" | "demarrage" | "solde" | null {
  if (!isValidDepositPercent(depositPercent)) return "acompte";
  if (!isValidStartPercent(startPercent)) return "demarrage";
  if (depositPercent + startPercent > 99) return "solde";
  return null;
}

export const isValidDurationDays = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= QUOTE_DURATION_MAX_DAYS;

/**
 * Acompte à la signature et paiement au démarrage (chacun arrondi au centime inférieur, absents à
 * 0 %), solde à la réception = TTC − tranches précédentes : le solde est toujours calculé
 * (CLAUDE.md règle 5). Mêmes tranches en base (app.build_payment_schedule).
 */
export function paymentSchedule(
  totalTtcCents: number,
  depositPercent: number,
  startPercent = 0,
): PaymentTranche[] {
  const deposit = Math.floor((totalTtcCents * depositPercent) / 100);
  const start = Math.floor((totalTtcCents * startPercent) / 100);
  const tranches: PaymentTranche[] = [];
  if (depositPercent > 0) {
    tranches.push({ percent: depositPercent, trigger: "signature", amountCents: deposit });
  }
  if (startPercent > 0) {
    tranches.push({ percent: startPercent, trigger: "demarrage", amountCents: start });
  }
  tranches.push({
    percent: 100 - depositPercent - startPercent,
    trigger: "reception",
    amountCents: totalTtcCents - deposit - start,
  });
  return tranches;
}

/** Montant d'une tranche de l'échéancier (0 si elle n'existe pas : sans acompte, par exemple). */
export function trancheAmount(
  schedule: readonly { trigger: string; amountCents?: number; amount_cents?: number }[],
  trigger: PaymentTrigger,
): number {
  const tranche = schedule.find((t) => t.trigger === trigger);
  return tranche ? (tranche.amountCents ?? tranche.amount_cents ?? 0) : 0;
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

/** 2250 centimes → « 22,50 », texte d'un champ de montant (lu par parseEuros). */
export function formatEurosInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
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

// ---------------------------------------------------------------------------
// Devis en conversation avec Manon (F-85, ADR 0234) : lignes envoyées par l'outil
// devis_proposer, lues avec indulgence (nombres en texte, unités en toutes lettres) puis
// contrôlées par normalizeVoiceLines comme celles de la dictée.
// ---------------------------------------------------------------------------

const UNIT_ALIASES: Record<string, QuoteUnit> = {
  "m²": "m2",
  "m³": "m3",
  metre: "m",
  mètre: "m",
  "metre lineaire": "ml",
  "mètre linéaire": "ml",
  "metre carre": "m2",
  "mètre carré": "m2",
  "metre cube": "m3",
  "mètre cube": "m3",
  heure: "h",
  heures: "h",
  jours: "jour",
  piece: "u",
  pièce: "u",
  unite: "u",
  unité: "u",
  litre: "l",
  kilo: "kg",
};

const voiceNumber = (value: unknown): number | null => {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/\s/g, "").replace(",", "."))
        : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

function voiceLineType(value: unknown): string {
  const type = typeof value === "string" ? value.trim().toLowerCase() : "";
  if ((QUOTE_LINE_TYPES as readonly string[]).includes(type)) return type;
  if (/main|pose|travail/.test(type)) return "main_oeuvre";
  if (/mat|fourn/.test(type)) return "materiel";
  return "autre";
}

/** Lignes de l'outil devis_proposer : forme attendue par normalizeVoiceLines, sans rien inventer. */
export function rawVoiceLinesFrom(value: unknown): RawVoiceLine[] {
  if (!Array.isArray(value)) return [];
  const lines: RawVoiceLine[] = [];
  for (const item of value.slice(0, VOICE_MAX_LINES)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.designation !== "string") continue;
    const unit = typeof r.unite === "string" ? r.unite.trim().toLowerCase() : "";
    lines.push({
      type: voiceLineType(r.type),
      designation: r.designation,
      description: typeof r.description === "string" && r.description.trim() ? r.description : null,
      quantite: voiceNumber(r.quantite) ?? 1,
      unite: UNIT_ALIASES[unit] ?? unit,
      prix_unitaire_ht: voiceNumber(r.prix_unitaire_ht),
      tva: voiceNumber(r.tva),
    });
  }
  return lines;
}
