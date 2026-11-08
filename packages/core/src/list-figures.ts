import type { ChantierStatus } from "./chantier-state";
import { parisToday } from "./project";
import { requestsAwaitingAnswer, timeLeft } from "./requests";

/**
 * Listes « Demandes » et « Chantiers » (refonte « Nette », lot 3, ADR 0248) : chiffres clés en
 * tête de liste, phase d'un chantier pour les filtres. Calculs purs, sur les lignes déjà lues
 * (artisan_inbox, artisan_chantiers).
 */

/**
 * Demandes : à traiter (et temps restant de la plus urgente), reçues ce mois-ci à Paris et, parmi
 * elles, celles acceptées.
 */
export function requestFigures(
  rows: readonly { status: string; expires_at: string; created_at: string }[],
  now: Date = new Date(),
): {
  openCount: number;
  mostUrgent: { hours: number; minutes: number } | null;
  monthCount: number;
  monthAccepted: number;
} {
  const open = requestsAwaitingAnswer(rows, now);
  const soonest = open.reduce<number | null>((min, r) => {
    const at = Date.parse(r.expires_at);
    return min === null || at < min ? at : min;
  }, null);
  const month = parisToday(now).slice(0, 7);
  const inMonth = rows.filter((r) => parisToday(new Date(r.created_at)).slice(0, 7) === month);
  return {
    openCount: open.length,
    mostUrgent: soonest === null ? null : timeLeft(new Date(soonest), now),
    monthCount: inMonth.length,
    monthAccepted: inMonth.filter((r) => r.status === "acceptee").length,
  };
}

/** Phases des filtres de la liste des chantiers, dans l'ordre d'avancement. */
export const CHANTIER_PHASES = ["avant_devis", "devis_paiement", "travaux", "termines"] as const;
export type ChantierPhase = (typeof CHANTIER_PHASES)[number];

/**
 * Phase d'un chantier : avant le devis (demande, rendez-vous), devis et paiement de l'acompte,
 * travaux (de l'acompte payé au solde, litige compris), terminés (clôturés, annulés, refusés).
 */
export function chantierPhase(status: ChantierStatus): ChantierPhase {
  switch (status) {
    case "demande_envoyee":
    case "rdv_planifie":
      return "avant_devis";
    case "devis_envoye":
    case "devis_en_revision":
    case "devis_signe":
      return "devis_paiement";
    case "cloture":
    case "annule":
    case "devis_refuse":
      return "termines";
    default:
      return "travaux";
  }
}

/**
 * Chantiers : rendez-vous à venir (et le prochain), en attente du client (devis à signer,
 * acompte à payer), en travaux (planifiés, en cours) et clôturés.
 */
export function chantierFigures(
  rows: readonly { status: ChantierStatus; appointment_at: string | null }[],
  now: Date = new Date(),
): {
  appointmentCount: number;
  nextAppointment: string | null;
  quotesToSign: number;
  depositsDue: number;
  planned: number;
  ongoing: number;
  closed: number;
} {
  const upcoming = rows
    .filter((r) => r.status === "rdv_planifie" && r.appointment_at !== null)
    .map((r) => r.appointment_at as string)
    .filter((at) => Date.parse(at) >= now.getTime())
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  const count = (...statuses: ChantierStatus[]) =>
    rows.filter((r) => statuses.includes(r.status)).length;
  return {
    appointmentCount: upcoming.length,
    nextAppointment: upcoming[0] ?? null,
    quotesToSign: count("devis_envoye"),
    depositsDue: count("devis_signe"),
    planned: count("acompte_paye", "planifie"),
    ongoing: count("en_cours", "travaux_termines", "reserves_a_lever"),
    closed: count("cloture"),
  };
}

/**
 * Prochaine étape d'un chantier dans la liste : le rendez-vous ou le démarrage à venir (avec sa
 * date), le devis à envoyer une fois la visite passée, sinon ce qu'attend l'état du chantier.
 */
export function chantierNext(
  r: { status: ChantierStatus; appointment_at: string | null; start_at: string | null },
  now: Date = new Date(),
): { kind: "rdv" | "demarrage" | "devis_a_envoyer" | "etat"; at: string | null } {
  if (r.status === "rdv_planifie" && r.appointment_at) {
    return Date.parse(r.appointment_at) >= now.getTime()
      ? { kind: "rdv", at: r.appointment_at }
      : { kind: "devis_a_envoyer", at: null };
  }
  if (r.status === "planifie" && r.start_at) return { kind: "demarrage", at: r.start_at };
  return { kind: "etat", at: null };
}
