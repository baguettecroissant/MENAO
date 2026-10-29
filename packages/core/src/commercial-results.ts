/**
 * Espace commercial, lot 3 (F-65, ADR 0207) : primes des commerciaux, zone de prospection (débuts
 * de codes postaux) et export des primes à payer. Fichier autonome (aucun import), comme
 * partners.ts. Aucun montant ici : les primes sont réglées dans le back-office (règle 15).
 */

/** Types de prime (enum `public.commercial_bonus_kind`). */
export const COMMERCIAL_BONUS_KINDS = ["validation", "abonnement"] as const;
export type CommercialBonusKind = (typeof COMMERCIAL_BONUS_KINDS)[number];

/** États d'une prime (enum `public.commercial_bonus_status`). */
export const COMMERCIAL_BONUS_STATUSES = ["en_attente", "validee", "annulee", "payee"] as const;
export type CommercialBonusStatus = (typeof COMMERCIAL_BONUS_STATUSES)[number];

/** Début de code postal : 2 à 5 chiffres (« 06 », « 061 », « 06000 »). */
export const ZONE_CODE_PATTERN = /^[0-9]{2,5}$/;

/** Nombre de codes d'une zone au plus (contrôle `app.valid_zone_codes` en base). */
export const ZONE_CODES_MAX = 200;

/**
 * Zone saisie dans le back-office : codes séparés par des virgules, points-virgules, espaces ou
 * retours à la ligne. Codes valides dédoublonnés et triés, 200 au plus (les suivants passent en
 * invalides) ; saisies invalides dédoublonnées, dans l'ordre de saisie. Vide : aucune zone.
 */
export function parseZoneCodes(text: string): { codes: string[]; invalid: string[] } {
  const valid = new Set<string>();
  const invalid = new Set<string>();
  for (const token of text.split(/[\s,;]+/)) {
    if (token === "") continue;
    if (ZONE_CODE_PATTERN.test(token)) valid.add(token);
    else invalid.add(token);
  }
  const sorted = [...valid].sort();
  return {
    codes: sorted.slice(0, ZONE_CODES_MAX),
    invalid: [...invalid, ...sorted.slice(ZONE_CODES_MAX)],
  };
}

/** Zone à afficher ou à remettre dans le champ : « 06000, 061 ». */
export function formatZoneCodes(codes: readonly string[]): string {
  return codes.join(", ");
}

/**
 * Prospect dans la zone : son code postal commence par l'un des codes (même règle que le filtre
 * 'zone' de `commercial_prospects`). Zone vide : tout est dans la zone ; sans code postal : hors zone.
 */
export function matchesZone(codePostal: string | null, codes: readonly string[]): boolean {
  if (codes.length === 0) return true;
  if (!codePostal) return false;
  return codes.some((code) => codePostal.startsWith(code));
}

/** Ligne de l'export des primes à payer (`admin_commercial_bonuses_to_pay`). */
export type CommercialBonusExportRow = {
  commercial: string;
  code: string;
  artisan: string;
  kind: string;
  amountCents: number;
  validatedAt: string;
};

const KIND_LABELS: Record<string, string> = {
  validation: "Dossier validé",
  abonnement: "Abonnement",
};

/** Champ CSV : formule de tableur neutralisée, guillemets si besoin (comme commissionsCsv). */
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const parisDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Jour AAAA-MM-JJ, heure de Paris ; vide si la date manque ou est illisible. */
function parisDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : parisDay.format(date);
}

/**
 * Export des primes à payer pour les virements (tableur français : « ; » et virgule décimale).
 * Comme commissionsCsv, sans BOM : la route d'export l'ajoute devant le contenu.
 */
export function commercialBonusesCsv(rows: readonly CommercialBonusExportRow[]): string {
  const head = ["Commercial", "Code", "Artisan", "Type", "Montant (EUR)", "Validée le"];
  const lines = rows.map((r) =>
    [
      r.commercial,
      r.code,
      r.artisan,
      KIND_LABELS[r.kind] ?? r.kind,
      euros(r.amountCents),
      parisDate(r.validatedAt),
    ]
      .map(csvField)
      .join(";"),
  );
  return [head.join(";"), ...lines].join("\r\n");
}
