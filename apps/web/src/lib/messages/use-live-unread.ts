"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Messages non lus du menu, tenus à jour dans le navigateur (F-40) : le compte calculé par la coque
 * au chargement, puis relu à chaque changement de page, au retour sur l'onglet et à chaque message
 * reçu ou lu (temps réel, limité par la RLS aux conversations du compte).
 */
export function useLiveUnreadMessages(initial: number | undefined, enabled: boolean): number {
  const pathname = usePathname();
  const [count, setCount] = useState(initial ?? 0);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) clearTimeout(timer);
      // Plusieurs événements d'un coup (conversation lue) : une seule lecture.
      timer = setTimeout(async () => {
        const { data } = await supabase.rpc("my_unread_messages");
        if (active && typeof data === "number") setCount(data);
      }, 300);
    };
    reload();
    const channel = supabase
      .channel("messages-non-lus")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, reload)
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [enabled, pathname]);

  return count;
}
