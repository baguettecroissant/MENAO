import { timeLeft } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailSection, InfoList } from "@/components/admin/list-controls";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getProjectDetail } from "@/lib/admin/follow-up";
import { formatDay, formatDayTime } from "@/lib/format";

const t = fr.admin.followUp;
const r = t.requests;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${r.title} — ${fr.admin.title}` };

const REQUEST_TONES = {
  envoyee: "warning",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
} as const;

/**
 * Fiche d'une demande (F-53, ADR 0046) : besoin du client, critères, photos, réponse de chaque
 * artisan contacté et chantier ouvert ; coordonnées du client pour le support.
 */
export default async function AdminRequestPage({ params }: PageProps<"/admin/demandes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const detail = await getProjectDetail(supabase, id);
  if (!detail) notFound();
  const { project: p, client, requests, chantiers, tickets, photos } = detail;
  const now = new Date();
  const title = `${p.trades?.label ?? r.tradeUnknown} · ${p.ville_nom ?? r.cityUnknown}`;
  const chantierOf = (requestId: string) => chantiers.find((c) => c.request_id === requestId);
  const message = requests.find((q) => q.message)?.message ?? null;
  const date =
    p.date_mode === "date" && p.date_souhaitee
      ? formatDay(`${p.date_souhaitee}T12:00:00Z`)
      : fr.search.review.date[p.date_mode === "des_que_possible" ? "asap" : "unknown"];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/demandes"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {r.back}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {[
            r.createdOn(formatDayTime(p.created_at)),
            p.analyzed_at && p.ai_confidence !== null
              ? r.ai(fr.review.percent(Math.round(Number(p.ai_confidence) * 100)))
              : r.noAi,
          ].join(" · ")}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <DetailSection title={r.description}>
            <p className="text-sm whitespace-pre-line">{p.description}</p>
            {message && (
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <p className="text-sm font-medium">{r.message}</p>
                <p className="text-sm whitespace-pre-line text-muted-foreground">{message}</p>
              </div>
            )}
          </DetailSection>

          <DetailSection title={r.criteria}>
            <InfoList
              items={[
                {
                  label: r.criteriaLabels.lieu,
                  value: p.lieu_type ? fr.search.lieux[p.lieu_type] : null,
                },
                { label: r.criteriaLabels.rooms, value: detail.rooms.join(", ") || null },
                { label: r.criteriaLabels.works, value: detail.works.join(", ") || null },
                {
                  label: r.criteriaLabels.surface,
                  value: p.surface ? fr.search.surfaces[p.surface] : null,
                },
                {
                  label: r.criteriaLabels.address,
                  value:
                    p.adresse ?? ([p.code_postal, p.ville_nom].filter(Boolean).join(" ") || null),
                },
                { label: r.criteriaLabels.date, value: date },
                { label: r.criteriaLabels.urgency, value: p.urgence ? r.yes : r.no },
              ]}
            />
          </DetailSection>

          <DetailSection title={r.photos}>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">{r.noPhotos}</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {photos.map((photo, index) =>
                  photo.url ? (
                    <li key={photo.id}>
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                        <img
                          src={photo.url}
                          alt={r.photoAlt(index + 1)}
                          className="size-24 rounded-lg object-cover"
                        />
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </DetailSection>

          <DetailSection title={r.artisans}>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{r.noArtisans}</p>
            ) : (
              <ul className="flex flex-col">
                {requests.map((q) => {
                  const name = q.artisans?.nom_commercial ?? q.artisans?.raison_sociale ?? "—";
                  const chantier = chantierOf(q.id);
                  const left =
                    q.status === "envoyee" ? timeLeft(new Date(q.expires_at), now) : null;
                  return (
                    <li
                      key={q.id}
                      aria-label={name}
                      className="flex flex-col gap-1.5 border-t border-border py-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/admin/artisans/${q.artisan_id}` as Route}
                          aria-label={r.openArtisan(name)}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {name}
                        </Link>
                        <StatusBadge
                          tone={REQUEST_TONES[q.status as keyof typeof REQUEST_TONES] ?? "neutral"}
                        >
                          {r.requestStatus[q.status] ?? q.status}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[
                          r.sentOn(formatDayTime(q.created_at)),
                          q.responded_at ? r.answeredOn(formatDayTime(q.responded_at)) : null,
                          q.cancelled_at ? r.cancelledOn(formatDayTime(q.cancelled_at)) : null,
                          left ? fr.admin.overview.todo.expiresIn(left.hours, left.minutes) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {q.status === "refusee" && q.refusal_reason && (
                        <p className="text-sm">
                          {r.refusal(r.refusalReasons[q.refusal_reason] ?? q.refusal_reason)}
                          {q.refusal_detail ? ` — ${q.refusal_detail}` : ""}
                        </p>
                      )}
                      {chantier && (
                        <Link
                          href={`/admin/chantiers/${chantier.id}` as Route}
                          className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {r.openChantier} →
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title={r.client}>
            <InfoList
              items={[
                { label: r.client, value: client.name ?? t.visitor },
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
                {
                  label: t.phone,
                  value:
                    client.phone ?? requests.find((q) => q.contact_phone)?.contact_phone ?? null,
                },
              ]}
            />
          </DetailSection>
          <DetailSection title={r.chantier}>
            {chantiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{r.noChantier}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {chantiers.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1">
                    <Link
                      href={`/admin/chantiers/${c.id}` as Route}
                      className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {c.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {fr.pro.chantiers.status[c.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
