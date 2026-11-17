/**
 * Limites des formules (F-139, ADR 0290) : demandes reçues par mois et métiers proposés, lues dans
 * `plans.limites` (formule en cours, celle de Base à défaut). Avant le lancement, les demandes ne
 * sont jamais bloquées : l'artisan est prévenu à l'approche de sa limite (décision du 12/11/2026).
 */

export type PlanCode = "base" | "premium" | "entreprise";

export type PlanUsage = {
  plan: PlanCode | null;
  /** Demandes du mois hors demandes directes ; limite nulle : illimitées. */
  requests: { received: number; limit: number | null };
  trades: { count: number; limit: number | null };
};

const PLANS: readonly PlanCode[] = ["base", "premium", "entreprise"];
/** Part de la limite à partir de laquelle l'artisan est prévenu. */
export const REQUEST_LIMIT_WARNING_RATIO = 0.8;

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
const limit = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

export function parsePlanUsage(raw: unknown): PlanUsage {
  const r = record(raw);
  const requests = record(r.demandes);
  const trades = record(r.metiers);
  return {
    plan: PLANS.find((p) => p === r.formule) ?? null,
    requests: { received: count(requests.recues), limit: limit(requests.limite) },
    trades: { count: count(trades.nombre), limit: limit(trades.limite) },
  };
}

export type RequestLimitLevel = "ok" | "proche" | "atteinte" | "depassee";

export function requestLimitLevel({
  received,
  limit: max,
}: {
  received: number;
  limit: number | null;
}): RequestLimitLevel {
  if (max === null || max <= 0) return "ok";
  if (received > max) return "depassee";
  if (received === max) return "atteinte";
  return received >= Math.ceil(max * REQUEST_LIMIT_WARNING_RATIO) ? "proche" : "ok";
}

/** Formule au-dessus (sans formule : Premium). */
export function nextPlan(plan: PlanCode | null): PlanCode | null {
  if (plan === null || plan === "base") return "premium";
  return plan === "premium" ? "entreprise" : null;
}

/**
 * Nouveau choix de métiers permis : jusqu'à la limite, ou en ne faisant que retirer (un artisan
 * inscrit avant la limite garde ses métiers). Même règle en base (app.check_trades_limit).
 */
export function canChangeTrades({
  limit: max,
  current,
  next,
}: {
  limit: number | null;
  current: readonly string[];
  next: readonly string[];
}): boolean {
  const wanted = new Set(next);
  if (max === null || wanted.size <= max) return true;
  const have = new Set(current);
  return [...wanted].every((code) => have.has(code));
}

/** Ligne du comparatif des formules (plan_features, ADR 0200) : libellé et valeur par formule. */
export type PlanContentRow = { categorie: string; libelle: string; valeurs: unknown };

/**
 * Valeur d'une ligne du comparatif pour une formule : comprise (`true`, un nombre positif ou un
 * texte, par exemple « Jusqu'à 25 ») ou non (`false`, zéro, absente).
 */
export function planFeatureValue(
  values: unknown,
  plan: PlanCode,
): { included: boolean; value: string | null } {
  const raw = record(values)[plan];
  if (raw === true) return { included: true, value: null };
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 0 ? { included: true, value: String(raw) } : { included: false, value: null };
  }
  if (typeof raw === "string" && raw.trim()) return { included: true, value: raw.trim() };
  return { included: false, value: null };
}

export type PlanContents = {
  /**
   * Ce que la formule comprend, par catégorie, dans l'ordre du comparatif. `plus` : la ligne
   * manque à Base ou y est moindre (repère « En plus », lot 71, ADR 0369) ; jamais pour Base.
   */
  groups: { title: string; features: { label: string; value: string | null; plus: boolean }[] }[];
  /** Ce qu'elle ne comprend pas. */
  excluded: string[];
  /** Nombre de lignes comprises. */
  included: number;
  /** Nombre de lignes « en plus » de Base. */
  added: number;
};

/**
 * Contenu d'une formule d'après le comparatif (« Ma formule » dans l'application, ADR 0363). Les
 * lignes arrivent déjà triées.
 */
export function planContents(rows: readonly PlanContentRow[], plan: PlanCode): PlanContents {
  const groups: PlanContents["groups"] = [];
  const excluded: string[] = [];
  let added = 0;
  for (const row of rows) {
    const { included, value } = planFeatureValue(row.valeurs, plan);
    if (!included) {
      excluded.push(row.libelle);
      continue;
    }
    const base = planFeatureValue(row.valeurs, "base");
    const plus = plan !== "base" && (!base.included || base.value !== value);
    if (plus) added += 1;
    const group = groups.find((g) => g.title === row.categorie);
    const feature = { label: row.libelle, value, plus };
    if (group) group.features.push(feature);
    else groups.push({ title: row.categorie, features: [feature] });
  }
  const included = groups.reduce((n, g) => n + g.features.length, 0);
  return { groups, excluded, included, added };
}

/** Cartes de la bande « Ce que votre formule fait pour vous » (lot 71, ADR 0369). */
export type PlanHighlightKey =
  | "secretary"
  | "requests"
  | "quote"
  | "quotes"
  | "payments"
  | "money"
  | "margin"
  | "tenders"
  | "team";

/**
 * Cartes mises en avant selon la formule, dans l'ordre d'affichage. Chacune ne parle que de ce que
 * la formule comprend : l'application montre ce que l'artisan a, jamais ce qu'il pourrait acheter
 * (CLAUDE.md règle 10).
 */
export function planHighlights(plan: PlanCode): readonly PlanHighlightKey[] {
  if (plan === "base") return ["requests", "quotes", "payments"];
  if (plan === "premium") return ["secretary", "requests", "quote", "money", "margin", "team"];
  return ["secretary", "requests", "tenders", "quote", "money", "team"];
}
