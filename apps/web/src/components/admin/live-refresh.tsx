"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";

const t = fr.admin.overview;
/** Tables suivies en direct (publication supabase_realtime, ADR 0045). */
const TABLES = ["projects", "requests", "chantier_events", "tickets", "artisans"] as const;
/** Plusieurs changements rapprochés ne déclenchent qu'une actualisation. */
const DEBOUNCE_MS = 2_000;
/** Actualisation de secours, si le temps réel est indisponible ou coupé. */
const POLL_MS = 60_000;
const clock = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * Vue d'ensemble en direct (F-58, ADR 0045) : chaque changement sur les tables suivies relance le
 * rendu de la page ; sans temps réel, la page s'actualise chaque minute tant qu'elle est visible.
 */
export function LiveRefresh({ renderedAt }: { renderedAt: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        router.refresh();
      }, DEBOUNCE_MS);
    };
    const channel = supabase.channel("admin:vue-ensemble");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe((status) => setLive(status === "SUBSCRIBED"));
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => {
      clearInterval(poll);
      if (pending) clearTimeout(pending);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground sm:shrink-0 sm:flex-nowrap sm:whitespace-nowrap"
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${
          live ? "animate-pulse bg-success motion-reduce:animate-none" : "bg-border-strong"
        }`}
      />
      <span className="font-medium text-foreground">{live ? t.live : t.auto}</span>
      <span>· {t.updatedAt(clock.format(new Date(renderedAt)))}</span>
    </p>
  );
}
