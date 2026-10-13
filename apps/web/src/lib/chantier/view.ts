import type { ChantierStatus } from "@menao/core";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";

const t = fr.chantier;

export type ChantierTagData = {
  text: string;
  tone: "primary" | "success" | "warning" | "neutral" | "danger";
  /** Pastille d'état avec point (« • Chantier en cours ») plutôt que simple puce. */
  dot: boolean;
};

/** Pastille de l'état du chantier (maquettes « Mes chantiers », « Vue d'un chantier »). */
export function chantierTag(c: {
  status: ChantierStatus;
  startAt: string | null;
  finishedAt: string | null;
  closedAt: string | null;
  receivedAt?: string | null;
}): ChantierTagData {
  switch (c.status) {
    case "planifie":
      return c.startAt
        ? { text: t.startPlanned(formatDateNumeric(c.startAt)), tone: "primary", dot: false }
        : { text: t.clientStatus.planifie, tone: "primary", dot: false };
    case "en_cours":
      return { text: t.inProgress, tone: "primary", dot: true };
    case "travaux_termines":
      return c.finishedAt
        ? { text: t.finishedOn(formatDateNumeric(c.finishedAt)), tone: "success", dot: false }
        : { text: t.clientStatus.travaux_termines, tone: "success", dot: false };
    case "reserves_a_lever":
      return { text: t.clientStatus.reserves_a_lever, tone: "warning", dot: false };
    case "receptionne":
      return c.receivedAt
        ? { text: t.receivedOn(formatDateNumeric(c.receivedAt)), tone: "success", dot: false }
        : { text: t.clientStatus.receptionne, tone: "success", dot: false };
    case "cloture":
      return c.closedAt
        ? { text: t.closedOn(formatDateNumeric(c.closedAt)), tone: "success", dot: false }
        : { text: t.clientStatus.cloture, tone: "success", dot: false };
    case "annule":
      return {
        text: c.closedAt ? t.cancelledOn(formatDateNumeric(c.closedAt)) : t.clientStatus.annule,
        tone: "neutral",
        dot: false,
      };
    case "devis_refuse":
      return { text: t.quoteRefused, tone: "neutral", dot: false };
    case "en_litige":
      return { text: t.clientStatus.en_litige, tone: "danger", dot: true };
    default:
      return { text: t.clientStatus[c.status], tone: "primary", dot: false };
  }
}

/** Prochaine intervention : règle partagée avec l'application (`@menao/core`). */
export { nextIntervention, type NextIntervention as NextInterventionData } from "@menao/core";
