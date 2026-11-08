import { chantierFigures } from "@menao/core";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { formatDayInline, formatTime } from "@/lib/format";
import type { ChantierListItem } from "./chantier-list";
import { ChantiersBrowser } from "./chantiers-browser";
import { MoneyFigures } from "./money-figures";

const t = fr.pro.chantiers;
const l = fr.pro.worklists;

/**
 * Page « Chantiers » (F-18), refonte « Nette » (ADR 0248) : grand titre, chiffres clés
 * (rendez-vous, attente du client, travaux, terminés), filtres par phase et recherche, puis la
 * liste. Même vue pour les vrais chantiers et les exemples.
 */
export function ChantiersView({
  rows,
  now,
  base,
  example = false,
  notice,
  empty,
}: {
  rows: readonly ChantierListItem[];
  now: Date;
  base?: string;
  example?: boolean;
  /** Bandeau au-dessus des chiffres (exemples). */
  notice?: ReactNode;
  /** État vide, à la place de la liste. */
  empty?: ReactNode;
}) {
  const f = chantierFigures(rows, now);
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
        </div>
        {notice}
        {empty ?? (
          <>
            <MoneyFigures
              label={l.chantiersLabel}
              dense
              cells={[
                {
                  label: l.appointments,
                  short: l.appointmentsShort,
                  value: String(f.appointmentCount),
                  hint: f.nextAppointment
                    ? l.nextAppointment(
                        formatDayInline(f.nextAppointment),
                        formatTime(f.nextAppointment),
                      )
                    : l.noAppointment,
                },
                {
                  label: l.waiting,
                  short: l.waitingShort,
                  value: String(f.quotesToSign + f.depositsDue),
                  hint: l.waitingHint(f.quotesToSign, f.depositsDue),
                },
                {
                  label: l.works,
                  short: l.worksShort,
                  value: String(f.planned + f.ongoing),
                  hint: l.worksHint(f.planned, f.ongoing),
                },
                {
                  label: l.closed,
                  value: String(f.closed),
                  hint: l.closedHint,
                  desktopOnly: true,
                },
              ]}
            />
            <ChantiersBrowser rows={rows} base={base} example={example} />
          </>
        )}
      </div>
    </main>
  );
}
