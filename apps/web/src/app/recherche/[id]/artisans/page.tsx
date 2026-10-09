import {
  MAX_SEARCH_RESULTS,
  availability,
  parisToday,
  remainingSlots,
  specialtiesPreview,
} from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArtisanAvatar, AvailabilityBadge } from "@/components/project/artisan-avatar";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { matchArtisans, publicUrl } from "@/lib/project/artisans";
import { createClient } from "@/lib/supabase/server";
import { joinNames } from "@/lib/project/names";
import { SelectionBar } from "./selection-bar";
import { TicketForm } from "./ticket-form";

const t = fr.search.results;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));

export const metadata: Metadata = { title: t.title, robots: { index: false } };

/** Sélection d'artisan (F-09). */
export default async function ProjectResultsPage({
  params,
}: PageProps<"/recherche/[id]/artisans">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, trade_code, work_type_codes, ville_nom, code_postal, ville_code_insee, date_mode, date_souhaitee",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  if (!project.trade_code || !project.ville_code_insee) redirect(`/recherche/${id}` as Route);

  const [{ data: claims }, trade, works, artisans, sent] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("trades").select("label").eq("code", project.trade_code).maybeSingle(),
    supabase.from("work_types").select("code, label").in("code", project.work_type_codes),
    matchArtisans(supabase, id, MAX_SEARCH_RESULTS),
    supabase.rpc("particulier_requests"),
  ]);
  const projectRequests = (sent.data ?? []).filter((r) => r.project_id === id);
  const requested = new Set(projectRequests.map((r) => r.artisan_id));
  const slots = remainingSlots(projectRequests.map((r) => r.status));
  const pending = projectRequests.filter((r) => r.status === "envoyee" || r.status === "acceptee");
  const results = artisans ?? [];
  const today = parisToday();
  const tradeLabel = trade.data?.label ?? "";

  const summary = [
    tradeLabel,
    project.ville_nom
      ? `${project.ville_nom}${project.code_postal ? ` (${project.code_postal})` : ""}`
      : null,
    (works.data ?? []).map((w) => w.label).join(", ") || null,
    project.date_mode === "date" && project.date_souhaitee
      ? formatDay(project.date_souhaitee)
      : t.date[project.date_mode === "des_que_possible" ? "des_que_possible" : "inconnue"],
  ].filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-start">
      <aside className="lg:sticky lg:top-6 lg:w-72 lg:shrink-0">
        <details className="rounded-card border border-border bg-surface p-4 lg:open:block" open>
          <summary className="cursor-pointer font-semibold">{t.summary}</summary>
          <ul className="mt-3 flex flex-col gap-1 text-muted-foreground">
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3">
            <TextLink href={`/recherche/${id}` as Route}>{t.edit}</TextLink>
          </p>
        </details>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {results.length ? t.title : t.noneTitle}
          </h1>
          <p className="text-muted-foreground">
            {results.length ? t.found(results.length) : t.none}
          </p>
        </div>

        {pending.length > 0 && (
          <p role="status" className="rounded-button bg-success-soft px-4 py-3 text-success">
            {fr.search.selection.sentBanner(joinNames(pending.map((r) => r.artisan_name)))}{" "}
            <TextLink href="/mon-espace">{fr.search.request.follow}</TextLink>
          </p>
        )}
        {results.length > 0 && slots === 0 && (
          <p className="text-muted-foreground">{fr.search.selection.noSlot}</p>
        )}

        <form id="selection" method="get" action={`/recherche/${id}/envoyer`} />
        {results.length > 0 && (
          <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
            {results.map((a) => {
              const avail = availability({ paused: false, availableFrom: a.available_from }, today);
              const specs = specialtiesPreview(a.specialties, project.work_type_codes);
              const zone =
                a.zone_mode === "rayon" && a.zone_radius_km
                  ? t.zoneRadius(a.zone_radius_km, a.zone_city)
                  : t.zoneCommunes(a.zone_communes);
              return (
                <li
                  key={a.artisan_id}
                  className="flex w-72 shrink-0 snap-start flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-sm sm:w-auto"
                >
                  <div className="flex items-center gap-3">
                    <ArtisanAvatar
                      url={a.avatar_path ? publicUrl(supabase, "avatars", a.avatar_path) : null}
                      name={a.display_name}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">{a.display_name}</h2>
                      <p className="text-muted-foreground">
                        {tradeLabel}
                        {a.experience_years !== null
                          ? ` · ${t.experience(a.experience_years)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <AvailabilityBadge
                    label={
                      avail.kind === "from"
                        ? t.availableFrom(formatDay(avail.date))
                        : t.availableNow
                    }
                    tone={avail.kind === "immediate" ? "success" : "muted"}
                  />
                  <p className="text-sm">
                    {zone}
                    {a.distance_km !== null ? ` · ${t.distance(a.distance_km)}` : ""}
                  </p>
                  {specs.shown.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {specs.shown.map((s) => (
                        <li
                          key={s}
                          className="rounded-full bg-primary-soft px-3 py-1 text-sm text-primary"
                        >
                          {s}
                        </li>
                      ))}
                      {specs.more > 0 && (
                        <li className="rounded-full bg-background px-3 py-1 text-sm text-muted-foreground">
                          {t.more(specs.more)}
                        </li>
                      )}
                    </ul>
                  )}
                  {requested.has(a.artisan_id) ? (
                    <p className="font-medium text-success">✓ {fr.search.selection.alreadySent}</p>
                  ) : (
                    slots > 0 && (
                      <label className="flex min-h-touch items-center gap-3 font-medium has-[:disabled]:opacity-50">
                        <input
                          type="checkbox"
                          name="artisan"
                          value={a.artisan_id}
                          form="selection"
                          className="size-5 accent-primary"
                        />
                        {fr.search.selection.select(a.display_name)}
                      </label>
                    )
                  )}
                  <Link
                    href={`/recherche/${id}/artisans/${a.artisan_id}` as Route}
                    aria-label={t.viewProfile(a.display_name)}
                    className="mt-auto inline-flex min-h-touch items-center justify-center rounded-button border border-border px-4 font-semibold hover:bg-background"
                  >
                    {t.viewProfileShort}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {results.length > 0 && slots > 0 && <SelectionBar formId="selection" slots={slots} />}

        <section
          aria-label={t.ticket.title}
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
        >
          <h2 className="text-lg font-semibold">{t.ticket.title}</h2>
          <p className="text-muted-foreground">{t.ticket.intro}</p>
          <TicketForm projectId={id} askEmail={Boolean(claims?.claims.is_anonymous)} />
        </section>

        <p className="text-sm">
          <TextLink href="/criteres-de-classement">{t.ranking}</TextLink>
        </p>
      </div>
    </main>
  );
}
