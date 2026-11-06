import type { HoursRange } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Horaires d'accueil de l'équipe (F-81, ADR 0230), tels qu'enregistrés en base. */
export type ReceptionSettings = {
  hours: HoursRange[];
  closedDates: string[];
  holidaysClosed: boolean;
};

export type ReceptionState = {
  open: boolean;
  closesAt: string | null;
  nextOpening: string | null;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Plages de la base ({jour, debut, fin}) au format de l'éditeur d'horaires ({weekday, start, end}). */
export function receptionHours(raw: unknown): HoursRange[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { jour, debut, fin } = item as { jour?: unknown; debut?: unknown; fin?: unknown };
    if (typeof jour !== "number" || jour < 1 || jour > 7) return [];
    if (typeof debut !== "string" || typeof fin !== "string") return [];
    if (!TIME.test(debut) || !TIME.test(fin)) return [];
    return [{ weekday: jour as HoursRange["weekday"], start: debut, end: fin }];
  });
}

export async function getReception(
  supabase: Client,
): Promise<{ settings: ReceptionSettings; state: ReceptionState } | null> {
  const [{ data: row }, { data: status }] = await Promise.all([
    supabase
      .from("reception_settings")
      .select("hours, closed_dates, holidays_closed")
      .eq("id", true)
      .maybeSingle(),
    supabase.rpc("reception_status"),
  ]);
  if (!row) return null;
  const s = (status ?? {}) as {
    ouvert?: unknown;
    ferme_a?: unknown;
    prochaine_ouverture?: unknown;
  };
  return {
    settings: {
      hours: receptionHours(row.hours),
      closedDates: row.closed_dates ?? [],
      holidaysClosed: row.holidays_closed,
    },
    state: {
      open: s.ouvert === true,
      closesAt: typeof s.ferme_a === "string" ? s.ferme_a : null,
      nextOpening: typeof s.prochaine_ouverture === "string" ? s.prochaine_ouverture : null,
    },
  };
}
