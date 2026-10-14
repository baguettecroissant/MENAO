import {
  clientHomeSummary,
  clientTodos,
  isChantierFinished,
  requestsAwaitingAnswer,
  upcomingAgenda,
  type AgendaKind,
  type ChantierStatus,
  type ClientHomeSummary,
  type ClientTodo,
} from "@menao/core";
import { loadMyChantiers, type ClientChantier, type Draft } from "./chantiers";
import { supabase } from "./supabase";

/** Chantiers affichés sur l'accueil (les autres restent dans « Mes chantiers »). */
const SHOWN_CHANTIERS = 3;
const SHOWN_APPOINTMENTS = 3;

export type ClientHome = {
  firstName: string | null;
  summary: ClientHomeSummary;
  todos: ClientTodo<{ c: ClientChantier }>[];
  appointments: { kind: AgendaKind; at: string; c: ClientChantier }[];
  /** Chantiers en cours, les plus récents d'abord, et leur nombre total. */
  active: ClientChantier[];
  activeCount: number;
  awaitingRequests: number;
  /** Dernière recherche commencée sans demande envoyée. */
  draft: Draft | null;
  photoByPath: Map<string, string>;
};

/**
 * Accueil du client connecté (ADR 0082) : prénom, ce qui l'attend, prochains rendez-vous,
 * chantiers en cours et demandes en attente de réponse. Mêmes données que « Mes chantiers », règles
 * de `@menao/core`, lectures avec les droits du compte (RLS).
 */
export async function loadClientHome(): Promise<ClientHome | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const [mine, profile, reviews, lifts] = await Promise.all([
    loadMyChantiers(),
    supabase.from("profiles").select("first_name").eq("user_id", userId).maybeSingle(),
    supabase.from("reviews").select("chantier_id").eq("particulier_id", userId),
    // Levée des réserves signalée par l'artisan, pas encore confirmée (F-26).
    supabase
      .from("receptions")
      .select("chantier_id")
      .not("lift_signaled_at", "is", null)
      .is("lifted_at", null),
  ]);
  if (!mine) return null;
  const reviewed = new Set((reviews.data ?? []).map((r) => r.chantier_id));
  const liftSignaled = new Set((lifts.data ?? []).map((r) => r.chantier_id));
  const now = new Date();
  const rows = mine.chantiers.map((c) => ({
    c,
    status: c.status as ChantierStatus,
    quoteId: c.quote_id as string | null,
    quoteStatus: c.quote_status as string | null,
    depositCents: c.deposit_cents as number | null,
    depositStatus: c.deposit_status,
    balanceCents: c.balance_cents as number | null,
    balanceStatus: c.balance_status,
    appointmentAt: c.appointment_at as string | null,
    startAt: c.start_at as string | null,
    liftSignaled: liftSignaled.has(c.chantier_id),
    reviewed: reviewed.has(c.chantier_id),
  }));
  const todos = clientTodos(rows);
  const active = mine.chantiers.filter((c) => !isChantierFinished(c.status as ChantierStatus));
  const awaitingRequests = requestsAwaitingAnswer(
    mine.requests.filter((r) => !r.chantier_id),
    now,
  ).length;
  return {
    firstName: profile.data?.first_name ?? null,
    summary: clientHomeSummary({
      todos: todos.length,
      activeChantiers: active.length,
      awaitingRequests,
    }),
    todos,
    appointments: upcomingAgenda(rows, now, SHOWN_APPOINTMENTS).map(({ kind, at, row }) => ({
      kind,
      at,
      c: row.c,
    })),
    active: active.slice(0, SHOWN_CHANTIERS),
    activeCount: active.length,
    awaitingRequests,
    draft: mine.drafts[0] ?? null,
    photoByPath: mine.photoByPath,
  };
}
