import { EmptyState } from "@/components/empty-state";
import { ListFilters, ListHeader, ListPanel, ListRow, type ListTone } from "@/components/list-kit";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatTime } from "@/lib/format";
import { ExampleBadge } from "./examples";

const t = fr.pro.quote;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dayShort = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Paris",
});

const statusTone = {
  brouillon: "neutral",
  envoye: "primary",
  signe: "success",
  refuse: "danger",
  revision_demandee: "warning",
  remplace: "neutral",
} as const satisfies Record<string, ListTone>;

/** Devis de la liste (ligne de artisan_quotes). */
export type QuoteListItem = {
  quote_id: string;
  chantier_id: string;
  status: keyof typeof statusTone;
  title: string;
  client_name: string | null;
  line_count: number;
  total_ttc_cents: number;
  numero: string | null;
  sent_at: string | null;
  appointment_at: string | null;
  version: number;
  updated_at: string;
};

/**
 * Devis de l'artisan, en lignes (ADR 0189) : « À envoyer » (brouillons, vers la préparation du
 * devis) et « Envoyés » (vers le chantier). Exemples (ADR 0184) : pastille « Exemple », liens vers
 * les pages d'exemples (`base`).
 */
export function QuoteList({
  quotes,
  tab,
  justSentTo = null,
  base = "/pro",
  example = false,
}: {
  quotes: readonly QuoteListItem[];
  tab: "a-envoyer" | "envoyes";
  /** Client du devis qui vient d'être envoyé (maquette « Devis envoyé »). */
  justSentTo?: string | null;
  base?: string;
  example?: boolean;
}) {
  const drafts = quotes.filter((q) => q.status === "brouillon");
  const sent = quotes.filter((q) => q.status !== "brouillon");
  const rows = tab === "a-envoyer" ? drafts : sent;
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
        <ListHeader title={t.list.title} />
        {justSentTo !== null && <Alert tone="success">{t.list.sentNotice(justSentTo)}</Alert>}
        <ListFilters
          label={t.list.filtersLabel}
          items={[
            {
              href: `${base}/devis`,
              label: t.list.filterToSend,
              detail: String(drafts.length),
              active: tab === "a-envoyer",
            },
            {
              href: `${base}/devis?onglet=envoyes`,
              label: t.list.filterSent,
              detail: String(sent.length),
              active: tab === "envoyes",
            },
          ]}
        />
        {rows.length === 0 ? (
          <EmptyState illustration="devis">
            {tab === "a-envoyer" ? t.list.emptyToSend : t.list.emptySent}
          </EmptyState>
        ) : (
          <ListPanel label={tab === "a-envoyer" ? t.list.toSend : t.list.sent}>
            {rows.map((q) => (
              <ListRow
                key={q.quote_id}
                href={
                  q.status === "brouillon"
                    ? `${base}/chantiers/${q.chantier_id}/devis`
                    : `${base}/chantiers/${q.chantier_id}`
                }
                label={t.list.open(q.title)}
                title={q.title}
                badge={example ? <ExampleBadge /> : undefined}
                detail={[
                  q.client_name,
                  q.numero && `N° ${q.numero}`,
                  q.status === "brouillon" && q.appointment_at
                    ? t.list.visit(
                        dayShort.format(new Date(q.appointment_at)),
                        formatTime(q.appointment_at),
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                value={q.line_count > 0 ? euros.format(q.total_ttc_cents / 100) : undefined}
                status={{
                  text:
                    q.status === "brouillon"
                      ? `${t.statusDraft} · ${t.lineCount(q.line_count)}${q.version > 1 ? ` · ${t.list.version(q.version)}` : ""}`
                      : q.status === "envoye" && q.sent_at
                        ? t.list.sentOn(dayShort.format(new Date(q.sent_at)), formatTime(q.sent_at))
                        : q.status === "remplace"
                          ? t.list.replaced
                          : t.list.statuses[q.status],
                  tone: statusTone[q.status],
                }}
              />
            ))}
          </ListPanel>
        )}
      </div>
    </main>
  );
}
