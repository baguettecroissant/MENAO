import { chantierStage } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailSection, InfoList } from "@/components/admin/list-controls";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getChantierDetail } from "@/lib/admin/follow-up";
import { formatDay, formatDayTime } from "@/lib/format";

const t = fr.admin.followUp;
const c = t.chantiers;
const events = fr.admin.overview.activity.chantier;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const link = "text-sm font-medium text-primary underline-offset-2 hover:underline";

export const metadata: Metadata = { title: `${c.title} — ${fr.admin.title}` };

const STAGE_TONES = {
  demande: "primary",
  devis: "primary",
  travaux: "warning",
  reception: "warning",
  termine: "success",
  litige: "danger",
  abandonne: "neutral",
} as const;

/**
 * Fiche d'un chantier (F-53, ADR 0046) : historique des événements, devis, paiements et documents ;
 * les messages entre le client et l'artisan restent privés.
 */
export default async function AdminChantierPage({ params }: PageProps<"/admin/chantiers/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const detail = await getChantierDetail(supabase, id);
  if (!detail) notFound();
  const { chantier: ch, client, quotes, payments, invoices, receptions, tickets } = detail;
  const artisan = ch.artisans?.nom_commercial ?? ch.artisans?.raison_sociale ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/chantiers"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {c.back}
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{ch.title}</h1>
          <StatusBadge tone={STAGE_TONES[chantierStage(ch.status)]}>
            {fr.pro.chantiers.status[ch.status]}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          {[
            ch.adresse ?? [ch.code_postal, ch.ville_nom].filter(Boolean).join(" "),
            ch.start_at ? c.startOn(formatDayTime(ch.start_at)) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <DetailSection title={c.history}>
            <ol className="flex flex-col">
              <li className="flex items-baseline justify-between gap-4 border-b border-border pb-2 text-sm">
                <span className="font-medium">{c.created}</span>
                <time dateTime={ch.created_at} className="shrink-0 text-xs text-muted-foreground">
                  {formatDayTime(ch.created_at)}
                </time>
              </li>
              {detail.events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0"
                >
                  <span>
                    <span className="font-medium">{events[e.event] ?? e.event}</span>{" "}
                    <span className="text-muted-foreground">
                      {c.by[e.actor_role] ?? c.by.systeme}
                    </span>
                  </span>
                  <time dateTime={e.created_at} className="shrink-0 text-xs text-muted-foreground">
                    {formatDayTime(e.created_at)}
                  </time>
                </li>
              ))}
            </ol>
            {detail.events.length === 0 && (
              <p className="text-sm text-muted-foreground">{c.noHistory}</p>
            )}
          </DetailSection>

          <DetailSection title={c.quotes}>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noQuotes}</p>
            ) : (
              <ul className="flex flex-col">
                {quotes.map((q) => {
                  const label = c.quoteLabel(q.numero, q.version);
                  return (
                    <li
                      key={q.id}
                      className="flex flex-col gap-1 border-t border-border py-2 text-sm first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{label}</span>
                        <span className="tabular-nums">
                          {euros.format(q.total_ttc_cents / 100)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[
                          c.quoteStatus[q.status] ?? q.status,
                          q.sent_at ? c.sentOn(formatDay(q.sent_at)) : null,
                          q.signed_at ? c.signedOn(formatDay(q.signed_at)) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {q.status !== "brouillon" && (
                        <a
                          href={`/devis/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={c.pdf(label)}
                          className={`self-start ${link}`}
                        >
                          PDF
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </DetailSection>

          <DetailSection title={c.payments} note={payments.length ? c.paymentsNote : undefined}>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noPayments}</p>
            ) : (
              <ul className="flex flex-col">
                {payments.map((pay) => (
                  <li
                    key={pay.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border py-2 text-sm first:border-t-0 first:pt-0"
                  >
                    <span>
                      <span className="font-medium">{c.paymentKinds[pay.kind] ?? pay.kind}</span>{" "}
                      <span className="text-muted-foreground">
                        {[
                          c.paymentStatus[pay.status] ?? pay.status,
                          pay.paid_at ? c.paidOn(formatDay(pay.paid_at)) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="tabular-nums">{euros.format(pay.amount_cents / 100)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title={c.documents}>
            {invoices.length === 0 && receptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noDocuments}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <a
                      href={`/factures/${inv.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className={link}
                    >
                      {c.invoice((c.paymentKinds[inv.kind] ?? inv.kind).toLowerCase(), inv.numero)}
                    </a>
                    <span className="tabular-nums text-muted-foreground">
                      {euros.format(inv.total_ttc_cents / 100)}
                    </span>
                  </li>
                ))}
                {receptions.map((rec) => (
                  <li key={rec.id}>
                    <a
                      href={`/receptions/${rec.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className={link}
                    >
                      {c.reception(rec.numero, rec.with_reserves)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title={c.artisan}>
            <Link href={`/admin/artisans/${ch.artisan_id}` as Route} className={link}>
              {artisan}
            </Link>
          </DetailSection>
          <DetailSection title={c.client} note={c.privacy}>
            <InfoList
              items={[
                { label: c.client, value: client.name },
                {
                  label: t.email,
                  value: client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {client.email}
                    </a>
                  ) : null,
                },
                { label: t.phone, value: client.phone },
              ]}
            />
          </DetailSection>
          <DetailSection title={c.origin}>
            <Link href={`/admin/demandes/${ch.project_id}` as Route} className={link}>
              {c.openRequest} →
            </Link>
          </DetailSection>
          <DetailSection title={t.tickets}>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noTickets}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href="/admin/tickets"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {fr.admin.tickets.types[ticket.type]}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {fr.admin.tickets.status[ticket.status]} · {formatDay(ticket.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
