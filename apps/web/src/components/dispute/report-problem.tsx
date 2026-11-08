import { reportSuspendsChantier, type ChantierStatus } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ProblemReportForm } from "@/components/dispute/problem-report-form";
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
  // Refonte « Nette » (ADR 0255) : le formulaire à gauche ; le chantier et la suite à droite.
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={chantierHref as Route}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.reportTitle}
          </h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <ProblemReportForm chantierId={chantierId} />
          </section>
          <aside className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card">
              <p className="text-sm font-semibold text-muted-foreground">{t.chantierLabel}</p>
              <p className="font-bold">{title}</p>
            </div>
            <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
              <p className="font-display text-[1.0625rem] font-bold">{t.nextTitle}</p>
              <p className="text-sm leading-relaxed text-label">
                {reportSuspendsChantier(status) ? t.suspends : t.noSuspension}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
