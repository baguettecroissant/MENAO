/**
 * Programme Partenaires (F-59, ADR 0136) : codes, liens, montants et export des commissions.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function analyze-need.
 */

/** 3 à 32 caractères : minuscules, chiffres et tirets, sans tiret au début ni à la fin. */
export const PARTNER_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

/** Code lu dans une adresse (`?p=`) ou saisi : normalisé, ou null s'il est mal formé. */
export function normalizePartnerCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return PARTNER_CODE_PATTERN.test(code) ? code : null;
}

/** Liens à donner au partenaire : recherche pour les particuliers, inscription pour les pros. */
export function partnerLinks(siteUrl: string, code: string) {
  const base = `${siteUrl.replace(/\/+$/, "")}/p/${code}`;
  return { clients: base, pros: `${base}/pro` };
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Kit du partenaire (F-59, lot 2, ADR 0138) : extraits à coller sur son site. Lien texte, bouton
 * (styles en ligne, sans script), widget (conteneur et script qui crée l'iframe à la bonne hauteur)
 * et iframe seule en repli. Aucun traceur : le code partenaire suit l'adresse.
 */
export function partnerSnippets(siteUrl: string, code: string, tradeCode?: string) {
  const site = siteUrl.replace(/\/+$/, "");
  const { clients } = partnerLinks(site, code);
  const href = escapeAttr(clients);
  const widgetUrl = `${site}/widget?p=${code}${tradeCode ? `&metier=${tradeCode}` : ""}`;
  return {
    link: `<a href="${href}">Trouver un artisan du bâtiment vérifié</a>`,
    button:
      `<a href="${href}" style="display:inline-block;padding:12px 22px;border-radius:999px;` +
      `background:#4869f6;color:#ffffff;font:600 16px/1.2 system-ui,sans-serif;text-decoration:none">` +
      `Trouver un artisan vérifié</a>`,
    widget:
      `<div data-menao-widget data-partenaire="${escapeAttr(code)}"` +
      `${tradeCode ? ` data-metier="${escapeAttr(tradeCode)}"` : ""}></div>\n` +
      `<script src="${escapeAttr(site)}/widget.js" async></script>`,
    iframe:
      `<iframe src="${escapeAttr(widgetUrl)}" title="MENAO : trouver un artisan du bâtiment vérifié" ` +
      `loading="lazy" style="width:100%;max-width:480px;height:460px;border:0"></iframe>`,
  };
}

/** Bannières du kit (ADR 0141) : formats standards, SVG servis par le site (`/bannieres`). */
export const PARTNER_BANNERS = [
  { id: "particuliers-728x90", audience: "particuliers", width: 728, height: 90 },
  { id: "particuliers-300x250", audience: "particuliers", width: 300, height: 250 },
  { id: "particuliers-160x600", audience: "particuliers", width: 160, height: 600 },
  { id: "particuliers-320x50", audience: "particuliers", width: 320, height: 50 },
  { id: "artisans-728x90", audience: "artisans", width: 728, height: 90 },
  { id: "artisans-300x250", audience: "artisans", width: 300, height: 250 },
] as const;

const BANNER_ALT = {
  particuliers: "MENAO : trouvez un artisan du bâtiment vérifié",
  artisans: "MENAO pour les artisans : des chantiers près de chez vous, sans commission",
} as const;

/**
 * Bannières à coller chez le partenaire : image hébergée par MENAO (sans cookie) dans un lien
 * partenaire (demande de travaux pour les particuliers, inscription pour les artisans).
 */
export function partnerBanners(siteUrl: string, code: string) {
  const site = siteUrl.replace(/\/+$/, "");
  const links = partnerLinks(site, code);
  return PARTNER_BANNERS.map((banner) => {
    const src = `${site}/bannieres/menao-${banner.id}.svg`;
    const href = banner.audience === "artisans" ? links.pros : links.clients;
    return {
      ...banner,
      src,
      html:
        `<a href="${escapeAttr(href)}"><img src="${escapeAttr(src)}" width="${banner.width}" ` +
        `height="${banner.height}" alt="${BANNER_ALT[banner.audience]}" loading="lazy" ` +
        `style="border:0;max-width:100%;height:auto"></a>`,
    };
  });
}

/** Montant négocié avec le partenaire, sinon le montant par défaut, sinon 0 (non réglé). */
export function commissionAmountCents(override: number | null, fallback: number | null): number {
  return override ?? fallback ?? 0;
}

/**
 * Montant saisi en euros (« 15,50 », « 15.5 », « 1 000 ») en centimes. Champ vide : null ;
 * saisie invalide : NaN (à signaler au formulaire).
 */
export function eurosToCents(raw: string | undefined): number | null {
  const value = (raw ?? "").replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (value === "") return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return Number.NaN;
  return Math.round(Number(value) * 100);
}

export const COMMISSION_STATUSES = ["en_attente", "validee", "payee", "annulee"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];
export type CommissionKind = "demande_qualifiee" | "abonne_payant";

/** Nombre et montant des commissions d'un partenaire, par statut. */
export function partnerTotals(
  rows: readonly { status: CommissionStatus; amount_cents: number }[],
): Record<CommissionStatus, { count: number; cents: number }> {
  const totals = Object.fromEntries(
    COMMISSION_STATUSES.map((s) => [s, { count: 0, cents: 0 }]),
  ) as Record<CommissionStatus, { count: number; cents: number }>;
  for (const row of rows) {
    totals[row.status].count += 1;
    totals[row.status].cents += row.amount_cents;
  }
  return totals;
}

const KIND_LABELS: Record<CommissionKind, string> = {
  demande_qualifiee: "Demande qualifiée",
  abonne_payant: "Abonné payant",
};
const STATUS_LABELS: Record<CommissionStatus, string> = {
  en_attente: "En attente",
  validee: "Validée",
  payee: "Payée",
  annulee: "Annulée",
};

export type CommissionExportRow = {
  partner: string;
  siret: string;
  kind: CommissionKind;
  status: CommissionStatus;
  amountCents: number;
  createdAt: string;
  validatedAt: string | null;
  reference: string | null;
};

/** Champ CSV : formule de tableur neutralisée, guillemets si besoin. */
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Export des commissions pour les virements (tableur français : « ; » et virgule décimale). */
export function commissionsCsv(rows: readonly CommissionExportRow[]): string {
  const head = [
    "Partenaire",
    "SIRET",
    "Type",
    "Statut",
    "Montant (EUR)",
    "Créée le",
    "Validée le",
    "Référence de paiement",
  ];
  const lines = rows.map((r) =>
    [
      r.partner,
      r.siret,
      KIND_LABELS[r.kind],
      STATUS_LABELS[r.status],
      euros(r.amountCents),
      day(r.createdAt),
      day(r.validatedAt),
      r.reference ?? "",
    ]
      .map(csvField)
      .join(";"),
  );
  return [head.join(";"), ...lines].join("\r\n");
}
