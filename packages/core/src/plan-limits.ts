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
