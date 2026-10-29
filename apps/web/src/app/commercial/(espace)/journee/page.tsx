import { ChevronRight, Clock } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { CallLink } from "@/components/commercial/prospect-forms";
import { EmptyState } from "@/components/empty-state";
import { ListPanel } from "@/components/list-kit";
import { Alert, ButtonLink, Card, CardTitle } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDayFull, formatDayShort, formatTime, parisInputValues } from "@/lib/format";

const t = fr.commercialProspects;

export const metadata: Metadata = { title: `${t.day.title} — MENAO`, robots: { index: false } };

type DayItem = {
  id: string;
  nom: string;
  commune: string | null;
  status: string;
  next_action_at: string;
  phone: string | null;
};

/** Une ligne : le prospect (lien vers sa fiche), quand, et le bouton Appeler s'il y a un numéro. */
function DayRow({ item, when }: { item: DayItem; when: string }) {
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5">
      <Link
        href={`/commercial/prospects/${item.id}` as Route}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-[0.9375rem] font-medium">{item.nom}</span>
          <span className="truncate text-xs text-muted-foreground">
            {[when, item.commune, t.status[item.status] ?? item.status].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
      </Link>
      {item.phone && <CallLink phone={item.phone} label={t.day.call} />}
    </li>
  );
}

/**
 * « Ma journée » des commerciaux (F-65, lot 2, ADR 0206) : les rendez-vous du jour, puis les
 * relances du jour et celles en retard, avec le bouton Appeler ; rappel des créneaux téléphone.
 */
export default async function CommercialDayPage() {
  const space = await getCommercialSpace();
  const { data, error } = space.active
    ? await space.supabase.rpc("commercial_day")
    : { data: null, error: null };
  const items = data ?? [];
  const now = new Date().toISOString();
  const today = parisInputValues(now).date;
  const appointments = items.filter((i) => i.kind === "rdv");
  const followUps = items.filter((i) => i.kind !== "rdv");
  // Relance d'un jour passé : sa date ; relance du jour : son heure.
  const when = (iso: string) =>
    parisInputValues(iso).date < today
      ? t.day.late(formatDayShort(iso))
      : t.day.at(formatTime(iso));

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.day.title}</h1>
          <p className="text-sm text-muted-foreground">{t.day.intro(formatDayFull(now))}</p>
        </div>

        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : error ? (
          <Alert tone="error">{t.errors.unavailable}</Alert>
        ) : (
          <>
            <section aria-labelledby="rendez-vous" className="flex flex-col gap-3">
              <h2 id="rendez-vous" className="text-lg font-medium">
                {t.day.appointments}
              </h2>
              {appointments.length ? (
                <ListPanel label={t.day.appointments}>
                  {appointments.map((item) => (
                    <DayRow
                      key={item.id}
                      item={item}
                      when={t.day.at(formatTime(item.next_action_at))}
                    />
                  ))}
                </ListPanel>
              ) : (
                <EmptyState illustration="documents" className="py-6">
                  {t.day.appointmentsEmpty}
                </EmptyState>
              )}
            </section>

            <section aria-labelledby="relances" className="flex flex-col gap-3">
              <h2 id="relances" className="text-lg font-medium">
                {t.day.followUps}
              </h2>
              {followUps.length ? (
                <ListPanel label={t.day.followUps}>
                  {followUps.map((item) => (
                    <DayRow key={item.id} item={item} when={when(item.next_action_at)} />
                  ))}
                </ListPanel>
              ) : (
                <EmptyState illustration="documents" className="py-6">
                  {t.day.followUpsEmpty}
                </EmptyState>
              )}
            </section>

            <Card className="flex flex-col gap-2">
              <CardTitle icon={<Clock aria-hidden="true" />} title={t.day.phoneTitle} />
              <p className="text-sm text-muted-foreground">{t.day.phoneText}</p>
            </Card>

            <ButtonLink
              href={"/commercial/prospects?filtre=miens" as Route}
              variant="outline"
              className="self-start"
            >
              {t.day.allProspects}
            </ButtonLink>
          </>
        )}
      </div>
    </main>
  );
}
