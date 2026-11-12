import { teamCan } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { RequestsTabs } from "@/components/pro/requests-tabs";
import { TenderNewForm } from "@/components/pro/tender-new-form";
import { ButtonLink, Card, CardTitle, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";
import { listTenders, tendersIncluded } from "@/lib/artisan/tenders";
import { formatDay } from "@/lib/format";

const t = fr.pro.tenders;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

const TONES = {
  en_cours: "warning",
  envoye: "primary",
  retenu: "success",
  perdu: "neutral",
} as const;

/**
 * Appels d'offres (F-136, ADR 0287) : onglet de Demandes pour le patron et le chef d'équipe.
 * Formule Entreprise : dépôt du DPGF et liste ; sinon, ce que la formule apporte.
 */
export default async function TendersPage() {
  const { supabase, artisanId, teamPosition } = await requireTeamPermission("money");
  if (!teamCan(teamPosition, "requests")) redirect("/pro/tableau-de-bord");
  const [included, tenders] = await Promise.all([tendersIncluded(supabase), listTenders(supabase)]);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">
            {fr.pro.onboarding.requests.title}
          </h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
        </div>
        <RequestsTabs current="appels" />

        {included ? (
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.newTitle} description={t.newLead} />
            <TenderNewForm artisanId={artisanId} />
          </Card>
        ) : (
          <Card className="flex flex-col gap-3">
            <CardTitle title={t.locked.title} description={t.locked.body} />
            <ButtonLink
              href={"/pro/onboarding/formule" as Route}
              variant="outline"
              className="self-start"
            >
              {t.locked.cta}
            </ButtonLink>
          </Card>
        )}

        {tenders.length > 0 ? (
          <section aria-label={t.listLabel} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t.listLabel}</h2>
            <ul className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
              {tenders.map((tender) => (
                <li key={tender.id} className="border-t border-border first:border-t-0">
                  <Link
                    href={`/pro/demandes/appels-offres/${tender.id}` as Route}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-background"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{tender.name}</span>
                      {tender.client_name && (
                        <span className="text-sm text-muted-foreground">{tender.client_name}</span>
                      )}
                    </span>
                    <StatusBadge tone={TONES[tender.status as keyof typeof TONES] ?? "neutral"}>
                      {t.status[tender.status] ?? tender.status}
                    </StatusBadge>
                    {tender.due_on && (
                      <span className="text-sm text-muted-foreground">
                        {t.dueOn(formatDay(`${tender.due_on}T12:00:00Z`))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          included && <EmptyState illustration="demandes">{t.empty}</EmptyState>
        )}
      </div>
    </main>
  );
}
