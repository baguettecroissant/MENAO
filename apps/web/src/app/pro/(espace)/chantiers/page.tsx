import type { ChantierStatus } from "@menao/core";
import { CalendarDays, MapPin } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
import { formatDayInline, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";

const t = fr.pro.chantiers;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

const tone = (status: ChantierStatus) =>
  status === "annule" || status === "devis_refuse"
    ? "neutral"
    : status === "rdv_planifie" || status === "devis_en_revision" || status === "acompte_paye"
      ? "primary"
      : status === "en_litige"
        ? "danger"
        : "success";

/** Chantiers de l'artisan (barre de navigation des maquettes : « Chantiers »). */
export default async function ChantiersPage() {
  const { supabase } = await requireProSpace();
  const { data } = await supabase.rpc("artisan_chantiers");
  const rows = data ?? [];

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState illustration="chantiers">{t.empty}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => {
              const client = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ");
              return (
                <li key={r.chantier_id}>
                  <Link
                    href={`/pro/chantiers/${r.chantier_id}` as Route}
                    className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:p-5"
                  >
                    <div>
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
        )}
      </div>
    </main>
  );
}
