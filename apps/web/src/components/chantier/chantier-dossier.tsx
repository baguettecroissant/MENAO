import { FileText } from "lucide-react";
import { fr } from "@/i18n/fr";

const t = fr.chantier.dossier;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const card = "flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card";

export type ChantierDocument = { href: string; title: string; meta: string };

/** « Documents liés » (maquette « Dossier du chantier ») : devis et factures en PDF. */
export function ChantierDocuments({ documents }: { documents: ChantierDocument[] }) {
  return (
    <section aria-labelledby="documents-title" className={card}>
      <h2 id="documents-title" className="text-[1.0625rem] font-medium">
        {t.documents}
      </h2>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noDocuments}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((d) => (
            <li key={d.href}>
              <a
                href={d.href}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 rounded-input border border-border p-3 transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
                >
                  <FileText className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{d.title}</span>
                  <span className="text-xs text-muted-foreground">{d.meta}</span>
                </span>
                <span className="sr-only"> ({t.openPdf})</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** « Échéancier de paiement » : déjà payé et restant à payer (calculés par @menao/core). */
export function PaymentSchedule({
  progress,
}: {
  progress: { paidCents: number; remainingCents: number } | null;
}) {
  return (
    <section aria-labelledby="schedule-title" className={card}>
      <h2 id="schedule-title" className="text-[1.0625rem] font-medium">
        {t.schedule}
      </h2>
      {progress ? (
        <ol className="relative flex flex-col gap-5">
          <span
            aria-hidden="true"
            className="absolute top-3 bottom-3 left-[0.6875rem] w-px bg-border-strong"
          />
          <li className="relative flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-primary bg-surface"
              >
                <span className="size-2.5 rounded-full bg-primary" />
              </span>
              {t.paid}
            </span>
            <span className="text-sm font-medium text-primary-strong">
              {euros.format(progress.paidCents / 100)}
            </span>
          </li>
          <li className="relative flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-6 rounded-full border-[1.5px] border-dashed border-border-strong bg-surface"
              />
              {t.remaining}
            </span>
            <span className="text-sm font-medium">
              {euros.format(progress.remainingCents / 100)}
            </span>
          </li>
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noSchedule}</p>
      )}
    </section>
  );
}
