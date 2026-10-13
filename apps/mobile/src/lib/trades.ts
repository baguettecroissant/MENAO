import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Trade = { code: string; label: string };

/**
 * Métiers actifs du référentiel, dans l'ordre du back-office (lecture publique, sans compte).
 * Liste vide tant que le chargement n'a pas abouti : l'écran masque alors la section.
 */
export function useTrades(): Trade[] {
  const [trades, setTrades] = useState<Trade[]>([]);
  useEffect(() => {
    let active = true;
    supabase
      .from("trades")
      .select("code, label")
      .order("sort_order")
      .then(({ data }) => {
        if (active && data) setTrades(data);
      });
    return () => {
      active = false;
    };
  }, []);
  return trades;
}
