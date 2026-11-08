/**
 * Chiffres de l'accueil du particulier (refonte « Nette », lot 6), communs au site et à
 * l'application : chantiers en cours, devis à signer, prochain rendez-vous et total déjà payé
 * aux artisans. Calcul pur sur les lignes déjà lues de `particulier_chantiers`.
 */
import { type AgendaKind, upcomingAgenda } from "./appointment";
import { isChantierFinished } from "./chantier-progress";
import type { ChantierStatus } from "./chantier-state";
import type { PaymentStatus } from "./payment";

export type ClientHomeFigureRow = {
  status: ChantierStatus;
  quote_status: string | null;
  appointment_at: string | null;
  start_at: string | null;
  artisan_name: string;
  deposit_cents: number | null;
  deposit_status: PaymentStatus | null;
  balance_cents: number | null;
  balance_status: PaymentStatus | null;
};

export type ClientHomeFigures = {
  /** Chantiers non terminés (ni clôturés, ni annulés, ni au devis refusé). */
  active: number;
  /** Devis envoyés qui attendent la signature du particulier. */
  toSign: number;
  /** Prochaine visite ou prochain démarrage à venir, sur un chantier en cours. */
  next: { kind: AgendaKind; at: string; artisan: string } | null;
  /** Acomptes et soldes payés, en centimes entiers (règle 5), versés directement aux artisans. */
  paidCents: number;
};

/** Montant payé d'une échéance : compté seulement au statut « payé ». */
const paid = (cents: number | null, status: PaymentStatus | null) =>
  status === "paye" && cents !== null && cents > 0 ? cents : 0;

export function clientHomeFigures(
  rows: readonly ClientHomeFigureRow[],
  now: Date = new Date(),
): ClientHomeFigures {
  const active = rows.filter((r) => !isChantierFinished(r.status));
  const [first] = upcomingAgenda(
    active.map((r) => ({
      status: r.status,
      appointmentAt: r.appointment_at,
      startAt: r.start_at,
      artisan: r.artisan_name,
    })),
    now,
    1,
  );
  return {
    active: active.length,
    toSign: rows.filter((r) => r.status === "devis_envoye" && r.quote_status === "envoye").length,
    next: first ? { kind: first.kind, at: first.at, artisan: first.row.artisan } : null,
    paidCents: rows.reduce(
      (sum, r) =>
        sum + paid(r.deposit_cents, r.deposit_status) + paid(r.balance_cents, r.balance_status),
      0,
    ),
  };
}
