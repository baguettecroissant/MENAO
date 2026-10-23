import {
  MAX_SEARCH_RESULTS,
  availability,
  parisToday,
  remainingSlots,
  showWiderZone,
  specialtiesPreview,
} from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArtisanResultCard } from "@/components/project/artisan-result-card";
import { ProjectSummaryBand, ProjectSummaryCard } from "@/components/project/project-summary-card";
import { Alert, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { matchArtisans, publicUrl } from "@/lib/project/artisans";
import { joinNames } from "@/lib/project/names";
import { getProjectSummary } from "@/lib/project/summary";
import { createClient } from "@/lib/supabase/server";
import { SelectionBar } from "./selection-bar";
import { TicketBlock } from "./ticket-form";

const t = fr.search.results;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));

export const metadata: Metadata = { title: t.title, robots: { index: false } };

/** Sélection d'artisan (F-09), maquettes « Résultat de recherche – Cartes alignées ». */
export default async function ProjectResultsPage({
  params,
}: PageProps<"/recherche/[id]/artisans">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, trade_code, work_type_codes, ville_code_insee, preferred_artisan_id, parent_project_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  if (!project.trade_code || !project.ville_code_insee) redirect(`/recherche/${id}` as Route);

  const [{ data: claims }, summary, artisans, sent, { data: lotRows }] = await Promise.all([
    supabase.auth.getClaims(),
    getProjectSummary(supabase, id),
    // Artisan d'un chantier précédent : cherché plus loin dans le classement (ADR 0040).
    matchArtisans(
      supabase,
      id,
      project.preferred_artisan_id ? MAX_SEARCH_RESULTS + 20 : MAX_SEARCH_RESULTS,
    ),
    supabase.rpc("particulier_requests"),
    // Chantier à plusieurs métiers (ADR 0167) : les autres lots du chantier.
    project.parent_project_id
      ? Promise.resolve({ data: [] })
      : supabase
          .from("projects")
          .select("id, trades(label)")
          .eq("parent_project_id", id)
          .order("created_at"),
  ]);
  const lots = await Promise.all(
    (lotRows ?? []).map(async (lot) => ({
      id: lot.id,
      trade: lot.trades?.label ?? "",
      found: (await matchArtisans(supabase, lot.id, MAX_SEARCH_RESULTS))?.length ?? 0,
    })),
  );
  const preferredId = project.preferred_artisan_id;
  // Zone élargie (ADR 0165) : artisans hors de leur zone, renvoyés après ceux de la zone.
  const inZone = (artisans ?? []).filter((a) => !a.hors_zone);
  const nearby = (artisans ?? []).filter((a) => a.hors_zone);
  const preferred = inZone.find((a) => a.artisan_id === preferredId) ?? null;
  // « Redemander un devis » : l'artisan connu en tête, présélectionné, à la demande du client.
  const results = [
    ...(preferred ? [preferred] : []),
    ...inZone.filter((a) => a !== preferred),
  ].slice(0, MAX_SEARCH_RESULTS);
  const today = parisToday();
  const preferredUnavailable =
    preferredId && !preferred
      ? ((sent.data ?? []).find((r) => r.artisan_id === preferredId)?.artisan_name ?? null)
      : null;
  const projectRequests = (sent.data ?? []).filter((r) => r.project_id === id);
  const requested = new Set(projectRequests.map((r) => r.artisan_id));
  const slots = remainingSlots(projectRequests.map((r) => r.status));
  const pending = projectRequests.filter((r) => r.status === "envoyee" || r.status === "acceptee");
  const tradeLabel = summary?.trade ?? "";
  // Plus aucun artisan de la zone à contacter : ceux d'un peu plus loin.
  const wider = showWiderZone({
    inZoneToContact: inZone.filter((a) => !requested.has(a.artisan_id)).length,
    slots,
    nearby: nearby.length,
  })
    ? nearby.slice(0, MAX_SEARCH_RESULTS)
    : [];
  const card = (a: (typeof inZone)[number], outsideZone: boolean) => {
    const avail = availability({ paused: false, availableFrom: a.available_from }, today);
    const specs = specialtiesPreview(a.specialties, project.work_type_codes);
    return (
      <ArtisanResultCard
        key={a.artisan_id}
        href={`/recherche/${id}/artisans/${a.artisan_id}`}
        artisanId={a.artisan_id}
        verified={a.verified}
        score={a.menao_score}
        name={a.display_name}
        photoUrl={a.avatar_path ? publicUrl(supabase, "avatars", a.avatar_path) : null}
        tradeLabel={tradeLabel}
        experienceYears={a.experience_years}
        zone={
          a.zone_mode === "rayon" && a.zone_radius_km
            ? t.zoneRadius(a.zone_radius_km, a.zone_city)
            : t.zoneCommunes(a.zone_communes)
        }
        distanceKm={a.distance_km}
        availableFrom={avail.kind === "from" ? formatDay(avail.date) : null}
        specialties={specs.shown}
        moreSpecialties={specs.more}
        selection={requested.has(a.artisan_id) ? "sent" : slots > 0 ? "selectable" : "none"}
        known={a.artisan_id === preferredId}
        outsideZone={outsideZone}
        className="w-[16.5rem] shrink-0 snap-start sm:w-auto"
      />
    );
  };
  const cardList =
    "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 @xl:grid-cols-2 @3xl:grid-cols-3";

  return (
    <main className="bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[17.5rem_1fr]">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          {summary && <ProjectSummaryCard summary={summary} />}
        </aside>

        {/* Colonnes selon la place réelle (menu latéral de l'espace client, ADR 0042). */}
        <div className="@container flex min-w-0 flex-col gap-6">
          {/* Téléphone (maquette « Résultat de recherche - in app ») : bande du besoin en haut. */}
          {summary && <ProjectSummaryBand summary={summary} />}
          {project.parent_project_id && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card bg-primary-softer px-4 py-3 text-sm text-primary-strong">
              <span className="font-medium">{t.lots.lotOf(tradeLabel)}</span>
              <TextLink href={`/recherche/${project.parent_project_id}/artisans` as Route}>
                {t.lots.back}
              </TextLink>
            </p>
          )}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
              {results.length ? t.title : wider.length ? t.wider.emptyTitle : t.noneTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {results.length ? t.found(results.length) : wider.length ? t.wider.emptyLead : t.none}
            </p>
          </div>

          {pending.length > 0 && (
            <Alert tone="success">
              {fr.search.selection.sentBanner(joinNames(pending.map((r) => r.artisan_name)))}{" "}
              <TextLink href="/mon-espace">{fr.search.request.follow}</TextLink>
            </Alert>
          )}
          {results.length > 0 && slots === 0 && (
            <Alert tone="info">{fr.search.selection.noSlot}</Alert>
          )}
          {preferredUnavailable && (
            <Alert tone="info">{t.knownUnavailable(preferredUnavailable)}</Alert>
          )}

          <form id="selection" method="get" action={`/recherche/${id}/envoyer`} />
          {results.length > 0 && (
            // Téléphone : carrousel horizontal (F-09, maquette « in app »), la carte suivante dépasse.
            <ul className={cardList}>{results.map((a) => card(a, false))}</ul>
          )}

          {wider.length > 0 &&
            (results.length > 0 ? (
              <section aria-labelledby="plus-loin" className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h2 id="plus-loin" className="text-lg font-medium">
                    {t.wider.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{t.wider.lead}</p>
                </div>
                <ul className={cardList}>{wider.map((a) => card(a, true))}</ul>
              </section>
            ) : (
              <ul className={cardList}>{wider.map((a) => card(a, true))}</ul>
            ))}

          {(results.length > 0 || wider.length > 0) && slots > 0 && (
            <SelectionBar formId="selection" slots={slots} />
          )}

          {lots.length > 0 && (
            <section aria-labelledby="autres-metiers" className="flex flex-col gap-3">
              <h2 id="autres-metiers" className="text-lg font-medium">
                {t.lots.title}
              </h2>
              <ul className="grid gap-3 @xl:grid-cols-2">
                {lots.map((lot) => {
                  const lotSent = (sent.data ?? []).some((r) => r.project_id === lot.id);
                  return (
                    <li
                      key={lot.id}
                      className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-4 shadow-card"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{lot.trade}</span>
                        <span className="text-sm text-muted-foreground">
                          {lotSent ? t.lots.sent : t.lots.found(lot.found)}
                        </span>
                      </span>
                      <TextLink
                        href={`/recherche/${lot.id}/artisans` as Route}
                        className="shrink-0 text-sm"
                      >
                        {t.lots.see}
                      </TextLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <TicketBlock projectId={id} askEmail={Boolean(claims?.claims.is_anonymous)} />

          <p className="text-xs text-muted-foreground">
            <TextLink href="/criteres-de-classement">{t.ranking}</TextLink>
          </p>
        </div>
      </div>
    </main>
  );
}
