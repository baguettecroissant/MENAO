import { teamCan } from "@menao/core";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { RequestsTabs } from "@/components/pro/requests-tabs";
import { TenderList } from "@/components/pro/tender-list";
import { TenderNewForm } from "@/components/pro/tender-new-form";
import { ButtonLink, Card, CardTitle } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";
import { listTenders, tendersIncluded } from "@/lib/artisan/tenders";

const t = fr.pro.tenders;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Appels d'offres (F-136, ADR 0287) : onglet de Demandes pour le patron et le chef d'équipe.
 * Formule Ultimate : dépôt du DPGF et liste ; sinon, ce que la formule apporte.
 */
export default async function TendersPage() {
  const { supabase, artisanId, teamPosition } = await requireTeamPermission("money");
  if (!teamCan(teamPosition, "requests")) redirect("/pro/tableau-de-bord");
  const [included, tenders, { data: trades }, { data: myTrades }] = await Promise.all([
    tendersIncluded(supabase),
    listTenders(supabase),
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisanId),
  ]);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">
            {fr.pro.onboarding.requests.title}
          </h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
        </div>
        <RequestsTabs current="appels" />

        {included ? (
          <TenderNewForm
            artisanId={artisanId}
            trades={trades ?? []}
            myTrades={(myTrades ?? []).map((m) => m.trade_code)}
          />
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
          <TenderList tenders={tenders} />
        ) : (
          included && <EmptyState illustration="demandes">{t.empty}</EmptyState>
        )}
      </div>
    </main>
  );
}
