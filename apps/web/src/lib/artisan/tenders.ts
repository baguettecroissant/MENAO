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

export async function getTender(supabase: Client, id: string) {
  const [{ data: tender }, { data: lines }] = await Promise.all([
    supabase
      .from("tenders")
      .select(
        "id, name, client_name, due_on, status, source_kind, source_name, vat_rate_bp, imported_at, sheet",
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
