import { FORMES_JURIDIQUES, apeLabel, directionsUrl } from "@menao/core";
import { ArrowLeft, Navigation } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CallLink,
  DoNotContactForm,
  FollowProspectForm,
  ProspectFollowForm,
  ReleaseProspectForm,
} from "@/components/commercial/prospect-forms";
import { Alert, Card, CardTitle, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDay, parisInputValues } from "@/lib/format";

const t = fr.commercialProspects;
const d = t.detail;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.list.title} — MENAO`, robots: { index: false } };

/** Valeur du champ datetime-local (heure de Paris) pour un instant. */
function localInput(iso: string | null): string {
  if (!iso) return "";
  const { date, time } = parisInputValues(iso);
  return `${date}T${time}`;
}

/**
 * Fiche d'un prospect (F-65, lot 2, ADR 0206) : l'entreprise (registre public), le rappel du
 * premier contact, puis selon le cas « Suivre », mon suivi, ou « suivi par un collègue » ; toujours
 * « Ne plus contacter », définitif.
 */
export default async function CommercialProspectPage({
  params,
}: PageProps<"/commercial/prospects/[id]">) {
  const { id } = await params;
  const space = await getCommercialSpace();
  const { data, error } =
    space.active && UUID.test(id)
      ? await space.supabase.rpc("commercial_prospect", { p_id: id })
      : { data: null, error: null };
  const p = data?.[0] ?? null;

  const back = (
    <Link
      href="/commercial/prospects"
      className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {d.back}
    </Link>
  );

  if (!space.commercial || !space.active || !p) {
    return (
      <main className="bg-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
          {back}
          {!space.commercial ? (
            <Alert tone="info">{fr.commercialSpace.missing}</Alert>
          ) : !space.active ? (
            <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
          ) : error ? (
            <Alert tone="error">{t.errors.unavailable}</Alert>
          ) : (
            <Alert tone="info">{d.notFound}</Alert>
          )}
        </div>
      </main>
    );
  }

  const place = [p.code_postal, p.commune].filter(Boolean).join(" ");
  const located = p.lat !== null && p.lon !== null;
  const facts: { label: string; value: ReactNode }[] = [
    { label: d.activity, value: apeLabel(p.ape_code) ?? p.ape_code },
    {
      label: d.legalForm,
      value: p.nature_juridique
        ? (FORMES_JURIDIQUES[p.nature_juridique] ?? p.nature_juridique)
        : null,
    },
    { label: d.created, value: p.date_creation ? formatDay(p.date_creation) : null },
    {
      label: d.staff,
      value: p.tranche_effectif ? (d.staffBands[p.tranche_effectif] ?? p.tranche_effectif) : null,
    },
    {
      label: d.address,
      value:
        p.adresse || place ? (
          <span className="flex flex-col items-start gap-1">
            <span>{p.adresse || place}</span>
            {located && (
              <a
                href={directionsUrl(p.lat, p.lon)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 font-medium text-primary-strong underline-offset-2 hover:underline"
              >
                <Navigation aria-hidden="true" className="size-4" />
                {d.directions}
              </a>
            )}
          </span>
        ) : null,
    },
    { label: d.siret, value: <span className="tabular-nums">{p.siret}</span> },
  ];

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        {back}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight break-words sm:text-[1.75rem]">
            {p.nom}
          </h1>
          {p.denomination && p.denomination !== p.nom && (
            <p className="text-sm text-muted-foreground">{p.denomination}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {p.mine && <StatusBadge tone="primary">{t.status[p.status] ?? p.status}</StatusBadge>}
            {p.followed_by_other && (
              <StatusBadge tone="warning">{t.list.followedByOther}</StatusBadge>
            )}
            {p.stage && <StatusBadge tone="success">{t.stage[p.stage] ?? p.stage}</StatusBadge>}
            {p.rge && <StatusBadge tone="neutral">{d.rge}</StatusBadge>}
            {p.est_siege && <StatusBadge tone="neutral">{d.headOffice}</StatusBadge>}
          </div>
        </div>

        <Card className="flex flex-col gap-3">
          <CardTitle title={d.company} />
          <dl className="flex flex-col">
            {facts
              .filter((f) => f.value)
              .map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col gap-0.5 border-t border-border py-2.5 text-sm first:border-t-0 first:pt-0 sm:flex-row sm:gap-4"
                >
                  <dt className="shrink-0 text-muted-foreground sm:w-36">{f.label}</dt>
                  <dd className="min-w-0 break-words">{f.value}</dd>
                </div>
              ))}
          </dl>
        </Card>

        <Alert tone="info">{d.firstContact}</Alert>

        {p.mine ? (
          <Card className="flex flex-col gap-5">
            <CardTitle
              title={d.followTitle}
              action={p.phone ? <CallLink phone={p.phone} label={t.day.call} /> : undefined}
            />
            <ProspectFollowForm
              id={p.id}
              status={p.status}
              nextActionAt={localInput(p.next_action_at)}
              phone={p.phone ?? ""}
              notes={p.notes ?? ""}
            />
            <div className="border-t border-border pt-4">
              <ReleaseProspectForm id={p.id} />
            </div>
          </Card>
        ) : p.followed_by_other ? (
          <Alert tone="info">{d.followedByOther}</Alert>
        ) : (
          <FollowProspectForm id={p.id} />
        )}

        <div className="border-t border-border pt-5">
          <DoNotContactForm id={p.id} />
        </div>
      </div>
    </main>
  );
}
