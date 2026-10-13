import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Option = { code: string; label: string };
export type WorkType = Option & { trade: string };
export type Referentials = { trades: Option[]; workTypes: WorkType[]; rooms: Option[] };

/** Référentiels de la recherche (métiers, travaux, pièces), en lecture publique. */
export function useReferentials(): Referentials {
  const [data, setData] = useState<Referentials>({ trades: [], workTypes: [], rooms: [] });
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
      supabase
        .from("work_types")
        .select("code, label, trade_code")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("rooms").select("code, label").eq("active", true).order("sort_order"),
    ]).then(([trades, workTypes, rooms]) => {
      if (!active) return;
      setData({
        trades: trades.data ?? [],
        workTypes: (workTypes.data ?? []).map((w) => ({
          code: w.code,
          label: w.label,
          trade: w.trade_code,
        })),
        rooms: rooms.data ?? [],
      });
    });
    return () => {
      active = false;
    };
  }, []);
  return data;
}
