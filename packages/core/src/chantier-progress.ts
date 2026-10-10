/**
 * Avancement du chantier présenté au client et à l'artisan (F-12, F-22) : stepper en 5 étapes
 * (spec §9), action attendue du client, échéancier payé et restant, sections de « Mes chantiers ».
 */
import type { ChantierStatus } from "./chantier-state";
import type { PaymentStatus } from "./payment";

export const CHANTIER_STEPS = [
  "signature",
  "paiement",
  "planification",
  "travaux",
  "reception",
] as const;
export type ChantierStep = (typeof CHANTIER_STEPS)[number];

/**
 * Étape en cours du stepper, index dans CHANTIER_STEPS ; CHANTIER_STEPS.length quand toutes les
 * étapes sont franchies (chantier clôturé) ; null sans stepper (chantier annulé, devis refusé,
 * litige). Signature jusqu'au devis signé, puis paiement de l'acompte, planification (date de
 * démarrage), travaux, réception jusqu'au paiement du solde.
 */
export function chantierStepIndex(status: ChantierStatus): number | null {
  switch (status) {
    case "demande_envoyee":
    case "rdv_planifie":
    case "devis_envoye":
    case "devis_en_revision":
      return 0;
    case "devis_signe":
      return 1;
    case "acompte_paye":
    case "planifie":
      return 2;
    case "en_cours":
      return 3;
    case "travaux_termines":
    case "reserves_a_lever":
    case "receptionne":
      return 4;
    case "cloture":
      return CHANTIER_STEPS.length;
    default:
      return null;
  }
}

/** « Mes chantiers terminés » : clôturés, annulés ou dont le devis a été refusé. */
export const FINISHED_CHANTIER_STATUSES = [
  "cloture",
  "annule",
  "devis_refuse",
] as const satisfies readonly ChantierStatus[];

export function isChantierFinished(status: ChantierStatus): boolean {
  return (FINISHED_CHANTIER_STATUSES as readonly ChantierStatus[]).includes(status);
}

export type ClientChantierAction =
  | { kind: "signer_devis"; quoteId: string }
  | { kind: "payer_acompte"; quoteId: string; amountCents: number }
  | { kind: "payer_solde"; quoteId: string; amountCents: number };

/** Paiement à faire : ni payé, ni en cours de confirmation (paiement différé). */
const payable = (status: PaymentStatus | null | undefined) =>
  status !== "paye" && status !== "en_cours";

/**
 * Action attendue du client (maquettes « Voir et signer le devis », « Payer maintenant ») :
 * devis envoyé à signer, acompte à payer une fois le devis signé, puis solde une fois le chantier
 * réceptionné (F-32). Aucune action pendant la confirmation d'un paiement différé.
 */
export function clientChantierAction(input: {
  status: ChantierStatus;
  quoteId: string | null;
  quoteStatus: string | null;
  depositCents: number | null;
  depositStatus: PaymentStatus | null;
  balanceCents?: number | null;
  balanceStatus?: PaymentStatus | null;
}): ClientChantierAction | null {
  const { status, quoteId, quoteStatus, depositCents, depositStatus } = input;
  if (!quoteId) return null;
  if (status === "devis_envoye" && quoteStatus === "envoye") {
    return { kind: "signer_devis", quoteId };
  }
  if (
    status === "devis_signe" &&
    quoteStatus === "signe" &&
    depositCents !== null &&
    depositCents > 0 &&
    payable(depositStatus)
  ) {
    return { kind: "payer_acompte", quoteId, amountCents: depositCents };
  }
  if (
    status === "receptionne" &&
    quoteStatus === "signe" &&
    input.balanceCents != null &&
    input.balanceCents > 0 &&
    payable(input.balanceStatus)
  ) {
    return { kind: "payer_solde", quoteId, amountCents: input.balanceCents };
  }
  return null;
}

/**
 * Échéancier du dossier : déjà payé (paiements reçus) et restant à payer, toujours calculé
 * (CLAUDE.md règle 5 : solde = total − acomptes).
 */
export function paymentProgress(
  totalTtcCents: number,
  payments: readonly { status: PaymentStatus; amountCents: number }[],
): { paidCents: number; remainingCents: number } {
  const paidCents = payments
    .filter((p) => p.status === "paye")
    .reduce((sum, p) => sum + p.amountCents, 0);
  return { paidCents, remainingCents: Math.max(0, totalTtcCents - paidCents) };
}
