import type { Route } from "next";
import Link from "next/link";
import { ExampleBadge } from "@/components/pro/examples";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";

const t = fr.pro.tenders;

const TONES = {
  en_cours: "warning",
  envoye: "primary",
  retenu: "success",
  perdu: "neutral",
} as const;

type Row = {
  id: string;
  name: string;
  client_name: string | null;
  due_on: string | null;
  status: string;
};

/**
 * Liste des appels d'offres (ADR 0287), partagée par l'espace réel et ses exemples (ADR 0365).
 * `openable` : en exemple, seuls ces dossiers ont une fiche.
 */
export function TenderList({
  tenders,
  base = "/pro",
  example = false,
  openable,
}: {
  tenders: readonly Row[];
  base?: string;
  example?: boolean;
  openable?: readonly string[];
}) {
  const row = (tender: Row) => (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{tender.name}</span>
        {tender.client_name && (
          <span className="text-sm text-muted-foreground">{tender.client_name}</span>
        )}
      </span>
      {example && <ExampleBadge />}
      <StatusBadge tone={TONES[tender.status as keyof typeof TONES] ?? "neutral"}>
        {t.status[tender.status] ?? tender.status}
      </StatusBadge>
      {tender.due_on && (
        <span className="text-sm text-muted-foreground">
          {t.dueOn(formatDay(`${tender.due_on}T12:00:00Z`))}
        </span>
      )}
    </>
  );
  const rowClass = "flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4";
  return (
    <section aria-label={t.listLabel} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t.listLabel}</h2>
      <ul className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
        {tenders.map((tender) => (
          <li key={tender.id} className="border-t border-border first:border-t-0">
            {!openable || openable.includes(tender.id) ? (
              <Link
                href={`${base}/demandes/appels-offres/${tender.id}` as Route}
                className={`${rowClass} hover:bg-background`}
              >
                {row(tender)}
              </Link>
            ) : (
              <div className={rowClass}>{row(tender)}</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
