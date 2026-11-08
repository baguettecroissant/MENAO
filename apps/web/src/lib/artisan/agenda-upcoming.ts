import { upcomingAgenda } from "@menao/core";
import type { AgendaUpcoming } from "@/components/agenda/agenda-screen";

/**
 * Colonne « À venir » de l'agenda (ADR 0249) : les trois prochaines visites ou les trois prochains
 * démarrages, à partir des chantiers de l'artisan (artisan_chantiers ou exemples).
 */
export function agendaUpcoming(
  rows: readonly {
    chantier_id: string;
    status: string;
    title: string;
    appointment_at: string | null;
    start_at: string | null;
    ville_nom: string | null;
    client_first_name: string | null;
    client_last_name: string | null;
  }[],
  now: Date,
): AgendaUpcoming[] {
  return upcomingAgenda(
    rows.map((r) => ({ ...r, appointmentAt: r.appointment_at, startAt: r.start_at })),
    now,
    3,
  ).map(({ kind, at, row }) => ({
    kind,
    at,
    chantierId: row.chantier_id,
    title: row.title,
    client: [row.client_first_name, row.client_last_name].filter(Boolean).join(" ") || null,
    place: row.ville_nom || null,
  }));
}
