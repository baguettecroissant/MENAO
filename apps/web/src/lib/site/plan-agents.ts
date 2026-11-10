import { fr } from "@/i18n/fr";

const t = fr.pro.landing.plansPage;
const number = new Intl.NumberFormat("fr-FR");

/**
 * Assistants IA d'une formule en une ligne (cartes des formules, ADR 0265), d'après ses droits
 * `plans.limites.agents` (ADR 0231) : écrits seulement, ou Manon avec ses minutes et ses lignes.
 */
export function planAgentsLine(limites: unknown): string {
  const agents =
    limites && typeof limites === "object" && "agents" in limites
      ? (limites as { agents?: unknown }).agents
      : null;
  const record = agents && typeof agents === "object" ? (agents as Record<string, unknown>) : {};
  const minutes = typeof record.voix_minutes === "number" ? record.voix_minutes : 0;
  const lines = typeof record.lignes === "number" ? record.lignes : 0;
  if (record.secretaire !== true || minutes <= 0) return t.agentsWritten;
  return lines > 1
    ? t.agentsLines(lines, number.format(minutes))
    : t.agentsVoice(number.format(minutes));
}
