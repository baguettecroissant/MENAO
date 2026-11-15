import "server-only";
import { parseAiAgents, SYMBOL_KINDS, type PlanSymbol } from "@menao/core";
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
  price_source: "devis" | "manuel" | "bibliotheque" | null;
  price_reference: string | null;
  /** DPGF créé depuis les plans (ADR 0292) : origine et calcul de la quantité. */
  quantity_source?:
    | "plan"
    | "calcul"
    | "photo"
    | "manque"
    | "saisi"
    | "estime"
    | "trace"
    | "partiel"
    | "compte"
    | "compte_verif"
    | null;
  quantity_detail?: string | null;
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
  source: "plan" | "cotes" | "photo" | "saisi" | "estime" | "trace";
  file_index: number | null;
  page: number | null;
  uncertain: boolean;
  floor:
    | "carrelage"
    | "parquet"
    | "sol_souple"
    | "existant_nettoyer"
    | "parquet_poncer"
    | "aucun"
    | null;
  walls: "peinture" | "faience" | "aucun" | null;
  ceiling: "peinture" | "plaque" | "aucun" | null;
  tile_height_mm: number | null;
  /** Ce que le plan écrit pour le sol, les murs et le plafond de la pièce (F-159 lot 6, PR B). */
  floor_note: string | null;
  walls_note: string | null;
  ceiling_note: string | null;
};

/** Ouvrage mesuré relevé sur les plans (F-158, ADR 0322) : quantité en millièmes de l'unité. */
export type TenderWork = {
  id: string;
  name: string;
  kind: "surface" | "lineaire" | "volume" | "nombre";
  quantity_milli: number | null;
  source: "plan" | "calcul" | "compte" | "photo" | "saisi" | "trace" | "unite";
  detail: string | null;
  trade_code: string | null;
  file_index: number | null;
  page: number | null;
  uncertain: boolean;
  /** Ouvrage écrit sur le plan (F-159 lot 6) : la pièce où il se trouve, et s'il s'agit d'une dépose. */
  room: string | null;
  removal: boolean;
};

export type PlanFileEntry = {
  path: string;
  name: string;
  kind: "pdf" | "jpg" | "png";
  /** Pages d'un PDF rendues en images à l'envoi (F-159 lot 4, ADR 0328). */
  pages: { path: string; page: number }[];
};

/**
 * Symboles comptés sur les plans, tels qu'enregistrés (tenders.plan_symbols, ADR 0336) : la base
 * les a déjà vérifiés ; un élément mal formé est ignoré.
 */
export function planSymbols(value: unknown): PlanSymbol[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    const s = v as Partial<PlanSymbol> | null;
    if (
      !s ||
      typeof s.file !== "number" ||
      typeof s.page !== "number" ||
      typeof s.x !== "number" ||
      typeof s.y !== "number" ||
      !(SYMBOL_KINDS as readonly string[]).includes(String(s.type))
    ) {
      return [];
    }
    return [
      {
        file: s.file,
        page: s.page,
        type: s.type as PlanSymbol["type"],
        x: s.x,
        y: s.y,
        room: typeof s.room === "string" ? s.room : null,
        doubt: s.doubt === true,
      },
    ];
  });
}

/** Page de plan comptée (tenders.plan_symbol_legend) : taille de l'image et convention lue. */
export type PlanSymbolPage = {
  file: number;
  page: number;
  width: number;
  height: number;
  lines: string[];
};

export function planSymbolPages(value: unknown): PlanSymbolPage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    const p = v as Partial<PlanSymbolPage> | null;
    if (
      !p ||
      typeof p.file !== "number" ||
      typeof p.page !== "number" ||
      typeof p.width !== "number" ||
      typeof p.height !== "number"
    ) {
      return [];
    }
    const lines = Array.isArray(p.lines) ? p.lines.filter((l) => typeof l === "string") : [];
    return [{ file: p.file, page: p.page, width: p.width, height: p.height, lines }];
  });
}

/** Plans déposés, tels qu'enregistrés (tenders.plan_files). */
export function planFiles(value: unknown): PlanFileEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f: unknown) => {
    const entry = f as (Partial<Omit<PlanFileEntry, "pages">> & { pages?: unknown }) | null;
    return entry &&
      typeof entry.path === "string" &&
      (entry.kind === "pdf" || entry.kind === "jpg" || entry.kind === "png")
      ? [
          {
            path: entry.path,
            name: typeof entry.name === "string" ? entry.name : "Plan",
            kind: entry.kind,
            pages: (Array.isArray(entry.pages) ? entry.pages : []).flatMap((p: unknown) => {
              const item = p as { path?: unknown; page?: unknown } | null;
              return item && typeof item.path === "string" && typeof item.page === "number"
                ? [{ path: item.path, page: item.page }]
                : [];
            }),
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
      "id, level, name, area_cm2, perimeter_mm, height_mm, wet, habitable, source, file_index, page, uncertain, floor, walls, ceiling, tile_height_mm, floor_note, walls_note, ceiling_note",
    )
    .eq("tender_id", id)
    .order("position");
  return (data ?? []) as TenderRoom[];
}

/** Ouvrages mesurés d'un appel d'offres créé depuis les plans (lecture : RLS). */
export async function getTenderWorks(supabase: Client, id: string): Promise<TenderWork[]> {
  const { data } = await supabase
    .from("tender_works")
    .select(
      "id, name, kind, quantity_milli, source, detail, trade_code, file_index, page, uncertain, room, removal",
    )
    .eq("tender_id", id)
    .order("position");
  return (data ?? []) as TenderWork[];
}

export async function getTender(supabase: Client, id: string) {
  const [{ data: tender }, { data: lines }] = await Promise.all([
    supabase
      .from("tenders")
      .select(
        "id, name, client_name, due_on, status, source_kind, source_name, vat_rate_bp, imported_at, sheet, plan_files, plan_trades, plan_lots_idle, plan_symbols, plan_symbol_legend, plan_counts, plan_scale, plan_pages, plan_levels, plan_traces, plan_marks, quantities_checked_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("tender_lines")
      .select(
        "id, kind, lot, code, designation, unit_label, architect_quantity_milli, quantity_milli, unit_price_ht_cents, price_source, price_reference, quantity_source, quantity_detail",
      )
      .eq("tender_id", id)
      .order("position"),
  ]);
  if (!tender) return null;
  return { tender, lines: (lines ?? []) as TenderLine[] };
}
