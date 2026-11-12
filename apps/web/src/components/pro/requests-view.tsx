import { inboxGroups, requestFigures } from "@menao/core";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { formatDuration } from "@/lib/format";
import { InboxList, type InboxItem } from "./inbox-list";
import { ListGroupTitle } from "./list-group-title";
import { MoneyFigures } from "./money-figures";

const t = fr.pro.onboarding.requests;
const l = fr.pro.worklists;

/**
 * Page « Demandes » (F-16, F-17), refonte « Nette » (ADR 0248) : grand titre, chiffres clés
 * (à traiter, reçues ce mois, temps de réponse), puis les demandes à traiter (échéance la plus
 * proche en tête) et celles déjà traitées. Même vue pour les vraies demandes et les exemples.
 */
export function RequestsView({
  rows,
  now,
  responseMinutes,
  base,
  example = false,
  notice,
  empty,
  tabs,
}: {
  rows: readonly InboxItem[];
  now: Date;
  /** Temps de réponse moyen sur 6 mois (my_response_stats), null sans réponse. */
  responseMinutes: number | null;
  base?: string;
  example?: boolean;
  /** Bandeau au-dessus des chiffres (exemples). */
  notice?: ReactNode;
  /** État vide, à la place des listes. */
  empty?: ReactNode;
  /** Onglets « Demandes » et « Appels d'offres » (ADR 0287). */
  tabs?: ReactNode;
}) {
  const figures = requestFigures(rows, now);
  const { open, done } = inboxGroups(rows, now);
  const urgent = figures.mostUrgent ? fr.pro.sheet.hoursLeft(figures.mostUrgent.hours) : null;
  const response = responseMinutes === null ? "—" : formatDuration(responseMinutes);
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
        </div>
        {tabs}
        {notice}
        <MoneyFigures
          label={l.requestsLabel}
          dense
          cells={[
            {
              label: l.open,
              short: l.openShort,
              value: String(figures.openCount),
              hint: l.openHint(urgent),
            },
            {
              label: l.month,
              value: String(figures.monthCount),
              hint: l.monthHint(figures.monthAccepted),
              desktopOnly: true,
            },
            {
              label: l.urgentShort,
              short: l.urgentShort,
              value: urgent ?? "—",
              tone: figures.mostUrgent && figures.mostUrgent.hours < 24 ? "danger" : undefined,
              phoneOnly: true,
            },
            {
              label: fr.pro.dashboard.responseTime,
              short: l.responseShort,
              value: response,
              hint: fr.pro.sheet.figures.signRateHint,
            },
          ]}
        />
        {empty ??
          (open.length > 0 || done.length > 0 ? (
            <>
              {open.length > 0 && (
                <section aria-labelledby="demandes-a-traiter" className="flex flex-col gap-3">
                  <ListGroupTitle id="demandes-a-traiter" title={l.openGroup} count={open.length} />
                  <InboxList rows={open} now={now} base={base} example={example} />
                </section>
              )}
              {done.length > 0 && (
                <section aria-labelledby="demandes-traitees" className="flex flex-col gap-3">
                  <ListGroupTitle id="demandes-traitees" title={l.doneGroup} count={done.length} />
                  <InboxList rows={done} now={now} variant="done" base={base} example={example} />
                </section>
              )}
            </>
          ) : null)}
      </div>
    </main>
  );
}
