import type { ChantierStatus } from "@menao/core";
import { CalendarDays, MapPin } from "lucide-react";
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
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const client = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ");
        return (
          <li key={r.chantier_id}>
            <Link
              href={`${base}/chantiers/${r.chantier_id}` as Route}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {example && <ExampleBadge />}
                <StatusBadge tone={tone(r.status)}>{t.status[r.status]}</StatusBadge>
              </div>
              <p className="font-medium">{r.title}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                {[[r.code_postal, r.ville_nom].filter(Boolean).join(" "), client]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {r.status === "rdv_planifie" && r.appointment_at && (
                <div>
                  <Tag>
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    {t.appointmentOn(
                      formatDayInline(r.appointment_at),
                      formatTime(r.appointment_at),
                    )}
                  </Tag>
                </div>
              )}
              {r.status === "planifie" && r.start_at && (
                <div>
                  <Tag>
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    {t.startOn(formatDayInline(r.start_at), formatTime(r.start_at))}
                  </Tag>
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
