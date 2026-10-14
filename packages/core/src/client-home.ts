/**
 * Accueil du client connecté (ADR 0082) : ce qui l'attend sur ses chantiers et le message qui le
 * résume. Mêmes règles que « Mes chantiers » et la vue d'un chantier : action attendue (devis,
 * acompte, solde), réception à valider, levée des réserves signalée par l'artisan, invitation à
 * noter l'artisan.
 */
import { clientChantierAction } from "./chantier-progress";
import type { ChantierStatus } from "./chantier-state";
import type { PaymentStatus } from "./payment";
import { reviewInvited } from "./review";

/** Dans l'ordre du parcours du chantier ; l'avis vient en dernier (il ne conditionne rien, F-27). */
export const CLIENT_TODO_KINDS = [
  "signer_devis",
  "payer_acompte",
  "valider_reception",
  "confirmer_levee",
  "payer_solde",
  "donner_avis",
] as const;
export type ClientTodoKind = (typeof CLIENT_TODO_KINDS)[number];

export type ClientTodo<T> =
  | { kind: "signer_devis"; quoteId: string; row: T }
  | { kind: "payer_acompte" | "payer_solde"; quoteId: string; amountCents: number; row: T }
  | { kind: "valider_reception" | "confirmer_levee" | "donner_avis"; row: T };

export type ClientTodoChantier = {
  status: ChantierStatus;
  quoteId: string | null;
  quoteStatus: string | null;
  depositCents: number | null;
  depositStatus: PaymentStatus | null;
  balanceCents: number | null;
  balanceStatus: PaymentStatus | null;
  /** Levée des réserves signalée par l'artisan, pas encore confirmée (F-26). */
  liftSignaled: boolean;
  /** Avis déjà laissé sur ce chantier (F-28). */
  reviewed: boolean;
};

/** Ce qui attend le client : une entrée au plus par chantier, dans l'ordre de CLIENT_TODO_KINDS. */
export function clientTodos<T extends ClientTodoChantier>(
  chantiers: readonly T[],
): ClientTodo<T>[] {
  const todos: ClientTodo<T>[] = [];
  for (const row of chantiers) {
    const action = clientChantierAction(row);
    if (action) todos.push({ ...action, row });
    else if (row.status === "travaux_termines") todos.push({ kind: "valider_reception", row });
    else if (row.status === "reserves_a_lever" && row.liftSignaled) {
      todos.push({ kind: "confirmer_levee", row });
    } else if (reviewInvited(row.status, row.reviewed)) todos.push({ kind: "donner_avis", row });
  }
  // Tri stable explicite : l'ordre des chantiers est gardé pour un même type.
  const rank = (kind: ClientTodoKind) => CLIENT_TODO_KINDS.indexOf(kind);
  return todos
    .map((todo, i) => ({ todo, i }))
    .sort((a, b) => rank(a.todo.kind) - rank(b.todo.kind) || a.i - b.i)
    .map(({ todo }) => todo);
}

export type ClientHomeSummary =
  | { kind: "actions"; count: number }
  | { kind: "a_jour" }
  | { kind: "demandes"; count: number }
  | { kind: "accueil" };

/**
 * Message d'accueil : actions qui attendent le client, sinon chantiers en cours sans action de sa
 * part, sinon demandes en attente de réponse ; l'accueil habituel sans chantier ni demande.
 */
export function clientHomeSummary(c: {
  todos: number;
  activeChantiers: number;
  awaitingRequests: number;
}): ClientHomeSummary {
  if (c.todos > 0) return { kind: "actions", count: c.todos };
  if (c.activeChantiers > 0) return { kind: "a_jour" };
  if (c.awaitingRequests > 0) return { kind: "demandes", count: c.awaitingRequests };
  return { kind: "accueil" };
}
