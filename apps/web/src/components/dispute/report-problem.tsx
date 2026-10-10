import { reportSuspendsChantier, type ChantierStatus } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ProblemReportForm } from "@/components/dispute/problem-report-form";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.dispute;

/** Page « Signaler un problème » (F-42), commune au client et à l'artisan du chantier. */
export function ReportProblem({
  chantierId,
  chantierHref,
  title,
  status,
}: {
  chantierId: string;
  chantierHref: string;
  title: string;
  status: ChantierStatus;
}) {
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={chantierHref as Route}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.reportTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.chantierLink(title)}</p>
        </div>
        <p className="text-sm">{t.intro}</p>
        <Alert tone="info">{reportSuspendsChantier(status) ? t.suspends : t.noSuspension}</Alert>
        <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
          <ProblemReportForm chantierId={chantierId} />
        </section>
      </div>
    </main>
  );
}
