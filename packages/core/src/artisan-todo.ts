/**
 * Accueil « À faire maintenant » de l'artisan (ADR 0130, lot 3 de la refonte de l'espace
 * artisan) : une seule liste, triée par urgence, de ce qui attend une action. Chaque élément mène
 * à l'écran qui la règle.
 *
 * Ordre : demandes dont le délai de réponse (72 h) expire dans moins de 12 h, rendez-vous du jour, autres
 * demandes (échéance la plus proche d'abord), devis à envoyer, documents (échéance, attestation
 * URSSAF manquante), paiements à activer, avis à répondre.
 */
import type { AgendaKind } from "./appointment";
import type { MonitoredDocumentType } from "./expiry";
import { parisToday } from "./project";

/** Sous ce délai restant, une demande passe avant tout le reste. */
export const URGENT_REQUEST_HOURS = 12;

export type TodoItem =
  | {
      kind: "demande";
      id: string;
      title: string;
      place: string;
      /** Heures pleines restantes avant l'expiration de la demande. */
      hoursLeft: number;
      urgent: boolean;
    }
  | {
      kind: "rdv";
      chantierId: string;
      at: string;
      appointment: AgendaKind;
      title: string;
      place: string;
    }
  | { kind: "devis"; chantierId: string; title: string; place: string }
  | { kind: "documents"; types: MonitoredDocumentType[] }
  | { kind: "urssaf" }
  | { kind: "paiements" }
  | { kind: "avis"; count: number };

export type TodoInput = {
  /** Demandes encore ouvertes (statut « envoyée », non expirées). */
  requests: readonly { id: string; expiresAt: string; title: string; place: string }[];
  appointments: readonly {
    kind: AgendaKind;
    at: string;
    chantierId: string;
    title: string;
    place: string;
  }[];
  /** Chantiers qui attendent un devis (visite faite ou devis à revoir). */
  quotesToSend: readonly { chantierId: string; title: string; place: string }[];
  documentsToRenew: readonly MonitoredDocumentType[];
  urssafMissing: boolean;
  paymentsMissing: boolean;
  reviewsToAnswer: number;
};

const RANK: Record<TodoItem["kind"] | "demande_urgente", number> = {
  demande_urgente: 0,
  rdv: 1,
  demande: 2,
  devis: 3,
  documents: 4,
  urssaf: 4,
  paiements: 5,
  avis: 6,
};

export function artisanTodo(input: TodoInput, now: Date = new Date()): TodoItem[] {
  const today = parisToday(now);
  const items: { item: TodoItem; rank: number; at: number }[] = [];

  for (const r of input.requests) {
    const ms = Date.parse(r.expiresAt) - now.getTime();
    if (ms <= 0) continue;
    const hoursLeft = Math.floor(ms / 3_600_000);
    const urgent = hoursLeft < URGENT_REQUEST_HOURS;
    items.push({
      item: { kind: "demande", id: r.id, title: r.title, place: r.place, hoursLeft, urgent },
      rank: urgent ? RANK.demande_urgente : RANK.demande,
      at: Date.parse(r.expiresAt),
    });
  }
  for (const a of input.appointments) {
    const at = Date.parse(a.at);
    if (at < now.getTime() || parisToday(new Date(at)) !== today) continue;
    items.push({
      item: {
        kind: "rdv",
        chantierId: a.chantierId,
        at: a.at,
        appointment: a.kind,
        title: a.title,
        place: a.place,
      },
      rank: RANK.rdv,
      at,
    });
  }
  for (const q of input.quotesToSend) {
    items.push({ item: { kind: "devis", ...q }, rank: RANK.devis, at: 0 });
  }
  if (input.documentsToRenew.length > 0) {
    items.push({
      item: { kind: "documents", types: [...input.documentsToRenew] },
      rank: RANK.documents,
      at: 0,
    });
  }
  if (input.urssafMissing) items.push({ item: { kind: "urssaf" }, rank: RANK.urssaf, at: 1 });
  if (input.paymentsMissing) {
    items.push({ item: { kind: "paiements" }, rank: RANK.paiements, at: 0 });
  }
  if (input.reviewsToAnswer > 0) {
    items.push({ item: { kind: "avis", count: input.reviewsToAnswer }, rank: RANK.avis, at: 0 });
  }

  return items.sort((a, b) => a.rank - b.rank || a.at - b.at).map(({ item }) => item);
}

/** Rendez-vous à venir après aujourd'hui (ceux du jour figurent déjà dans « À faire »). */
export function laterAppointments<T extends { at: string }>(
  appointments: readonly T[],
  now: Date = new Date(),
): T[] {
  const today = parisToday(now);
  return appointments.filter((a) => parisToday(new Date(a.at)) !== today);
}
