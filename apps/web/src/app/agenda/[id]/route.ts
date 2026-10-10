import { APPOINTMENT_DURATION_MINUTES, buildIcs } from "@menao/core";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * « Ajouter à mon agenda » (F-12, F-44) : fichier .ics du rendez-vous ou du démarrage des travaux,
 * pour l'artisan comme pour le particulier (chantier_appointment ne renvoie rien aux autres comptes).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.rpc("chantier_appointment", { p_chantier_id: id });
  const row = data?.[0];
  if (!row) return new Response(null, { status: 404 });

  const ics = buildIcs({
    uid: id,
    start: new Date(row.starts_at),
    durationMinutes: APPOINTMENT_DURATION_MINUTES,
    summary:
      row.kind === "demarrage" ? fr.agenda.startSummary(row.title) : fr.agenda.summary(row.title),
    location: row.adresse || [row.code_postal, row.ville_nom].filter(Boolean).join(" ") || null,
    description: fr.agenda.description(row.artisan_name, row.client_name),
    stamp: new Date(),
  });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${row.kind === "demarrage" ? "demarrage-travaux" : "rendez-vous"}-menao.ics"`,
      "cache-control": "private, no-store",
    },
  });
}
