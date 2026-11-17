import { exampleTenders } from "@menao/core";
import type { Metadata } from "next";
import { RequestsTabs } from "@/components/pro/requests-tabs";
import { TenderList } from "@/components/pro/tender-list";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.pro.tenders;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Appels d'offres d'exemple (ADR 0365) : trois dossiers, dont un en cours avec son DPGF à
 * chiffrer. Le dépôt d'un DPGF n'est pas proposé ici : rien n'est envoyé ni lu.
 */
export default async function ExampleTendersPage() {
  await requireExampleViewer();
  const { tenders } = exampleTenders();
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">
            {fr.pro.onboarding.requests.title}
          </h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
        </div>
        <RequestsTabs current="appels" base={EXAMPLES_BASE} />
        <TenderList
          tenders={tenders}
          base={EXAMPLES_BASE}
          example
          openable={tenders.slice(0, 1).map((tender) => tender.id)}
        />
      </div>
    </main>
  );
}
