import type { Metadata, Route } from "next";
import Link from "next/link";
import { Alert, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
import { formatDay, formatTime } from "@/lib/format";

const t = fr.pro.quote;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dayShort = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Paris",
});

export const metadata: Metadata = { title: `${t.list.title} — MENAO` };

const statusTone = {
  brouillon: "neutral",
  envoye: "success",
  signe: "success",
  refuse: "danger",
  revision_demandee: "warning",
  remplace: "neutral",
} as const;

/** Devis de l'artisan (maquettes « Devis – Aucun » et « Devis envoyés »). */
export default async function QuotesPage({ searchParams }: PageProps<"/pro/devis">) {
  const { onglet, envoye } = await searchParams;
  const tab = onglet === "envoyes" ? "envoyes" : "a-envoyer";
  const { supabase } = await requireProSpace();
  const { data } = await supabase.rpc("artisan_quotes");
  const rows = (data ?? []).filter((q) =>
    tab === "a-envoyer" ? q.status === "brouillon" : q.status !== "brouillon",
  );
  // Retour de « Envoyer le devis » (maquette « Devis envoyé »).
  const justSent = (data ?? []).find((q) => q.quote_id === envoye && q.status === "envoye");

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.list.title}</h1>
          <p className="text-sm text-muted-foreground">{t.list.subtitle}</p>
          <TextLink href={"/pro/factures" as Route} className="self-start text-sm">
            {fr.pro.invoices.link}
          </TextLink>
        </div>
        {justSent && <Alert tone="success">{t.list.sentNotice(justSent.client_name)}</Alert>}
        <nav
          aria-label={t.list.title}
          className="flex gap-1 rounded-pill bg-surface p-1 shadow-card"
        >
          {(
            [
              ["a-envoyer", t.list.toSend],
              ["envoyes", t.list.sent],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={`/pro/devis${value === "envoyes" ? "?onglet=envoyes" : ""}` as Route}
              aria-current={tab === value ? "page" : undefined}
              className="flex min-h-10 flex-1 items-center justify-center rounded-pill text-sm text-muted-foreground hover:text-foreground aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium aria-[current=page]:text-primary-strong"
            >
              {label}
            </Link>
          ))}
        </nav>
        <section
          aria-label={tab === "a-envoyer" ? t.list.toSend : t.list.sent}
          className="flex flex-col gap-3"
        >
          <h2 className="text-[0.9375rem] font-medium text-foreground/80">
            {tab === "a-envoyer" ? t.list.toSend : t.list.sent} ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <p className="rounded-card border border-border bg-surface px-6 py-12 text-center text-sm text-muted-foreground shadow-card">
              {tab === "a-envoyer" ? t.list.emptyToSend : t.list.emptySent}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((q) => (
                <li key={q.quote_id}>
                  <Link
                    href={
                      (q.status === "brouillon"
                        ? `/pro/chantiers/${q.chantier_id}/devis`
                        : `/pro/chantiers/${q.chantier_id}`) as Route
                    }
                    className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{q.title}</p>
                      {q.line_count > 0 && (
                        <p className="shrink-0 font-medium text-primary">
                          {euros.format(q.total_ttc_cents / 100)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[
                        q.numero && `N° ${q.numero}`,
                        q.client_name,
                        q.appointment_at
                          ? t.list.visit(
                              dayShort.format(new Date(q.appointment_at)),
                              formatTime(q.appointment_at),
                            )
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {q.status === "brouillon" ? (
                        <>
                          <StatusBadge tone="neutral">
                            {t.statusDraft} · {t.lineCount(q.line_count)}
                          </StatusBadge>
                          {q.version > 1 && (
                            <StatusBadge tone="primary">{t.list.version(q.version)}</StatusBadge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t.list.updated(formatDay(q.updated_at))}
                          </span>
                        </>
                      ) : (
                        <StatusBadge tone={statusTone[q.status]}>
                          {q.status === "envoye" && q.sent_at
                            ? t.list.sentOn(
                                dayShort.format(new Date(q.sent_at)),
                                formatTime(q.sent_at),
                              )
                            : t.list.statuses[q.status]}
                        </StatusBadge>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
