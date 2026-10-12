import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailSection, InfoList } from "@/components/admin/list-controls";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getPersonDetail } from "@/lib/admin/people";
import { formatDay, formatDayTimeInline } from "@/lib/format";
import { AccountActions } from "./account-actions";

const t = fr.admin.people;
const f = fr.admin.followUp;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const link = "text-sm font-medium text-primary underline-offset-2 hover:underline";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Fiche d'une personne (F-52, ADR 0047) : compte, rôle, demandes, chantiers, dossiers et avis,
 * chacun menant à sa fiche ; lien vers la fiche artisan pour un artisan.
 */
export default async function AdminPersonPage({ params }: PageProps<"/admin/personnes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const person = await getPersonDetail(supabase, id);
  if (!person) notFound();
  const { profile, account, projects, chantiers, tickets, reviews } = person;
  const banned = Boolean(account.banned_until && new Date(account.banned_until) > new Date());
  const staff = profile.role === "admin" || profile.role === "support";
  // Demande de suppression en cours (ADR 0039, 0048) : traitement guidé, effacement manuel.
  const deletion = tickets.find((x) => x.type === "suppression_compte" && x.status !== "resolu");
  const d = fr.admin.deletion;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/personnes"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium tracking-tight">
          {person.name ?? account.email ?? t.unnamed}
        </h1>
        <StatusBadge tone="primary">{fr.roles[profile.role]}</StatusBadge>
        {banned && account.banned_until && (
          <StatusBadge tone="danger">{t.suspended(formatDay(account.banned_until))}</StatusBadge>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          {deletion && (
            // TODO(legal) : durées de conservation et anonymisation à valider avant tout
            // effacement automatique (ADR 0039).
            <DetailSection title={d.title} note={d.legal}>
              <p className="text-sm">
                {d.received(formatDay(deletion.created_at))} {d.due(formatDay(deletion.due_at))}
              </p>
              <ol className="ml-5 flex list-decimal flex-col gap-1 text-sm">
                {d.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Link
                href={`/admin/tickets/${deletion.id}` as Route}
                className={`self-start ${link}`}
              >
                {d.open} →
              </Link>
            </DetailSection>
          )}
          <DetailSection title={t.requests}>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noRequests}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {projects.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/admin/demandes/${p.id}` as Route} className={link}>
                      {`${p.trades?.label ?? f.requests.tradeUnknown} · ${p.ville_nom ?? f.requests.cityUnknown}`}
                    </Link>
                    <span className="text-xs text-muted-foreground">{formatDay(p.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
          <DetailSection title={t.chantiers}>
            {chantiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noChantiers}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {chantiers.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/admin/chantiers/${c.id}` as Route} className={link}>
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
          <DetailSection title={t.reviews}>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noReviews}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {reviews.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      {t.reviewOf(
                        r.artisans?.nom_commercial ?? r.artisans?.raison_sociale ?? f.none,
                        fr.review.percent(r.score),
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDay(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title={t.account}>
            <InfoList
              items={[
                {
                  label: f.email,
                  value: account.email ? (
                    <a
                      href={`mailto:${account.email}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {account.email}
                    </a>
                  ) : null,
                },
                { label: f.phone, value: profile.phone },
                { label: t.createdOn, value: formatDay(account.created_at) },
                {
                  label: t.lastSignIn,
                  value: account.last_sign_in_at
                    ? formatDayTimeInline(account.last_sign_in_at)
                    : t.never,
                },
                { label: t.emailConfirmed, value: account.email_confirmed_at ? t.yes : t.no },
                { label: t.marketing, value: profile.marketing_opt_in ? t.yes : t.no },
              ]}
            />
          </DetailSection>
          <DetailSection title={fr.admin.accountActions.title}>
            {staff ? (
              <p className="text-sm text-muted-foreground">{fr.admin.accountActions.staff}</p>
            ) : (
              <AccountActions
                userId={id}
                isArtisan={Boolean(person.artisanId)}
                suspended={banned}
              />
            )}
          </DetailSection>
          {person.artisanId && (
            <DetailSection title={t.artisanFile}>
              <Link href={`/admin/artisans/${person.artisanId}` as Route} className={link}>
                {t.openArtisanFile} →
              </Link>
            </DetailSection>
          )}
          <DetailSection title={f.tickets}>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{f.noTickets}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/admin/tickets/${ticket.id}` as Route}
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
