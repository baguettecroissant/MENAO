import "server-only";
import { fr } from "@/i18n/fr";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

export type ProjectSummary = {
  id: string;
  trade: string | null;
  site: string | null;
  address: string | null;
  date: string;
  photos: string[];
};

/** Données du bloc « Résumé de mon besoin » (maquettes), lues avec la session (RLS). */
export async function getProjectSummary(
  supabase: Client,
  projectId: string,
): Promise<ProjectSummary | null> {
  const { data: p } = await supabase
    .from("projects")
    .select(
      "id, trade_code, lieu_type, room_codes, work_type_codes, surface, ville_nom, code_postal, adresse, date_mode, date_souhaitee",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!p) return null;

  const [trade, works, rooms, photos] = await Promise.all([
    p.trade_code
      ? supabase.from("trades").select("label").eq("code", p.trade_code).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("work_types").select("label").in("code", p.work_type_codes),
    supabase.from("rooms").select("label").in("code", p.room_codes),
    supabase
      .from("project_photos")
      .select("storage_path")
      .eq("project_id", projectId)
      .order("sort_order")
      .limit(3),
  ]);
  const paths = (photos.data ?? []).map((ph) => ph.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("project-photos").createSignedUrls(paths, 3600)
    : { data: [] };

  const site = [
    ...(works.data ?? []).map((w) => w.label),
    ...(rooms.data ?? []).map((r) => r.label.toLowerCase()),
    p.lieu_type ? fr.search.lieux[p.lieu_type].toLowerCase() : null,
  ]
    .filter(Boolean)
    .join(", ");
  const city = p.ville_nom ? `${p.ville_nom}${p.code_postal ? ` (${p.code_postal})` : ""}` : null;
  const r = fr.search.review.date;

  return {
    id: p.id,
    trade: trade.data?.label ?? null,
    site: site ? site.charAt(0).toUpperCase() + site.slice(1) : null,
    address: p.adresse ?? city,
    date:
      p.date_mode === "date" && p.date_souhaitee
        ? r.startsOn(dayFormat.format(new Date(`${p.date_souhaitee}T00:00:00Z`)))
        : p.date_mode === "des_que_possible"
          ? r.asap
          : r.unknown,
    photos: (signed ?? []).map((s) => s.signedUrl).filter((u): u is string => Boolean(u)),
  };
}
