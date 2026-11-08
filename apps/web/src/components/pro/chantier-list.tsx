import type { ChantierStatus } from "@menao/core";
import { CalendarDays, ChevronRight, HardHat, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDayInline, formatTime } from "@/lib/format";
import { ExampleBadge } from "./examples";

const t = fr.pro.chantiers;

const tone = (status: ChantierStatus) =>
  status === "annule" || status === "devis_refuse"
    ? "neutral"
    : status === "rdv_planifie" || status === "devis_en_revision" || status === "acompte_paye"
      ? "primary"
      : status === "en_litige"
        ? "danger"
        : "success";

/** Chantier de la liste (ligne de artisan_chantiers). */
export type ChantierListItem = {
  chantier_id: string;
  status: ChantierStatus;
  title: string;
  code_postal: string | null;
  ville_nom: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  appointment_at: string | null;
  start_at: string | null;
};

/**
 * Chantiers de l'artisan (barre de navigation des maquettes : « Chantiers »). Exemples
 * (ADR 0184) : pastille « Exemple », liens vers les pages d'exemples (`base`).
 */
export function ChantierList({
  rows,
  base = "/pro",
  example = false,
}: {
  rows: readonly ChantierListItem[];
  base?: string;
  example?: boolean;
}) {
  // Refonte « Nette » (ADR 0245) : une ligne par chantier dans un seul cadre, comme les listes de
  // l'argent (ADR 0189) ; état en pastille à droite.
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {rows.map((r) => {
        const client = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ");
        const when =
          r.status === "rdv_planifie" && r.appointment_at
            ? t.appointmentOn(formatDayInline(r.appointment_at), formatTime(r.appointment_at))
            : r.status === "planifie" && r.start_at
              ? t.startOn(formatDayInline(r.start_at), formatTime(r.start_at))
              : null;
        return (
          <li key={r.chantier_id}>
            <Link
              href={`${base}/chantiers/${r.chantier_id}` as Route}
              className="flex min-h-[4.5rem] items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                <HardHat aria-hidden="true" className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{r.title}</span>
                  {example && <ExampleBadge />}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    {[[r.code_postal, r.ville_nom].filter(Boolean).join(" "), client]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {when && (
                  <span>
                    <Tag>
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {when}
                    </Tag>
                  </span>
                )}
                <span>
                  <StatusBadge tone={tone(r.status)}>{t.status[r.status]}</StatusBadge>
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
