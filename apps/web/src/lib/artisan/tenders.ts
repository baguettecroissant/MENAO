import "server-only";
import { parseAiAgents } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Appels d'offres inclus dans la formule de l'entreprise (ADR 0287). */
export async function tendersIncluded(supabase: Client): Promise<boolean> {
  const { data } = await supabase.rpc("my_ai_agents");
  return parseAiAgents(data).agents.tenders;
}

export type TenderRow = {
  id: string;
  name: string;
  client_name: string | null;
  due_on: string | null;
  status: string;
  created_at: string;
};

/** Appels d'offres de l'entreprise, les plus récents d'abord (lecture : RLS). */
export async function listTenders(supabase: Client): Promise<TenderRow[]> {
  const { data } = await supabase
    .from("tenders")
    .select("id, name, client_name, due_on, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as TenderRow[];
}

export type TenderLine = {
  id: string;
  kind: "titre" | "poste";
  lot: string | null;
  code: string | null;
  designation: string;
  unit_label: string | null;
  architect_quantity_milli: number | null;
  quantity_milli: number | null;
  unit_price_ht_cents: number | null;
  price_source: "devis" | "manuel" | null;
  price_reference: string | null;
};

/** Pièce relevée sur les plans (F-140, ADR 0291) : surface en cm², périmètre et hauteur en mm. */
export type TenderRoom = {
  id: string;
  level: string | null;
  name: string;
  area_cm2: number | null;
  perimeter_mm: number | null;
  height_mm: number | null;
  wet: boolean;
  habitable: boolean;
  source: "plan" | "cotes" | "photo" | "saisi";
  file_index: number | null;
  page: number | null;
  uncertain: boolean;
};

export type PlanFileEntry = { path: string; name: string; kind: "pdf" | "jpg" | "png" };

/** Plans déposés, tels qu'enregistrés (tenders.plan_files). */
export function planFiles(value: unknown): PlanFileEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f: unknown) => {
    const entry = f as Partial<PlanFileEntry> | null;
    return entry &&
      typeof entry.path === "string" &&
      (entry.kind === "pdf" || entry.kind === "jpg" || entry.kind === "png")
      ? [
          {
            path: entry.path,
            name: typeof entry.name === "string" ? entry.name : "Plan",
            kind: entry.kind,
          },
        ]
      : [];
  });
}

/** Pièces relevées d'un appel d'offres créé depuis les plans (lecture : RLS). */
export async function getTenderRooms(supabase: Client, id: string): Promise<TenderRoom[]> {
  const { data } = await supabase
    .from("tender_rooms")
    .select(
      "id, level, name, area_cm2, perimeter_mm, height_mm, wet, habitable, source, file_index, page, uncertain",
    )
    .eq("tender_id", id)
    .order("position");
  return (data ?? []) as TenderRoom[];
}

export async function getTender(supabase: Client, id: string) {
  const [{ data: tender }, { data: lines }] = await Promise.all([
    supabase
      .from("tenders")
      .select(
        "id, name, client_name, due_on, status, source_kind, source_name, vat_rate_bp, imported_at, sheet, plan_files, plan_trades, plan_counts, plan_scale",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("tender_lines")
      .select(
        "id, kind, lot, code, designation, unit_label, architect_quantity_milli, quantity_milli, unit_price_ht_cents, price_source, price_reference",
      )
      .eq("tender_id", id)
      .order("position"),
  ]);
  if (!tender) return null;
  return { tender, lines: (lines ?? []) as TenderLine[] };
}
