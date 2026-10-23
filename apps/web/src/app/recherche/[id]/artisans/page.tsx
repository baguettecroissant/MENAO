import {
  MAX_SEARCH_RESULTS,
  availability,
  parisToday,
  inWorkOrder,
  lotStart,
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
import { getArtisanProfile, matchArtisans, publicUrl } from "@/lib/project/artisans";
import { joinNames } from "@/lib/project/names";
import { getProjectSummary } from "@/lib/project/summary";
import { createClient } from "@/lib/supabase/server";
import { LotStart } from "./lot-start";
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
      "id, trade_code, work_type_codes, ville_code_insee, preferred_artisan_id, parent_project_id, lot_dates",
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
          .select("id, trade_code, work_type_codes, date_mode, date_souhaitee, trades(label)")
          .eq("parent_project_id", id)
          .order("created_at"),
  ]);
  // Un seul envoi pour tous les métiers (ADR 0170) : les artisans de chaque lot, à cocher ici.
  const lots = await Promise.all(
    inWorkOrder(lotRows ?? [], (lot) => lot.trade_code).map(async (lot) => {
      const found = (await matchArtisans(supabase, lot.id, MAX_SEARCH_RESULTS)) ?? [];
      const lotRequests = (sent.data ?? []).filter((r) => r.project_id === lot.id);
      return {
        id: lot.id,
        tradeCode: lot.trade_code,
        trade: lot.trades?.label ?? "",
        workTypeCodes: lot.work_type_codes,
        dateMode: lot.date_mode,
        dateSouhaitee: lot.date_souhaitee,
        found: found.length,
        artisans: found.filter((a) => !a.hors_zone),
        requested: new Set(lotRequests.map((r) => r.artisan_id)),
        slots: remainingSlots(lotRequests.map((r) => r.status)),
        sent: lotRequests.length > 0,
      };
    }),
  );
  const preferredId = project.preferred_artisan_id;
  // Zone élargie (ADR 0165) : artisans hors de leur zone, renvoyés après ceux de la zone.
  const inZone = (artisans ?? []).filter((a) => !a.hors_zone);
  const nearby = (artisans ?? []).filter((a) => a.hors_zone);
  const preferred = inZone.find((a) => a.artisan_id === preferredId) ?? null;
  // « Redemander un devis » ou recherche lancée depuis sa fiche publique (ADR 0173) : l'artisan en
  // tête, présélectionné, à la demande du client.
  const results = [
    ...(preferred ? [preferred] : []),
    ...inZone.filter((a) => a !== preferred),
  ].slice(0, MAX_SEARCH_RESULTS);
  const today = parisToday();
  const sentName = (sent.data ?? []).find((r) => r.artisan_id === preferredId)?.artisan_name;
  // « Déjà venu chez vous » seulement après un chantier commun (pas pour un artisan de sa fiche).
  const [{ data: pastChantier }, preferredProfile] = preferredId
    ? await Promise.all([
        supabase
          .from("chantiers")
          .select("id")
          .eq("artisan_id", preferredId)
          .limit(1)
          .maybeSingle(),
        !preferred && !sentName ? getArtisanProfile(supabase, preferredId) : Promise.resolve(null),
      ])
    : [{ data: null }, null];
  const preferredUnavailable =
    preferredId && !preferred ? (sentName ?? preferredProfile?.display_name ?? null) : null;
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
  const card = (a: (typeof inZone)[number], outsideZone: boolean, lot?: (typeof lots)[number]) => {
    const avail = availability({ paused: false, availableFrom: a.available_from }, today);
    const specs = specialtiesPreview(a.specialties, lot?.workTypeCodes ?? project.work_type_codes);
    const done = (lot?.requested ?? requested).has(a.artisan_id);
    const open = (lot?.slots ?? slots) > 0;
    return (
      <ArtisanResultCard
        key={a.artisan_id}
        href={`/recherche/${lot?.id ?? id}/artisans/${a.artisan_id}`}
        artisanId={a.artisan_id}
        verified={a.verified}
        score={a.menao_score}
        name={a.display_name}
        photoUrl={a.avatar_path ? publicUrl(supabase, "avatars", a.avatar_path) : null}
        tradeLabel={lot?.trade ?? tradeLabel}
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
        selection={done ? "sent" : open ? "selectable" : "none"}
        known={!lot && a.artisan_id === preferredId && pastChantier !== null}
        preselected={!lot && a.artisan_id === preferredId}
        outsideZone={outsideZone}
        lotId={lot?.id}
        headingLevel={lot ? 4 : 2}
        className="w-[16.5rem] shrink-0 snap-start sm:w-auto"
      />
    );
  };
  const selectionGroups = [
    ...((results.length > 0 || wider.length > 0) && slots > 0 ? [{ key: "", slots }] : []),
    ...lots
      .filter((lot) => lot.artisans.length > 0 && lot.slots > 0)
      .map((lot) => ({ key: lot.id, slots: lot.slots })),
  ];
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

          {lots.length > 0 && (
            <section aria-labelledby="autres-metiers" className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="autres-metiers" className="text-lg font-medium">
                  {t.lots.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t.lots.workOrder(
                    inWorkOrder(
                      [
                        { code: project.trade_code, label: tradeLabel },
                        ...(lotRows ?? []).map((l) => ({
                          code: l.trade_code,
                          label: l.trades?.label ?? "",
                        })),
                      ],
                      (x) => x.code,
                    )
                      .map((x) => x.label)
                      .filter(Boolean)
                      .join(", "),
                  )}
                </p>
              </div>
              {lots.map((lot) => (
                <section
                  key={lot.id}
                  aria-labelledby={`metier-${lot.id}`}
                  className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-col">
                      <h3 id={`metier-${lot.id}`} className="font-medium">
                        {lot.trade}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {lot.sent ? t.lots.sent : t.lots.found(lot.found)}
                      </span>
                    </div>
                    {/* Pas d'artisan de la zone : la page du métier propose ceux d'un peu plus loin. */}
                    {lot.artisans.length === 0 && (
                      <TextLink
                        href={`/recherche/${lot.id}/artisans` as Route}
                        className="shrink-0 text-sm"
                      >
                        {t.lots.see}
                      </TextLink>
                    )}
                  </div>
                  {/* Date propre au métier (ADR 0169), modifiable avant l'envoi. */}
                  {lot.tradeCode && (
                    <LotStart
                      projectId={id}
                      tradeCode={lot.tradeCode}
                      trade={lot.trade}
                      dateMode={lot.dateMode}
                      dateSouhaitee={lot.dateSouhaitee}
                      own={lotStart(project.lot_dates, lot.tradeCode) !== null}
                      editable={!lot.sent}
                      today={today}
                    />
                  )}
                  {lot.artisans.length > 0 && (
                    <ul className={cardList}>{lot.artisans.map((a) => card(a, false, lot))}</ul>
                  )}
                </section>
              ))}
            </section>
          )}

          {/* Une seule barre pour tous les métiers (ADR 0170) : 3 artisans au plus par métier. */}
          {selectionGroups.length > 0 && (
            <SelectionBar formId="selection" groups={selectionGroups} />
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
