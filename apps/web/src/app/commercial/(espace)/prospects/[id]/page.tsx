import {
  FORMES_JURIDIQUES,
  apeLabel,
  directionsUrl,
  parseStoredBrief,
  partnerLinks,
} from "@menao/core";
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
import { ProspectCopilot } from "@/components/commercial/prospect-copilot";
import { Alert, Card, CardTitle, StatusBadge } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDay, formatDayTime, parisInputValues } from "@/lib/format";

const t = fr.commercialProspects;
const d = t.detail;
const c = fr.commercialCopilot;
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
 * « Ne plus contacter », définitif. Pour un prospect que je suis : le copilote (ADR 0223) et
 * l'historique de mes comptes rendus.
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
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

  // Copilote : fiche gardée, comptes rendus, lien d'inscription du commercial, noms des métiers.
  const [{ data: briefRow }, { data: reports }] = p.mine
    ? await Promise.all([
        space.supabase
          .from("prospect_briefs")
          .select("content, created_at")
          .eq("prospect_id", p.id)
          .maybeSingle(),
        space.supabase
          .from("prospect_reports")
          .select("id, summary, interest, objections, next_action_label, created_at")
          .eq("prospect_id", p.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: null }, { data: null }];
  const brief = parseStoredBrief(briefRow?.content);
  const { data: trades } = brief?.demand?.metiers.length
    ? await space.supabase.from("trades").select("code, label").in("code", brief.demand.metiers)
    : { data: [] };
  const tradeLabels = Object.fromEntries((trades ?? []).map((tr) => [tr.code, tr.label]));
  const link = space.commercial
    ? partnerLinks(env.NEXT_PUBLIC_SITE_URL, space.commercial.code).pros
    : env.NEXT_PUBLIC_SITE_URL;

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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        {back}
        <div className="flex flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight break-words sm:text-[2.5rem]">
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

        {/* Refonte « Nette » (ADR 0260) : le copilote et l'historique à gauche ; l'entreprise et le suivi à droite. */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <Alert tone="info">{d.firstContact}</Alert>

            {p.mine && (
              <ProspectCopilot
                prospectId={p.id}
                phone={p.phone}
                link={link}
                brief={brief}
                briefAt={brief ? (briefRow?.created_at ?? null) : null}
                tradeLabels={tradeLabels}
              />
            )}

            {reports && reports.length > 0 && (
              <Card className="flex flex-col gap-3">
                <CardTitle title={c.history.title} />
                <ol className="flex flex-col">
                  {reports.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col gap-1.5 border-t border-border py-3 text-sm first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDayTime(r.created_at)}
                        </span>
                        <StatusBadge
                          tone={
                            r.interest === "chaud"
                              ? "success"
                              : r.interest === "tiede"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {c.report.interests[r.interest] ?? r.interest}
                        </StatusBadge>
                      </div>
                      <p className="leading-relaxed break-words">{r.summary}</p>
                      {r.objections.length > 0 && (
                        <p className="text-muted-foreground">{r.objections.join(" · ")}</p>
                      )}
                      {r.next_action_label && (
                        <p className="text-muted-foreground">
                          {c.history.next(r.next_action_label)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
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

            <div className="px-1">
              <DoNotContactForm id={p.id} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
